import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Optional: helpful to confirm which version is deployed
const BUILD = "create-appointment@2026-02-13_multitenant_v1";

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

interface TwilioResponse {
  sid?: string;
  status?: string;
  error_code?: number;
  error_message?: string;
  message?: string;
}

/**
 * Sends a WhatsApp message via Twilio API
 */
async function sendTwilioWhatsApp(params: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  contentSid: string;
  contentVariables: Record<string, string>;
  messagingServiceSid?: string;
}): Promise<{ success: boolean; data: TwilioResponse }> {
  const { accountSid, authToken, from, to, contentSid, contentVariables, messagingServiceSid } = params;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("To", to);
  formData.append("From", from);
  formData.append("ContentSid", contentSid);
  formData.append("ContentVariables", JSON.stringify(contentVariables));

  if (messagingServiceSid) {
    formData.append("MessagingServiceSid", messagingServiceSid);
  }

  const credentials = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const data: TwilioResponse = await response.json();

  return {
    success: response.ok,
    data,
  };
}

/**
 * Logs a message to the message_logs table
 */
async function logMessage(
  supabase: any,
  params: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    toPhone: string;
    fromPhone: string;
    templateName: string;
    status: "sent" | "failed";
    rawPayload: unknown;
    organizationId?: string | null;
    whatsappLineId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("message_logs").insert({
    appointment_id: params.appointmentId,
    patient_id: params.patientId,
    doctor_id: params.doctorId,
    direction: "outbound",
    channel: "whatsapp",
    to_phone: params.toPhone,
    from_phone: params.fromPhone,
    body: `template:${params.templateName}`,
    template_name: params.templateName,
    type: "confirmation",
    status: params.status,
    raw_payload: params.rawPayload,
    organization_id: params.organizationId || null,
    whatsapp_line_id: params.whatsappLineId || null,
  });

  if (error) {
    console.error("[create-appointment] Error logging message:", error);
  }
}

/**
 * Formats a date string to dd/MM/yyyy format
 */
function formatDateForTemplate(dateStr: string): string {
  const dt = DateTime.fromISO(dateStr);
  return dt.toFormat("dd/MM/yyyy");
}

/**
 * Formats time to 12-hour format with AM/PM
 */
