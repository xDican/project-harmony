import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod schema for request validation
const appointmentSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID format"),
  patientId: z.string().uuid("Invalid patient ID format"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format"),
  notes: z.string().max(2000, "Notes must be less than 2000 characters").optional(),
  durationMinutes: z.number().int().min(15).max(480).optional().default(60),
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
      return new Response(JSON.stringify({ ok: false, error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("[create-appointment] Missing Supabase env vars");
      return new Response(JSON.stringify({ ok: false, error: "Supabase env vars not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Twilio env vars
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioWhatsAppFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");
    const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    const twilioTemplateConfirmation = Deno.env.get("TWILIO_TEMPLATE_CONFIRMATION");

    const hasTwilioConfig = twilioAccountSid && twilioAuthToken && twilioWhatsAppFrom && twilioTemplateConfirmation;

    if (!hasTwilioConfig) {
      console.warn("[create-appointment] Twilio env vars not fully configured - WhatsApp notifications disabled");
    }

    // 3) Create Supabase client with user's JWT for auth check
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Create service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4) Verify user is authenticated and has permission
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error("[create-appointment] Auth error:", userError);
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Check if user has permission using user_roles table
    const { data: userRoles, error: roleError } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError || !userRoles || userRoles.length === 0) {
      console.error("[create-appointment] Role check failed:", roleError);
      return new Response(JSON.stringify({ ok: false, error: "Failed to verify user permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasPermission = userRoles.some((r) => ["admin", "secretary", "doctor"].includes(r.role));
    if (!hasPermission) {
      console.error("[create-appointment] User lacks permission:", userRoles);
      return new Response(JSON.stringify({ ok: false, error: "Insufficient permissions." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Parse and validate request body
    const body = await req.json();
    const validationResult = appointmentSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("[create-appointment] Validation failed:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { doctorId, patientId, date, time, notes, durationMinutes } = validationResult.data;
    console.log("[create-appointment] Validated request:", { doctorId, patientId, date, time, durationMinutes });

    // 7) Normalize time to HH:MM:SS
    let normalizedTime = time;
    if (/^\d{2}:\d{2}$/.test(time)) {
      normalizedTime = `${time}:00`;
    }

    // 8) Build appointment_at timestamp
    const appointmentAt = `${date}T${normalizedTime}`;

    // 9) Check for existing appointment in same slot
    const { data: existingAppointments, error: existingError } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", doctorId)
      .eq("date", date)
      .eq("time", normalizedTime)
      .neq("status", "cancelada");

    if (existingError) {
      console.error("[create-appointment] Error checking existing appointments:", existingError);
      return new Response(JSON.stringify({ ok: false, error: "Error al verificar citas existentes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingAppointments && existingAppointments.length > 0) {
      console.warn("[create-appointment] Slot already occupied");
      return new Response(JSON.stringify({ ok: false, error: "El horario seleccionado ya está ocupado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10) Insert appointment
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
      })
      .select()
      .single();

    if (insertError) {
      console.error("[create-appointment] Error inserting appointment:", insertError);
      return new Response(JSON.stringify({ ok: false, error: "Error al crear la cita" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[create-appointment] Appointment created:", appointment.id);

    // 11) Get patient data
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, name, phone")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      console.error("[create-appointment] Error fetching patient:", patientError);
      // Continue without sending WhatsApp - appointment was created
      return new Response(
        JSON.stringify({
          ok: true,
          appointment,
          whatsappSent: false,
          whatsappError: "No se pudo obtener datos del paciente",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 12) Get doctor data
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, name, prefix")
      .eq("id", doctorId)
      .single();

    if (doctorError || !doctor) {
      console.error("[create-appointment] Error fetching doctor:", doctorError);
      return new Response(
        JSON.stringify({
          ok: true,
          appointment,
          whatsappSent: false,
          whatsappError: "No se pudo obtener datos del doctor",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 13) Build doctor display name
    // Use prefix if available (e.g., "Dr.", "Dra."), otherwise default to "Dr."
    const doctorPrefix = doctor.prefix || "Dr.";
    const doctorDisplayName = `${doctorPrefix} ${doctor.name}`;

    // 14) Check if patient has a phone number
    if (!patient.phone) {
      console.warn("[create-appointment] Patient has no phone number");
      return new Response(
        JSON.stringify({
          ok: true,
          appointment,
          whatsappSent: false,
          whatsappError: "El paciente no tiene número de teléfono",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 15) Check Twilio configuration
    if (!hasTwilioConfig) {
      return new Response(
        JSON.stringify({
          ok: true,
          appointment,
          whatsappSent: false,
          whatsappError: "Twilio no está configurado",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 16) Format phone number for WhatsApp
    let whatsappTo = patient.phone;
    if (!whatsappTo.startsWith("whatsapp:")) {
      // Ensure phone has country code
      if (!whatsappTo.startsWith("+")) {
        // Assume Honduras (+504) if no country code
        whatsappTo = `+504${whatsappTo.replace(/\D/g, "")}`;
      }
      whatsappTo = `whatsapp:${whatsappTo}`;
    }

    // 17) Build template parameters
    // Template placeholders:
    // {{1}} = Patient name
    // {{2}} = Doctor display name (with prefix)
    // {{3}} = Formatted date
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

    // 18) Send WhatsApp message
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

    // 19) Log the message
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
    });

    // 20) Return response
    if (twilioResult.success) {
      return new Response(
        JSON.stringify({
          ok: true,
          appointment,
          whatsappSent: true,
          twilioSid: twilioResult.data.sid,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      // Appointment created but WhatsApp failed
      const whatsappError = twilioResult.data.error_message || twilioResult.data.message || "Error enviando WhatsApp";
      console.error("[create-appointment] WhatsApp send failed:", whatsappError);

      return new Response(
        JSON.stringify({
          ok: true,
          appointment,
          whatsappSent: false,
          whatsappError,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("[create-appointment] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: "Error interno del servidor", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
