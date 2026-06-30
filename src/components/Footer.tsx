import { Link } from "react-router-dom";
import "./Footer.css";
import { BsTelephoneFill, BsClockFill } from "react-icons/bs";
import { IoIosMail } from "react-icons/io";
import { FaLocationDot } from "react-icons/fa6";

function Footer() {
    // Año dinámico para el copyright: si en 2027 alguien abre la página,
    // se actualiza solo sin tener que tocar el código.
    const year = new Date().getFullYear();

    // URL a Google Maps con la dirección codificada. Si querés apuntar a un
    // lugar exacto, conviene reemplazarla por un link generado desde el mapa.
    const mapsHref =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("Gral Rodriguez 115, Chivilcoy");

    return (
        <footer className="footer">
            {/* Contenido principal: tres columnas en desktop. */}
            <div className="footer-grid">

                {/* Columna 1: información de contacto. */}
                <section className="footer-col">
                    <h3>Contacto</h3>

                    <a href="tel:+542346454942" className="footer-link">
                        <BsTelephoneFill aria-hidden="true" />
                        <span>+54 2346 454942</span>
                    </a>

                    <a href="mailto:soporte@sportcenter.com" className="footer-link">
                        <IoIosMail aria-hidden="true" />
                        <span>soporte@sportcenter.com</span>
                    </a>

                    {/* La dirección abre Google Maps en una pestaña nueva. */}
                    <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        <FaLocationDot aria-hidden="true" />
                        <span>Gral Rodriguez 115 - Chivilcoy</span>
                    </a>

                    {/* Horarios de atención. */}
                    <div className="footer-link footer-static">
                        <BsClockFill aria-hidden="true" />
                        <span>Lun a Vie: 8:00 - 22:00<br />Sáb: 9:00 - 14:00</span>
                    </div>
                </section>

                {/* Columna 2 (central, más ancha): branding + descripción + redes. */}
                <section className="footer-col footer-brand">
                    <h2 className="footer-logo">SportCenter</h2>
                    <p className="footer-tagline">
                        Potenciando el rendimiento a través de la precisión,
                        la tecnología e instalaciones de élite.
                    </p>

                </section>

                {/* Columna 3: enlaces útiles internos del sitio. */}
                <section className="footer-col">
                    <h3>Enlaces útiles</h3>
                    <Link to="/servicios" className="footer-link">Servicios</Link>
                    <Link to="/perfil" className="footer-link">Mis turnos</Link>
                </section>
            </div>

            {/* Barra inferior con copyright, separada por una línea divisora. */}
            <div className="footer-bottom">
                <p>© {year} SportCenter — Todos los derechos reservados.</p>
            </div>
        </footer>
    );
}

export default Footer;
