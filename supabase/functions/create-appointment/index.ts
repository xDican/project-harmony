import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAppointmentRequest {
  doctorId: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or HH:MM:SS
  notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { doctorId, patientId, date, time, notes } = await req.json() as CreateAppointmentRequest;

    console.log('Creating appointment:', { doctorId, patientId, date, time, notes });

    // Validar que los campos requeridos estén presentes
    if (!doctorId || !patientId || !date || !time) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: doctorId, patientId, date, time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el horario no esté ocupado
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .eq('time', time)
      .neq('status', 'cancelled');

    if (checkError) {
      console.error('Error checking existing appointments:', checkError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar disponibilidad del horario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return new Response(
        JSON.stringify({ error: 'El horario seleccionado ya está ocupado' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear la cita
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        doctor_id: doctorId,
        patient_id: patientId,
        date,
        time,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating appointment:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error al crear la cita' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Appointment created successfully:', appointment);

    return new Response(
      JSON.stringify({ success: true, appointment }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in create-appointment:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
