import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Services.css"
import { listProfessionals, listServiceTypes } from "../../services/booking";
import type { Professional } from "../../services/admin";
// Importamos cada imagen: Vite las procesa y nos devuelve la URL final.
// Hacerlo por import (en vez de strings sueltos) asegura que la imagen
// entre en la build y rompe en compilación si el archivo no existe.
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

// Datos de las disciplinas. Los separamos del JSX para renderizar las
// 5 filas con un solo .map() en vez de escribir 5 bloques iguales.
// - key:         id único para React y para la clase CSS
// - tag:         etiqueta corta arriba del título
// - description: texto largo de la fila
// - img:         imagen importada arriba
const service = [
    {
        key: "tenis",
        title: "Clases de Tenis",
        tag: "Indoor · Todos los niveles",
        description: "Perfeccioná tu juego en nuestras canchas indoor de nivel internacional. Diseñadas con superficies de absorción premium para cuidar tus articulaciones, ofrecemos entrenamientos dinámicos tanto en modalidades grupales como individuales, adaptadas desde principiantes hasta nivel competitivo.",
        img: tenisImg
    },

    {
        key: "padel",
        title: "Clases de Pádel",
        tag: "8 canchas panorámicas",
        description: "Sumate a la disciplina con mayor crecimiento del complejo. Contamos con 8 canchas panorámicas de última generación y techos de 12 metros de altura para un juego sin límites. Aprendé táctica, posicionamiento y mejorá tu nivel en nuestras clases individuales o en turnos grupales súper entretenidos.",
        img: padelImg
    },

    {
        key: "futbol",
        title: "Futbol",
        tag: "Césped sintético FIFA Pro",
        description: "Potenciá tu juego en nuestras canchas de césped sintético certificado FIFA Pro, diseñadas para garantizar el máximo agarre y seguridad. Ofrecemos entrenamientos técnicos y clases de fútbol grupales para todas las edades, ideales para mejorar tu rendimiento físico y táctico, además del espacio perfecto para tus torneos o el clásico partido con amigos.",
        img: futbolImg
    },

    {
        key: "crossfit",
        title: "Crossfit",
        tag: "Alta intensidad",
        description: "Fuerza, potencia y comunidad. Desafiá tus límites con entrenamientos de alta intensidad que combinan gimnasia, levantamiento olímpico y cardio. Totalmente adaptable a tu nivel actual.",
        img: crossfitImg
    },

    {
        key: "funcional",
        title: "Entrenamiento Funcional",
        tag: "Circuitos dinámicos",
        description: "El entrenamiento que se adapta a tu vida. Diseñado tanto para deportistas que buscan optimizar su rendimiento en la cancha, como para quienes quieren mejorar su fuerza y agilidad del día a día con circuitos dinámicos.",
        img: funcionalImg
    }
];

// Forma normalizada de una card de staff. La usamos tanto para el
// fallback estático como para los profesionales que llegan de la API.
// img puede ser null: en ese caso la card muestra un placeholder.
interface StaffCard {
    key: string;
    name: string;
    role: string;       // disciplina (píldora superpuesta)
    specialty: string;  // bajada / experiencia
    img: string | null;
}

// Fallback estático: se muestra si la API no devuelve profesionales
// (o falla), para que la sección nunca quede vacía.
const staffFallback: StaffCard[] = [
    { key: "tenis", name: "Natalia", role: "Tenis", specialty: "Ex selección nacional · 8 años", img: staffTenisImg },
    { key: "padel", name: "Gonzalo", role: "Padel", specialty: "Categoría 3 AJPP · 12 años", img: staffPadelImg },
    { key: "futbol", name: "Andrés", role: "Futbol", specialty: "Ex profesional · DT certificado", img: staffFutbolImg },
    { key: "funcional", name: "Sol", role: "Funcional", specialty: "Lic. en kinesiología", img: staffFuncionalImg },
    { key: "crossfit", name: "Facundo", role: "Crossfit", specialty: "CrossFit Level 2 Trainer", img: staffCrossfitImg },
];

// ----- Híbrido: datos de la API + imágenes locales ---------------------
// Las fotos siguen viviendo en el frontend. Para cada profesional que
// llega de la API, elegimos la imagen matcheando su disciplina contra
// estas palabras clave. Si no matchea ninguna, la card usa un placeholder.
const STAFF_IMAGES: { keywords: string[]; img: string }[] = [
    { keywords: ["tenis", "tennis"], img: staffTenisImg },
    { keywords: ["padel", "pádel"], img: staffPadelImg },
    { keywords: ["futbol", "fútbol", "soccer"], img: staffFutbolImg },
    { keywords: ["crossfit"], img: staffCrossfitImg },
    { keywords: ["funcional"], img: staffFuncionalImg },
];

function resolveStaffImage(p: Professional): string | null {
    const haystack = [p.speciality, ...p.services.map((s) => s.name)].join(" ").toLowerCase();
    for (const { keywords, img } of STAFF_IMAGES) {
        if (keywords.some((k) => haystack.includes(k))) return img;
    }
    return null;
}

// Disciplina para la píldora: el primer servicio que ofrece o, si no
// tiene servicios cargados, su especialidad.
function disciplineOf(p: Professional): string {
    return p.services[0]?.name ?? p.speciality;
}

// Iniciales para el placeholder cuando no hay foto ("Juan Pérez" → "JP").
function initialsOf(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}

