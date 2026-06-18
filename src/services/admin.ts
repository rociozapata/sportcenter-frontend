// Servicio para los endpoints administrativos.
// Reutiliza la URL base y el token guardado por el flujo de auth.
import { API_BASE_URL, TOKEN_STORAGE_KEY } from "./api";

// Roles que maneja el back (enum UserEnum).
export type UserRole = "USER" | "ADMIN";

// Forma del UserResponse del back (ver dto/response/user/UserResponse.java).
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  createdDate: string;
}

// Forma del Page<T> que devuelve Spring Data.
// Solo tipamos los campos que usamos en la UI.
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// Helper: agrega el header Authorization y maneja errores de forma uniforme.
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) throw new Error("No hay sesión activa");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // body no era JSON, queda el default
    }
    throw new Error(message);
  }

  return response;
}

// GET /users → listado paginado de usuarios.
export async function getUsers(page = 0, size = 20): Promise<PageResponse<AdminUser>> {
  const response = await authFetch(`/users?page=${page}&size=${size}&sort=id,asc`);
  return response.json();
}

// PATCH /users/{id}/role → cambia el rol.
export async function updateUserRole(id: number, role: UserRole): Promise<AdminUser> {
  const response = await authFetch(`/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  return response.json();
}

// DELETE /users/{id} → baja del usuario.
export async function deleteUser(id: number): Promise<void> {
  await authFetch(`/users/${id}`, { method: "DELETE" });
}

// ----- Service Types ----------------------------------------------------

// Forma del ServiceTypeResponse del back.
export interface ServiceType {
  id: number;
  name: string;
  durationMinutes: number;
  price: number;
}

// Payload de alta/edición. Coincide con ServiceTypeRequest.
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

// ----- Professionals ----------------------------------------------------

export interface Professional {
  id: number;
  name: string;
  speciality: string;
  active: boolean;
  services: ServiceType[];
}

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

// ----- Appointments -----------------------------------------------------

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface Appointment {
  id: number;
  startTime: string;
  endTime: string;
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

export interface AppointmentFilters {
  status?: AppointmentStatus;
  professionalId?: number;
  from?: string;
  to?: string;
}

export async function getAppointments(
  page = 0,
  size = 20,
  filters: AppointmentFilters = {}
): Promise<PageResponse<Appointment>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "startTime,desc",
  });
  if (filters.status) params.set("status", filters.status);
  if (filters.professionalId) params.set("professionalId", String(filters.professionalId));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const response = await authFetch(`/appointments?${params.toString()}`);
  return response.json();
}

export async function confirmAppointment(id: number): Promise<Appointment> {
  const response = await authFetch(`/appointments/${id}/confirm`, { method: "PATCH" });
  return response.json();
}

export async function cancelAppointment(id: number): Promise<Appointment> {
  const response = await authFetch(`/appointments/${id}/cancel`, { method: "PATCH" });
  return response.json();
}

export async function deleteAppointment(id: number): Promise<void> {
  await authFetch(`/appointments/${id}`, { method: "DELETE" });
}
