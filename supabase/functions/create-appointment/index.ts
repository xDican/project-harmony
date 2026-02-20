import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { normalizeToE164 } from "../_shared/phone.ts";
import { formatDateForTemplate, formatTimeForTemplate } from "../_shared/datetime.ts";

const BUILD = "create-appointment@2026-02-20_auth_hardening_v1";

// Zod schema for request validation
const appointmentSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID format"),
  patientId: z.string().uuid("Invalid patient ID format"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format"),
  notes: z.string().max(2000, "Notes must be less than 2000 characters").optional(),
  durationMinutes: z.number().int().min(15).max(480).optional().default(60),
  organizationId: z.string().uuid("Invalid organization ID format").optional(),
  calendarId: z.string().uuid("Invalid calendar ID format").optional(),
});

/**
 * Sends a WhatsApp confirmation via the messaging-gateway Edge Function.
 * The gateway handles provider selection (Twilio/Meta), template resolution, and logging.
 */
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
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      providerMessageId: data.providerMessageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // 1) Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[create-appointment] Missing Authorization header");
      return jsonResponse(401, { ok: false, error: "Missing Authorization header", build: BUILD });
    }

    // 2) Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("[create-appointment] Missing Supabase env vars");
      return jsonResponse(500, { ok: false, error: "Supabase env vars not configured", build: BUILD });
    }

    // 3) Create Supabase client with user's JWT for auth check
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Create service role client for data operations (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4) Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error("[create-appointment] Auth error:", userError);
      return jsonResponse(401, { ok: false, error: "Unauthorized", build: BUILD });
    }

    // 5) Parse and validate request body
    const body = await req.json();
    const validationResult = appointmentSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("[create-appointment] Validation failed:", validationResult.error.errors);
      return jsonResponse(400, {
        ok: false,
        error: "Validation failed",
        details: validationResult.error.errors,
        build: BUILD,
      });
    }

    const { doctorId, patientId, date, time, notes, durationMinutes, organizationId: reqOrgId, calendarId: reqCalendarId } = validationResult.data;

    // 6) Check if user has permission using user_roles table (service role to bypass RLS)
    const { data: userRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError || !userRoles || userRoles.length === 0) {
      console.error("[create-appointment] Role check failed:", { roleError, userRoles, userId: user.id });
      return jsonResponse(403, { ok: false, error: "Failed to verify user permissions", build: BUILD });
    }

    const roles = userRoles.map((r: any) => r.role);
    const isAdmin = roles.includes("admin");
    const isSecretary = roles.includes("secretary");
    const isDoctor = roles.includes("doctor");

    const hasPermission = isAdmin || isSecretary || isDoctor;
    if (!hasPermission) {
      console.error("[create-appointment] User lacks permission:", roles);
      return jsonResponse(403, { ok: false, error: "Insufficient permissions.", build: BUILD });
    }

    // 7) If doctor (and not admin/secretary), enforce doctorId matches doctors.user_id
    if (isDoctor && !isAdmin && !isSecretary) {
      const { data: myDoctor, error: myDoctorErr } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (myDoctorErr) {
        console.error("[create-appointment] Error resolving doctor from user:", myDoctorErr);
        return jsonResponse(500, { ok: false, error: "Error resolving doctor", details: myDoctorErr.message, build: BUILD });
      }

      if (!myDoctor?.id || myDoctor.id !== doctorId) {
        console.error("[create-appointment] Doctor attempted to create appointment for another doctor:", {
          userId: user.id,
          myDoctorId: myDoctor?.id,
          requestedDoctorId: doctorId,
        });
        return jsonResponse(403, {
          ok: false,
          error: "Forbidden",
          message: "Los médicos solo pueden crear citas para su propio doctorId",
          build: BUILD,
        });
      }
    }

    // 8) Normalize time to HH:MM:SS
    let normalizedTime = time;
    if (/^\d{2}:\d{2}$/.test(time)) {
      normalizedTime = `${time}:00`;
    }

    // 9) Build appointment_at timestamp
    const appointmentAt = `${date}T${normalizedTime}`;

    // 10) Fetch doctor's organization_id
    const { data: doctorOrg, error: doctorOrgError } = await supabase
      .from("doctors")
      .select("organization_id")
      .eq("id", doctorId)
      .single();

    if (doctorOrgError || !doctorOrg?.organization_id) {
      console.error("[create-appointment] Error fetching doctor org:", doctorOrgError);
      return jsonResponse(500, { ok: false, error: "Error resolviendo organización del doctor", build: BUILD });
    }

    // 10b) Fetch patient by ID (org-level, not doctor-specific)
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, name, phone, organization_id")
      .eq("id", patientId)
      .maybeSingle();

    if (patientError) {
      console.error("[create-appointment] Error fetching patient:", patientError);
      return jsonResponse(500, { ok: false, error: "Error validando paciente", details: patientError.message, build: BUILD });
    }

    if (!patient) {
      return jsonResponse(404, { ok: false, error: "Paciente no encontrado", build: BUILD });
    }

    // 10c) Validate patient belongs to same organization as doctor
    if (patient.organization_id !== doctorOrg.organization_id) {
      console.error("[create-appointment] Org mismatch:", {
        patientOrg: patient.organization_id,
        doctorOrg: doctorOrg.organization_id,
      });
      return jsonResponse(403, { ok: false, error: "Paciente no pertenece a la organización del doctor", build: BUILD });
    }

    // 10d) Auto-link doctor <-> patient in junction table (idempotent)
    const { error: linkError } = await supabase
      .from("doctor_patients")
      .upsert(
        {
          doctor_id: doctorId,
          patient_id: patientId,
          organization_id: doctorOrg.organization_id,
        },
        { onConflict: "doctor_id,patient_id" }
      );

    if (linkError) {
      console.warn("[create-appointment] Non-fatal: failed to upsert doctor_patients link:", linkError);
    }

    // 11) Check for existing appointment in same slot (exclude cancelled)
    const { data: existingAppointments, error: existingError } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", doctorId)
      .eq("date", date)
      .eq("time", normalizedTime)
      .neq("status", "cancelada");

    if (existingError) {
      console.error("[create-appointment] Error checking existing appointments:", existingError);
      return jsonResponse(500, { ok: false, error: "Error al verificar citas existentes", build: BUILD });
    }

    if (existingAppointments && existingAppointments.length > 0) {
      console.warn("[create-appointment] Slot already occupied");
      return jsonResponse(409, { ok: false, error: "El horario seleccionado ya está ocupado", build: BUILD });
    }

    // 12a) Resolve calendar_id (infer from doctor if not provided)
    let resolvedOrgId = reqOrgId || doctorOrg.organization_id;
    let resolvedCalendarId = reqCalendarId || null;

    if (!resolvedCalendarId && resolvedOrgId) {
      const { data: calDoc } = await supabase
        .from("calendar_doctors")
        .select("calendar_id, calendars!inner(organization_id)")
        .eq("doctor_id", doctorId)
        .eq("calendars.organization_id", resolvedOrgId)
        .limit(1)
        .maybeSingle();

      if (calDoc?.calendar_id) {
        resolvedCalendarId = calDoc.calendar_id;
      }
    }

    console.log("[create-appointment] Resolved org/calendar:", { resolvedOrgId, resolvedCalendarId });

    // 12b) Insert appointment
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        doctor_id: doctorId,
        patient_id: patientId,
        organization_id: resolvedOrgId,
        calendar_id: resolvedCalendarId,
        date,
        time: normalizedTime,
        notes: notes || null,
        status: "agendada",
        appointment_at: appointmentAt,
        duration_minutes: durationMinutes,
        confirmation_message_sent: false,
        reminder_24h_sent: false,
        reminder_24h_sent_at: null,
        reschedule_notified_at: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[create-appointment] Error inserting appointment:", insertError);

      const code = (insertError as any)?.code;
      if (code === "23505") {
        return jsonResponse(409, { ok: false, error: "El horario seleccionado ya está ocupado", build: BUILD });
      }

      return jsonResponse(500, { ok: false, error: "Error al crear la cita", details: insertError.message, build: BUILD });
    }

    console.log("[create-appointment] Appointment created:", appointment.id);

    // 13) Get doctor data (needed for template)
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, name, prefix")
      .eq("id", doctorId)
      .single();

    if (doctorError || !doctor) {
      console.error("[create-appointment] Error fetching doctor:", doctorError);
      return jsonResponse(200, {
        ok: true,
        appointment,
        whatsappSent: false,
        whatsappError: "No se pudo obtener datos del doctor",
        build: BUILD,
      });
    }

    // 14) Build doctor display name
    const doctorPrefix = doctor.prefix || "Dr.";
    const doctorDisplayName = `${doctorPrefix} ${doctor.name}`;

    // 15) Check if patient has a phone number
    if (!patient.phone) {
      console.warn("[create-appointment] Patient has no phone number");
      return jsonResponse(200, {
        ok: true,
        appointment,
        whatsappSent: false,
        whatsappError: "El paciente no tiene número de teléfono",
        build: BUILD,
      });
    }

    // 16) Format appointment date/time for template (4 params: nombre, médico, fecha, hora)
    const formattedDate = formatDateForTemplate(date);
    const formattedTime = formatTimeForTemplate(normalizedTime);

    console.log("[create-appointment] Sending WhatsApp confirmation via gateway:", {
      to: patient.phone,
      templateParams: { "1": patient.name, "2": doctorDisplayName, "3": formattedDate, "4": formattedTime },
    });

    // 17) Send WhatsApp confirmation via messaging-gateway
    const gatewayResult = await sendConfirmationViaGateway({
      supabaseUrl,
      serviceRoleKey: supabaseServiceKey,
      anonKey: supabaseAnonKey,
      internalSecret,
      patientPhone: patient.phone,
      patientName: patient.name,
      doctorDisplayName,
      formattedDate,
      formattedTime,
      appointmentId: appointment.id,
      patientId: patient.id,
      doctorId: doctor.id,
    });

    // 18) Return response
    if (gatewayResult.success) {
      return jsonResponse(200, {
        ok: true,
        appointment,
        whatsappSent: true,
        providerMessageId: gatewayResult.providerMessageId,
        build: BUILD,
      });
    } else {
      console.error("[create-appointment] WhatsApp send failed:", gatewayResult.error);
      return jsonResponse(200, {
        ok: true,
        appointment,
        whatsappSent: false,
        whatsappError: gatewayResult.error || "Error enviando WhatsApp",
        build: BUILD,
      });
    }
  } catch (error) {
    console.error("[create-appointment] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { ok: false, error: "Error interno del servidor", details: errorMessage, build: BUILD });
  }
});
