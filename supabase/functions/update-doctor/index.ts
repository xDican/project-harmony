import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header (user's JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT (not service role!)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'https://soxrlxvivuplezssgssq.supabase.co',
      Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHJseHZpdnVwbGV6c3Nnc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTMyMTEsImV4cCI6MjA3OTA4OTIxMX0.1w7xGqP6GBi7NcP6a5vDGwTZQWCvZ5wsykIwLz6hk9U',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Parse and normalize body (support both doctorId and doctor_id)
    const rawBody = await req.json().catch(() => ({}));
    const doctorId = rawBody.doctorId ?? rawBody.doctor_id;
    const { name, phone, specialtyId } = rawBody;

    console.log('[update-doctor] Received:', { doctorId, name, phone, specialtyId, rawBody });

    // Validate required fields
    if (!doctorId) {
      console.error('[update-doctor] Missing doctorId in request body');
      return new Response(
        JSON.stringify({ error: 'Missing doctor_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (specialtyId !== undefined) updateData.specialty_id = specialtyId;

    console.log('[update-doctor] Updating doctor:', doctorId, 'with:', updateData);

    // Update the doctor record
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
        JSON.stringify({ error: 'Doctor not found' }),
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
