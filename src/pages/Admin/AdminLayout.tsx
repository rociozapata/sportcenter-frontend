// ============================================================
// AdminLayout
// ------------------------------------------------------------
// El "chasis" del panel: una sidebar fija a la izquierda con los
// links de navegación y un <Outlet/> a la derecha donde React
// Router inyecta la sub-ruta activa (Dashboard, Users, etc).
//
// Este componente no maneja datos: solo arma el layout.
// ============================================================

// NavLink: como Link, pero agrega automáticamente la clase "active"
//   al link cuyo "to" coincide con la URL actual. Lo usamos para
//   resaltar la sección seleccionada en la sidebar.
// Outlet: placeholder donde React Router monta la ruta hija.
import { NavLink, Outlet } from "react-router-dom";

// CSS del panel (layout + tablas + forms + métricas).
import "./Admin.css";

function AdminLayout() {
  return (
    // Contenedor grid: 240px de sidebar + el resto para el contenido.
    <section className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">Administración</h2>

        <nav className="admin-nav">
          {/* end={true} en el NavLink del dashboard evita que matchee
              también las sub-rutas (sin end, "/admin" matchearía
              también "/admin/usuarios" y se marcaría como activo
              en simultáneo). */}
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
        {/* Acá React Router renderiza la página de la sub-ruta
            que matchee (ej. /admin/usuarios → <Users/>). */}
        <Outlet />
      </div>
    </section>
  );
}

export default AdminLayout;
