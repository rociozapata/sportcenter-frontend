// Wrapper de ruta que solo deja pasar a usuarios con rol ADMIN.
// Mientras se resuelve /auth/me muestra un estado de carga;
// si no hay token o el rol no es ADMIN, redirige.
import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, isAuthenticated, type CurrentUser } from "../../services/auth";

type AuthState =
  | { status: "loading" }
  | { status: "ok"; user: CurrentUser }
  | { status: "denied" };

interface Props {
  children: ReactNode;
}

function ProtectedAdminRoute({ children }: Props) {
  const [state, setState] = useState<AuthState>(
    isAuthenticated() ? { status: "loading" } : { status: "denied" }
  );

  useEffect(() => {
    if (state.status !== "loading") return;
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (user.role === "ADMIN") setState({ status: "ok", user });
        else setState({ status: "denied" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "denied" });
      });
    return () => { cancelled = true; };
  }, [state.status]);

  if (state.status === "loading") {
    return <p className="admin-loading">Verificando permisos...</p>;
  }
  if (state.status === "denied") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default ProtectedAdminRoute;
