// ============================================================
// services/admin.ts
// ------------------------------------------------------------
// Capa de datos del panel de administración.
// Concentra acá todas las llamadas a la API que solo puede hacer
// un ADMIN. Los componentes de las páginas NO hacen fetch a mano:
// importan las funciones de este archivo y se olvidan del HTTP.
//
// ¿Por qué centralizar? Si mañana cambia la URL del back, los
// headers, o agregamos un retry/loguear errores, lo tocamos en
// un solo lugar y todas las pantallas se enteran.
// ============================================================

// Importamos la URL base y el nombre de la "caja" del localStorage
// donde guardamos el token JWT. Los definí en api.ts para que sean
// fáciles de cambiar y no queden strings sueltos en cada archivo.
import { API_BASE_URL, TOKEN_STORAGE_KEY } from "./api";

// ----- Tipos compartidos -------------------------------------------------

// Roles que entiende el back (enum UserEnum en Java).
// Lo dejamos como union de literales para que TypeScript valide en
// tiempo de compilación que no se nos cuele un valor inventado.
export type UserRole = "USER" | "ADMIN";

// Forma del UserResponse que devuelve el back en /users.
// Refleja exactamente UserResponse.java del backend.
export interface AdminUser {
  id: number;          // id en la base
  username: string;    // nombre de usuario
  email: string;       // email del usuario
  role: UserRole;      // USER o ADMIN
  createdDate: string; // viene como string ISO desde el back
}

// Forma genérica del Page<T> que devuelve Spring Data en cualquier
// endpoint paginado. Solo tipamos los campos que usamos en la UI;
// el back manda algunos más (pageable, sort, etc.) que ignoramos.
export interface PageResponse<T> {
  content: T[];          // los items de la página actual
  totalElements: number; // total absoluto (no solo de la página)
  totalPages: number;    // cuántas páginas hay
  number: number;        // índice de página actual (arranca en 0)
  size: number;          // tamaño de página pedido
  first: boolean;        // true si estamos en la primera
  last: boolean;         // true si estamos en la última
}

// ----- Helper de transporte ---------------------------------------------

// Wrapper sobre fetch que:
//   1. Agrega el header Authorization con el JWT.
//   2. Pone Content-Type: application/json si hay body.
//   3. Si el back responde con error, lanza un Error con el mensaje
//      que vino en el body (o un fallback con el status).
// Todas las funciones del archivo lo usan, así no repetimos la lógica.
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // Sacamos el token guardado por el login.
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  // Si no hay token, ni intentamos pegarle al back. El guard de la
  // ruta también lo detectaría, pero defendernos acá evita un 401.
  if (!token) throw new Error("No hay sesión activa");

  // new Headers() acepta el headers original (puede ser undefined)
  // y nos da una API mutable para agregarle más.
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  // Si el caller mandó body y no fijó Content-Type, asumimos JSON.
  // Así desde afuera escribimos `body: JSON.stringify(...)` sin
  // tener que recordar el header en cada llamada.
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Hacemos el pedido real. Spread de init para preservar method/body.
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  // response.ok es true para status 2xx. Si no, armamos un Error.
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      // Intentamos leer { message: "..." } del back para tener un
      // mensaje legible para el usuario.
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // Si el body no era JSON, dejamos el mensaje default.
    }
    throw new Error(message);
  }

  return response;
}

// ----- USUARIOS ---------------------------------------------------------

// GET /users → listado paginado.
// page (índice base 0) y size (cuántos por página) son los params
// estándar de Spring Data. sort=id,asc da un orden estable.
export async function getUsers(page = 0, size = 20): Promise<PageResponse<AdminUser>> {
  const response = await authFetch(`/users?page=${page}&size=${size}&sort=id,asc`);
  return response.json();
}

