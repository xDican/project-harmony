/**
 * Provider-agnostic messaging types for Project Harmony.
 * All messaging functions use these interfaces to communicate
 * with the messaging-gateway.
 */

/** Logical template types used across the system */
export type TemplateType =
  | "confirmation"
  | "reminder_24h"
  | "reschedule_doctor"
  | "patient_confirmed"
  | "patient_reschedule"
  | "generic";

/** Provider-agnostic message sending request */
export interface SendMessageRequest {
  /** E.164 phone: +504XXXXXXXX */
  to: string;
  /** Message format */
  type: "template" | "text";
  /** Meta template name (resolved by gateway from template_mappings) */
  templateName?: string;
  /** Template language code. Default: "es" */
  templateLanguage?: string;
  /** Positional template params: {"1": "Juan", "2": "Dr. Lopez", "3": "date"} */
  templateParams?: Record<string, string>;
  /**
   * Custom payloads for quick reply buttons (Meta only).
   * Each entry corresponds to button index 0, 1, 2...
   * Use the appointmentId so the webhook knows exactly which cita was replied to.
   */
  buttonPayloads?: string[];
  /** Plain text body (for text messages within 24h window) */
  body?: string;
  /** Logical message type for template resolution */
  messageType?: TemplateType;
  /** Contextual IDs for logging */
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
}

/** Provider-agnostic response from sending a message */
export interface SendMessageResponse {
  ok: boolean;
  status: "sent" | "failed";
  /** Provider-specific message ID (Twilio SID or Meta wamid) */
  providerMessageId?: string;
  provider: "twilio" | "meta";
  error?: string;
  errorCode?: string;
}

/** Interface that each messaging provider must implement */
export interface MessagingProvider {
  readonly name: "twilio" | "meta";
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
}

/** Row from template_mappings table */
export interface TemplateMappingRow {
  id: string;
  whatsapp_line_id: string | null;
  logical_type: string;
  provider: string;
  template_name: string;
  template_language: string;
  parameter_order: string[];
  is_active: boolean;
}

/** Row from whatsapp_lines table (relevant fields) */
export interface WhatsAppLineRow {
  id: string;
  phone_number: string;
  provider: "twilio" | "meta";
  is_active: boolean;
  // Twilio
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_phone_from: string | null;
  twilio_messaging_service_sid: string | null;
  // Meta
  meta_waba_id: string | null;
  meta_phone_number_id: string | null;
  meta_access_token: string | null;
}
