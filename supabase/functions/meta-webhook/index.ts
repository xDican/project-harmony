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
import {
  getOrCreateConversation,
  updateConversationOnInbound,
  updateConversationOnOutbound,
} from "../_shared/conversations.ts";
import {
  persistInboundMessage,
  persistOutboundMessage,
  extractMediaFromMetaMessage,
} from "../_shared/inbox-messages.ts";
import { processCallEvent, type MetaCallEvent } from "../_shared/calls.ts";

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
  calls?: MetaCallEvent[];
  // Coexistence: mensajes que el negocio envia desde la WhatsApp Business App del
  // celular llegan aqui como "echoes" (field='smb_message_echoes'). Misma forma que
  // MetaMessage pero con `to` (el paciente) y `from` = el negocio.
  message_echoes?: MetaMessage[];
}

interface MetaContact {
  profile: { name: string };
  wa_id: string;
}

interface MetaMessage {
  id: string;
  from: string;
  /** Solo presente en echoes (smb_message_echoes): el paciente destinatario. */
  to?: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text: string; payload: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  // Multimedia (Sprint 1) — preservamos en message_logs.media_url/mime
  image?: { id: string; mime_type?: string; caption?: string };
  audio?: { id: string; mime_type?: string; voice?: boolean };
  document?: { id: string; mime_type?: string; filename?: string; caption?: string };
  video?: { id: string; mime_type?: string; caption?: string };
}

interface MetaStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

// Intent patterns (Spanish) — same as whatsapp-inbound-webhook
const CONFIRM_PATTERNS = ["confirm", "confirmar", "ahi estare", "ahí estaré", "estare", "estaré", "confirmo"];
const CANCEL_PATTERNS = ["no puedo", "cancelar", "cancelo"];
const RESCHEDULE_PATTERNS = ["reagend", "reagendar", "cambiar"];
const ACTIVE_STATUSES = ["agendada", "pending", "confirmada", "confirmed"];

type MessageIntent = "confirm" | "reschedule" | "cancel" | "unknown";

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

  // Cancel BEFORE confirm to avoid "asistir".includes("si") false positive
  for (const p of CANCEL_PATTERNS) {
    if (lower.includes(p)) return "cancel";
  }
  for (const p of CONFIRM_PATTERNS) {
    if (lower.includes(p)) return "confirm";
  }
  for (const p of RESCHEDULE_PATTERNS) {
    if (lower.includes(p)) return "reschedule";
  }
  // "si" as whole word only (same pattern as whatsapp-inbound-webhook)
  if (lower === "si" || lower === "sí" || lower.includes(" si ") || lower.includes(" sí ")) return "confirm";
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

/**
 * Sprint 6 — Procesa el accept/reject del paciente a una solicitud de
 * call_permission_request. Meta lo envia como interactive message:
 *   interactive.type = 'call_permission_reply'
 *   interactive.call_permission_reply = { response: 'accept'|'reject', is_permanent: bool, response_source: string }
 *
 * Inserta una fila en call_permissions y NO pasa al bot (es un evento del sistema,
 * no un mensaje de chat).
 */
