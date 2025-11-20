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

    // Create Supabase client with user's JWT to verify they're admin
    const supabaseClient = createClient(
      "https://soxrlxvivuplezssgssq.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHJseHZpdnVwbGV6c3Nnc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTMyMTEsImV4cCI6MjA3OTA4OTIxMX0.1w7xGqP6GBi7NcP6a5vDGwTZQWCvZ5wsykIwLz6hk9U",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    // Verify the user is authenticated and is an admin
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: userData, error: roleError } = await supabaseClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || userData?.role !== "admin") {
      throw new Error("Only admins can create users");
    }

    // Get request body
    const { email, password, role, specialtyId } = await req.json();

    // Validate required fields
    if (!email || !password || !role) {
      throw new Error("Email, password, and role are required");
    }

    if (role === "doctor" && !specialtyId) {
      throw new Error("Specialty is required for doctor role");
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
          name: email.split("@")[0], // Use email prefix as default name
          email: email,
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
