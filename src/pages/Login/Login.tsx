// useState: para manejar el estado de inputs y errores.
// FormEvent: el tipo del evento que dispara el submit del form.
import { useState, type FormEvent } from "react";

// Link: para navegar sin recargar la página.
// useNavigate: hook que permite redirigir por código (ej. después del login).
// useSearchParams: para leer la query string (ej. ?expired=1).
import { Link, useNavigate, useSearchParams } from "react-router-dom";

// Importamos nuestra función login del servicio.
import { login } from "../../services/auth";

// Estilos de la pantalla.
import "./Login.css";

function Login() {
  // Estado del input email. Arranca vacío.
  const [email, setEmail] = useState("");

  // Estado del input password. Arranca vacío.
  const [password, setPassword] = useState("");

  // Mensaje de error a mostrar abajo del form. null = no hay error.
  const [error, setError] = useState<string | null>(null);

  // Flag para saber si estamos esperando la respuesta de la API.
  // Mientras es true, deshabilitamos el botón para evitar doble click.
  const [loading, setLoading] = useState(false);

  // Hook que nos da una función para redirigir a otra ruta.
  const navigate = useNavigate();

  // Si llegamos acá por un 401 (token vencido), la URL trae ?expired=1.
  // Mostramos un cartel informativo arriba del form.
  const [searchParams] = useSearchParams();
  const expired = searchParams.get("expired") === "1";

  // Función que se ejecuta cuando el usuario aprieta "Ingresar".
  async function handleSubmit(e: FormEvent) {
    // Evitamos que el browser recargue la página (comportamiento default del form).
    e.preventDefault();

    // Limpiamos cualquier error anterior antes de intentar de nuevo.
    setError(null);

    // Marcamos que arrancó el pedido.
    setLoading(true);

    try {
      // Llamamos al servicio. Si funciona, ya quedó el token en localStorage.
      await login({ email, password });

      // Login OK → redirigimos al home.
      navigate("/");
    } catch (err) {
      // Si auth.ts lanzó Error, mostramos su mensaje al usuario.
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      // Pase lo que pase (éxito o error), liberamos el botón.
      setLoading(false);
    }
  }

  return (
    <section className="auth-section">
      {/* onSubmit dispara handleSubmit cuando el usuario aprieta Enter o el botón. */}
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Iniciar sesión</h1>

        {expired && (
          <p className="auth-notice">
            Tu sesión expiró. Volvé a iniciar sesión para continuar.
          </p>
        )}

        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"                                        // el browser valida formato de email
          value={email}                                       // el input muestra lo que hay en el estado
          onChange={(e) => setEmail(e.target.value)}          // cada tecla actualiza el estado
          required                                            // no se puede enviar vacío
          autoComplete="email"                                // sugerencias del browser
        />

        <label htmlFor="login-password">Contraseña</label>
        <input
          id="login-password"
          type="password"                                     // oculta los caracteres
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {/* Solo se renderiza el <p> si hay un error que mostrar. */}
        {error && <p className="auth-error">{error}</p>}

        {/* Mientras loading es true, el botón queda gris y muestra otro texto. */}
        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <p className="auth-switch">
          ¿No tenés cuenta? <Link to="/register">Registrate</Link>
        </p>
      </form>
    </section>
  );
}

export default Login;
