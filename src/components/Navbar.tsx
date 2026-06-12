import { useState } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import perfilIcono from "../assets/profile-svgrepo-com.svg";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

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
        <div className="navbar-auth">y
          <Link to="/perfil" onClick={closeMenu}>
            <img src={perfilIcono} alt="Icono usuario" width={24} height={24} />
          </Link>
          <Link to="/turnos" className="nav-button" onClick={closeMenu}>Reservar</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
