

const service = [
    {
        key: "tennis",
        title: "Clases de Tenis",
        description: "Mejorá tu técnica y desarrollá tu juego en un ambiente amigable y profesional. Clases grupales e individuales.",
        img: "src/assets/service-tenis.jpg"
    },

    {
        key: "padel",
        title: "Clases de Pádel",
        description: "Ya seas principiante o un jugador experimentado, nuestras clases te llevarán al siguiente nivel. Clases individuales y grupales",
        img: "src/assets/service-padel.jpg"
    },
    {
        key: "funcional",
        title: "Entrenamiento Funcional",
        description: "Acá va el chamuyo copado sobre funcional cuando lo busques.",
        img: "src/assets/service-funcional.jpg"
    },

    {
        key: "crossfit",
        title: "Crossfit",
        description: "Acá va el chamuyo potente sobre Crossfit.",
        img: "src/assets/service-crossfit.jpg"
    }
];

function Services() {
    return (
        <section className="service-container">
            <div>
            {service.map((s) => (
                <article key={s.key} className="card-item">
                    <img src={s.img} alt={s.title} />

                    <div className="card-content">
                        <h3>{s.title}</h3>
                        <p>{s.description}</p>
                        <button className="card-button">Ver horarios</button>
                    </div>
                </article>
            
            ))}
            </div>
        </section>

    );
}

export default Services;
