// ============================================================
// Appointments (sección /admin/turnos) — versión modernizada
// ------------------------------------------------------------
// Gestión de turnos con:
//   - Chips de resumen (turnos de hoy / pendientes).
//   - Barra de filtros REALES (server-side): estado, profesional,
//     fecha; más el toggle "Ver historial".
//   - Tabla con socio (avatar), servicio, fecha/hora, profesional,
//     estado y acciones contextuales (Confirmar / Cancelar / Eliminar).
//   - Paginación numerada.
//
// Solo se usan datos/filtros que el back soporta. La búsqueda por
// nombre de socio no existe como filtro del back, así que se omite.
// ============================================================

import { useEffect, useState } from "react";

import {
  cancelAppointment,
  confirmAppointment,
  deleteAppointment,
  getAppointments,
  getProfessionals,
  type Appointment,
  type AppointmentStatus,
  type PageResponse,
  type Professional,
} from "../../services/admin";

const PAGE_SIZE = 15;

// ----- Helpers ---------------------------------------------------------

function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatHM(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}

function statusLabel(status: AppointmentStatus): string {
  if (status === "PENDING") return "Pendiente";
  if (status === "CONFIRMED") return "Confirmado";
  return "Cancelado";
}

// Genera la lista de páginas a mostrar (ventana alrededor de la actual).
function pageWindow(current: number, total: number): number[] {
  const pages: number[] = [];
  const start = Math.max(0, Math.min(current - 2, total - 5));
  const end = Math.min(total, Math.max(current + 3, 5));
  for (let i = start; i < end; i++) pages.push(i);
  return pages;
}

