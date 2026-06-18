// ============================================================
// Services (sección /admin/servicios)
// ------------------------------------------------------------
// ABM de tipos de servicio (clases/servicios del sportcenter).
// Misma estructura base que Users + un formulario embebido para
// crear y editar.
//
// Truco para representar 3 estados del formulario con una sola
// variable (editingId):
//   - null  → no hay form visible
//   -    0  → estamos CREANDO uno nuevo
//   -  > 0  → estamos EDITANDO ese id
// ============================================================

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

// Form "limpio" para reusar al cancelar o al empezar a crear de cero.
// Mantener este objeto como constante evita armar { ... } en varios lugares.
const EMPTY_FORM: ServiceTypePayload = { name: "", durationMinutes: 60, price: 0 };

function Services() {
  // Estado de la lista (igual que en Users).
  const [data, setData] = useState<PageResponse<ServiceType> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario.
  // editingId controla la visibilidad y el "modo" (crear vs editar).
  const [editingId, setEditingId] = useState<number | null>(null);
  // form contiene los valores actuales de los inputs.
  const [form, setForm] = useState<ServiceTypePayload>(EMPTY_FORM);
  // saving: deshabilita el botón mientras se procesa el submit.
  const [saving, setSaving] = useState(false);
  // Set de filas con acciones en vuelo (igual que en Users).
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  // ------ Carga de la lista --------------------------------------------

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

  // ------ Handlers del formulario --------------------------------------

  // Abre el form en modo "crear" con valores por defecto.
  function startCreate() {
    setEditingId(0);
    setForm(EMPTY_FORM);
  }

  // Abre el form en modo "editar" precargado con el servicio elegido.
  function startEdit(service: ServiceType) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
    });
  }

  // Cierra el form y limpia los valores.
  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // Submit del form: decide entre create o update según editingId.
  async function handleSubmit(e: FormEvent) {
    // Evita el comportamiento default del browser (recargar la página).
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId && editingId > 0) {
        // Modo edición: id > 0 → PUT
        await updateServiceType(editingId, form);
      } else {
        // Modo creación: id === 0 → POST
        await createServiceType(form);
      }
      cancelEdit();        // cerramos el form
      await load(page);    // refrescamos la tabla
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  // ------ Acciones de filas --------------------------------------------

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
      // Misma lógica que en Users: si vaciamos la página, retrocedemos.
      const remaining = (data?.content.length ?? 1) - 1;
      if (remaining === 0 && page > 0) setPage(page - 1);
      else await load(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(service.id, false);
    }
  }

  // ------ Render --------------------------------------------------------

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <h1>Servicios</h1>
        {/* Botón que abre el form en modo "crear". */}
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          Nuevo servicio
        </button>
      </header>

      {/* El form se renderiza solo cuando editingId !== null.
          Si lo dejáramos siempre montado, mantendría su estado entre
          aperturas y se vería texto viejo al volver a abrir. */}
      {editingId !== null && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId === 0 ? "Nuevo servicio" : `Editar servicio #${editingId}`}</h2>

          <label htmlFor="svc-name">Nombre</label>
          <input
            id="svc-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            minLength={3}     // refleja la validación @Size(min=3) del back
            maxLength={80}    // refleja @Size(max=80)
            required
          />

          <label htmlFor="svc-duration">Duración (minutos)</label>
          <input
            id="svc-duration"
            type="number"
            value={form.durationMinutes}
            // Number(e.target.value) convierte el string del input
            // a número. Si está vacío queda NaN, pero `required` evita
            // que el form se envíe en ese caso.
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            min={1}
            max={480}
            required
          />

          <label htmlFor="svc-price">Precio</label>
          <input
            id="svc-price"
            type="number"
            step="0.01"  // permite decimales (precio con centavos)
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
                    {/* toFixed(2) garantiza siempre dos decimales en la UI. */}
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
