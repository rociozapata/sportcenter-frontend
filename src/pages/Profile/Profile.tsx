import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Profile.css";
import defaultAvatar from "/src/assets/profile-svgrepo-com.svg";
import { getCurrentUser, type CurrentUser } from "../../services/auth";
import {
    listMyAppointments,
    cancelMyAppointment,
    type MyAppointment,
} from "../../services/booking";

// Formatea "2025-03-12T10:00:00" o "2025-03-12" como "12/03/2025".
function formatDateDDMMYYYY(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
}

// Nombres de día para formatRelativeDay (se usa la abreviatura).
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// "18:00" — solo HH:mm, para armar rangos "18:00 - 19:30".
function formatHM(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// "Hoy" / "Mañana" / "Jue 18/06" según qué tan cerca esté la fecha.
function formatRelativeDay(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const today = new Date();
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOfDay(d) - startOfDay(today)) / 86_400_000);
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Mañana";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${dd}/${mm}`;
}

const STATUS_LABEL: Record<MyAppointment["status"], string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Asistió",
    CANCELLED: "Cancelado",
};

// ----- Íconos (SVG inline, sin dependencias) ---------------------------
// stroke="currentColor" para que hereden el color del contexto via CSS.

function CalendarIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    );
}

function ActivityIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </svg>
    );
}

function UserIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function Profile() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [appointments, setAppointments] = useState<MyAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const navigate = useNavigate();

    // Carga inicial: usuario + turnos en paralelo.
    useEffect(() => {
        let cancelled = false;
        Promise.all([getCurrentUser(), listMyAppointments()])
            .then(([u, apps]) => {
                if (cancelled) return;
                setUser(u);
                setAppointments(apps);
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    // Separa futuros y pasados, y calcula stats del mes actual.
    // useMemo evita recalcular en cada render si appointments no cambió.
    const { upcoming, past, stats } = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const upcoming: MyAppointment[] = [];
        const past: MyAppointment[] = [];
        const monthCounts: Record<string, number> = {};
        let monthTotal = 0;

        for (const a of appointments) {
            const start = new Date(a.startTime);
            const isFuture = start.getTime() > now.getTime();
            if (isFuture && a.status !== "CANCELLED") {
                upcoming.push(a);
            } else {
                past.push(a);
            }
            // Stats: contamos los turnos no cancelados del mes en curso.
            if (
                a.status !== "CANCELLED" &&
                start.getMonth() === currentMonth &&
                start.getFullYear() === currentYear
            ) {
                monthTotal++;
                monthCounts[a.serviceTypeName] = (monthCounts[a.serviceTypeName] ?? 0) + 1;
            }
        }

        // Próximos: cronológicos ascendentes (el más cercano primero).
        upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        return {
            upcoming,
            past,
            stats: { total: monthTotal, byService: monthCounts },
        };
    }, [appointments]);

    async function handleCancel(id: number) {
        setCancellingId(id);
        try {
            await cancelMyAppointment(id);
            // Optimista: actualizamos el estado local en vez de re-fetch.
            setAppointments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, status: "CANCELLED" } : a))
            );
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setCancellingId(null);
        }
    }

    // "Reprogramar" = cancelar el turno actual y mandar a reservar uno nuevo.
    // No hay endpoint de reprogramación real en el back, así que lo
    // resolvemos como cancelación + nueva reserva (decisión del producto).
    async function handleReschedule(id: number) {
        const ok = window.confirm(
            "Reprogramar cancela este turno y te lleva a reservar uno nuevo. ¿Continuar?"
        );
        if (!ok) return;
        setCancellingId(id);
        try {
            await cancelMyAppointment(id);
            setAppointments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, status: "CANCELLED" } : a))
            );
            navigate("/turnos");
        } catch (err) {
            setError((err as Error).message);
            setCancellingId(null);
        }
    }

    if (loading) {
        return <section className="profile-container"><p>Cargando perfil…</p></section>;
    }
    if (error || !user) {
        return <section className="profile-container"><p>Error: {error ?? "no se pudo cargar el perfil"}</p></section>;
    }

    // Top 3 servicios más usados del mes — la card original mostraba 3 deportes fijos.
    const topServices = Object.entries(stats.byService)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    return (
        <section className="profile-container">

            <div className="profile-header-block">
                <div className="profile-user-info">
                    <div className="profile-avatar-wrapper">
                        <img src={defaultAvatar} alt="Foto de perfil" />
                    </div>
                    <div>
                        <h2 className="profile-name">{user.username}</h2>
                        <p className="profile-membership">
                            Socio SportCenter desde el {formatDateDDMMYYYY(user.createdDate)}
                        </p>
                    </div>
                </div>

                <Link to="/configuracion" className="profile-config-btn">
                    ⚙️ Configuración
                </Link>
            </div>

            {/* bloque estadisticas */}
            <div className="profile-section">
                <h3 className="profile-section-title">Mis Estadísticas del Mes</h3>
                <div className="stats-grid">
                    <div className="stat-card stat-card--total">
                        <h4>{stats.total}</h4>
                        <p>Turnos Totales</p>
                    </div>
                    {topServices.length === 0 ? (
                        <div className="stat-card"><p>Sin turnos este mes</p></div>
                    ) : (
                        topServices.map(([name, count]) => (
                            <div key={name} className="stat-card">
                                <h4>{count}</h4>
                                <p>{name}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* proximos turnos */}
            <div className="profile-section">
                <div className="profile-section-head">
                    <h3 className="profile-section-title">
                        <CalendarIcon /> Próximos Turnos
                    </h3>
                    <Link to="/turnos" className="profile-section-link">Reservar turno</Link>
                </div>

                {upcoming.length === 0 ? (
                    <p className="profile-empty">No tenés turnos próximos.</p>
                ) : (
                    <div className="booking-cards">
                        {upcoming.map((booking) => (
                            <article key={booking.id} className="booking-card">
                                <div className="booking-card-icon" aria-hidden="true">
                                    <ActivityIcon />
                                </div>
                                <div className="booking-card-body">
                                    <h4 className="booking-card-title">{booking.serviceTypeName}</h4>
                                    <div className="booking-card-meta">
                                        <span className="booking-card-meta-item">
                                            <ClockIcon />
                                            {formatRelativeDay(booking.startTime)}, {formatHM(booking.startTime)} – {formatHM(booking.endTime)}
                                        </span>
                                        <span className="booking-card-meta-item">
                                            <UserIcon />
                                            Coach: {booking.professionalName}
                                        </span>
                                    </div>
                                </div>
                                <div className="booking-card-actions">
                                    <button
                                        type="button"
                                        className="booking-btn booking-btn--ghost"
                                        onClick={() => handleReschedule(booking.id)}
                                        disabled={cancellingId === booking.id}
                                    >
                                        Reprogramar
                                    </button>
                                    <button
                                        type="button"
                                        className="booking-btn booking-btn--danger"
                                        onClick={() => handleCancel(booking.id)}
                                        disabled={cancellingId === booking.id}
                                    >
                                        {cancellingId === booking.id ? "Cancelando…" : "Cancelar"}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {/* historial de turnos */}
            <div className="profile-section">
                <h3 className="profile-section-title">Actividad Pasada</h3>
                {past.length === 0 ? (
                    <p className="profile-empty">Sin turnos previos.</p>
                ) : (
                    <div className="history-table-wrap">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Actividad</th>
                                    <th>Fecha</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {past.map((history) => (
                                    <tr key={history.id}>
                                        <td data-label="Actividad">{history.serviceTypeName}</td>
                                        <td data-label="Fecha">{formatDateDDMMYYYY(history.startTime)}</td>
                                        <td data-label="Estado">
                                            <span className={`history-status history-status--${history.status.toLowerCase()}`}>
                                                {STATUS_LABEL[history.status]}
                                            </span>
                                        </td>
                                        <td data-label="Acciones">
                                            <Link to="/turnos" className="history-action">
                                                Reservar de nuevo
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </section>
    );
}

export default Profile;