// Página pública /servicios. Las disciplinas, la frase de marca y el CTA
// son informativos (datos locales). El staff SÍ sale de la API: trae los
// profesionales activos y resuelve la foto en el front (modelo híbrido).
function Services() {
    // Arrancan con el fallback para que las secciones/stats nunca queden
    // vacías; se reemplazan por los datos de la API cuando llegan.
    const [staffCards, setStaffCards] = useState<StaffCard[]>(staffFallback);
    const [serviceCount, setServiceCount] = useState<number>(service.length);

    useEffect(() => {
        let cancelled = false;

        listProfessionals()
            .then((pros) => {
                if (cancelled) return;
                const active = pros.filter((p) => p.active);
                if (active.length === 0) return; // sin profesionales: dejamos el fallback
                setStaffCards(
                    active.map((p) => ({
                        key: String(p.id),
                        name: p.name,
                        role: disciplineOf(p),
                        specialty: p.speciality,
                        img: resolveStaffImage(p),
                    }))
                );
            })
            .catch(() => { /* si la API falla, queda el staff de fallback */ });

        // Conteo real de disciplinas (tipos de servicio) para el hero.
        listServiceTypes()
            .then((svc) => { if (!cancelled && svc.length > 0) setServiceCount(svc.length); })
            .catch(() => { /* dejamos el conteo del fallback local */ });

        return () => { cancelled = true; };
    }, []);

    return (
        <>
            {/* HERO: encabezado con título grande, bajada y badges decorativos. */}
            <section className="services-hero">
                <div className="services-hero-inner">
                    <span className="services-hero-eyebrow">Disciplinas SportCenter</span>
                    <h1 className="services-hero-title">
                        Encontrá tu próximo <span className="services-hero-accent">desafío</span>
                    </h1>
                    <p className="services-hero-subtitle">
                        5 disciplinas, instalaciones de élite y un staff que te acompaña en cada paso.
                        Elegí tu favorita y reservá tu primer turno en minutos.
                    </p>
                    <div className="services-hero-stats">
                        <div><strong>{serviceCount}</strong><span>Disciplinas</span></div>
                        <div><strong>{staffCards.length}</strong><span>Profesionales</span></div>
                        {/* Lun-Vie y Sáb; domingo cerrado → 6 días. */}
                        <div><strong>6</strong><span>Días por semana</span></div>
                    </div>
                </div>
            </section>

            {/* Sección de disciplinas en "zig-zag": el CSS alterna el lado
                de la imagen en filas pares/impares. */}
            <section className="services">
                <div className="services-container">
                    <header className="services-section-head">
                        <h2 className="services-header">Nuestras Clases</h2>
                        <p className="services-section-lead">
                            Hacé click en cualquiera para ver disponibilidad y reservar.
                        </p>
                    </header>

                    <div className="services-zigzag">
                        {/* i es el índice del .map; lo usamos para el numerito
                            "01", "02"… (0{i+1}, porque i arranca en 0). */}
                        {service.map((s, i) => (
                            <article key={s.key} className="services-zigzag-row">

                                <div className="services-zigzag-img">
                                    <img src={s.img} alt={s.title} />
                                    <span className="services-zigzag-index">0{i + 1}</span>
                                </div>

                                <div className="services-zigzag-content">
                                    <span className="services-zigzag-tag">{s.tag}</span>
                                    <h3 className="services-zigzag-title">{s.title}</h3>
                                    <p className="services-zigzag-description">{s.description}</p>
                                    <Link to="/turnos" className="btn btn-accent">Ver horarios</Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Banda de transición con frase de marca (corte diagonal). */}
            <section className="brand-quote">
                <div className="brand-quote-inner">
                    <span className="brand-quote-mark">“</span>
                    <p className="brand-quote-text">
                        Más que un complejo deportivo. Una comunidad que entrena, mejora y disfruta junta.
                    </p>
                    <span className="brand-quote-sign">— SportCenter</span>
                </div>
            </section>

            {/* Sección del staff: grilla de cards, una por entrenador. */}
            <section className="staff-section">
                <div className="staff-container">
                    <div className="staff-header">
                        <span className="staff-eyebrow">Equipo profesional</span>
                        <h2 className="services-header">Nuestro Staff</h2>
                        <p className="staff-intro">
                            Detrás de cada gran deportista hay un gran equipo. Profesionales apasionados,
                            certificados internacionalmente y comprometidos con tus objetivos. Estés empezando
                            o buscando tu máximo rendimiento, te van a guiar, motivar y exigir en cada sesión.
                        </p>
                    </div>

                    <div className="staff-grid">
                        {staffCards.slice(0, 4).map((p) => (
                            <article key={p.key} className="staff-card">
                                <div className={`staff-card-img${p.img ? "" : " staff-card-img--empty"}`}>
                                    {p.img ? (
                                        <img src={p.img} alt={p.name} />
                                    ) : (
                                        <span className="staff-card-initials" aria-hidden="true">{initialsOf(p.name)}</span>
                                    )}
                                    <span className="staff-card-discipline">{p.role}</span>
                                </div>

                                <div className="staff-card-info">
                                    <h3 className="staff-card-name">{p.name}</h3>
                                    <p className="staff-card-specialty">{p.specialty}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA final */}
            <section className="services-cta">
                <div className="services-cta-inner">
                    <h2>¿Listo para entrenar?</h2>
                    <p>Reservá tu primer turno hoy y empezá a entrenar con los mejores.</p>
                    <Link to="/turnos" className="btn btn-accent btn-lg">Reservar ahora</Link>
                </div>
            </section>
        </>

    );
}

export default Services;
