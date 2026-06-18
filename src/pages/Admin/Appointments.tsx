// ============================================================
// Appointments (sección /admin/turnos)
// ------------------------------------------------------------
// Listado de turnos con:
//   - Filtro por estado (Pendiente / Confirmado / Cancelado).
//   - Acciones contextuales por fila (depende del estado actual):
//       * Confirmar: solo si está PENDING.
//       * Cancelar:  cualquier estado distinto a CANCELLED.
//       * Eliminar:  siempre.
//
// La diferencia con las otras secciones es que no hay ABM completo:
// los turnos se crean desde la web pública (/turnos), acá solo
// administramos los existentes.
// ============================================================

import { useEffect, useState } from "react";

import {
  cancelAppointment,
  confirmAppointment,
  deleteAppointment,
  getAppointments,
  type Appointment,
  type AppointmentStatus,
  type PageResponse,
} from "../../services/admin";

// Pedimos más por página acá porque la grilla tiene mucha info.
const PAGE_SIZE = 15;

// Formatea un Date al formato LocalDateTime del back (ISO local, sin zona).
// No usamos toISOString() porque devuelve UTC y desfasaría el filtro.
function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ----- Helpers de presentación -----------------------------------------

// Formatea un ISO datetime al formato de la locale del usuario.
// Date(string ISO) lo entiende. toLocaleString agrega fecha y hora.
function formatDateTime(value: string): string {
  const d = new Date(value);
  return d.toLocaleString();
}

// Traduce el enum del back a texto legible en español.
// Sale más limpio acá que con un { PENDING: "Pendiente", ... } inline.
function statusLabel(status: AppointmentStatus): string {
  if (status === "PENDING") return "Pendiente";
  if (status === "CONFIRMED") return "Confirmado";
  return "Cancelado";
}

function Appointments() {
  // ------ Estado --------------------------------------------------------

  const [data, setData] = useState<PageResponse<Appointment> | null>(null);
  const [page, setPage] = useState(0);

  // "" significa "sin filtro" (mostrar todos). Si fuera AppointmentStatus
  // tendríamos que elegir un default arbitrario, no nos sirve.
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");

  // Por defecto mostramos SOLO turnos futuros (from = ahora).
  // Cuando el admin tilda "Ver historial", pasa a true y el filtro de
  // fecha se desactiva, mostrándose también los turnos pasados.
  const [showHistory, setShowHistory] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  // ------ Carga ---------------------------------------------------------

  async function load(targetPage: number, status: AppointmentStatus | "", history: boolean) {
    setLoading(true);
    setError(null);
    try {
      // Si status es "" no pasamos el filtro (el service lo trata como undefined).
      // history=false → from=ahora (solo próximos).
      // history=true  → sin from (incluye turnos pasados).
      const response = await getAppointments(targetPage, PAGE_SIZE, {
        status: status || undefined,
        from: history ? undefined : toLocalIso(new Date()),
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista");
    } finally {
      setLoading(false);
    }
  }

  // Re-cargar cuando cambia la página, el filtro de estado o el toggle
  // de historial. React diff a las deps: si cualquiera cambia, corre el effect.
  useEffect(() => {
    load(page, statusFilter, showHistory);
  }, [page, statusFilter, showHistory]);

  // ------ Helpers de estado --------------------------------------------

  function setBusy(id: number, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Patch local: reemplaza el item por la versión actualizada que vino del back.
  // Nos ahorra un re-fetch de toda la página.
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
      const updated = await confirmAppointment(appt.id);
      patchInList(updated);
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
      const updated = await cancelAppointment(appt.id);
      patchInList(updated);
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
      else await load(page, statusFilter, showHistory);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar");
      setBusy(appt.id, false);
    }
  }

  // ------ Render --------------------------------------------------------

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <h1>Turnos</h1>

        {/* Filtros. Al cambiar cualquiera reseteamos `page` a 0
            porque la "página 5 de pendientes" no existe en "todos". */}
        <div className="admin-filters">
          <label htmlFor="appt-status">Estado:</label>
          <select
            id="appt-status"
            value={statusFilter}
            onChange={(e) => {
              setPage(0);
              setStatusFilter(e.target.value as AppointmentStatus | "");
            }}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="CANCELLED">Cancelados</option>
          </select>

          {/* Por defecto solo mostramos próximos. El admin tilda este
              checkbox cuando quiere ver el historial completo. */}
          <label className="admin-form-inline" htmlFor="appt-history">
            <input
              id="appt-history"
              type="checkbox"
              checked={showHistory}
              onChange={(e) => {
                setPage(0);
                setShowHistory(e.target.checked);
              }}
            />
            Ver historial
          </label>
        </div>
      </header>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-loading">Cargando...</p>}

      {!loading && data && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Usuario</th>
                <th>Profesional</th>
                <th>Servicio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-empty">No hay turnos.</td>
                </tr>
              )}
              {data.content.map((appt) => {
                const busy = busyIds.has(appt.id);
                return (
                  <tr key={appt.id}>
                    <td>{appt.id}</td>
                    <td>{formatDateTime(appt.startTime)}</td>
                    <td>{formatDateTime(appt.endTime)}</td>
                    <td>{appt.username}</td>
                    <td>{appt.professionalName}</td>
                    <td>{appt.serviceTypeName}</td>
                    <td>
                      {/* Badge con color según el estado. La clase
                          dinámica `admin-status-${...}` matchea las
                          variantes del CSS. */}
                      <span className={`admin-status admin-status-${appt.status.toLowerCase()}`}>
                        {statusLabel(appt.status)}
                      </span>
                    </td>
                    <td className="admin-row-actions">
                      {/* Acciones contextuales: cada botón solo aparece
                          si la acción tiene sentido para el estado actual. */}
                      {appt.status === "PENDING" && (
                        <button
                          type="button"
                          className="btn btn-primary admin-row-action"
                          disabled={busy}
                          onClick={() => handleConfirm(appt)}
                        >
                          Confirmar
                        </button>
                      )}
                      {appt.status !== "CANCELLED" && (
                        <button
                          type="button"
                          className="btn admin-row-action"
                          disabled={busy}
                          onClick={() => handleCancel(appt)}
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-danger admin-row-action"
                        disabled={busy}
                        onClick={() => handleDelete(appt)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="admin-pagination">
            <button type="button" className="btn" disabled={data.first} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Anterior
            </button>
            <button type="button" className="btn" disabled={data.last} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Appointments;
