// ============================================================
// services/booking.ts
// ------------------------------------------------------------
// Llamadas a la API que usa el flujo de reserva de turnos
// (pantalla /turnos). Separadas de admin.ts porque acá los
// endpoints son públicos o de USER común; no requieren rol ADMIN.
// ============================================================

import { API_BASE_URL, TOKEN_STORAGE_KEY } from "./api";
import type { Professional, ServiceType } from "./admin";

// Helper similar al de admin.ts pero que NO exige token:
// los GET de servicios/profesionales son públicos. Para el POST
// de reserva sí necesitamos el Bearer; lo mandamos solo si existe.
async function bookingFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  // Si el usuario está logueado, mandamos el token. El back lo usa
  // tanto para autenticar el POST como para inferir el dueño del turno.
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch { /* body no era JSON */ }
    throw new Error(message);
  }

  return response;
}

// Forma de la página que devuelve Spring Data; copiada acá para no
// tener que importar de admin.ts (lo dejamos independiente).
interface PageResponse<T> {
  content: T[];
}

// ----- Listados para los selects ---------------------------------------

// Listado completo de tipos de servicio. Pedimos 100 de una para
// poblar el <select> sin paginación.
export async function listServiceTypes(): Promise<ServiceType[]> {
  const response = await bookingFetch(`/service-types?page=0&size=100&sort=name,asc`);
  const data: PageResponse<ServiceType> = await response.json();
  return data.content;
}

// Listado completo de profesionales. Después filtramos por servicio
// y por active=true en el componente.
export async function listProfessionals(): Promise<Professional[]> {
  const response = await bookingFetch(`/professionals?page=0&size=100&sort=name,asc`);
  const data: PageResponse<Professional> = await response.json();
  return data.content;
}

// ----- Disponibilidad --------------------------------------------------

// Forma del BusySlot que devuelve /availability.
export interface BusySlot {
  startTime: string; // ISO LocalDateTime (sin zona)
  endTime: string;
}

export interface AvailabilityResponse {
  professionalId: number;
  date: string;        // ISO date
  busySlots: BusySlot[];
}

// GET /professionals/{id}/availability?date=YYYY-MM-DD
// Devuelve los RANGOS OCUPADOS del profesional. El back no expone
// quién reservó cada uno: solo el rango horario. Suficiente para
// que el front pinte los slots ocupados.
export async function getAvailability(professionalId: number, isoDate: string): Promise<AvailabilityResponse> {
  const response = await bookingFetch(`/professionals/${professionalId}/availability?date=${isoDate}`);
  return response.json();
}

// ----- Reserva ---------------------------------------------------------

// Payload del POST /appointments (igual a AppointmentRequest del back).
// El dueño NO viaja en el body: el back lo toma del JWT, así nadie
// puede reservar a nombre de otro.
export interface CreateAppointmentPayload {
  startTime: string;     // ISO LocalDateTime sin zona
  endTime: string;       // idem
  notes?: string;
  professionalId: number;
  serviceTypeId: number;
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<void> {
  await bookingFetch(`/appointments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ----- Mis turnos -----------------------------------------------------
// El back filtra GET /appointments por el usuario actual cuando el rol
// es USER (un ADMIN ve todos). Reusamos ese endpoint para alimentar el
// perfil. Pedimos 100 de una para evitar paginar en la UI del perfil.
export interface MyAppointment {
  id: number;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  professionalId: number;
  professionalName: string;
  serviceTypeId: number;
  serviceTypeName: string;
}

export async function listMyAppointments(): Promise<MyAppointment[]> {
  const response = await bookingFetch(`/appointments?page=0&size=100&sort=startTime,desc`);
  const data: PageResponse<MyAppointment> = await response.json();
  return data.content;
}

// PATCH /appointments/{id}/cancel — el back permite que el dueño cancele
// su propio turno (no es exclusivo de ADMIN).
export async function cancelMyAppointment(id: number): Promise<void> {
  await bookingFetch(`/appointments/${id}/cancel`, { method: "PATCH" });
}
