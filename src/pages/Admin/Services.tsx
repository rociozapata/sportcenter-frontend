// Sección ABM de tipos de servicio (clases/servicios del sportcenter).
import { useEffect, useState, type FormEvent } from "react";
import {
  createServiceType,
  deleteServiceType,
  getServiceTypes,
  updateServiceType,
  type PageResponse,
  type ServiceType,
  type ServiceTypePayload,
} from "../../services/admin";

const PAGE_SIZE = 10;

// Form vacío para reusar al cancelar/crear de nuevo.
const EMPTY_FORM: ServiceTypePayload = { name: "", durationMinutes: 60, price: 0 };

function Services() {
  const [data, setData] = useState<PageResponse<ServiceType> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // null = no estamos editando; 0 = creando uno nuevo; >0 = editando ese id.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceTypePayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  async function load(targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const response = await getServiceTypes(targetPage, PAGE_SIZE);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
  }, [page]);

  function startCreate() {
    setEditingId(0);
    setForm(EMPTY_FORM);
  }

  function startEdit(service: ServiceType) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId && editingId > 0) {
        await updateServiceType(editingId, form);
      } else {
        await createServiceType(form);
      }
      cancelEdit();
      await load(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  function setBusy(id: number, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleDelete(service: ServiceType) {
    if (!window.confirm(`¿Eliminar el servicio "${service.name}"?`)) return;
    setBusy(service.id, true);
    try {
      await deleteServiceType(service.id);
      const remaining = (data?.content.length ?? 1) - 1;
      if (remaining === 0 && page > 0) setPage(page - 1);
      else await load(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(service.id, false);
    }
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <h1>Servicios</h1>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          Nuevo servicio
        </button>
      </header>

      {editingId !== null && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId === 0 ? "Nuevo servicio" : `Editar servicio #${editingId}`}</h2>

          <label htmlFor="svc-name">Nombre</label>
          <input
            id="svc-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            minLength={3}
            maxLength={80}
            required
          />

          <label htmlFor="svc-duration">Duración (minutos)</label>
          <input
            id="svc-duration"
            type="number"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            min={1}
            max={480}
            required
          />

          <label htmlFor="svc-price">Precio</label>
          <input
            id="svc-price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            min={0}
            required
          />

          <div className="admin-form-actions">
            <button type="button" className="btn btn-outlined" onClick={cancelEdit} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-loading">Cargando...</p>}

      {!loading && data && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Duración</th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-empty">No hay servicios todavía.</td>
                </tr>
              )}
              {data.content.map((service) => {
                const busy = busyIds.has(service.id);
                return (
                  <tr key={service.id}>
                    <td>{service.id}</td>
                    <td>{service.name}</td>
                    <td>{service.durationMinutes} min</td>
                    <td>${Number(service.price).toFixed(2)}</td>
                    <td className="admin-row-actions">
                      <button
                        type="button"
                        className="btn admin-row-action"
                        disabled={busy}
                        onClick={() => startEdit(service)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger admin-row-action"
                        disabled={busy}
                        onClick={() => handleDelete(service)}
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

export default Services;
