/**
 * availability.ts — Motor de disponibilidad de slots (fuente unica).
 *
 * Fase 2 — Motor de Agendamiento Multi-Recurso.
 * Consolida el algoritmo de enumeracion de slots que vivia duplicado en
 * `bot-handler` (getAvailableSlotsForDate) y la edge function `get-available-slots`.
 * Ambos ahora delegan aqui. La logica es la version canonica (superset) que
 * agrega calendar_schedules de todos los calendarios del doctor cuando no se
 * pasa calendarId, con fallback a doctor_schedules.
 *
 * Co-working: las citas que ocupan un slot son las de TODOS los doctores activos
 * del/los calendario(s) (calendar_doctors), no solo el doctor pedido.
 *
 * Tiempos: se construyen naive (sin zona) y se comparan en milisegundos — es
 * consistente dentro de la funcion. El filtro de "slots pasados" para hoy usa
 * la hora actual en zona Honduras.
 *
 * 2B agregara conciencia de recursos (capacidad + buffer) sobre este mismo engine.
 */

import { DateTime } from "https://esm.sh/luxon@3.4.4";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export const AVAILABILITY_TIMEZONE = "America/Tegucigalpa";
const DEFAULT_DURATION_MINUTES = 60;
const CANCELLED_STATUSES = '("cancelled","canceled","cancelada")';

export interface SlotQuery {
  doctorId: string;
  /** Fecha YYYY-MM-DD */
  date: string;
  durationMinutes: number;
  /** Calendario especifico; si se omite, se agregan los del doctor. */
  calendarId?: string;
  /** Granularidad de slots; default Math.min(durationMinutes, 30). */
  slotGranularity?: number;
  /**
   * 2B resource-aware (opcional). Si se pasa serviceTypeId + organizationId,
   * el motor excluye slots sin capacidad de recurso y aplica buffer del servicio.
   * Si el servicio no tiene receta (service_resources) ni buffer, el resultado
   * es IDENTICO al modo base (degradacion para clientes actuales).
   */
  serviceTypeId?: string;
  organizationId?: string;
}

interface ScheduleWindow {
  start_time: string;
  end_time: string;
}

interface OccupiedInterval {
  startMs: number;
  endMs: number;
}

/** Receta: recurso requerido por el servicio candidato. */
interface RecipeItem {
  resourceId: string;
  requiredNow: number;
  capacity: number;
}

/** Consumo de un recurso por una cita existente (con buffer aplicado). */
interface ResourceConsumer {
  startMs: number;
  endMs: number;
  qty: number;
}

/** Construye un DateTime naive combinando fecha + hora "HH:MM[:SS]". */
function buildDateTime(date: string, time: string): DateTime {
  return DateTime.fromISO(`${date}T${time.substring(0, 5)}:00`);
}

/**
 * Enumeracion pura de slots (sin DB). Loop unico usado por getAvailableSlotsForDate
 * y por get-available-days (que pasa sus datos ya batcheados). Por defecto solo
 * chequea solape profesional; con `opts.resourceOk` aplica el filtro de recursos,
 * y con `opts.candidateBuffer` extiende el footprint del candidato (limpieza posterior).
 */
export function enumerateSlots(
  date: string,
  schedules: ScheduleWindow[],
  occupiedIntervals: OccupiedInterval[],
  durationMinutes: number,
  slotGranularity: number,
  opts?: {
    candidateBuffer?: number;
    resourceOk?: (slotStartMs: number, slotEndMs: number) => boolean;
  },
): string[] {
  const candidateBuffer = opts?.candidateBuffer ?? 0;

  const now = DateTime.now().setZone(AVAILABILITY_TIMEZONE);
  const isToday = date === now.toISODate();
  const nowHHMM = now.toFormat("HH:mm");

  const availableSlots: string[] = [];

  for (const schedule of schedules) {
    const workStart = buildDateTime(date, schedule.start_time);
    const workEndMs = buildDateTime(date, schedule.end_time).toMillis();

    let slotStart = workStart;
    // El candidato necesita duracion (para caber en el horario) — el buffer es
    // tiempo de limpieza posterior, NO exige caber dentro del horario laboral.
    while (slotStart.plus({ minutes: durationMinutes }).toMillis() <= workEndMs) {
      if (isToday && slotStart.toFormat("HH:mm") <= nowHHMM) {
        slotStart = slotStart.plus({ minutes: slotGranularity });
        continue;
      }

      const slotStartMs = slotStart.toMillis();
      // Footprint del candidato = duracion + buffer (para overlap con otras citas)
      const slotEndMs = slotStart.plus({ minutes: durationMinutes + candidateBuffer }).toMillis();

      const hasProfOverlap = occupiedIntervals.some(
        ({ startMs, endMs }) => slotStartMs < endMs && startMs < slotEndMs,
      );

      if (!hasProfOverlap && (!opts?.resourceOk || opts.resourceOk(slotStartMs, slotEndMs))) {
        availableSlots.push(slotStart.toFormat("HH:mm"));
      }

      slotStart = slotStart.plus({ minutes: slotGranularity });
    }
  }

  return Array.from(new Set(availableSlots)).sort((a, b) => a.localeCompare(b));
}

