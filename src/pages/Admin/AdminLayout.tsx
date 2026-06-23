// ============================================================
// AdminLayout
// ------------------------------------------------------------
// "Chasis" del panel: sidebar moderna a la izquierda (logo +
// navegación con íconos + usuario abajo) y <Outlet/> a la
// derecha donde React Router inyecta la sub-ruta activa.
// ============================================================

import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { getCurrentUser, type CurrentUser } from "../../services/auth";
import "./Admin.css";

// Íconos inline (SVG, sin dependencias). stroke=currentColor para
// heredar el color del item (claro / verde activo) vía CSS.
const iconProps = {
  width: 18, height: 18, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

function GridIcon() {
  return <svg {...iconProps}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}
function UsersIcon() {
  return <svg {...iconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function TagIcon() {
  return <svg {...iconProps}><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" /><circle cx="7" cy="7" r="1.5" /></svg>;
}
function WhistleIcon() {
  return <svg {...iconProps}><circle cx="9" cy="13" r="5" /><path d="M14 11l7-3M9 8V4h4" /></svg>;
}
function CalendarIcon() {
  return <svg {...iconProps}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}

function AdminLayout() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { /* el guard ya validó el rol; si falla, dejamos el bloque vacío */ });
    return () => { cancelled = true; };
  }, []);

  // Iniciales para el avatar del usuario (ej. "Juan Pérez" → "JP").
  const initials = (user?.username ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "AD";

  return (
    <section className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">SC</span>
          <span className="admin-brand-name">SportCenter</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end className="admin-nav-link">
            <GridIcon /> Dashboard
          </NavLink>
          <NavLink to="/admin/turnos" className="admin-nav-link">
            <CalendarIcon /> Turnos
          </NavLink>
          <NavLink to="/admin/profesionales" className="admin-nav-link">
            <WhistleIcon /> Profesionales
          </NavLink>
          <NavLink to="/admin/servicios" className="admin-nav-link">
            <TagIcon /> Servicios
          </NavLink>
          <NavLink to="/admin/usuarios" className="admin-nav-link">
            <UsersIcon /> Usuarios
          </NavLink>
        </nav>

        <div className="admin-sidebar-user">
          <span className="admin-sidebar-avatar">{initials}</span>
          <div className="admin-sidebar-user-info">
            <strong>{user?.username ?? "Administrador"}</strong>
            <span>Admin</span>
          </div>
        </div>
      </aside>

      <div className="admin-content">
        <Outlet />
      </div>
    </section>
  );
}

export default AdminLayout;
