/**
 * Unified message logging for Project Harmony.
 * All messaging functions should use this to write to message_logs.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface LogMessageParams {
  direction: "inbound" | "outbound";
  channel?: string;
  toPhone: string;
  fromPhone: string;
  body?: string;
  templateName?: string;
  type: string;
  status: string;
  provider: "twilio" | "meta";
  providerMessageId?: string;
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  organizationId?: string;
  whatsappLineId?: string;
  rawPayload?: unknown;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Inserts a record into the message_logs table.
 * Never throws -- logs errors to console and returns silently.
 */
export async function logMessage(
  supabase: SupabaseClient,
  params: LogMessageParams,
): Promise<void> {
  const { error } = await supabase.from("message_logs").insert({
    direction: params.direction,
    channel: params.channel ?? "whatsapp",
    to_phone: params.toPhone,
    from_phone: params.fromPhone,
    body: params.body ?? null,
    template_name: params.templateName ?? null,
    type: params.type,
    status: params.status,
    provider: params.provider,
    provider_message_id: params.providerMessageId ?? null,
    appointment_id: params.appointmentId ?? null,
    patient_id: params.patientId ?? null,
    doctor_id: params.doctorId ?? null,
    organization_id: params.organizationId ?? null,
    whatsapp_line_id: params.whatsappLineId ?? null,
    raw_payload: params.rawPayload ?? null,
    error_code: params.errorCode ?? null,
    error_message: params.errorMessage ?? null,
  });

  if (error) {
    console.error("[message-logger] Error logging message:", error);
  }
}
