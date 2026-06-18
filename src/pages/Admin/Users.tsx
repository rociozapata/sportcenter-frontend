// Sección de gestión de usuarios.
// Lista paginada con acciones: cambiar rol y eliminar.
import { useEffect, useState } from "react";
import {
  deleteUser,
  getUsers,
  updateUserRole,
  type AdminUser,
  type PageResponse,
  type UserRole,
} from "../../services/admin";

const PAGE_SIZE = 10;

function Users() {
  const [data, setData] = useState<PageResponse<AdminUser> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ids con una acción en curso, para deshabilitar sus botones.
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  async function load(targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const response = await getUsers(targetPage, PAGE_SIZE);
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

  function setBusy(id: number, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleRoleChange(user: AdminUser, role: UserRole) {
    if (role === user.role) return;
    setBusy(user.id, true);
    try {
      const updated = await updateUserRole(user.id, role);
      setData((prev) => prev && {
        ...prev,
        content: prev.content.map((u) => (u.id === updated.id ? updated : u)),
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo cambiar el rol");
    } finally {
      setBusy(user.id, false);
    }
  }

  async function handleDelete(user: AdminUser) {
    const confirmed = window.confirm(
      `¿Eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    setBusy(user.id, true);
    try {
      await deleteUser(user.id);
      // Si la página queda vacía y no es la primera, retroceder una página.
      const remaining = (data?.content.length ?? 1) - 1;
      if (remaining === 0 && page > 0) setPage(page - 1);
      else load(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar el usuario");
      setBusy(user.id, false);
    }
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <h1>Usuarios</h1>
        {data && (
          <span className="admin-meta">
            {data.totalElements} en total · página {data.number + 1} de {data.totalPages || 1}
          </span>
        )}
      </header>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-loading">Cargando...</p>}

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
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-empty">No hay usuarios para mostrar.</td>
                </tr>
              )}
              {data.content.map((user) => {
                const busy = busyIds.has(user.id);
                return (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.role}
                        disabled={busy}
                        onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
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
