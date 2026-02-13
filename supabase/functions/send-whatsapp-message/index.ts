import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const TEMPLATE_ENV_MAP: Record<string, string> = {
  confirmation: "TWILIO_TEMPLATE_CONFIRMATION",
  reminder_24h: "TWILIO_TEMPLATE_REMINDER_24H",
  // Legacy alias: keep reschedule pointing to secretary template for backward compatibility.
  reschedule: "TWILIO_TEMPLATE_RESCHEDULE_SECRETARY",
  reschedule_secretary: "TWILIO_TEMPLATE_RESCHEDULE_SECRETARY",
  reschedule_patient: "TWILIO_TEMPLATE_RESCHEDULE_PATIENT",
  confirmation_patient: "TWILIO_TEMPLATE_CONFIRMATION_PATIENT",
};

const TYPES_REQUIRE_APPOINTMENT_ID = new Set(["confirmation", "reminder_24h"]);


const RequestSchema = z.object({
  to: z
    .string()
    .regex(/^whatsapp:\+\d{10,15}$/, "to debe ser formato whatsapp:+<número>"),
  type: z
    .enum(["confirmation", "reminder_24h", "reschedule", "reschedule_secretary", "reschedule_patient", "confirmation_patient", "generic"])
    .optional()
    .default("generic"),
  templateName: z.string().optional(),
  templateParams: z.record(z.string()).optional(),
  body: z.string().optional(),
  appointmentId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
});

interface TwilioResponse {
  sid?: string;
  status?: string;
  error_code?: number;
  error_message?: string;
  message?: string;
}

async function sendTwilioMessage(params: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body?: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
  messagingServiceSid?: string;
}): Promise<{ success: boolean; data: TwilioResponse }> {
  const {
    accountSid,
    authToken,
    from,
    to,
    body,
    contentSid,
    contentVariables,
    messagingServiceSid,
  } = params;

  const twilioUrl =
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("To", to);
  formData.append("From", from);

  if (messagingServiceSid) {
    formData.append("MessagingServiceSid", messagingServiceSid);
  }

  if (contentSid) {
    formData.append("ContentSid", contentSid);
    if (contentVariables) {
      formData.append("ContentVariables", JSON.stringify(contentVariables));
    }
  } else if (body) {
    formData.append("Body", body);
  }

  const credentials = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const data: TwilioResponse = await response.json();
  return { success: response.ok, data };
}

/**
 * MV1 Settings:
 * - per_message_price = Twilio fee
 * - meta_fee_outside_window = extra fuera de ventana (flat)
 * - window_hours = 24 por defecto
 */
async function getBillingSettings(
  supabase: any,
): Promise<{ twilioFee: number; metaFeeOutsideWindow: number; windowHours: number }> {
  const { data, error } = await supabase
    .from("billing_settings")
    .select("per_message_price, meta_fee_outside_window, window_hours")
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(
      "[send-whatsapp-message] billing_settings query failed, defaults used:",
      error,
    );
    return { twilioFee: 0.005, metaFeeOutsideWindow: 0, windowHours: 24 };
  }

  return {
    twilioFee: Number(data?.per_message_price ?? 0.005),
    metaFeeOutsideWindow: Number((data as any)?.meta_fee_outside_window ?? 0),
    windowHours: Number((data as any)?.window_hours ?? 24),
  };
}

/**
 * MV1: Dentro de ventana si hubo inbound del paciente en las últimas N horas.
 * IMPORTANT: Para que esto funcione, inbound debe guardar from_phone igual que el outbound guarda to_phone
 * (ej: "whatsapp:+504...").
 */
async function computeServiceWindow(
  supabase: any,
  params: { doctorId?: string; patientWhatsApp: string; windowHours: number },
): Promise<{ isInWindow: boolean; lastInboundAt: string | null }> {
  const { doctorId, patientWhatsApp, windowHours } = params;

  // Si no tenemos doctorId no podemos aislar por doctor (y tampoco queremos "adivinar").
  if (!doctorId) return { isInWindow: false, lastInboundAt: null };

  const { data, error } = await supabase
    .from("message_logs")
    .select("created_at")
    .eq("doctor_id", doctorId)
    .eq("direction", "inbound")
    .eq("from_phone", patientWhatsApp)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[send-whatsapp-message] computeServiceWindow failed:", error);
    return { isInWindow: false, lastInboundAt: null };
  }

  const lastInboundAt: string | null = data?.created_at ?? null;
  if (!lastInboundAt) return { isInWindow: false, lastInboundAt: null };

  const last = new Date(lastInboundAt);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const isInWindow = diffMs <= windowHours * 60 * 60 * 1000;

  return { isInWindow, lastInboundAt };
}

