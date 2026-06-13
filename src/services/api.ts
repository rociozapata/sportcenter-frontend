// URL base de la API. Todo endpoint cuelga de acá.
// Si mañana cambia el host, se modifica una sola línea.
export const API_BASE_URL = "http://localhost:8080/sportcenter";

// Nombre de la "caja" del localStorage donde guardamos el token JWT.
// Lo dejamos como constante para no escribir el string suelto en cada archivo.
export const TOKEN_STORAGE_KEY = "sportcenter_token";
