import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

// "Jueves 18/06" — día de la semana capitalizado + dd/MM.
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
function formatLongDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${WEEKDAYS[d.getDay()]} ${dd}/${mm}`;
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} hs`;
}

const STATUS_LABEL: Record<MyAppointment["status"], string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Asistió",
    CANCELLED: "Cancelado",
};

function Profile() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [appointments, setAppointments] = useState<MyAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

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
                <h3 className="profile-section-title">Próximos Turnos</h3>
                <div className="bookings-list">
                    {upcoming.length === 0 ? (
                        <p>No tenés turnos próximos.</p>
                    ) : (
                        upcoming.map((booking) => (
                            <div key={booking.id} className="booking-row booking-row--upcoming">
                                <div className="booking-badge">{booking.serviceTypeName}</div>
                                <div className="booking-details">
                                    <strong>{formatLongDate(booking.startTime)} - {formatTime(booking.startTime)}</strong>
                                    <span>{booking.professionalName}</span>
                                </div>
                                <button
                                    className="booking-cancel-btn"
                                    onClick={() => handleCancel(booking.id)}
                                    disabled={cancellingId === booking.id}
                                >
                                    {cancellingId === booking.id ? "Cancelando…" : "Cancelar"}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* historial de turnos */}
            <div className="profile-section">
                <h3 className="profile-section-title">Historial de Turnos</h3>
                <div className="bookings-list">
                    {past.length === 0 ? (
                        <p>Sin turnos previos.</p>
                    ) : (
                        past.map((history) => (
                            <div key={history.id} className="booking-row booking-row--past">
                                <div className="booking-badge booking-badge--past">{history.serviceTypeName}</div>
                                <div className="booking-details">
                                    <strong>{formatLongDate(history.startTime)} - {formatTime(history.startTime)}</strong>
                                </div>
                                <span className={`history-status history-status--${STATUS_LABEL[history.status].toLowerCase()}`}>
                                    {STATUS_LABEL[history.status]}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </section>
    );
}

export default Profile;
