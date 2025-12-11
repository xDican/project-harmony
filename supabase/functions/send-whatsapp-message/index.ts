import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Message types and their corresponding env var names
const TEMPLATE_ENV_MAP: Record<string, string> = {
  confirmation: "TWILIO_TEMPLATE_CONFIRMATION",
  reminder_24h: "TWILIO_TEMPLATE_REMINDER_24H",
  reschedule: "TWILIO_TEMPLATE_RESCHEDULE_SECRETARY",
};

// Zod schema for request validation
const RequestSchema = z.object({
  to: z.string().regex(/^whatsapp:\+\d{10,15}$/, "to debe ser formato whatsapp:+<número>"),
  type: z.enum(["confirmation", "reminder_24h", "reschedule", "generic"]).optional().default("generic"),
  templateName: z.string().optional(),
  templateParams: z.record(z.string()).optional(),
  body: z.string().optional(),
  appointmentId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
});

type RequestBody = z.infer<typeof RequestSchema>;

interface TwilioResponse {
  sid?: string;
  status?: string;
  error_code?: number;
  error_message?: string;
  message?: string;
}

/**
 * Sends a WhatsApp message via Twilio API
 */
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
  const { accountSid, authToken, from, to, body, contentSid, contentVariables, messagingServiceSid } = params;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  // Build form data
  const formData = new URLSearchParams();
  formData.append("To", to);
  formData.append("From", from);

  if (messagingServiceSid) {
    formData.append("MessagingServiceSid", messagingServiceSid);
  }

  // If using a template (Content API)
  if (contentSid) {
    formData.append("ContentSid", contentSid);
    if (contentVariables) {
      formData.append("ContentVariables", JSON.stringify(contentVariables));
    }
  } else if (body) {
    // Plain text message
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

  return {
    success: response.ok,
    data,
  };
}

/**
 * Inserts a record into message_logs table
 */
async function logMessage(
  supabase: ReturnType<typeof createClient>,
  params: {
    appointmentId?: string;
    patientId?: string;
    doctorId?: string;
    toPhone: string;
    fromPhone: string;
    body?: string;
    templateName?: string;
    type: string;
    status: "sent" | "failed";
    rawPayload: unknown;
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
    raw_payload: params.rawPayload,
  });

  if (error) {
    console.error("[send-whatsapp-message] Error logging message:", error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Validate Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Get environment variables
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

    // 3) Create Supabase client with service role for logging
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4) Parse and validate request body
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

    const { to, type, templateName, templateParams, body, appointmentId, patientId, doctorId } = validationResult.data;

    console.log("[send-whatsapp-message] Request:", { to, type, templateName, hasBody: !!body });

    // 5) Determine template to use
    let resolvedTemplateName: string | undefined = templateName;

    if (!resolvedTemplateName && type && type !== "generic") {
      const envVarName = TEMPLATE_ENV_MAP[type];
      if (envVarName) {
        resolvedTemplateName = Deno.env.get(envVarName);
      }
    }

    // 6) Validate we have either template or body
    if (!resolvedTemplateName && !body) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Debe proporcionar templateName, un type válido con plantilla configurada, o body",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7) Send message via Twilio
    let twilioResult: { success: boolean; data: TwilioResponse };
    let messageBody: string | undefined;

    if (resolvedTemplateName) {
      // Using template - Twilio Content API
      // Note: For WhatsApp templates, you need to use ContentSid (the template's SID in Twilio)
      // If your templates are pre-approved WhatsApp templates, use them directly
      twilioResult = await sendTwilioMessage({
        accountSid,
        authToken,
        from: twilioFrom,
        to,
        contentSid: resolvedTemplateName,
        contentVariables: templateParams,
        messagingServiceSid: messagingServiceSid || undefined,
      });
      messageBody = `template:${resolvedTemplateName}`;
    } else {
      // Plain text message
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

    // 8) Log the message
    const status = twilioResult.success ? "sent" : "failed";

    await logMessage(supabase, {
      appointmentId,
      patientId,
      doctorId,
      toPhone: to,
      fromPhone: twilioFrom,
      body: messageBody,
      templateName: resolvedTemplateName,
      type,
      status,
      rawPayload: twilioResult.data,
    });

    // 9) Return response
    if (twilioResult.success) {
      return new Response(
        JSON.stringify({
          ok: true,
          status: "sent",
          twilioSid: twilioResult.data.sid,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      const errorMessage = twilioResult.data.error_message || twilioResult.data.message || "Error al enviar mensaje";
      return new Response(
        JSON.stringify({
          ok: false,
          error: errorMessage,
          errorCode: twilioResult.data.error_code,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("[send-whatsapp-message] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
