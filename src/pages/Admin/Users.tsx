// ============================================================
// Users (sección /admin/usuarios)
// ------------------------------------------------------------
// Lista paginada de usuarios con dos acciones por fila:
//   - Cambiar el rol con un <select> (USER ↔ ADMIN).
//   - Eliminar el usuario (con confirmación).
//
// Patrón general que se repite en las otras secciones del panel:
//   1. Estado para los datos, la página, loading y error.
//   2. useEffect que dispara load() cada vez que cambia la página.
//   3. Handlers que llaman al service y patchean el estado local.
// ============================================================

import { useEffect, useState } from "react";

// Importamos las funciones del service y los tipos que vamos a usar.
// Tipar `AdminUser` y `PageResponse<AdminUser>` nos garantiza que
// no nos equivoquemos con los nombres de campos.
import {
  deleteUser,
  getUsers,
  updateUserRole,
  type AdminUser,
  type PageResponse,
  type UserRole,
} from "../../services/admin";

// Constante: cuántos items por página pedimos al back.
// Si en el futuro lo querés hacer configurable, viene de acá.
const PAGE_SIZE = 10;

// Iniciales para el avatar (ej. "Juan Pérez" → "JP").
function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}

// Ventana de páginas alrededor de la actual, para la paginación numerada.
function pageWindow(current: number, total: number): number[] {
  const pages: number[] = [];
  const start = Math.max(0, Math.min(current - 2, total - 5));
  const end = Math.min(total, Math.max(current + 3, 5));
  for (let i = start; i < end; i++) pages.push(i);
  return pages;
}

