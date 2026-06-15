import "./Services.css"

const service = [
    {
        key: "tennis",
        title: "Clases de Tenis",
        description: "Mejorá tu técnica y desarrollá tu juego en un ambiente amigable y profesional. Clases grupales e individuales.",
        size: "wide"
    },

    {
        key: "funcional",
        title: "Entrenamiento Funcional",
        description: "El entrenamiento que se adapta a tu vida. Ideales para potenciar tu rendimiento deportivo o mejorar tu salud.",
        size: "narrow"
    },

    {
        key: "crossfit",
        title: "Crossfit",
        description: "Superá tus propias marcas en cada entrenamiento. Preparate para descubrir de lo que sos capaz.",
        size: "narrow"
    },

    {
        key: "padel",
        title: "Clases de Pádel",
        description: "Ya seas principiante o un jugador experimentado, nuestras clases te llevarán al siguiente nivel. Clases individuales y grupales",
        size: "wide"
    }

];

const staff = [
    {
        key: "",
        name: "",
        description: "",
        size: ""
    },

    {
        key: "",
        name: "",
        description: "",
        size: ""
    },

    {
        key: "",
        name: "",
        description: "",
        size: ""
    },

    {
        key: "",
        name: "",
        description: "",
        size: ""
    }

];

function Services() {
    return (
        <section className="services">

            <h2 className="services-header">Nuestras Clases</h2>

            <div className="services-grid">
                {service.map((s) => (
                    <article
                        key={s.key}
                        className={`services-card services-card--${s.size} services-card--${s.key}`}>

                        <div className="services-card-content">
                            <h3 className="services-card-title">{s.title}</h3>
                            <p className="services-card-description">{s.description}</p>
                            <button className="btn btn-accent">Ver horarios</button>
                        </div>
                    </article>

                ))}
            </div>

            <h2 className="services-header">Nuestro Staff</h2>

            <div className="services-grid">
                {staff.map((p) => (
                    <article key={p.key} className={`services-card services-card--${p.size} services-card--{p.key}`}>
                        <div className="services-card-content">
                            <h3 className="services-card-title">{p.name}</h3>
                            <p className="services-card-description">{p.description}</p>
                        </div>
                    </article>
                ))}

            </div>
        </section>

    );
}

export default Services;
