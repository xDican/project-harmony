import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAppointmentRequest {
  doctorId: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM o HH:MM:SS
  notes?: string;
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Leer JWT del usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[create-appointment] Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Supabase client usando env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[create-appointment] Missing Supabase env vars");
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

    // 3) Leer body
    const body: CreateAppointmentRequest = await req.json();
    const { doctorId, patientId, date, time, notes } = body;

    console.log("[create-appointment] Request body:", body);

    // Validar campos mínimos
    if (!doctorId || !patientId || !date || !time) {
      console.error("[create-appointment] Missing required fields");
      return new Response(
        JSON.stringify({
          error: "doctorId, patientId, date y time son requeridos",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4) Normalizar hora a HH:MM:SS
    let normalizedTime = time;
    if (/^\d{2}:\d{2}$/.test(time)) {
      normalizedTime = `${time}:00`; // de HH:MM -> HH:MM:SS
    }

    // 5) Construir appointment_at (date + time)
    // Si tu columna es timestamptz, puedes enviar la ISO completa:
    // const appointmentAt = new Date(`${date}T${normalizedTime}`).toISOString();
    // Si tu columna es timestamp sin zona horaria, mejor enviar string simple:
    const appointmentAt = `${date}T${normalizedTime}`;

    console.log("[create-appointment] appointment_at:", appointmentAt);

    // 6) Validar que no exista cita en ese mismo slot (doctor + date + time)
    const { data: existingAppointments, error: existingError } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", doctorId)
      .eq("date", date)
      .eq("time", normalizedTime)
      .neq("status", "cancelled");

    if (existingError) {
      console.error("[create-appointment] Error checking existing appointments:", existingError);
      return new Response(
        JSON.stringify({
          error: "Error al verificar citas existentes",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (existingAppointments && existingAppointments.length > 0) {
      console.warn("[create-appointment] Slot already occupied for doctor/date/time");
      return new Response(
        JSON.stringify({
          error: "El horario seleccionado ya está ocupado",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 7) Insertar cita (incluyendo appointment_at)
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        doctor_id: doctorId,
        patient_id: patientId,
        date,
        time: normalizedTime,
        notes: notes || null,
        status: "scheduled", // o el default que uses
        appointment_at: appointmentAt, // 👈 AQUÍ SE ENVÍA date+time
      })
      .select()
      .single();

    if (insertError) {
      console.error("[create-appointment] Error inserting appointment:", insertError);
      return new Response(JSON.stringify({ error: "Error al crear la cita" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[create-appointment] Appointment created successfully:", appointment);

    return new Response(JSON.stringify({ success: true, appointment }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[create-appointment] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
