// ============================================================
// Booking (pantalla /turnos)
// ------------------------------------------------------------
// Flujo de reserva, en orden:
//   1. Elegir servicio.
//   2. Elegir profesional (filtrado: activos que ofrecen ese servicio).
//   3. Elegir fecha.
//   4. Elegir slot (grilla cada 30 min).
//   5. (Opcional) escribir notas y confirmar.
//
// Cómo se calculan los slots:
//   - El centro abre OPEN y cierra CLOSE (constantes abajo).
//   - Cada slot dura SLOT_STEP minutos.
//   - El turno reservado dura servicio.durationMinutes minutos
//     (puede abarcar varios slots).
//   - Un slot está OCUPADO si su rango [start, start+durationMinutes]
//     pisa cualquier BusySlot que devolvió el back.
//   - Un slot está PASADO si su start < ahora.
//   - El último slot del día tiene que terminar <= CLOSE.
// ============================================================

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { isAuthenticated } from "../../services/auth";
import {
  createAppointment,
  getAvailability,
  listProfessionals,
  listServiceTypes,
  type BusySlot,
} from "../../services/booking";
import type { Professional, ServiceType } from "../../services/admin";

import "./Booking.css";

// ----- Constantes del horario de atención -------------------------------

// Horario de atención del centro. Si querés hacerlo configurable,
// se mueve a un endpoint del back o a una variable de entorno.
const OPEN_HOUR = 8;     // abre 08:00
const CLOSE_HOUR = 22;   // cierra 22:00
const SLOT_STEP = 30;    // un slot cada 30 minutos

// ----- Helpers de fecha/hora -------------------------------------------

// Formatea un Date al ISO LocalDateTime del back (sin zona).
// No usamos toISOString() porque convierte a UTC y desfasaría todo.
function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Formatea solo la fecha (YYYY-MM-DD) para el filtro de /availability
// y el input type="date".
function toLocalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Devuelve "HH:mm" para mostrar en cada botón de slot.
function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ¿Se pisan dos rangos? Usamos el algoritmo clásico:
//   overlap = startA < endB  &&  startB < endA
// Las comparaciones son < estrictas para que "tocarse en el límite"
// (ej. uno termina 10:00 y otro arranca 10:00) NO cuente como solapado.
function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

// ----- Estructura de un slot calculado ---------------------------------

interface Slot {
  start: Date;
  end: Date;          // start + durationMinutes (lo que duraría EL TURNO)
  state: "free" | "busy" | "past";
  iso: string;        // toLocalIso(start), para usar como key y al hacer POST
}

