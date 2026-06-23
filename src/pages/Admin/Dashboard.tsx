// ============================================================
// Dashboard del panel (modernizado)
// ------------------------------------------------------------
// Página inicial de /admin. Todo lo que se muestra son DATOS
// REALES del back: contadores, turnos por día (últimos 7),
// top de servicios y profesionales, y reservas recientes.
// (Revenue, ratings y % de tendencia se omiten porque no
//  existen en el modelo de datos.)
// ============================================================

import { useEffect, useState } from "react";

import {
  getAppointments,
  getProfessionals,
  getServiceTypes,
  getUsers,
  type Appointment,
} from "../../services/admin";

// ----- Helpers de fechas -----------------------------------------------

// ISO local (sin zona) que espera el back (LocalDateTime).
function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatHM(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ----- Tipos del estado ------------------------------------------------

interface Metrics {
  users: number;
  services: number;
  professionals: number;
  pending: number;
  confirmed: number;
  today: number;
}

interface DayCount {
  label: string;   // "Lun"
  count: number;
}

interface RankItem {
  name: string;
  count: number;
}

const STATUS_LABEL: Record<Appointment["status"], string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
};

function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [week, setWeek] = useState<DayCount[]>([]);
  const [topServices, setTopServices] = useState<RankItem[]>([]);
  const [topPros, setTopPros] = useState<RankItem[]>([]);
  const [recent, setRecent] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    // Ventana de los últimos 7 días (incluyendo hoy) para el gráfico.
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    Promise.all([
      getUsers(0, 1),
      getServiceTypes(0, 1),
      getProfessionals(0, 1),
      getAppointments(0, 1, { status: "PENDING" }),
      getAppointments(0, 1, { status: "CONFIRMED" }),
      getAppointments(0, 1, { from: toLocalIso(todayStart), to: toLocalIso(todayEnd) }),
      // Para ranking de servicios/profesionales: confirmados reales.
      getAppointments(0, 200, { status: "CONFIRMED" }),
      // Para el gráfico semanal: todos los turnos de los últimos 7 días.
      getAppointments(0, 500, { from: toLocalIso(weekStart), to: toLocalIso(todayEnd) }),
      // Reservas recientes (orden del back: startTime desc).
      getAppointments(0, 6),
    ])
      .then(([users, services, pros, pending, confirmed, today, confirmedList, weekList, recentList]) => {
        if (cancelled) return;

        setMetrics({
          users: users.totalElements,
          services: services.totalElements,
          professionals: pros.totalElements,
          pending: pending.totalElements,
          confirmed: confirmed.totalElements,
          today: today.totalElements,
        });

        // ----- Gráfico: turnos por día de los últimos 7 días -----
        const days: DayCount[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          days.push({ label: WEEKDAYS[d.getDay()], count: 0 });
        }
        for (const appt of weekList.content) {
          const d = startOfDay(new Date(appt.startTime));
          const idx = Math.round((d.getTime() - weekStart.getTime()) / 86_400_000);
          if (idx >= 0 && idx < 7) days[idx].count++;
        }
        setWeek(days);

        // ----- Rankings (tally por nombre) -----
        const tally = (items: string[]) => {
          const m = new Map<string, number>();
          for (const k of items) m.set(k, (m.get(k) ?? 0) + 1);
          return [...m.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        };
        setTopServices(tally(confirmedList.content.map((a) => a.serviceTypeName)));
        setTopPros(tally(confirmedList.content.map((a) => a.professionalName)));

        setRecent(recentList.content);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas");
      });

    return () => { cancelled = true; };
  }, []);

  const maxDay = Math.max(1, ...week.map((d) => d.count));

  return (
    <div className="admin-panel">
      <header className="dash-head">
        <div>
          <h1>Dashboard</h1>
          <p className="dash-subtitle">Resumen de la actividad del centro.</p>
        </div>
      </header>

      {error && <p className="admin-error">{error}</p>}
      {!metrics && !error && <p className="admin-loading">Cargando métricas…</p>}

      {metrics && (
        <>
          {/* ----- Stat cards ----- */}
          <div className="dash-stats">
            <StatCard label="Turnos de hoy" value={metrics.today} accent="primary" icon={<CalendarSvg />} />
            <StatCard label="Turnos pendientes" value={metrics.pending} accent="warning" icon={<ClockSvg />} />
            <StatCard label="Turnos confirmados" value={metrics.confirmed} accent="success" icon={<CheckSvg />} />
            <StatCard label="Usuarios" value={metrics.users} accent="neutral" icon={<UserSvg />} />
          </div>

          <div className="dash-cols">
            {/* ----- Gráfico semanal ----- */}
            <section className="dash-card dash-chart">
              <div className="dash-card-head">
                <div>
                  <h2>Turnos por día</h2>
                  <p className="dash-card-sub">Últimos 7 días</p>
                </div>
              </div>
              <div className="dash-bars">
                {week.map((d, i) => (
                  <div key={i} className="dash-bar-col">
                    <div className="dash-bar-track">
                      <div
                        className="dash-bar-fill"
                        style={{ height: `${(d.count / maxDay) * 100}%` }}
                        title={`${d.count} turno${d.count === 1 ? "" : "s"}`}
                      />
                    </div>
                    <span className="dash-bar-label">{d.label}</span>
                    <span className="dash-bar-value">{d.count}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ----- Rankings ----- */}
            <section className="dash-card">
              <div className="dash-card-head">
                <h2>Top servicios</h2>
              </div>
              {topServices.length === 0 ? (
                <p className="admin-empty">Sin turnos confirmados aún.</p>
              ) : (
                <ol className="dash-rank">
                  {topServices.map((s, i) => (
                    <li key={s.name}>
                      <span className="dash-rank-pos">{i + 1}</span>
                      <span className="dash-rank-name">{s.name}</span>
                      <span className="dash-rank-count">{s.count}</span>
                    </li>
                  ))}
                </ol>
              )}

              <div className="dash-card-head dash-card-head--spaced">
                <h2>Top profesionales</h2>
              </div>
              {topPros.length === 0 ? (
                <p className="admin-empty">Sin datos aún.</p>
              ) : (
                <ul className="dash-pros">
                  {topPros.map((p) => (
                    <li key={p.name}>
                      <span className="dash-pro-avatar">{initialsOf(p.name)}</span>
                      <span className="dash-pro-name">{p.name}</span>
                      <span className="dash-rank-count">{p.count} turnos</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ----- Reservas recientes ----- */}
          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Reservas recientes</h2>
            </div>
            {recent.length === 0 ? (
              <p className="admin-empty">No hay reservas todavía.</p>
            ) : (
              <div className="dash-recent-wrap">
                <table className="dash-recent">
                  <thead>
                    <tr>
                      <th>Socio</th>
                      <th>Servicio</th>
                      <th>Horario</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((a) => (
                      <tr key={a.id}>
                        <td data-label="Socio">
                          <span className="dash-recent-user">
                            <span className="dash-pro-avatar dash-pro-avatar--sm">{initialsOf(a.username)}</span>
                            {a.username}
                          </span>
                        </td>
                        <td data-label="Servicio">{a.serviceTypeName}</td>
                        <td data-label="Horario">{formatHM(a.startTime)} - {formatHM(a.endTime)}</td>
                        <td data-label="Estado">
                          <span className={`admin-status admin-status-${a.status.toLowerCase()}`}>
                            {STATUS_LABEL[a.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ----- Helpers de presentación -----------------------------------------

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}

interface StatCardProps {
  label: string;
  value: number;
  accent: "primary" | "success" | "warning" | "neutral";
  icon: React.ReactNode;
}

function StatCard({ label, value, accent, icon }: StatCardProps) {
  return (
    <div className="dash-stat">
      <div className={`dash-stat-icon dash-stat-icon--${accent}`}>{icon}</div>
      <span className="dash-stat-label">{label}</span>
      <span className="dash-stat-value">{value.toLocaleString("es-AR")}</span>
    </div>
  );
}

// Íconos de las stat cards.
const svgProps = {
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};
function CalendarSvg() { return <svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>; }
function ClockSvg() { return <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }
function CheckSvg() { return <svg {...svgProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>; }
function UserSvg() { return <svg {...svgProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>; }

export default Dashboard;
