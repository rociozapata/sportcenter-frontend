// Routes/Route definen qué componente se muestra según la URL.
import { Routes, Route } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home/Home'
import Login  from './pages/Login/Login'
import Register from './pages/Register/Register'
import Profile from './pages/Profile/Profile'
import Configuration from './pages/Configuration/Configuration'
import Services from './pages/Services/Services'
import Booking from './pages/Booking/Booking'
import AdminLayout from './pages/Admin/AdminLayout'
import ProtectedAdminRoute from './pages/Admin/ProtectedAdminRoute'
import RequireAuth from './components/RequireAuth'
import Dashboard from './pages/Admin/Dashboard'
import Users from './pages/Admin/Users'
import AdminServices from './pages/Admin/Services'
import Professionals from './pages/Admin/Professionals'
import Appointments from './pages/Admin/Appointments'

// Componente raíz: arma el "esqueleto" común a todas las páginas
// (Navbar arriba, Footer abajo) y en el medio el contenido que cambia
// según la ruta. Navbar y Footer quedan FUERA de <Routes>, así se ven
// siempre sin importar en qué página estemos.
function App() {
  return (
    <>
      <Navbar />
      <main>
        {/* Solo se renderiza la <Route> cuya "path" matchea la URL actual. */}
        <Routes>
          {/* Rutas públicas: cualquiera puede entrar. */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/servicios" element={<Services />} />

          {/* Rutas protegidas: RequireAuth deja pasar solo si hay sesión.
              Si no, muestra el cartel para iniciar sesión. */}
          <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/configuracion" element={<RequireAuth><Configuration /></RequireAuth>} />
          <Route path="/turnos" element={<RequireAuth><Booking /></RequireAuth>} />

          {/* Ruta anidada del panel admin. ProtectedAdminRoute exige rol
              ADMIN; si pasa, monta AdminLayout (sidebar + <Outlet/>).
              Las rutas hijas se renderizan DENTRO de ese <Outlet/>. */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            }
          >
            {/* "index" = la ruta por defecto al entrar a /admin (el Dashboard). */}
            <Route index element={<Dashboard />} />
            {/* Las demás son relativas: /admin/usuarios, /admin/servicios, etc. */}
            <Route path="usuarios" element={<Users />} />
            <Route path="servicios" element={<AdminServices />} />
            <Route path="profesionales" element={<Professionals />} />
            <Route path="turnos" element={<Appointments />} />
          </Route>
        </Routes>
      </main>
      <Footer />
    </>
  )
}

export default App