// Construye los slots para un día/servicio/profesional.
// Pure function: solo input → output, sin efectos. Ideal para useMemo.
function buildSlots(date: Date, durationMinutes: number, busy: BusySlot[]): Slot[] {
  const slots: Slot[] = [];
  const now = new Date();

  // Rango de apertura del día elegido.
  const dayStart = new Date(date);
  dayStart.setHours(OPEN_HOUR, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(CLOSE_HOUR, 0, 0, 0);

  // Convertimos los busy slots del back a Date una sola vez.
  const busyRanges = busy.map((b) => ({
    start: new Date(b.startTime),
    end: new Date(b.endTime),
  }));

  // Iteramos cada SLOT_STEP minutos. El cursor avanza incrementando
  // los minutos sobre una copia (no muta el original).
  for (let cursor = new Date(dayStart); cursor < dayEnd; cursor = new Date(cursor.getTime() + SLOT_STEP * 60_000)) {
    const start = new Date(cursor);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    // Si el turno termina después del cierre, no lo ofrecemos.
    if (end > dayEnd) break;

    // ¿Pisa algún busy? Si sí, marcamos ocupado.
    const isBusy = busyRanges.some((r) => overlaps(start, end, r.start, r.end));
    // ¿Ya pasó? El back valida @Future, así que igual lo bloquearía,
    // pero es mejor UX no mostrarlo activable.
    const isPast = start < now;

    slots.push({
      start,
      end,
      state: isBusy ? "busy" : isPast ? "past" : "free",
      iso: toLocalIso(start),
    });
  }

  return slots;
}

// ----- Componente ------------------------------------------------------

function Booking() {
  // ------ Datos del back -----------------------------------------------
  const [services, setServices] = useState<ServiceType[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [busy, setBusy] = useState<BusySlot[]>([]);

  // ------ Estado del flujo --------------------------------------------
  const [serviceId, setServiceId] = useState<number | "">("");
  const [professionalId, setProfessionalId] = useState<number | "">("");
  const [date, setDate] = useState(toLocalDate(new Date())); // por defecto hoy
  const [slotIso, setSlotIso] = useState<string | "">("");
  const [notes, setNotes] = useState("");

  // ------ UI -----------------------------------------------------------
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const authed = isAuthenticated();

  // ------ Carga inicial (catálogos): una sola vez al montar -----------
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    Promise.all([listServiceTypes(), listProfessionals()])
      .then(([svc, pros]) => {
        if (cancelled) return;
        setServices(svc);
        setProfessionals(pros);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
      })
      .finally(() => { if (!cancelled) setLoadingCatalog(false); });
    return () => { cancelled = true; };
  }, [authed]);

  // ------ Profesionales filtrados por servicio elegido ----------------
  // useMemo evita recalcular el filtro en cada render: solo cuando
  // cambia el servicio elegido o la lista del back.
  const filteredPros = useMemo(() => {
    if (!serviceId) return [];
    return professionals.filter(
      (p) => p.active && p.services.some((s) => s.id === serviceId)
    );
  }, [serviceId, professionals]);

  // Si el profesional que estaba elegido ya no califica al cambiar de
  // servicio, lo desmarcamos para no enviar un estado inconsistente.
  useEffect(() => {
    if (professionalId && !filteredPros.some((p) => p.id === professionalId)) {
      setProfessionalId("");
      setSlotIso("");
    }
  }, [filteredPros, professionalId]);

  // ------ Fetch de disponibilidad cuando hay profesional + fecha ------
  useEffect(() => {
    if (!professionalId || !date) {
      setBusy([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSlotIso(""); // si cambia profesional/fecha, descartamos el slot anterior
    getAvailability(professionalId as number, date)
      .then((res) => { if (!cancelled) setBusy(res.busySlots); })
      .catch(() => { if (!cancelled) setBusy([]); }) // si falla, mostramos todos como libres
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [professionalId, date]);

  // ------ Slots calculados (memorizados) ------------------------------
  const slots = useMemo(() => {
    if (!serviceId || !professionalId) return [];
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return [];
    return buildSlots(new Date(`${date}T00:00:00`), svc.durationMinutes, busy);
  }, [serviceId, professionalId, date, busy, services]);

  // ------ Submit -------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!serviceId || !professionalId || !slotIso) {
      setError("Faltan datos: elegí servicio, profesional y horario.");
      return;
    }
    const svc = services.find((s) => s.id === serviceId)!;
    const slot = slots.find((s) => s.iso === slotIso)!;

    setSubmitting(true);
    try {
      await createAppointment({
        startTime: slot.iso,
        endTime: toLocalIso(slot.end),
        notes: notes.trim() || undefined,
        professionalId: professionalId as number,
        serviceTypeId: svc.id,
      });
      setSuccessMsg("¡Turno reservado! Vas a recibir la confirmación cuando un admin lo apruebe.");
      // Refrescamos la disponibilidad para que el slot recién tomado
      // aparezca como ocupado sin tener que recargar la página.
      const res = await getAvailability(professionalId as number, date);
      setBusy(res.busySlots);
      setSlotIso("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reservar el turno");
    } finally {
      setSubmitting(false);
    }
  }

  // ------ Render -------------------------------------------------------

  // Caso 1: no logueado → no hay forma de reservar.
  if (!authed) {
    return (
      <section className="booking-section">
        <h1>Reservar turno</h1>
        <p>
          Tenés que <Link to="/login">iniciar sesión</Link> para reservar un turno.
          ¿No tenés cuenta? <Link to="/register">Registrate</Link>.
        </p>
      </section>
    );
  }

  // Caso 2: cargando catálogos iniciales.
  if (loadingCatalog) {
    return (
      <section className="booking-section">
        <h1>Reservar turno</h1>
        <p>Cargando opciones...</p>
      </section>
    );
  }

  // Helpers para el render del paso 4.
  const selectedService = serviceId ? services.find((s) => s.id === serviceId) : null;

  return (
    <section className="booking-section">
      <h1>Reservar turno</h1>
      <p className="booking-subtitle">
        Completá los pasos para agendar tu próximo turno en pocos clics.
      </p>

      <form className="booking-form" onSubmit={handleSubmit}>
        {/* ----- Paso 1: servicio ----- */}
        <label htmlFor="b-service"><span className="step-badge">1</span> Servicio</label>
        <select
          id="b-service"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value ? Number(e.target.value) : "");
            setSlotIso("");
          }}
          required
        >
          <option value="">Elegí un servicio...</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.durationMinutes} min — ${Number(s.price).toFixed(2)}
            </option>
          ))}
        </select>

        {/* ----- Paso 2: profesional (solo si hay servicio) ----- */}
        {serviceId && (
          <>
            <label htmlFor="b-pro"><span className="step-badge">2</span> Profesional</label>
            {filteredPros.length === 0 ? (
              <p className="booking-empty">No hay profesionales activos para este servicio.</p>
            ) : (
              <select
                id="b-pro"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">Elegí un profesional...</option>
                {filteredPros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.speciality}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        {/* ----- Paso 3: fecha (solo si hay profesional) ----- */}
        {professionalId && (
          <>
            <label htmlFor="b-date"><span className="step-badge">3</span> Fecha</label>
            <input
              id="b-date"
              type="date"
              value={date}
              min={toLocalDate(new Date())}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </>
        )}

        {/* ----- Paso 4: grilla de slots ----- */}
        {professionalId && date && selectedService && (
          <>
            <label><span className="step-badge">4</span> Horario</label>
            {loadingSlots ? (
              <p>Cargando disponibilidad...</p>
            ) : slots.length === 0 ? (
              <p className="booking-empty">No hay horarios disponibles para este día.</p>
            ) : (
              <div className="slot-grid">
                {slots.map((s) => (
                  <button
                    key={s.iso}
                    type="button"
                    className={`slot slot-${s.state}${s.iso === slotIso ? " slot-selected" : ""}`}
                    disabled={s.state !== "free"}
                    onClick={() => setSlotIso(s.iso)}
                    title={
                      s.state === "busy" ? "Ocupado" :
                      s.state === "past" ? "Ya pasó" :
                      `${formatTime(s.start)} - ${formatTime(s.end)}`
                    }
                  >
                    {formatTime(s.start)}
                  </button>
                ))}
              </div>
            )}
            <p className="slot-legend">
              <span className="slot slot-free legend-chip"></span> Disponible
              <span className="slot slot-busy legend-chip"></span> Ocupado
              <span className="slot slot-past legend-chip"></span> Ya pasó
            </p>
          </>
        )}

        {/* ----- Paso 5: notas + submit (solo con slot elegido) ----- */}
        {slotIso && (
          <>
            {(() => {
              const slot = slots.find((s) => s.iso === slotIso);
              const pro = filteredPros.find((p) => p.id === professionalId);
              if (!slot || !pro || !selectedService) return null;
              return (
                <div className="booking-summary">
                  <div><strong>Servicio:</strong> {selectedService.name} ({selectedService.durationMinutes} min)</div>
                  <div><strong>Profesional:</strong> {pro.name}</div>
                  <div><strong>Cuándo:</strong> {date} · {formatTime(slot.start)} – {formatTime(slot.end)}</div>
                  <div><strong>Precio:</strong> ${Number(selectedService.price).toFixed(2)}</div>
                </div>
              );
            })()}
            <label htmlFor="b-notes"><span className="step-badge">5</span> Notas (opcional)</label>
            <textarea
              id="b-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Comentario para el profesional..."
            />

            <button type="submit" className="btn btn-primary booking-submit" disabled={submitting}>
              {submitting ? "Reservando..." : "Confirmar reserva"}
            </button>
          </>
        )}

        {error && <p className="booking-error">{error}</p>}
        {successMsg && <p className="booking-success">{successMsg}</p>}
      </form>
    </section>
  );
}

export default Booking;
