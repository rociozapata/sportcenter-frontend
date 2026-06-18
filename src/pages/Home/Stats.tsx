import "./Stats.css";

// Datos a destacar. Array para poder agregar/quitar sin tocar JSX.
// Cada item tiene un valor grande (lo que llama la atención) y un label corto.
const stats = [
    { value: "+500", label: "Socios activos" },
    { value: "+10", label: "Años de trayectoria" },
    { value: "+12", label: "Canchas y espacios" },
    { value: "+20", label: "Clases por semana" },
];

function Stats() {
    return (
        <section className="stats" aria-label="Datos destacados">
            {/* Lista de cifras. Usamos <dl> (description list) por semántica:
                cada cifra es un "término" con su "definición". */}
            <dl className="stats-list">
                {stats.map((s) => (
                    // <div> wrapper porque <dt>+<dd> sueltos no se pueden
                    // estilar como grupo en flexbox.
                    <div key={s.label} className="stat-item">
                        <dt className="stat-value">{s.value}</dt>
                        <dd className="stat-label">{s.label}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

export default Stats;
