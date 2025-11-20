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

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      "https://soxrlxvivuplezssgssq.supabase.co",
      "sb_secret_3kbn1FikXfOrACUGIMcEiw_jR9aqmqC",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Extract JWT token from Authorization header
    const jwt = authHeader.replace("Bearer ", "");
    
    // Verify the user's JWT token using the admin client
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    // Check if user is admin using admin client (bypasses RLS)
    const { data: userData, error: roleError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || userData?.role !== "admin") {
      console.error("Role check failed:", roleError, userData);
      throw new Error("Only admins can create users");
    }

    // Get request body
    const { email, password, role, specialtyId, fullName, phone } = await req.json();

    // Validate required fields
    if (!email || !password || !role) {
      throw new Error("Email, password, and role are required");
    }

    if (role === "doctor" && !specialtyId) {
      throw new Error("Specialty is required for doctor role");
    }

    if (role === "doctor" && !fullName) {
      throw new Error("Full name is required for doctor role");
    }

    if (role === "doctor" && !phone) {
      throw new Error("Phone is required for doctor role");
    }

    // Validate role
    if (!["admin", "secretary", "doctor"].includes(role)) {
      throw new Error("Invalid role");
    }

    // Create the auth user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    // If role is doctor, create the doctor record first
    let doctorId = null;
    if (role === "doctor") {
      const { data: doctorData, error: doctorError } = await supabaseAdmin
        .from("doctors")
        .insert({
          name: fullName,
          email: email,
          phone: phone,
          specialty_id: specialtyId,
        })
        .select()
        .single();

      if (doctorError) {
        // Rollback: delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw doctorError;
      }

      doctorId = doctorData.id;
    }

    // Insert into users table with the role
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: newUser.user.id,
      email: email,
      role: role,
      doctor_id: doctorId,
    });

    if (insertError) {
      // Rollback: delete the auth user and doctor if created
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      if (doctorId) {
        await supabaseAdmin.from("doctors").delete().eq("id", doctorId);
      }
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role: role,
          doctorId: doctorId,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error creating user:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
