import "./Services.css";

// Datos de cada instalación. Separarlos del JSX permite renderizar
// las 4 cards con un solo map en vez de escribir 4 bloques iguales.
// - key:   id único (también define qué imagen de fondo usa via CSS)
// - size:  "wide" ocupa 2 columnas, "narrow" ocupa 1 → crea el grid asimétrico
const facilities = [
    {
        key: "tennis",
        title: "Tenis ",
        description: "4 canchas indoor de campeonato con superficies de absorción premium.",
        size: "wide",
    },
    {
        key: "gym",
        title: "Gimnasio",
        description: "Equipamiento avanzado con seguimiento biométrico.",
        size: "narrow",
    },
    {
        key: "padel",
        title: "Zona de Pádel",
        description: "8 canchas panorámicas con techos de 12m.",
        size: "narrow",
    },
    {
        key: "soccer",
        title: "Fútbol 5",
        description: "Césped sintético FIFA Pro para máximo agarre y seguridad.",
        size: "wide",
    },
];

function Services() {
    return (
        <section className="services">
            {/* Wave divisor: SVG decorativo que une el fondo oscuro del Hero
                con el fondo claro de Services. preserveAspectRatio="none" deja
                que se estire a todo el ancho sin mantener proporciones.
                aria-hidden porque es puramente decorativo. */}
            <svg
                className="services-wave"
                viewBox="0 0 1440 80"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <path d="M0,0 L1440,0 L1440,30 Q720,90 0,30 Z" fill="#0a1929" />
            </svg>

            <div className="services-header">
                <p className="services-kicker">EQUIPAMIENTO DE PRIMER NIVEL</p>
                <h2 className="services-title">Nuestras Instalaciones</h2>
            </div>

            <div className="services-grid">
                {/* Recorre el array y renderiza una card por cada instalación.
                    React necesita la prop `key` para identificar cada item
                    de la lista de forma única. */}
                {facilities.map((f) => (
                    <article
                        key={f.key}
                        // Tres clases combinadas:
                        //   facility-card               → estilos base de la card
                        //   facility-card--{size}       → ancho (wide = span 2, narrow = span 1)
                        //   facility-card--{key}        → imagen de fondo específica (tennis, gym, etc.)
                        className={`facility-card facility-card--${f.size} facility-card--${f.key}`}
                    >
                        <div className="facility-card-content">
                            <h3 className="facility-card-title">{f.title}</h3>
                            <p className="facility-card-description">{f.description}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default Services;
