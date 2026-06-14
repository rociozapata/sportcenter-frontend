import { Link } from "react-router-dom";
import "./Benefits.css";
// Imagen del lado derecho. Reutilizamos una de las que ya están en assets.
// Si después tenés una foto específica de comunidad, la cambiás acá.
import benefitsImage from "../../assets/facility-gym.png";

// Definimos los beneficios como un array para mapearlos en el render.
// Cada item tiene un ícono SVG inline (sin assets externos), título y descripción.
// Si querés sumar/sacar beneficios, alcanza con tocar este array.
const benefits = [
    {
        title: "Reservá tus turnos sin vueltas",
        description:
            "Bookeá canchas, clases y espacios desde tu cuenta en segundos, todos los días de la semana.",
        // Ícono check/calendar simplificado.
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                 strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 3v4M16 3v4" />
                <path d="M9 14l2 2 4-4" />
            </svg>
        ),
    },
    {
        title: "Comunidad activa",
        description:
            "Conocé gente que entrena, sumate a clases grupales y compartí canchas con otros socios.",
        // Ícono de personas (comunidad).
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                 strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <circle cx="9" cy="8" r="3" />
                <circle cx="17" cy="9" r="2.5" />
                <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
                <path d="M15 20c0-2 2-3.5 4-3.5s2.5 1 2.5 1" />
            </svg>
        ),
    },
    {
        title: "Acceso a todas las instalaciones",
        description:
            "Tenis, pádel, funcional, crossfit y vestuarios — un solo lugar para todo lo que necesitás.",
        // Ícono de llave/acceso simplificado.
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                 strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <circle cx="8" cy="12" r="4" />
                <path d="M12 12h9M17 12v4M21 12v3" />
            </svg>
        ),
    },
];

function Benefits() {
    return (
        <section className="benefits">
            {/* Columna izquierda: texto, lista y CTA. */}
            <div className="benefits-content">
                {/* "Eyebrow" = textito chico arriba del título, sirve como categoría. */}
                <span className="benefits-eyebrow">Sumate a la comunidad</span>
                <h2 className="benefits-title">Beneficios de ser parte</h2>

                {/* Lista de beneficios. Usamos <ul> por semántica (es una lista). */}
                <ul className="benefits-list">
                    {benefits.map((b) => (
                        <li key={b.title} className="benefit-item">
                            {/* Caja del ícono con fondo verde, color del SVG = primary. */}
                            <span className="benefit-icon" aria-hidden="true">
                                {b.icon}
                            </span>
                            <div>
                                <h3 className="benefit-title">{b.title}</h3>
                                <p className="benefit-desc">{b.description}</p>
                            </div>
                        </li>
                    ))}
                </ul>

                {/* CTA: lleva al registro. Usa las clases globales del sistema de botones. */}
                <Link to="/register" className="btn btn-primary">
                    Unite a nosotros
                </Link>
            </div>

            {/* Columna derecha: imagen con esquinas redondeadas. */}
            <div className="benefits-media">
                <img src={benefitsImage} alt="Socios entrenando en SportCenter" />
            </div>
        </section>
    );
}

export default Benefits;
