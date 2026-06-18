// Layout del panel de admin: sidebar fijo + Outlet para la sub-ruta activa.
import { NavLink, Outlet } from "react-router-dom";
import "./Admin.css";

function AdminLayout() {
  return (
    <section className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">Administración</h2>
        <nav className="admin-nav">
          <NavLink to="/admin" end className="admin-nav-link">
            Dashboard
          </NavLink>
          <NavLink to="/admin/usuarios" className="admin-nav-link">
            Usuarios
          </NavLink>
          <NavLink to="/admin/servicios" className="admin-nav-link">
            Servicios
          </NavLink>
          <NavLink to="/admin/profesionales" className="admin-nav-link">
            Profesionales
          </NavLink>
          <NavLink to="/admin/turnos" className="admin-nav-link">
            Turnos
          </NavLink>
        </nav>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </section>
  );
}

export default AdminLayout;
