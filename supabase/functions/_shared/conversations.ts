/**
 * Conversations entity helpers — Sprint 1 MVP Centro de Atencion.
 *
 * Una `conversation` agrupa todos los mensajes entre una clinica (via su
 * whatsapp_line) y un paciente identificado por telefono. UNIQUE(line, phone).
 *
 * Estados:
 *   - bot_active: bot atiende automaticamente (default al crearse)
 *   - human_active: asistente tomo la conversacion; bot calla
 *   - closed: conversacion archivada
 *   - pending: sin asignar (uso futuro para escalation)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

export type ConversationStatus =
  | "bot_active"
  | "human_active"
  | "closed"
  | "pending";

export interface Conversation {
  id: string;
  organization_id: string;
  whatsapp_line_id: string;
  patient_phone: string;
  patient_id: string | null;
  patient_name: string | null;
  status: ConversationStatus;
  assigned_to: string | null;
  last_message_at: string;
  last_inbound_at: string | null;
  unread_count: number;
  /**
   * Fin de la ventana de silencio AUTOMATICO (Coexistence: humano respondio
   * desde el telefono fisico). NULL = sin silencio automatico activo, o el
   * human_active actual es un takeover MANUAL indefinido desde el inbox
   * (nunca auto-expira). Ver silenceForPhysicalReply/checkAndExpireBotSilence.
   */
  bot_silenced_until: string | null;
}

/**
 * Devuelve la conversacion existente o crea una nueva.
 * Idempotente. Si el INSERT pierde una carrera, hace SELECT fallback.
 *
 * `initialStatus` controla el status de conversaciones NUEVAS (default: bot_active).
 * Cuando bot_enabled=false en la linea, pasar "human_active" para que el inbox
 * muestre el badge correcto desde el primer mensaje.
 *
 * No actualiza `last_message_at` ni `unread_count`. Para eso usar
 * `updateConversationOnInbound`/`updateConversationOnOutbound` despues.
 */
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  args: {
    whatsappLineId: string;
    organizationId: string;
    patientPhone: string;
    patientId?: string | null;
    patientName?: string | null;
    initialStatus?: ConversationStatus;
  },
): Promise<Conversation | null> {
  const { data: existing, error: selErr } = await supabase
    .from("conversations")
    .select(
      "id, organization_id, whatsapp_line_id, patient_phone, patient_id, patient_name, status, assigned_to, last_message_at, last_inbound_at, unread_count, bot_silenced_until",
    )
    .eq("whatsapp_line_id", args.whatsappLineId)
    .eq("patient_phone", args.patientPhone)
    .maybeSingle();

  if (selErr && selErr.code !== "PGRST116") {
    console.error("[conversations] select error:", selErr);
    return null;
  }

  if (existing) {
    // Backfill patient_id/patient_name si llegaron despues
    const patch: Record<string, unknown> = {};
    if (args.patientId && !existing.patient_id) patch.patient_id = args.patientId;
    if (args.patientName && !existing.patient_name) patch.patient_name = args.patientName;

    if (Object.keys(patch).length > 0) {
      const { error: updErr } = await supabase
        .from("conversations")
        .update(patch)
        .eq("id", existing.id);
      if (updErr) console.warn("[conversations] backfill patient info failed:", updErr.message);
      return { ...existing, ...patch } as Conversation;
    }
    return existing as Conversation;
  }

  // INSERT — puede perder carrera contra otra concurrent insert (mismo line+phone)
  const { data: inserted, error: insErr } = await supabase
    .from("conversations")
    .insert({
      organization_id: args.organizationId,
      whatsapp_line_id: args.whatsappLineId,
      patient_phone: args.patientPhone,
      patient_id: args.patientId ?? null,
      patient_name: args.patientName ?? null,
      status: args.initialStatus ?? "bot_active",
    })
    .select(
      "id, organization_id, whatsapp_line_id, patient_phone, patient_id, patient_name, status, assigned_to, last_message_at, last_inbound_at, unread_count, bot_silenced_until",
    )
    .single();

  if (insErr) {
    // 23505 = unique_violation → race condition, releemos
    if ((insErr as { code?: string }).code === "23505") {
      const { data: raced } = await supabase
        .from("conversations")
        .select(
          "id, organization_id, whatsapp_line_id, patient_phone, patient_id, patient_name, status, assigned_to, last_message_at, last_inbound_at, unread_count, bot_silenced_until",
        )
        .eq("whatsapp_line_id", args.whatsappLineId)
        .eq("patient_phone", args.patientPhone)
        .maybeSingle();
      return (raced as Conversation) ?? null;
    }
    console.error("[conversations] insert error:", insErr);
    return null;
  }

  return inserted as Conversation;
}

/**
 * Marca actividad inbound: sube unread_count, refresca last_message_at y
 * last_inbound_at. Se llama tras persistir un mensaje del paciente.
 */