function Users() {
  // ------ Estado --------------------------------------------------------

  // La página actual completa, tal como la devuelve el back (con paginación).
  // null mientras todavía no llegó la primera respuesta.
  const [data, setData] = useState<PageResponse<AdminUser> | null>(null);

  // Índice de página actual (arranca en 0).
  // Cambiarlo dispara el useEffect que vuelve a pedir.
  const [page, setPage] = useState(0);

  // Flag de carga para mostrar "Cargando...".
  const [loading, setLoading] = useState(true);

  // Mensaje de error a mostrar arriba de la tabla. null = no hay error.
  const [error, setError] = useState<string | null>(null);

  // Set con los ids de filas que tienen una acción EN VUELO.
  // Sirve para deshabilitar SOLO los botones de esa fila mientras
  // se procesa. Si usáramos un solo booleano global, se congelaría
  // toda la tabla aunque la acción afecte a un solo item.
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  // Búsqueda GLOBAL (server-side): el back matchea sobre username/email
  // con paginación real. `query` es lo que el usuario tipea; `debouncedQuery`
  // es lo que efectivamente mandamos, con un retardo para no pegarle al
  // back en cada tecla.
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce: 350 ms después de la última tecla, fijamos el término de
  // búsqueda y reseteamos a la página 0 (los resultados son una lista nueva).
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // ------ Carga de datos -----------------------------------------------

  // Función reutilizable para cargar una página concreta (con el término
  // de búsqueda vigente). La sacamos afuera del useEffect para poder
  // llamarla también después de un delete (refrescar la tabla).
  async function load(targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const response = await getUsers(targetPage, PAGE_SIZE, debouncedQuery);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista");
    } finally {
      // finally se ejecuta haya error o no: siempre liberamos el loading.
      setLoading(false);
    }
  }

  // Recargamos al cambiar de página o el término de búsqueda.
  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQuery]);

  // ------ Helper para marcar/desmarcar filas como "ocupadas" -----------

  // Las funciones que tocan Set deben crear un Set NUEVO para que
  // React detecte el cambio (no mutar el existente). De ahí el spread.
  function setBusy(id: number, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // ------ Acciones ------------------------------------------------------

  // Cambiar el rol de un usuario.
  // Si el rol elegido es el que ya tenía, no hacemos nada (evita PATCH inútil).
  async function handleRoleChange(user: AdminUser, role: UserRole) {
    if (role === user.role) return;
    setBusy(user.id, true);
    try {
      const updated = await updateUserRole(user.id, role);

      // Patch local: reemplazamos el item en el array sin re-fetchear
      // toda la página. Más rápido y conserva el scroll del usuario.
      setData((prev) => prev && {
        ...prev,
        content: prev.content.map((u) => (u.id === updated.id ? updated : u)),
      });
    } catch (err) {
      // alert es feo pero alcanza para un TP. En una app real sería
      // un toast/snackbar.
      alert(err instanceof Error ? err.message : "No se pudo cambiar el rol");
    } finally {
      setBusy(user.id, false);
    }
  }

  // Eliminar usuario.
  // Si era el último item de la página y no estamos en la 0,
  // retrocedemos para que no quede una página vacía visible.
  async function handleDelete(user: AdminUser) {
    const confirmed = window.confirm(
      `¿Eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    setBusy(user.id, true);
    try {
      await deleteUser(user.id);
      const remaining = (data?.content.length ?? 1) - 1;
      if (remaining === 0 && page > 0) setPage(page - 1);
      else load(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar el usuario");
      // No liberamos busy en el catch porque al recargar la página
      // el item podría ya no existir. Pero como hubo error, sí liberamos:
      setBusy(user.id, false);
    }
  }

  // ------ Render --------------------------------------------------------

  const users = data?.content ?? [];

  return (
    <div className="admin-panel">
      <header className="bk-head">
        <div>
          <h1>Usuarios</h1>
          <p className="dash-subtitle">Gestioná las cuentas y sus roles.</p>
        </div>
        <div className="bk-stats">
          <div className="bk-stat">
            <span className="bk-stat-label">Total usuarios</span>
            <span className="bk-stat-value">{data?.totalElements ?? 0}</span>
          </div>
        </div>
      </header>

      {/* Búsqueda global (server-side, todas las páginas). */}
      <div className="bk-filters">
        <div className="bk-field usr-search">
          <label htmlFor="usr-q">Buscar usuarios</label>
          <input
            id="usr-q"
            type="search"
            placeholder="Nombre o email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-loading">Cargando…</p>}

      {!loading && data && (
        <>
          <div className="bk-table-wrap">
            <table className="bk-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Alta</th>
                  <th className="bk-actions-col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-empty">
                      {debouncedQuery ? `No hay usuarios que coincidan con "${debouncedQuery}".` : "No hay usuarios para mostrar."}
                    </td>
                  </tr>
                )}

                {users.map((user) => {
                  const busy = busyIds.has(user.id);
                  return (
                    <tr key={user.id}>
                      <td data-label="Usuario">
                        <span className="bk-member">
                          <span className="bk-avatar">{initialsOf(user.username)}</span>
                          <span className="bk-member-info">
                            <strong>{user.username}</strong>
                            <small>#{user.id}</small>
                          </span>
                        </span>
                      </td>
                      <td data-label="Email">{user.email}</td>
                      <td data-label="Rol">
                        <span className={`usr-role usr-role--${user.role.toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                      <td data-label="Alta">{new Date(user.createdDate).toLocaleDateString()}</td>
                      <td data-label="Acciones" className="bk-actions">
                        {/* Cambiar rol: controlled select. */}
                        <select
                          className="usr-role-select"
                          value={user.role}
                          disabled={busy}
                          aria-label={`Rol de ${user.username}`}
                          onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <button
                          type="button"
                          className="bk-btn bk-btn--danger"
                          disabled={busy}
                          onClick={() => handleDelete(user)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación numerada (server-side). */}
          <div className="bk-pager">
            <span className="bk-pager-info">
              {data.totalElements} usuario{data.totalElements === 1 ? "" : "s"} · página {data.number + 1} de {data.totalPages || 1}
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

export default Users;
