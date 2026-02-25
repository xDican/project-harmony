import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createHmac, timingSafeEqual } from "node:crypto";

const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_WEBHOOK_URL = Deno.env.get("TWILIO_WEBHOOK_URL") || ""; // exact URL configured in Twilio
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const INTERNAL_FUNCTION_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

// Template para paciente cuando pide reagendar
const TWILIO_TEMPLATE_RESCHEDULE_PATIENT = Deno.env.get("TWILIO_TEMPLATE_RESCHEDULE_PATIENT") || "";
// NEW: Template para paciente cuando confirma la cita
const TWILIO_TEMPLATE_CONFIRMATION_PATIENT = Deno.env.get("TWILIO_TEMPLATE_CONFIRMATION_PATIENT") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_STATUSES = ["agendada", "confirmada", "pending", "confirmed"];

type MessageIntent = "confirm" | "reschedule" | "unknown";

function parseFormUrlEncoded(rawBody: string): Record<string, string> {
  const out: Record<string, string> = {};
  const sp = new URLSearchParams(rawBody);
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}

function computeTwilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  let data = url;
  for (const k of keys) data += k + (params[k] ?? "");
  const hmac = createHmac("sha1", authToken);
  hmac.update(data, "utf8");
  return hmac.digest("base64");
}

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ua = enc.encode(a);
  const ub = enc.encode(b);
  if (ua.length !== ub.length) return false;
  return timingSafeEqual(ua, ub);
}

function getCanonicalWebhookUrl(req: Request): string {
  if (TWILIO_WEBHOOK_URL) return TWILIO_WEBHOOK_URL;

  if (SUPABASE_URL) {
    const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
    return `https://${projectRef}.supabase.co/functions/v1/whatsapp-inbound-webhook`;
  }

  const u = new URL(req.url);
  return `${u.protocol}//${u.host}${u.pathname}`;
}

function normalizeToLocalHN(phone: string): string {
  // returns 8-digit local number (e.g., "33899824")
  if (!phone) return "";
  let p = phone.toLowerCase().replace(/^whatsapp:/, "").trim();
  p = p.replace(/\D/g, "");

  // remove leading country code 504 if present
  if (p.startsWith("504") && p.length >= 11) {
    p = p.slice(3);
  }

  if (p.length > 8) p = p.slice(-8);
  return p;
}

function toWhatsAppHN(phone8: string): string {
  const digits = (phone8 || "").replace(/\D/g, "");
  if (!digits) return "";
  return `whatsapp:+504${digits}`;
}

function detectIntent(params: Record<string, string>): MessageIntent {
  const payload = (params.ButtonPayload || "").toLowerCase().trim();
  const buttonText = (params.ButtonText || "").toLowerCase().trim();
  const body = (params.Body || "").toLowerCase().trim();

  const haystack = [payload, buttonText, body].filter(Boolean).join(" ");

  if (haystack.includes("confirm")) return "confirm";
  if (haystack.includes("reagend") || haystack.includes("resched") || haystack.includes("cambiar")) return "reschedule";

  if (haystack === "si" || haystack === "sí" || haystack.includes(" si ")) return "confirm";

  return "unknown";
}

/**
 * Extracts appointmentId from ButtonPayload if present.
 * The ButtonPayload format can be:
 * - "confirm_<appointmentId>" or "reschedule_<appointmentId>"
 * - Just a UUID directly
 * - Or the appointmentId might be in a different format depending on template config
 */
function extractAppointmentIdFromPayload(params: Record<string, string>): string | null {
  const payload = (params.ButtonPayload || "").trim();

  if (!payload) return null;

  // Check if it's a UUID pattern (with or without prefix)
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = payload.match(uuidRegex);

  if (match) {
    return match[0];
  }

  return null;
}

/**
 * Formats bot message with numbered options
 */
function formatBotMessage(text: string, options?: string[]): string {
  if (!options || options.length === 0) return text;

  const menuText = options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n');
  return `${text}\n\n${menuText}\n\nResponde con el número de tu opción.`;
}

