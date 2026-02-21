/**
 * Meta Cloud API Webhook Handler
 *
 * Handles:
 *   GET  — Webhook verification (hub.verify_token + hub.challenge)
 *   POST — Incoming messages & delivery status updates
 *
 * Security:
 *   - HMAC SHA-256 signature validation on every POST using META_APP_SECRET
 *   - Verify token validation on GET
 *
 * Replaces: whatsapp-inbound-webhook (Twilio) + twilio-message-status-webhook
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { normalizeToE164 } from "../_shared/phone.ts";
import { logMessage } from "../_shared/message-logger.ts";
import { formatTimeForTemplate } from "../_shared/datetime.ts";

// ---------------------------------------------------------------------------
// Types for Meta webhook payloads
// ---------------------------------------------------------------------------

interface MetaWebhookPayload {
  object: string;
  entry?: MetaEntry[];
}

interface MetaEntry {
  id: string;
  changes?: MetaChange[];
}

interface MetaChange {
  value: MetaChangeValue;
  field: string;
}

interface MetaChangeValue {
  messaging_product: string;
  metadata?: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}

interface MetaContact {
  profile: { name: string };
  wa_id: string;
}

interface MetaMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text: string; payload: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

interface MetaStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

// Intent patterns (Spanish) — same as whatsapp-inbound-webhook
const CONFIRM_PATTERNS = ["confirm", "confirmar", "si", "sí"];
const RESCHEDULE_PATTERNS = ["reagend", "reagendar", "cambiar"];
const ACTIVE_STATUSES = ["agendada", "pending", "confirmada", "confirmed"];

type MessageIntent = "confirm" | "reschedule" | "unknown";

// ---------------------------------------------------------------------------
// Signature validation
// ---------------------------------------------------------------------------

async function validateSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected =
    "sha256=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  // Constant-time comparison
  if (expected.length !== signatureHeader.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return result === 0;
}

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

function detectIntent(body: string): MessageIntent {
  if (!body) return "unknown";
  const lower = body.toLowerCase().trim();

  for (const p of CONFIRM_PATTERNS) {
    if (lower.includes(p)) return "confirm";
  }
  for (const p of RESCHEDULE_PATTERNS) {
    if (lower.includes(p)) return "reschedule";
  }
  return "unknown";
}

/** Extract message text for intent detection from any Meta message type */
function extractMessageText(msg: MetaMessage): string {
  if (msg.type === "text" && msg.text?.body) return msg.text.body;
  // For quick reply buttons: use the visible button text for intent detection,
  // not the payload (which may contain the appointmentId UUID).
  if (msg.type === "button" && msg.button) return msg.button.text || msg.button.payload;
  if (msg.type === "interactive" && msg.interactive) {
    if (msg.interactive.button_reply) return msg.interactive.button_reply.title || msg.interactive.button_reply.id;
    if (msg.interactive.list_reply) return msg.interactive.list_reply.title || msg.interactive.list_reply.id;
  }
  return "";
}

/**
 * If the button payload is a UUID (set by messaging-gateway), return it.
 * This lets us look up the exact appointment without fuzzy search.
 */
