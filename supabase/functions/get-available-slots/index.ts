import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getAvailableSlotsForDate } from "../_shared/availability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod schema for request validation
const RequestSchema = z.object({
  doctorId: z.string().uuid("doctorId debe ser un UUID válido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date debe estar en formato YYYY-MM-DD"),
  durationMinutes: z.number().int().min(15).max(480).optional().default(60),
  calendarId: z.string().uuid("calendarId debe ser un UUID válido").optional(),
  // 2B (opcional): si se pasa, el motor es resource-aware (excluye slots sin
  // capacidad de recurso + aplica buffer). El org se deriva del service_type.
  serviceTypeId: z.string().uuid("serviceTypeId debe ser un UUID válido").optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[get-available-slots] Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Environment variables - use service role to bypass RLS (co-work needs cross-doctor visibility)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[get-available-slots] Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Supabase env vars not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Create Supabase client with service role (verify_jwt at gateway handles auth)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4) Parse and validate request body with Zod
    const rawBody = await req.json();
    const validationResult = RequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      console.error("[get-available-slots] Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Datos de entrada inválidos",
          details: validationResult.error.errors
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { doctorId, date, durationMinutes, calendarId, serviceTypeId } = validationResult.data;
    console.log("[get-available-slots] Request:", { doctorId, date, durationMinutes, calendarId, serviceTypeId });

    // 2B: si se pasa serviceTypeId, derivar el org para el chequeo de recursos
    let organizationId: string | undefined;
    if (serviceTypeId) {
      const { data: stRow } = await supabase
        .from("service_types")
        .select("organization_id")
        .eq("id", serviceTypeId)
        .maybeSingle();
      organizationId = (stRow as any)?.organization_id ?? undefined;
    }

    // 5) Verify doctor exists
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id")
      .eq("id", doctorId)
      .maybeSingle();

    if (doctorError || !doctor) {
      console.error("[get-available-slots] Doctor not found:", doctorError);
      return new Response(JSON.stringify({ error: "Doctor no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Calcular slots con el motor unico (_shared/availability.ts)
    const uniqueSorted = await getAvailableSlotsForDate(supabase, {
      doctorId,
      date,
      durationMinutes,
      calendarId,
      serviceTypeId,
      organizationId,
    });

    console.log("[get-available-slots] Available slots:", uniqueSorted.length);

    return new Response(JSON.stringify({ slots: uniqueSorted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[get-available-slots] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
