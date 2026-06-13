// Importamos la URL base y la clave del localStorage desde api.ts.
import { API_BASE_URL, TOKEN_STORAGE_KEY } from "./api";

// Tipo: forma del objeto que mandamos al hacer login.
export interface LoginPayload {
  email: string;     // email del usuario
  password: string;  // contraseña en texto plano (viaja por HTTPS en producción)
}

// Tipo: forma del objeto que mandamos al registrarnos.
export interface RegisterPayload {
  username: string;  // nombre de usuario (3-30 caracteres)
  email: string;     // email válido
  password: string;  // contraseña (8-72 caracteres)
}

// Tipo: forma de la respuesta del login. Lo que devuelve la API.
export interface LoginResponse {
  token: string;      // el JWT que vamos a guardar
  tokenType: string;  // siempre viene "Bearer"
  expiresIn: number;  // segundos que dura el token (28800 = 8 horas)
}

// Tipo: datos del usuario logueado que devuelve GET /auth/me.
export interface CurrentUser {
  id: number;          // id en la base de datos
  username: string;    // nombre de usuario
  email: string;       // email
  role: string;        // "USER" o "ADMIN"
  createdDate: string; // fecha en la que se creó la cuenta
}

// Función interna que lanza un Error con el mensaje que devuelva la API.
// Si el back manda { message: "Email ya registrado" }, lo mostramos tal cual.
async function throwApiError(response: Response): Promise<never> {
  // Por defecto armamos un mensaje con el código HTTP (ej. "Error 400").
  let message = `Error ${response.status}`;
  try {
    // Intentamos leer el body como JSON para sacar un mensaje más útil.
    const data = await response.json();
    // Si vino "message" o "error", lo usamos. Si no, queda el default.
    message = data.message || data.error || message;
  } catch {
    // Si el body no era JSON, no hacemos nada. Queda el mensaje default.
  }
  // Lanzamos el error: el componente lo va a atrapar con try/catch.
  throw new Error(message);
}

// FUNCIÓN LOGIN: pega a POST /auth/login y guarda el token si todo va bien.
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  // fetch arma el pedido HTTP. Le pasamos la URL completa y la config.
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",                                    // POST porque estamos mandando datos
    headers: { "Content-Type": "application/json" },   // avisamos que el body es JSON
    body: JSON.stringify(payload),                     // convertimos el objeto a texto JSON
  });

  // response.ok es true si el status está entre 200 y 299.
  // Si no, llamamos al helper que lanza Error con el mensaje del back.
  if (!response.ok) await throwApiError(response);

  // Leemos el JSON de la respuesta y lo tipamos como LoginResponse.
  const data: LoginResponse = await response.json();

  // Guardamos el token en localStorage para que sobreviva a recargas.
  localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

  // Devolvemos los datos por si el componente los quiere usar.
  return data;
}

// FUNCIÓN REGISTER: pega a POST /users para crear una cuenta nueva.
export async function register(payload: RegisterPayload): Promise<void> {
  // Mismo patrón que login, pero a otro endpoint.
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",                                    // POST porque creamos un recurso nuevo
    headers: { "Content-Type": "application/json" },   // el body va en JSON
    body: JSON.stringify(payload),                     // convertimos { username, email, password }
  });

  // Si el back rechazó (email repetido, password corta, etc.), lanzamos error.
  if (!response.ok) await throwApiError(response);

  // No devolvemos nada: alcanzaba con saber que se creó OK.
}

// FUNCIÓN GET CURRENT USER: trae los datos del usuario logueado.
export async function getCurrentUser(): Promise<CurrentUser> {
  // Sacamos el token de localStorage (lo guardó login() antes).
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  // Si no hay token, ni siquiera intentamos pegarle a la API.
  if (!token) throw new Error("No hay sesión activa");

  // GET /auth/me con el header Authorization: la API lo necesita para saber quién sos.
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },  // formato estándar: "Bearer <token>"
  });

  // Mismo manejo de error que las otras funciones.
  if (!response.ok) await throwApiError(response);

  // Devolvemos el JSON con los datos del usuario.
  return response.json();
}

// Helper: devuelve el token guardado (o null si no hay).
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

// Helper: borra el token. Es básicamente el "cerrar sesión".
export function logout(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// Helper: true si hay token guardado. Útil para mostrar/ocultar links del navbar.
export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
