import "./Profile.css";
import defaultAvatar from "/src/assets/profile-svgrepo-com.svg"; 

// ==========================================================================
// 1. LOS DATOS DE PRUEBA (Simulan la Base de Datos)
// ==========================================================================
const userData = {
    name: "Valentina Rossi",
    memberSince: "12/03/2025",
    // Estadísticas de turnos en el mes actual
    stats: { totalThisMonth: 14, tennisCount: 6, padelCount: 4, gymCount: 4 }
};

// Array para los PRÓXIMOS TURNOS (Los que todavía no pasaron)
const upcomingBookings = [
    { id: 1, sport: "Tenis", date: "Jueves 18/06", time: "19:00 hs", court: "Cancha Indoor 2" },
    { id: 2, sport: "Crossfit", date: "Sábado 20/06", time: "10:30 hs", court: "Box Principal" }
];

// Array para el HISTORIAL (Turnos viejos que ya pasaron)
const pastBookings = [
    { id: 101, sport: "Pádel", date: "Lunes 15/06", time: "20:00 hs", status: "Asistió" },
    { id: 102, sport: "Entrenamiento Funcional", date: "Viernes 12/06", time: "18:30 hs", status: "Asistió" },
    { id: 103, sport: "Tenis", date: "Miércoles 10/06", time: "19:00 hs", status: "Cancelado" }
];


function Profile() {
    return (
        <section className="profile-container">
            
            {/* ==========================================================================
               BLOQUE A: CABECERA PRINCIPAL (Datos Fijos + Acceso a Configuración)
               ========================================================================== */}
            <div className="profile-header-block">
                <div className="profile-user-info">
                    <div className="profile-avatar-wrapper">
                        <img src={defaultAvatar} alt="Foto de perfil" />
                    </div>
                    <div>
                        <h2 className="profile-name">{userData.name}</h2>
                        <p className="profile-membership">Socio SportCenter desde el {userData.memberSince}</p>
                    </div>
                </div>
                
                {/* Botón de configuración que simula el acceso a otra pestaña */}
                <button className="profile-config-btn">
                    ⚙️ Configuración
                </button>
            </div>

            {/* ==========================================================================
               BLOQUE B: ESTADÍSTICAS DEL MES (Datos de Rendimiento)
               ========================================================================== */}
            <div className="profile-section">
                <h3 className="profile-section-title">Mis Estadísticas del Mes</h3>
                <div className="stats-grid">
                    <div className="stat-card stat-card--total">
                        <h4>{userData.stats.totalThisMonth}</h4>
                        <p>Turnos Totales</p>
                    </div>
                    <div className="stat-card">
                        <h4>{userData.stats.tennisCount}</h4>
                        <p>Tenis</p>
                    </div>
                    <div className="stat-card">
                        <h4>{userData.stats.padelCount}</h4>
                        <p>Pádel</p>
                    </div>
                    <div className="stat-card">
                        <h4>{userData.stats.gymCount}</h4>
                        <p>Gimnasio</p>
                    </div>
                </div>
            </div>

            {/* ==========================================================================
               BLOQUE C: PRÓXIMOS TURNOS (Lista Dinámica con .map)
               ========================================================================== */}
            <div className="profile-section">
                <h3 className="profile-section-title">Próximos Turnos</h3>
                <div className="bookings-list">
                    {upcomingBookings.map((booking) => (
                        <div key={booking.id} className="booking-row booking-row--upcoming">
                            <div className="booking-badge">{booking.sport}</div>
                            <div className="booking-details">
                                <strong>{booking.date} - {booking.time}</strong>
                                <span>{booking.court}</span>
                            </div>
                            <button className="booking-cancel-btn">Cancelar</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ==========================================================================
               BLOQUE D: HISTORIAL DE TURNOS (Lista Dinámica con .map)
               ========================================================================== */}
            <div className="profile-section">
                <h3 className="profile-section-title">Historial de Turnos</h3>
                <div className="bookings-list">
                    {pastBookings.map((history) => (
                        <div key={history.id} className="booking-row booking-row--past">
                            <div className="booking-badge booking-badge--past">{history.sport}</div>
                            <div className="booking-details">
                                <strong>{history.date} - {history.time}</strong>
                            </div>
                            {/* Clase dinámica para pintar de verde si asistió o de rojo si canceló */}
                            <span className={`history-status history-status--${history.status.toLowerCase()}`}>
                                {history.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

        </section>
    );
}

export default Profile;