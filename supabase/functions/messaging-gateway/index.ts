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
  organizationId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the active whatsapp_line for the given organization (or globally newest if no org provided) */
async function getActiveLine(
  supabase: ReturnType<typeof createClient>,
  organizationId?: string,
): Promise<WhatsAppLineRow | null> {
  let query = supabase
    .from("whatsapp_lines")
    .select(
      "id, phone_number, provider, is_active, organization_id, twilio_account_sid, twilio_auth_token, twilio_phone_from, twilio_messaging_service_sid, meta_waba_id, meta_phone_number_id, meta_access_token",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query.single();

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
    // 1) Environment (needed for auth check)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[messaging-gateway] Missing Supabase env vars");
      return jsonResponse(500, { ok: false, error: "Server configuration error" });
    }

    // 2) Auth — triple mode
    //    A) x-internal-secret: function-to-function calls (meta-webhook, send-reminders, create-appointment)
    //    B) Bearer <service_role_key>: cron jobs or direct server calls
    //    C) Bearer <valid JWT>: frontend calls via supabase.functions.invoke
    const internalSecret = req.headers.get("x-internal-secret") || "";
    const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    let isAuthenticated = false;

    // Mode A: internal secret
    if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
      isAuthenticated = true;
    }

    // Mode B: service role key
    if (!isAuthenticated && authHeader === `Bearer ${supabaseServiceKey}`) {
      isAuthenticated = true;
    }

    // Mode C: valid user JWT
    if (!isAuthenticated && authHeader.startsWith("Bearer ")) {
      try {
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (user && !authError) isAuthenticated = true;
      } catch { /* invalid token */ }
    }

    if (!isAuthenticated) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
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
      organizationId,
    } = parsed.data;

    const normalizedTo = normalizeToE164(to);
    console.log("[messaging-gateway] Request:", { to: normalizedTo, type, hasBody: !!body, organizationId });

    // 4) Resolve whatsapp line (scoped to org when provided)
    const line = await getActiveLine(supabase, organizationId);

    if (!line) {
      console.error("[messaging-gateway] No active whatsapp_line found");
      return jsonResponse(500, { ok: false, error: "No active WhatsApp line configured" });
    }

    // 4b) Kill switch: check messaging_enabled for this org
    if (line.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("messaging_enabled")
        .eq("id", line.organization_id)
        .single();

      if (org && org.messaging_enabled === false) {
        console.warn("[messaging-gateway] Messaging disabled for org:", line.organization_id);

        // Log the blocked attempt
        await logMessage(supabase, {
          direction: "outbound",
          toPhone: normalizedTo,
          fromPhone: line.phone_number,
          body: body ?? (type && type !== "generic" ? `template:${type}` : undefined),
          type,
          status: "failed",
          provider: line.provider,
          appointmentId,
          patientId,
          doctorId,
          organizationId: line.organization_id,
          whatsappLineId: line.id,
          errorCode: "MESSAGING_DISABLED",
          errorMessage: "Organization messaging is disabled",
          rawPayload: { blocked: true, reason: "MESSAGING_DISABLED" },
        });

        return jsonResponse(403, {
          ok: false,
          error: "Messaging is disabled for this organization",
          errorCode: "MESSAGING_DISABLED",
        });
      }
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
      // Check if there's a PENDING mapping (template awaiting Meta approval)
      if (type && type !== "generic") {
        const { data: pendingMapping } = await supabase
          .from("template_mappings")
          .select("meta_status")
          .eq("whatsapp_line_id", line.id)
          .eq("logical_type", type)
          .eq("provider", line.provider)
          .eq("meta_status", "PENDING")
          .limit(1)
          .maybeSingle();

        if (pendingMapping) {
          return jsonResponse(503, {
            ok: false,
            error: "Plantilla pendiente de aprobacion por Meta",
            errorCode: "TEMPLATE_PENDING_APPROVAL",
          });
        }
      }

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
      organizationId: line.organization_id ?? undefined,
      whatsappLineId: line.id,
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
