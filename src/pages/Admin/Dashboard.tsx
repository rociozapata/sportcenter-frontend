// Dashboard del panel: tarjetas con totales de cada recurso.
// Cada llamada pide size=1 y solo usa totalElements, así es liviano.
import { useEffect, useState } from "react";
import {
  getAppointments,
  getProfessionals,
  getServiceTypes,
  getUsers,
} from "../../services/admin";

interface Metrics {
  users: number;
  services: number;
  professionals: number;
  pendingAppointments: number;
}

function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getUsers(0, 1),
      getServiceTypes(0, 1),
      getProfessionals(0, 1),
      getAppointments(0, 1, { status: "PENDING" }),
    ])
      .then(([users, services, professionals, pending]) => {
        if (cancelled) return;
        setMetrics({
          users: users.totalElements,
          services: services.totalElements,
          professionals: professionals.totalElements,
          pendingAppointments: pending.totalElements,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas");
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="admin-panel">
      <h1>Dashboard</h1>
      {error && <p className="admin-error">{error}</p>}
      {!metrics && !error && <p className="admin-loading">Cargando métricas...</p>}
      {metrics && (
        <div className="admin-metrics">
          <Metric label="Usuarios" value={metrics.users} />
          <Metric label="Servicios" value={metrics.services} />
          <Metric label="Profesionales" value={metrics.professionals} />
          <Metric label="Turnos pendientes" value={metrics.pendingAppointments} highlight />
        </div>
      )}
    </div>
  );
}

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