function extractAppointmentIdFromPayload(msg: MetaMessage): string | null {
  const payload =
    msg.type === "button" ? msg.button?.payload :
    msg.type === "interactive" ? (msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id) :
    null;

  if (!payload) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload)) {
    return payload;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

async function handleIncomingMessage(
  supabase: ReturnType<typeof createClient>,
  metadata: MetaChangeValue["metadata"],
  message: MetaMessage,
  contacts: MetaContact[] | undefined,
  lineId?: string,
  lineOrgId?: string,
  botEnabled?: boolean,
): Promise<void> {
  const fromPhone = normalizeToE164(message.from);
  const toPhone = metadata?.display_phone_number
    ? normalizeToE164(metadata.display_phone_number)
    : "";

  const body = extractMessageText(message);
  const appointmentIdFromPayload = extractAppointmentIdFromPayload(message);
  const contactName = contacts?.[0]?.profile?.name;

  console.log("[meta-webhook] Inbound from:", fromPhone, "body:", body, "appointmentFromPayload:", appointmentIdFromPayload, "contact:", contactName, "botEnabled:", botEnabled);

  // Idempotency: skip if this exact message was already processed
  const { data: existingLog } = await supabase
    .from("message_logs")
    .select("id")
    .eq("provider_message_id", message.id)
    .maybeSingle();

  if (existingLog) {
    console.log("[meta-webhook] Duplicate message skipped:", message.id);
    return;
  }

  // BOT FLOW: route to bot-handler when bot is enabled AND it's not a button
  // confirmation reply (those still use the legacy appointment-update flow).
  if (botEnabled && lineId && lineOrgId && !appointmentIdFromPayload) {
    // Quick patient lookup for log enrichment (optional — failures are non-fatal)
    let patientIdForLog: string | undefined;
    if (fromPhone) {
      const localPhone = fromPhone.replace(/^\+504/, "");
      const phonesToCheck = localPhone !== fromPhone ? [fromPhone, localPhone] : [fromPhone];
      const { data: p } = await supabase
        .from("patients")
        .select("id")
        .in("phone", phonesToCheck)
        .limit(1)
        .maybeSingle();
      patientIdForLog = p?.id;
    }

    // Log inbound message
    await logMessage(supabase, {
      direction: "inbound",
      toPhone,
      fromPhone,
      body: body || null,
      type: "patient_reply",
      status: "received",
      provider: "meta",
      providerMessageId: message.id,
      patientId: patientIdForLog,
      organizationId: lineOrgId,
      whatsappLineId: lineId,
      rawPayload: message,
    });

    // Dispatch to bot-handler and send response
    await routeToBotHandler(fromPhone, body, lineId, lineOrgId, patientIdForLog);
    return;
  }

  // Find patient by phone
  // Patients may be stored as local 8-digit (33899824) or E164 (+50433899824),
  // so we try both formats.
  let patient: { id: string; name: string } | null = null;
  if (fromPhone) {
    const localPhone = fromPhone.replace(/^\+504/, "");
    const phonesToCheck = localPhone !== fromPhone ? [fromPhone, localPhone] : [fromPhone];

    const { data, error } = await supabase
      .from("patients")
      .select("id, name, phone")
      .in("phone", phonesToCheck)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[meta-webhook] Error finding patient:", error);
    }
    patient = data;
    console.log("[meta-webhook] Patient lookup phones:", phonesToCheck, "found:", patient?.id ?? "none");
  }

  // Find appointment:
  // 1) Direct lookup by ID embedded in button payload (exact, preferred)
  // 2) Fall back to fuzzy search by patient + active status (legacy / freeform text)
  let appointment: { id: string; doctor_id: string; status: string } | null = null;

  if (appointmentIdFromPayload) {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, doctor_id, status")
      .eq("id", appointmentIdFromPayload)
      .neq("status", "cancelada")
      .maybeSingle();

    if (error) console.error("[meta-webhook] Error fetching appointment by payload ID:", error);
    appointment = data;
    console.log("[meta-webhook] Direct appointment lookup:", appointmentIdFromPayload, "found:", appointment?.id ?? "none");
  } else if (patient) {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data, error } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id, status, appointment_at")
      .eq("patient_id", patient.id)
      .in("status", ACTIVE_STATUSES)
      .gte("appointment_at", twoDaysAgo.toISOString())
      .order("appointment_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[meta-webhook] Error finding appointment:", error);
    }
    appointment = data;
  }

  // Detect intent
  const intent = detectIntent(body);
  console.log("[meta-webhook] Intent:", intent, "patient:", patient?.id, "appointment:", appointment?.id);

  // Log inbound message
  await logMessage(supabase, {
    direction: "inbound",
    toPhone,
    fromPhone,
    body: body || null,
    type: "patient_reply",
    status: "received",
    provider: "meta",
    providerMessageId: message.id,
    appointmentId: appointment?.id,
    patientId: patient?.id,
    doctorId: appointment?.doctor_id,
    organizationId: lineOrgId,
    whatsappLineId: lineId,
    rawPayload: message,
  });

  // Update appointment status based on intent
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
        console.error("[meta-webhook] Error updating appointment:", updateError);
      } else {
        console.log("[meta-webhook] Appointment", appointment.id, "updated to:", newStatus);
      }

      // Send notification templates based on intent
      await sendIntentNotification(supabase, intent, appointment, patient!, fromPhone, toPhone);
    }
  }
}

