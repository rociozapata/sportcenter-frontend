// ============================================================
// RequireAuth
// ------------------------------------------------------------
// "Guard" de ruta para secciones que requieren sesión (NO admin).
// Si el usuario está logueado, renderiza el contenido tal cual.
// Si no, muestra una pantalla amigable invitándolo a iniciar
// sesión o registrarse, en vez de dejar que la página falle.
//
// Además guarda la ruta a la que el usuario quería entrar en el
// query param ?redirect=..., para que después del login lo
// devolvamos ahí (lo lee Login.tsx).
//
// Uso en App.tsx:
//   <Route path="/perfil" element={
//     <RequireAuth><Profile /></RequireAuth>
//   } />
// ============================================================

import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { isAuthenticated } from "../services/auth";
import "./RequireAuth.css";

interface Props {
  children: ReactNode;
}

function RequireAuth({ children }: Props) {
  // useLocation nos da la ruta actual para poder volver a ella
  // después de loguearse.
  const location = useLocation();

  // Si hay sesión, dejamos pasar sin más.
  if (isAuthenticated()) {
    return <>{children}</>;
  }

  // Destino al que el usuario quería ir (path + query), codificado
  // para meterlo de forma segura en la URL del login/registro.
  const redirect = encodeURIComponent(location.pathname + location.search);

  return (
    <section className="auth-gate">
      <div className="auth-gate-card">
        <h1>Necesitás iniciar sesión</h1>
        <p>
          Para acceder a esta sección tenés que tener una sesión activa.
          Iniciá sesión y te traemos de vuelta acá.
        </p>
        <div className="auth-gate-actions">
          <Link to={`/login?redirect=${redirect}`} className="btn btn-primary">
            Iniciar sesión
          </Link>
          <Link to={`/register?redirect=${redirect}`} className="btn">
            Crear cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}

export default RequireAuth;
