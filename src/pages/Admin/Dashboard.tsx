// ============================================================
// Dashboard del panel
// ------------------------------------------------------------
// Página "inicial" de /admin. Muestra 4 tarjetas con totales:
// usuarios, servicios, profesionales y turnos pendientes.
//
// Truco para que sea barato: pedimos cada listado con size=1
// y solo leemos totalElements. Spring nos devuelve el total
// absoluto sin importar el tamaño de página pedido, así que
// no descargamos las listas enteras.
// ============================================================

// useEffect para disparar las llamadas al montar el componente.
// useState para guardar las métricas y el posible error.
import { useEffect, useState } from "react";

// Importamos las 4 funciones de listado que ya teníamos en
// el service. Reusamos lo que existe en vez de crear endpoints
// específicos de "conteo".
import {
  getAppointments,
  getProfessionals,
  getServiceTypes,
  getUsers,
} from "../../services/admin";

// Forma del estado de métricas. Lo separamos en interface para
// que el componente Metric (más abajo) sea más legible.
interface Metrics {
  users: number;
  services: number;
  professionals: number;
  pendingAppointments: number;
}

function Dashboard() {
  // null = todavía no llegaron los datos.
  // Cuando termine el Promise.all, lo seteamos al objeto Metrics.
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  // Mensaje de error si falla alguna de las llamadas.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Bandera para descartar la respuesta si el componente
    // se desmonta antes de que termine (típico al cambiar de ruta).
    let cancelled = false;

    // Promise.all lanza las 4 llamadas EN PARALELO. Si fueran await
    // secuenciales, el usuario esperaría la suma de las 4 latencias.
    // Así, espera solo la más lenta.
    Promise.all([
      getUsers(0, 1),
      getServiceTypes(0, 1),
      getProfessionals(0, 1),
      // Para "turnos pendientes" pasamos el filtro de status.
      getAppointments(0, 1, { status: "PENDING" }),
    ])
      .then(([users, services, professionals, pending]) => {
        if (cancelled) return;
        // Cada response es un Page<T>. Solo nos interesa totalElements.
        setMetrics({
          users: users.totalElements,
          services: services.totalElements,
          professionals: professionals.totalElements,
          pendingAppointments: pending.totalElements,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas");
        }
      });

    // Cleanup: cancelamos si nos desmontamos antes de tiempo.
    return () => { cancelled = true; };
  }, []); // [] = correr solo al montar (no en re-renders).

  return (
    <div className="admin-panel">
      <h1>Dashboard</h1>

      {/* Renderizado condicional: error tiene prioridad. */}
      {error && <p className="admin-error">{error}</p>}

      {/* Mientras no haya ni datos ni error, mostramos loading. */}
      {!metrics && !error && <p className="admin-loading">Cargando métricas...</p>}

      {/* Solo cuando llegaron los datos, mostramos las tarjetas. */}
      {metrics && (
        <div className="admin-metrics">
          <Metric label="Usuarios" value={metrics.users} />
          <Metric label="Servicios" value={metrics.services} />
          <Metric label="Profesionales" value={metrics.professionals} />
          {/* highlight=true pinta esta tarjeta en verde lima, así
              el admin ve de un vistazo cuántos turnos tiene por confirmar. */}
          <Metric label="Turnos pendientes" value={metrics.pendingAppointments} highlight />
        </div>
      )}
    </div>
  );
}

// ----- Sub-componente: tarjeta de métrica -------------------------------

// Lo extraemos para que el JSX del Dashboard sea limpio. Es puramente
// presentacional: recibe props, no tiene estado.
interface MetricProps {
  label: string;
  value: number;
  highlight?: boolean; // opcional: ? significa "puede no venir"
}

function Metric({ label, value, highlight }: MetricProps) {
  return (
    // Si highlight es true, agregamos una clase extra al className.
    // Las template strings hacen este patrón cómodo.
    <div className={`admin-metric${highlight ? " admin-metric-highlight" : ""}`}>
      <span className="admin-metric-value">{value}</span>
      <span className="admin-metric-label">{label}</span>
    </div>
  );
}

export default Dashboard;
