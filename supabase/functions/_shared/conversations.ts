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
}

/**
 * Devuelve la conversacion existente o crea una nueva con `bot_active`.
 * Idempotente. Si el INSERT pierde una carrera, hace SELECT fallback.
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
  },
): Promise<Conversation | null> {
  const { data: existing, error: selErr } = await supabase
    .from("conversations")
    .select(
      "id, organization_id, whatsapp_line_id, patient_phone, patient_id, patient_name, status, assigned_to, last_message_at, last_inbound_at, unread_count",
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
      status: "bot_active",
    })
    .select(
      "id, organization_id, whatsapp_line_id, patient_phone, patient_id, patient_name, status, assigned_to, last_message_at, last_inbound_at, unread_count",
    )
    .single();

  if (insErr) {
    // 23505 = unique_violation → race condition, releemos
    if ((insErr as { code?: string }).code === "23505") {
      const { data: raced } = await supabase
        .from("conversations")
        .select(
          "id, organization_id, whatsapp_line_id, patient_phone, patient_id, patient_name, status, assigned_to, last_message_at, last_inbound_at, unread_count",
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
