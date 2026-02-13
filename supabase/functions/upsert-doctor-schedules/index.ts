import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Optional: helpful to confirm which version is deployed
const BUILD = "upsert-doctor-schedules@2025-12-19_doctor-permission_v1";

// Zod schemas for validation
const ScheduleItemSchema = z.object({
  day_of_week: z.number().int().min(0).max(6, "day_of_week debe estar entre 0 (Domingo) y 6 (Sábado)"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "start_time debe estar en formato HH:MM"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "end_time debe estar en formato HH:MM"),
});

const RequestSchema = z.object({
  doctorId: z.string().uuid("doctorId debe ser un UUID válido"),
  schedules: z.array(ScheduleItemSchema).max(50, "Máximo 50 horarios permitidos"),
});

const MAX_SLOTS_PER_DAY = 12;

/**
 * Convierte tiempo "HH:MM" a minutos desde medianoche
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Valida que los horarios de un día no se solapen
 */
function validateDaySchedules(schedules: z.infer<typeof ScheduleItemSchema>[]): void {
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

  // Validar límite de slots por día
  if (schedules.length > MAX_SLOTS_PER_DAY) {
    throw new Error(`Demasiados slots para un día. Máximo permitido: ${MAX_SLOTS_PER_DAY}`);
  }
}

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

    // 5) Parsear y validar body con Zod (lo hacemos ANTES de permisos para poder validar doctorId)
    const rawBody = await req.json();
    const validationResult = RequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      console.error("[upsert-doctor-schedules] Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Datos de entrada inválidos",
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { doctorId, schedules } = validationResult.data;

    // 6) Validar rol del usuario usando user_roles (admin/secretary/doctor)
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError || !userRoles || userRoles.length === 0) {
      console.error("[upsert-doctor-schedules] Role check failed:", roleError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roles = userRoles.map((r) => r.role);
    const isAdmin = roles.includes("admin");
    const isSecretary = roles.includes("secretary");
    const isDoctor = roles.includes("doctor");

    if (!isAdmin && !isSecretary && !isDoctor) {
      console.error("[upsert-doctor-schedules] No valid roles found. User roles:", roles);
      return new Response(
        JSON.stringify({ error: "Forbidden", message: "No role assigned", build: BUILD }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7) Permisos:
    // - admin/secretary: pueden actualizar horarios de cualquier doctorId
    // - doctor: SOLO puede actualizar su propio doctorId (mapeado por doctors.user_id = auth.uid())
    if (isDoctor && !isAdmin && !isSecretary) {
      const { data: myDoctor, error: myDoctorErr } = await supabaseAdmin
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (myDoctorErr) {
        console.error("[upsert-doctor-schedules] Error resolving doctor from user:", myDoctorErr);
        return new Response(
          JSON.stringify({ error: "Server error", details: myDoctorErr.message, build: BUILD }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!myDoctor?.id) {
        console.error("[upsert-doctor-schedules] Doctor profile not found for user:", user.id);
        return new Response(
          JSON.stringify({ error: "Forbidden", message: "Doctor profile not found", build: BUILD }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (doctorId !== myDoctor.id) {
        console.error("[upsert-doctor-schedules] Doctor attempted to edit another doctor schedule:", {
          userId: user.id,
          myDoctorId: myDoctor.id,
          requestedDoctorId: doctorId,
        });

        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Los médicos solo pueden actualizar su propio horario",
            build: BUILD,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("[upsert-doctor-schedules] BUILD:", BUILD);
    console.log("[upsert-doctor-schedules] Request:", {
      doctorId,
      schedulesCount: schedules.length,
      userRoles: roles,
      userId: user.id,
    });

    // 8) Validar que el doctor existe (ya sea admin/secretary o doctor propio)
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from("doctors")
      .select("id")
      .eq("id", doctorId)
      .maybeSingle();

    if (doctorError || !doctor) {
      console.error("[upsert-doctor-schedules] Doctor not found:", doctorError);
      return new Response(JSON.stringify({ error: "Doctor no encontrado", build: BUILD }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 9) Agrupar schedules por día y validar cada día
    const schedulesByDay: Record<number, z.infer<typeof ScheduleItemSchema>[]> = {};

    for (const schedule of schedules) {
      const day = schedule.day_of_week;
      if (!schedulesByDay[day]) {
        schedulesByDay[day] = [];
      }
      schedulesByDay[day].push(schedule);
    }

    // Validar cada día individualmente
    try {
      for (const daySchedules of Object.values(schedulesByDay)) {
        validateDaySchedules(daySchedules);
      }
    } catch (validationError) {
      console.error("[upsert-doctor-schedules] Schedule validation error:", validationError);
      const errorMessage = validationError instanceof Error
        ? validationError.message
        : "Error de validación";

      return new Response(JSON.stringify({ error: errorMessage, build: BUILD }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10) Borrar horarios anteriores del doctor
    const { error: deleteError } = await supabaseAdmin
      .from("doctor_schedules")
      .delete()
      .eq("doctor_id", doctorId);

    if (deleteError) {
      console.error("[upsert-doctor-schedules] Error deleting old schedules:", deleteError);
      return new Response(
        JSON.stringify({ error: "Error al borrar horarios anteriores", build: BUILD }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[upsert-doctor-schedules] Old schedules deleted successfully");

    // 11) Insertar nuevos horarios si hay alguno
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
          JSON.stringify({
            error:
              "Error al insertar nuevos horarios. Los horarios anteriores fueron borrados. Por favor, intente nuevamente.",
            build: BUILD,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("[upsert-doctor-schedules] Schedules updated successfully");

    // 12) Responder con éxito
    return new Response(JSON.stringify({ success: true, build: BUILD }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[upsert-doctor-schedules] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage, build: BUILD }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
