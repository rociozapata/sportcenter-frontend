import "./Footer.css";
import { BsTelephoneFill } from "react-icons/bs";
import { IoIosMail } from "react-icons/io";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";

function Footer() {

    return (
        <footer className="footer">

            <section>
                <h3>Contacto</h3>
                <a href="tel:+542346454942"><BsTelephoneFill /> +54 2346 454942</a>
                <a href="mailto:soporte@sportcenter.com"><IoIosMail /> soporte@sportcenter.com</a>
                <p><FaLocationDot /> Gral Rodriguez 115 - Chivilcoy </p>
            </section>

            <section>
                <h3 id="sportcenter">SportCenter</h3>
                <p>Potenciando el rendimiento a través de la precisión, 
                    la tecnología e instalaciones de élite.</p>
            </section>

            <section >
                    <h3>Nuestras Redes</h3>
                    <a href="https://www.instagram.com/sportcenter" target="_blank" rel="noopener noreferrer"><FaInstagram /> Instagram</a>
                    <a href="https://www.facebook.com/sportcenter" target="_blank" rel="noopener noreferrer"><FaFacebook /> Facebook</a>
            </section>


        </footer>
    )
}

export default Footer