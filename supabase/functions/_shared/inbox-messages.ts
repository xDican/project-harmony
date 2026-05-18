/**
 * Inbox message persistence — Sprint 1 MVP Centro de Atencion.
 *
 * Wrappea logMessage agregando los campos del inbox (conversation_id, source,
 * message_type, transcription, media_url, media_mime, call_*, sent_by).
 *
 * IMPORTANTE: `message_logs` tiene CHECK `(billable=false) OR (doctor_id NOT NULL)`.
 * Para mensajes de conversacion (source=patient/bot/assistant) **siempre**
 * billable=false. Los recordatorios/templates siguen escribiendose con el
 * helper original `logMessage` que setea billable=true cuando hay doctorId.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logMessage, LogMessageParams } from "./message-logger.ts";

export type MessageSource = "patient" | "bot" | "assistant" | "template" | "system";
export type MessageType = "text" | "audio" | "image" | "document" | "voice_call" | "system";
export type CallDirection = "inbound" | "outbound";

export interface InboundMessageParams {
  conversationId: string;
  organizationId: string;
  whatsappLineId: string;
  toPhone: string;
  fromPhone: string;
  body?: string | null;
  providerMessageId: string;
  messageType?: MessageType;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  /** Si es voice_call inbound */
  callDurationSeconds?: number | null;
  patientId?: string;
  rawPayload?: unknown;
}

/**
 * Persiste un mensaje inbound (del paciente) en `message_logs` con su
 * `conversation_id` y `source='patient'`. Billable=false siempre.
 *
 * NOTA: el campo `type` (legacy de message_logs) se setea a `inbound_message`
 * para diferenciar de `patient_reply` (que es legacy del flow viejo). Mantiene
 * coexistencia sin romper queries existentes.
 */
export async function persistInboundMessage(
  supabase: SupabaseClient,
  params: InboundMessageParams,
): Promise<void> {
  const messageType = params.messageType ?? "text";

  await logMessage(supabase, {
    direction: "inbound",
    toPhone: params.toPhone,
    fromPhone: params.fromPhone,
    body: params.body ?? null,
    type: messageType === "voice_call" ? "voice_call" : "patient_reply",
    status: messageType === "voice_call" ? "received" : "received",
    provider: "meta",
    providerMessageId: params.providerMessageId,
    organizationId: params.organizationId,
    whatsappLineId: params.whatsappLineId,
    patientId: params.patientId,
    rawPayload: params.rawPayload,
    billable: false,
  });

  // logMessage no conoce los campos nuevos del inbox; los agregamos con UPDATE
  // por provider_message_id (que es UNIQUE de facto en la idempotencia).
  // Tambien por seguridad rellenamos campos que logMessage si setea, no perdemos data.
  const patch: Record<string, unknown> = {
    conversation_id: params.conversationId,
    source: "patient",
    message_type: messageType,
  };
  if (params.mediaUrl !== undefined) patch.media_url = params.mediaUrl;
  if (params.mediaMime !== undefined) patch.media_mime = params.mediaMime;
  if (messageType === "voice_call") {
    patch.call_direction = "inbound";
    if (params.callDurationSeconds !== undefined && params.callDurationSeconds !== null) {
      patch.call_duration_seconds = params.callDurationSeconds;
    }
  }

  const { error: updErr } = await supabase
    .from("message_logs")
    .update(patch)
    .eq("provider_message_id", params.providerMessageId);

  if (updErr) {
    console.error("[inbox-messages] could not patch inbox fields:", updErr.message, {
      providerMessageId: params.providerMessageId,
      conversationId: params.conversationId,
    });
  }
}

export interface OutboundMessageParams {
  conversationId: string;
  organizationId: string;
  whatsappLineId: string;
  toPhone: string;
  fromPhone: string;
  body: string | null;
  source: "bot" | "assistant" | "template";
  messageType?: MessageType;
  sentBy?: string | null;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  callDurationSeconds?: number | null;
  status?: "queued" | "sent" | "delivered" | "read" | "failed";
  providerMessageId?: string | null;
  rawPayload?: unknown;
}

