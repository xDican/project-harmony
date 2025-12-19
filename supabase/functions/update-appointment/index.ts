import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUILD = "update-appointment@2025-12-19_v1";

const BaseSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointmentId"),
  action: z.enum(["cancel", "reschedule", "update_notes"]),
});

const CancelSchema = BaseSchema.extend({
  action: z.literal("cancel"),
});

const RescheduleSchema = BaseSchema.extend({
  action: z.literal("reschedule"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS"),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  // opcional: por si luego quieres guardar razón
  notes: z.string().max(2000).optional().nullable(),
});

const UpdateNotesSchema = BaseSchema.extend({
  action: z.literal("update_notes"),
  notes: z.string().max(2000).nullable(),
});

const RequestSchema = z.union([CancelSchema, RescheduleSchema, UpdateNotesSchema]);

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { ok: false, error: "Missing Authorization header", build: BUILD });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return json(500, { ok: false, error: "Supabase env vars not configured", build: BUILD });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) return json(401, { ok: false, error: "Unauthorized", build: BUILD });

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return json(400, { ok: false, error: "Validation failed", details: parsed.error.errors, build: BUILD });
    }

    // Roles (usando RLS por supabaseAuth)
    const { data: userRoles, error: roleError } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError || !userRoles?.length) {
      return json(403, { ok: false, error: "Failed to verify user permissions", build: BUILD });
    }

    const roles = userRoles.map((r) => r.role);
    const isAdmin = roles.includes("admin");
    const isSecretary = roles.includes("secretary");
    const isDoctor = roles.includes("doctor");
    if (!isAdmin && !isSecretary && !isDoctor) {
      return json(403, { ok: false, error: "Insufficient permissions", build: BUILD });
    }

    const { appointmentId } = parsed.data;

    // Cargar appointment (service_role)
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptErr) return json(500, { ok: false, error: "Error fetching appointment", details: apptErr.message, build: BUILD });
    if (!appt) return json(404, { ok: false, error: "Appointment not found", build: BUILD });

    // Doctor ownership: doctor solo puede editar sus citas
    if (isDoctor && !isAdmin && !isSecretary) {
      const { data: myDoctor, error: myDoctorErr } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (myDoctorErr) return json(500, { ok: false, error: "Error resolving doctor", details: myDoctorErr.message, build: BUILD });
      if (!myDoctor?.id || appt.doctor_id !== myDoctor.id) {
        return json(403, { ok: false, error: "Forbidden", message: "Doctors can only edit their own appointments", build: BUILD });
      }
    }

    // Acciones
    if (parsed.data.action === "cancel") {
      const { data: updated, error: updErr } = await supabase
        .from("appointments")
        .update({ status: "cancelada" })
        .eq("id", appointmentId)
        .select("*")
        .single();

      if (updErr) return json(500, { ok: false, error: "Cancel failed", details: updErr.message, build: BUILD });
      return json(200, { ok: true, appointment: updated, build: BUILD });
    }

    if (parsed.data.action === "update_notes") {
      const { notes } = parsed.data;
      const { data: updated, error: updErr } = await supabase
        .from("appointments")
        .update({ notes })
        .eq("id", appointmentId)
        .select("*")
        .single();

      if (updErr) return json(500, { ok: false, error: "Update notes failed", details: updErr.message, build: BUILD });
      return json(200, { ok: true, appointment: updated, build: BUILD });
    }

    if (parsed.data.action === "reschedule") {
      const { date, time, durationMinutes, notes } = parsed.data;

      let normalizedTime = time;
      if (/^\d{2}:\d{2}$/.test(time)) normalizedTime = `${time}:00`;

      const appointmentAt = `${date}T${normalizedTime}`;

      // Si tu regla sigue siendo slot exacto, esto está bien.
      // (y el unique index doctor_id+date+time te protege de carreras)
      const payload: Record<string, unknown> = {
        date,
        time: normalizedTime,
        appointment_at: appointmentAt,
        status: "agendada",
        // Reiniciar flags del sistema
        confirmation_message_sent: false,
        reminder_24h_sent: false,
        reminder_24h_sent_at: null,
        reschedule_notified_at: new Date().toISOString(),
      };

      if (typeof durationMinutes === "number") payload.duration_minutes = durationMinutes;
      if (typeof notes !== "undefined") payload.notes = notes ?? null;

      const { data: updated, error: updErr } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", appointmentId)
        .select("*")
        .single();

      if (updErr) {
        const code = (updErr as any)?.code;
        if (code === "23505") {
          return json(409, { ok: false, error: "El horario seleccionado ya está ocupado", build: BUILD });
        }
        return json(409, { ok: false, error: "Reschedule conflict", details: updErr.message, build: BUILD });
      }

      return json(200, { ok: true, appointment: updated, build: BUILD });
    }

    return json(400, { ok: false, error: "Unsupported action", build: BUILD });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json(500, { ok: false, error: "Internal server error", details: msg, build: BUILD });
  }
});
