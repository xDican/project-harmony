import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  doctorId: string;
  date: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with project credentials
    const supabase = createClient(
      'https://soxrlxvivuplezssgssq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHJseHZpdnVwbGV6c3Nnc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTMyMTEsImV4cCI6MjA3OTA4OTIxMX0.1w7xGqP6GBi7NcP6a5vDGwTZQWCvZ5wsykIwLz6hk9U'
    );

    // Parse request body
    const body: RequestBody = await req.json();
    const { doctorId, date } = body;

    console.log('[get-available-slots] Request:', { doctorId, date });

    // Validate required fields
    if (!doctorId || !date) {
      console.error('[get-available-slots] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'doctorId and date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get day of week (0=Sunday, 6=Saturday)
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    console.log('[get-available-slots] Day of week:', dayOfWeek);

    // Get doctor schedules for this day
    const { data: schedules, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek);

    if (scheduleError) {
      console.error('[get-available-slots] Error fetching schedules:', scheduleError);
      return new Response(
        JSON.stringify({ error: 'Error fetching doctor schedule' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-available-slots] Schedules found:', schedules);

    // If no schedule for this day, return empty array
    if (!schedules || schedules.length === 0) {
      console.log('[get-available-slots] No schedule found for this day');
      return new Response(
        JSON.stringify({ slots: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing appointments for this doctor on this date (excluding cancelled)
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('time')
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .neq('status', 'cancelled');

    if (appointmentsError) {
      console.error('[get-available-slots] Error fetching appointments:', appointmentsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching appointments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-available-slots] Existing appointments:', appointments);

    // Create set of occupied times
    const occupiedTimes = new Set(appointments?.map(apt => apt.time) || []);

    // Generate all possible slots for the day
    const allSlots: string[] = [];
    
    for (const schedule of schedules) {
      const startTime = schedule.start_time;
      const endTime = schedule.end_time;
      const slotDuration = 30; // Default 30 minutes

      // Parse start and end times (format: HH:MM:SS or HH:MM)
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      let currentMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const timeSlot = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        
        // Add slot if not occupied
        if (!occupiedTimes.has(timeSlot) && !occupiedTimes.has(timeSlot + ':00')) {
          allSlots.push(timeSlot);
        }

        currentMinutes += slotDuration;
      }
    }

    console.log('[get-available-slots] Available slots:', allSlots);

    return new Response(
      JSON.stringify({ slots: allSlots }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-available-slots] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
