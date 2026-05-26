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

// --- Iniciar conversación desde link wa.me ---

export interface InitiateConversationResult {
  id: string;
  organization_id: string;
  whatsapp_line_id: string;
  patient_phone: string;
  patient_name: string | null;
  status: string;
  last_message_at: string;
}

export async function initiateConversation(input: {
  organizationId: string;
  patientPhone: string;
  patientName?: string;
}): Promise<InitiateConversationResult> {
  const { data, error } = await supabase.rpc("initiate_conversation", {
    p_organization_id: input.organizationId,
    p_patient_phone: input.patientPhone,
    p_patient_name: input.patientName ?? null,
  });
  if (error) throw new Error(error.message || "Error iniciando conversacion");
  return data as InitiateConversationResult;
}

export type TemplateType = "confirmation" | "reminder_24h" | "reminder_3d";

export function templateBodyText(type: TemplateType, params: Record<string, string>): string {
  return TEMPLATE_BODIES[type](params);
}

const TEMPLATE_BODIES: Record<TemplateType, (p: Record<string, string>) => string> = {
  confirmation: (p) =>
    `Hola ${p["1"]}, su cita con ${p["2"]} ha sido agendada para el ${p["3"]} a las ${p["4"]}. ✅ Por favor confirme su asistencia.`,
  reminder_24h: (p) =>
    `Hola ${p["1"]}, ${p["2"]} le espera mañana ${p["3"]} a las ${p["4"]}. ⚠️ Confirme antes de las 7AM o se libera su espacio.`,
  reminder_3d: (p) =>
    `Hola ${p["1"]}, le recordamos que tiene cita con ${p["2"]} el ${p["3"]} a las ${p["4"]}. ✅ Por favor confirme su asistencia.`,
};

export async function sendTemplateMessage(input: {
  conversationId: string;
  organizationId: string;
  templateType: TemplateType;
  templateParams: Record<string, string>;
  patientPhone: string;
}): Promise<SendMessageResult> {
  const bodyText = TEMPLATE_BODIES[input.templateType](input.templateParams);

  const { data, error } = await supabase.functions.invoke("messaging-gateway", {
    body: {
      to: input.patientPhone,
      type: input.templateType,
      templateParams: input.templateParams,
      body: bodyText,
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      source: "template",
      messageType: "text",
    },
  });
  if (error) throw new Error(error.message || "Error enviando plantilla");
  if (!data?.ok) throw new Error(data?.error || "Error desconocido enviando plantilla");
  return data as SendMessageResult;
}
