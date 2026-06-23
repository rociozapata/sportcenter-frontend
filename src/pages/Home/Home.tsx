// La home no tiene lógica propia: solo ordena las secciones del landing.
// Cada sección vive en su propio archivo para mantenerlas chicas y
// poder reordenarlas/reusarlas fácil.
import Hero from "./Hero";
import Services from "./Services";
import Stats from "./Stats";
import Benefits from "./Benefits";

function Home() {
    // El orden de acá es el orden en que se ven al hacer scroll.
    return (
        <>
            <Hero />
            <Services />
            <Stats />
            <Benefits />
        </>
    );
}

export default Home;
