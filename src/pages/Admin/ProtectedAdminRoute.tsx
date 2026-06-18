// ============================================================
// ProtectedAdminRoute
// ------------------------------------------------------------
// "Guard" de ruta: un componente que se monta ANTES del contenido
// real del panel y decide si dejar pasar al usuario o redirigirlo
// al login. Lo usamos así en App.tsx:
//
//   <Route path="/admin" element={
//     <ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>
//   }>
//
// Cualquier sub-ruta de /admin pasa primero por este componente.
// ============================================================

// useEffect: efectos secundarios (acá, pegarle a la API).
// useState: estado local del componente.
// ReactNode: tipo de "cualquier cosa renderizable" (children).
import { useEffect, useState, type ReactNode } from "react";

// Navigate: componente de react-router que, al renderizarse,
// dispara una redirección. replace=true evita que la URL /admin
// quede en el historial (no querés que "atrás" te vuelva acá).
import { Navigate } from "react-router-dom";

// getCurrentUser pega a /auth/me y devuelve los datos del usuario.
// isAuthenticated mira solo si hay token en localStorage.
// CurrentUser es el tipo del objeto que devuelve la API.
import { getCurrentUser, isAuthenticated, type CurrentUser } from "../../services/auth";

// Tipo discriminado: una unión de objetos donde el campo "status"
// te dice qué otros campos están disponibles. Mejor que tener
// 3 booleanos sueltos (loading, ok, denied) que podrían quedar
// en estados inconsistentes.
type AuthState =
  | { status: "loading" }              // todavía verificando contra el back
  | { status: "ok"; user: CurrentUser } // pasa: es ADMIN
  | { status: "denied" };              // no pasa: sin token, error, o no es ADMIN

interface Props {
  // children es el contenido que envuelve el guard. Si la verificación
  // sale bien, lo renderizamos; si no, redirigimos.
  children: ReactNode;
}

function ProtectedAdminRoute({ children }: Props) {
  // Estado inicial:
  //   - Si hay token, arrancamos en "loading" y vamos a verificar el rol.
  //   - Si no hay token, cortocircuito a "denied" sin pegarle al back.
  const [state, setState] = useState<AuthState>(
    isAuthenticated() ? { status: "loading" } : { status: "denied" }
  );

  useEffect(() => {
    // Si ya resolvimos (ok o denied), no volvemos a pedir.
    if (state.status !== "loading") return;

    // Bandera para evitar setear estado si el componente se
    // desmontó antes de que la respuesta llegara (memory leak típico).
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        // Solo dejamos pasar si el back dice que es ADMIN.
        // Un USER común tiene token válido pero no debería ver el panel.
        if (user.role === "ADMIN") setState({ status: "ok", user });
        else setState({ status: "denied" });
      })
      .catch(() => {
        // Token vencido, red caída, etc. → denegamos por defecto.
        if (!cancelled) setState({ status: "denied" });
      });

    // Cleanup: si el componente se desmonta, marcamos cancelled.
    return () => { cancelled = true; };
  }, [state.status]);

  // Mientras esperamos respuesta del back, mostramos un mensaje.
  // Evita un "flash" del contenido protegido o una redirección prematura.
  if (state.status === "loading") {
    return <p className="admin-loading">Verificando permisos...</p>;
  }

  // Si fue denegado, redirigimos al login. Navigate hace la redirección
  // al renderizarse (no es una función, es JSX).
  if (state.status === "denied") {
    return <Navigate to="/login" replace />;
  }

  // Estado "ok": renderizamos el contenido protegido tal cual.
  return <>{children}</>;
}

export default ProtectedAdminRoute;
