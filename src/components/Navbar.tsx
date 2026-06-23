// Hooks de React: useState para estado local, useEffect para efectos secundarios
// (ej. pedir datos al backend), useRef para guardar una referencia a un nodo del DOM.
import { useEffect, useRef, useState } from "react";
// Herramientas de react-router-dom: Link para navegar sin recargar la página,
// useLocation para saber en qué ruta estamos, useNavigate para mandar al usuario
// a otra ruta desde el código (ej. después de logout).
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import perfilIcono from "../assets/profile-svgrepo-com.svg";
// Funciones y tipo del servicio de auth. getCurrentUser pega a /auth/me,
// isAuthenticated mira si hay token, logout lo borra. CurrentUser es el tipo
// del objeto que devuelve la API con los datos del usuario.
import { getCurrentUser, isAuthenticated, logout, type CurrentUser } from "../services/auth";

function Navbar() {
  // Estado del menú hamburguesa (mobile): true = desplegado, false = cerrado.
  const [isOpen, setIsOpen] = useState(false);
  // Estado del dropdown del perfil (el menú que cae al clickear el ícono).
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Datos del usuario logueado. Empieza en null porque todavía no los pedimos.
  // Cuando getCurrentUser() responda, vamos a guardarlos acá.
  const [user, setUser] = useState<CurrentUser | null>(null);
  // Referencia al <div> que envuelve el ícono + el dropdown. La usamos para
  // detectar clicks "afuera" y cerrar el menú (ver el useEffect de más abajo).
  const profileRef = useRef<HTMLDivElement | null>(null);
  // Función para cambiar de ruta desde código. La usamos en el logout.
  const navigate = useNavigate();
  // Objeto con info de la ruta actual (pathname, search, etc.). Lo usamos
  // como "disparador" para refrescar datos cuando el usuario navega.
  const location = useLocation();

  // Variable booleana: ¿hay token guardado? Se recalcula en cada render.
  // Así, apenas el usuario se loguea (y volvemos a renderizar), authed pasa a true.
  const authed = isAuthenticated();

  // Helpers cortos para cerrar cada menú. Los definimos una vez para no
  // repetir setIsOpen(false) por todos lados.
  const closeMenu = () => setIsOpen(false);
  const closeProfile = () => setIsProfileOpen(false);

  // EFECTO 1: cargar (o limpiar) los datos del usuario.
  // Se dispara cuando cambia `authed` o la ruta. Así, después de loguearse y
  // redirigir al home, el navbar ya muestra el nombre del usuario.
  useEffect(() => {
    // Si no hay sesión, nos aseguramos de no mostrar datos viejos.
    if (!authed) {
      setUser(null);
      return;
    }
    // Bandera para evitar setear estado si el componente se desmonta antes
    // de que termine el fetch (clásico problema de "memory leak" en React).
    let cancelled = false;
    getCurrentUser()
      .then((u) => { if (!cancelled) setUser(u); })
      // Si falla (token vencido, red caída, etc.), dejamos user en null.
      // El dropdown va a mostrar "Mi cuenta" como fallback.
      .catch(() => { if (!cancelled) setUser(null); });
    // La función que retorna useEffect se ejecuta cuando el efecto se "limpia"
    // (al desmontar o antes de volver a correr). Marcamos cancelled = true.
    return () => { cancelled = true; };
  }, [authed, location.pathname]);

  // EFECTO 1.5: mientras el drawer mobile está abierto, cerrarlo con Escape
  // y bloquear el scroll del body para que la página de atrás no se mueva.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Guardamos el valor previo y lo restauramos en el cleanup para no
    // pisar un overflow que otra parte de la app pudiera haber seteado.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // EFECTO 2: cerrar el dropdown del perfil al clickear afuera.
  // Solo escuchamos el evento mientras el menú está abierto, para no
  // gastar listeners de más cuando está cerrado.
  useEffect(() => {
    if (!isProfileOpen) return;
    // Handler: si el click fue fuera del div del perfil, cerramos el menú.
    const onClick = (e: MouseEvent) => {
      // profileRef.current apunta al <div className="navbar-profile">.
      // .contains() devuelve true si el target del click está adentro.
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    // Nos suscribimos al evento de mouse a nivel documento.
    document.addEventListener("mousedown", onClick);
    // Cleanup: removemos el listener cuando se cierra el menú o se desmonta.
    return () => document.removeEventListener("mousedown", onClick);
  }, [isProfileOpen]);

  // Handler del botón "Cerrar sesión".
  const handleLogout = () => {
    logout();             // borra el token del localStorage
    setUser(null);        // limpia los datos del usuario en memoria
    setIsProfileOpen(false); // cierra el dropdown
    closeMenu();          // cierra el menú hamburguesa (por si estaba abierto en mobile)
    navigate("/");        // manda al usuario al home
  };

  return (
    <nav className="navbar">
      {/* Logo a la izquierda: clickeable, lleva al home. */}
      <div className="navbar-logo">
        <Link to="/">
          <h2>SportCenter</h2>
        </Link>
      </div>

      {/* Botón hamburguesa: solo se muestra en mobile (lo controla el CSS). */}
      <button
        className={`navbar-toggle ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir menú"
        aria-expanded={isOpen}
      >
        {/* Tres spans = las tres rayitas del ícono hamburguesa. */}
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Backdrop oscuro detrás del drawer (solo mobile). Clickearlo cierra
          el menú. Solo existe en el DOM mientras el drawer está abierto. */}
      {isOpen && (
        <div
          className="navbar-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Menú principal. En desktop está siempre visible; en mobile se muestra
          solo cuando isOpen es true (se le agrega la clase "is-open"). */}
      <div className={`navbar-menu ${isOpen ? "is-open" : ""}`}>
        {/* Links de navegación. onClick={closeMenu} cierra el hamburguesa
            después de tocar un link, así en mobile no queda abierto. */}
        <div className="navbar-links">
          <Link to="/" onClick={closeMenu}>Inicio</Link>
          <Link to="/servicios" onClick={closeMenu}>Servicios</Link>
          <Link to="/perfil" onClick={closeMenu}>Mis turnos</Link>
          {/* Acceso directo al panel de admin: solo para usuarios con rol
              ADMIN. Antes vivía únicamente en el dropdown del perfil. */}
          {user?.role === "ADMIN" && (
            <Link to="/admin" onClick={closeMenu}>Panel de admin</Link>
          )}
        </div>

        {/* Bloque derecho del navbar: ícono de perfil + botón "Reservar". */}
        <div className="navbar-auth">
          {/* Wrapper del perfil: necesita position:relative en el CSS para
              que el dropdown se posicione respecto a él. ref={profileRef}
              nos sirve para detectar clicks afuera. */}
          <div className="navbar-profile" ref={profileRef}>
            {/* Botón que abre/cierra el dropdown. No es un Link porque no
                queremos navegar al clickear: solo desplegar el menú. */}
            <button
              type="button"
              className="navbar-profile-trigger"
              onClick={() => {
                // Con sesión: abre/cierra el dropdown.
                // Sin sesión: no tiene sentido un menú vacío, así que
                // mandamos directo al login, recordando la ruta actual
                // para volver acá después de iniciar sesión.
                if (authed) {
                  setIsProfileOpen((v) => !v);
                } else {
                  closeMenu();
                  navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
                }
              }}
              aria-label={authed ? "Abrir menú de perfil" : "Iniciar sesión"}
              aria-expanded={authed ? isProfileOpen : undefined}
            >
              {/* alt="" porque al lado tenemos aria-label en el botón:
                  evitamos que el lector de pantalla lea dos veces lo mismo. */}
              <img src={perfilIcono} alt="" width={24} height={24} />
              {/* Indicador verde: solo aparece si hay sesión activa.
                  aria-hidden porque la info ya la da el aria-label del botón. */}
              {authed && <span className="navbar-profile-dot" aria-hidden="true" />}
              {/* Etiqueta de texto solo visible en mobile (CSS la oculta en
                  desktop). Aclara qué es el avatar dentro del drawer. */}
              <span className="navbar-profile-label">
                {authed ? (user?.username ?? "Mi cuenta") : "Ingresar"}
              </span>
            </button>

            {/* El dropdown solo existe con sesión iniciada y abierto. Sin
                sesión, el botón de arriba navega al login en vez de abrir
                este menú. */}
            {authed && isProfileOpen && (
              <div className="navbar-profile-menu" role="menu">
                {/* Cabecera del menú con nombre y email del usuario. */}
                <div className="navbar-profile-header">
                  <span className="navbar-profile-name">
                    {/* Si user todavía no llegó (fetch en curso o falló),
                        mostramos "Mi cuenta" como fallback. */}
                    {user?.username ?? "Mi cuenta"}
                  </span>
                  {/* El email solo se renderiza si lo tenemos. */}
                  {user?.email && (
                    <span className="navbar-profile-email">{user.email}</span>
                  )}
                </div>
                {/* Cada link cierra ambos menús al ser clickeado. */}
                <Link to="/perfil" role="menuitem" onClick={() => { closeProfile(); closeMenu(); }}>
                  Mi perfil
                </Link>
                {/* Botón (no link) porque no navegamos: ejecutamos lógica. */}
                <button type="button" role="menuitem" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

          {/* Botón principal de acción: lleva a la página de turnos. */}
          <Link to="/turnos" className="btn btn-accent" onClick={closeMenu}>Reservar</Link>
        </div>
      </div>
    </nav>
  );
}

// export default: cómo se exporta cuando hay una sola cosa "principal" en el archivo.
// Permite que en otros archivos hagamos `import Navbar from "./Navbar"` sin llaves.
export default Navbar;
