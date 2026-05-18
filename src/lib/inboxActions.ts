/**
 * inboxActions — wrappers para los edge functions del centro de atencion.
 *
 * Sprint 3 Fase 3.
 *
 * Cada wrapper llama supabase.functions.invoke() con el body correcto y
 * propaga el error. Frontend usa estos helpers en lugar de fetch directo.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SendMessageResult {
  ok: true;
  providerMessageId: string | null;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  conversation: { id: string; status: string };
}

export interface SendMessageInput {
  conversationId: string;
  body?: string;
  mediaUrl?: string;
  messageType?: "text" | "image" | "audio" | "document";
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const { data, error } = await supabase.functions.invoke("inbox-send", {
    body: input,
  });
  if (error) throw new Error(error.message || "Error enviando mensaje");
  if (!data?.ok) throw new Error(data?.error || "Error desconocido enviando mensaje");
  return data as SendMessageResult;
}

export interface HandoffResult {
  ok: true;
  conversation: {
    id: string;
    status: "human_active";
    assigned_to: string;
    patient_phone: string;
  };
}

export async function takeConversation(conversationId: string): Promise<HandoffResult> {
  const { data, error } = await supabase.functions.invoke("inbox-handoff", {
    body: { conversationId },
  });
  if (error) throw new Error(error.message || "Error tomando conversacion");
  if (!data?.ok) throw new Error(data?.error || "Error desconocido en handoff");
  return data as HandoffResult;
}

export interface ReturnToBotResult {
  ok: true;
  conversation: { id: string; status: "bot_active"; assigned_to: null };
}

export async function returnToBot(conversationId: string): Promise<ReturnToBotResult> {
  const { data, error } = await supabase.functions.invoke("inbox-return-bot", {
    body: { conversationId },
  });
  if (error) throw new Error(error.message || "Error devolviendo al bot");
  if (!data?.ok) throw new Error(data?.error || "Error desconocido en return-bot");
  return data as ReturnToBotResult;
}
