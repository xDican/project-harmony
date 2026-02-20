/**
 * Messaging Gateway — Central messaging abstraction layer.
 *
 * All Edge Functions send messages through this gateway.
 * The gateway resolves the provider (Twilio / Meta) from the
 * whatsapp_lines table and delegates to the correct provider.
 *
 * Request body:
 *   to            - Phone in E.164 or whatsapp: format
 *   type          - Logical template type: "confirmation", "reminder_24h", etc.
 *   templateParams - Positional params {"1": "Juan", "2": "Dr. Lopez", ...}
 *   body          - Plain text (for freeform messages within 24h window)
 *   appointmentId, patientId, doctorId - Context for logging
 *
 * The gateway:
 *   1. Normalizes the phone number
 *   2. Finds the active whatsapp_line and its provider
 *   3. Resolves the template name from template_mappings
 *   4. Sends via the correct provider (Meta or Twilio)
 *   5. Logs the message to message_logs
 *   6. Returns a provider-agnostic response
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { normalizeToE164 } from "../_shared/phone.ts";
import { logMessage } from "../_shared/message-logger.ts";
import type {
  MessagingProvider,
  SendMessageRequest,
  SendMessageResponse,
  TemplateMappingRow,
  WhatsAppLineRow,
} from "../_shared/messaging-types.ts";
import {
  MetaProvider,
} from "../_shared/providers/meta-provider.ts";
import {
  TwilioProvider,
} from "../_shared/providers/twilio-provider.ts";

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

const GatewayRequestSchema = z.object({
  to: z.string().min(5, "to is required"),
  type: z
    .enum([
      "confirmation",
      "reminder_24h",
      "reschedule_doctor",
      "patient_confirmed",
      "patient_reschedule",
      "generic",
    ])
    .optional()
    .default("generic"),
  templateName: z.string().optional(),
  templateParams: z.record(z.string()).optional(),
  body: z.string().optional(),
  appointmentId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the first active whatsapp_line (we currently have one line) */
async function getActiveLine(
  supabase: ReturnType<typeof createClient>,
): Promise<WhatsAppLineRow | null> {
  const { data, error } = await supabase
    .from("whatsapp_lines")
    .select(
      "id, phone_number, provider, is_active, twilio_account_sid, twilio_auth_token, twilio_phone_from, twilio_messaging_service_sid, meta_waba_id, meta_phone_number_id, meta_access_token",
    )
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error) {
    console.error("[messaging-gateway] Error fetching whatsapp_line:", error);
    return null;
  }
  return data as WhatsAppLineRow;
}

/** Look up the template name for a logical type + provider */
async function resolveTemplate(
  supabase: ReturnType<typeof createClient>,
  lineId: string,
  logicalType: string,
  provider: string,
): Promise<TemplateMappingRow | null> {
  const { data, error } = await supabase
    .from("template_mappings")
    .select("*")
    .eq("whatsapp_line_id", lineId)
    .eq("logical_type", logicalType)
    .eq("provider", provider)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[messaging-gateway] Error resolving template:", error);
  }
  return (data as TemplateMappingRow) ?? null;
}

