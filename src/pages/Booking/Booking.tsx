// ============================================================
// Booking (pantalla /turnos) — layout tipo "dashboard"
// ------------------------------------------------------------
// Flujo:
//   1. Elegir deporte (servicio) en cards.
//   2. Elegir día en la tira semanal.
//   3. Elegir cancha (= profesional) + horario en su grilla de chips.
//   4. Confirmar desde el panel lateral de Resumen.
//
// Mapeos respecto al modelo de datos:
//   - "Deporte"  → ServiceType (tiene duración y precio).
//   - "Cancha"   → Professional (cada uno ofrece ciertos servicios).
//   - "Horario"  → slots calculados desde la disponibilidad del back.
//
// Cálculo de slots: el centro abre OPEN y cierra CLOSE, en pasos de
// SLOT_STEP min. Un slot es:
//   - "busy"        si su celda de 30 min cae dentro de un turno reservado.
//   - "unavailable" si está libre pero un turno de la duración elegida
//                   no entra (pisaría un turno posterior o el cierre).
//   - "past"        si ya pasó.
//   - "free"        disponible.
// ============================================================

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";

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

const SLOT_STEP = 30;    // un slot cada 30 minutos
const MAX_ADVANCE_DAYS = 14;  // no se puede reservar con más de 2 semanas

// Horario de atención por día (coincide con el footer):
//   Lun-Vie: 8:00 - 22:00
//   Sáb:     9:00 - 14:00
//   Dom:     cerrado
// Devuelve { open, close } en horas, o null si ese día está cerrado.
function dayHours(d: Date): { open: number; close: number } | null {
  const day = d.getDay(); // 0 = domingo … 6 = sábado
  if (day === 0) return null;                  // domingo cerrado
  if (day === 6) return { open: 9, close: 14 }; // sábado
  return { open: 8, close: 22 };               // lunes a viernes
}

// Días de la semana, arrancando en lunes (como la tira del diseño).
const WEEKDAYS_MON = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// ----- Helpers de fecha/hora -------------------------------------------

function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function toLocalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Medianoche local de una fecha (para comparar días sin la hora).
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Lunes de la semana que contiene a `d`.
function mondayOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const offset = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - offset);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

// ¿Se pisan dos rangos? overlap = startA < endB && startB < endA.
function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

// ----- Slots -----------------------------------------------------------

interface Slot {
  start: Date;
  end: Date;          // start + durationMinutes (lo que duraría el turno)
  state: "free" | "busy" | "past" | "unavailable";
  iso: string;
}

