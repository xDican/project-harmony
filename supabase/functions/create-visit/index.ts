import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { normalizeToE164 } from "../_shared/phone.ts";
import { formatDateForTemplate, formatTimeForTemplate } from "../_shared/datetime.ts";

const BUILD = "create-visit@2026-06-03_motor_fase5_v1";

// Una visita = N procedimientos (citas) para un paciente, en una fecha, que comparten visit_id.
// El secuenciador (get-visit-slots) ya calculo horas back-to-back factibles y asigno profesional
// por procedimiento; este EF persiste la visita atomicamente via RPC create_visit_appointments.
const procedureSchema = z.object({
  serviceTypeId: z.string().uuid("serviceTypeId invalido"),
  doctorId: z.string().uuid("doctorId invalido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date debe ser YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "time debe ser HH:MM o HH:MM:SS"),
  durationMinutes: z.number().int().min(5).max(480),
  calendarId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

const visitSchema = z.object({
  patientId: z.string().uuid("patientId invalido"),
  organizationId: z.string().uuid("organizationId invalido"),
  reminder3dEnabled: z.boolean().optional().default(false),
  procedures: z.array(procedureSchema).min(1, "Al menos un procedimiento").max(8, "Maximo 8 procedimientos"),
});

/** Envia UNA confirmacion WhatsApp (inicio de visita) via messaging-gateway. */
async function sendConfirmationViaGateway(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
  internalSecret: string;
  patientPhone: string;
  patientName: string;
  doctorDisplayName: string;
  formattedDate: string;
  formattedTime: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  organizationId: string;
}): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    const projectRef = new URL(params.supabaseUrl).hostname.split(".")[0];
    const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.serviceRoleKey}`,
        "x-internal-secret": params.internalSecret,
        apikey: params.anonKey,
      },
      body: JSON.stringify({
        to: normalizeToE164(params.patientPhone),
        type: "confirmation",
        organizationId: params.organizationId,
        templateParams: {
          "1": params.patientName,
          "2": params.doctorDisplayName,
          "3": params.formattedDate,
          "4": params.formattedTime,
        },
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        doctorId: params.doctorId,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }
    return { success: true, providerMessageId: data.providerMessageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { ok: false, error: "Missing Authorization header", build: BUILD });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return jsonResponse(500, { ok: false, error: "Supabase env vars not configured", build: BUILD });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return jsonResponse(401, { ok: false, error: "Unauthorized", build: BUILD });
    }

    // Validar body
    const body = await req.json();
    const parsed = visitSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(400, { ok: false, error: "Validation failed", details: parsed.error.errors, build: BUILD });
    }
    const { patientId, organizationId, reminder3dEnabled, procedures } = parsed.data;

    // Todos los procedimientos en la misma fecha (una visita = un dia)
    const dates = new Set(procedures.map((p) => p.date));
    if (dates.size > 1) {
      return jsonResponse(400, { ok: false, error: "Todos los procedimientos deben ser el mismo dia", build: BUILD });
    }

    // Roles: org_members primero, fallback user_roles (patron create-appointment)
    let roles: string[] = [];
    const { data: orgMembers, error: orgMembersError } = await supabase
      .from("org_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (!orgMembersError && orgMembers && orgMembers.length > 0) {
      roles = orgMembers.map((r: any) => r.role);
    } else {
      const { data: userRoles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (roleError || !userRoles || userRoles.length === 0) {
        return jsonResponse(403, { ok: false, error: "Failed to verify user permissions", build: BUILD });
      }
      roles = userRoles.map((r: any) => r.role);
    }
    const isAdmin = roles.includes("admin");
    const isSecretary = roles.includes("secretary");
    const isDoctor = roles.includes("doctor");
    if (!(isAdmin || isSecretary || isDoctor)) {
      return jsonResponse(403, { ok: false, error: "Insufficient permissions.", build: BUILD });
    }

    // Doctor-only: cada procedimiento debe ser para su propio doctorId
    if (isDoctor && !isAdmin && !isSecretary) {
      const { data: myDoctor, error: myDoctorErr } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (myDoctorErr) {
        return jsonResponse(500, { ok: false, error: "Error resolviendo doctor", details: myDoctorErr.message, build: BUILD });
      }
      const allMine = procedures.every((p) => p.doctorId === myDoctor?.id);
      if (!myDoctor?.id || !allMine) {
        return jsonResponse(403, { ok: false, error: "Los medicos solo pueden agendar para su propio doctorId", build: BUILD });
      }
    }

    // Paciente: existe y pertenece al org
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, name, phone, organization_id")
      .eq("id", patientId)
      .maybeSingle();
    if (patientError) {
      return jsonResponse(500, { ok: false, error: "Error validando paciente", details: patientError.message, build: BUILD });
    }
    if (!patient) {
      return jsonResponse(404, { ok: false, error: "Paciente no encontrado", build: BUILD });
    }
    if (patient.organization_id !== organizationId) {
      return jsonResponse(403, { ok: false, error: "El paciente no pertenece a esta organizacion", build: BUILD });
    }

    // Validar doctores + servicios + resolver calendar/nombre por procedimiento
    const distinctDoctorIds = [...new Set(procedures.map((p) => p.doctorId))];
    const { data: docRows, error: docErr } = await supabase
      .from("doctors")
      .select("id, name, prefix, organization_id")
      .in("id", distinctDoctorIds);
    if (docErr) {
      return jsonResponse(500, { ok: false, error: "Error validando profesionales", details: docErr.message, build: BUILD });
    }
    const docById = new Map((docRows ?? []).map((d: any) => [d.id, d]));
    for (const id of distinctDoctorIds) {
      const d = docById.get(id);
      if (!d || d.organization_id !== organizationId) {
        return jsonResponse(400, { ok: false, error: "Un profesional no pertenece a esta organizacion", build: BUILD });
      }
    }

    const distinctServiceIds = [...new Set(procedures.map((p) => p.serviceTypeId))];
    const { data: svcRows, error: svcErr } = await supabase
      .from("service_types")
      .select("id, display_name, organization_id")
      .in("id", distinctServiceIds);
    if (svcErr) {
      return jsonResponse(500, { ok: false, error: "Error validando servicios", details: svcErr.message, build: BUILD });
    }
    const svcById = new Map((svcRows ?? []).map((s: any) => [s.id, s]));
    for (const id of distinctServiceIds) {
      const s = svcById.get(id);
      if (!s || s.organization_id !== organizationId) {
        return jsonResponse(400, { ok: false, error: "Un servicio no pertenece a esta organizacion", build: BUILD });
      }
    }

    // Resolver calendar_id por doctor (cache) cuando no viene en el procedimiento
    const calendarByDoctor = new Map<string, string | null>();
    async function resolveCalendar(doctorId: string): Promise<string | null> {
      if (calendarByDoctor.has(doctorId)) return calendarByDoctor.get(doctorId)!;
      const { data: calDoc } = await supabase
        .from("calendar_doctors")
        .select("calendar_id, calendars!inner(organization_id)")
        .eq("doctor_id", doctorId)
        .eq("calendars.organization_id", organizationId)
        .limit(1)
        .maybeSingle();
      const cal = (calDoc as any)?.calendar_id ?? null;
      calendarByDoctor.set(doctorId, cal);
      return cal;
    }

    // Chequeo ligero de slot exacto ocupado (paridad con create-appointment; el secuenciador
    // ya filtra, esto es defensa contra carrera de slot exacto)
    for (const p of procedures) {
      const t = /^\d{2}:\d{2}$/.test(p.time) ? `${p.time}:00` : p.time;
      const { data: clash } = await supabase
        .from("appointments")
        .select("id")
        .eq("doctor_id", p.doctorId)
        .eq("date", p.date)
        .eq("time", t)
        .neq("status", "cancelada")
        .limit(1);
      if (clash && clash.length > 0) {
        return jsonResponse(409, { ok: false, error: "Uno de los horarios ya esta ocupado. Recarga la disponibilidad.", build: BUILD });
      }
    }

    // Determinar el procedimiento mas temprano (inicio de visita): solo ese dispara
    // recordatorios; los demas se suprimen (uno consolidado por visita, decision Diego).
    const toMin = (t: string) => {
      const [h, m] = t.split(":");
      return parseInt(h, 10) * 60 + parseInt(m, 10);
    };
    let earliestIdx = 0;
    for (let i = 1; i < procedures.length; i++) {
      if (toMin(procedures[i].time) < toMin(procedures[earliestIdx].time)) earliestIdx = i;
    }

    // Armar el array para la RPC
    const rpcProcedures = [] as Record<string, unknown>[];
    for (let i = 0; i < procedures.length; i++) {
      const p = procedures[i];
      const calendarId = p.calendarId ?? (await resolveCalendar(p.doctorId)) ?? null;
      rpcProcedures.push({
        doctor_id: p.doctorId,
        patient_id: patientId,
        organization_id: organizationId,
        service_type_id: p.serviceTypeId,
        service_type: svcById.get(p.serviceTypeId)?.display_name ?? null,
        date: p.date,
        time: p.time,
        duration_minutes: p.durationMinutes,
        calendar_id: calendarId,
        notes: p.notes ?? null,
        // suprimir recordatorios en todos menos el mas temprano
        reminder_24h_sent: i !== earliestIdx,
        reminder_3d_enabled: i === earliestIdx ? reminder3dEnabled : false,
      });

      // Auto-link doctor<->patient (idempotente)
      await supabase.from("doctor_patients").upsert(
        { doctor_id: p.doctorId, patient_id: patientId, organization_id: organizationId },
        { onConflict: "doctor_id,patient_id" },
      );
    }

    // Insert atomico via RPC
    const { data: created, error: rpcError } = await supabase.rpc("create_visit_appointments", {
      p_procedures: rpcProcedures,
    });

    if (rpcError) {
      const code = (rpcError as any)?.code;
      const msg = rpcError.message || "";
      if (code === "23505") {
        return jsonResponse(409, { ok: false, error: "Uno de los horarios ya esta ocupado", build: BUILD });
      }
      if (msg.includes("RESOURCE_CAPACITY_EXCEEDED")) {
        const m = msg.match(/RESOURCE_CAPACITY_EXCEEDED:\s*([^(]+)/);
        const recurso = m ? m[1].trim() : "un recurso";
        return jsonResponse(409, {
          ok: false,
          error: `No hay capacidad de ${recurso} en ese horario. Elige otro horario para la visita.`,
          build: BUILD,
        });
      }
      if (msg.includes("VISIT_EMPTY") || msg.includes("VISIT_ORG_MISMATCH")) {
        return jsonResponse(400, { ok: false, error: "Visita invalida", details: msg, build: BUILD });
      }
      return jsonResponse(500, { ok: false, error: "Error al crear la visita", details: msg, build: BUILD });
    }

    const rows = (created ?? []) as Array<any>;
    const visitId = rows[0]?.visit_id ?? null;
    const earliestRow = rows.find((r) => r.seq === 1) ?? rows[0];

    // Confirmacion UNICA (inicio de visita)
    let whatsappSent = false;
    let whatsappError: string | undefined;
    if (earliestRow && patient.phone) {
      const earliestDoctor = docById.get(earliestRow.doctor_id) as any;
      const doctorDisplayName = `${earliestDoctor?.prefix || "Dr."} ${earliestDoctor?.name ?? ""}`.trim();
      const dateStr = String(earliestRow.date);
      const timeStr = String(earliestRow.time);
      const gw = await sendConfirmationViaGateway({
        supabaseUrl,
        serviceRoleKey: supabaseServiceKey,
        anonKey: supabaseAnonKey,
        internalSecret,
        patientPhone: patient.phone,
        patientName: patient.name,
        doctorDisplayName,
        formattedDate: formatDateForTemplate(dateStr),
        formattedTime: formatTimeForTemplate(timeStr),
        appointmentId: earliestRow.id,
        patientId: patient.id,
        doctorId: earliestRow.doctor_id,
        organizationId,
      });
      whatsappSent = gw.success;
      whatsappError = gw.success ? undefined : gw.error;
      if (gw.success && visitId) {
        const { error: flagErr } = await supabase
          .from("appointments")
          .update({ confirmation_message_sent: true })
          .eq("visit_id", visitId);
        if (flagErr) console.error("[create-visit] Failed to mark confirmation_message_sent:", flagErr);
      }
    } else if (!patient.phone) {
      whatsappError = "El paciente no tiene numero de telefono";
    }

    return jsonResponse(200, {
      ok: true,
      visitId,
      appointments: rows,
      whatsappSent,
      whatsappError,
      build: BUILD,
    });
  } catch (error) {
    console.error("[create-visit] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { ok: false, error: "Error interno del servidor", details: errorMessage, build: BUILD });
  }
});
