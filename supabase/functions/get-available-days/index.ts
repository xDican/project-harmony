import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

const BUILD = "get-available-days-v1.2.0";
const DEFAULT_TIMEZONE = "America/Tegucigalpa";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Statuses que NO consideramos como ocupados (igual que get-available-slots)
const CANCELLED_STATUSES = ["cancelled", "canceled", "cancelada"];

// Zod schema for request validation
const RequestSchema = z.object({
  doctorId: z.string().uuid("doctorId debe ser un UUID válido"),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "month debe estar en formato YYYY-MM"),
  durationMinutes: z.number().int().min(1).max(480),
  timezone: z.string().optional().default(DEFAULT_TIMEZONE),
  debug: z.boolean().optional().default(true),
  calendarId: z.string().uuid("calendarId debe ser un UUID válido").optional(),
});

type ValidatedRequest = z.infer<typeof RequestSchema>;

interface DayResult {
  date: string;
  dow: number;
  working: boolean;
  canFit: boolean;
}

interface ScheduleRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AppointmentRow {
  date: string;
  time: string;
  duration_minutes: number;
  status: string;
}

interface Interval {
  startMs: number;
  endMs: number;
}

/**
 * Helper para respuestas JSON con CORS
 */
function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Parsea time string "HH:MM" o "HH:MM:SS" a minutos desde medianoche
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.substring(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/**
 * Merge overlapping intervals (already sorted by startMs)
 */
function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  const merged: Interval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];

    if (curr.startMs <= last.endMs) {
      // Overlap or adjacent, merge
      last.endMs = Math.max(last.endMs, curr.endMs);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

/**
 * Calcula los gaps (huecos libres) entre intervalos ocupados dentro de un rango de trabajo
 * @returns Array de gaps con duración en minutos
 */
function calculateGaps(
  workStartMs: number,
  workEndMs: number,
  occupiedIntervals: Interval[]
): { startMs: number; endMs: number; durationMinutes: number }[] {
  const gaps: { startMs: number; endMs: number; durationMinutes: number }[] =
    [];

  // Recortar intervalos al rango de trabajo
  const clipped: Interval[] = occupiedIntervals
    .map((interval) => ({
      startMs: Math.max(interval.startMs, workStartMs),
      endMs: Math.min(interval.endMs, workEndMs),
    }))
    .filter((interval) => interval.startMs < interval.endMs);

  // Merge overlaps
  const merged = mergeIntervals(clipped);

  // Calcular gaps
  let cursor = workStartMs;

  for (const interval of merged) {
    if (cursor < interval.startMs) {
      const gapDuration = (interval.startMs - cursor) / 60000; // ms to minutes
      gaps.push({
        startMs: cursor,
        endMs: interval.startMs,
        durationMinutes: gapDuration,
      });
    }
    cursor = Math.max(cursor, interval.endMs);
  }

  // Gap final después del último intervalo ocupado
  if (cursor < workEndMs) {
    const gapDuration = (workEndMs - cursor) / 60000;
    gaps.push({
      startMs: cursor,
      endMs: workEndMs,
      durationMinutes: gapDuration,
    });
  }

  return gaps;
}

/**
 * Obtiene todos los días del mes como array de {date, dow}
 */
function getDaysInMonth(
  year: number,
  month: number,
  timezone: string
): { date: string; dow: number; dt: DateTime }[] {
  const days: { date: string; dow: number; dt: DateTime }[] = [];

  // Primer día del mes en la timezone especificada
  let current = DateTime.fromObject({ year, month, day: 1 }, { zone: timezone });
  const targetMonth = current.month;

  while (current.month === targetMonth) {
    // Luxon weekday: 1=Monday...7=Sunday -> convertir a 0=Sunday...6=Saturday
    const dow = current.weekday % 7;
    days.push({
      date: current.toFormat("yyyy-MM-dd"),
      dow,
      dt: current,
    });
    current = current.plus({ days: 1 });
  }

  return days;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Environment variables - usando service role para bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[get-available-days] Missing Supabase env vars");
      return json(500, {
        ok: false,
        error: "Supabase env vars not configured",
        build: BUILD,
      });
    }

    // 2) Parse request - soportar GET (query params) y POST (JSON body)
    let rawInput: Record<string, unknown>;

    if (req.method === "GET") {
      const url = new URL(req.url);
      rawInput = {
        doctorId: url.searchParams.get("doctorId") ?? undefined,
        month: url.searchParams.get("month") ?? undefined,
        durationMinutes: url.searchParams.get("durationMinutes")
          ? parseInt(url.searchParams.get("durationMinutes")!, 10)
          : undefined,
        timezone:
          url.searchParams.get("timezone") ?? undefined,
        debug: url.searchParams.get("debug") === "true",
      };
    } else {
      // POST
      rawInput = await req.json();
    }

    // 3) Validate with Zod
    const validationResult = RequestSchema.safeParse(rawInput);

    if (!validationResult.success) {
      console.error(
        "[get-available-days] Validation error:",
        validationResult.error.errors
      );
      return json(400, {
        ok: false,
        error: "Datos de entrada inválidos",
        details: validationResult.error.errors,
        build: BUILD,
      });
    }

    const { doctorId, month, durationMinutes, timezone, debug, calendarId } =
      validationResult.data as ValidatedRequest & { calendarId?: string };

    console.log("[get-available-days] Request:", {
      doctorId,
      month,
      durationMinutes,
      timezone,
      debug,
    });

    // 4) Create Supabase client con service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 5) Parse month para obtener año y mes
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    // Calcular límites del mes en la timezone especificada
    const monthStart = DateTime.fromObject(
      { year, month: monthNum, day: 1, hour: 0, minute: 0, second: 0 },
      { zone: timezone }
    );
    const monthEnd = monthStart.plus({ months: 1 });

    // Calcular límites del mes como fechas YYYY-MM-DD (para filtrar por campo date)
    const monthStartDate = monthStart.toFormat("yyyy-MM-dd");
    const monthEndDate = monthEnd.toFormat("yyyy-MM-dd");

    if (debug) {
      console.log("[get-available-days] Month bounds:", {
        monthStartDate,
        monthEndDate,
        timezone,
      });
    }

    // 6) Query A: Obtener schedules del doctor (max 7 filas, optionally filtered by calendar)
    let scheduleQuery = supabase
      .from("doctor_schedules")
      .select("day_of_week, start_time, end_time")
      .eq("doctor_id", doctorId);

    if (calendarId) {
      scheduleQuery = scheduleQuery.eq("calendar_id", calendarId);
    }

    const { data: schedules, error: scheduleError } = await scheduleQuery;

    if (scheduleError) {
      console.error(
        "[get-available-days] Error fetching schedules:",
        scheduleError
      );
      return json(500, {
        ok: false,
        error: "Error al obtener horarios del doctor",
        details: scheduleError.message,
        build: BUILD,
      });
    }

    // Crear mapa de schedules por día de la semana
    const scheduleMap = new Map<number, ScheduleRow>();
    for (const schedule of schedules || []) {
      scheduleMap.set(schedule.day_of_week, schedule as ScheduleRow);
    }

    if (debug) {
      console.log(
        "[get-available-days] Schedules loaded:",
        schedules?.length ?? 0
      );
    }

    // 7) Query B: Obtener citas del doctor en el mes completo
    // Usamos el campo `date` igual que get-available-slots (más confiable que appointment_at)
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("date, time, duration_minutes, status")
      .eq("doctor_id", doctorId)
      .gte("date", monthStartDate)
      .lt("date", monthEndDate)
      .not("status", "in", `(${CANCELLED_STATUSES.map(s => `"${s}"`).join(",")})`);

    if (appointmentsError) {
      console.error(
        "[get-available-days] Error fetching appointments:",
        appointmentsError
      );
      return json(500, {
        ok: false,
        error: "Error al obtener citas del doctor",
        details: appointmentsError.message,
        build: BUILD,
      });
    }

    if (debug) {
      console.log(
        "[get-available-days] Appointments loaded:",
        appointments?.length ?? 0
      );
      // Log cada cita para debug
      for (const apt of appointments || []) {
        console.log(
          `[get-available-days] Appointment: date=${apt.date}, time=${apt.time}, ` +
          `status=${apt.status}, duration=${apt.duration_minutes}`
        );
      }
    }

    // 8) Agrupar citas por fecha (usando el campo date directamente)
    const appointmentsByDate = new Map<string, AppointmentRow[]>();

    for (const apt of appointments || []) {
      const dateKey = apt.date; // Usar el campo date directamente

      if (!appointmentsByDate.has(dateKey)) {
        appointmentsByDate.set(dateKey, []);
      }
      appointmentsByDate.get(dateKey)!.push(apt as AppointmentRow);
    }

    // 9) Procesar cada día del mes
    const daysInMonth = getDaysInMonth(year, monthNum, timezone);
    const results: DayResult[] = [];

    for (const { date, dow, dt } of daysInMonth) {
      const schedule = scheduleMap.get(dow);

      // Verificar si es día de trabajo
      if (!schedule) {
        results.push({ date, dow, working: false, canFit: false });
        if (debug) {
          console.log(`[get-available-days] ${date} (dow=${dow}): No schedule`);
        }
        continue;
      }

      // Verificar horario válido (start_time < end_time)
      const startMinutes = timeToMinutes(schedule.start_time);
      const endMinutes = timeToMinutes(schedule.end_time);

      if (startMinutes >= endMinutes) {
        results.push({ date, dow, working: false, canFit: false });
        if (debug) {
          console.log(
            `[get-available-days] ${date} (dow=${dow}): Invalid schedule (start >= end)`
          );
        }
        continue;
      }

      // Es día de trabajo
      const working = true;

      // Construir workStart y workEnd como DateTime
      const workStart = dt.set({
        hour: Math.floor(startMinutes / 60),
        minute: startMinutes % 60,
        second: 0,
        millisecond: 0,
      });
      const workEnd = dt.set({
        hour: Math.floor(endMinutes / 60),
        minute: endMinutes % 60,
        second: 0,
        millisecond: 0,
      });

      const workStartMs = workStart.toMillis();
      const workEndMs = workEnd.toMillis();

      // Obtener citas de este día
      const dayAppointments = appointmentsByDate.get(date) || [];

      // Construir intervalos ocupados usando date + time (igual que get-available-slots)
      const occupiedIntervals: Interval[] = dayAppointments.map((apt) => {
        // Normalizar tiempo a HH:MM y combinar con la fecha
        const normalizedTime = apt.time.substring(0, 5);
        const aptStart = DateTime.fromISO(`${apt.date}T${normalizedTime}:00`, {
          zone: timezone,
        });
        const aptEnd = aptStart.plus({ minutes: apt.duration_minutes ?? 60 });
        return {
          startMs: aptStart.toMillis(),
          endMs: aptEnd.toMillis(),
        };
      });

      // Calcular gaps
      const gaps = calculateGaps(workStartMs, workEndMs, occupiedIntervals);

      // Verificar si algún gap puede acomodar la duración solicitada
      const canFit = gaps.some((gap) => gap.durationMinutes >= durationMinutes);

      results.push({ date, dow, working, canFit });

      if (debug) {
        console.log(
          `[get-available-days] ${date} (dow=${dow}): ` +
            `work=${schedule.start_time}-${schedule.end_time}, ` +
            `appointments=${dayAppointments.length}, ` +
            `gaps=${gaps.length} (${gaps.map((g) => Math.floor(g.durationMinutes) + "min").join(", ")}), ` +
            `canFit=${canFit}`
        );
      }
    }

    // 10) Respuesta exitosa
    console.log(
      `[get-available-days] Completed: ${results.length} days processed`
    );

    return json(200, {
      ok: true,
      doctorId,
      month,
      durationMinutes,
      timezone,
      days: results,
      build: BUILD,
    });
  } catch (error) {
    console.error("[get-available-days] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return json(500, {
      ok: false,
      error: "Internal server error",
      details: errorMessage,
      build: BUILD,
    });
  }
});
