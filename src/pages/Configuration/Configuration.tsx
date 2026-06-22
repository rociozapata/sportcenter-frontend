// ============================================================
// Configuracion (pantalla /configuracion)
// ------------------------------------------------------------
// Permite al usuario logueado editar su username, email y
// (opcionalmente) su contraseña. Usa PUT /users/{id} del back.
// Si cambia la clave, también pide la contraseña actual.
// ============================================================

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
    getCurrentUser,
    isAuthenticated,
    updateMyProfile,
    type CurrentUser,
} from "../../services/auth";

import "./Configuration.css";

function Configuration() {
    const navigate = useNavigate();
    const authed = isAuthenticated();

    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Estado del form
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Carga inicial: traemos los datos del usuario y los volcamos al form.
    useEffect(() => {
        if (!authed) return;
        let cancelled = false;
        getCurrentUser()
            .then((u) => {
                if (cancelled) return;
                setUser(u);
                setUsername(u.username);
                setEmail(u.email);
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [authed]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (!user) return;

        // Validaciones cliente: el back también valida, pero queremos
        // feedback rápido sin esperar un round-trip.
        const wantsPasswordChange = password.length > 0 || password2.length > 0;

        if (username.trim().length < 3) {
            setError("El nombre de usuario debe tener al menos 3 caracteres.");
            return;
        }
        if (!email.includes("@")) {
            setError("Ingresá un email válido.");
            return;
        }
        if (wantsPasswordChange) {
            if (password.length < 8) {
                setError("La nueva contraseña debe tener al menos 8 caracteres.");
                return;
            }
            if (password !== password2) {
                setError("Las contraseñas nuevas no coinciden.");
                return;
            }
            if (!currentPassword) {
                setError("Para cambiar la contraseña, ingresá tu contraseña actual.");
                return;
            }
        }

        setSubmitting(true);
        try {
            const updated = await updateMyProfile(user.id, {
                username: username.trim(),
                email: email.trim(),
                password: wantsPasswordChange ? password : undefined,
                currentPassword: wantsPasswordChange ? currentPassword : undefined,
            });
            setUser(updated);
            setUsername(updated.username);
            setEmail(updated.email);
            setPassword("");
            setPassword2("");
            setCurrentPassword("");
            setSuccessMsg("Datos actualizados correctamente.");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    if (!authed) {
        return (
            <section className="config-section">
                <h1>Configuración</h1>
                <p>
                    Tenés que <Link to="/login">iniciar sesión</Link> para editar tu cuenta.
                </p>
            </section>
        );
    }

    if (loading) {
        return (
            <section className="config-section">
                <h1>Configuración</h1>
                <p>Cargando datos…</p>
            </section>
        );
    }

    if (!user) {
        return (
            <section className="config-section">
                <h1>Configuración</h1>
                <p className="config-error">{error ?? "No se pudo cargar la información."}</p>
            </section>
        );
    }

    return (
        <section className="config-section">
            <button type="button" className="config-back" onClick={() => navigate("/perfil")}>
                ← Volver al perfil
            </button>
            <h1>Configuración</h1>
            <p className="config-subtitle">Editá tus datos personales y tu contraseña.</p>

            <form className="config-form" onSubmit={handleSubmit}>
                <div className="config-card">
                    <h2>Datos personales</h2>

                    <label htmlFor="cfg-username">Nombre de usuario</label>
                    <input
                        id="cfg-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        minLength={3}
                        maxLength={30}
                        pattern="^[a-zA-Z0-9._-]+$"
                        title="Solo letras, números, punto, guion bajo o guion."
                        required
                    />

                    <label htmlFor="cfg-email">Email</label>
                    <input
                        id="cfg-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={254}
                        required
                    />

                    <p className="config-readonly">
                        <span>Rol:</span> <strong>{user.role}</strong>
                    </p>
                </div>

                <div className="config-card">
                    <h2>Cambiar contraseña</h2>
                    <p className="config-help">
                        Dejalo vacío si no querés cambiarla.
                    </p>

                    <label htmlFor="cfg-current">Contraseña actual</label>
                    <input
                        id="cfg-current"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                    />

                    <label htmlFor="cfg-pass">Nueva contraseña</label>
                    <input
                        id="cfg-pass"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        maxLength={72}
                        autoComplete="new-password"
                    />

                    <label htmlFor="cfg-pass2">Repetí la nueva contraseña</label>
                    <input
                        id="cfg-pass2"
                        type="password"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                        minLength={8}
                        maxLength={72}
                        autoComplete="new-password"
                    />
                </div>

                {error && <p className="config-error">{error}</p>}
                {successMsg && <p className="config-success">{successMsg}</p>}

                <div className="config-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate("/perfil")}
                        disabled={submitting}
                    >
                        Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? "Guardando…" : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </section>
    );
}

export default Configuration;