/**
 * Carga las ventanas de horario para un dia de la semana.
 * Primario: calendar_schedules (por calendarId, o agregando los calendarios del
 * doctor). Fallback: doctor_schedules.
 */
async function loadSchedules(
  supabase: SupabaseClient,
  doctorId: string,
  dayOfWeek: number,
  calendarId?: string,
): Promise<ScheduleWindow[]> {
  let schedules: ScheduleWindow[] = [];

  if (calendarId) {
    const { data, error } = await supabase
      .from("calendar_schedules")
      .select("start_time, end_time")
      .eq("calendar_id", calendarId)
      .eq("day_of_week", dayOfWeek);
    if (error) return [];
    schedules = (data || []) as ScheduleWindow[];
  } else {
    const { data: calDoctors } = await supabase
      .from("calendar_doctors")
      .select("calendar_id")
      .eq("doctor_id", doctorId)
      .eq("is_active", true);
    if (calDoctors && calDoctors.length > 0) {
      const calendarIds = calDoctors.map((cd: any) => cd.calendar_id);
      const { data } = await supabase
        .from("calendar_schedules")
        .select("start_time, end_time")
        .in("calendar_id", calendarIds)
        .eq("day_of_week", dayOfWeek);
      schedules = (data || []) as ScheduleWindow[];
    }
  }

  // Fallback a doctor_schedules si no hay calendar_schedules
  if (schedules.length === 0) {
    const { data } = await supabase
      .from("doctor_schedules")
      .select("start_time, end_time")
      .eq("doctor_id", doctorId)
      .eq("day_of_week", dayOfWeek);
    schedules = (data || []) as ScheduleWindow[];
  }

  return schedules;
}

/**
 * IDs de doctores cuyas citas ocupan los slots (co-working): todos los doctores
 * activos del/los calendario(s) relevante(s). Default: [doctorId].
 */
async function loadCoworkDoctorIds(
  supabase: SupabaseClient,
  doctorId: string,
  calendarId?: string,
): Promise<string[]> {
  if (calendarId) {
    const { data: calDocRows } = await supabase
      .from("calendar_doctors")
      .select("doctor_id")
      .eq("calendar_id", calendarId)
      .eq("is_active", true);
    if (calDocRows && calDocRows.length > 0) {
      return [...new Set(calDocRows.map((r: any) => r.doctor_id))];
    }
    return [doctorId];
  }

  const { data: calDocs } = await supabase
    .from("calendar_doctors")
    .select("calendar_id")
    .eq("doctor_id", doctorId)
    .eq("is_active", true);
  if (calDocs && calDocs.length > 0) {
    const calIds = calDocs.map((cd: any) => cd.calendar_id);
    const { data: allCalDocs } = await supabase
      .from("calendar_doctors")
      .select("doctor_id")
      .in("calendar_id", calIds)
      .eq("is_active", true);
    if (allCalDocs && allCalDocs.length > 0) {
      return [...new Set(allCalDocs.map((r: any) => r.doctor_id))];
    }
  }
  return [doctorId];
}

/**
 * Carga el buffer del servicio candidato y su receta (recursos requeridos con
 * capacidad). Solo recursos activos cuentan (igual que el trigger Fase 0).
 */
async function loadCandidateRecipe(
  supabase: SupabaseClient,
  serviceTypeId: string,
): Promise<{ buffer: number; recipe: RecipeItem[] }> {
  const { data: stRow } = await supabase
    .from("service_types")
    .select("buffer_minutes")
    .eq("id", serviceTypeId)
    .maybeSingle();
  const buffer = (stRow as any)?.buffer_minutes ?? 0;

  const { data: srRows } = await supabase
    .from("service_resources")
    .select("resource_id, quantity_required, resources(quantity, is_active)")
    .eq("service_type_id", serviceTypeId);

  const recipe: RecipeItem[] = (srRows || [])
    .filter((r: any) => r.resources?.is_active)
    .map((r: any) => ({
      resourceId: r.resource_id,
      requiredNow: r.quantity_required,
      capacity: r.resources.quantity,
    }));

  return { buffer, recipe };
}

/**
 * Mapa resource_id → intervalos de consumo (con buffer del servicio de cada cita)
 * de TODAS las citas activas del org en la fecha que consumen alguno de los
 * recursos de la receta. Consumo derivado en query-time (sin tabla materializada).
 */
