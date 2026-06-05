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
export async function loadSchedules(
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
export async function loadCoworkDoctorIds(
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
export async function loadCandidateRecipe(
  supabase: SupabaseClient,
  serviceTypeId: string,
): Promise<{ buffer: number; recipe: RecipeItem[] }> {
  // Las 2 queries dependen solo de serviceTypeId (no entre si) → paralelas.
  const [stRes, srRes] = await Promise.all([
    supabase
      .from("service_types")
      .select("buffer_minutes")
      .eq("id", serviceTypeId)
      .maybeSingle(),
    supabase
      .from("service_resources")
      .select("resource_id, quantity_required, resources(quantity, is_active)")
      .eq("service_type_id", serviceTypeId),
  ]);
  const buffer = (stRes.data as any)?.buffer_minutes ?? 0;

  const recipe: RecipeItem[] = (srRes.data || [])
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
export async function loadResourceConsumers(
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

  // Dos cadenas INDEPENDIENTES (cada una secuencial internamente) en paralelo:
  //  A) receta+buffer del candidato → consumo de recursos (solo resource-aware).
  //  B) doctores co-working → sus citas del dia (footprint profesional). En modo
  //     resource-aware aplica el buffer del servicio de cada cita; en base, duracion
  //     cruda (= 2A). El orden del array no importa (overlap via .some()).
  const [recipeChain, occupiedIntervals] = await Promise.all([
    (async (): Promise<{
      candidateBuffer: number;
      recipe: RecipeItem[];
      consumersByResource: Map<string, ResourceConsumer[]>;
    }> => {
      if (!resourceAware) {
        return { candidateBuffer: 0, recipe: [], consumersByResource: new Map() };
      }
      const loaded = await loadCandidateRecipe(supabase, serviceTypeId!);
      const consumers = await loadResourceConsumers(
        supabase,
        organizationId!,
        date,
        loaded.recipe.map((r) => r.resourceId),
      );
      return { candidateBuffer: loaded.buffer, recipe: loaded.recipe, consumersByResource: consumers };
    })(),
    (async (): Promise<OccupiedInterval[]> => {
      const appointmentDoctorIds = await loadCoworkDoctorIds(supabase, doctorId, calendarId);
      if (resourceAware) {
        const { data } = await supabase
          .from("appointments")
          .select("time, duration_minutes, service_types(buffer_minutes)")
          .in("doctor_id", appointmentDoctorIds)
          .eq("date", date)
          .not("status", "in", CANCELLED_STATUSES);
        return (data || []).map((apt: any) => {
          const start = buildDateTime(date, apt.time);
          const buf = apt.service_types?.buffer_minutes ?? 0;
          const end = start.plus({ minutes: (apt.duration_minutes ?? DEFAULT_DURATION_MINUTES) + buf });
          return { startMs: start.toMillis(), endMs: end.toMillis() };
        });
      }
      const { data } = await supabase
        .from("appointments")
        .select("time, duration_minutes")
        .in("doctor_id", appointmentDoctorIds)
        .eq("date", date)
        .not("status", "in", CANCELLED_STATUSES);
      return (data || []).map((apt: any) => {
        const start = buildDateTime(date, apt.time);
        const end = start.plus({ minutes: apt.duration_minutes ?? DEFAULT_DURATION_MINUTES });
        return { startMs: start.toMillis(), endMs: end.toMillis() };
      });
    })(),
  ]);
  const { candidateBuffer, recipe, consumersByResource } = recipeChain;

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

// ============================================================================
// Fase 5 — Secuenciador de visitas multi-procedimiento.
// Estado del dia batcheado (citas EXTERNAS) + predicados de intervalo arbitrario.
// Los procedimientos de una visita son secuenciales back-to-back: se chequean
// independientes vs citas externas (nunca entre si), igual que el trigger visit-aware.
// ============================================================================

interface MsWindow {
  startMs: number;
  endMs: number;
}

export interface VisitDayState {
  date: string;
  windowsByDoctor: Map<string, MsWindow[]>;
  occupiedByDoctor: Map<string, OccupiedInterval[]>;
  consumersByResource: Map<string, ResourceConsumer[]>;
  serviceMeta: Map<string, { buffer: number; recipe: RecipeItem[] }>;
}

/**
 * Carga (una vez) el estado del dia para el secuenciador: ventanas laborales y
 * citas externas (con buffer + co-working) por doctor, consumo de recursos por
 * recurso, y buffer/receta por servicio. Sin la visita en construccion.
 */
export async function loadVisitDayState(
  supabase: SupabaseClient,
  params: { organizationId: string; date: string; doctorIds: string[]; serviceTypeIds: string[] },
): Promise<VisitDayState> {
  const { organizationId, date, doctorIds, serviceTypeIds } = params;
  const dayOfWeek = DateTime.fromISO(date).weekday % 7;

  // Nivel 0: cargas estaticas independientes en paralelo — por doctor
  // (horarios + co-working) y por servicio (receta). Las reducciones de abajo
  // iteran doctorIds/serviceTypeIds (no el orden de resolucion) para que
  // [...allCoworkIds]/[...recipeResourceIds] queden identicos al camino serial.
  const [doctorLoads, serviceLoads] = await Promise.all([
    Promise.all(doctorIds.map((docId) =>
      Promise.all([
        loadSchedules(supabase, docId, dayOfWeek),
        loadCoworkDoctorIds(supabase, docId),
      ]).then(([schedules, cowork]) => ({ docId, schedules, cowork })),
    )),
    Promise.all(serviceTypeIds.map((svcId) =>
      loadCandidateRecipe(supabase, svcId).then((loaded) => ({ svcId, loaded })),
    )),
  ]);

  const windowsByDoctor = new Map<string, MsWindow[]>();
  const coworkByDoctor = new Map<string, string[]>();
  const allCoworkIds = new Set<string>();
  for (const { docId, schedules, cowork } of doctorLoads) {
    windowsByDoctor.set(
      docId,
      schedules.map((s) => ({
        startMs: buildDateTime(date, s.start_time).toMillis(),
        endMs: buildDateTime(date, s.end_time).toMillis(),
      })),
    );
    coworkByDoctor.set(docId, cowork);
    for (const id of cowork) allCoworkIds.add(id);
  }

  const serviceMeta = new Map<string, { buffer: number; recipe: RecipeItem[] }>();
  const recipeResourceIds = new Set<string>();
  for (const { svcId, loaded } of serviceLoads) {
    serviceMeta.set(svcId, loaded);
    for (const r of loaded.recipe) recipeResourceIds.add(r.resourceId);
  }

  // Nivel 1: citas externas del dia (footprint) + consumo de recursos, en paralelo
  // (ambas dependen solo de los Sets ya construidos arriba).
  const [apptsRes, consumersByResource] = await Promise.all([
    allCoworkIds.size > 0
      ? supabase
          .from("appointments")
          .select("doctor_id, time, duration_minutes, service_types(buffer_minutes)")
          .in("doctor_id", [...allCoworkIds])
          .eq("date", date)
          .not("status", "in", CANCELLED_STATUSES)
      : Promise.resolve({ data: [] as any[] }),
    loadResourceConsumers(supabase, organizationId, date, [...recipeResourceIds]),
  ]);

  const occByDoctorRaw = new Map<string, OccupiedInterval[]>();
  for (const apt of apptsRes.data || []) {
    const a = apt as any;
    const start = buildDateTime(date, a.time);
    const buf = a.service_types?.buffer_minutes ?? 0;
    const end = start.plus({ minutes: (a.duration_minutes ?? DEFAULT_DURATION_MINUTES) + buf });
    if (!occByDoctorRaw.has(a.doctor_id)) occByDoctorRaw.set(a.doctor_id, []);
    occByDoctorRaw.get(a.doctor_id)!.push({ startMs: start.toMillis(), endMs: end.toMillis() });
  }
  const occupiedByDoctor = new Map<string, OccupiedInterval[]>();
  for (const docId of doctorIds) {
    const cowork = coworkByDoctor.get(docId) ?? [docId];
    const merged: OccupiedInterval[] = [];
    for (const cw of cowork) {
      const arr = occByDoctorRaw.get(cw);
      if (arr) merged.push(...arr);
    }
    occupiedByDoctor.set(docId, merged);
  }

  return { date, windowsByDoctor, occupiedByDoctor, consumersByResource, serviceMeta };
}

/** ¿El doctor puede tomar [slotStart, clinicalEnd] (cabe en una ventana) sin solape externo (vs footprint)? */
export function isDoctorFree(
  state: VisitDayState,
  doctorId: string,
  slotStartMs: number,
  clinicalEndMs: number,
  footprintEndMs: number,
): boolean {
  const windows = state.windowsByDoctor.get(doctorId) ?? [];
  const fits = windows.some((w) => slotStartMs >= w.startMs && clinicalEndMs <= w.endMs);
  if (!fits) return false;
  const occ = state.occupiedByDoctor.get(doctorId) ?? [];
  return !occ.some(({ startMs, endMs }) => slotStartMs < endMs && startMs < footprintEndMs);
}

/** ¿Hay capacidad de recursos del servicio en [slotStart, footprintEnd] vs citas externas? */
export function isResourceCapacityOk(
  state: VisitDayState,
  serviceTypeId: string,
  slotStartMs: number,
  footprintEndMs: number,
): boolean {
  const meta = state.serviceMeta.get(serviceTypeId);
  if (!meta) return true;
  for (const r of meta.recipe) {
    const consumers = state.consumersByResource.get(r.resourceId) || [];
    let used = 0;
    for (const c of consumers) {
      if (slotStartMs < c.endMs && c.startMs < footprintEndMs) used += c.qty;
    }
    if (used + r.requiredNow > r.capacity) return false;
  }
  return true;
}

/** Buffer del servicio (0 si no tiene). */
export function serviceBuffer(state: VisitDayState, serviceTypeId: string): number {
  return state.serviceMeta.get(serviceTypeId)?.buffer ?? 0;
}

/** ms naive de fecha+hora (consistente con el motor). */
export function dateTimeToMs(date: string, time: string): number {
  return buildDateTime(date, time).toMillis();
}

/** ms naive → "HH:mm" (round-trip consistente con dateTimeToMs). */
export function msToHHMM(ms: number): string {
  return DateTime.fromMillis(ms).toFormat("HH:mm");
}

/**
 * Candidatos de inicio de visita: union de las ventanas de los doctores dados en
 * pasos de `granularity` minutos, filtrando slots pasados para hoy (zona Honduras).
 * Mismo criterio de hoy que enumerateSlots. El "cabe la duracion" se valida luego
 * por procedimiento en isDoctorFree.
 */
export function visitStartCandidates(
  state: VisitDayState,
  doctorIds: string[],
  granularity: number,
): number[] {
  const now = DateTime.now().setZone(AVAILABILITY_TIMEZONE);
  const isToday = state.date === now.toISODate();
  const nowHHMM = now.toFormat("HH:mm");

  const set = new Set<number>();
  for (const docId of doctorIds) {
    const windows = state.windowsByDoctor.get(docId) ?? [];
    for (const w of windows) {
      let t = w.startMs;
      while (t < w.endMs) {
        const hhmm = DateTime.fromMillis(t).toFormat("HH:mm");
        if (!(isToday && hhmm <= nowHHMM)) set.add(t);
        t += granularity * 60000;
      }
    }
  }
  return [...set].sort((a, b) => a - b);
}

// ============================================================================
// Fase 0 del rediseño UI — disponibilidad de visita por RANGO de dias.
// `get-visit-days` necesita saber, para los ~14 dias del week-strip, si CADA dia
// admite al menos un inicio de visita factible (para tachar los que no). En vez de
// 14 llamadas a get-visit-slots, se batchea TODO el rango en pocas queries (mismo
// patron que get-available-days) y se corre el greedy por dia EN MEMORIA. Reusa las
// mismas primitivas que get-visit-slots → strip y slots no pueden divergir.
// ============================================================================

interface ScheduleDowRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

/**
 * Horarios de TODA la semana de un doctor (sin filtrar dow). Variante batcheada de
 * loadSchedules (camino sin calendarId): agrega calendar_schedules de los calendarios
 * del doctor, con fallback a doctor_schedules. Se llama 1 vez por doctor para todo el
 * rango (los horarios dependen del dia-de-semana, no de la fecha).
 */
export async function loadSchedulesAllDows(
  supabase: SupabaseClient,
  doctorId: string,
): Promise<ScheduleDowRow[]> {
  let rows: ScheduleDowRow[] = [];

  const { data: calDoctors } = await supabase
    .from("calendar_doctors")
    .select("calendar_id")
    .eq("doctor_id", doctorId)
    .eq("is_active", true);
  if (calDoctors && calDoctors.length > 0) {
    const calIds = calDoctors.map((cd: any) => cd.calendar_id);
    const { data } = await supabase
      .from("calendar_schedules")
      .select("day_of_week, start_time, end_time")
      .in("calendar_id", calIds);
    rows = (data || []) as ScheduleDowRow[];
  }

  if (rows.length === 0) {
    const { data } = await supabase
      .from("doctor_schedules")
      .select("day_of_week, start_time, end_time")
      .eq("doctor_id", doctorId);
    rows = (data || []) as ScheduleDowRow[];
  }

  return rows;
}

/**
 * Estado de visita para un RANGO de fechas, batcheado. Devuelve un VisitDayState por
 * fecha (mismo shape y semantica que loadVisitDayState) pero cargando los datos del
 * rango completo en pocas queries fijas, independiente del numero de dias:
 *   - receta/buffer por servicio: estatico (1 vez por servicio)
 *   - co-working + horarios por doctor: estatico (1 vez por doctor; horarios por dow)
 *   - citas externas (footprint) y consumo de recursos: 1 query de rango cada uno,
 *     agrupadas por fecha en memoria.
 */
export async function loadVisitRangeState(
  supabase: SupabaseClient,
  params: { organizationId: string; dates: string[]; doctorIds: string[]; serviceTypeIds: string[] },
): Promise<Map<string, VisitDayState>> {
  const { organizationId, dates, doctorIds, serviceTypeIds } = params;

  // Nivel 0: cargas estaticas independientes en paralelo — por servicio (receta) y
  // por doctor (co-working + horarios de toda la semana). Las reducciones iteran
  // serviceTypeIds/doctorIds (no el orden de resolucion) → [...recipeResourceIds]/
  // [...allCoworkIds] identicos al camino serial.
  const [serviceLoads, doctorLoads] = await Promise.all([
    Promise.all(serviceTypeIds.map((svcId) =>
      loadCandidateRecipe(supabase, svcId).then((loaded) => ({ svcId, loaded })),
    )),
    Promise.all(doctorIds.map((docId) =>
      Promise.all([
        loadCoworkDoctorIds(supabase, docId),
        loadSchedulesAllDows(supabase, docId),
      ]).then(([cowork, rows]) => ({ docId, cowork, rows })),
    )),
  ]);

  const serviceMeta = new Map<string, { buffer: number; recipe: RecipeItem[] }>();
  const recipeResourceIds = new Set<string>();
  for (const { svcId, loaded } of serviceLoads) {
    serviceMeta.set(svcId, loaded);
    for (const r of loaded.recipe) recipeResourceIds.add(r.resourceId);
  }

  const coworkByDoctor = new Map<string, string[]>();
  const allCoworkIds = new Set<string>();
  const schedByDoctorDow = new Map<string, Map<number, ScheduleWindow[]>>();
  for (const { docId, cowork, rows } of doctorLoads) {
    coworkByDoctor.set(docId, cowork);
    for (const id of cowork) allCoworkIds.add(id);

    const byDow = new Map<number, ScheduleWindow[]>();
    for (const r of rows) {
      if (!byDow.has(r.day_of_week)) byDow.set(r.day_of_week, []);
      byDow.get(r.day_of_week)!.push({ start_time: r.start_time, end_time: r.end_time });
    }
    schedByDoctorDow.set(docId, byDow);
  }

  const dateSet = new Set(dates);
  const sorted = [...dates].sort();
  const minDate = sorted[0];
  const maxDate = sorted[sorted.length - 1];

  // Nivel 1: las 2 queries de rango (citas externas + consumo de recursos) en
  // paralelo. Guards preservados: si el Set esta vacio NO se construye la query
  // (Promise.resolve({data:[]})), identico al camino serial.
  const [apptsRes, dayApptsRes] = await Promise.all([
    allCoworkIds.size > 0
      ? supabase
          .from("appointments")
          .select("doctor_id, date, time, duration_minutes, service_types(buffer_minutes)")
          .in("doctor_id", [...allCoworkIds])
          .gte("date", minDate)
          .lte("date", maxDate)
          .not("status", "in", CANCELLED_STATUSES)
      : Promise.resolve({ data: [] as any[] }),
    recipeResourceIds.size > 0
      ? supabase
          .from("appointments")
          .select("date, time, duration_minutes, service_types(buffer_minutes, service_resources(resource_id, quantity_required))")
          .eq("organization_id", organizationId)
          .gte("date", minDate)
          .lte("date", maxDate)
          .not("status", "in", CANCELLED_STATUSES)
          .not("service_type_id", "is", null)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Citas externas (footprint = duracion + buffer del servicio) de los co-workers, por fecha.
  const occByDateDoctor = new Map<string, Map<string, OccupiedInterval[]>>();
  for (const apt of apptsRes.data || []) {
    const a = apt as any;
    if (!dateSet.has(a.date)) continue;
    const start = buildDateTime(a.date, a.time);
    const buf = a.service_types?.buffer_minutes ?? 0;
    const end = start.plus({ minutes: (a.duration_minutes ?? DEFAULT_DURATION_MINUTES) + buf });
    if (!occByDateDoctor.has(a.date)) occByDateDoctor.set(a.date, new Map());
    const m = occByDateDoctor.get(a.date)!;
    if (!m.has(a.doctor_id)) m.set(a.doctor_id, []);
    m.get(a.doctor_id)!.push({ startMs: start.toMillis(), endMs: end.toMillis() });
  }

  // Consumo de recursos por fecha (citas del org que tocan algun recurso de las recetas).
  const consumersByDate = new Map<string, Map<string, ResourceConsumer[]>>();
  for (const apt of dayApptsRes.data || []) {
    const a = apt as any;
    if (!dateSet.has(a.date)) continue;
    const st = a.service_types;
    if (!st) continue;
    const srList = st.service_resources || [];
    const buf = st.buffer_minutes ?? 0;
    const start = buildDateTime(a.date, a.time);
    const startMs = start.toMillis();
    const endMs = start.plus({ minutes: (a.duration_minutes ?? DEFAULT_DURATION_MINUTES) + buf }).toMillis();
    for (const sr of srList) {
      if (!recipeResourceIds.has(sr.resource_id)) continue;
      if (!consumersByDate.has(a.date)) consumersByDate.set(a.date, new Map());
      const m = consumersByDate.get(a.date)!;
      if (!m.has(sr.resource_id)) m.set(sr.resource_id, []);
      m.get(sr.resource_id)!.push({ startMs, endMs, qty: sr.quantity_required });
    }
  }

  // Ensamblar VisitDayState por fecha (mismo armado que loadVisitDayState).
  const result = new Map<string, VisitDayState>();
  for (const date of dates) {
    const dow = DateTime.fromISO(date).weekday % 7;

    const windowsByDoctor = new Map<string, MsWindow[]>();
    for (const docId of doctorIds) {
      const wins = (schedByDoctorDow.get(docId)?.get(dow) ?? []).map((s) => ({
        startMs: buildDateTime(date, s.start_time).toMillis(),
        endMs: buildDateTime(date, s.end_time).toMillis(),
      }));
      windowsByDoctor.set(docId, wins);
    }

    const occForDate = occByDateDoctor.get(date) ?? new Map<string, OccupiedInterval[]>();
    const occupiedByDoctor = new Map<string, OccupiedInterval[]>();
    for (const docId of doctorIds) {
      const cowork = coworkByDoctor.get(docId) ?? [docId];
      const merged: OccupiedInterval[] = [];
      for (const cw of cowork) {
        const arr = occForDate.get(cw);
        if (arr) merged.push(...arr);
      }
      occupiedByDoctor.set(docId, merged);
    }

    const consumersByResource = consumersByDate.get(date) ?? new Map<string, ResourceConsumer[]>();
    result.set(date, { date, windowsByDoctor, occupiedByDoctor, consumersByResource, serviceMeta });
  }

  return result;
}

// ----------------------------------------------------------------------------
// Resolucion de contexto de visita (servicios + profesionales calificados).
// COMPARTIDA por get-visit-slots y get-visit-days: ambas DEBEN resolver los mismos
// profesionales por servicio o el strip diria "disponible" donde los slots dicen
// "sin profesional". Extraida verbatim de get-visit-slots (sin cambiar la logica).
// ----------------------------------------------------------------------------

export interface ResolvedProcedure {
  serviceTypeId: string;
  durationMinutes: number;
  qualified: string[]; // doctor ids, ordenados por nombre (determinista)
}

export interface VisitDoctorDictEntry {
  name: string;
  prefix: string | null;
  label: string;
  isTecnica: boolean;
}

export interface VisitContext {
  /** Error fatal (servicio inexistente / de otra org). El EF responde con status. */
  fatal?: { status: number; error: string };
  /** Un servicio sin profesionales calificados → resultado vacio con esta razon. */
  emptyReason?: string;
  procResolved: ResolvedProcedure[];
  distinctSvcIds: string[];
  svcById: Map<string, any>;
  allDoctorIds: string[];
  doctorsDict: Record<string, VisitDoctorDictEntry>;
}

export async function resolveVisitContext(
  supabase: SupabaseClient,
  organizationId: string,
  procedures: Array<{ serviceTypeId: string; durationMinutes?: number }>,
): Promise<VisitContext> {
  const empty: VisitContext = {
    procResolved: [], distinctSvcIds: [], svcById: new Map(), allDoctorIds: [], doctorsDict: {},
  };

  // Las 3 queries (servicios, profesionales del org, skill matrix) filtran por
  // inputs del request — no por el resultado de servicios — → en paralelo. Los
  // chequeos de error se replican en el MISMO orden que el camino serial
  // (svcErr → org-check → docErr) para producir identico fatal/emptyReason.
  // Unico efecto: en paths de error (raros) se hace trabajo DB extra, sin cambiar el output.
  const distinctSvcIds = [...new Set(procedures.map((p) => p.serviceTypeId))];
  const [svcRes, docRes, skillRes] = await Promise.all([
    supabase
      .from("service_types")
      .select("id, display_name, duration_minutes, organization_id")
      .in("id", distinctSvcIds),
    supabase
      .from("doctors")
      .select("id, name, prefix, user_id")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("professional_services")
      .select("doctor_id, service_type_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .in("service_type_id", distinctSvcIds),
  ]);

  // 1) Servicios + duracion (request o service_types).
  if (svcRes.error) return { ...empty, fatal: { status: 500, error: "Error cargando servicios" } };
  const svcById = new Map((svcRes.data ?? []).map((s: any) => [s.id, s]));
  for (const id of distinctSvcIds) {
    const s = svcById.get(id);
    if (!s || s.organization_id !== organizationId) {
      return { ...empty, fatal: { status: 400, error: "Un servicio no pertenece a esta organizacion" } };
    }
  }

  // 2) Profesionales del org + skill matrix (fallback a todos si el servicio no tiene skills).
  if (docRes.error) return { ...empty, fatal: { status: 500, error: "Error cargando profesionales" } };
  const allDoctors = (docRes.data ?? []) as Array<any>;
  const docInfo = new Map(allDoctors.map((d) => [d.id, d]));

  const skillRows = skillRes.data;
  const skilledBySvc = new Map<string, string[]>();
  for (const s of skillRows ?? []) {
    const r = s as any;
    if (!skilledBySvc.has(r.service_type_id)) skilledBySvc.set(r.service_type_id, []);
    skilledBySvc.get(r.service_type_id)!.push(r.doctor_id);
  }
  const qualifiedBySvc = new Map<string, string[]>();
  for (const id of distinctSvcIds) {
    const skilled = skilledBySvc.get(id);
    const ids = (skilled && skilled.length > 0)
      ? allDoctors.filter((d) => skilled.includes(d.id)).map((d) => d.id)
      : allDoctors.map((d) => d.id);
    qualifiedBySvc.set(id, ids);
  }

  const procResolved: ResolvedProcedure[] = procedures.map((p) => ({
    serviceTypeId: p.serviceTypeId,
    durationMinutes: p.durationMinutes ?? (svcById.get(p.serviceTypeId)?.duration_minutes ?? 30),
    qualified: qualifiedBySvc.get(p.serviceTypeId) ?? [],
  }));
  for (const p of procResolved) {
    if (p.qualified.length === 0) {
      const name = svcById.get(p.serviceTypeId)?.display_name ?? "un servicio";
      return { ...empty, distinctSvcIds, svcById, emptyReason: `No hay profesionales que ofrezcan "${name}".` };
    }
  }

  const allDoctorIds = [...new Set(procResolved.flatMap((p) => p.qualified))];
  const doctorsDict: Record<string, VisitDoctorDictEntry> = {};
  for (const id of allDoctorIds) {
    const d = docInfo.get(id);
    if (!d) continue;
    doctorsDict[id] = {
      name: d.name,
      prefix: d.prefix ?? null,
      label: `${d.prefix ?? ""} ${d.name}`.trim(),
      isTecnica: !d.user_id,
    };
  }

  return { procResolved, distinctSvcIds, svcById, allDoctorIds, doctorsDict };
}
