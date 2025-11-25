import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zod schema for request validation
const UpdateDoctorSchema = z.object({
  doctorId: z.string().uuid("doctorId debe ser un UUID válido").optional(),
  doctor_id: z.string().uuid("doctor_id debe ser un UUID válido").optional(),
  name: z.string().min(1, "name no puede estar vacío").max(255, "name no puede exceder 255 caracteres").optional(),
  phone: z.string().max(20, "phone no puede exceder 20 caracteres").optional().nullable(),
  specialtyId: z.string().uuid("specialtyId debe ser un UUID válido").optional().nullable(),
}).refine(data => data.doctorId || data.doctor_id, {
  message: "Se requiere doctorId o doctor_id",
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Authentication: Get the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[update-doctor] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2) Environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[update-doctor] Missing Supabase env vars');
      return new Response(
        JSON.stringify({ error: 'Supabase env vars not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3) Create Supabase client with user's JWT (not service role!)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // 4) Parse and validate request body with Zod
    const rawBody = await req.json().catch(() => ({}));
    const validationResult = UpdateDoctorSchema.safeParse(rawBody);

    if (!validationResult.success) {
      console.error('[update-doctor] Validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Datos de entrada inválidos', 
          details: validationResult.error.errors 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validatedData = validationResult.data;
    const doctorId = validatedData.doctorId ?? validatedData.doctor_id;
    const { name, phone, specialtyId } = validatedData;

    console.log('[update-doctor] Received:', { doctorId, name, phone, specialtyId });

    // 5) Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (specialtyId !== undefined) updateData.specialty_id = specialtyId;

    // 6) Verify there's at least one field to update
    if (Object.keys(updateData).length === 0) {
      console.error('[update-doctor] No fields to update');
      return new Response(
        JSON.stringify({ error: 'No se proporcionaron campos para actualizar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[update-doctor] Updating doctor:', doctorId, 'with:', updateData);

    // 7) Update the doctor record
    const { data: doctor, error: updateError } = await supabaseClient
      .from('doctors')
      .update(updateData)
      .eq('id', doctorId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('[update-doctor] Error updating doctor:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!doctor) {
      console.error('[update-doctor] Doctor not found with id:', doctorId);
      return new Response(
        JSON.stringify({ error: 'Doctor no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[update-doctor] Successfully updated doctor:', doctor);

    return new Response(
      JSON.stringify({ success: true, doctor }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[update-doctor] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
