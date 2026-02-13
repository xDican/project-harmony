import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { redirect_uri } = body;

    // 1. Validate redirect_uri
    if (!redirect_uri || typeof redirect_uri !== "string") {
      return new Response(
        JSON.stringify({ error: "redirect_uri is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Read secrets
    const META_APP_ID = Deno.env.get("META_APP_ID");
    const META_GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v20.0";

    if (!META_APP_ID) {
      return new Response(
        JSON.stringify({ error: "META_APP_ID secret is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Generate state
    const state = crypto.randomUUID();

    // 4. Insert state into database using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase
      .from("meta_oauth_states")
      .insert({ state, created_at: new Date().toISOString() });

    if (insertError) {
      console.error("Error inserting state:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store OAuth state" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Build authorize_url
    const params = new URLSearchParams({
      client_id: META_APP_ID,
      redirect_uri: redirect_uri,
      state: state,
      response_type: "code",
      scope: "whatsapp_business_management,whatsapp_business_messaging,public_profile",
    });

    const authorize_url = `https://www.facebook.com/dialog/oauth?${params.toString()}`;

    // 6. Return response
    return new Response(
      JSON.stringify({ authorize_url, state }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
