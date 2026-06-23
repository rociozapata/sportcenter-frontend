import "./Hero.css";

// Sección de portada (lo primero que se ve). Es estática: solo texto +
// dos botones. La imagen de fondo y el degradado oscuro los pone el CSS.
function Hero() {
    return (
        <section className="hero">
            <div className="hero-content">
                {/* El <span> con clase --accent rompe el título en dos líneas
                    y le da color a la segunda (lo define el CSS). */}
                <h1 className="hero-title">
                    Dominá tu juego.
                    <span className="hero-title-accent">Superá tus límites.</span>
                </h1>
                <p className="hero-subtitle">
                    Viví la excelencia deportiva en SportCenter. Instalaciones de
                    alto nivel para atletas que buscan dar lo mejor en cada entrenamiento.
                </p>
                {/* Botones con las clases del sistema global (buttons.css). */}
                <div className="hero-actions">
                    <button className="btn btn-accent btn-lg">
                        Reservar Turno →
                    </button>
                    <button className="btn btn-outlined-light btn-lg">
                        Ver clases
                    </button>
                </div>
            </div>
        </section>
    );
}

export default Hero;
