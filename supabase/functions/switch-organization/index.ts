import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Server configuration error");
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Extract JWT token and verify user
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const body = await req.json();
    const { organizationId } = body;

    if (!organizationId) {
      throw new Error("organizationId is required");
    }

    // Verify user is a member of the target organization
    const { data: membership, error: memberError } = await supabaseAdmin
      .from("org_members")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .limit(1)
      .maybeSingle();

    if (memberError || !membership) {
      throw new Error("No eres miembro de esta organizacion");
    }

    // Deactivate all current org memberships for this user
    const { error: deactivateError } = await supabaseAdmin
      .from("org_members")
      .update({ is_active: false })
      .eq("user_id", user.id);

    if (deactivateError) {
      console.error("Error deactivating memberships:", deactivateError);
      throw new Error("Error al cambiar de organizacion");
    }

    // Activate the target organization membership
    const { error: activateError } = await supabaseAdmin
      .from("org_members")
      .update({ is_active: true })
      .eq("user_id", user.id)
      .eq("organization_id", organizationId);

    if (activateError) {
      console.error("Error activating membership:", activateError);
      // Attempt rollback: reactivate all
      await supabaseAdmin
        .from("org_members")
        .update({ is_active: true })
        .eq("user_id", user.id);
      throw new Error("Error al activar la organizacion");
    }

    console.log(
      `User ${user.id} switched to organization ${organizationId} (role: ${membership.role})`
    );

    return new Response(
      JSON.stringify({
        success: true,
        organizationId,
        role: membership.role,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error switching organization:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
