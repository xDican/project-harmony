import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  doctorId: string;
  date: string;
}

Deno.serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Leer JWT del usuario desde el header Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[get-available-slots] Missing Authorization header");

      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Crear cliente de Supabase usando variables de entorno (no hardcodear claves)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[get-available-slots] Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Supabase env vars not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // 3) Parsear body
    const body: RequestBody = await req.json();
    const { doctorId, date } = body;

    console.log("[get-available-slots] Request:", { doctorId, date });

    if (!doctorId || !date) {
      console.error("[get-available-slots] Missing required fields");
      return new Response(JSON.stringify({ error: "doctorId and date are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Obtener día de la semana (0 = Domingo, 6 = Sábado)
    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay();

    console.log("[get-available-slots] Day of week:", dayOfWeek);

    // 5) Obtener horarios del doctor para ese día
    const { data: schedules, error: scheduleError } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("day_of_week", dayOfWeek);

    if (scheduleError) {
      console.error("[get-available-slots] Error fetching schedules:", scheduleError);
      return new Response(JSON.stringify({ error: "Error fetching doctor schedule" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[get-available-slots] Schedules found:", schedules);

    if (!schedules || schedules.length === 0) {
      console.log("[get-available-slots] No schedule found for this day");
      return new Response(JSON.stringify({ slots: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Obtener citas existentes para ese doctor/fecha (excluyendo canceladas)
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("time")
      .eq("doctor_id", doctorId)
      .eq("date", date)
      .neq("status", "cancelled");

    if (appointmentsError) {
      console.error("[get-available-slots] Error fetching appointments:", appointmentsError);
      return new Response(JSON.stringify({ error: "Error fetching appointments" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[get-available-slots] Existing appointments:", appointments);

    // 7) Construir set de horarios ocupados
    const occupiedTimes = new Set(appointments?.map((apt) => apt.time) || []);

    // 8) Generar todos los slots posibles
    const allSlots: string[] = [];

    for (const schedule of schedules) {
      const startTime = schedule.start_time;
      const endTime = schedule.end_time;
      const slotDuration = 30; // en minutos

      // Parsear HH:MM:SS o HH:MM
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);

      let currentMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const timeSlot = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

        // Agregar solo si no está ocupado (soportando HH:MM y HH:MM:SS en DB)
        if (!occupiedTimes.has(timeSlot) && !occupiedTimes.has(timeSlot + ":00")) {
          allSlots.push(timeSlot);
        }

        currentMinutes += slotDuration;
      }
    }

    console.log("[get-available-slots] Available slots:", allSlots);

    return new Response(JSON.stringify({ slots: allSlots }), {
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