// PATCH /users/{id}/role → cambia el rol de un usuario.
// El back devuelve el UserResponse actualizado para que el front
// reemplace el item local sin tener que re-fetchear toda la lista.
export async function updateUserRole(id: number, role: UserRole): Promise<AdminUser> {
  const response = await authFetch(`/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  return response.json();
}

// DELETE /users/{id} → baja del usuario. No devuelve nada (204).
export async function deleteUser(id: number): Promise<void> {
  await authFetch(`/users/${id}`, { method: "DELETE" });
}

// ----- TIPOS DE SERVICIO ------------------------------------------------

// Forma del ServiceTypeResponse del back.
// price viene como BigDecimal en Java; JSON lo serializa como number.
export interface ServiceType {
  id: number;
  name: string;
  durationMinutes: number;
  price: number;
}

// Payload de alta/edición. Igual a ServiceTypeRequest del back.
// Sin id (lo asigna el back en el POST; lo manda el front por URL en el PUT).
export interface ServiceTypePayload {
  name: string;
  durationMinutes: number;
  price: number;
}

export async function getServiceTypes(page = 0, size = 20): Promise<PageResponse<ServiceType>> {
  const response = await authFetch(`/service-types?page=${page}&size=${size}&sort=id,asc`);
  return response.json();
}

export async function createServiceType(payload: ServiceTypePayload): Promise<ServiceType> {
  const response = await authFetch(`/service-types`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function updateServiceType(id: number, payload: ServiceTypePayload): Promise<ServiceType> {
  const response = await authFetch(`/service-types/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function deleteServiceType(id: number): Promise<void> {
  await authFetch(`/service-types/${id}`, { method: "DELETE" });
}

// ----- PROFESIONALES ----------------------------------------------------

// El response del back incluye los servicios anidados (Set<ServiceType>).
// En el front los tipamos como array porque JSON no distingue Set de array.
export interface Professional {
  id: number;
  name: string;
  speciality: string;
  active: boolean;
  services: ServiceType[];
}

// En el payload mandamos solo los IDs de los servicios.
// El back resuelve las entidades a partir de esos ids.
export interface ProfessionalPayload {
  name: string;
  speciality: string;
  active: boolean;
  serviceTypeIds: number[];
}

export async function getProfessionals(page = 0, size = 20): Promise<PageResponse<Professional>> {
  const response = await authFetch(`/professionals?page=${page}&size=${size}&sort=id,asc`);
  return response.json();
}

export async function createProfessional(payload: ProfessionalPayload): Promise<Professional> {
  const response = await authFetch(`/professionals`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function updateProfessional(id: number, payload: ProfessionalPayload): Promise<Professional> {
  const response = await authFetch(`/professionals/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function deleteProfessional(id: number): Promise<void> {
  await authFetch(`/professionals/${id}`, { method: "DELETE" });
}

// ----- TURNOS (APPOINTMENTS) --------------------------------------------

// Estados posibles de un turno (enum AppointmentStatusEnum en el back).
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

// El response trae datos "denormalizados": además del id, el back
// incluye el username, el nombre del profesional y el del servicio,
// así no tenemos que hacer N requests extras para mostrar la tabla.
export interface Appointment {
  id: number;
  startTime: string;             // ISO datetime
  endTime: string;               // ISO datetime
  status: AppointmentStatus;
  statusModifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  userId: number;
  username: string;
  professionalId: number;
  professionalName: string;
  serviceTypeId: number;
  serviceTypeName: string;
}

// Filtros opcionales del listado. Todos se combinan con AND en el back.
export interface AppointmentFilters {
  status?: AppointmentStatus;
  professionalId?: number;
  from?: string; // ISO datetime
  to?: string;   // ISO datetime
}

// Listado paginado de turnos con filtros opcionales.
// Usamos URLSearchParams porque escapa los valores correctamente y
// nos evita armar a mano la URL con interpolaciones frágiles.
export async function getAppointments(
  page = 0,
  size = 20,
  filters: AppointmentFilters = {}
): Promise<PageResponse<Appointment>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "startTime,desc", // los más recientes primero
  });
  // Solo agregamos los filtros si tienen valor: si mandás
  // ?status= vacío, el back lo interpreta distinto que no mandarlo.
  if (filters.status) params.set("status", filters.status);
  if (filters.professionalId) params.set("professionalId", String(filters.professionalId));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const response = await authFetch(`/appointments?${params.toString()}`);
  return response.json();
}

// PATCH /appointments/{id}/confirm → pasa de PENDING a CONFIRMED.
// Solo ADMIN: confirmar es la "aceptación" por parte del centro.
export async function confirmAppointment(id: number): Promise<Appointment> {
  const response = await authFetch(`/appointments/${id}/confirm`, { method: "PATCH" });
  return response.json();
}

// PATCH /appointments/{id}/cancel → marca como CANCELLED.
// El back deja el registro (no lo borra) para tener historial.
export async function cancelAppointment(id: number): Promise<Appointment> {
  const response = await authFetch(`/appointments/${id}/cancel`, { method: "PATCH" });
  return response.json();
}

// DELETE /appointments/{id} → baja física. Solo ADMIN.
export async function deleteAppointment(id: number): Promise<void> {
  await authFetch(`/appointments/${id}`, { method: "DELETE" });
}