async function handleCallPermissionReply(
  supabase: ReturnType<typeof createClient>,
  message: MetaMessage,
  fromPhone: string,
  contactName: string | undefined,
  lineId: string,
  lineOrgId: string,
): Promise<void> {
  const reply = (message.interactive as any)?.call_permission_reply;
  if (!reply) {
    console.warn("[meta-webhook] call_permission_reply payload missing");
    return;
  }

  const isAccept = reply.response === "accept";
  const isPermanent = reply.is_permanent === true;
  const status = isAccept ? "granted" : "rejected";

  // Para is_permanent dejamos expires_at NULL → el check del frontend
  // interpreta "sin expiry" como vigente. Si Meta enviara expiration_timestamp
  // futuro lo usaremos, sino +7 dias como guard (limite Meta default).
  let expiresAt: string | null = null;
  if (isAccept) {
    if (isPermanent) {
      expiresAt = null;
    } else if (reply.expiration_timestamp) {
      expiresAt = new Date(Number(reply.expiration_timestamp) * 1000).toISOString();
    } else {
      // Default Meta: 7 dias desde el accept
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  // Resolver conversation (debe existir, paciente nos escribio previamente
  // al menos para que mandemos la solicitud)
  const conversation = await getOrCreateConversation(supabase, {
    whatsappLineId: lineId,
    organizationId: lineOrgId,
    patientPhone: fromPhone,
    patientName: contactName ?? null,
  });

  if (!conversation) {
    console.error("[meta-webhook] call_permission_reply: cannot resolve conversation");
    return;
  }

  // Persistir el mensaje en message_logs como tipo system (para audit, no se
  // muestra al bot), con body descriptivo + raw_payload completo.
  await supabase.from("message_logs").insert({
    organization_id: lineOrgId,
    whatsapp_line_id: lineId,
    conversation_id: conversation.id,
    direction: "inbound",
    channel: "whatsapp",
    provider: "meta",
    source: "system",
    message_type: "system",
    from_phone: fromPhone,
    to_phone: "",
    body: isAccept
      ? `Paciente aceptó permiso de llamadas (${isPermanent ? "permanente" : "temporal"})`
      : "Paciente rechazó permiso de llamadas",
    provider_message_id: message.id,
    raw_payload: message,
    status: "received",
    billable: false,
  });

  // Insertar en call_permissions
  const { error: permErr } = await supabase.from("call_permissions").insert({
    organization_id: lineOrgId,
    conversation_id: conversation.id,
    status,
    granted_at: isAccept ? new Date().toISOString() : null,
    expires_at: expiresAt,
    source: "call_permission_request",
    raw_event: reply,
  });

  if (permErr) {
    console.error("[meta-webhook] call_permissions insert failed:", permErr.message);
    return;
  }

  console.log(
    "[meta-webhook] call_permission_reply persisted. conv:",
    conversation.id,
    "status:", status,
    "permanent:", isPermanent,
  );
}

/** Ventana para considerar un mensaje como "historico" durante el sync de coexistence. */
const HISTORICAL_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Coexistence: detecta mensajes del flood de historial inyectado tras el QR scan.
 * Meta NO envia un flag is_historical; el payload trae `timestamp` (Unix epoch en
 * SEGUNDOS, string). Si el mensaje es >5 min mas viejo que ahora, es historico.
 */
function isHistoricalMessage(message: MetaMessage): boolean {
  const tsSec = Number(message.timestamp);
  if (!Number.isFinite(tsSec) || tsSec <= 0) return false;
  return Date.now() - tsSec * 1000 > HISTORICAL_THRESHOLD_MS;
}

/**
 * Refresca el debounce del watchdog: cada mensaje historico recibido extiende la
 * ventana de sync. Cuando dejan de llegar por >5 min, el watchdog (cron) apaga
 * sync_in_progress.
 */
async function touchHistoricalSync(
  supabase: ReturnType<typeof createClient>,
  lineId?: string,
): Promise<void> {
  if (!lineId) return;
  const { error } = await supabase
    .from("whatsapp_lines")
    .update({ last_historical_webhook_at: new Date().toISOString() })
    .eq("id", lineId);
  if (error) console.warn("[meta-webhook] touchHistoricalSync failed:", error);
}

/**
 * Coexistence (B3): persiste un "echo" — un mensaje que el negocio envio desde la
 * WhatsApp Business App del celular — como outbound en el inbox de OrionCare, para
 * que la asistente vea sus propias respuestas del celular dentro de la plataforma.
 *
 * - Idempotente por provider_message_id: si OrionCare ya envio este mensaje via
 *   Cloud API (inbox-send), el log ya existe y NO se duplica.
 * - source='assistant': lo envio un humano desde el celular (no el bot).
 * - Historico (durante el sync): se persiste pero NO se actualiza last_message_at
 *   (no reordena el inbox con cientos de mensajes viejos) y refresca el debounce.
 * - Media: por ahora se guarda la referencia (meta-media:<id>) sin descargar el
 *   archivo. El texto/caption — el caso dominante — se ve perfecto. (Descargar el
 *   archivo de echos multimedia queda como mejora futura.)
 */
async function handleMessageEcho(
  supabase: ReturnType<typeof createClient>,
  echo: MetaMessage,
  lineId?: string,
  lineOrgId?: string,
  syncInProgress?: boolean,
): Promise<void> {
  if (!lineId || !lineOrgId) {
    console.warn("[meta-webhook] Echo sin lineId/orgId — skip:", echo.id);
    return;
  }

  const patientPhone = normalizeToE164(echo.to ?? "");
  const businessPhone = normalizeToE164(echo.from);
  if (!patientPhone) {
    console.warn("[meta-webhook] Echo sin destinatario (to) — skip:", echo.id);
    return;
  }

  // Idempotencia: echo re-entregado, o mensaje que OrionCare ya envio via API.
  const { data: existingLog } = await supabase
    .from("message_logs")
    .select("id")
    .eq("provider_message_id", echo.id)
    .maybeSingle();
  if (existingLog) {
    console.log("[meta-webhook] Echo ya registrado, skip:", echo.id);
    return;
  }

  const media = extractMediaFromMetaMessage(echo);
  const body = extractMessageText(echo) || media.caption || null;

  let patientId: string | undefined;
  const { data: p } = await supabase
    .from("patients")
    .select("id")
    .eq("phone", patientPhone)
    .limit(1)
    .maybeSingle();
  patientId = p?.id;

  // Conversacion nueva (la asistente inicio desde el celular) → human_active.
  // Si ya existe, conserva su status.
  const conversation = await getOrCreateConversation(supabase, {
    whatsappLineId: lineId,
    organizationId: lineOrgId,
    patientPhone,
    patientId: patientId ?? null,
    initialStatus: "human_active",
  });
  if (!conversation) {
    console.error("[meta-webhook] Echo: getOrCreateConversation null, skip:", echo.id);
    return;
  }

  await persistOutboundMessage(supabase, {
    conversationId: conversation.id,
    organizationId: lineOrgId,
    whatsappLineId: lineId,
    toPhone: patientPhone,
    fromPhone: businessPhone,
    body,
    source: "assistant",
    messageType: media.messageType,
    mediaUrl: media.mediaUrl,
    mediaMime: media.mediaMime,
    status: "sent",
    providerMessageId: echo.id,
    rawPayload: echo,
  });

  if (!!syncInProgress && isHistoricalMessage(echo)) {
    await touchHistoricalSync(supabase, lineId);
    console.log("[meta-webhook] Historical echo — persisted silently. conv:", conversation.id, "msg:", echo.id);
    return;
  }

  await updateConversationOnOutbound(supabase, conversation.id);
  console.log("[meta-webhook] Echo (asistente desde celular) persisted. conv:", conversation.id, "msg:", echo.id);
}

async function handleIncomingMessage(
  supabase: ReturnType<typeof createClient>,
  metadata: MetaChangeValue["metadata"],
  message: MetaMessage,
  contacts: MetaContact[] | undefined,
  lineId?: string,
  lineOrgId?: string,
  botEnabled?: boolean,
  syncInProgress?: boolean,
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

  // Coexistence: durante la ventana de sync (sync_in_progress), los mensajes
  // viejos son el flood de historial inyectado por Meta. Se persisten para que
  // aparezcan en el inbox, pero NO disparan bot / transcripcion / notificaciones
  // / acciones de botones (confirmar cita, permiso de llamada). El gate combina
  // sync_in_progress (de la linea) + edad del mensaje, para que fuera de un sync
  // un mensaje legitimamente atrasado SIEMPRE reciba procesamiento normal.
  const isHistorical = !!syncInProgress && isHistoricalMessage(message);

  // Sprint 6: Call permission reply — Meta envia el accept/reject del paciente
  // como mensaje interactivo type='call_permission_reply' (NO en value.calls[]).
  // Lo procesamos aqui y NO lo pasamos al bot (sino el bot responderia confundido
  // a un "mensaje vacio"). Un permiso historico re-inyectado se ignora.
  if (
    message.type === "interactive" &&
    (message.interactive as any)?.type === "call_permission_reply" &&
    lineId && lineOrgId &&
    !isHistorical
  ) {
    await handleCallPermissionReply(supabase, message, fromPhone, contactName, lineId, lineOrgId);
    return;
  }

  // CONVERSATION FLOW: always create/track conversations when we have a line.
  // Bot invocation is gated separately by botEnabled (below).
  // Exception: "Confirmar" button with appointmentId stays in legacy flow
  // (updates status + sends patient_confirmed ack).
  if (lineId && lineOrgId) {
    const intent = detectIntent(body);

    if (intent === "confirm" && appointmentIdFromPayload && !isHistorical) {
      // Confirmar → fall through to legacy flow below
      // (un "Confirmar" historico re-inyectado NO debe mutar la cita: cae al
      //  tracking de conversacion y se persiste silenciosamente)
    } else {
      // Sprint 1: Conversation tracking + bot dual mode
      // Detect multimedia (image/audio/document) — Sprint 2 hara transcripcion + storage download.
      const media = extractMediaFromMetaMessage(message);
      const effectiveBody = body || media.caption || null;

      let patientIdForLog: string | undefined;
      if (fromPhone) {
        const { data: p } = await supabase
          .from("patients")
          .select("id")
          .eq("phone", fromPhone)
          .limit(1)
          .maybeSingle();
        patientIdForLog = p?.id;
      }

      // Get/create conversation
      const conversation = await getOrCreateConversation(supabase, {
        whatsappLineId: lineId,
        organizationId: lineOrgId,
        patientPhone: fromPhone,
        patientId: patientIdForLog ?? null,
        patientName: contactName ?? null,
        initialStatus: botEnabled ? "bot_active" : "human_active",
      });

      if (!conversation) {
        // Fallback: helper fallo (DB error). Log con el path legacy y seguimos.
        console.error("[meta-webhook] getOrCreateConversation returned null, falling back to legacy log");
        await logMessage(supabase, {
          direction: "inbound",
          toPhone,
          fromPhone,
          body: effectiveBody,
          type: "patient_reply",
          status: "received",
          provider: "meta",
          providerMessageId: message.id,
          patientId: patientIdForLog,
          organizationId: lineOrgId,
          whatsappLineId: lineId,
          rawPayload: message,
        });
        if (!isHistorical) {
          await routeToBotHandler(fromPhone, effectiveBody || "", lineId, lineOrgId, patientIdForLog, appointmentIdFromPayload ?? undefined);
        }
        return;
      }

      // Persistir inbound con conversation_id + source + message_type
      await persistInboundMessage(supabase, {
        conversationId: conversation.id,
        organizationId: lineOrgId,
        whatsappLineId: lineId,
        toPhone,
        fromPhone,
        body: effectiveBody,
        providerMessageId: message.id,
        messageType: media.messageType,
        mediaUrl: media.mediaUrl,
        mediaMime: media.mediaMime,
        patientId: patientIdForLog,
        rawPayload: message,
      });

      // Coexistence: mensaje historico → ya quedo persistido + conversacion creada.
      // Refrescamos el debounce del sync y cortamos ANTES de updateConversationOnInbound
      // (para NO inflar unread_count ni saltar la conversacion al tope con cada uno de
      // los cientos de mensajes del flood — quedan "silenciosos" en el inbox). Tampoco
      // se transcribe media (ahorra Whisper sobre 14 dias de historial) ni se invoca bot.
      if (isHistorical) {
        await touchHistoricalSync(supabase, lineId);
        console.log("[meta-webhook] Historical message (coexistence sync) — persisted, activity/bot/media/intent skipped. conv:", conversation.id, "msg:", message.id);
        return;
      }

      // Refresh activity (last_inbound_at, unread_count)
      await updateConversationOnInbound(supabase, conversation.id);

      // Sprint 2: si es multimedia, dispatch async para descargar + transcribir.
      // Fire-and-forget: NO await, no bloqueamos el webhook que debe responder
      // 200 a Meta en <5s.
      if (media.messageType !== "text" && media.mediaUrl) {
        dispatchProcessMediaAsync(supabase, {
          providerMessageId: message.id,
          mediaIdRaw: media.mediaUrl,
          messageType: media.messageType,
          organizationId: lineOrgId,
          conversationId: conversation.id,
          whatsappLineId: lineId,
        }).catch((e) => console.error("[meta-webhook] dispatchProcessMediaAsync failed:", e));
      }

      // Bot dual mode: si la asistente tomo la conversacion, el bot calla
      if (conversation.status === "human_active") {
        console.log("[meta-webhook] Bot silenced — human_active. conv:", conversation.id, "phone:", fromPhone);
        return;
      }

      // Bot disabled at line level — message stored in inbox, bot not invoked
      if (!botEnabled) {
        console.log("[meta-webhook] Bot disabled for line — message stored, no bot. conv:", conversation.id, "phone:", fromPhone);
        return;
      }

      // Filosofia bot-maximo-control: audios NO se procesan aqui — process-media-async
      // espera la transcripcion de Whisper y entonces invoca el bot. El bot responde al
      // paciente con texto basado en lo que dijo el audio. Asi el bot maneja audios sin
      // intervencion humana.
      // image/document con caption SI se procesan aqui (effectiveBody trae el caption).
      // text se procesa siempre.
      if (media.messageType === "audio") {
        console.log("[meta-webhook] Audio inbound — bot reply deferred to process-media-async. conv:", conversation.id);
        return;
      }

      // Bot activo → invoke bot-handler. conversationId se usa en Fase 2 para vincular outbound.
      await routeToBotHandler(
        fromPhone,
        effectiveBody || "",
        lineId,
        lineOrgId,
        patientIdForLog,
        appointmentIdFromPayload ?? undefined,
        conversation.id,
      );
      return;
    }
  }

  // Find patient by phone — DB stores all phones as E.164 (+504XXXXXXXX)
  let patient: { id: string; name: string } | null = null;
  if (fromPhone) {
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, phone")
      .eq("phone", fromPhone)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[meta-webhook] Error finding patient:", error);
    }
    patient = data;
    console.log("[meta-webhook] Patient lookup phone:", fromPhone, "found:", patient?.id ?? "none");
  }

  // Find appointment:
  // 1) Direct lookup by ID embedded in button payload (exact, preferred)
  // 2) Fall back to fuzzy search by patient + active status (legacy / freeform text)
  let appointment: { id: string; doctor_id: string; status: string; organization_id?: string } | null = null;

  if (appointmentIdFromPayload) {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, doctor_id, status, organization_id")
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
      .select("id, doctor_id, patient_id, status, appointment_at, organization_id")
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
    const updatePayload: Record<string, unknown> = {};

    if (intent === "confirm") {
      newStatus = "confirmada";
    } else if (intent === "cancel") {
      newStatus = "cancelada";
      updatePayload.notes = "Cancelada por paciente via WhatsApp";
    } else if (intent === "reschedule") {
      newStatus = "reagendar";
    }

    if (newStatus) {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: newStatus, ...updatePayload })
        .eq("id", appointment.id);

      if (updateError) {
        console.error("[meta-webhook] Error updating appointment:", updateError);
      } else {
        console.log("[meta-webhook] Appointment", appointment.id, "updated to:", newStatus);
      }

      // Send notification templates based on intent
      // Use appointment's org as fallback when line lookup fails (e.g. duplicate lines)
      const effectiveOrgId = lineOrgId || appointment.organization_id;
      await sendIntentNotification(supabase, intent, appointment, patient!, fromPhone, toPhone, effectiveOrgId);
    }
  }

  // Log a bot_conversation_logs para analytics V2 (Sprint 1 item 1.6)
  // Flujo legacy: paciente presiono boton "Confirmar"/"No puedo asistir" o escribio texto
  // que matcheo intent confirm/cancel/reschedule. Sin esto, esos eventos eran invisibles
  // en bot_conversation_logs (23 "No puedo asistir" sin contraparte en V2 14-28 Abr).
  if (intent !== "unknown" && lineId) {
    const effectiveOrgIdLog = lineOrgId || appointment?.organization_id || null;
    logBotInteractionFromLegacy(
      supabase, lineId, effectiveOrgIdLog, fromPhone, intent, body || "",
      appointment?.id || null,
    ).catch((err) => console.warn("[meta-webhook] Bot log failed (non-fatal):", err));
  }
}

