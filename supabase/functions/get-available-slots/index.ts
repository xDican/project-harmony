import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  doctorId: string;
  date: string;
}

const APPOINTMENT_DURATION_MINUTES = 60; // Duración fija de cada cita
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Supabase env vars not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body: RequestBody = await req.json();
    const { doctorId, date } = body;

    if (!doctorId || !date) {
      return new Response(JSON.stringify({ error: "doctorId and date are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay(); // 0 Domingo ... 6 Sábado

    // 1) Horarios del doctor para ese día
    const { data: schedules, error: scheduleError } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("day_of_week", dayOfWeek);

    if (scheduleError) {
      return new Response(JSON.stringify({ error: "Error fetching doctor schedule" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ slots: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Citas existentes (excluye canceladas)
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("time")
      .eq("doctor_id", doctorId)
      .eq("date", date)
      .not("status", "in", '("cancelled","canceled")'); // robustez por variantes

    if (appointmentsError) {
      return new Response(JSON.stringify({ error: "Error fetching appointments" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Construir intervalos ocupados [start, end)
    const occupiedIntervals = (appointments || []).map((apt) => {
      const startMinutes = parseTimeToMinutes(apt.time);
      return {
        start: startMinutes,
        end: startMinutes + APPOINTMENT_DURATION_MINUTES,
      };
    });

    // 4) Generar candidatos y filtrar por:
    //    - Que quepa dentro del bloque de horario
    //    - Que no solape un intervalo ocupado
    const availableSlots: string[] = [];

    for (const schedule of schedules) {
      const scheduleStart = parseTimeToMinutes(schedule.start_time);
      const scheduleEnd = parseTimeToMinutes(schedule.end_time);

      // Recorremos cada posible inicio
      for (
        let candidateStart = scheduleStart;
        candidateStart + APPOINTMENT_DURATION_MINUTES <= scheduleEnd;
        candidateStart += SLOT_GRANULARITY_MINUTES
      ) {
        const candidateEnd = candidateStart + APPOINTMENT_DURATION_MINUTES;

        // Verificar solape con cualquier cita ocupada
        const overlaps = occupiedIntervals.some(({ start, end }) => {
          return candidateStart < end && start < candidateEnd;
        });

        if (!overlaps) {
          availableSlots.push(formatMinutesToHHMM(candidateStart));
        }
      }
    }

    // Opcional: ordenar y eliminar duplicados (por si hay bloques que se solapen)
    const uniqueSorted = Array.from(new Set(availableSlots)).sort((a, b) => a.localeCompare(b));

    return new Response(JSON.stringify({ slots: uniqueSorted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