async function loadResourceConsumers(
  supabase: SupabaseClient,
  organizationId: string,
  date: string,
  recipeResourceIds: string[],
): Promise<Map<string, ResourceConsumer[]>> {
  const byResource = new Map<string, ResourceConsumer[]>();
  if (recipeResourceIds.length === 0) return byResource;

  const { data: dayAppts } = await supabase
    .from("appointments")
    .select("time, duration_minutes, service_types(buffer_minutes, service_resources(resource_id, quantity_required))")
    .eq("organization_id", organizationId)
    .eq("date", date)
    .not("status", "in", CANCELLED_STATUSES)
    .not("service_type_id", "is", null);

  for (const apt of dayAppts || []) {
    const st = (apt as any).service_types;
    if (!st) continue;
    const srList = st.service_resources || [];
    const buf = st.buffer_minutes ?? 0;
    const start = buildDateTime(date, (apt as any).time);
    const startMs = start.toMillis();
    const endMs = start
      .plus({ minutes: ((apt as any).duration_minutes ?? DEFAULT_DURATION_MINUTES) + buf })
      .toMillis();

    for (const sr of srList) {
      if (!recipeResourceIds.includes(sr.resource_id)) continue;
      if (!byResource.has(sr.resource_id)) byResource.set(sr.resource_id, []);
      byResource.get(sr.resource_id)!.push({ startMs, endMs, qty: sr.quantity_required });
    }
  }

  return byResource;
}

/**
 * Calcula los slots disponibles (HH:mm) para una fecha, considerando horario,
 * citas existentes de co-working y slots pasados para hoy.
 * Fuente unica usada por bot-handler y get-available-slots.
 *
 * 2B: si se pasa serviceTypeId + organizationId, ademas excluye slots donde algun
 * recurso requerido no tiene capacidad y aplica el buffer del servicio (footprint
 * profesional + recurso). Degrada a identico al modo base si no hay receta/buffer.
 */
export async function getAvailableSlotsForDate(
  supabase: SupabaseClient,
  query: SlotQuery,
): Promise<string[]> {
  const { doctorId, date, durationMinutes, calendarId, serviceTypeId, organizationId } = query;
  const slotGranularity = query.slotGranularity ?? Math.min(durationMinutes, 30);

  // Dia de la semana (Luxon 1=Lun..7=Dom → 0=Dom..6=Sab)
  const dayOfWeek = DateTime.fromISO(date).weekday % 7;

  const schedules = await loadSchedules(supabase, doctorId, dayOfWeek, calendarId);
  if (schedules.length === 0) return [];

  const resourceAware = !!(serviceTypeId && organizationId);

  // Receta + buffer del candidato (solo en modo resource-aware)
  let candidateBuffer = 0;
  let recipe: RecipeItem[] = [];
  let consumersByResource = new Map<string, ResourceConsumer[]>();
  if (resourceAware) {
    const loaded = await loadCandidateRecipe(supabase, serviceTypeId!);
    candidateBuffer = loaded.buffer;
    recipe = loaded.recipe;
    consumersByResource = await loadResourceConsumers(
      supabase,
      organizationId!,
      date,
      recipe.map((r) => r.resourceId),
    );
  }

  // Footprint profesional (citas de co-working). En modo resource-aware se aplica
  // el buffer del servicio de cada cita; en modo base es la duracion cruda (= 2A).
  const appointmentDoctorIds = await loadCoworkDoctorIds(supabase, doctorId, calendarId);
  const occupiedIntervals: OccupiedInterval[] = resourceAware
    ? ((
        await supabase
          .from("appointments")
          .select("time, duration_minutes, service_types(buffer_minutes)")
          .in("doctor_id", appointmentDoctorIds)
          .eq("date", date)
          .not("status", "in", CANCELLED_STATUSES)
      ).data || []
      ).map((apt: any) => {
        const start = buildDateTime(date, apt.time);
        const buf = apt.service_types?.buffer_minutes ?? 0;
        const end = start.plus({ minutes: (apt.duration_minutes ?? DEFAULT_DURATION_MINUTES) + buf });
        return { startMs: start.toMillis(), endMs: end.toMillis() };
      })
    : ((
        await supabase
          .from("appointments")
          .select("time, duration_minutes")
          .in("doctor_id", appointmentDoctorIds)
          .eq("date", date)
          .not("status", "in", CANCELLED_STATUSES)
      ).data || []
      ).map((apt: any) => {
        const start = buildDateTime(date, apt.time);
        const end = start.plus({ minutes: apt.duration_minutes ?? DEFAULT_DURATION_MINUTES });
        return { startMs: start.toMillis(), endMs: end.toMillis() };
      });

  // Predicado de capacidad de recursos (solo en modo resource-aware; recipe vacia → siempre ok)
  const resourceOk = (slotStartMs: number, slotEndMs: number): boolean => {
    for (const r of recipe) {
      const consumers = consumersByResource.get(r.resourceId) || [];
      let used = 0;
      for (const c of consumers) {
        if (slotStartMs < c.endMs && c.startMs < slotEndMs) used += c.qty;
      }
      if (used + r.requiredNow > r.capacity) return false;
    }
    return true;
  };

  return enumerateSlots(date, schedules, occupiedIntervals, durationMinutes, slotGranularity, {
    candidateBuffer,
    resourceOk: recipe.length > 0 ? resourceOk : undefined,
  });
}