async function logMessage(
  supabase: any,
  params: {
    appointmentId?: string;
    patientId?: string;
    doctorId?: string;
    toPhone: string;
    fromPhone: string;
    body?: string;
    templateName?: string;
    type: string;
    status: "queued" | "failed"; // <- mantenemos queued/failed como pediste
    providerMessageId?: string | null;
    errorCode?: string | number | null;
    errorMessage?: string | null;
    rawPayload: unknown;

    // MV1
    isInServiceWindow?: boolean | null;
    unitPrice?: number | null;
    totalPrice?: number | null;
    priceCategory?: string | null;
    billable?: boolean;
  },
): Promise<void> {
  const { error } = await supabase.from("message_logs").insert({
    appointment_id: params.appointmentId || null,
    patient_id: params.patientId || null,
    doctor_id: params.doctorId || null,

    direction: "outbound",
    channel: "whatsapp",
    to_phone: params.toPhone,
    from_phone: params.fromPhone,

    body: params.body || null,
    template_name: params.templateName || null,
    type: params.type,

    status: params.status,
    provider: "twilio",
    provider_message_id: params.providerMessageId || null,

    // MV1 extras
    is_in_service_window: params.isInServiceWindow ?? null,
    unit_price: params.unitPrice ?? null,
    total_price: params.totalPrice ?? null,
    price_category: params.priceCategory ?? null,
    billable: params.billable ?? true,

    error_code: params.errorCode !== undefined && params.errorCode !== null
      ? String(params.errorCode)
      : null,
    error_message: params.errorMessage || null,

    raw_payload: params.rawPayload,
  });

  if (error) console.error("[send-whatsapp-message] Error logging message:", error);
}

/**
 * Auth strategy:
 * - If x-internal-secret is present: must match INTERNAL_FUNCTION_SECRET (for server-to-server calls like send-reminders)
 * - Else: require apikey header to match SUPABASE_ANON_KEY (so frontend calls are allowed but endpoint isn't fully open)
 */