export async function updateConversationOnInbound(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  const now = new Date().toISOString();

  // Atomic update via RPC sin RPC: usamos SQL function inline. Como no hay
  // increment "puro" en el client, hacemos read-then-update (suficiente porque
  // los mensajes inbound de un mismo paciente llegan secuenciales).
  const { data: current, error: selErr } = await supabase
    .from("conversations")
    .select("unread_count")
    .eq("id", conversationId)
    .maybeSingle();

  if (selErr) {
    console.warn("[conversations] could not read unread_count:", selErr.message);
    return;
  }

  const newUnread = (current?.unread_count ?? 0) + 1;

  const { error: updErr } = await supabase
    .from("conversations")
    .update({
      last_message_at: now,
      last_inbound_at: now,
      unread_count: newUnread,
    })
    .eq("id", conversationId);

  if (updErr) {
    console.warn("[conversations] update on inbound failed:", updErr.message);
  }
}

/**
 * Marca actividad outbound: refresca last_message_at. No toca unread_count
 * (mensajes salientes ya estan leidos por la asistente que los envio).
 */
export async function updateConversationOnOutbound(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) {
    console.warn("[conversations] update on outbound failed:", error.message);
  }
}

/**
 * Retorna el status actual de una conversacion. Lo usa el meta-webhook para
 * decidir si activar el bot o callar (human_active).
 *
 * Retorna null si no existe (caller debe crearla con getOrCreateConversation).
 */
export async function getConversationStatus(
  supabase: SupabaseClient,
  args: { whatsappLineId: string; patientPhone: string },
): Promise<ConversationStatus | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("status")
    .eq("whatsapp_line_id", args.whatsappLineId)
    .eq("patient_phone", args.patientPhone)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[conversations] getConversationStatus error:", error);
    return null;
  }
  return (data?.status as ConversationStatus) ?? null;
}

/**
 * Util para el inbox UI: marca todos los mensajes como leidos.
 * Tambien se llamara desde inbox-send despues de que la asistente responda.
 */
export async function markConversationRead(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);

  if (error) {
    console.warn("[conversations] markConversationRead failed:", error.message);
  }
}

/**
 * Coexistence (24 Jul 2026): el negocio respondio desde la WhatsApp Business
 * App del celular (echo) — silencia el bot hasta medianoche de HOY (Honduras)
 * para que no le conteste encima al humano que ya esta atendiendo.
 *
 * NO pisa un takeover MANUAL indefinido hecho desde el inbox (status ya
 * human_active CON bot_silenced_until=null) — ese sigue sin auto-expirar,
 * tal como pediria alguien que tomo la conversacion a proposito y no quiere
 * que el bot vuelva solo. Ver checkAndExpireBotSilence() para el otro lado
 * (expirar y reactivar) en la puerta de entrada del webhook.
 *
 * Retorna true si aplico el silencio, false si preservo un takeover manual.
 */
export async function silenceForPhysicalReply(
  supabase: SupabaseClient,
  conversation: Conversation,
): Promise<boolean> {
  if (conversation.status === "human_active" && conversation.bot_silenced_until === null) {
    return false; // takeover manual indefinido desde el inbox — no tocar
  }
  const endOfDayHn = DateTime.now().setZone("America/Tegucigalpa").endOf("day");
  const { error } = await supabase
    .from("conversations")
    .update({ status: "human_active", bot_silenced_until: endOfDayHn.toUTC().toISO() })
    .eq("id", conversation.id);
  if (error) {
    console.warn("[conversations] silenceForPhysicalReply failed:", error.message);
    return false;
  }
  return true;
}

/**
 * Puerta de entrada del webhook: si la conversacion esta human_active por un
 * silencio AUTOMATICO (bot_silenced_until no-null) y ya vencio, la reactiva
 * (status=bot_active, bot_silenced_until=null) y devuelve 'bot_active' para
 * que el gating de esta misma request ya trate al bot como activo — sin
 * necesitar un cron ni esperar al proximo mensaje para notar el cambio.
 * Un takeover manual (bot_silenced_until=null) nunca entra por esta rama.
 */
export async function checkAndExpireBotSilence(
  supabase: SupabaseClient,
  conversation: Conversation,
): Promise<ConversationStatus> {
  if (conversation.status !== "human_active" || !conversation.bot_silenced_until) {
    return conversation.status;
  }
  if (new Date(conversation.bot_silenced_until).getTime() > Date.now()) {
    return conversation.status; // silencio automatico todavia vigente
  }
  const { error } = await supabase
    .from("conversations")
    .update({ status: "bot_active", bot_silenced_until: null })
    .eq("id", conversation.id);
  if (error) {
    console.warn("[conversations] checkAndExpireBotSilence update failed:", error.message);
    return conversation.status; // fallo el update — no asumir reactivado
  }
  return "bot_active";
}
