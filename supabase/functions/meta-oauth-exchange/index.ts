import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";
    const redirect_uri =
      typeof body.redirect_uri === "string" ? body.redirect_uri.trim() : "";

    // 1) Validate inputs
    if (!code) return json({ error: "code is required and must be a string" }, 400);
    if (!state) return json({ error: "state is required and must be a string" }, 400);
    if (!redirect_uri)
      return json({ error: "redirect_uri is required and must be a string" }, 400);

    // 2) Read secrets
    const META_APP_ID = Deno.env.get("META_APP_ID");
    const META_APP_SECRET = Deno.env.get("META_APP_SECRET");

    if (!META_APP_ID) return json({ error: "META_APP_ID secret is not configured" }, 500);
    if (!META_APP_SECRET) return json({ error: "META_APP_SECRET secret is not configured" }, 500);

    // 3) Validate state exists and is unused
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) return json({ error: "SUPABASE_URL is not configured" }, 500);
    if (!supabaseServiceKey) return json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, 500);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: stateRecord, error: stateError } = await supabase
      .from("meta_oauth_states")
      .select("state, used_at")
      .eq("state", state)
      .maybeSingle();

    if (stateError || !stateRecord) {
      return json({ error: "Invalid or expired state" }, 400);
    }

    if (stateRecord.used_at !== null) {
      return json({ error: "State has already been used" }, 400);
    }

    // 4) Call Meta token endpoint (UNVERSIONED to avoid path/version issues)
    const tokenUrl = new URL("https://graph.facebook.com/oauth/access_token");
    tokenUrl.search = new URLSearchParams({
      client_id: META_APP_ID,
      redirect_uri,
      client_secret: META_APP_SECRET,
      code,
    }).toString();

    const tokenResponse = await fetch(tokenUrl.toString(), { method: "GET" });
    const tokenData = await tokenResponse.json().catch(() => ({}));

    // 5) Handle error response
    if (!tokenResponse.ok) {
      // No logs de secretos. Esto está bien para debug.
      console.error("Meta token error:", tokenData);
      return json(
        {
          error: "Failed to exchange code for token",
          meta_error: tokenData,
        },
        400,
      );
    }

    // 6) Mark state as used
    const { error: updateError } = await supabase
      .from("meta_oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("state", state);

    if (updateError) {
      console.error("Error marking state as used:", updateError);
      // Continuamos: ya tenemos token, el marking es secundario.
    }

    // 7) Return response WITHOUT access_token
    return json(
      {
        connected: true,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
      },
      200,
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
