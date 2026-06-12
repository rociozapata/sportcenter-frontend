import "./Hero.css";

function Hero() {
    return (
        <section className="hero">
            <div className="hero-content">
                <h1 className="hero-title">
                    Dominá tu juego.
                    <span className="hero-title-accent">Superá tus límites.</span>
                </h1>
                <p className="hero-subtitle">
                    Viví la excelencia deportiva en SportCenter. Instalaciones de
                    alto nivel para atletas que buscan dar lo mejor en cada entrenamiento.
                </p>
                <div className="hero-actions">
                    <button className="hero-btn hero-btn-primary">
                        Reservar Turno →
                    </button>
                    <button className="hero-btn hero-btn-secondary">
                        Ver clases
                    </button>
                </div>
            </div>
        </section>
    );
}

export default Hero;
