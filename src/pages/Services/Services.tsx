import "./Services.css"
import tenisImg from "/src/assets/service-tenis.jpg";
import padelImg from "/src/assets/service-padel.jpg";
import futbolImg from "/src/assets/service-futbol.jpg";
import crossfitImg from "/src/assets/service-crossfit.jpg";
import funcionalImg from "/src/assets/service-funcional.jpg"

import staffTenisImg from "/src/assets/staff-tenis.webp";
import staffPadelImg from "/src/assets/staff-pade.jpg";
import staffFutbolImg from "/src/assets/staff-futbol.jpg";
import staffFuncionalImg from "/src/assets/staff-funcional.webp";
import staffCrossfitImg from "/src/assets/staff-crossfit.webp";

const service = [
    {
        key: "tenis",
        title: "Clases de Tenis",
        description: "Perfeccioná tu juego en nuestras canchas indoor de nivel internacional. Diseñadas con superficies de absorción premium para cuidar tus articulaciones, ofrecemos entrenamientos dinámicos tanto en modalidades grupales como individuales, adaptadas desde principiantes hasta nivel competitivo.",
        img: tenisImg
    },

    {
        key: "padel",
        title: "Clases de Pádel",
        description: "Sumate a la disciplina con mayor crecimiento del complejo. Contamos con 8 canchas panorámicas de última generación y techos de 12 metros de altura para un juego sin límites. Aprendé táctica, posicionamiento y mejorá tu nivel en nuestras clases individuales o en turnos grupales súper entretenidos.",
        img: padelImg
    },

    {
        key: "futbol",
        title: "Futbol",
        description: "Potenciá tu juego en nuestras canchas de césped sintético certificado FIFA Pro, diseñadas para garantizar el máximo agarre y seguridad. Ofrecemos entrenamientos técnicos y clases de fútbol grupales para todas las edades, ideales para mejorar tu rendimiento físico y táctico, además del espacio perfecto para tus torneos o el clásico partido con amigos.",
        img: futbolImg
    },

    {
        key: "crossfit",
        title: "Crossfit",
        description: "Fuerza, potencia y comunidad. Desafiá tus límites con entrenamientos de alta intensidad que combinan gimnasia, levantamiento olímpico y cardio. Totalmente adaptable a tu nivel actual.",
        img: crossfitImg
    },

    {
        key: "funcional",
        title: "Entrenamiento Funcional",
        description: "El entrenamiento que se adapta a tu vida. Diseñado tanto para deportistas que buscan optimizar su rendimiento en la cancha, como para quienes quieren mejorar su fuerza y agilidad del día a día con circuitos dinámicos.",
        img: funcionalImg
    }
];

const staff = [
    {
        key: "tenis",
        name: "Natalia",
        role: "Tenis",
        img: staffTenisImg
    },

    {
        key: "padel",
        name: "Gonzalo",
        role: "Padel",
        img: staffPadelImg
    },

    {
        key: "futbol",
        name: "Andrés",
        role: "Futbol",
        img: staffFutbolImg
    },

    {
        key: "funcional",
        name: "Sol",
        role: "Funcional",
        img: staffFuncionalImg
    },

    {
        key: "crossfit",
        name: "Facundo",
        role: "Crossfit",
        img: staffCrossfitImg
    }

];

function Services() {
    return (
        <>
            {/* seccio servicios */}
            <section className="services">
                <h2 className="services-header">Nuestras Clases</h2>
                <div className="services-zigzag">
                    {service.map((s) => (
                        <article key={s.key} className="services-zigzag-row">

                            <div className="services-zigzag-img">
                                <img src={s.img} alt={s.title} />
                            </div>

                            <div className="services-zigzag-content">
                                <h3 className="services-zigzag-title">{s.title}</h3>
                                <p className="services-zigzag-description">{s.description}</p>
                                <button className="btn btn-accent">Ver horarios</button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {/* barra divisoria de secciones */}
            <div className="brand-divider-bar">
                <span className="brand-divider-text">SportCenter</span>
            </div>

            {/* seccion staff */}
            <section className="staff-section">
                <div className="staff-container">
                    <div className="staff-header">
                        <h2 className="services-header">Nuestro Staff</h2>
                        <p className="staff-intro">
                            Detrás de cada gran deportista hay un gran equipo. En SportCenter contamos con
                            profesionales apasionados, certificados internacionalmente y comprometidos con tus objetivos.
                            Ya sea que estés dando tus primeros pasos o buscando tu máximo rendimiento competitivo,
                            nuestros entrenadores están listos para guiarte, motivarte y exigirte en cada sesión.
                        </p>
                    </div>

                    <div className="staff-grid">
                        {staff.map((p) => (
                            <article key={p.key} className={`staff-card staff-card--${p.key}`}>

                                <div className="staff-card-img">
                                    <img src={p.img} alt={p.name} />
                                </div>

                                <div className="staff-card-info">
                                    <h3 className="staff-card-name">{p.name}</h3>
                                    <p className="staff-card-role">{p.role}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </>

    );
}

export default Services;
