// URL base de la API. Todo endpoint cuelga de acá.
// Si mañana cambia el host, se modifica una sola línea.
export const API_BASE_URL = "http://localhost:8080/sportcenter";

// Nombre de la "caja" del localStorage donde guardamos el token JWT.
// Lo dejamos como constante para no escribir el string suelto en cada archivo.
export const TOKEN_STORAGE_KEY = "sportcenter_token";

// Manejo centralizado de 401. Lo invocan los helpers `authFetch` y
// `bookingFetch` cuando el back rechaza por token vencido/inválido.
// - Borra el token para que isAuthenticated() pase a false.
// - Si NO estamos ya en /login, redirige a /login?expired=1.
//   El window.location forzado provoca un reload completo: garantiza
//   que cualquier estado en memoria (componentes, datos) quede limpio.
export function handleUnauthorized(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  if (window.location.pathname !== "/login") {
    window.location.href = "/login?expired=1";
  }
}