function Appointments() {
  // ------ Estado --------------------------------------------------------
  const [data, setData] = useState<PageResponse<Appointment> | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");
  const [proFilter, setProFilter] = useState<number | "">("");
  const [dateFilter, setDateFilter] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Búsqueda libre (server-side): el back matchea sobre socio, servicio,
  // profesional o notas. `query` es lo tipeado; `debouncedQuery` lo que
  // efectivamente mandamos (con retardo para no pegar en cada tecla).
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [counts, setCounts] = useState<{ today: number; pending: number }>({ today: 0, pending: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  // ------ Carga de profesionales (para el filtro) ----------------------
  useEffect(() => {
    getProfessionals(0, 200)
      .then((res) => setProfessionals(res.content))
      .catch(() => { /* el filtro queda vacío; no es crítico */ });
  }, []);

  // ------ Chips de resumen ---------------------------------------------
  async function loadCounts() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    try {
      const [today, pending] = await Promise.all([
        getAppointments(0, 1, { from: toLocalIso(start), to: toLocalIso(end) }),
        getAppointments(0, 1, { status: "PENDING" }),
      ]);
      setCounts({ today: today.totalElements, pending: pending.totalElements });
    } catch { /* los chips quedan en 0; no es crítico */ }
  }

  useEffect(() => { loadCounts(); }, []);

  // ------ Carga de la lista --------------------------------------------
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const filters: Parameters<typeof getAppointments>[2] = {
        status: statusFilter || undefined,
        professionalId: proFilter || undefined,
        query: debouncedQuery || undefined,
      };
      if (dateFilter) {
        // Fecha puntual: acota al día completo (ignora el toggle historial).
        filters.from = `${dateFilter}T00:00:00`;
        filters.to = `${dateFilter}T23:59:59`;
      } else if (!showHistory) {
        // Sin fecha y sin historial: solo próximos.
        filters.from = toLocalIso(new Date());
      }
      const response = await getAppointments(page, PAGE_SIZE, filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, proFilter, dateFilter, showHistory, debouncedQuery]);

  // Debounce de la búsqueda: 350 ms tras la última tecla, fija el término
  // y vuelve a la página 0 (resultados = lista nueva).
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // ------ Helpers de estado --------------------------------------------
  function setBusy(id: number, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  }

  function patchInList(updated: Appointment) {
    setData((prev) => prev && {
      ...prev,
      content: prev.content.map((a) => (a.id === updated.id ? updated : a)),
    });
  }

  // ------ Acciones ------------------------------------------------------
  async function handleConfirm(appt: Appointment) {
    setBusy(appt.id, true);
    try {
      patchInList(await confirmAppointment(appt.id));
      loadCounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo confirmar");
    } finally {
      setBusy(appt.id, false);
    }
  }

  async function handleCancel(appt: Appointment) {
    if (!window.confirm(`¿Cancelar el turno #${appt.id}?`)) return;
    setBusy(appt.id, true);
    try {
      patchInList(await cancelAppointment(appt.id));
      loadCounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo cancelar");
    } finally {
      setBusy(appt.id, false);
    }
  }

  async function handleDelete(appt: Appointment) {
    if (!window.confirm(`¿Eliminar el turno #${appt.id}? Esta acción no se puede deshacer.`)) return;
    setBusy(appt.id, true);
    try {
      await deleteAppointment(appt.id);
      const remaining = (data?.content.length ?? 1) - 1;
      if (remaining === 0 && page > 0) setPage(page - 1);
      else await load();
      loadCounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar");
      setBusy(appt.id, false);
    }
  }

  // Al cambiar un filtro, volvemos a la página 0.
  function resetPageThen(fn: () => void) {
    setPage(0);
    fn();
  }

  // ------ Render --------------------------------------------------------
  return (
    <div className="admin-panel">
      <header className="bk-head">
        <div>
          <h1>Gestión de turnos</h1>
          <p className="dash-subtitle">Administrá las reservas del centro en tiempo real.</p>
        </div>
        <div className="bk-stats">
          <div className="bk-stat">
            <span className="bk-stat-label">Turnos de hoy</span>
            <span className="bk-stat-value">{counts.today}</span>
          </div>
          <div className="bk-stat bk-stat--accent">
            <span className="bk-stat-label">Pendientes</span>
            <span className="bk-stat-value">{counts.pending}</span>
          </div>
        </div>
      </header>

      {/* ----- Barra de filtros ----- */}
      <div className="bk-filters">
        <div className="bk-field usr-search">
          <label htmlFor="f-query">Buscar</label>
          <input
            id="f-query"
            type="search"
            placeholder="Socio, servicio, profesional o nota…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="bk-field">
          <label htmlFor="f-status">Estado</label>
          <select
            id="f-status"
            value={statusFilter}
            onChange={(e) => resetPageThen(() => setStatusFilter(e.target.value as AppointmentStatus | ""))}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>

        <div className="bk-field">
          <label htmlFor="f-pro">Profesional</label>
          <select
            id="f-pro"
            value={proFilter}
            onChange={(e) => resetPageThen(() => setProFilter(e.target.value ? Number(e.target.value) : ""))}
          >
            <option value="">Todos</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="bk-field">
          <label htmlFor="f-date">Fecha</label>
          <input
            id="f-date"
            type="date"
            value={dateFilter}
            onChange={(e) => resetPageThen(() => setDateFilter(e.target.value))}
          />
        </div>

        <label className="bk-history" htmlFor="f-history">
          <input
            id="f-history"
            type="checkbox"
            checked={showHistory}
            disabled={!!dateFilter}
            onChange={(e) => resetPageThen(() => setShowHistory(e.target.checked))}
          />
          Ver historial
        </label>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-loading">Cargando…</p>}

      {!loading && data && (
        <>
          <div className="bk-table-wrap">
            <table className="bk-table">
              <thead>
                <tr>
                  <th>Socio</th>
                  <th>Servicio</th>
                  <th>Fecha y hora</th>
                  <th>Profesional</th>
                  <th>Estado</th>
                  <th className="bk-actions-col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.content.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-empty">No hay turnos para estos filtros.</td>
                  </tr>
                )}
                {data.content.map((appt) => {
                  const busy = busyIds.has(appt.id);
                  const cancelled = appt.status === "CANCELLED";
                  return (
                    <tr key={appt.id} className={cancelled ? "bk-row--cancelled" : ""}>
                      <td data-label="Socio">
                        <span className="bk-member">
                          <span className="bk-avatar">{initialsOf(appt.username)}</span>
                          <span className="bk-member-info">
                            <strong>{appt.username}</strong>
                            <small>#{appt.id}</small>
                          </span>
                        </span>
                      </td>
                      <td data-label="Servicio">{appt.serviceTypeName}</td>
                      <td data-label="Fecha y hora">
                        <span className="bk-when">
                          <strong>{formatDay(appt.startTime)}</strong>
                          <small>{formatHM(appt.startTime)} - {formatHM(appt.endTime)}</small>
                        </span>
                      </td>
                      <td data-label="Profesional">{appt.professionalName}</td>
                      <td data-label="Estado">
                        <span className={`admin-status admin-status-${appt.status.toLowerCase()}`}>
                          {statusLabel(appt.status)}
                        </span>
                      </td>
                      <td data-label="Acciones" className="bk-actions">
                        {appt.status === "PENDING" && (
                          <button type="button" className="bk-btn bk-btn--confirm" disabled={busy} onClick={() => handleConfirm(appt)}>
                            Confirmar
                          </button>
                        )}
                        {appt.status !== "CANCELLED" && (
                          <button type="button" className="bk-btn bk-btn--ghost" disabled={busy} onClick={() => handleCancel(appt)}>
                            Cancelar
                          </button>
                        )}
                        <button type="button" className="bk-btn bk-btn--danger" disabled={busy} onClick={() => handleDelete(appt)} title="Eliminar">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ----- Paginación numerada ----- */}
          <div className="bk-pager">
            <span className="bk-pager-info">
              {data.totalElements} turno{data.totalElements === 1 ? "" : "s"} · página {data.number + 1} de {data.totalPages || 1}
            </span>
            <div className="bk-pager-nav">
              <button type="button" className="bk-page-btn" disabled={data.first} onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Anterior">‹</button>
              {pageWindow(data.number, data.totalPages || 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`bk-page-btn${p === data.number ? " bk-page-btn--active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p + 1}
                </button>
              ))}
              <button type="button" className="bk-page-btn" disabled={data.last} onClick={() => setPage((p) => p + 1)} aria-label="Siguiente">›</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Appointments;