/** Construct the correct provider instance from the whatsapp_line config */
function buildProvider(line: WhatsAppLineRow): MessagingProvider | null {
  if (line.provider === "meta") {
    if (!line.meta_phone_number_id || !line.meta_access_token) {
      console.error("[messaging-gateway] Meta config incomplete on line", line.id);
      return null;
    }
    return new MetaProvider({
      phoneNumberId: line.meta_phone_number_id,
      accessToken: line.meta_access_token,
    });
  }

  // Twilio — try line-level credentials first, fall back to env vars
  const accountSid = line.twilio_account_sid || Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = line.twilio_auth_token || Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = line.twilio_phone_from || Deno.env.get("TWILIO_WHATSAPP_FROM");
  const messagingServiceSid =
    line.twilio_messaging_service_sid || Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

  if (!accountSid || !authToken || !from) {
    console.error("[messaging-gateway] Twilio config incomplete on line", line.id);
    return null;
  }

  return new TwilioProvider({
    accountSid,
    authToken,
    from,
    messagingServiceSid: messagingServiceSid || undefined,
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // 1) Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { ok: false, error: "Missing Authorization header" });
    }

    // 2) Environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[messaging-gateway] Missing Supabase env vars");
      return jsonResponse(500, { ok: false, error: "Server configuration error" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3) Parse & validate request
    const rawBody = await req.json();
    const parsed = GatewayRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonResponse(400, {
        ok: false,
        error: "Datos de entrada inválidos",
        details: parsed.error.errors,
      });
    }

    const {
      to,
      type,
      templateName: explicitTemplateName,
      templateParams,
      body,
      appointmentId,
      patientId,
      doctorId,
    } = parsed.data;

    const normalizedTo = normalizeToE164(to);
    console.log("[messaging-gateway] Request:", { to: normalizedTo, type, hasBody: !!body });

    // 4) Resolve whatsapp line
    const line = await getActiveLine(supabase);

    if (!line) {
      console.error("[messaging-gateway] No active whatsapp_line found");
      return jsonResponse(500, { ok: false, error: "No active WhatsApp line configured" });
    }

    const provider = buildProvider(line);
    if (!provider) {
      return jsonResponse(500, {
        ok: false,
        error: `Provider ${line.provider} not configured correctly`,
      });
    }

    // 5) Resolve template
    let resolvedTemplateName = explicitTemplateName;
    let templateLanguage = "es";

    if (!resolvedTemplateName && type && type !== "generic") {
      if (line.provider === "meta") {
        // Look up in template_mappings
        const mapping = await resolveTemplate(supabase, line.id, type, "meta");
        if (mapping) {
          resolvedTemplateName = mapping.template_name;
          templateLanguage = mapping.template_language;
        }
      } else {
        // Twilio: resolve from env vars (legacy path)
        const TWILIO_TEMPLATE_MAP: Record<string, string> = {
          confirmation: "TWILIO_TEMPLATE_CONFIRMATION",
          reminder_24h: "TWILIO_TEMPLATE_REMINDER_24H",
          reschedule_doctor: "TWILIO_TEMPLATE_RESCHEDULE_SECRETARY",
        };
        const envKey = TWILIO_TEMPLATE_MAP[type];
        if (envKey) {
          resolvedTemplateName = Deno.env.get(envKey);
        }
      }
    }

    // 6) Validate we have template or body
    if (!resolvedTemplateName && !body) {
      return jsonResponse(400, {
        ok: false,
        error: "Debe proporcionar un type válido con plantilla configurada, templateName, o body",
      });
    }

    // 7) Build provider request
    // For Meta templates with quick reply buttons (confirmation, reminder_24h),
    // embed the appointmentId as each button's payload so the inbound webhook
    // knows exactly which appointment was replied to — avoids fuzzy search.
    const TYPES_WITH_QUICK_REPLY = new Set(["confirmation", "reminder_24h"]);
    const buttonPayloads =
      line.provider === "meta" &&
      appointmentId &&
      type &&
      TYPES_WITH_QUICK_REPLY.has(type)
        ? [appointmentId, appointmentId] // one entry per button (index 0 and 1)
        : undefined;

    const sendRequest: SendMessageRequest = {
      to: normalizedTo,
      type: resolvedTemplateName ? "template" : "text",
      templateName: resolvedTemplateName,
      templateLanguage,
      templateParams,
      buttonPayloads,
      body,
      messageType: type as SendMessageRequest["messageType"],
      appointmentId,
      patientId,
      doctorId,
    };

    // 8) Send message
    const result: SendMessageResponse = await provider.sendMessage(sendRequest);

    console.log("[messaging-gateway] Provider response:", {
      ok: result.ok,
      provider: result.provider,
      messageId: result.providerMessageId,
    });

    // 9) Log message
    await logMessage(supabase, {
      direction: "outbound",
      toPhone: normalizedTo,
      fromPhone: line.phone_number,
      body: body ?? (resolvedTemplateName ? `template:${resolvedTemplateName}` : undefined),
      templateName: resolvedTemplateName,
      type,
      status: result.status,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      appointmentId,
      patientId,
      doctorId,
      rawPayload: result,
      errorCode: result.errorCode,
      errorMessage: result.error,
    });

    // 10) Return response
    if (result.ok) {
      return jsonResponse(200, {
        ok: true,
        status: "sent",
        providerMessageId: result.providerMessageId,
        provider: result.provider,
        // Backward compat for callers expecting twilioSid
        ...(result.provider === "twilio" ? { twilioSid: result.providerMessageId } : {}),
      });
    }

    return jsonResponse(500, {
      ok: false,
      error: result.error || "Error al enviar mensaje",
      errorCode: result.errorCode,
      provider: result.provider,
    });
  } catch (error) {
    console.error("[messaging-gateway] Unexpected error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { ok: false, error: "Internal server error", details: msg });
  }
});