function formatTimeForTemplate(timeStr: string): string {
  // Parse HH:MM or HH:MM:SS
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[create-appointment] Missing Authorization header");
      return json(401, { ok: false, error: "Missing Authorization header", build: BUILD });
    }

    // 2) Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("[create-appointment] Missing Supabase env vars");
      return json(500, { ok: false, error: "Supabase env vars not configured", build: BUILD });
    }

    // Twilio config: will be resolved later (DB first, env var fallback)
    let twilioAccountSid: string | undefined;
    let twilioAuthToken: string | undefined;
    let twilioWhatsAppFrom: string | undefined;
    let twilioMessagingServiceSid: string | undefined;
    let twilioTemplateConfirmation: string | undefined;
    let resolvedWhatsappLineId: string | undefined;

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
      return json(401, { ok: false, error: "Unauthorized", build: BUILD });
    }

    // 5) Parse and validate request body FIRST (we need doctorId/patientId)
    const body = await req.json();
    const validationResult = appointmentSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("[create-appointment] Validation failed:", validationResult.error.errors);
      return json(400, {
        ok: false,
        error: "Validation failed",
        details: validationResult.error.errors,
        build: BUILD,
      });
    }

    const { doctorId, patientId, date, time, notes, durationMinutes, organizationId: reqOrgId, calendarId: reqCalendarId } = validationResult.data;
    console.log("[create-appointment] BUILD:", BUILD);
    console.log("[create-appointment] Validated request:", { doctorId, patientId, date, time, durationMinutes, reqOrgId, reqCalendarId });

    // 6) Check if user has permission using org_members first, fallback to user_roles
    let roles: string[] = [];

    // Try org_members first
    const { data: orgMembers, error: orgMemberError } = await supabase
      .from("org_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (!orgMemberError && orgMembers && orgMembers.length > 0) {
      roles = orgMembers.map((r: any) => r.role);
    } else {
      // Fallback to user_roles
      const { data: userRoles, error: roleError } = await supabaseAuth
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roleError || !userRoles || userRoles.length === 0) {
        console.error("[create-appointment] Role check failed:", roleError);
        return json(403, { ok: false, error: "Failed to verify user permissions", build: BUILD });
      }
      roles = userRoles.map((r: any) => r.role);
    }

    const isAdmin = roles.includes("admin");
    const isSecretary = roles.includes("secretary");
    const isDoctor = roles.includes("doctor");

    const hasPermission = isAdmin || isSecretary || isDoctor;
    if (!hasPermission) {
      console.error("[create-appointment] User lacks permission:", roles);
      return json(403, { ok: false, error: "Insufficient permissions.", build: BUILD });
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
        return json(500, { ok: false, error: "Error resolving doctor", details: myDoctorErr.message, build: BUILD });
      }

      if (!myDoctor?.id || myDoctor.id !== doctorId) {
        console.error("[create-appointment] Doctor attempted to create appointment for another doctor:", {
          userId: user.id,
          myDoctorId: myDoctor?.id,
          requestedDoctorId: doctorId,
        });
        return json(403, {
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

    // 10) Validate patient belongs to doctor (doctor-owned patients model)
    // Also fetch patient data we need later (name/phone) in the same query.
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, name, phone, doctor_id")
      .eq("id", patientId)
      .eq("doctor_id", doctorId)
      .maybeSingle();

    if (patientError) {
      console.error("[create-appointment] Error validating patient ownership:", patientError);
      return json(500, { ok: false, error: "Error validando paciente", details: patientError.message, build: BUILD });
    }

    if (!patient) {
      return json(403, { ok: false, error: "Paciente no pertenece a este doctor", build: BUILD });
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
      return json(500, { ok: false, error: "Error al verificar citas existentes", build: BUILD });
    }

    if (existingAppointments && existingAppointments.length > 0) {
      console.warn("[create-appointment] Slot already occupied");
      return json(409, { ok: false, error: "El horario seleccionado ya está ocupado", build: BUILD });
    }

    // 12a) Resolve organization_id and calendar_id (infer from doctor if not provided)
    let resolvedOrgId = reqOrgId || null;
    let resolvedCalendarId = reqCalendarId || null;

    if (!resolvedOrgId || !resolvedCalendarId) {
      // Infer from doctor's org membership and calendar
      const { data: doctorOrg } = await supabase
        .from("doctors")
        .select("organization_id")
        .eq("id", doctorId)
        .maybeSingle();

      if (doctorOrg?.organization_id && !resolvedOrgId) {
        resolvedOrgId = doctorOrg.organization_id;
      }

      if (!resolvedCalendarId && resolvedOrgId) {
        // Find the calendar for this doctor in this org
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
    }

    console.log("[create-appointment] Resolved org/calendar:", { resolvedOrgId, resolvedCalendarId });

    // 12b) Insert appointment
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        doctor_id: doctorId,
        patient_id: patientId,
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
        organization_id: resolvedOrgId,
        calendar_id: resolvedCalendarId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[create-appointment] Error inserting appointment:", insertError);

      // If you added a unique index (doctor_id, date, time), a race condition can produce a 23505
      const code = (insertError as any)?.code;
      if (code === "23505") {
        return json(409, { ok: false, error: "El horario seleccionado ya está ocupado", build: BUILD });
      }

      return json(500, { ok: false, error: "Error al crear la cita", details: insertError.message, build: BUILD });
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
      return json(200, {
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
      return json(200, {
        ok: true,
        appointment,
        whatsappSent: false,
        whatsappError: "El paciente no tiene número de teléfono",
        build: BUILD,
      });
    }

    // 16) Resolve Twilio credentials: DB whatsapp_lines first, env var fallback
    if (resolvedOrgId) {
      const { data: whatsappLine } = await supabase
        .from("whatsapp_lines")
        .select("id, twilio_account_sid, twilio_auth_token, twilio_phone_from, twilio_messaging_service_sid, twilio_template_confirmation")
        .eq("organization_id", resolvedOrgId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (whatsappLine?.twilio_account_sid) {
        twilioAccountSid = whatsappLine.twilio_account_sid;
        twilioAuthToken = whatsappLine.twilio_auth_token;
        twilioWhatsAppFrom = whatsappLine.twilio_phone_from;
        twilioMessagingServiceSid = whatsappLine.twilio_messaging_service_sid || undefined;
        twilioTemplateConfirmation = whatsappLine.twilio_template_confirmation || undefined;
        resolvedWhatsappLineId = whatsappLine.id;
        console.log("[create-appointment] Using WhatsApp creds from DB (whatsapp_lines)");
      }
    }

    // Fallback to env vars if DB didn't resolve
    if (!twilioAccountSid) {
      twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      twilioWhatsAppFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");
      twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
      twilioTemplateConfirmation = Deno.env.get("TWILIO_TEMPLATE_CONFIRMATION");
      console.log("[create-appointment] Using WhatsApp creds from env vars (fallback)");
    }

    const hasTwilioConfig = twilioAccountSid && twilioAuthToken && twilioWhatsAppFrom && twilioTemplateConfirmation;

    if (!hasTwilioConfig) {
      console.warn("[create-appointment] Twilio not configured - WhatsApp disabled");
      return json(200, {
        ok: true,
        appointment,
        whatsappSent: false,
        whatsappError: "Twilio no está configurado",
        build: BUILD,
      });
    }

    // 17) Format phone number for WhatsApp
    let whatsappTo = patient.phone;
    if (!whatsappTo.startsWith("whatsapp:")) {
      if (!whatsappTo.startsWith("+")) {
        // Assume Honduras (+504) if no country code
        whatsappTo = `+504${whatsappTo.replace(/\D/g, "")}`;
      }
      whatsappTo = `whatsapp:${whatsappTo}`;
    }

    // 18) Build template parameters
    const formattedDate = formatDateForTemplate(date);
    const formattedTime = formatTimeForTemplate(normalizedTime);

    const templateParams = {
      "1": patient.name,
      "2": doctorDisplayName,
      "3": `${formattedDate} a las ${formattedTime}`,
    };

    console.log("[create-appointment] Sending WhatsApp confirmation:", {
      to: whatsappTo,
      templateParams,
    });

    // 19) Send WhatsApp message
    const twilioResult = await sendTwilioWhatsApp({
      accountSid: twilioAccountSid!,
      authToken: twilioAuthToken!,
      from: twilioWhatsAppFrom!,
      to: whatsappTo,
      contentSid: twilioTemplateConfirmation!,
      contentVariables: templateParams,
      messagingServiceSid: twilioMessagingServiceSid || undefined,
    });

    console.log("[create-appointment] Twilio response:", JSON.stringify(twilioResult.data));

    // 20) Log the message
    const messageStatus = twilioResult.success ? "sent" : "failed";

    await logMessage(supabase, {
      appointmentId: appointment.id,
      patientId: patient.id,
      doctorId: doctor.id,
      toPhone: whatsappTo,
      fromPhone: twilioWhatsAppFrom!,
      templateName: twilioTemplateConfirmation!,
      status: messageStatus,
      rawPayload: twilioResult.data,
      organizationId: resolvedOrgId,
      whatsappLineId: resolvedWhatsappLineId,
    });

    // 21) Return response
    if (twilioResult.success) {
      return json(200, {
        ok: true,
        appointment,
        whatsappSent: true,
        twilioSid: twilioResult.data.sid,
        build: BUILD,
      });
    } else {
      const whatsappError = twilioResult.data.error_message || twilioResult.data.message || "Error enviando WhatsApp";
      console.error("[create-appointment] WhatsApp send failed:", whatsappError);

      return json(200, {
        ok: true,
        appointment,
        whatsappSent: false,
        whatsappError,
        build: BUILD,
      });
    }
  } catch (error) {
    console.error("[create-appointment] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return json(500, { ok: false, error: "Error interno del servidor", details: errorMessage, build: BUILD });
  }
});
