// Listado de turnos con filtros y acciones admin.
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

const PAGE_SIZE = 15;

function formatDateTime(value: string): string {
  const d = new Date(value);
  return d.toLocaleString();
}

function statusLabel(status: AppointmentStatus): string {
  if (status === "PENDING") return "Pendiente";
  if (status === "CONFIRMED") return "Confirmado";
  return "Cancelado";
}

function Appointments() {
  const [data, setData] = useState<PageResponse<Appointment> | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  async function load(targetPage: number, status: AppointmentStatus | "") {
    setLoading(true);
    setError(null);
    try {
      const response = await getAppointments(targetPage, PAGE_SIZE, {
        status: status || undefined,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page, statusFilter);
  }, [page, statusFilter]);

  function setBusy(id: number, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function patchInList(updated: Appointment) {
    setData((prev) => prev && {
      ...prev,
      content: prev.content.map((a) => (a.id === updated.id ? updated : a)),
    });
  }

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
      else await load(page, statusFilter);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar");
      setBusy(appt.id, false);
    }
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <h1>Turnos</h1>
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
                      <span className={`admin-status admin-status-${appt.status.toLowerCase()}`}>
                        {statusLabel(appt.status)}
                      </span>
                    </td>
                    <td className="admin-row-actions">
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
