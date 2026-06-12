import "./Navbar.css";
import perfilIcono from "../assets/profile-svgrepo-com.svg";
function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <a href="/">
          <h2>SportCenter</h2>
        </a>
      </div>
      <div className="navbar-links">
        <a href="">Inicio</a>
        <a href="">Servicios</a>
        <a href="">Mis turnos</a>
      </div>
      <div className="navbar-auth">
        <a href="">
          <img src={perfilIcono} alt="Icono usuario" width={24} height={24} />
        </a>
        <button className="nav-button">Reservar</button>
      </div>
    </nav>
  );
}

export default Navbar;
