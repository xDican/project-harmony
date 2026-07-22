import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";
import {
  enumerateSlots,
  loadSchedulesAllDows,
  loadCoworkDoctorIds,
  loadScheduleExceptions,
} from "../_shared/availability.ts";

const BUILD = "get-available-days-v1.3.0_par1";
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

    // 6) Horarios: delega a _shared/availability.ts (loadSchedulesAllDows) — misma
    // logica (calendar_schedules primero, fallback doctor_schedules) que antes vivia
    // duplicada aqui. Fase 2 del bloqueador de horario: esta era la 4ta copia del
    // motor que no delegaba (ver plan de la sesion).
    let allSchedules: ScheduleRow[] = [];
    try {
      allSchedules = (await loadSchedulesAllDows(supabase, doctorId, calendarId)) as ScheduleRow[];
    } catch (error) {
      console.error("[get-available-days] Error fetching schedules:", error);
      return json(500, {
        ok: false,
        error: "Error al obtener horarios del doctor",
        details: error instanceof Error ? error.message : String(error),
        build: BUILD,
      });
    }

    // Create schedule map: day_of_week -> ScheduleRow[] (supports multi-calendar)
    const scheduleMap = new Map<number, ScheduleRow[]>();
    for (const schedule of allSchedules) {
      if (!scheduleMap.has(schedule.day_of_week)) {
        scheduleMap.set(schedule.day_of_week, []);
      }
      scheduleMap.get(schedule.day_of_week)!.push(schedule);
    }

    if (debug) {
      console.log(
        "[get-available-days] Schedules loaded:",
        allSchedules.length
      );
    }

    // 7) Co-working — delega a _shared/availability.ts (loadCoworkDoctorIds),
    // misma logica (todos los doctores activos del/los calendario(s) relevante(s)).
    const appointmentDoctorIds = await loadCoworkDoctorIds(supabase, doctorId, calendarId);

    if (debug) {
      console.log("[get-available-days] Co-work doctor IDs:", appointmentDoctorIds.length);
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("date, time, duration_minutes, status")
      .in("doctor_id", appointmentDoctorIds)
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

    // 8b) Bloqueos personales del doctor (fase 2 del bloqueador de horario) —
    // se cargan una vez para todo el mes, igual que loadVisitRangeState. Son
    // personales: SOLO del doctorId pedido, nunca de los co-workers.
    const lastDayOfMonthInclusive = monthEnd.minus({ days: 1 }).toFormat("yyyy-MM-dd");
    const scheduleExceptionsByDoctor = await loadScheduleExceptions(
      supabase,
      [doctorId],
      monthStartDate,
      lastDayOfMonthInclusive,
    );
    const doctorScheduleExceptions = scheduleExceptionsByDoctor.get(doctorId) ?? [];

    // 9) Procesar cada día del mes — canFit via el motor unico (enumerateSlots).
    // Mata la divergencia: "hay dia disponible" = "hay un slot ofrecible" (mismo
    // algoritmo que el hour-view), no el viejo gap-based. Datos ya batcheados →
    // enumeracion en memoria por dia, sin queries extra.
    const slotGranularity = Math.min(durationMinutes, 30);
    const daysInMonth = getDaysInMonth(year, monthNum, timezone);
    const results: DayResult[] = [];

    for (const { date, dow } of daysInMonth) {
      const daySchedules = scheduleMap.get(dow);

      if (!daySchedules || daySchedules.length === 0) {
        results.push({ date, dow, working: false, canFit: false });
        if (debug) console.log(`[get-available-days] ${date} (dow=${dow}): No schedule`);
        continue;
      }

      // Intervalos ocupados NAIVE (sin zona) para ser consistente con enumerateSlots.
      // Incluye citas del dia + bloqueos personales del doctor (sin filtrar por
      // fecha — el overlap check es puramente por ms, un bloqueo que no toca este
      // dia simplemente nunca solapa un slot de este dia).
      const dayAppointments = appointmentsByDate.get(date) || [];
      const occupiedIntervals = [
        ...dayAppointments.map((apt) => {
          const aptStart = DateTime.fromISO(`${apt.date}T${apt.time.substring(0, 5)}:00`);
          const aptEnd = aptStart.plus({ minutes: apt.duration_minutes ?? 60 });
          return { startMs: aptStart.toMillis(), endMs: aptEnd.toMillis() };
        }),
        ...doctorScheduleExceptions,
      ];

      const slots = enumerateSlots(
        date,
        daySchedules.map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
        occupiedIntervals,
        durationMinutes,
        slotGranularity,
      );
      const canFit = slots.length > 0;

      results.push({ date, dow, working: true, canFit });

      if (debug) {
        const schedSummary = daySchedules.map((s) => `${s.start_time}-${s.end_time}`).join(", ");
        console.log(
          `[get-available-days] ${date} (dow=${dow}): schedules=[${schedSummary}], ` +
            `appointments=${dayAppointments.length}, slots=${slots.length}, canFit=${canFit}`
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
