import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import perfilIcono from "../assets/profile-svgrepo-com.svg";
import { isAuthenticated } from "../services/auth";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  // useLocation cambia cada vez que navegamos. Lo usamos como "pista" para
  // que React recalcule isAuthenticated() al cambiar de ruta (ej. después
  // de loguearse y redirigir al home, el icono ya apunta a /perfil).
  useLocation();

  // Si hay token guardado, el icono lleva al perfil; si no, al login.
  const perfilHref = isAuthenticated() ? "/perfil" : "/login";

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">
          <h2>SportCenter</h2>
        </Link>
      </div>

      <button
        className={`navbar-toggle ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir menú"
        aria-expanded={isOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`navbar-menu ${isOpen ? "is-open" : ""}`}>
        <div className="navbar-links">
          <Link to="/" onClick={closeMenu}>Inicio</Link>
          <Link to="/servicios" onClick={closeMenu}>Servicios</Link>
          <Link to="/turnos" onClick={closeMenu}>Mis turnos</Link>
        </div>
        <div className="navbar-auth">
          <Link to={perfilHref} onClick={closeMenu}>
            <img src={perfilIcono} alt="Icono usuario" width={24} height={24} />
          </Link>
          <Link to="/turnos" className="nav-button" onClick={closeMenu}>Reservar</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
