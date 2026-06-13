// Hooks de React para estado del form.
import { useState, type FormEvent } from "react";

// Link para ir al login, useNavigate para redirigir luego del registro.
import { Link, useNavigate } from "react-router-dom";

// Función register del servicio que pega a POST /users.
import { register } from "../../services/auth";

// Estilos (Register.css importa los de Login para no duplicar).
import "./Register.css";

function Register() {
  // Estado de cada campo del form.
  const [username, setUsername] = useState("");                // nombre de usuario
  const [email, setEmail] = useState("");                      // email
  const [password, setPassword] = useState("");                // contraseña
  const [confirmPassword, setConfirmPassword] = useState("");  // repetir contraseña (solo front)

  // Mensaje de error y flag de carga (mismo patrón que Login).
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Para redirigir al login cuando el registro sale OK.
  const navigate = useNavigate();

  // Se ejecuta al apretar "Crear cuenta".
  async function handleSubmit(e: FormEvent) {
    // Evitamos el reload del browser.
    e.preventDefault();

    // Limpiamos errores viejos.
    setError(null);

    // Validación local: las contraseñas tienen que coincidir.
    // Lo chequeamos antes de pegarle a la API para no gastar request.
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;  // cortamos acá, no seguimos al fetch
    }

    // Marcamos que arrancó la petición.
    setLoading(true);

    try {
      // Llamamos al servicio: si la API responde OK, queda el usuario creado.
      // OJO: NO loguea automáticamente, solo crea la cuenta.
      await register({ username, email, password });

      // Registro OK → mandamos al login para que entre con sus credenciales.
      navigate("/login");
    } catch (err) {
      // Mostramos el mensaje que vino del back (ej. "Email ya registrado").
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      // Liberamos el botón.
      setLoading(false);
    }
  }

  return (
    <section className="auth-section">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Registrarse</h1>

        <label htmlFor="reg-username">Nombre de usuario</label>
        <input
          id="reg-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}                                   // mismo mínimo que pide la API
          maxLength={30}                                  // mismo máximo que pide la API
          pattern="[a-zA-Z0-9._\-]+"                      // letras, números, punto, guion y guion bajo
          autoComplete="username"
        />

        <label htmlFor="reg-email">Email</label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}                                 // límite que pide la API
          autoComplete="email"
        />

        <label htmlFor="reg-password">Contraseña</label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}                                   // la API rechaza menos de 8
          maxLength={72}                                  // límite de bcrypt
          autoComplete="new-password"
        />

        <label htmlFor="reg-password2">Repetir contraseña</label>
        <input
          id="reg-password2"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        {/* Mensaje de error condicional. */}
        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="auth-switch">
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      </form>
    </section>
  );
}

export default Register;
