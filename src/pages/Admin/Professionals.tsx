// ============================================================
// Professionals (sección /admin/profesionales)
// ------------------------------------------------------------
// ABM de profesionales. Mismo patrón que Services + un selector
// multi-checkbox para asignarle al profesional qué tipos de
// servicio puede atender (relación N-a-N en el back).
// ============================================================

import { useEffect, useState, type FormEvent } from "react";

import {
  createProfessional,
  deleteProfessional,
  getProfessionals,
  getServiceTypes,           // lo necesitamos para poblar el selector
  updateProfessional,
  type PageResponse,
  type Professional,
  type ProfessionalPayload,
  type ServiceType,
} from "../../services/admin";

const PAGE_SIZE = 10;

// Form vacío por defecto.
// active arranca en true: lo normal al crear un profesional es darlo
// de alta activo. El usuario lo puede desactivar luego.
const EMPTY_FORM: ProfessionalPayload = {
  name: "",
  speciality: "",
  active: true,
  serviceTypeIds: [], // array vacío = no atiende nada todavía
};

function Professionals() {
  // ------ Estado --------------------------------------------------------

  const [data, setData] = useState<PageResponse<Professional> | null>(null);

  // Catálogo de tipos de servicio para alimentar los checkboxes del form.
  // Lo cargamos una sola vez al montar (no por página).
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del form (igual que en Services).
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProfessionalPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  // ------ Carga de la lista de profesionales ---------------------------

  async function load(targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const response = await getProfessionals(targetPage, PAGE_SIZE);
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

  // ------ Carga del catálogo de servicios ------------------------------

  // Lo hacemos UNA SOLA VEZ al montar (dependencia []) porque cambia
  // poco. Pedimos size=100 para tener todos en un solo fetch; alcanza
  // para un sportcenter real. Si tu app crece, podrías pasar a un
  // <autocomplete> con búsqueda.
  useEffect(() => {
    getServiceTypes(0, 100)
      .then((res) => setServiceTypes(res.content))
      .catch(() => setServiceTypes([])); // si falla, dejamos vacío
  }, []);

  // ------ Handlers del formulario --------------------------------------

  function startCreate() {
    setEditingId(0);
    setForm(EMPTY_FORM);
  }

  // Al editar precargamos todo, incluido el array de ids de servicios
  // (lo derivamos de pro.services).
  function startEdit(pro: Professional) {
    setEditingId(pro.id);
    setForm({
      name: pro.name,
      speciality: pro.speciality,
      active: pro.active,
      serviceTypeIds: pro.services.map((s) => s.id),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // Toggle de pertenencia: si el id está, lo saca; si no, lo agrega.
  // Patrón clásico para multi-select con checkboxes.
  function toggleService(id: number) {
    setForm((prev) => {
      const has = prev.serviceTypeIds.includes(id);
      return {
        ...prev,
        serviceTypeIds: has
          ? prev.serviceTypeIds.filter((x) => x !== id) // sacarlo
          : [...prev.serviceTypeIds, id],               // agregarlo
      };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId && editingId > 0) {
        await updateProfessional(editingId, form);
      } else {
        await createProfessional(form);
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

  async function handleDelete(pro: Professional) {
    if (!window.confirm(`¿Eliminar al profesional "${pro.name}"?`)) return;
    setBusy(pro.id, true);
    try {
      await deleteProfessional(pro.id);
      const remaining = (data?.content.length ?? 1) - 1;
      if (remaining === 0 && page > 0) setPage(page - 1);
      else await load(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(pro.id, false);
    }
  }

  // ------ Render --------------------------------------------------------

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <h1>Profesionales</h1>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          Nuevo profesional
        </button>
      </header>

      {editingId !== null && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId === 0 ? "Nuevo profesional" : `Editar profesional #${editingId}`}</h2>

          <label htmlFor="pro-name">Nombre</label>
          <input
            id="pro-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            minLength={2}
            maxLength={100}
            required
          />

          <label htmlFor="pro-speciality">Especialidad</label>
          <input
            id="pro-speciality"
            type="text"
            value={form.speciality}
            onChange={(e) => setForm({ ...form, speciality: e.target.value })}
            minLength={3}
            maxLength={50}
            required
          />

          {/* Checkbox de "Activo". El label envuelve al input para que
              hacer click en el texto también lo togglee. */}
          <label className="admin-form-inline">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Activo
          </label>

          <label>Servicios que atiende</label>
          {/* Caso especial: si no cargaste servicios todavía, no podés
              asignar ninguno. Le avisamos al admin con un mensaje
              en vez de mostrar un grupo vacío. */}
          {serviceTypes.length === 0 ? (
            <p className="admin-empty">Primero cargá tipos de servicio.</p>
          ) : (
            <div className="admin-checkbox-group">
              {serviceTypes.map((service) => (
                <label key={service.id} className="admin-form-inline">
                  <input
                    type="checkbox"
                    checked={form.serviceTypeIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                  />
                  {service.name}
                </label>
              ))}
            </div>
          )}

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
                <th>Especialidad</th>
                <th>Estado</th>
                <th>Servicios</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-empty">No hay profesionales todavía.</td>
                </tr>
              )}
              {data.content.map((pro) => {
                const busy = busyIds.has(pro.id);
                return (
                  <tr key={pro.id}>
                    <td>{pro.id}</td>
                    <td>{pro.name}</td>
                    <td>{pro.speciality}</td>
                    <td>{pro.active ? "Activo" : "Inactivo"}</td>
                    <td>
                      {/* Si no atiende ninguno mostramos un guion en
                          vez de un string vacío (más prolijo visualmente). */}
                      {pro.services.length === 0
                        ? "—"
                        : pro.services.map((s) => s.name).join(", ")}
                    </td>
                    <td className="admin-row-actions">
                      <button
                        type="button"
                        className="btn admin-row-action"
                        disabled={busy}
                        onClick={() => startEdit(pro)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger admin-row-action"
                        disabled={busy}
                        onClick={() => handleDelete(pro)}
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

export default Professionals;
