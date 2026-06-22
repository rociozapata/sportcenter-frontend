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
import Dashboard from './pages/Admin/Dashboard'
import Users from './pages/Admin/Users'
import AdminServices from './pages/Admin/Services'
import Professionals from './pages/Admin/Professionals'
import Appointments from './pages/Admin/Appointments'

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/configuracion" element={<Configuration />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/turnos" element={<Booking />} />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            }
          >
            <Route index element={<Dashboard />} />
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
