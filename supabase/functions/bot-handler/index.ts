/**
 * Bot Handler - Central state machine orchestrator for WhatsApp bot
 *
 * Handles:
 * - Session management (load/create/update bot_sessions)
 * - State transitions based on user input
 * - FAQ search with priority (doctor → clinic → org)
 * - Appointment booking flow (weeks → days → hours)
 * - Reschedule/cancel flows
 * - Handoff to secretary
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { DateTime } from 'https://esm.sh/luxon@3.4.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

// ============================================================================
// TYPES
// ============================================================================

type BotState =
  | 'greeting'
  | 'main_menu'
  | 'faq_search'
  | 'booking_select_doctor'
  | 'booking_select_week'
  | 'booking_select_day'
  | 'booking_select_hour'
  | 'booking_confirm'
  | 'reschedule_list'
  | 'reschedule_select_week'
  | 'reschedule_select_day'
  | 'reschedule_select_hour'
  | 'reschedule_confirm'
  | 'cancel_confirm'
  | 'handoff_secretary'
  | 'completed'
  | 'expired';

interface BotSession {
  id: string;
  whatsapp_line_id: string;
  patient_phone: string;
  state: BotState;
  context: Record<string, any>;
  last_message_at: string;
  expires_at: string;
  created_at: string;
}

interface BotResponse {
  message: string;
  options?: string[];
  requiresInput: boolean;
  nextState: BotState;
  sessionComplete: boolean;
}

interface BotFAQ {
  id: string;
  organization_id?: string | null;
  clinic_id?: string | null;
  doctor_id?: string | null;
  question: string;
  answer: string;
  keywords: string[];
  scope_priority: number;
  is_active: boolean;
  display_order: number;
}

interface BotHandlerInput {
  whatsappLineId: string;
  patientPhone: string;
  messageText: string;
  organizationId: string;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate x-internal-secret header
  const internalSecretHeader = req.headers.get('x-internal-secret') || req.headers.get('X-Internal-Secret') || '';
  const internalSecretEnv = Deno.env.get('INTERNAL_FUNCTION_SECRET') || '';

  if (!internalSecretHeader || !internalSecretEnv || internalSecretHeader !== internalSecretEnv) {
    console.error('[bot-handler] Unauthorized: invalid or missing x-internal-secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const input: BotHandlerInput = await req.json();
    console.log('[bot-handler] Input:', input);

    const response = await handleBotMessage(input, supabase);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[bot-handler] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

async function handleBotMessage(
  input: BotHandlerInput,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const { whatsappLineId, patientPhone, messageText, organizationId } = input;

  // Load or create session
  let session = await loadSession(whatsappLineId, patientPhone, supabase);

  if (!session) {
    // Create new session
    session = await createSession(whatsappLineId, patientPhone, organizationId, supabase);
  } else {
    // Check if session expired
    const now = DateTime.now();
    const expiresAt = DateTime.fromISO(session.expires_at);

    if (now > expiresAt) {
      console.log('[bot-handler] Session expired, resetting');
      session = await resetSession(session.id, supabase);
    }
  }

  // Route to state handler based on current state
  let response: BotResponse;

  switch (session.state) {
    case 'greeting':
      response = await handleGreeting(session, organizationId, supabase);
      break;

    case 'main_menu':
      response = await handleMainMenu(messageText, session, organizationId, supabase);
      break;

    case 'faq_search':
      response = await handleFAQSearch(messageText, session, organizationId, supabase);
      break;

    case 'booking_select_doctor':
      response = await handleBookingSelectDoctor(messageText, session, organizationId, supabase);
      break;

    case 'booking_select_week':
      response = await handleBookingSelectWeek(messageText, session, organizationId, supabase);
      break;

    case 'booking_select_day':
      response = await handleBookingSelectDay(messageText, session, organizationId, supabase);
      break;

    case 'booking_select_hour':
      response = await handleBookingSelectHour(messageText, session, organizationId, supabase);
      break;

    case 'booking_confirm':
      response = await handleBookingConfirm(messageText, session, organizationId, supabase);
      break;

    case 'reschedule_list':
      response = await handleRescheduleList(messageText, session, organizationId, supabase);
      break;

    case 'cancel_confirm':
      response = await handleCancelConfirm(messageText, session, organizationId, supabase);
      break;

    case 'handoff_secretary':
      response = await handleHandoffToSecretary(whatsappLineId, patientPhone, organizationId, supabase);
      break;

    default:
      // Unknown state, reset to greeting
      response = await handleGreeting(session, organizationId, supabase);
  }

  // Update session with new state and context
  await updateSession(session.id, response.nextState, session.context, response.sessionComplete, supabase);

  return response;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

async function loadSession(
  whatsappLineId: string,
  patientPhone: string,
  supabase: SupabaseClient
): Promise<BotSession | null> {
  const { data, error } = await supabase
    .from('bot_sessions')
    .select('*')
    .eq('whatsapp_line_id', whatsappLineId)
    .eq('patient_phone', patientPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[loadSession] Error:', error);
    return null;
  }

  return data;
}

async function createSession(
  whatsappLineId: string,
  patientPhone: string,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotSession> {
  const now = DateTime.now().setZone('America/Tegucigalpa');
  const expiresAt = now.plus({ minutes: 45 }); // 45 min timeout

  const { data, error } = await supabase
    .from('bot_sessions')
    .upsert(
      {
        whatsapp_line_id: whatsappLineId,
        patient_phone: patientPhone,
        state: 'greeting',
        context: {},
        last_message_at: now.toISO(),
        expires_at: expiresAt.toISO(),
      },
      { onConflict: 'whatsapp_line_id,patient_phone' }
    )
    .select()
    .single();

  if (error) {
    console.error('[createSession] Error:', error);
    throw error;
  }

  return data;
}

async function resetSession(
  sessionId: string,
  supabase: SupabaseClient
): Promise<BotSession> {
  const now = DateTime.now().setZone('America/Tegucigalpa');
  const expiresAt = now.plus({ minutes: 45 });

  const { data, error } = await supabase
    .from('bot_sessions')
    .update({
      state: 'greeting',
      context: {},
      last_message_at: now.toISO(),
      expires_at: expiresAt.toISO(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('[resetSession] Error:', error);
    throw error;
  }

  return data;
}

async function updateSession(
  sessionId: string,
  nextState: BotState,
  context: Record<string, any>,
  sessionComplete: boolean,
  supabase: SupabaseClient
): Promise<void> {
  const now = DateTime.now().setZone('America/Tegucigalpa');

  const updates: any = {
    state: sessionComplete ? 'completed' : nextState,
    context,
    last_message_at: now.toISO(),
  };

  const { error } = await supabase
    .from('bot_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) {
    console.error('[updateSession] Error:', error);
    throw error;
  }
}

// ============================================================================
// STATE HANDLERS
// ============================================================================

async function handleGreeting(
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // Get bot greeting from whatsapp_line
  const { data: lineData } = await supabase
    .from('whatsapp_lines')
    .select('bot_greeting, label')
    .eq('id', session.whatsapp_line_id)
    .single();

  const greeting = lineData?.bot_greeting || '¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte?';

  return {
    message: greeting,
    options: [
      'Agendar cita',
      'Reagendar o cancelar cita',
      'Preguntas frecuentes (FAQs)',
      'Hablar con secretaría',
    ],
    requiresInput: true,
    nextState: 'main_menu',
    sessionComplete: false,
  };
}

async function handleMainMenu(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const normalizedInput = input.trim().toLowerCase();

  // Parse input - accept number or text matching
  if (normalizedInput === '1' || normalizedInput.includes('agendar') && !normalizedInput.includes('reagendar')) {
    // Start booking flow
    return await startBookingFlow(session, organizationId, supabase);
  }

  if (normalizedInput === '2' || normalizedInput.includes('reagendar') || normalizedInput.includes('cancelar')) {
    // Start reschedule/cancel flow
    return await startRescheduleFlow(session, organizationId, supabase);
  }

  if (normalizedInput === '3' || normalizedInput.includes('faq') || normalizedInput.includes('pregunta')) {
    return {
      message: '¿Qué te gustaría saber? Escribe tu pregunta y buscaré la respuesta.',
      requiresInput: true,
      nextState: 'faq_search',
      sessionComplete: false,
    };
  }

  if (normalizedInput === '4' || normalizedInput.includes('secretar')) {
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase);
  }

  // Invalid input - increment attempt counter
  const invalidAttempts = (session.context.invalidAttempts || 0) + 1;
  session.context.invalidAttempts = invalidAttempts;

  if (invalidAttempts >= 3) {
    // Auto-handoff after 3 invalid attempts
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase);
  }

  return {
    message: 'No entendí tu respuesta. Por favor selecciona una opción:',
    options: [
      'Agendar cita',
      'Reagendar o cancelar cita',
      'Preguntas frecuentes (FAQs)',
      'Hablar con secretaría',
    ],
    requiresInput: true,
    nextState: 'main_menu',
    sessionComplete: false,
  };
}

async function handleFAQSearch(
  query: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // Get doctor_id and clinic_id from session context if available
  const doctorId = session.context.doctorId;
  const clinicId = session.context.clinicId;

  const faq = await searchFAQ(query, doctorId, clinicId, organizationId, supabase);

  if (faq) {
    return {
      message: `*${faq.question}*\n\n${faq.answer}\n\n¿Necesitas algo más?`,
      options: ['Volver al menú principal', 'Otra pregunta'],
      requiresInput: true,
      nextState: 'faq_search',
      sessionComplete: false,
    };
  }

  // No FAQ found
  return {
    message: 'No encontré una respuesta para esa pregunta. ¿Te gustaría hablar con la secretaría?',
    options: ['Sí, contactar secretaría', 'No, volver al menú'],
    requiresInput: true,
    nextState: 'faq_search',
    sessionComplete: false,
  };
}

// ============================================================================
// BOOKING FLOW HANDLERS
// ============================================================================

async function startBookingFlow(
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // Get doctors linked to this WhatsApp line
  const { data: lineDoctors } = await supabase
    .from('whatsapp_line_doctors')
    .select(`
      doctor:doctor_id (
        id,
        name,
        prefix
      ),
      calendar:calendar_id (
        id,
        name
      )
    `)
    .eq('whatsapp_line_id', session.whatsapp_line_id);

  if (!lineDoctors || lineDoctors.length === 0) {
    return {
      message: 'No hay doctores disponibles para agendar. Te conecto con la secretaría.',
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  // If only 1 doctor, auto-select
  if (lineDoctors.length === 1) {
    const doctor = lineDoctors[0].doctor;
    const calendar = lineDoctors[0].calendar;

    session.context.doctorId = doctor.id;
    session.context.doctorName = `${doctor.prefix} ${doctor.name}`;
    session.context.calendarId = calendar.id;

    return await handleBookingSelectWeek('', session, organizationId, supabase);
  }

  // Multiple doctors - show selection
  const options = lineDoctors.map((ld: any) => {
    const doc = ld.doctor;
    return `${doc.prefix} ${doc.name}`;
  });

  // Store doctors in context for later selection
  session.context.availableDoctors = lineDoctors.map((ld: any) => ({
    id: ld.doctor.id,
    name: `${ld.doctor.prefix} ${ld.doctor.name}`,
    calendarId: ld.calendar.id,
  }));

  return {
    message: '¿Con qué doctor deseas agendar?',
    options,
    requiresInput: true,
    nextState: 'booking_select_doctor',
    sessionComplete: false,
  };
}

async function handleBookingSelectDoctor(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const availableDoctors = session.context.availableDoctors || [];
  const selection = parseInt(input.trim());

  if (isNaN(selection) || selection < 1 || selection > availableDoctors.length) {
    return {
      message: 'Opción inválida. Por favor selecciona un número de la lista:',
      options: availableDoctors.map((d: any) => d.name),
      requiresInput: true,
      nextState: 'booking_select_doctor',
      sessionComplete: false,
    };
  }

  const selectedDoctor = availableDoctors[selection - 1];
  session.context.doctorId = selectedDoctor.id;
  session.context.doctorName = selectedDoctor.name;
  session.context.calendarId = selectedDoctor.calendarId;

  // Move to week selection
  return await handleBookingSelectWeek('', session, organizationId, supabase);
}

async function handleBookingSelectWeek(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // Get default duration from whatsapp_line
  const { data: lineData } = await supabase
    .from('whatsapp_lines')
    .select('default_duration_minutes')
    .eq('id', session.whatsapp_line_id)
    .single();

  const durationMinutes = lineData?.default_duration_minutes || 60;
  session.context.durationMinutes = durationMinutes;

  // Get available weeks
  const weeks = await getAvailableWeeks(session.context.doctorId, durationMinutes, supabase);

  if (weeks.length === 0) {
    return {
      message: 'No hay disponibilidad en las próximas 2 semanas. Te conecto con la secretaría para agendar en fechas futuras.',
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  return {
    message: `Selecciona la semana para tu cita con ${session.context.doctorName}:`,
    options: weeks.map((w) => w.weekLabel),
    requiresInput: true,
    nextState: 'booking_select_day',
    sessionComplete: false,
  };
}

async function handleBookingSelectDay(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // TODO: Implement day selection logic
  return {
    message: 'Función de selección de día en desarrollo.',
    requiresInput: false,
    nextState: 'handoff_secretary',
    sessionComplete: true,
  };
}

async function handleBookingSelectHour(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // TODO: Implement hour selection logic
  return {
    message: 'Función de selección de hora en desarrollo.',
    requiresInput: false,
    nextState: 'handoff_secretary',
    sessionComplete: true,
  };
}

async function handleBookingConfirm(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // TODO: Implement booking confirmation logic
  return {
    message: 'Función de confirmación de cita en desarrollo.',
    requiresInput: false,
    nextState: 'completed',
    sessionComplete: true,
  };
}

// ============================================================================
// RESCHEDULE/CANCEL FLOW HANDLERS
// ============================================================================

async function startRescheduleFlow(
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // Find patient by phone
  const patient = await findPatientByPhone(session.patient_phone, organizationId, supabase);

  if (!patient) {
    return {
      message: 'No encontré tu información en el sistema. Por favor contacta a la secretaría.',
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  session.context.patientId = patient.id;
  session.context.patientName = patient.name;

  return await handleRescheduleList('', session, organizationId, supabase);
}

async function handleRescheduleList(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const patientId = session.context.patientId;

  if (!patientId) {
    return {
      message: 'No encontré tu información. Te conecto con la secretaría.',
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  const appointments = await getPatientUpcomingAppointments(patientId, organizationId, supabase);

  if (appointments.length === 0) {
    return {
      message: 'No tienes citas programadas para reagendar o cancelar.',
      options: ['Volver al menú principal'],
      requiresInput: true,
      nextState: 'main_menu',
      sessionComplete: false,
    };
  }

  // TODO: Implement appointment selection and reschedule logic
  return {
    message: 'Función de reagendado en desarrollo.',
    requiresInput: false,
    nextState: 'handoff_secretary',
    sessionComplete: true,
  };
}

async function handleCancelConfirm(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // TODO: Implement cancel confirmation logic
  return {
    message: 'Función de cancelación en desarrollo.',
    requiresInput: false,
    nextState: 'completed',
    sessionComplete: true,
  };
}

// ============================================================================
// HANDOFF HANDLER
// ============================================================================

async function handleHandoffToSecretary(
  whatsappLineId: string,
  patientPhone: string,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // Find active secretaries in organization
  const { data: secretaries } = await supabase
    .from('org_members')
    .select('user_id, users!inner(email)')
    .eq('organization_id', organizationId)
    .eq('role', 'secretary')
    .eq('is_active', true)
    .limit(1);

  if (secretaries && secretaries.length > 0) {
    // TODO: Send notification to secretary (email or WhatsApp)
    console.log(`[bot] Handoff to secretary for patient ${patientPhone}, org ${organizationId}`);
  }

  return {
    message: 'Te estoy conectando con nuestra secretaría. En breve recibirás respuesta. 📞',
    requiresInput: false,
    nextState: 'handoff_secretary',
    sessionComplete: true,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function searchFAQ(
  query: string,
  doctorId: string | undefined,
  clinicId: string | undefined,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotFAQ | null> {
  // Normalize query: lowercase, remove accents, trim
  const normalizedQuery = query.toLowerCase().trim();

  // Build search query with priority order
  let orCondition: string;
  if (doctorId) {
    orCondition = `doctor_id.eq.${doctorId},clinic_id.eq.${clinicId || 'null'},organization_id.eq.${organizationId}`;
  } else if (clinicId) {
    orCondition = `clinic_id.eq.${clinicId},organization_id.eq.${organizationId}`;
  } else {
    orCondition = `organization_id.eq.${organizationId}`;
  }

  const { data: faqs, error } = await supabase
    .from('bot_faqs')
    .select('*')
    .eq('is_active', true)
    .or(orCondition)
    .order('scope_priority', { ascending: true }); // 1=doctor, 2=clinic, 3=org

  if (error || !faqs) return null;

  // Find best match: keyword overlap
  let bestMatch: BotFAQ | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const keywords = faq.keywords || [];
    let score = 0;

    // Check if query contains any keyword
    for (const keyword of keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    // Also check if question contains query words
    const queryWords = normalizedQuery.split(/\s+/);
    for (const word of queryWords) {
      if (word.length >= 3 && faq.question.toLowerCase().includes(word)) {
        score += 0.5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

async function getAvailableWeeks(
  doctorId: string,
  durationMinutes: number,
  supabase: SupabaseClient
): Promise<{ weekStart: string; weekLabel: string }[]> {
  const timezone = 'America/Tegucigalpa';
  const now = DateTime.now().setZone(timezone);
  const weeks: { weekStart: string; weekLabel: string }[] = [];

  // Check next 2 weeks
  for (let i = 0; i < 2; i++) {
    const weekStart = now.plus({ weeks: i }).startOf('week'); // Monday
    const weekEnd = weekStart.plus({ days: 6 }); // Sunday

    // Check if week has at least 1 available slot
    const hasSlots = await weekHasAvailableSlots(
      doctorId,
      weekStart.toISODate() || '',
      weekEnd.toISODate() || '',
      durationMinutes,
      supabase
    );

    if (hasSlots) {
      const label = `Semana del ${weekStart.toFormat('dd MMM', { locale: 'es' })} al ${weekEnd.toFormat('dd MMM', { locale: 'es' })}`;
      weeks.push({
        weekStart: weekStart.toISODate() || '',
        weekLabel: label,
      });
    }
  }

  return weeks;
}

async function weekHasAvailableSlots(
  doctorId: string,
  weekStart: string,
  weekEnd: string,
  durationMinutes: number,
  supabase: SupabaseClient
): Promise<boolean> {
  // Check if ANY day in the week has schedules defined
  const { data: schedules } = await supabase
    .from('doctor_schedules')
    .select('day_of_week')
    .eq('doctor_id', doctorId);

  if (!schedules || schedules.length === 0) return false;

  // For MVP: assume if schedules exist, week has slots
  // TODO: More sophisticated check - query appointments to see if slots exist
  return true;
}

async function findPatientByPhone(
  phone: string,
  organizationId: string,
  supabase: SupabaseClient
): Promise<any | null> {
  // Search by normalized phone
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('organization_id', organizationId)
    .or(`phone.eq.${phone},phone.eq.+504${phone}`)
    .limit(1)
    .maybeSingle();

  return patient || null;
}

async function getPatientUpcomingAppointments(
  patientId: string,
  organizationId: string,
  supabase: SupabaseClient
): Promise<any[]> {
  const now = DateTime.now().setZone('America/Tegucigalpa').toISODate();

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, date, time, status, notes, duration_minutes,
      doctors:doctor_id (id, name, prefix)
    `)
    .eq('patient_id', patientId)
    .eq('organization_id', organizationId)
    .gte('date', now || '')
    .in('status', ['agendada', 'confirmada'])
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .limit(5);

  return appointments || [];
}
