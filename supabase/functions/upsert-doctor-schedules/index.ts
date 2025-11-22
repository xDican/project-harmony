import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Constantes de configuración
 */
const MAX_SLOTS_PER_DAY = 12; // Límite opcional de slots por día

/**
 * Tipo de un schedule para validación
 */
interface ScheduleItem {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

/**
 * Convierte tiempo "HH:MM" a minutos desde medianoche
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Valida que los horarios de un día no se solapen
 * @param schedules - Array de horarios para un día específico
 * @throws Error si hay solapamiento o tiempos inválidos
 */
function validateDaySchedules(schedules: ScheduleItem[]): void {
  // Validar que end_time > start_time para cada slot
  for (const schedule of schedules) {
    const startMinutes = timeToMinutes(schedule.start_time);
    const endMinutes = timeToMinutes(schedule.end_time);

    if (endMinutes <= startMinutes) {
      throw new Error(
        `Horario inválido: end_time (${schedule.end_time}) debe ser mayor que start_time (${schedule.start_time})`
      );
    }
  }

  // Validar que no haya solapamientos
  const sortedSchedules = [...schedules].sort((a, b) =>
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  for (let i = 0; i < sortedSchedules.length - 1; i++) {
    const current = sortedSchedules[i];
    const next = sortedSchedules[i + 1];

    const currentEnd = timeToMinutes(current.end_time);
    const nextStart = timeToMinutes(next.start_time);

    if (currentEnd > nextStart) {
      throw new Error(
        `Horarios solapados: ${current.start_time}-${current.end_time} con ${next.start_time}-${next.end_time}`
      );
    }
  }

  // Validar límite de slots por día (opcional)
  if (schedules.length > MAX_SLOTS_PER_DAY) {
    throw new Error(`Demasiados slots para un día. Máximo permitido: ${MAX_SLOTS_PER_DAY}`);
  }
}

/**
 * Edge Function principal para actualizar horarios de un doctor
 */
Deno.serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Autenticación: Verificar Authorization Bearer (JWT del usuario)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[upsert-doctor-schedules] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2) Obtener variables de entorno de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[upsert-doctor-schedules] Missing Supabase env vars");
      return new Response(
        JSON.stringify({ error: "Supabase env vars not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3) Crear cliente de Supabase con service role para operaciones administrativas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4) Verificar el JWT del usuario
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error("[upsert-doctor-schedules] Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Validar rol del usuario (admin o secretary)
    const { data: userData, error: roleError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || !userData) {
      console.error("[upsert-doctor-schedules] Role check failed:", roleError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Solo admin o secretary pueden actualizar horarios
    if (userData.role !== "admin" && userData.role !== "secretary") {
      console.error("[upsert-doctor-schedules] Insufficient permissions:", userData.role);
      return new Response(
        JSON.stringify({ error: "Solo administradores y secretarias pueden actualizar horarios" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6) Parsear body de la solicitud
    const body = await req.json();
    const { doctorId, schedules } = body;

    console.log("[upsert-doctor-schedules] Request:", { doctorId, schedules, userRole: userData.role });

    // 7) Validaciones básicas
    if (!doctorId) {
      return new Response(JSON.stringify({ error: "doctorId es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(schedules)) {
      return new Response(
        JSON.stringify({ error: "schedules debe ser un array" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 8) Validar que el doctor existe
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from("doctors")
      .select("id")
      .eq("id", doctorId)
      .single();

    if (doctorError || !doctor) {
      console.error("[upsert-doctor-schedules] Doctor not found:", doctorError);
      return new Response(JSON.stringify({ error: "Doctor no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 9) Validar cada schedule
    for (const schedule of schedules) {
      if (
        typeof schedule.day_of_week !== "number" ||
        schedule.day_of_week < 0 ||
        schedule.day_of_week > 6
      ) {
        return new Response(
          JSON.stringify({
            error: `day_of_week inválido: ${schedule.day_of_week}. Debe ser 0-6 (0=Sunday)`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (
        typeof schedule.start_time !== "string" ||
        !schedule.start_time.match(/^\d{2}:\d{2}$/)
      ) {
        return new Response(
          JSON.stringify({
            error: `start_time inválido: ${schedule.start_time}. Formato esperado: HH:MM`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (
        typeof schedule.end_time !== "string" ||
        !schedule.end_time.match(/^\d{2}:\d{2}$/)
      ) {
        return new Response(
          JSON.stringify({
            error: `end_time inválido: ${schedule.end_time}. Formato esperado: HH:MM`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 10) Agrupar schedules por día y validar cada día
    const schedulesByDay: Record<number, ScheduleItem[]> = {};

    for (const schedule of schedules) {
      const day = schedule.day_of_week;
      if (!schedulesByDay[day]) {
        schedulesByDay[day] = [];
      }
      schedulesByDay[day].push(schedule);
    }

    // Validar cada día individualmente
    try {
      for (const [day, daySchedules] of Object.entries(schedulesByDay)) {
        validateDaySchedules(daySchedules);
      }
    } catch (validationError) {
      console.error("[upsert-doctor-schedules] Validation error:", validationError);
      const errorMessage = validationError instanceof Error
        ? validationError.message
        : "Error de validación";

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 11) Borrar horarios anteriores del doctor
    const { error: deleteError } = await supabaseAdmin
      .from("doctor_schedules")
      .delete()
      .eq("doctor_id", doctorId);

    if (deleteError) {
      console.error("[upsert-doctor-schedules] Error deleting old schedules:", deleteError);
      return new Response(
        JSON.stringify({ error: "Error al borrar horarios anteriores" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 12) Insertar nuevos horarios si hay alguno
    if (schedules.length > 0) {
      const schedulesToInsert = schedules.map((schedule) => ({
        doctor_id: doctorId,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("doctor_schedules")
        .insert(schedulesToInsert);

      if (insertError) {
        console.error("[upsert-doctor-schedules] Error inserting schedules:", insertError);
        return new Response(
          JSON.stringify({ error: "Error al insertar nuevos horarios" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("[upsert-doctor-schedules] Schedules updated successfully");

    // 13) Responder con éxito
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[upsert-doctor-schedules] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
