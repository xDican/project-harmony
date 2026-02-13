import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function normalizeStatus(s: string | null): string | null {
  if (!s) return null;
  return s.trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, message: "twilio-message-status-webhook alive" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1) Token check (?token=...)
    const tokenEnv = Deno.env.get("TWILIO_STATUS_WEBHOOK_TOKEN") || "";
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";

    if (!tokenEnv || !token || !timingSafeEqual(token, tokenEnv)) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 3) Twilio sends application/x-www-form-urlencoded
    const contentType = req.headers.get("content-type") || "";
    let form: URLSearchParams;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const bodyText = await req.text();
      form = new URLSearchParams(bodyText);
    } else {
      // fallback (por si algún día cambia)
      const json = await req.json();
      form = new URLSearchParams();
      for (const [k, v] of Object.entries(json)) form.set(k, String(v));
    }

    const messageSid = form.get("MessageSid") || form.get("SmsSid");
    const messageStatus = normalizeStatus(form.get("MessageStatus") || form.get("SmsStatus"));
    const errorCode = form.get("ErrorCode");
    const errorMessage = form.get("ErrorMessage");

    if (!messageSid || !messageStatus) {
      return new Response(JSON.stringify({ ok: false, error: "Missing MessageSid/MessageStatus" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Update message log by provider_message_id
    const updatePayload: Record<string, unknown> = {
      status: messageStatus,
    };

    if (messageStatus === "failed" || messageStatus === "undelivered") {
      updatePayload.error_code = errorCode ? String(errorCode) : null;
      updatePayload.error_message = errorMessage ? String(errorMessage) : null;
    }

    const { error } = await supabase
      .from("message_logs")
      .update(updatePayload)
      .eq("provider_message_id", messageSid);

    if (error) {
      console.error("[twilio-message-status-webhook] Update error:", error);
      return new Response(JSON.stringify({ ok: false, error: "DB update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[twilio-message-status-webhook] Unexpected error:", e);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
