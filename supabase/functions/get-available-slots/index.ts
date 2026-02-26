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

    // 2) Environment variables - use service role to bypass RLS (co-work needs cross-doctor visibility)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[get-available-slots] Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Supabase env vars not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Create Supabase client with service role (verify_jwt at gateway handles auth)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // 7) Fetch schedules — primary: calendar_schedules, fallback: doctor_schedules
    let schedules: Array<{ start_time: string; end_time: string }> = [];

    if (calendarId) {
      // Specific calendar requested
      const { data, error } = await supabase
        .from("calendar_schedules")
        .select("start_time, end_time")
        .eq("calendar_id", calendarId)
        .eq("day_of_week", dayOfWeek);

      if (error) {
        console.error("[get-available-slots] Error fetching calendar_schedules:", error);
        return new Response(JSON.stringify({ error: "Error al obtener horarios del calendario" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      schedules = data || [];
    } else {
      // No calendarId — aggregate from all active calendars for this doctor
      const { data: calDoctors, error: cdError } = await supabase
        .from("calendar_doctors")
        .select("calendar_id")
        .eq("doctor_id", doctorId)
        .eq("is_active", true);

      if (cdError) {
        console.error("[get-available-slots] Error fetching calendar_doctors:", cdError);
      }

      if (calDoctors && calDoctors.length > 0) {
        const calendarIds = calDoctors.map((cd: any) => cd.calendar_id);
        const { data, error } = await supabase
          .from("calendar_schedules")
          .select("start_time, end_time")
          .in("calendar_id", calendarIds)
          .eq("day_of_week", dayOfWeek);

        if (error) {
          console.error("[get-available-slots] Error fetching calendar_schedules:", error);
        } else {
          schedules = data || [];
        }
      }
    }

    // Fallback to doctor_schedules if no calendar_schedules found
    if (schedules.length === 0) {
      console.log("[get-available-slots] No calendar_schedules, falling back to doctor_schedules");
      const { data, error: fallbackError } = await supabase
        .from("doctor_schedules")
        .select("start_time, end_time")
        .eq("doctor_id", doctorId)
        .eq("day_of_week", dayOfWeek);

      if (fallbackError) {
        console.error("[get-available-slots] Error fetching doctor_schedules:", fallbackError);
        return new Response(JSON.stringify({ error: "Error al obtener horarios del doctor" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      schedules = data || [];
    }

    if (schedules.length === 0) {
      console.log("[get-available-slots] No schedules found for day:", dayOfWeek);
      return new Response(JSON.stringify({ slots: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8) Fetch existing appointments — co-work: check ALL doctors on the same calendar(s)
    let appointmentDoctorIds: string[] = [doctorId];

    if (calendarId) {
      // Specific calendar: get all doctors on this calendar
      const { data: calDocRows } = await supabase
        .from("calendar_doctors")
        .select("doctor_id")
        .eq("calendar_id", calendarId)
        .eq("is_active", true);
      if (calDocRows && calDocRows.length > 0) {
        appointmentDoctorIds = [...new Set(calDocRows.map((r: any) => r.doctor_id))];
      }
    } else if (schedules.length > 0) {
      // No specific calendar — use all calendars the doctor belongs to
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
          appointmentDoctorIds = [...new Set(allCalDocs.map((r: any) => r.doctor_id))];
        }
      }
    }

    console.log("[get-available-slots] Co-work doctor IDs:", appointmentDoctorIds.length);

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("time, duration_minutes")
      .in("doctor_id", appointmentDoctorIds)
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

    // Derive slot granularity from duration: 15-min citas → 15-min slots, 30+ → 30-min slots
    const slotGranularity = Math.min(durationMinutes, 30);

    // Filter past slots for today
    const timezone = "America/Tegucigalpa";
    const now = DateTime.now().setZone(timezone);
    const isToday = date === now.toISODate();
    const nowHHMM = now.toFormat("HH:mm");

    for (const schedule of schedules) {
      const workStart = buildDateTime(date, schedule.start_time);
      const workEnd = buildDateTime(date, schedule.end_time);
      const workEndMs = workEnd.toMillis();

      console.log("[get-available-slots] Schedule:", formatToHHMM(workStart), "to", formatToHHMM(workEnd));

      // Generate candidate slots every slotGranularity minutes
      let slotStart = workStart;

      while (slotStart.plus({ minutes: durationMinutes }).toMillis() <= workEndMs) {
        // Skip slots that are in the past for today
        if (isToday && slotStart.toFormat("HH:mm") <= nowHHMM) {
          slotStart = slotStart.plus({ minutes: slotGranularity });
          continue;
        }

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
        slotStart = slotStart.plus({ minutes: slotGranularity });
      }
    }

    // 11) Sort and deduplicate
    const uniqueSorted = Array.from(new Set(availableSlots)).sort((a, b) => a.localeCompare(b));

    console.log("[get-available-slots] Available slots:", uniqueSorted.length);

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
