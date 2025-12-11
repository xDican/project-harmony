import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod schema for request validation
const RequestSchema = z.object({
  doctorId: z.string().uuid("doctorId debe ser un UUID válido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date debe estar en formato YYYY-MM-DD"),
  durationMinutes: z.number().int().min(15).max(480).optional().default(60),
});

const DEFAULT_DURATION_MINUTES = 60; // Duración por defecto si no se especifica
const SLOT_GRANULARITY_MINUTES = 30; // Intervalo entre posibles inicios

function parseTimeToMinutes(timeStr: string): number {
  // Soporta HH:MM o HH:MM:SS
  const parts = timeStr.split(":").map(Number);
  const [h, m] = parts;
  return h * 60 + m;
}

function formatMinutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

    const { doctorId, date, durationMinutes } = validationResult.data;
    console.log("[get-available-slots] Request:", { doctorId, date, durationMinutes });

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

    // 6) Calculate day of week
    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay(); // 0 Domingo ... 6 Sábado

    // 7) Fetch doctor's schedules for that day
    const { data: schedules, error: scheduleError } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("day_of_week", dayOfWeek);

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

    // 8) Fetch existing appointments (exclude cancelled) - now including duration_minutes
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

    // 9) Build occupied intervals [start, end) - using each appointment's actual duration
    const occupiedIntervals = (appointments || []).map((apt: { time: string; duration_minutes: number | null }) => {
      const startMinutes = parseTimeToMinutes(apt.time);
      const appointmentDuration = apt.duration_minutes ?? DEFAULT_DURATION_MINUTES;
      return {
        start: startMinutes,
        end: startMinutes + appointmentDuration,
      };
    });

    console.log("[get-available-slots] Occupied intervals:", occupiedIntervals.length);

    // 10) Generate available slots using the requested duration
    const availableSlots: string[] = [];

    for (const schedule of schedules) {
      const scheduleStart = parseTimeToMinutes(schedule.start_time);
      const scheduleEnd = parseTimeToMinutes(schedule.end_time);

      // Iterate through possible start times
      for (
        let candidateStart = scheduleStart;
        candidateStart + durationMinutes <= scheduleEnd; // Use requested duration to check if slot fits
        candidateStart += SLOT_GRANULARITY_MINUTES
      ) {
        const candidateEnd = candidateStart + durationMinutes; // Use requested duration for slot end

        // Check for overlap with occupied appointments
        // Overlap condition: slotStart < appointmentEnd AND appointmentStart < slotEnd
        const overlaps = occupiedIntervals.some(({ start, end }) => {
          return candidateStart < end && start < candidateEnd;
        });

        if (!overlaps) {
          availableSlots.push(formatMinutesToHHMM(candidateStart));
        }
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