/**
 * Persiste un mensaje outbound (bot o asistente humana) con su `conversation_id`.
 * Billable=false. Para templates de marketing/utility usar el path legacy
 * (`logMessage` directo con billable=true).
 */
export async function persistOutboundMessage(
  supabase: SupabaseClient,
  params: OutboundMessageParams,
): Promise<{ id: string } | null> {
  const messageType = params.messageType ?? "text";

  const insertPayload: Record<string, unknown> = {
    direction: "outbound",
    channel: "whatsapp",
    to_phone: params.toPhone,
    from_phone: params.fromPhone,
    body: params.body,
    type: messageType === "voice_call" ? "voice_call" : "bot_response",
    status: params.status ?? "queued",
    provider: "meta",
    provider_message_id: params.providerMessageId ?? null,
    organization_id: params.organizationId,
    whatsapp_line_id: params.whatsappLineId,
    raw_payload: (params.rawPayload as Record<string, unknown> | undefined) ?? null,
    billable: false,
    conversation_id: params.conversationId,
    source: params.source,
    message_type: messageType,
    media_url: params.mediaUrl ?? null,
    media_mime: params.mediaMime ?? null,
    sent_by: params.sentBy ?? null,
  };

  if (messageType === "voice_call") {
    insertPayload.call_direction = "outbound";
    if (params.callDurationSeconds !== undefined && params.callDurationSeconds !== null) {
      insertPayload.call_duration_seconds = params.callDurationSeconds;
    }
  }

  const { data, error } = await supabase
    .from("message_logs")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    console.error("[inbox-messages] outbound insert failed:", error.message, {
      conversationId: params.conversationId,
      source: params.source,
    });
    return null;
  }

  return data as { id: string };
}

/**
 * Extrae media_url y mime_type de un payload de Meta Cloud API.
 * Meta no envia el URL directamente; envia un mediaId que requiere otro request
 * a Graph API para resolver. Por ahora guardamos el mediaId; Sprint 2 hara la
 * descarga via Whisper/Storage.
 *
 * Tipos de mensaje Meta: image, audio, video, document, sticker, voice
 */
export function extractMediaFromMetaMessage(msg: {
  type: string;
  image?: { id: string; mime_type?: string; caption?: string };
  audio?: { id: string; mime_type?: string; voice?: boolean };
  document?: { id: string; mime_type?: string; filename?: string; caption?: string };
  video?: { id: string; mime_type?: string; caption?: string };
}): { messageType: MessageType; mediaUrl: string | null; mediaMime: string | null; caption: string | null } {
  switch (msg.type) {
    case "image":
      return {
        messageType: "image",
        mediaUrl: msg.image?.id ? `meta-media:${msg.image.id}` : null,
        mediaMime: msg.image?.mime_type ?? null,
        caption: msg.image?.caption ?? null,
      };
    case "audio":
      return {
        messageType: "audio",
        mediaUrl: msg.audio?.id ? `meta-media:${msg.audio.id}` : null,
        mediaMime: msg.audio?.mime_type ?? null,
        caption: null,
      };
    case "document":
      return {
        messageType: "document",
        mediaUrl: msg.document?.id ? `meta-media:${msg.document.id}` : null,
        mediaMime: msg.document?.mime_type ?? null,
        caption: msg.document?.caption ?? msg.document?.filename ?? null,
      };
    case "video":
      // Tratamos video como document por ahora (Sprint 1 no usa video).
      return {
        messageType: "document",
        mediaUrl: msg.video?.id ? `meta-media:${msg.video.id}` : null,
        mediaMime: msg.video?.mime_type ?? null,
        caption: msg.video?.caption ?? null,
      };
    default:
      return { messageType: "text", mediaUrl: null, mediaMime: null, caption: null };
  }
}

// Re-exports utiles
export type { LogMessageParams };
