// ABM de profesionales. Reusa el mismo patrón que Services pero con
// un multi-select de tipos de servicio.
import { useEffect, useState, type FormEvent } from "react";
import {
  createProfessional,
  deleteProfessional,
  getProfessionals,
  getServiceTypes,
  updateProfessional,
  type PageResponse,
  type Professional,
  type ProfessionalPayload,
  type ServiceType,
} from "../../services/admin";

const PAGE_SIZE = 10;

const EMPTY_FORM: ProfessionalPayload = {
  name: "",
  speciality: "",
  active: true,
  serviceTypeIds: [],
};

function Professionals() {
  const [data, setData] = useState<PageResponse<Professional> | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProfessionalPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

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

  // Cargamos los tipos de servicio una sola vez para alimentar el selector
  // del form. 100 alcanza de sobra para un sportcenter realista.
  useEffect(() => {
    getServiceTypes(0, 100)
      .then((res) => setServiceTypes(res.content))
      .catch(() => setServiceTypes([]));
  }, []);

  function startCreate() {
    setEditingId(0);
    setForm(EMPTY_FORM);
  }

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

  function toggleService(id: number) {
    setForm((prev) => {
      const has = prev.serviceTypeIds.includes(id);
      return {
        ...prev,
        serviceTypeIds: has
          ? prev.serviceTypeIds.filter((x) => x !== id)
          : [...prev.serviceTypeIds, id],
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

          <label className="admin-form-inline">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Activo
          </label>

          <label>Servicios que atiende</label>
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
