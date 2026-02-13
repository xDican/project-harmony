import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "PUT") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { id, name, category, language, body: templateBody, status } = body;

    // Validate id
    if (!id || typeof id !== "string") {
      return new Response(
        JSON.stringify({ error: "id is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return new Response(
          JSON.stringify({ error: "name must be a non-empty string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      updateData.name = name.trim();
    }

    if (templateBody !== undefined) {
      if (typeof templateBody !== "string" || templateBody.trim() === "") {
        return new Response(
          JSON.stringify({ error: "body must be a non-empty string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      updateData.body = templateBody.trim();
    }

    if (category !== undefined) {
      if (typeof category !== "string") {
        return new Response(
          JSON.stringify({ error: "category must be a string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      updateData.category = category.trim();
    }

    if (language !== undefined) {
      if (typeof language !== "string") {
        return new Response(
          JSON.stringify({ error: "language must be a string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      updateData.language = language.trim();
    }

    if (status !== undefined) {
      if (typeof status !== "string") {
        return new Response(
          JSON.stringify({ error: "status must be a string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      updateData.status = status.trim();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: template, error } = await supabase
      .from("whatsapp_templates")
      .update(updateData)
      .eq("id", id)
      .select("id, name, category, language, body, status, updated_at")
      .single();

    if (error) {
      console.error("Error updating template:", error);
      if (error.code === "PGRST116") {
        return new Response(
          JSON.stringify({ error: "Template not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to update template" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ template }),
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
