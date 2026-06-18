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

  // ------ Carga de datos -----------------------------------------------

  // Función reutilizable para cargar una página concreta.
  // La sacamos afuera del useEffect para poder llamarla también
  // después de un delete (refrescar la tabla).
  async function load(targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const response = await getUsers(targetPage, PAGE_SIZE);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista");
    } finally {
      // finally se ejecuta haya error o no: siempre liberamos el loading.
      setLoading(false);
    }
  }

  // Cada vez que cambia `page`, volvemos a pedir.
  useEffect(() => {
    load(page);
  }, [page]);

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

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <h1>Usuarios</h1>
        {/* Metadata de paginación. data?.x => solo si data existe. */}
        {data && (
          <span className="admin-meta">
            {data.totalElements} en total · página {data.number + 1} de {data.totalPages || 1}
          </span>
        )}
      </header>

      {/* Mensajes condicionales arriba de la tabla. */}
      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-loading">Cargando...</p>}

      {/* La tabla solo se renderiza cuando no estamos cargando y hay data. */}
      {!loading && data && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Caso vacío: una fila con colspan que cubre toda la tabla. */}
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-empty">No hay usuarios para mostrar.</td>
                </tr>
              )}

              {/* Filas con datos. key={user.id} ayuda a React a
                  reconciliar el DOM eficientemente cuando cambia la lista. */}
              {data.content.map((user) => {
                const busy = busyIds.has(user.id);
                return (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      {/* Controlled component: value sale del estado, el
                          onChange lo actualiza pidiéndole al back. */}
                      <select
                        value={user.role}
                        disabled={busy}
                        onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    {/* new Date(...).toLocaleDateString() formatea según
                        la locale del browser. Suficiente para un TP. */}
                    <td>{new Date(user.createdDate).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger admin-row-action"
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

          {/* Botones de paginación. data.first/last vienen del back:
              true cuando NO podemos ir más atrás/adelante. */}
          <div className="admin-pagination">
            <button
              type="button"
              className="btn"
              disabled={data.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn"
              disabled={data.last}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Users;
