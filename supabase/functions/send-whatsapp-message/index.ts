/**
 * send-whatsapp-message — Thin proxy to messaging-gateway.
 *
 * This function is DEPRECATED. All new code should call messaging-gateway directly.
 * Kept for backward compatibility with any existing callers.
 *
 * Forwards the request body to messaging-gateway and returns the response
 * with backward-compatible fields (twilioSid).
 */

import { handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method === "GET") {
    return jsonResponse(200, { ok: true, message: "send-whatsapp-message alive" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(500, { ok: false, error: "Server configuration error" });
    }

    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

    // Forward the request body and auth to the gateway
    const body = await req.text();

    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("Authorization") || `Bearer ${supabaseServiceKey}`,
        apikey: supabaseAnonKey || "",
      },
      body,
    });

    const data = await response.json();

    // Add backward-compatible twilioSid field
    if (data.providerMessageId && data.provider === "twilio") {
      data.twilioSid = data.providerMessageId;
    }

    return jsonResponse(response.status, data);
  } catch (error) {
    console.error("[send-whatsapp-message] Proxy error:", error);
    return jsonResponse(500, { ok: false, error: "Proxy error" });
  }
});
