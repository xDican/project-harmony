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
    const { name, category, language, body: templateBody } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return new Response(
        JSON.stringify({ error: "name is required and must be a non-empty string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!templateBody || typeof templateBody !== "string" || templateBody.trim() === "") {
      return new Response(
        JSON.stringify({ error: "body is required and must be a non-empty string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const insertData: Record<string, unknown> = {
      name: name.trim(),
      body: templateBody.trim(),
      status: "draft",
      updated_at: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (category && typeof category === "string") {
      insertData.category = category.trim();
    }
    if (language && typeof language === "string") {
      insertData.language = language.trim();
    }

    const { data: template, error } = await supabase
      .from("whatsapp_templates")
      .insert(insertData)
      .select("id, name, category, language, body, status, updated_at")
      .single();

    if (error) {
      console.error("Error creating template:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create template" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ template }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
