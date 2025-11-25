import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
      console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY env");
      throw new Error("Server configuration error");
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
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

    // Check if user is admin using user_roles table
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError || !userRoles || userRoles.length === 0) {
      console.error("Role check failed:", roleError);
      throw new Error("Failed to verify user permissions");
    }

    const isAdmin = userRoles.some(r => r.role === 'admin');
    if (!isAdmin) {
      console.error("User is not admin:", userRoles);
      throw new Error("Only admins can create users");
    }

    // Parse request body
    const body = await req.json();

    // Define validation schema
    const baseUserSchema = z.object({
      email: z.string().email("Invalid email format").max(255, "Email too long"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      role: z.enum(["admin", "secretary", "doctor"], { 
        errorMap: () => ({ message: "Role must be admin, secretary, or doctor" })
      }),
    });

    const doctorUserSchema = baseUserSchema.extend({
      specialtyId: z.string().uuid("Invalid specialty ID format"),
      fullName: z.string().min(2, "Name too short").max(100, "Name too long"),
      phone: z.string().regex(/^[\d\s\-+()]+$/, "Invalid phone format").max(20, "Phone too long"),
      prefix: z.string().max(20, "Prefix too long"),
    });

    // Validate based on role
    let validationResult;
    const partialParse = baseUserSchema.safeParse(body);
    
    if (!partialParse.success) {
      return new Response(
        JSON.stringify({ 
          error: "Validation failed", 
          details: partialParse.error.errors 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (partialParse.data.role === "doctor") {
      validationResult = doctorUserSchema.safeParse(body);
    } else {
      validationResult = baseUserSchema.safeParse(body);
    }

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, password, role, specialtyId, fullName, phone, prefix } = validationResult.data as {
      email: string;
      password: string;
      role: string;
      specialtyId?: string;
      fullName?: string;
      phone?: string;
      prefix?: string;
    };

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
          prefix: prefix,
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

    // Insert into users table (without role field)
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: newUser.user.id,
      email: email,
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

    // Insert role into user_roles table
    const { error: roleInsertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: role,
    });

    if (roleInsertError) {
      // Rollback: delete users record, auth user, and doctor if created
      await supabaseAdmin.from("users").delete().eq("id", newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      if (doctorId) {
        await supabaseAdmin.from("doctors").delete().eq("id", doctorId);
      }
      throw roleInsertError;
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
