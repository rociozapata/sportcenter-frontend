import { useState } from "react";
import "./Navbar.css";
import perfilIcono from "../assets/profile-svgrepo-com.svg";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <a href="/">
          <h2>SportCenter</h2>
        </a>
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
          <a href="" onClick={closeMenu}>Inicio</a>
          <a href="" onClick={closeMenu}>Servicios</a>
          <a href="" onClick={closeMenu}>Mis turnos</a>
        </div>
        <div className="navbar-auth">
          <a href="" onClick={closeMenu}>
            <img src={perfilIcono} alt="Icono usuario" width={24} height={24} />
          </a>
          <button className="nav-button" onClick={closeMenu}>Reservar</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
