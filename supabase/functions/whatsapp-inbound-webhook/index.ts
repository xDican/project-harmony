import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid statuses for finding active appointments
const ACTIVE_STATUSES = ["agendada", "pending", "confirmada", "confirmed"];

// Intent patterns for message classification
const CONFIRM_PATTERNS = ["confirm", "confirmar", "si", "sí"];
const RESCHEDULE_PATTERNS = ["reagend", "reagendar", "cambiar"];

interface TwilioInboundPayload {
  From?: string;
  To?: string;
  Body?: string;
  MessageSid?: string;
  AccountSid?: string;
  NumMedia?: string;
  NumSegments?: string;
  SmsStatus?: string;
  ApiVersion?: string;
  ProfileName?: string;
  WaId?: string;
  ButtonText?: string;
  ButtonPayload?: string;
  [key: string]: string | undefined;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  status: string;
  appointment_at: string;
}

type MessageIntent = "confirm" | "reschedule" | "unknown";

/**
 * Normalizes phone number from Twilio format to standard +504... format
 * Removes "whatsapp:" prefix if present
 */
function normalizePhone(phone: string): string {
  if (!phone) return "";
  // Remove "whatsapp:" prefix
  let normalized = phone.replace(/^whatsapp:/i, "");
  // Ensure it starts with +
  if (!normalized.startsWith("+")) {
    normalized = `+${normalized}`;
  }
  return normalized;
}

/**
 * Determines the intent from message body
 */
function detectIntent(body: string): MessageIntent {
  if (!body) return "unknown";

  const lowerBody = body.toLowerCase().trim();

  // Check for confirm patterns
  for (const pattern of CONFIRM_PATTERNS) {
    if (lowerBody.includes(pattern)) {
      return "confirm";
    }
  }

  // Check for reschedule patterns
  for (const pattern of RESCHEDULE_PATTERNS) {
    if (lowerBody.includes(pattern)) {
      return "reschedule";
    }
  }

  return "unknown";
}

/**
 * Parses URL-encoded form data from Twilio webhook
 */
function parseFormData(body: string): TwilioInboundPayload {
  const params = new URLSearchParams(body);
  const result: TwilioInboundPayload = {};

  for (const [key, value] of params.entries()) {
    result[key] = value;
  }

  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[whatsapp-inbound-webhook] Missing Supabase env vars");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Create Supabase client with service role for bypassing RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3) Parse incoming request body (Twilio sends application/x-www-form-urlencoded)
    const contentType = req.headers.get("content-type") || "";
    let payload: TwilioInboundPayload;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const rawBody = await req.text();
      payload = parseFormData(rawBody);
    } else if (contentType.includes("application/json")) {
      // Also support JSON in case of testing
      payload = await req.json();
    } else {
      // Try to parse as form data by default (Twilio standard)
      const rawBody = await req.text();
      payload = parseFormData(rawBody);
    }

    console.log("[whatsapp-inbound-webhook] Received payload:", JSON.stringify(payload));

    // 4) Extract key fields
    const fromRaw = payload.From || "";
    const toRaw = payload.To || "";
    const body = payload.Body || payload.ButtonText || "";

    // Normalize phone numbers
    const fromPhone = normalizePhone(fromRaw);
    const toPhone = normalizePhone(toRaw);

    console.log("[whatsapp-inbound-webhook] From:", fromPhone, "Body:", body);

    // 5) Find patient by phone
    let patient: Patient | null = null;

    if (fromPhone) {
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id, name, phone")
        .eq("phone", fromPhone)
        .single();

      if (patientError && patientError.code !== "PGRST116") {
        console.error("[whatsapp-inbound-webhook] Error finding patient:", patientError);
      }

      patient = patientData as Patient | null;
    }

    console.log("[whatsapp-inbound-webhook] Patient found:", patient ? patient.id : "none");

    // 6) Find active appointment for patient
    let appointment: Appointment | null = null;

    if (patient) {
      // Calculate cutoff date (2 days ago)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const cutoffDate = twoDaysAgo.toISOString();

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select("id, doctor_id, patient_id, status, appointment_at")
        .eq("patient_id", patient.id)
        .in("status", ACTIVE_STATUSES)
        .gte("appointment_at", cutoffDate)
        .order("appointment_at", { ascending: true })
        .limit(1)
        .single();

      if (appointmentError && appointmentError.code !== "PGRST116") {
        console.error("[whatsapp-inbound-webhook] Error finding appointment:", appointmentError);
      }

      appointment = appointmentData as Appointment | null;
    }

    console.log("[whatsapp-inbound-webhook] Appointment found:", appointment ? appointment.id : "none");

    // 7) Determine intent from message
    const intent = detectIntent(body);
    console.log("[whatsapp-inbound-webhook] Detected intent:", intent);

    // 8) Insert message log (always, regardless of whether we found patient/appointment)
    const messageLogData = {
      direction: "inbound",
      channel: "whatsapp",
      from_phone: fromPhone || null,
      to_phone: toPhone || null,
      body: body || null,
      type: "patient_reply",
      status: "received",
      appointment_id: appointment?.id || null,
      patient_id: patient?.id || null,
      doctor_id: appointment?.doctor_id || null,
      raw_payload: payload,
    };

    const { error: logError } = await supabase.from("message_logs").insert(messageLogData);

    if (logError) {
      console.error("[whatsapp-inbound-webhook] Error inserting message log:", logError);
      // Continue processing even if log fails
    } else {
      console.log("[whatsapp-inbound-webhook] Message logged successfully");
    }

    // 9) Update appointment status if we have one and detected an intent
    if (appointment && intent !== "unknown") {
      let newStatus: string | null = null;

      if (intent === "confirm") {
        newStatus = "confirmada";
      } else if (intent === "reschedule") {
        newStatus = "reagendar";
      }

      if (newStatus) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({ status: newStatus })
          .eq("id", appointment.id);

        if (updateError) {
          console.error("[whatsapp-inbound-webhook] Error updating appointment:", updateError);
        } else {
          console.log("[whatsapp-inbound-webhook] Appointment updated to:", newStatus);
        }
      }
    }

    // 10) Return success response
    // Twilio expects a 200 response to acknowledge receipt
    return new Response(
      JSON.stringify({
        ok: true,
        intent,
        patientFound: !!patient,
        appointmentFound: !!appointment,
        appointmentUpdated: appointment && intent !== "unknown",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[whatsapp-inbound-webhook] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