/**
 * Logs a legacy-flow patient interaction (button click or text-matched intent) into
 * bot_conversation_logs so analytics V2 sees them. Creates a minimal bot_session if
 * none exists. Fire-and-forget — failure does not block the webhook response.
 */
async function logBotInteractionFromLegacy(
  supabase: ReturnType<typeof createClient>,
  lineId: string,
  orgId: string | null,
  patientPhone: string,
  intent: string,
  body: string,
  appointmentId: string | null,
): Promise<void> {
  if (!orgId) {
    console.warn("[meta-webhook] logBotInteractionFromLegacy: missing orgId, skipping");
    return;
  }

  // Find or create session
  const { data: existing } = await supabase
    .from("bot_sessions")
    .select("id")
    .eq("whatsapp_line_id", lineId)
    .eq("patient_phone", patientPhone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionId: string | null = (existing as { id?: string } | null)?.id || null;

  if (sessionId) {
    // Sesion existente: limpiar state stale. El paciente puede estar en booking_*,
    // cancel_confirm, etc. (caso real: texto libre "No puedo asistir" abre reschedule
    // y luego presiona boton del recordatorio). Sin esto, proximo mensaje cae en menu
    // equivocado con "Opcion no valida".
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    const { error: updErr } = await supabase
      .from("bot_sessions")
      .update({
        state: "completed",
        context: { source: "legacy_button", intent },
        last_message_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .eq("id", sessionId);
    if (updErr) {
      console.warn("[meta-webhook] Could not reset session state post-button:", updErr.message);
    }
  } else {
    const expiresAt = new Date(Date.now() + 60_000).toISOString(); // 1 min — efimera
    const { data: created, error: createErr } = await supabase
      .from("bot_sessions")
      .insert({
        whatsapp_line_id: lineId,
        patient_phone: patientPhone,
        state: "completed",
        context: { source: "legacy_button", intent },
        last_message_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (createErr || !created) {
      console.warn("[meta-webhook] Could not create session for log:", createErr?.message);
      return;
    }
    sessionId = (created as { id: string }).id;
  }

  // Insert log entry
  const { error: logErr } = await supabase
    .from("bot_conversation_logs")
    .insert({
      session_id: sessionId,
      whatsapp_line_id: lineId,
      organization_id: orgId,
      patient_phone: patientPhone,
      direction: "inbound",
      state_before: "legacy_button",
      state_after: "completed",
      user_message: body || null,
      bot_response: `[legacy] intent=${intent} appointment=${appointmentId || "none"}`,
      options_shown: [],
      intent_detected: intent,
      metadata: { source: "meta-webhook-legacy", appointment_id: appointmentId },
    });

  if (logErr) {
    console.warn("[meta-webhook] Could not insert bot log:", logErr.message);
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
  appointment: { id: string; doctor_id: string; organization_id?: string },
  patient: { id: string; name: string },
  _patientPhone: string,
  _linePhone: string,
  orgId?: string,
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

    const formattedTime = formatTimeForTemplate(appt.time);
    try {
      const res = await fetch(gatewayUrl, {
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
          templateParams: { "1": formattedTime },
          body: `Cita Confirmada.\n\nNos dará mucho gusto recibirle mañana a las ${formattedTime} en nuestro consultorio.\n\n¡Que tenga un gran día!`,
          appointmentId: appointment.id,
          patientId: patient.id,
          doctorId: appointment.doctor_id,
          ...(orgId ? { organizationId: orgId } : {}),
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn("[meta-webhook] messaging-gw error for patient_confirmed:", res.status, errText);
      }
    } catch (e) {
      console.error("[meta-webhook] Network error sending patient_confirmed:", e);
    }

  } else if (intent === "reschedule") {
    // reschedule_doctor: 2 params = nombre del paciente, número del paciente
    const { data: doctorUser } = await supabase
      .from("doctors")
      .select("phone")
      .eq("id", appointment.doctor_id)
      .single();

    if (doctorUser?.phone) {
      try {
        const res = await fetch(gatewayUrl, {
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
            body: `${patient.name} quiere reagendar su cita.\n\nTeléfono: ${_patientPhone}`,
            appointmentId: appointment.id,
            patientId: patient.id,
            doctorId: appointment.doctor_id,
            ...(orgId ? { organizationId: orgId } : {}),
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.warn("[meta-webhook] messaging-gw error for reschedule_doctor:", res.status, errText);
        }
      } catch (e) {
        console.error("[meta-webhook] Network error sending reschedule_doctor:", e);
      }
    }

    // patient_reschedule: sin params
    try {
      const res = await fetch(gatewayUrl, {
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
          body: "Su solicitud de reagendación ha sido recibida.\n\nEn breve, el consultorio se pondrá en contacto para confirmar la nueva fecha y hora.\n\nGracias por su comprensión.",
          appointmentId: appointment.id,
          patientId: patient.id,
          doctorId: appointment.doctor_id,
          ...(orgId ? { organizationId: orgId } : {}),
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn("[meta-webhook] messaging-gw error for patient_reschedule:", res.status, errText);
      }
    } catch (e) {
      console.error("[meta-webhook] Network error sending patient_reschedule:", e);
    }
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
  appointmentId?: string,
  conversationId?: string,
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
        ...(appointmentId ? { appointmentId } : {}),
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
        organizationId: orgId,
        ...(patientId ? { patientId } : {}),
        // Sprint 1 Fase 2: vincular respuesta del bot a la conversation
        ...(conversationId ? { conversationId, source: "bot" } : {}),
      }),
    });

    if (!gwRes.ok) {
      const errText = await gwRes.text();
      console.error("[meta-webhook] messaging-gateway error:", gwRes.status, errText);
    } else {
      console.log("[meta-webhook] Bot response sent to:", fromPhone, "conv:", conversationId ?? "(none)");
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

// ---------------------------------------------------------------------------
// Sprint 2: Async media processing dispatch
// ---------------------------------------------------------------------------

/**
 * Invoca process-media-async fire-and-forget tras persistir un mensaje inbound
 * con multimedia. El webhook NO espera respuesta (no await del fetch).
 *
 * Requiere lookup del message_log.id por provider_message_id porque la
 * persistencia ocurrio justo antes en otro statement.
 */
async function dispatchProcessMediaAsync(
  supabase: ReturnType<typeof createClient>,
  args: {
    providerMessageId: string;
    mediaIdRaw: string;
    messageType: "audio" | "image" | "document" | "voice_call";
    organizationId: string;
    conversationId: string;
    whatsappLineId: string;
  },
): Promise<void> {
  // Lookup message_log.id (recien creado por persistInboundMessage)
  const { data: msg, error } = await supabase
    .from("message_logs")
    .select("id")
    .eq("provider_message_id", args.providerMessageId)
    .maybeSingle();

  if (error || !msg) {
    console.error("[meta-webhook] dispatchProcessMediaAsync: msg not found by providerId:", args.providerMessageId, error?.message);
    return;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const targetUrl = `https://${projectRef}.supabase.co/functions/v1/process-media-async`;

  // Fire-and-forget: NO await. Si la edge function no responde, ni modo.
  fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify({
      messageLogId: (msg as { id: string }).id,
      mediaIdRaw: args.mediaIdRaw,
      messageType: args.messageType,
      organizationId: args.organizationId,
      conversationId: args.conversationId,
      whatsappLineId: args.whatsappLineId,
    }),
  }).catch((e) => {
    console.error("[meta-webhook] dispatchProcessMediaAsync fetch error:", e);
  });

  console.log("[meta-webhook] dispatched process-media-async", { messageLogId: (msg as { id: string }).id, messageType: args.messageType });
}

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
    let activeLineSyncInProgress = false;
    const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (phoneNumberId) {
      const { data: wline } = await supabase
        .from("whatsapp_lines")
        .select("id, organization_id, bot_enabled, sync_in_progress")
        .eq("meta_phone_number_id", phoneNumberId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      activeLineId = wline?.id;
      activeLineOrgId = wline?.organization_id ?? undefined;
      activeLineBotEnabled = wline?.bot_enabled ?? false;
      activeLineSyncInProgress = wline?.sync_in_progress ?? false;
      console.log("[meta-webhook] Resolved line:", activeLineId, "org:", activeLineOrgId, "botEnabled:", activeLineBotEnabled, "syncInProgress:", activeLineSyncInProgress);
    }

    // 4) Process all entries — messages, statuses, and calls run in parallel per change
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const tasks: Promise<void>[] = [];

        if (value.messages) {
          for (const message of value.messages) {
            tasks.push(handleIncomingMessage(supabase, value.metadata, message, value.contacts, activeLineId, activeLineOrgId, activeLineBotEnabled, activeLineSyncInProgress));
          }
        }

        // Coexistence (B3): echoes — mensajes que la asistente envia desde la WhatsApp
        // Business App del celular. field='smb_message_echoes', payload en message_echoes[].
        if (value.message_echoes && activeLineId && activeLineOrgId) {
          for (const echo of value.message_echoes) {
            tasks.push(handleMessageEcho(supabase, echo, activeLineId, activeLineOrgId, activeLineSyncInProgress));
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            tasks.push(handleStatusUpdate(supabase, status));
          }
        }

        // Sprint 6 — Calling API events
        if (value.calls && activeLineId && activeLineOrgId) {
          for (const call of value.calls) {
            tasks.push(processCallEvent({
              supabase,
              call,
              contacts: value.contacts,
              organizationId: activeLineOrgId,
              whatsappLineId: activeLineId,
            }));
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
