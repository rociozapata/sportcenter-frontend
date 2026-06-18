// ============================================================
// Dashboard del panel
// ------------------------------------------------------------
// Página inicial de /admin. Muestra tarjetas con totales y un
// ranking de los servicios más reservados.
//
// Estrategia general:
//   - Para CONTADORES: pedimos size=1 y solo leemos totalElements.
//     Spring nos devuelve el total absoluto sin importar el size,
//     así que no descargamos las listas enteras.
//   - Para el RANKING: necesitamos los items reales, así que sí
//     traemos hasta 200 turnos confirmados y los agrupamos en el
//     cliente.
// ============================================================

import { useEffect, useState } from "react";

import {
  getAppointments,
  getProfessionals,
  getServiceTypes,
  getUsers,
} from "../../services/admin";

// ----- Helpers de fechas -----------------------------------------------

// Formatea un Date como ISO LOCAL (sin zona horaria), que es lo que
// espera el back (LocalDateTime: yyyy-MM-dd'T'HH:mm:ss).
//
// OJO: NO usamos d.toISOString() porque ese convierte a UTC. Si el
// usuario está en GMT-3, "00:00 de hoy" en su reloj pasaría a "03:00 UTC"
// y el filtro del back arrancaría 3 horas tarde.
function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Devuelve [inicioDeHoy, finDeHoy] como Dates locales.
function todayRange(): [Date, Date] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

// ----- Tipos del estado ------------------------------------------------

interface Metrics {
  users: number;
  services: number;
  professionals: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  today: number;
  upcoming: number;
}

// Cada entrada del top: nombre del servicio + cuántos turnos confirmados tiene.
interface ServiceCount {
  name: string;
  count: number;
}

function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [topServices, setTopServices] = useState<ServiceCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Pre-cálculo de filtros de fecha (una sola vez, no por llamada).
    const [start, end] = todayRange();
    const todayFrom = toLocalIso(start);
    const todayTo = toLocalIso(end);
    const upcomingFrom = toLocalIso(new Date()); // desde "ahora" en adelante

    // Promise.all dispara TODAS las llamadas en paralelo.
    // Cada métrica usa size=1 (solo nos interesa totalElements),
    // excepto la última que sí trae datos para el ranking.
    Promise.all([
      getUsers(0, 1),
      getServiceTypes(0, 1),
      getProfessionals(0, 1),
      getAppointments(0, 1, { status: "PENDING" }),
      getAppointments(0, 1, { status: "CONFIRMED" }),
      getAppointments(0, 1, { status: "CANCELLED" }),
      getAppointments(0, 1, { from: todayFrom, to: todayTo }),
      getAppointments(0, 1, { from: upcomingFrom }),
      // Para el ranking necesitamos los turnos reales (con su
      // serviceTypeName), así que pedimos hasta 200 confirmados.
      getAppointments(0, 200, { status: "CONFIRMED" }),
    ])
      .then(([users, services, professionals, pending, confirmed, cancelledRes, today, upcoming, confirmedList]) => {
        if (cancelled) return;

        setMetrics({
          users: users.totalElements,
          services: services.totalElements,
          professionals: professionals.totalElements,
          pending: pending.totalElements,
          confirmed: confirmed.totalElements,
          cancelled: cancelledRes.totalElements,
          today: today.totalElements,
          upcoming: upcoming.totalElements,
        });

        // ----- Ranking de servicios -----
        // Agrupamos por nombre del servicio y contamos.
        // Map mantiene el orden de inserción y tiene O(1) para get/set.
        const tally = new Map<string, number>();
        for (const appt of confirmedList.content) {
          tally.set(appt.serviceTypeName, (tally.get(appt.serviceTypeName) ?? 0) + 1);
        }
        // Convertimos a array, ordenamos desc y nos quedamos con el top 3.
        const top: ServiceCount[] = [...tally.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        setTopServices(top);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas");
        }
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="admin-panel">
      <h1>Dashboard</h1>

      {error && <p className="admin-error">{error}</p>}
      {!metrics && !error && <p className="admin-loading">Cargando métricas...</p>}

      {metrics && (
        <>
          {/* ----- Tarjetas de métricas ----- */}
          <div className="admin-metrics">
            <Metric label="Usuarios"           value={metrics.users} />
            <Metric label="Servicios"          value={metrics.services} />
            <Metric label="Profesionales"      value={metrics.professionals} />
            <Metric label="Turnos pendientes"  value={metrics.pending}   highlight />
            <Metric label="Turnos confirmados" value={metrics.confirmed} />
            <Metric label="Turnos cancelados"  value={metrics.cancelled} />
            <Metric label="Turnos de hoy"      value={metrics.today} />
            <Metric label="Turnos próximos"    value={metrics.upcoming} />
          </div>

          {/* ----- Top 3 servicios más reservados ----- */}
          <section className="admin-top">
            <h2>Servicios más reservados</h2>
            {topServices && topServices.length === 0 && (
              <p className="admin-empty">Todavía no hay turnos confirmados para rankear.</p>
            )}
            {topServices && topServices.length > 0 && (
              <ol className="admin-top-list">
                {topServices.map((item) => (
                  <li key={item.name}>
                    <span className="admin-top-name">{item.name}</span>
                    <span className="admin-top-count">{item.count} turnos</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ----- Sub-componente: tarjeta de métrica ------------------------------

interface MetricProps {
  label: string;
  value: number;
  highlight?: boolean;
}

function Metric({ label, value, highlight }: MetricProps) {
  return (
    <div className={`admin-metric${highlight ? " admin-metric-highlight" : ""}`}>
      <span className="admin-metric-value">{value}</span>
      <span className="admin-metric-label">{label}</span>
    </div>
  );
}

export default Dashboard;