function buildSlots(date: Date, durationMinutes: number, busy: BusySlot[]): Slot[] {
  const slots: Slot[] = [];
  const now = new Date();

  // Si el centro está cerrado ese día (domingo), no hay slots.
  const hours = dayHours(date);
  if (!hours) return slots;

  const dayStart = new Date(date);
  dayStart.setHours(hours.open, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(hours.close, 0, 0, 0);

  const busyRanges = busy.map((b) => ({
    start: new Date(b.startTime),
    end: new Date(b.endTime),
  }));

  for (let cursor = new Date(dayStart); cursor < dayEnd; cursor = new Date(cursor.getTime() + SLOT_STEP * 60_000)) {
    const start = new Date(cursor);
    const cellEnd = new Date(start.getTime() + SLOT_STEP * 60_000);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    const isOccupied = busyRanges.some((r) => overlaps(start, cellEnd, r.start, r.end));
    const isPast = start < now;
    const fits =
      end <= dayEnd && !busyRanges.some((r) => overlaps(start, end, r.start, r.end));

    let state: Slot["state"];
    if (isOccupied) state = "busy";
    else if (isPast) state = "past";
    else if (!fits) state = "unavailable";
    else state = "free";

    slots.push({ start, end, state, iso: toLocalIso(start) });
  }

  return slots;
}

// ----- Íconos por deporte (SVG inline, sin assets) ---------------------

function sportIcon(name: string) {
  const n = name.toLowerCase();
  const common = {
    width: 26, height: 26, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  if (n.includes("fútbol") || n.includes("futbol") || n.includes("soccer")) {
    return (
      <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7l4 3-1.5 5h-5L8 10z" /></svg>
    );
  }
  if (n.includes("tenis") || n.includes("tennis") || n.includes("pádel") || n.includes("padel")) {
    return (
      <svg {...common}><circle cx="9" cy="9" r="6" /><path d="M13.5 13.5L20 20" /></svg>
    );
  }
  if (n.includes("gym") || n.includes("gimnasio") || n.includes("fitness") || n.includes("hiit")) {
    return (
      <svg {...common}><path d="M6.5 6.5l11 11M4 9l2-2 2 2-2 2zM16 17l2-2 2 2-2 2zM3 12l3 3M18 6l3 3" /></svg>
    );
  }
  // Genérico.
  return (
    <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></svg>
  );
}

// ----- Distinción visual entre coaches ---------------------------------

// Iniciales para el avatar del coach: primeras letras de las dos
// primeras palabras del nombre ("Juan Pérez" → "JP", "Ana" → "A").
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

// Paleta de acentos para diferenciar cada coach de un vistazo. Se asigna
// por posición en la lista, así dos coaches contiguos nunca comparten
// color y se nota a simple vista que hay más de uno.
const COACH_ACCENTS = ["#2563eb", "#7cb305", "#d97706", "#db2777", "#0891b2", "#7c3aed"];

// ----- Componente ------------------------------------------------------

function Booking() {
  // ------ Catálogos del back -------------------------------------------
  const [services, setServices] = useState<ServiceType[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  // Disponibilidad por profesional para el día elegido: { proId: busySlots }.
  const [busyByPro, setBusyByPro] = useState<Record<number, BusySlot[]>>({});

  // ------ Selección del usuario ----------------------------------------
  const [serviceId, setServiceId] = useState<number | "">("");
  // Arrancamos en el primer día abierto desde hoy (evita caer en domingo).
  const [date, setDate] = useState(() => {
    let d = startOfDay(new Date());
    for (let i = 0; i < 7 && !dayHours(d); i++) d = addDays(d, 1);
    return toLocalDate(d);
  });
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(new Date()));
  const [selectedProId, setSelectedProId] = useState<number | "">("");
  const [slotIso, setSlotIso] = useState<string | "">("");
  const [notes, setNotes] = useState("");

  // ------ UI -----------------------------------------------------------
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ------ Carga inicial de catálogos -----------------------------------
  useEffect(() => {
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
  }, []);

  // ------ Servicio elegido y canchas (profesionales) que lo ofrecen ----
  const selectedService = useMemo(
    () => (serviceId ? services.find((s) => s.id === serviceId) ?? null : null),
    [serviceId, services]
  );

  const courts = useMemo(() => {
    if (!serviceId) return [];
    return professionals.filter(
      (p) => p.active && p.services.some((s) => s.id === serviceId)
    );
  }, [serviceId, professionals]);

  // ------ Disponibilidad de TODAS las canchas para el día --------------
  // Una llamada por profesional, en paralelo. Si una falla, esa cancha
  // queda sin busy slots (todos libres) en vez de romper la pantalla.
  useEffect(() => {
    if (!serviceId || !date || courts.length === 0) {
      setBusyByPro({});
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedProId("");
    setSlotIso("");
    Promise.all(
      courts.map((p) =>
        getAvailability(p.id, date)
          .then((r) => [p.id, r.busySlots] as const)
          .catch(() => [p.id, [] as BusySlot[]] as const)
      )
    )
      .then((entries) => {
        if (!cancelled) setBusyByPro(Object.fromEntries(entries));
      })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [serviceId, date, courts]);

  // ------ Slot elegido (para el resumen y el submit) -------------------
  const selectedSlot = useMemo(() => {
    if (!selectedProId || !slotIso || !selectedService) return null;
    const slots = buildSlots(
      new Date(`${date}T00:00:00`),
      selectedService.durationMinutes,
      busyByPro[selectedProId] ?? []
    );
    return slots.find((s) => s.iso === slotIso) ?? null;
  }, [selectedProId, slotIso, selectedService, date, busyByPro]);

  const selectedCourt = selectedProId
    ? courts.find((p) => p.id === selectedProId) ?? null
    : null;

  // ------ Tira de días de la semana ------------------------------------
  const today = startOfDay(new Date());
  // Fecha máxima reservable: hoy + 2 semanas.
  const maxDate = addDays(today, MAX_ADVANCE_DAYS);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const canGoPrevWeek = weekStart > mondayOfWeek(today);
  // Solo dejamos avanzar si la semana siguiente todavía cae dentro del límite.
  const canGoNextWeek = weekStart < mondayOfWeek(maxDate);

  function isSelectableDay(day: Date) {
    const d = startOfDay(day);
    // Dentro del rango reservable Y que el centro abra ese día.
    return d >= today && d <= maxDate && dayHours(d) !== null;
  }

  function pickDay(day: Date) {
    if (!isSelectableDay(day)) return; // fuera del rango reservable
    setDate(toLocalDate(day));
    setSelectedProId("");
    setSlotIso("");
  }

  // ------ Submit -------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedService || !selectedProId || !selectedSlot) {
      setError("Elegí deporte, día, cancha y horario antes de confirmar.");
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({
        startTime: selectedSlot.iso,
        endTime: toLocalIso(selectedSlot.end),
        notes: notes.trim() || undefined,
        professionalId: selectedProId as number,
        serviceTypeId: selectedService.id,
      });
      setSuccessMsg("¡Turno reservado! Vas a recibir la confirmación cuando un admin lo apruebe.");
      // Refrescamos la disponibilidad de esa cancha para que el slot
      // tomado aparezca ocupado sin recargar.
      const res = await getAvailability(selectedProId as number, date);
      setBusyByPro((prev) => ({ ...prev, [selectedProId as number]: res.busySlots }));
      setSelectedProId("");
      setSlotIso("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reservar el turno");
    } finally {
      setSubmitting(false);
    }
  }

  // ------ Render -------------------------------------------------------

  if (loadingCatalog) {
    return (
      <section className="booking2">
        <h1 className="booking2-title">Reservá tu turno</h1>
        <p className="booking2-subtitle">Cargando opciones…</p>
      </section>
    );
  }

  // Fecha legible para el resumen ("Mar 15 oct · 09:30").
  const summaryWhen = selectedSlot
    ? `${WEEKDAYS_MON[(new Date(`${date}T00:00:00`).getDay() + 6) % 7]} ${new Date(`${date}T00:00:00`).getDate()} ${MONTHS[new Date(`${date}T00:00:00`).getMonth()].slice(0, 3)} · ${formatTime(selectedSlot.start)}`
    : null;

  return (
    <section className="booking2">
      <div className="booking2-grid">
        {/* ---------- Columna principal ---------- */}
        <div className="booking2-main">
          <header className="booking2-head">
            <h1 className="booking2-title">Reservá tu turno</h1>
            <p className="booking2-subtitle">Elegí deporte, día, coach y horario.</p>
          </header>

          {/* Paso 1: deporte */}
          <div className="sport-grid">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`sport-card${serviceId === s.id ? " sport-card--active" : ""}`}
                onClick={() => {
                  setServiceId(s.id);
                  setSelectedProId("");
                  setSlotIso("");
                }}
              >
                <span className="sport-card-icon">{sportIcon(s.name)}</span>
                <span className="sport-card-name">{s.name}</span>
              </button>
            ))}
          </div>

          {/* Paso 2: tira de días */}
          {serviceId && (
            <div className="week-strip">
              <div className="week-strip-head">
                <strong>
                  {MONTHS[weekStart.getMonth()].charAt(0).toUpperCase() + MONTHS[weekStart.getMonth()].slice(1)} {weekStart.getFullYear()}
                </strong>
                <div className="week-strip-nav">
                  <button
                    type="button"
                    aria-label="Semana anterior"
                    disabled={!canGoPrevWeek}
                    onClick={() => setWeekStart((w) => addDays(w, -7))}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Semana siguiente"
                    disabled={!canGoNextWeek}
                    onClick={() => setWeekStart((w) => addDays(w, 7))}
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="week-days">
                {weekDays.map((day) => {
                  const selectable = isSelectableDay(day);
                  const isSelected = toLocalDate(day) === date;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={`week-day${isSelected ? " week-day--active" : ""}`}
                      disabled={!selectable}
                      onClick={() => pickDay(day)}
                    >
                      <span className="week-day-name">{WEEKDAYS_MON[(day.getDay() + 6) % 7]}</span>
                      <span className="week-day-num">{day.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paso 3: canchas + horarios */}
          {serviceId && (
            <div className="courts">
              {courts.length === 0 ? (
                <p className="booking2-empty">No hay coaches disponibles para este deporte.</p>
              ) : loadingSlots ? (
                <p className="booking2-empty">Cargando disponibilidad…</p>
              ) : (
                <>
                {/* Encabezado: deja en claro cuántos coaches hay para este deporte. */}
                <div className="courts-head">
                  <h2 className="courts-head-title">
                    {courts.length === 1 ? "Coach disponible" : "Elegí tu coach"}
                  </h2>
                  <span className="courts-count">
                    {courts.length} {courts.length === 1 ? "coach" : "coaches"}
                  </span>
                </div>
                {courts.map((court, idx) => {
                  const slots = buildSlots(
                    new Date(`${date}T00:00:00`),
                    selectedService!.durationMinutes,
                    busyByPro[court.id] ?? []
                  );
                  // Acento por posición: avatar, borde e índice comparten color
                  // para que cada coach se distinga del de al lado.
                  const accent = COACH_ACCENTS[idx % COACH_ACCENTS.length];
                  return (
                    <article
                      key={court.id}
                      className="court-card"
                      style={{ "--coach-accent": accent } as CSSProperties}
                    >
                      <div className="court-card-head">
                        <span className="court-avatar" aria-hidden="true">{initials(court.name)}</span>
                        <div className="court-card-id">
                          <h3 className="court-card-name">{court.name}</h3>
                          <span className="court-card-tag">{court.speciality}</span>
                        </div>
                        {courts.length > 1 && (
                          <span className="court-card-index">{idx + 1}</span>
                        )}
                      </div>
                      <div className="slot-chips">
                        {slots.map((s) => (
                          <button
                            key={s.iso}
                            type="button"
                            className={`slot-chip slot-chip--${s.state}${
                              selectedProId === court.id && slotIso === s.iso ? " slot-chip--selected" : ""
                            }`}
                            disabled={s.state !== "free"}
                            title={
                              s.state === "busy" ? "Ocupado" :
                              s.state === "past" ? "Ya pasó" :
                              s.state === "unavailable" ? "No entra un turno de esta duración" :
                              `${formatTime(s.start)} - ${formatTime(s.end)}`
                            }
                            onClick={() => {
                              setSelectedProId(court.id);
                              setSlotIso(s.iso);
                            }}
                          >
                            {formatTime(s.start)}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
                </>
              )}
            </div>
          )}
        </div>

        {/* ---------- Panel lateral: Resumen ---------- */}
        <aside className="summary">
          <form className="summary-card" onSubmit={handleSubmit}>
            <h2 className="summary-title">Resumen de reserva</h2>

            <div className="summary-row">
              <span className="summary-label">Deporte</span>
              <span className="summary-value">
                {selectedService ? selectedService.name : "—"}
                {selectedService && <CheckDot ok />}
              </span>
            </div>

            <div className="summary-row">
              <span className="summary-label">Coach</span>
              <span className="summary-value">{selectedCourt ? selectedCourt.name : "—"}</span>
            </div>

            <div className="summary-row">
              <span className="summary-label">Día y hora</span>
              <span className="summary-value">{summaryWhen ?? "—"}</span>
            </div>

            {selectedService && (
              <p className="summary-session">{selectedService.durationMinutes} min de sesión</p>
            )}

            <div className="summary-price">
              <div className="summary-price-row">
                <span>Precio</span>
                <span>{selectedService ? `$${Number(selectedService.price).toFixed(2)}` : "$0.00"}</span>
              </div>
              <div className="summary-price-row summary-price-total">
                <span>Total</span>
                <span>{selectedService ? `$${Number(selectedService.price).toFixed(2)}` : "$0.00"}</span>
              </div>
            </div>

            {/* Notas opcionales para el profesional. */}
            {selectedSlot && (
              <textarea
                className="summary-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Notas (opcional)…"
              />
            )}

            <button
              type="submit"
              className="btn btn-primary summary-confirm"
              disabled={submitting || !selectedSlot}
            >
              {submitting ? "Reservando…" : "Confirmar reserva →"}
            </button>

            <p className="summary-fineprint">
              Cancelaciones permitidas hasta 24 hs antes del turno.
            </p>

            {error && <p className="booking2-error">{error}</p>}
            {successMsg && <p className="booking2-success">{successMsg}</p>}
          </form>
        </aside>
      </div>
    </section>
  );
}

// Indicador circular verde de "paso completo" en el resumen.
function CheckDot({ ok }: { ok: boolean }) {
  if (!ok) return null;
  return (
    <svg className="summary-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default Booking;