/**
 * EXISTENTE: notifica al doctor (se mantiene igual para NO romper tu flujo).
 */
async function notifyDoctorReschedule(params: {
  supabaseUrl: string;
  internalSecret: string;
  doctorPhone8: string;
  patientName: string;
  patientPhone8: string;
  appointmentAt: string | null;
  appointmentId: string;
  patientId: string;
  doctorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const projectRef = new URL(params.supabaseUrl).hostname.split(".")[0];
    const functionsBaseUrl = `https://${projectRef}.supabase.co/functions/v1`;

    const to = toWhatsAppHN(params.doctorPhone8);

    const payload = {
      to,
      type: "reschedule",
      templateParams: {
        "1": params.patientName,
        "2": params.patientPhone8,
      },
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      doctorId: params.doctorId,
    };

    const resp = await fetch(`${functionsBaseUrl}/send-whatsapp-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": params.internalSecret,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data.ok) {
      return { ok: false, error: data.error || `HTTP ${resp.status}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * EXISTENTE: notifica al paciente cuando pide reagendar
 */
async function notifyPatientReschedule(params: {
  supabaseUrl: string;
  internalSecret: string;
  patientPhone8: string;
  patientName: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const projectRef = new URL(params.supabaseUrl).hostname.split(".")[0];
    const functionsBaseUrl = `https://${projectRef}.supabase.co/functions/v1`;

    const to = toWhatsAppHN(params.patientPhone8);

    if (!TWILIO_TEMPLATE_RESCHEDULE_PATIENT) {
      return { ok: false, error: "Missing TWILIO_TEMPLATE_RESCHEDULE_PATIENT" };
    }

    const payload = {
      to,
      type: "generic",
      templateName: TWILIO_TEMPLATE_RESCHEDULE_PATIENT, // ContentSid
      templateParams: {
        "1": params.patientName, // {{1}} = nombre del paciente
      },
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      doctorId: params.doctorId,
    };

    const resp = await fetch(`${functionsBaseUrl}/send-whatsapp-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": params.internalSecret,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data.ok) {
      return { ok: false, error: data.error || `HTTP ${resp.status}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * NEW: notifica al paciente cuando CONFIRMA la cita
 * Requisito: {{1}} = hora de la cita (formato personalizable)
 * Usa type:"generic" + templateName (ContentSid) + templateParams
 */
async function notifyPatientConfirmation(params: {
  supabaseUrl: string;
  internalSecret: string;
  patientPhone8: string;
  appointmentAt: string | null;
  appointmentId: string;
  patientId: string;
  doctorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const projectRef = new URL(params.supabaseUrl).hostname.split(".")[0];
    const functionsBaseUrl = `https://${projectRef}.supabase.co/functions/v1`;

    const to = toWhatsAppHN(params.patientPhone8);

    if (!TWILIO_TEMPLATE_CONFIRMATION_PATIENT) {
      return { ok: false, error: "Missing TWILIO_TEMPLATE_CONFIRMATION_PATIENT" };
    }

    // Formatear la hora de la cita
    let formattedTime = "su cita";
    if (params.appointmentAt) {
      const appointmentDate = new Date(params.appointmentAt);
      // Formato: "HH:MM AM/PM" sin conversión de timezone (la BD ya tiene la hora correcta)
      const options: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };
      formattedTime = appointmentDate.toLocaleString("es-HN", options);
    }

    const payload = {
      to,
      type: "generic",
      templateName: TWILIO_TEMPLATE_CONFIRMATION_PATIENT, // ContentSid del template de confirmación
      templateParams: {
        "1": formattedTime, // {{1}} = hora de la cita formateada
      },
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      doctorId: params.doctorId,
    };

    const resp = await fetch(`${functionsBaseUrl}/send-whatsapp-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": params.internalSecret,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data.ok) {
      return { ok: false, error: data.error || `HTTP ${resp.status}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, message: "whatsapp-inbound-webhook alive" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    if (!TWILIO_AUTH_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Missing TWILIO_AUTH_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const params = parseFormUrlEncoded(rawBody);

    const twilioSignature = req.headers.get("x-twilio-signature") || "";
    const webhookUrl = getCanonicalWebhookUrl(req);
    const expectedSignature = computeTwilioSignature(TWILIO_AUTH_TOKEN, webhookUrl, params);

    if (!constantTimeEqual(twilioSignature, expectedSignature)) {
      console.error(
        "[whatsapp-inbound-webhook] Signature mismatch",
        JSON.stringify({
          received: twilioSignature,
          expected: expectedSignature,
          webhookUrl,
        })
      );
      return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[whatsapp-inbound-webhook] Signature verified. Params:", JSON.stringify(params, null, 2));

    const bodyText = params.Body || "";
    const fromRaw = params.From || "";
    const toRaw = params.To || "";

    const fromLocal = normalizeToLocalHN(fromRaw);
    const fromWhatsApp = toWhatsAppHN(fromLocal);
    const toLocal = normalizeToLocalHN(toRaw);
    const toWhatsApp = toWhatsAppHN(toLocal);

    const intent = detectIntent(params);
    console.log("[whatsapp-inbound-webhook] Detected intent:", intent, "from:", fromLocal);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Missing Supabase config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ===== Multi-tenant: resolve whatsapp_line from TO number =====
    let resolvedWhatsappLine: any = null;
    let resolvedOrgId: string | null = null;
    let resolvedLineId: string | null = null;

    // The TO number is the WhatsApp number this message was sent to (our number)
    // phone_number in whatsapp_lines is stored as E.164 (e.g., +50493133496)
    const toE164 = `+504${toLocal}`;
    const { data: lineData } = await supabase
      .from("whatsapp_lines")
      .select("id, organization_id, bot_enabled, bot_greeting")
      .eq("phone_number", toE164)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (lineData) {
      resolvedWhatsappLine = lineData;
      resolvedOrgId = lineData.organization_id;
      resolvedLineId = lineData.id;
      console.log("[whatsapp-inbound-webhook] Resolved whatsapp_line:", resolvedLineId, "org:", resolvedOrgId);
    } else {
      console.log("[whatsapp-inbound-webhook] No whatsapp_line found for TO:", toE164, "- using legacy behavior");
    }
    // ===== End multi-tenant resolution =====

    // ===== Bot routing: Check if bot is enabled for this line =====
    if (lineData && lineData.bot_enabled && resolvedOrgId) {
      console.log("[whatsapp-inbound-webhook] Bot enabled, routing to bot-handler");

      try {
        // Call bot-handler edge function directly via fetch
        const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
        const botHandlerUrl = `https://${projectRef}.supabase.co/functions/v1/bot-handler`;

        const botResponse = await fetch(botHandlerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'x-internal-secret': INTERNAL_FUNCTION_SECRET,
          },
          body: JSON.stringify({
            whatsappLineId: resolvedLineId,
            patientPhone: "+504" + fromLocal,
            messageText: bodyText,
            organizationId: resolvedOrgId,
          }),
        });

        if (!botResponse.ok) {
          const errorText = await botResponse.text();
          console.error("[whatsapp-inbound-webhook] Bot-handler error:", botResponse.status, errorText);
          // Fallback to legacy flow
        } else {
          const botData = await botResponse.json();
          console.log("[whatsapp-inbound-webhook] Bot response:", botData);

          // Format bot message with options if present
          const formattedMessage = formatBotMessage(botData.message, botData.options);

          // Send bot response via send-whatsapp-message
          const sendWhatsAppUrl = `https://${projectRef}.supabase.co/functions/v1/send-whatsapp-message`;
          const sendResponse = await fetch(sendWhatsAppUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': INTERNAL_FUNCTION_SECRET,
            },
            body: JSON.stringify({
              to: fromWhatsApp,
              body: formattedMessage,  // Changed from 'message' to 'body'
              type: 'generic',
              whatsappLineId: resolvedLineId,
              organizationId: resolvedOrgId,
            }),
          });

          if (!sendResponse.ok) {
            const errorText = await sendResponse.text();
            console.error("[whatsapp-inbound-webhook] Error sending bot response:", sendResponse.status, errorText);
          }

          // Log inbound message
          await supabase.from("message_logs").insert({
            organization_id: resolvedOrgId,
            whatsapp_line_id: resolvedLineId,
            to: fromLocal,
            message: bodyText,
            type: "inbound_bot",
            status: "received",
            direction: "inbound",
          });

          return new Response(JSON.stringify({ ok: true, botHandled: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (botError) {
        console.error("[whatsapp-inbound-webhook] Bot handler exception:", botError);
        // Continue to legacy flow
      }
    }
    // ===== End bot routing =====

    let patient: any = null;
    let appointment: any = null;

    // NEW: Try to extract appointmentId from ButtonPayload first
    const payloadAppointmentId = extractAppointmentIdFromPayload(params);
    console.log("[whatsapp-inbound-webhook] Extracted appointmentId from payload:", payloadAppointmentId);

    // If we have an appointmentId from the payload, search directly by ID
    if (payloadAppointmentId) {
      const { data: apptById, error: apptByIdError } = await supabase
        .from("appointments")
        .select("id, doctor_id, patient_id, status, appointment_at, reschedule_notified_at")
        .eq("id", payloadAppointmentId)
        .limit(1);

      if (apptByIdError) {
        console.error("[whatsapp-inbound-webhook] Error fetching appointment by ID:", apptByIdError);
      } else if (apptById && apptById.length > 0) {
        appointment = apptById[0];
        console.log("[whatsapp-inbound-webhook] Appointment found by payload ID:", appointment.id, "status:", appointment.status);

        // Also fetch the patient associated with this appointment
        if (appointment.patient_id) {
          const { data: patFromAppt, error: patFromApptError } = await supabase
            .from("patients")
            .select("id, name")
            .eq("id", appointment.patient_id)
            .limit(1);

          if (patFromApptError) {
            console.error("[whatsapp-inbound-webhook] Error fetching patient from appointment:", patFromApptError);
          } else {
            patient = (patFromAppt && patFromAppt.length > 0) ? patFromAppt[0] : null;
            if (patient) {
              console.log("[whatsapp-inbound-webhook] Patient found from appointment:", patient.id, patient.name);
            }
          }
        }
      } else {
        console.log("[whatsapp-inbound-webhook] No appointment found for payload ID:", payloadAppointmentId);
      }
    }

    // Fallback: If no appointment found by payload ID, try the old method (by phone -> patient -> appointment)
    if (!appointment && fromLocal.length === 8) {
      const { data: patData, error: patError } = await supabase
        .from("patients")
        .select("id, name")
        .eq("phone", "+504" + fromLocal)
        .limit(1);

      if (patError) {
        console.error("[whatsapp-inbound-webhook] Error fetching patient:", patError);
      } else {
        patient = (patData && patData.length > 0) ? patData[0] : null;
        if (patient) {
          console.log("[whatsapp-inbound-webhook] Patient found by phone:", patient.id, patient.name);
        } else {
          console.log("[whatsapp-inbound-webhook] No patient found for phone:", fromLocal);
        }
      }

      if (patient?.id) {
        const { data: appt, error: apptError } = await supabase
          .from("appointments")
          .select("id, doctor_id, patient_id, status, appointment_at, reschedule_notified_at")
          .eq("patient_id", patient.id)
          .in("status", ACTIVE_STATUSES)
          .order("created_at", { ascending: false })
          .limit(1);

        if (apptError) {
          console.error("[whatsapp-inbound-webhook] Error finding appointment by patient:", apptError);
        } else {
          appointment = (appt && appt.length > 0) ? appt[0] : null;
          if (appointment) {
            console.log("[whatsapp-inbound-webhook] Appointment found by patient fallback:", appointment.id);
          }
        }
      }
    }

    // -------------------------
    // Log inbound message always
    // -------------------------
    const messageSid = params.MessageSid || params.SmsMessageSid || null;

    const logPayload = {
      direction: "inbound",
      channel: "whatsapp",

      // canonical phones
      from_phone: fromWhatsApp || null,
      to_phone: toWhatsApp || null,

      body: bodyText || null,
      type: "patient_reply",
      status: "received",

      appointment_id: appointment?.id || null,
      patient_id: patient?.id || null,
      doctor_id: appointment?.doctor_id || null,

      provider: "twilio",
      provider_message_id: messageSid,

      // inbound should always be billed
      billable: true,
      unit_price: 0.005,
      total_price: 0.005,
      price_category: "inbound",

      // Multi-tenant
      organization_id: resolvedOrgId || null,
      whatsapp_line_id: resolvedLineId || null,

      raw_payload: params,
    };

    const { error: logError } = await supabase.from("message_logs").insert(logPayload);
    if (logError) {
      console.error("[whatsapp-inbound-webhook] Error inserting message log:", logError);
    }

    // -------------------------
    // Update appointment status + notify
    // -------------------------
    let updated = false;
    let newStatus: string | null = null;

    let rescheduleNotified = false;
    let rescheduleNotifySkipped = false;
    let rescheduleNotifyError: string | null = null;

    let patientRescheduleNotified = false;
    let patientRescheduleNotifyError: string | null = null;

    // NEW: flags para confirmación del paciente
    let patientConfirmationNotified = false;
    let patientConfirmationNotifyError: string | null = null;

    if (appointment?.id && intent !== "unknown") {
      if (intent === "confirm") newStatus = "confirmada";
      if (intent === "reschedule") newStatus = "reagendar";

      // ========== CONFIRM FLOW ==========
      if (newStatus === "confirmada") {
        const { error: updError } = await supabase
          .from("appointments")
          .update({ status: newStatus })
          .eq("id", appointment.id);

        if (updError) {
          console.error("[whatsapp-inbound-webhook] Error updating appointment:", updError);
        } else {
          updated = true;
          console.log("[whatsapp-inbound-webhook] Appointment updated:", appointment.id, "->", newStatus);

          // NEW: Enviar template de confirmación al paciente
          if (!INTERNAL_FUNCTION_SECRET) {
            patientConfirmationNotifyError = "Missing INTERNAL_FUNCTION_SECRET";
            console.error("[whatsapp-inbound-webhook] Missing INTERNAL_FUNCTION_SECRET; cannot notify patient confirmation");
          } else {
            const confirmNotify = await notifyPatientConfirmation({
              supabaseUrl: SUPABASE_URL,
              internalSecret: INTERNAL_FUNCTION_SECRET,
              patientPhone8: fromLocal,
              appointmentAt: appointment.appointment_at || null,
              appointmentId: appointment.id,
              patientId: patient.id,
              doctorId: appointment.doctor_id,
            });

            if (confirmNotify.ok) {
              patientConfirmationNotified = true;
              console.log("[whatsapp-inbound-webhook] Patient notified (confirmation). Appointment:", appointment.id);
            } else {
              patientConfirmationNotifyError = confirmNotify.error || "Unknown confirmation notify error";
              console.error("[whatsapp-inbound-webhook] Failed to notify patient confirmation:", patientConfirmationNotifyError);
            }
          }
        }
      }

      // ========== RESCHEDULE FLOW (sin cambios) ==========
      if (newStatus === "reagendar") {
        const nowIso = new Date().toISOString();

        const { data: updatedRows, error: updError } = await supabase
          .from("appointments")
          .update({ status: "reagendar", reschedule_notified_at: nowIso })
          .eq("id", appointment.id)
          .is("reschedule_notified_at", null)
          .select("id, doctor_id, patient_id, appointment_at");

        if (updError) {
          console.error("[whatsapp-inbound-webhook] Error updating appointment to reagendar:", updError);
        } else {
          if (!updatedRows || updatedRows.length === 0) {
            rescheduleNotifySkipped = true;

            const { error: statusOnlyErr } = await supabase
              .from("appointments")
              .update({ status: "reagendar" })
              .eq("id", appointment.id);

            if (statusOnlyErr) {
              console.error("[whatsapp-inbound-webhook] Error ensuring status reagendar:", statusOnlyErr);
            } else {
              updated = true;
              console.log("[whatsapp-inbound-webhook] Appointment status ensured:", appointment.id, "-> reagendar (notify skipped)");
            }
          } else {
            updated = true;
            console.log("[whatsapp-inbound-webhook] Appointment updated:", appointment.id, "-> reagendar (notify will send)");

            if (!INTERNAL_FUNCTION_SECRET) {
              rescheduleNotifyError = "Missing INTERNAL_FUNCTION_SECRET";
              console.error("[whatsapp-inbound-webhook] Missing INTERNAL_FUNCTION_SECRET; cannot notify doctor/patient");
            } else {
              const doctorId = updatedRows[0].doctor_id;

              const { data: doctorRows, error: doctorError } = await supabase
                .from("doctors")
                .select("id, phone")
                .eq("id", doctorId)
                .limit(1);

              if (doctorError) {
                rescheduleNotifyError = "Error fetching doctor";
                console.error("[whatsapp-inbound-webhook] Error fetching doctor:", doctorError);
              } else {
                const doctor = (doctorRows && doctorRows.length > 0) ? doctorRows[0] : null;

                if (!doctor?.phone) {
                  rescheduleNotifyError = "Doctor has no phone";
                  console.error("[whatsapp-inbound-webhook] Doctor has no phone:", doctorId);
                } else {
                  // 1) Notify doctor (existing)
                  const notify = await notifyDoctorReschedule({
                    supabaseUrl: SUPABASE_URL,
                    internalSecret: INTERNAL_FUNCTION_SECRET,
                    doctorPhone8: String(doctor.phone),
                    patientName: patient?.name || "Paciente",
                    patientPhone8: fromLocal,
                    appointmentAt: updatedRows[0].appointment_at || null,
                    appointmentId: appointment.id,
                    patientId: patient.id,
                    doctorId: doctorId,
                  });

                  if (notify.ok) {
                    rescheduleNotified = true;
                    console.log("[whatsapp-inbound-webhook] Doctor notified (reschedule). Appointment:", appointment.id);
                  } else {
                    rescheduleNotifyError = notify.error || "Unknown notify error";
                    console.error("[whatsapp-inbound-webhook] Failed to notify doctor:", rescheduleNotifyError);
                  }

                  // 2) Notify patient (existing)
                  const patientNotify = await notifyPatientReschedule({
                    supabaseUrl: SUPABASE_URL,
                    internalSecret: INTERNAL_FUNCTION_SECRET,
                    patientPhone8: fromLocal,
                    patientName: patient?.name || "Paciente",
                    appointmentId: appointment.id,
                    patientId: patient.id,
                    doctorId: doctorId,
                  });

                  if (patientNotify.ok) {
                    patientRescheduleNotified = true;
                    console.log("[whatsapp-inbound-webhook] Patient notified (reschedule). Appointment:", appointment.id);
                  } else {
                    patientRescheduleNotifyError = patientNotify.error || "Unknown patient notify error";
                    console.error("[whatsapp-inbound-webhook] Failed to notify patient:", patientRescheduleNotifyError);
                  }
                }
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        intent,
        fromLocal,
        fromWhatsApp,
        patientFound: !!patient,
        appointmentFound: !!appointment,
        appointmentUpdated: updated,
        newStatus,

        // NEW: appointment lookup debug
        payloadAppointmentId: payloadAppointmentId || null,
        appointmentId: appointment?.id || null,

        // reschedule debug (doctor)
        rescheduleNotified,
        rescheduleNotifySkipped,
        rescheduleNotifyError,

        // reschedule debug (patient)
        patientRescheduleNotified,
        patientRescheduleNotifyError,

        // NEW: confirmation debug (patient)
        patientConfirmationNotified,
        patientConfirmationNotifyError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[whatsapp-inbound-webhook] Unexpected error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
