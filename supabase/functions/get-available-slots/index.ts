import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod schema for request validation
const RequestSchema = z.object({
  doctorId: z.string().uuid("doctorId debe ser un UUID válido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date debe estar en formato YYYY-MM-DD"),
  durationMinutes: z.number().int().min(15).max(480).optional().default(60),
  calendarId: z.string().uuid("calendarId debe ser un UUID válido").optional(),
});

const DEFAULT_DURATION_MINUTES = 60;
const SLOT_GRANULARITY_MINUTES = 30;

/**
 * Construye un DateTime de Luxon combinando una fecha y una hora
 * @param date - Fecha en formato "YYYY-MM-DD"
 * @param time - Hora en formato "HH:MM" o "HH:MM:SS"
 * @returns DateTime de Luxon
 */
function buildDateTime(date: string, time: string): DateTime {
  // Normalizar tiempo a HH:MM
  const normalizedTime = time.substring(0, 5);
  return DateTime.fromISO(`${date}T${normalizedTime}:00`);
}

/**
 * Formatea un DateTime a string "HH:MM"
 */
function formatToHHMM(dt: DateTime): string {
  return dt.toFormat("HH:mm");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[get-available-slots] Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[get-available-slots] Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Supabase env vars not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Create Supabase client with user's JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 4) Parse and validate request body with Zod
    const rawBody = await req.json();
    const validationResult = RequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      console.error("[get-available-slots] Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Datos de entrada inválidos",
          details: validationResult.error.errors
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { doctorId, date, durationMinutes, calendarId } = validationResult.data;
    console.log("[get-available-slots] Request:", { doctorId, date, durationMinutes, calendarId });

    // 5) Verify doctor exists
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id")
      .eq("id", doctorId)
      .maybeSingle();

    if (doctorError || !doctor) {
      console.error("[get-available-slots] Doctor not found:", doctorError);
      return new Response(JSON.stringify({ error: "Doctor no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Calculate day of week using Luxon
    const requestedDate = DateTime.fromISO(date);
    const dayOfWeek = requestedDate.weekday % 7; // Luxon: 1=Monday...7=Sunday -> convert to 0=Sunday...6=Saturday

    // 7) Fetch doctor's schedules for that day (primary source: doctor_schedules)
    let scheduleQuery = supabase
      .from("doctor_schedules")
      .select("start_time, end_time")
      .eq("doctor_id", doctorId)
      .eq("day_of_week", dayOfWeek);

    if (calendarId) {
      scheduleQuery = scheduleQuery.eq("calendar_id", calendarId);
    }

    const { data: schedules, error: scheduleError } = await scheduleQuery;

    if (scheduleError) {
      console.error("[get-available-slots] Error fetching schedules:", scheduleError);
      return new Response(JSON.stringify({ error: "Error al obtener horarios del doctor" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!schedules || schedules.length === 0) {
      console.log("[get-available-slots] No schedules found for day:", dayOfWeek);
      return new Response(JSON.stringify({ slots: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7b) SHADOW: also fetch from calendar_schedules for comparison (non-blocking)
    let shadowSchedules: Array<{ start_time: string; end_time: string }> | null = null;
    try {
      let resolvedCalendarId = calendarId;
      if (!resolvedCalendarId) {
        const { data: cdRow } = await supabase
          .from("calendar_doctors")
          .select("calendar_id")
          .eq("doctor_id", doctorId)
          .eq("is_active", true)
          .maybeSingle();
        resolvedCalendarId = cdRow?.calendar_id ?? undefined;
      }
      if (resolvedCalendarId) {
        const { data: calSchedules, error: calScheduleError } = await supabase
          .from("calendar_schedules")
          .select("start_time, end_time")
          .eq("calendar_id", resolvedCalendarId)
          .eq("day_of_week", dayOfWeek);
        if (calScheduleError) {
          console.warn("[get-available-slots][shadow] Error fetching calendar_schedules:", calScheduleError);
        } else {
          shadowSchedules = calSchedules ?? [];
        }
      } else {
        console.warn("[get-available-slots][shadow] No calendarId resolved for doctor:", doctorId);
      }
    } catch (shadowErr) {
      console.warn("[get-available-slots][shadow] Unexpected error:", shadowErr);
    }

    // 8) Fetch existing appointments (exclude cancelled)
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("time, duration_minutes")
      .eq("doctor_id", doctorId)
      .eq("date", date)
      .not("status", "in", '("cancelled","canceled","cancelada")');

    if (appointmentsError) {
      console.error("[get-available-slots] Error fetching appointments:", appointmentsError);
      return new Response(JSON.stringify({ error: "Error al obtener citas existentes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 9) Build occupied intervals as milliseconds for reliable comparison
    const occupiedIntervals = (appointments || []).map((apt: { time: string; duration_minutes: number | null }) => {
      const appointmentStart = buildDateTime(date, apt.time);
      const appointmentDuration = apt.duration_minutes ?? DEFAULT_DURATION_MINUTES;
      const appointmentEnd = appointmentStart.plus({ minutes: appointmentDuration });
      return {
        startMs: appointmentStart.toMillis(),
        endMs: appointmentEnd.toMillis(),
        // For debugging
        startTime: formatToHHMM(appointmentStart),
        endTime: formatToHHMM(appointmentEnd),
        duration: appointmentDuration
      };
    });

    console.log("[get-available-slots] Occupied intervals:", JSON.stringify(occupiedIntervals));

    // 10) Generate available slots using Luxon
    const availableSlots: string[] = [];

    for (const schedule of schedules) {
      const workStart = buildDateTime(date, schedule.start_time);
      const workEnd = buildDateTime(date, schedule.end_time);
      const workEndMs = workEnd.toMillis();

      console.log("[get-available-slots] Schedule:", formatToHHMM(workStart), "to", formatToHHMM(workEnd));

      // Generate candidate slots every SLOT_GRANULARITY_MINUTES
      let slotStart = workStart;

      while (slotStart.plus({ minutes: durationMinutes }).toMillis() <= workEndMs) {
        const slotStartMs = slotStart.toMillis();
        const slotEndMs = slotStart.plus({ minutes: durationMinutes }).toMillis();

        // Check for overlap with any occupied appointment
        // Overlap condition: slotStart < appointmentEnd AND appointmentStart < slotEnd
        const hasOverlap = occupiedIntervals.some(({ startMs: aptStartMs, endMs: aptEndMs }) => {
          return slotStartMs < aptEndMs && aptStartMs < slotEndMs;
        });

        if (!hasOverlap) {
          availableSlots.push(formatToHHMM(slotStart));
        }

        // Move to next candidate slot
        slotStart = slotStart.plus({ minutes: SLOT_GRANULARITY_MINUTES });
      }
    }

    // 11) Sort and deduplicate
    const uniqueSorted = Array.from(new Set(availableSlots)).sort((a, b) => a.localeCompare(b));

    console.log("[get-available-slots] Available slots:", uniqueSorted.length);

    // 11b) SHADOW: compute slots from calendar_schedules and compare
    if (shadowSchedules !== null) {
      try {
        const shadowSlots: string[] = [];
        for (const schedule of shadowSchedules) {
          const workStart = buildDateTime(date, schedule.start_time);
          const workEnd = buildDateTime(date, schedule.end_time);
          const workEndMs = workEnd.toMillis();
          let slotStart = workStart;
          while (slotStart.plus({ minutes: durationMinutes }).toMillis() <= workEndMs) {
            const slotStartMs = slotStart.toMillis();
            const slotEndMs = slotStart.plus({ minutes: durationMinutes }).toMillis();
            const hasOverlap = occupiedIntervals.some(({ startMs: aptStartMs, endMs: aptEndMs }) => {
              return slotStartMs < aptEndMs && aptStartMs < slotEndMs;
            });
            if (!hasOverlap) {
              shadowSlots.push(formatToHHMM(slotStart));
            }
            slotStart = slotStart.plus({ minutes: SLOT_GRANULARITY_MINUTES });
          }
        }
        const shadowSorted = Array.from(new Set(shadowSlots)).sort((a, b) => a.localeCompare(b));
        if (JSON.stringify(uniqueSorted) !== JSON.stringify(shadowSorted)) {
          console.warn("[get-available-slots][shadow-diff] MISMATCH", {
            doctorId, date, dayOfWeek,
            primary: uniqueSorted,
            shadow: shadowSorted,
          });
        } else {
          console.log("[get-available-slots][shadow] OK - sources match", { doctorId, date, count: uniqueSorted.length });
        }
      } catch (shadowCompErr) {
        console.warn("[get-available-slots][shadow] Error computing shadow slots:", shadowCompErr);
      }
    }

    return new Response(JSON.stringify({ slots: uniqueSorted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[get-available-slots] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
