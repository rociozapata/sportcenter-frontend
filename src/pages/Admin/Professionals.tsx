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

// Iniciales para el avatar (no hay fotos en el modelo de datos).
function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}

// Ventana de páginas para la paginación numerada.
function pageWindow(current: number, total: number): number[] {
  const pages: number[] = [];
  const start = Math.max(0, Math.min(current - 2, total - 5));
  const end = Math.min(total, Math.max(current + 3, 5));
  for (let i = start; i < end; i++) pages.push(i);
  return pages;
}

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

  // Búsqueda GLOBAL (server-side): el back matchea sobre nombre o
  // especialidad. `query` es lo tipeado; `debouncedQuery` lo que mandamos.
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

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
      const response = await getProfessionals(targetPage, PAGE_SIZE, debouncedQuery);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQuery]);

  // Debounce de la búsqueda: 350 ms tras la última tecla → página 0.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

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
      <header className="bk-head">
        <div>
          <h1>Profesionales</h1>
          <p className="dash-subtitle">Gestioná el staff y los servicios que dicta cada uno.</p>
        </div>
        <div className="pro-head-right">
          <div className="bk-stats">
            <div className="bk-stat">
              <span className="bk-stat-label">Profesionales</span>
              <span className="bk-stat-value">{data?.totalElements ?? 0}</span>
            </div>
            <div className="bk-stat">
              <span className="bk-stat-label">Servicios</span>
              <span className="bk-stat-value">{serviceTypes.length}</span>
            </div>
          </div>
          <button type="button" className="btn btn-primary pro-add-btn" onClick={startCreate}>
            + Nuevo profesional
          </button>
        </div>
      </header>

      {/* Búsqueda global (server-side): por nombre o especialidad. */}
      <div className="bk-filters">
        <div className="bk-field usr-search">
          <label htmlFor="pro-q">Buscar profesionales</label>
          <input
            id="pro-q"
            type="search"
            placeholder="Nombre o especialidad…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

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
          {data.content.length === 0 ? (
            <p className="admin-empty">
              {debouncedQuery ? `No hay profesionales que coincidan con "${debouncedQuery}".` : "No hay profesionales todavía."}
            </p>
          ) : (
            <div className="pro-grid">
              {data.content.map((pro) => {
                const busy = busyIds.has(pro.id);
                return (
                  <article key={pro.id} className="pro-card">
                    <div className="pro-card-top">
                      <span className="pro-avatar">{initialsOf(pro.name)}</span>
                      <span className={`pro-status pro-status--${pro.active ? "on" : "off"}`}>
                        {pro.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <h3 className="pro-name">{pro.name}</h3>
                    <p className="pro-speciality">{pro.speciality}</p>

                    <div className="pro-services-label">Servicios que dicta</div>
                    <div className="pro-chips">
                      {pro.services.length === 0 ? (
                        <span className="pro-chip pro-chip--empty">Ninguno</span>
                      ) : (
                        pro.services.map((s) => (
                          <span key={s.id} className="pro-chip">{s.name}</span>
                        ))
                      )}
                    </div>

                    <div className="pro-card-actions">
                      <button
                        type="button"
                        className="pro-edit-btn"
                        disabled={busy}
                        onClick={() => startEdit(pro)}
                      >
                        Editar perfil
                      </button>
                      <button
                        type="button"
                        className="bk-btn bk-btn--danger"
                        disabled={busy}
                        onClick={() => handleDelete(pro)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="bk-pager">
            <span className="bk-pager-info">
              {data.totalElements} profesional{data.totalElements === 1 ? "" : "es"} · página {data.number + 1} de {data.totalPages || 1}
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

export default Professionals;
