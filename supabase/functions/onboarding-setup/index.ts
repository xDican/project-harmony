import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const url = new URL(req.url);
    const stepParam = url.searchParams.get("step");

    // ----------------------------------------------------------------
    // GET ?step=status — Detect current onboarding step
    // ----------------------------------------------------------------
    if (req.method === "GET" && stepParam === "status") {
      // Check org_member
      const { data: memberRow } = await supabaseAdmin
        .from("org_members")
        .select("organization_id, doctor_id, organizations(onboarding_status)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!memberRow) {
        return new Response(JSON.stringify({ step: "clinic" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orgId = memberRow.organization_id;

      // Check doctor
      if (!memberRow.doctor_id) {
        return new Response(JSON.stringify({ step: "doctor", organization_id: orgId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check schedule
      const { data: scheduleRow } = await supabaseAdmin
        .from("doctor_schedules")
        .select("id")
        .eq("doctor_id", memberRow.doctor_id)
        .limit(1)
        .maybeSingle();

      if (!scheduleRow) {
        return new Response(JSON.stringify({ step: "schedule", organization_id: orgId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orgStatus = (memberRow.organizations as any)?.onboarding_status ?? "setup_in_progress";

      if (orgStatus === "active") {
        return new Response(JSON.stringify({ step: "complete", organization_id: orgId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ step: "summary", organization_id: orgId, onboarding_status: orgStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // POST — handle wizard steps
    // ----------------------------------------------------------------
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const step = body.step as string;

    // ----------------------------------------------------------------
    // Step: clinic
    // ----------------------------------------------------------------
    if (step === "clinic") {
      const clinicName = body.clinicName as string;
      if (!clinicName?.trim()) {
        return new Response(JSON.stringify({ error: "clinicName is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const slug = `${slugify(clinicName)}-${randomSuffix()}`;

      // Insert organization
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: clinicName.trim(),
          slug,
          owner_user_id: userId,
          onboarding_status: "setup_in_progress",
        })
        .select("id")
        .single();

      if (orgError) {
        console.error("[onboarding/clinic] org insert error:", orgError);
        return new Response(JSON.stringify({ error: orgError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orgId = orgData.id;

      // Insert clinic
      const { data: clinicData, error: clinicError } = await supabaseAdmin
        .from("clinics")
        .insert({ organization_id: orgId, name: clinicName.trim() })
        .select("id")
        .single();

      if (clinicError) {
        console.error("[onboarding/clinic] clinic insert error:", clinicError);
        return new Response(JSON.stringify({ error: clinicError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const clinicId = clinicData.id;

      // Insert org_member
      const { error: memberError } = await supabaseAdmin
        .from("org_members")
        .insert({ organization_id: orgId, user_id: userId, role: "admin", is_active: true });

      if (memberError) {
        console.error("[onboarding/clinic] org_member insert error:", memberError);
        return new Response(JSON.stringify({ error: memberError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert user_roles for backward compatibility
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ organization_id: orgId, clinic_id: clinicId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // Steps that require existing org membership
    // ----------------------------------------------------------------
    const { data: memberRow, error: memberError } = await supabaseAdmin
      .from("org_members")
      .select("organization_id, doctor_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (memberError || !memberRow) {
      return new Response(JSON.stringify({ error: "No organization found. Complete clinic step first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = memberRow.organization_id;

    // ----------------------------------------------------------------
    // Step: doctor
    // ----------------------------------------------------------------
    if (step === "doctor") {
      const name = body.name as string;
      const prefix = body.prefix as string | undefined;
      const email = body.email as string | undefined;
      const phone = body.phone as string | undefined;

      if (!name?.trim()) {
        return new Response(JSON.stringify({ error: "name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: doctorData, error: doctorError } = await supabaseAdmin
        .from("doctors")
        .insert({
          name: name.trim(),
          prefix: prefix ?? null,
          email: email ?? null,
          phone: phone ?? null,
          user_id: userId,
          organization_id: orgId,
        })
        .select("id")
        .single();

      if (doctorError) {
        console.error("[onboarding/doctor] doctor insert error:", doctorError);
        return new Response(JSON.stringify({ error: doctorError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const doctorId = doctorData.id;

      // Update org_member with doctor_id
      const { error: updateError } = await supabaseAdmin
        .from("org_members")
        .update({ doctor_id: doctorId })
        .eq("user_id", userId)
        .eq("organization_id", orgId);

      if (updateError) {
        console.error("[onboarding/doctor] org_member update error:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ doctor_id: doctorId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // Step: schedule
    // ----------------------------------------------------------------
    if (step === "schedule") {
      const schedules = body.schedules as Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
      }>;

      if (!Array.isArray(schedules) || schedules.length === 0) {
        return new Response(JSON.stringify({ error: "At least one schedule slot is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get doctor_id from org_member
      const doctorId = memberRow.doctor_id;
      if (!doctorId) {
        return new Response(JSON.stringify({ error: "No doctor found. Complete doctor step first." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get clinic_id from org
      const { data: clinicRow } = await supabaseAdmin
        .from("clinics")
        .select("id")
        .eq("organization_id", orgId)
        .limit(1)
        .maybeSingle();

      const clinicId = clinicRow?.id ?? null;

      // Insert calendar
      const { data: calendarData, error: calendarError } = await supabaseAdmin
        .from("calendars")
        .insert({
          name: "Agenda principal",
          organization_id: orgId,
          clinic_id: clinicId,
        })
        .select("id")
        .single();

      if (calendarError) {
        console.error("[onboarding/schedule] calendar insert error:", calendarError);
        return new Response(JSON.stringify({ error: calendarError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const calendarId = calendarData.id;

      // Insert calendar_doctors
      const { error: cdError } = await supabaseAdmin
        .from("calendar_doctors")
        .insert({ calendar_id: calendarId, doctor_id: doctorId });

      if (cdError) {
        console.error("[onboarding/schedule] calendar_doctors insert error:", cdError);
        return new Response(JSON.stringify({ error: cdError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert calendar_schedules
      const calendarSchedules = schedules.map((s) => ({
        calendar_id: calendarId,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      }));

      const { error: csError } = await supabaseAdmin
        .from("calendar_schedules")
        .insert(calendarSchedules);

      if (csError) {
        console.error("[onboarding/schedule] calendar_schedules insert error:", csError);
        return new Response(JSON.stringify({ error: csError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Dual-write to doctor_schedules
      const doctorSchedules = schedules.map((s) => ({
        doctor_id: doctorId,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      }));

      const { error: dsError } = await supabaseAdmin
        .from("doctor_schedules")
        .insert(doctorSchedules);

      if (dsError) {
        console.error("[onboarding/schedule] doctor_schedules insert error:", dsError);
        return new Response(JSON.stringify({ error: dsError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ calendar_id: calendarId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // Step: complete
    // ----------------------------------------------------------------
    if (step === "complete") {
      const { error: updateError } = await supabaseAdmin
        .from("organizations")
        .update({ onboarding_status: "ready_to_activate" })
        .eq("id", orgId);

      if (updateError) {
        console.error("[onboarding/complete] update error:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown step: ${step}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[onboarding-setup] Unhandled error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