/**
 * Send notification templates when a patient confirms or requests reschedule.
 * Uses the messaging-gateway via internal fetch.
 *
 * Template params per template:
 *   patient_confirmed:  {1: hora}
 *   patient_reschedule: {} (sin params)
 *   reschedule_doctor:  {1: nombre paciente, 2: telefono paciente}
 */
async function sendIntentNotification(
  supabase: ReturnType<typeof createClient>,
  intent: MessageIntent,
  appointment: { id: string; doctor_id: string },
  patient: { id: string; name: string },
  _patientPhone: string,
  _linePhone: string,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

  if (intent === "confirm") {
    // patient_confirmed: 1 param = hora de la cita
    const { data: appt } = await supabase
      .from("appointments")
      .select("time")
      .eq("id", appointment.id)
      .single();

    if (!appt) return;

    await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        "x-internal-secret": internalSecret,
        apikey: anonKey,
      },
      body: JSON.stringify({
        to: _patientPhone,
        type: "patient_confirmed",
        templateParams: { "1": formatTimeForTemplate(appt.time) },
        appointmentId: appointment.id,
        patientId: patient.id,
        doctorId: appointment.doctor_id,
      }),
    }).catch((e) => console.error("[meta-webhook] Error sending patient_confirmed:", e));

  } else if (intent === "reschedule") {
    // reschedule_doctor: 2 params = nombre del paciente, número del paciente
    const { data: doctorUser } = await supabase
      .from("doctors")
      .select("phone")
      .eq("id", appointment.doctor_id)
      .single();

    if (doctorUser?.phone) {
      await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          "x-internal-secret": internalSecret,
          apikey: anonKey,
        },
        body: JSON.stringify({
          to: normalizeToE164(doctorUser.phone),
          type: "reschedule_doctor",
          templateParams: {
            "1": patient.name,
            "2": _patientPhone,
          },
          appointmentId: appointment.id,
          patientId: patient.id,
          doctorId: appointment.doctor_id,
        }),
      }).catch((e) => console.error("[meta-webhook] Error sending reschedule_doctor:", e));
    }

    // patient_reschedule: sin params
    await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        "x-internal-secret": internalSecret,
        apikey: anonKey,
      },
      body: JSON.stringify({
        to: _patientPhone,
        type: "patient_reschedule",
        templateParams: {},
        appointmentId: appointment.id,
        patientId: patient.id,
        doctorId: appointment.doctor_id,
      }),
    }).catch((e) => console.error("[meta-webhook] Error sending patient_reschedule:", e));
  }
}

// ---------------------------------------------------------------------------
// Bot routing
// ---------------------------------------------------------------------------

/**
 * Calls bot-handler and sends its response back to the patient via messaging-gateway.
 * Both calls are fire-and-forget from the webhook perspective — errors are logged only.
 */
async function routeToBotHandler(
  fromPhone: string,
  messageText: string,
  lineId: string,
  orgId: string,
  patientId?: string,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const botHandlerUrl = `https://${projectRef}.supabase.co/functions/v1/bot-handler`;
  const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

  try {
    // 1) Call bot-handler
    const botRes = await fetch(botHandlerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({
        whatsappLineId: lineId,
        patientPhone: fromPhone,
        messageText: messageText || "",
        organizationId: orgId,
      }),
    });

    if (!botRes.ok) {
      const errText = await botRes.text();
      console.error("[meta-webhook] bot-handler error:", botRes.status, errText);
      return;
    }

    const botData = await botRes.json();
    console.log("[meta-webhook] bot-handler response:", { nextState: botData.nextState, hasMessage: !!botData.message });

    if (!botData.message) return;

    // 2) Format message — append numbered options if present
    let fullMessage: string = botData.message;
    if (Array.isArray(botData.options) && botData.options.length > 0) {
      const optLines = (botData.options as string[])
        .map((opt, i) => `${i + 1}. ${opt}`)
        .join("\n");
      fullMessage = `${fullMessage}\n\n${optLines}`;
    }

    // 3) Send via messaging-gateway
    const gwRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        "x-internal-secret": internalSecret,
        apikey: anonKey,
      },
      body: JSON.stringify({
        to: fromPhone,
        body: fullMessage,
        type: "generic",
        ...(patientId ? { patientId } : {}),
      }),
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text();
      console.error("[meta-webhook] messaging-gateway error:", gwRes.status, errText);
    } else {
      console.log("[meta-webhook] Bot response sent to:", fromPhone);
    }
  } catch (err) {
    console.error("[meta-webhook] routeToBotHandler unexpected error:", err);
  }
}