function authorize(
  req: Request,
): { ok: boolean; mode: "internal" | "apikey"; error?: string } {
  const internalSecretHeader = req.headers.get("x-internal-secret") ||
    req.headers.get("X-Internal-Secret") || "";
  const internalSecretEnv = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

  if (internalSecretHeader) {
    if (!internalSecretEnv) {
      return {
        ok: false,
        mode: "internal",
        error: "Server misconfigured: missing INTERNAL_FUNCTION_SECRET",
      };
    }
    if (internalSecretHeader !== internalSecretEnv) {
      return { ok: false, mode: "internal", error: "Unauthorized" };
    }
    return { ok: true, mode: "internal" };
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const apiKeyHeader = req.headers.get("apikey") ||
    req.headers.get("x-api-key") || "";

  if (!anonKey) {
    return {
      ok: false,
      mode: "apikey",
      error: "Server misconfigured: missing SUPABASE_ANON_KEY",
    };
  }
  if (!apiKeyHeader) {
    return { ok: false, mode: "apikey", error: "Missing apikey header" };
  }
  if (apiKeyHeader !== anonKey) {
    return { ok: false, mode: "apikey", error: "Invalid apikey" };
  }

  return { ok: true, mode: "apikey" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, message: "send-whatsapp-message alive" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const auth = authorize(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ ok: false, error: auth.error || "Unauthorized" }), {
        status: auth.error?.startsWith("Server misconfigured") ? 500 : 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");
    const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[send-whatsapp-message] Missing Supabase env vars");
      return new Response(JSON.stringify({ ok: false, error: "Server configuration error: Supabase" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!accountSid || !authToken || !twilioFrom) {
      console.error("[send-whatsapp-message] Missing Twilio env vars");
      return new Response(JSON.stringify({ ok: false, error: "Server configuration error: Twilio" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.json();
    const validationResult = RequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      console.error("[send-whatsapp-message] Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Datos de entrada inválidos",
          details: validationResult.error.errors,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const {
      to,
      type,
      templateName,
      templateParams,
      body,
      appointmentId,
      patientId,
      doctorId,
    } = validationResult.data;

    console.log("[send-whatsapp-message] Request:", {
      to,
      type,
      templateName,
      hasBody: !!body,
      authMode: auth.mode,
    });

    // Resolve template (same behavior)
    let resolvedTemplateName: string | undefined = templateName;

    if (!resolvedTemplateName && type && type !== "generic") {
      const envVarName = TEMPLATE_ENV_MAP[type];
      if (envVarName) resolvedTemplateName = Deno.env.get(envVarName) || undefined;
    }

    // Only confirmation and reminder_24h templates have an extra required variable: appointment_id
    // (Other utility templates do NOT include that extra variable.)
    const confirmationSid = Deno.env.get("TWILIO_TEMPLATE_CONFIRMATION") || undefined;
    const reminderSid = Deno.env.get("TWILIO_TEMPLATE_REMINDER_24H") || undefined;

    const resolvedNeedsAppointmentId =
      !!resolvedTemplateName &&
      (TYPES_REQUIRE_APPOINTMENT_ID.has(type) ||
        resolvedTemplateName === confirmationSid ||
        resolvedTemplateName === reminderSid);

    if (resolvedNeedsAppointmentId && !appointmentId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "appointmentId es requerido para enviar confirmation o reminder_24h.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finalTemplateParams: Record<string, string> | undefined = resolvedTemplateName
      ? { ...(templateParams ?? {}) }
      : undefined;

    if (resolvedNeedsAppointmentId && finalTemplateParams) {
      finalTemplateParams["appointment_id"] = appointmentId!;
    }

    if (!resolvedTemplateName && !body) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Debe proporcionar templateName, un type válido con plantilla configurada, o body",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ===== MV1 cost estimation =====
    const billing = await getBillingSettings(supabase);
    const windowInfo = await computeServiceWindow(supabase, {
      doctorId,
      patientWhatsApp: to, // inbound should store from_phone = "whatsapp:+..."
      windowHours: billing.windowHours,
    });

    const isTemplate = !!resolvedTemplateName;
    const extraFee = (!windowInfo.isInWindow && isTemplate)
      ? billing.metaFeeOutsideWindow
      : 0;

    const unitPrice = billing.twilioFee + extraFee;
    const priceCategory = windowInfo.isInWindow
      ? "in_window"
      : (isTemplate ? "outside_window_template" : "outside_window_freeform");
    // =================================

    // Send via Twilio
    let twilioResult: { success: boolean; data: TwilioResponse };
    let messageBody: string | undefined;

    if (resolvedTemplateName) {
      twilioResult = await sendTwilioMessage({
        accountSid,
        authToken,
        from: twilioFrom,
        to,
        contentSid: resolvedTemplateName,
        contentVariables: finalTemplateParams,
        messagingServiceSid: messagingServiceSid || undefined,
      });
      messageBody = `template:${resolvedTemplateName}`;
    } else {
      twilioResult = await sendTwilioMessage({
        accountSid,
        authToken,
        from: twilioFrom,
        to,
        body: body!,
        messagingServiceSid: messagingServiceSid || undefined,
      });
      messageBody = body;
    }

    console.log("[send-whatsapp-message] Twilio response:", JSON.stringify(twilioResult.data));

    const twilioSid = twilioResult.data.sid || null;

    // IMPORTANT: You asked queued/failed here.
    const logStatus: "queued" | "failed" = twilioResult.success ? "queued" : "failed";

    await logMessage(supabase, {
      appointmentId,
      patientId,
      doctorId,
      toPhone: to,
      fromPhone: twilioFrom,
      body: messageBody,
      templateName: resolvedTemplateName,
      type,
      status: logStatus,
      providerMessageId: twilioSid,
      errorCode: twilioResult.data.error_code ?? null,
      errorMessage: twilioResult.data.error_message || twilioResult.data.message || null,
      rawPayload: twilioResult.data,

      // MV1 fields
      isInServiceWindow: windowInfo.isInWindow,
      unitPrice: unitPrice,
      totalPrice: twilioResult.success ? unitPrice : 0,
      priceCategory,
      billable: twilioResult.success, // si falló, no lo cobramos
    });

    // Return
    if (twilioResult.success) {
      return new Response(JSON.stringify({ ok: true, status: "queued", twilioSid }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const errorMessage =
        twilioResult.data.error_message || twilioResult.data.message ||
        "Error al enviar mensaje";
      return new Response(JSON.stringify({
        ok: false,
        error: errorMessage,
        errorCode: twilioResult.data.error_code,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("[send-whatsapp-message] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({
      ok: false,
      error: "Internal server error",
      details: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
