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

    // Check if user is admin using org_members first, fallback to user_roles
    let isAdmin = false;
    let callerOrgId: string | null = null;

    // Try org_members first
    const { data: orgMembers } = await supabaseAdmin
      .from("org_members")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (orgMembers && orgMembers.length > 0) {
      isAdmin = orgMembers.some((r: any) => r.role === 'admin');
      callerOrgId = orgMembers[0].organization_id;
    } else {
      // Fallback to user_roles
      const { data: userRoles, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roleError || !userRoles || userRoles.length === 0) {
        console.error("Role check failed:", roleError);
        throw new Error("Failed to verify user permissions");
      }
      isAdmin = userRoles.some(r => r.role === 'admin');
    }

    if (!isAdmin) {
      console.error("User is not admin");
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
      organizationId: z.string().uuid("Invalid organization ID format").optional(),
    });

    const doctorUserSchema = baseUserSchema.extend({
      specialtyId: z.string().uuid("Invalid specialty ID format"),
      fullName: z.string().min(2, "Name too short").max(100, "Name too long"),
      phone: z.string().regex(/^[\d\s\-+()]+$/, "Invalid phone format").max(20, "Phone too long"),
      prefix: z.string().max(20, "Prefix too long"),
      calendarId: z.string().uuid("Invalid calendar ID format").optional(),
    });

    const secretaryUserSchema = baseUserSchema.extend({
      fullName: z.string().min(2, "Name too short").max(100, "Name too long"),
      phone: z.string().regex(/^[\d\s\-+()]+$/, "Invalid phone format").max(20, "Phone too long").optional(),
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
    } else if (partialParse.data.role === "secretary") {
      validationResult = secretaryUserSchema.safeParse(body);
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

    const { email, password, role, specialtyId, fullName, phone, prefix, organizationId, calendarId } = validationResult.data as {
      email: string;
      password: string;
      role: string;
      specialtyId?: string;
      fullName?: string;
      phone?: string;
      prefix?: string;
      organizationId?: string;
      calendarId?: string;
    };

    // Resolve org: use provided orgId, or fallback to caller's org
    const resolvedOrgId = organizationId || callerOrgId;

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
          user_id: newUser.user.id,
          name: fullName,
          email: email,
          phone: phone,
          specialty_id: specialtyId,
          prefix: prefix,
          organization_id: resolvedOrgId || null,
        })
        .select()
        .single();

      if (doctorError) {
        // Rollback: delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw doctorError;
      }

      doctorId = doctorData.id;

      // If a calendarId was provided, link the doctor to the calendar
      if (calendarId) {
        const { error: calDocError } = await supabaseAdmin
          .from("calendar_doctors")
          .insert({ calendar_id: calendarId, doctor_id: doctorId, is_active: true });
        if (calDocError) {
          console.error("Error linking doctor to calendar:", calDocError);
          // Rollback: delete doctor + auth user
          await supabaseAdmin.from("doctors").delete().eq("id", doctorId);
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          throw new Error(`Error al asignar calendario: ${calDocError.message}`);
        }

        // Auto-add doctor to whatsapp_line_doctors for all active lines in the org
        if (resolvedOrgId) {
          const { data: activeLines } = await supabaseAdmin
            .from("whatsapp_lines")
            .select("id")
            .eq("organization_id", resolvedOrgId)
            .eq("is_active", true);

          if (activeLines && activeLines.length > 0) {
            const wldRows = activeLines.map((line: any) => ({
              whatsapp_line_id: line.id,
              doctor_id: doctorId,
              calendar_id: calendarId,
            }));
            const { error: wldError } = await supabaseAdmin
              .from("whatsapp_line_doctors")
              .upsert(wldRows, { onConflict: "whatsapp_line_id,doctor_id,calendar_id", ignoreDuplicates: true });
            if (wldError) {
              console.error("Error populating whatsapp_line_doctors (non-blocking):", wldError);
            } else {
              console.log("whatsapp_line_doctors populated for new doctor:", doctorId, "lines:", activeLines.length);
            }
          }
        }
      }
    }

    // If role is secretary, create the secretary record
    let secretaryId = null;
    if (role === "secretary" && fullName) {
      const { data: secretaryData, error: secretaryError } = await supabaseAdmin
        .from("secretaries")
        .insert({
          name: fullName,
          email: email,
          phone: phone || null,
          organization_id: resolvedOrgId || null,
        })
        .select()
        .single();

      if (secretaryError) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw secretaryError;
      }
      secretaryId = secretaryData.id;
    }

    // Insert into users table (without role field)
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: newUser.user.id,
      email: email,
      doctor_id: doctorId,
      secretary_id: secretaryId,
    });

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      if (doctorId) await supabaseAdmin.from("doctors").delete().eq("id", doctorId);
      if (secretaryId) await supabaseAdmin.from("secretaries").delete().eq("id", secretaryId);
      throw insertError;
    }

    // Insert role into user_roles table (kept for backward compat)
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

    // Also insert into org_members (multi-tenant) — CRITICAL for app to work
    if (resolvedOrgId) {
      const { error: orgMemberError } = await supabaseAdmin.from("org_members").insert({
        organization_id: resolvedOrgId,
        user_id: newUser.user.id,
        role: role,
        doctor_id: doctorId || null,
        secretary_id: secretaryId || null,
        is_active: true,
      });

      if (orgMemberError) {
        console.error("Error creating org_member:", orgMemberError);
        // Full rollback
        await supabaseAdmin.from("user_roles").delete().eq("user_id", newUser.user.id);
        await supabaseAdmin.from("users").delete().eq("id", newUser.user.id);
        if (doctorId && calendarId) {
          await supabaseAdmin.from("calendar_doctors").delete().eq("doctor_id", doctorId).eq("calendar_id", calendarId);
        }
        if (doctorId) await supabaseAdmin.from("doctors").delete().eq("id", doctorId);
        if (secretaryId) await supabaseAdmin.from("secretaries").delete().eq("id", secretaryId);
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error(`Error al crear membresia de organizacion: ${orgMemberError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role: role,
          doctorId: doctorId,
          organizationId: resolvedOrgId || null,
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