// ---------------------------------------------------------------------------
// Status update handling
// ---------------------------------------------------------------------------

// Forward-only progression: higher rank = further along delivery lifecycle
const STATUS_RANK: Record<string, number> = {
  sent: 1,
  failed: 1,
  delivered: 2,
  read: 3,
};

async function handleStatusUpdate(
  supabase: ReturnType<typeof createClient>,
  status: MetaStatus,
): Promise<void> {
  console.log("[meta-webhook] Status update:", status.id, "->", status.status);

  // Map Meta statuses to our status values
  const statusMap: Record<string, string> = {
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
  };

  const mappedStatus = statusMap[status.status] || status.status;

  // Forward-only: fetch current status and skip if we'd go backwards
  const { data: currentLog } = await supabase
    .from("message_logs")
    .select("status")
    .eq("provider_message_id", status.id)
    .maybeSingle();

  if (currentLog) {
    const currentRank = STATUS_RANK[currentLog.status] ?? 0;
    const newRank = STATUS_RANK[mappedStatus] ?? 0;
    if (newRank < currentRank) {
      console.log("[meta-webhook] Skipping backward status:", currentLog.status, "->", mappedStatus);
      return;
    }
  }

  const updatePayload: Record<string, unknown> = {
    status: mappedStatus,
  };

  // Add error info if failed
  if (status.status === "failed" && status.errors?.length) {
    updatePayload.error_code = String(status.errors[0].code);
    updatePayload.error_message = status.errors[0].title;
  }

  const { error } = await supabase
    .from("message_logs")
    .update(updatePayload)
    .eq("provider_message_id", status.id);

  if (error) {
    console.error("[meta-webhook] Error updating message status:", error);
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ---- GET: Webhook verification ----
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

    if (mode === "subscribe" && token && token === verifyToken) {
      console.log("[meta-webhook] Verification successful");
      return new Response(challenge || "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn("[meta-webhook] Verification failed. mode:", mode);
    return new Response("Forbidden", { status: 403 });
  }

  // ---- POST: Incoming messages & statuses ----
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    // 1) Validate HMAC signature
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appSecret) {
      console.error("[meta-webhook] META_APP_SECRET not configured");
      return jsonResponse(500, { error: "Server configuration error" });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("X-Hub-Signature-256");

    const isValid = await validateSignature(rawBody, signature, appSecret);
    if (!isValid) {
      console.error("[meta-webhook] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // 2) Parse payload
    const payload: MetaWebhookPayload = JSON.parse(rawBody);

    if (payload.object !== "whatsapp_business_account") {
      return new Response("OK", { status: 200 });
    }

    // 3) Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[meta-webhook] Missing Supabase env vars");
      return jsonResponse(500, { error: "Server configuration error" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3.5) Resolve whatsapp_line from webhook metadata (for org/line context in logs)
    let activeLineId: string | undefined;
    let activeLineOrgId: string | undefined;
    let activeLineBotEnabled = false;
    const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (phoneNumberId) {
      const { data: wline } = await supabase
        .from("whatsapp_lines")
        .select("id, organization_id, bot_enabled")
        .eq("meta_phone_number_id", phoneNumberId)
        .eq("is_active", true)
        .maybeSingle();
      activeLineId = wline?.id;
      activeLineOrgId = wline?.organization_id ?? undefined;
      activeLineBotEnabled = wline?.bot_enabled ?? false;
      console.log("[meta-webhook] Resolved line:", activeLineId, "org:", activeLineOrgId, "botEnabled:", activeLineBotEnabled);
    }

    // 4) Process all entries — messages and statuses run in parallel per change
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const tasks: Promise<void>[] = [];

        if (value.messages) {
          for (const message of value.messages) {
            tasks.push(handleIncomingMessage(supabase, value.metadata, message, value.contacts, activeLineId, activeLineOrgId, activeLineBotEnabled));
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            tasks.push(handleStatusUpdate(supabase, status));
          }
        }

        await Promise.allSettled(tasks);
      }
    }

    // Meta expects 200 quickly to avoid retries
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[meta-webhook] Unexpected error:", error);
    // Still return 200 to Meta to prevent retries on our errors
    return new Response("OK", { status: 200 });
  }
});
