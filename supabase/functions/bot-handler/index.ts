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
  | 'booking_ask_name'     // Asks patient name when not registered in DB
  | 'reschedule_list'      // Shows patient's upcoming appointments for reschedule/cancel
  | 'cancel_confirm'       // Two-phase: action selection → delete confirmation (uses context.cancelConfirmPhase)
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
  const startTime = Date.now();
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

  const stateBefore = session.state;

  // Universal escape: "0" or "reiniciar" resets to greeting from any state
  const trimmedMsg = messageText.trim().toLowerCase();
  if (session.state !== 'greeting' && (trimmedMsg === '0' || trimmedMsg === 'reiniciar' || trimmedMsg === 'inicio')) {
    console.log('[bot-handler] User requested session reset with:', trimmedMsg);
    session = await resetSession(session.id, supabase);
    // Fall through to greeting handler
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

    case 'booking_ask_name':
      response = await handleBookingAskName(messageText, session, organizationId, supabase);
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

  // Log conversation asynchronously (fire and forget - don't block response)
  const responseTimeMs = Date.now() - startTime;
  const intent = detectIntent(stateBefore, response.nextState, messageText);
  logConversation(
    session.id, whatsappLineId, organizationId, patientPhone,
    stateBefore, response.nextState, messageText, response.message,
    response.options || [], intent, responseTimeMs, supabase
  ).catch((err) => console.error('[bot-handler] Log error (non-fatal):', err));

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
  const expiresAt = now.plus({ minutes: 30 }); // 30 min timeout

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
  const expiresAt = now.plus({ minutes: 30 });

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
  const normalizedInput = query.trim().toLowerCase();

  // Check if user wants to go back to main menu
  if (normalizedInput === '1' || normalizedInput.includes('volver') || normalizedInput.includes('menú') || normalizedInput.includes('menu')) {
    return {
      message: '¿En qué puedo ayudarte?',
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

  // Check if user wants to contact secretary (from "no FAQ found" options)
  if (normalizedInput === '1' || normalizedInput.includes('secretar') || normalizedInput.includes('sí') || normalizedInput.includes('si, contactar')) {
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase);
  }

  // Check if user wants another question
  if (normalizedInput === '2' || normalizedInput.includes('otra pregunta')) {
    return {
      message: 'Escribe tu pregunta:',
      requiresInput: true,
      nextState: 'faq_search',
      sessionComplete: false,
    };
  }

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
    message: 'No encontré una respuesta para esa pregunta. ¿Qué deseas hacer?',
    options: ['Volver al menú principal', 'Hablar con secretaría'],
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
  const weeks = await getAvailableWeeks(session.context.doctorId, durationMinutes, supabase, session.context.calendarId);

  if (weeks.length === 0) {
    return {
      message: 'No hay disponibilidad en las próximas 2 semanas. Te conecto con la secretaría para agendar en fechas futuras.',
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  // Store weeks in context for selection
  session.context.availableWeeks = weeks;

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
  const availableWeeks = session.context.availableWeeks || [];
  const selection = parseInt(input.trim());

  // Validate selection
  if (isNaN(selection) || selection < 1 || selection > availableWeeks.length) {
    return {
      message: 'Opción inválida. Por favor selecciona una semana:',
      options: availableWeeks.map((w: any) => w.weekLabel),
      requiresInput: true,
      nextState: 'booking_select_day',
      sessionComplete: false,
    };
  }

  const selectedWeek = availableWeeks[selection - 1];
  session.context.selectedWeek = selectedWeek.weekStart;

  // Get available days in the selected week
  const days = await getAvailableDaysInWeek(
    session.context.doctorId,
    selectedWeek.weekStart,
    session.context.durationMinutes || 60,
    supabase,
    session.context.calendarId
  );

  if (days.length === 0) {
    return {
      message: 'No hay días disponibles en esta semana. Selecciona otra semana:',
      options: availableWeeks.map((w: any) => w.weekLabel),
      requiresInput: true,
      nextState: 'booking_select_day',
      sessionComplete: false,
    };
  }

  // Store days in context
  session.context.availableDays = days;

  return {
    message: `¿Qué día prefieres para tu cita con ${session.context.doctorName}?`,
    options: days.map((d: any) => d.label),
    requiresInput: true,
    nextState: 'booking_select_hour',
    sessionComplete: false,
  };
}

async function handleBookingSelectHour(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const availableDays = session.context.availableDays || [];
  const selection = parseInt(input.trim());

  // Check if user wants to see more slots
  if (session.context.availableSlots && input.trim().toLowerCase() === String(session.context.availableSlots.length + 1)) {
    // "Ver más horarios" was selected
    session.context.slotPage = (session.context.slotPage || 1) + 1;
    return await showHourSlots(session, supabase);
  }

  // Check if user is selecting a time slot (already in hour selection mode)
  if (session.context.availableSlots) {
    const slots = session.context.availableSlots as string[];
    if (selection >= 1 && selection <= slots.length) {
      const selectedTime = slots[selection - 1];
      session.context.selectedTime = selectedTime;

      // Show confirmation
      const timezone = 'America/Tegucigalpa';
      const selectedDate = DateTime.fromISO(session.context.selectedDate, { zone: timezone });
      const dayLabel = selectedDate.toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

      return {
        message: `*Resumen de tu cita:*\n\nDoctor: ${session.context.doctorName}\nFecha: ${dayLabel}\nHora: ${selectedTime}\nDuración: ${session.context.durationMinutes} minutos\n\n¿Deseas confirmar esta cita?`,
        options: ['Sí, confirmar', 'No, cambiar horario', 'Cancelar'],
        requiresInput: true,
        nextState: 'booking_confirm',
        sessionComplete: false,
      };
    }

    // Invalid slot selection
    return await showHourSlots(session, supabase);
  }

  // First time: user is selecting a day
  if (isNaN(selection) || selection < 1 || selection > availableDays.length) {
    return {
      message: 'Opción inválida. Por favor selecciona un día:',
      options: availableDays.map((d: any) => d.label),
      requiresInput: true,
      nextState: 'booking_select_hour',
      sessionComplete: false,
    };
  }

  const selectedDay = availableDays[selection - 1];
  session.context.selectedDate = selectedDay.date;
  session.context.slotPage = 1;

  return await showHourSlots(session, supabase);
}

async function showHourSlots(
  session: BotSession,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const PAGE_SIZE = 5;
  const page = session.context.slotPage || 1;

  const result = await getAvailableHoursForDate(
    session.context.doctorId,
    session.context.selectedDate,
    session.context.durationMinutes || 60,
    page,
    PAGE_SIZE,
    supabase,
    session.context.calendarId
  );

  if (result.slots.length === 0) {
    return {
      message: 'No hay horarios disponibles para este día. Selecciona otro día.',
      options: (session.context.availableDays || []).map((d: any) => d.label),
      requiresInput: true,
      nextState: 'booking_select_hour',
      sessionComplete: false,
    };
  }

  // Store current page slots in context
  session.context.availableSlots = result.slots;

  const options = [...result.slots];
  if (result.hasMore) {
    options.push('Ver más horarios');
  }

  const timezone = 'America/Tegucigalpa';
  const selectedDate = DateTime.fromISO(session.context.selectedDate, { zone: timezone });
  const dayLabel = selectedDate.toFormat('EEEE dd MMMM', { locale: 'es' });

  return {
    message: `Horarios disponibles para *${dayLabel}* con ${session.context.doctorName}:`,
    options,
    requiresInput: true,
    nextState: 'booking_select_hour',
    sessionComplete: false,
  };
}

async function handleBookingConfirm(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const normalizedInput = input.trim().toLowerCase();
  const selection = parseInt(input.trim());

  // Option 1: Confirm
  if (selection === 1 || normalizedInput.includes('si') || normalizedInput.includes('sí') || normalizedInput.includes('confirmar')) {
    // Find patient by phone
    let patient = await findPatientByPhone(session.patient_phone, organizationId, supabase);

    if (!patient) {
      // Patient not registered — ask for their name first
      return {
        message: 'Para completar tu cita, necesito tu nombre completo. ¿Cuál es tu nombre?',
        requiresInput: true,
        nextState: 'booking_ask_name',
        sessionComplete: false,
      };
    }

    // Patient found — proceed to create appointment
    return await createAppointmentWithPatient(patient, session, organizationId, supabase);
  }

  // Option 2: Change time
  if (selection === 2 || normalizedInput.includes('cambiar')) {
    session.context.slotPage = 1;
    session.context.availableSlots = null;
    return await showHourSlots(session, supabase);
  }

  // Option 3: Cancel
  if (selection === 3 || normalizedInput.includes('cancelar')) {
    return {
      message: 'Agendado cancelado. ¿Necesitas algo más?',
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

  return {
    message: 'No entendí tu respuesta. ¿Deseas confirmar la cita?',
    options: ['Sí, confirmar', 'No, cambiar horario', 'Cancelar'],
    requiresInput: true,
    nextState: 'booking_confirm',
    sessionComplete: false,
  };
}

async function handleBookingAskName(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const trimmedName = input.trim();

  // Validate: name must be at least 3 characters and not a number
  if (trimmedName.length < 3 || /^\d+$/.test(trimmedName)) {
    return {
      message: 'Por favor ingresa tu nombre completo (ej: Juan Pérez):',
      requiresInput: true,
      nextState: 'booking_ask_name',
      sessionComplete: false,
    };
  }

  // Create the patient record
  const { data: newPatient, error: createError } = await supabase
    .from('patients')
    .insert({
      name: trimmedName,
      phone: session.patient_phone,
      organization_id: organizationId,
      doctor_id: session.context.doctorId,
    })
    .select()
    .single();

  if (createError) {
    console.error('[booking_ask_name] Error creating patient:', createError);
    return {
      message: 'Error al registrar tus datos. Te conecto con la secretaría.',
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  // Store patient info in context
  session.context.patientName = trimmedName;

  // Proceed to create the appointment
  return await createAppointmentWithPatient(newPatient, session, organizationId, supabase);
}

async function createAppointmentWithPatient(
  patient: any,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  // Re-validate slot availability before creating
  const slotsCheck = await getAvailableSlotsForDate(
    session.context.doctorId,
    session.context.selectedDate,
    session.context.durationMinutes || 60,
    supabase,
    session.context.calendarId
  );

  if (!slotsCheck.includes(session.context.selectedTime)) {
    // Slot was taken
    session.context.slotPage = 1;
    session.context.availableSlots = null;
    return {
      message: 'Lo siento, ese horario acaba de ser reservado. Aquí están las opciones actualizadas:',
      requiresInput: true,
      nextState: 'booking_select_hour',
      sessionComplete: false,
    };
  }

  // If this is a reschedule, cancel the old appointment first
  if (session.context.isReschedule && session.context.rescheduleAppointmentId) {
    const { error: cancelOldError } = await supabase
      .from('appointments')
      .update({ status: 'cancelada', notes: 'Reagendada por paciente via WhatsApp Bot' })
      .eq('id', session.context.rescheduleAppointmentId);

    if (cancelOldError) {
      console.error('[createAppointment] Error cancelling old appointment:', cancelOldError);
      // Continue anyway - create the new one
    }
  }

  // Create the appointment
  const appointmentNotes = session.context.isReschedule
    ? `Reagendada via WhatsApp Bot (cita anterior: ${session.context.rescheduleAppointmentDate} ${session.context.rescheduleAppointmentTime})`
    : 'Agendada via WhatsApp Bot';

  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .insert({
      doctor_id: session.context.doctorId,
      patient_id: patient.id,
      date: session.context.selectedDate,
      time: session.context.selectedTime,
      duration_minutes: session.context.durationMinutes || 60,
      status: 'agendada',
      organization_id: organizationId,
      notes: appointmentNotes,
    })
    .select()
    .single();

  if (aptError) {
    console.error('[createAppointment] Error creating appointment:', aptError);
    return {
      message: 'Error al agendar la cita. Te conecto con la secretaría.',
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  const timezone = 'America/Tegucigalpa';
  const dateLabel = DateTime.fromISO(session.context.selectedDate, { zone: timezone })
    .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

  const successEmoji = session.context.isReschedule ? '🔄' : '✅';
  const successTitle = session.context.isReschedule ? '¡Cita reagendada exitosamente!' : '¡Cita agendada exitosamente!';

  return {
    message: `${successEmoji} *${successTitle}*\n\nDoctor: ${session.context.doctorName}\nFecha: ${dateLabel}\nHora: ${session.context.selectedTime}\nDuración: ${session.context.durationMinutes} min\n\nRecibirás un recordatorio antes de tu cita. ¡Gracias!`,
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

  // If user already has appointments listed, handle their selection
  if (session.context.upcomingAppointments && input.trim()) {
    const appointments = session.context.upcomingAppointments as any[];
    const selection = parseInt(input.trim());

    // "Volver al menú" is always the last option
    if (selection === appointments.length + 1 || input.trim().toLowerCase().includes('volver') || input.trim().toLowerCase().includes('menu')) {
      return {
        message: '¿En qué puedo ayudarte?',
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

    if (isNaN(selection) || selection < 1 || selection > appointments.length) {
      const options = appointments.map((apt: any) => {
        const dateLabel = DateTime.fromISO(apt.date, { zone: 'America/Tegucigalpa' }).toFormat('dd MMM', { locale: 'es' });
        return `${apt.doctorName} - ${dateLabel} ${apt.time}`;
      });
      options.push('Volver al menú');

      return {
        message: 'Opción inválida. Selecciona una cita:',
        options,
        requiresInput: true,
        nextState: 'reschedule_list',
        sessionComplete: false,
      };
    }

    // Store selected appointment
    const selectedApt = appointments[selection - 1];
    session.context.rescheduleAppointmentId = selectedApt.id;
    session.context.rescheduleAppointmentDate = selectedApt.date;
    session.context.rescheduleAppointmentTime = selectedApt.time;
    session.context.rescheduleAppointmentDoctorName = selectedApt.doctorName;
    session.context.doctorId = selectedApt.doctorId;
    session.context.doctorName = selectedApt.doctorName;

    const dateLabel = DateTime.fromISO(selectedApt.date, { zone: 'America/Tegucigalpa' })
      .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

    return {
      message: `Cita seleccionada:\n\nDoctor: ${selectedApt.doctorName}\nFecha: ${dateLabel}\nHora: ${selectedApt.time}\n\n¿Qué deseas hacer?`,
      options: ['Reagendar cita', 'Cancelar cita', 'Volver al menú'],
      requiresInput: true,
      nextState: 'cancel_confirm',
      sessionComplete: false,
    };
  }

  // First time: fetch and display appointments
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

  // Map appointments for context storage
  const mappedAppointments = appointments.map((apt: any) => ({
    id: apt.id,
    date: apt.date,
    time: apt.time,
    status: apt.status,
    durationMinutes: apt.duration_minutes,
    doctorId: apt.doctors?.id,
    doctorName: apt.doctors ? `${apt.doctors.prefix} ${apt.doctors.name}` : 'Doctor',
  }));

  session.context.upcomingAppointments = mappedAppointments;

  // If only 1 appointment, auto-select it
  if (mappedAppointments.length === 1) {
    const apt = mappedAppointments[0];
    session.context.rescheduleAppointmentId = apt.id;
    session.context.rescheduleAppointmentDate = apt.date;
    session.context.rescheduleAppointmentTime = apt.time;
    session.context.rescheduleAppointmentDoctorName = apt.doctorName;
    session.context.doctorId = apt.doctorId;
    session.context.doctorName = apt.doctorName;

    const dateLabel = DateTime.fromISO(apt.date, { zone: 'America/Tegucigalpa' })
      .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

    return {
      message: `Tienes 1 cita próxima:\n\nDoctor: ${apt.doctorName}\nFecha: ${dateLabel}\nHora: ${apt.time}\n\n¿Qué deseas hacer?`,
      options: ['Reagendar cita', 'Cancelar cita', 'Volver al menú'],
      requiresInput: true,
      nextState: 'cancel_confirm',
      sessionComplete: false,
    };
  }

  // Multiple appointments - list them
  const options = mappedAppointments.map((apt: any) => {
    const dateLabel = DateTime.fromISO(apt.date, { zone: 'America/Tegucigalpa' }).toFormat('dd MMM', { locale: 'es' });
    return `${apt.doctorName} - ${dateLabel} ${apt.time}`;
  });
  options.push('Volver al menú');

  return {
    message: 'Tienes estas citas próximas. ¿Cuál deseas reagendar o cancelar?',
    options,
    requiresInput: true,
    nextState: 'reschedule_list',
    sessionComplete: false,
  };
}

async function handleCancelConfirm(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const normalizedInput = input.trim().toLowerCase();
  const selection = parseInt(input.trim());

  // Two-phase flow:
  //   Phase 1 (cancelConfirmPhase != 'confirm_delete'): [1: Reagendar, 2: Cancelar, 3: Volver]
  //   Phase 2 (cancelConfirmPhase == 'confirm_delete'): [1: Sí cancelar, 2: No volver]
  const isDeleteConfirmPhase = session.context.cancelConfirmPhase === 'confirm_delete';

  if (isDeleteConfirmPhase) {
    // PHASE 2: Final cancellation confirmation
    // Reset phase flag regardless of outcome
    session.context.cancelConfirmPhase = null;

    if (selection === 1 || normalizedInput.includes('sí') || normalizedInput.includes('si') || normalizedInput.includes('cancelar')) {
      // Execute cancellation
      const { error: cancelError } = await supabase
        .from('appointments')
        .update({ status: 'cancelada', notes: 'Cancelada por paciente via WhatsApp Bot' })
        .eq('id', session.context.rescheduleAppointmentId);

      if (cancelError) {
        console.error('[cancel_confirm] Error cancelling:', cancelError);
        return {
          message: 'Error al cancelar la cita. Te conecto con la secretaría.',
          requiresInput: false,
          nextState: 'handoff_secretary',
          sessionComplete: true,
        };
      }

      const dateLabel = DateTime.fromISO(session.context.rescheduleAppointmentDate, { zone: 'America/Tegucigalpa' })
        .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

      return {
        message: `❌ *Cita cancelada*\n\nDoctor: ${session.context.rescheduleAppointmentDoctorName}\nFecha: ${dateLabel}\nHora: ${session.context.rescheduleAppointmentTime}\n\nLa cita ha sido cancelada exitosamente. ¿Necesitas algo más?`,
        options: [
          'Agendar nueva cita',
          'Volver al menú principal',
        ],
        requiresInput: true,
        nextState: 'main_menu',
        sessionComplete: false,
      };
    }

    // Option 2 or "no" → go back to action selection
    if (selection === 2 || normalizedInput.includes('no') || normalizedInput.includes('volver')) {
      return {
        message: '¿Qué deseas hacer con esta cita?',
        options: ['Reagendar cita', 'Cancelar cita', 'Volver al menú'],
        requiresInput: true,
        nextState: 'cancel_confirm',
        sessionComplete: false,
      };
    }

    // Invalid input in delete confirm phase
    return {
      message: '¿Estás seguro que deseas cancelar la cita?',
      options: ['Sí, cancelar cita', 'No, volver'],
      requiresInput: true,
      nextState: 'cancel_confirm',
      sessionComplete: false,
    };
  }

  // PHASE 1: Action selection [Reagendar, Cancelar, Volver]

  // Option 1: Reagendar - start new booking flow for same doctor
  if (selection === 1 || normalizedInput.includes('reagendar')) {
    // We already have doctorId and doctorName in context from reschedule_list
    // Get whatsapp line to fetch default duration
    const { data: lineData } = await supabase
      .from('whatsapp_lines')
      .select('default_duration_minutes')
      .eq('id', session.whatsapp_line_id)
      .single();

    session.context.durationMinutes = lineData?.default_duration_minutes || 60;
    session.context.isReschedule = true; // Flag to know we're rescheduling

    // Go to week selection (reuse booking flow)
    const weeks = await getAvailableWeeks(session.context.doctorId, session.context.durationMinutes, supabase, session.context.calendarId);

    if (weeks.length === 0) {
      return {
        message: 'No hay disponibilidad en las próximas 2 semanas. Te conecto con la secretaría.',
        requiresInput: false,
        nextState: 'handoff_secretary',
        sessionComplete: true,
      };
    }

    session.context.availableWeeks = weeks;

    return {
      message: `Selecciona la nueva semana para tu cita con ${session.context.doctorName}:`,
      options: weeks.map((w) => w.weekLabel),
      requiresInput: true,
      nextState: 'booking_select_day',
      sessionComplete: false,
    };
  }

  // Option 2: Cancelar - show confirmation (move to Phase 2)
  if (selection === 2 || normalizedInput.includes('cancelar')) {
    const dateLabel = DateTime.fromISO(session.context.rescheduleAppointmentDate, { zone: 'America/Tegucigalpa' })
      .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

    // Set phase flag so next call knows we're in confirmation mode
    session.context.cancelConfirmPhase = 'confirm_delete';

    return {
      message: `¿Estás seguro que deseas *cancelar* tu cita?\n\nDoctor: ${session.context.rescheduleAppointmentDoctorName}\nFecha: ${dateLabel}\nHora: ${session.context.rescheduleAppointmentTime}\n\n⚠️ Esta acción no se puede deshacer.`,
      options: ['Sí, cancelar cita', 'No, volver'],
      requiresInput: true,
      nextState: 'cancel_confirm',
      sessionComplete: false,
    };
  }

  // Option 3: Volver al menú
  if (selection === 3 || normalizedInput.includes('volver') || normalizedInput.includes('no') || normalizedInput.includes('menu') || normalizedInput.includes('menú')) {
    return {
      message: '¿En qué puedo ayudarte?',
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

  // Invalid input
  return {
    message: 'No entendí tu respuesta. ¿Qué deseas hacer con esta cita?',
    options: ['Reagendar cita', 'Cancelar cita', 'Volver al menú'],
    requiresInput: true,
    nextState: 'cancel_confirm',
    sessionComplete: false,
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
  supabase: SupabaseClient,
  calendarId?: string
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
      supabase,
      calendarId
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
  supabase: SupabaseClient,
  calendarId?: string
): Promise<boolean> {
  if (calendarId) {
    const { data: schedules } = await supabase
      .from('calendar_schedules')
      .select('day_of_week')
      .eq('calendar_id', calendarId);
    return !!(schedules && schedules.length > 0);
  }
  const { data: schedules } = await supabase
    .from('doctor_schedules')
    .select('day_of_week')
    .eq('doctor_id', doctorId);

  if (!schedules || schedules.length === 0) return false;
  return true;
}

async function getAvailableDaysInWeek(
  doctorId: string,
  weekStart: string,
  durationMinutes: number,
  supabase: SupabaseClient,
  calendarId?: string
): Promise<{ date: string; label: string }[]> {
  const timezone = 'America/Tegucigalpa';
  const weekStartDt = DateTime.fromISO(weekStart, { zone: timezone });
  const now = DateTime.now().setZone(timezone);
  const days: { date: string; label: string }[] = [];

  for (let i = 0; i < 7; i++) {
    const date = weekStartDt.plus({ days: i });
    const dateStr = date.toISODate() || '';

    // Skip past days
    if (date < now.startOf('day')) continue;

    // Check if this day has available slots
    const slots = await getAvailableSlotsForDate(doctorId, dateStr, durationMinutes, supabase, calendarId);

    if (slots.length > 0) {
      const label = date.toFormat('EEEE dd MMM', { locale: 'es' });
      days.push({ date: dateStr, label });
    }
  }

  return days;
}

async function getAvailableHoursForDate(
  doctorId: string,
  date: string,
  durationMinutes: number,
  page: number,
  pageSize: number,
  supabase: SupabaseClient,
  calendarId?: string
): Promise<{ slots: string[]; hasMore: boolean; totalSlots: number }> {
  const allSlots = await getAvailableSlotsForDate(doctorId, date, durationMinutes, supabase, calendarId);
  const totalSlots = allSlots.length;
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedSlots = allSlots.slice(startIdx, endIdx);

  return {
    slots: paginatedSlots,
    hasMore: endIdx < totalSlots,
    totalSlots,
  };
}

/**
 * Replicates the logic from get-available-slots edge function
 * using the service role client (no JWT needed).
 * Uses calendar_schedules when calendarId is provided, else falls back to doctor_schedules.
 */
async function getAvailableSlotsForDate(
  doctorId: string,
  date: string,
  durationMinutes: number,
  supabase: SupabaseClient,
  calendarId?: string
): Promise<string[]> {
  const SLOT_GRANULARITY = 30;

  // Get day of week (Luxon: 1=Mon...7=Sun → convert to 0=Sun...6=Sat)
  const requestedDate = DateTime.fromISO(date);
  const dayOfWeek = requestedDate.weekday % 7;

  // Fetch schedules for this day: calendar_schedules if calendarId provided, else doctor_schedules
  let schedules: Array<{ start_time: string; end_time: string }> | null = null;
  if (calendarId) {
    const { data, error } = await supabase
      .from('calendar_schedules')
      .select('start_time, end_time')
      .eq('calendar_id', calendarId)
      .eq('day_of_week', dayOfWeek);
    if (error) return [];
    schedules = data;
  } else {
    const { data, error: schedError } = await supabase
      .from('doctor_schedules')
      .select('start_time, end_time')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek);
    if (schedError) return [];
    schedules = data;
  }

  if (!schedules || schedules.length === 0) return [];

  // Fetch existing appointments — co-work: check ALL doctors on the same calendar
  let appointmentDoctorIds: string[] = [doctorId];

  if (calendarId) {
    const { data: calDocRows } = await supabase
      .from('calendar_doctors')
      .select('doctor_id')
      .eq('calendar_id', calendarId)
      .eq('is_active', true);
    if (calDocRows && calDocRows.length > 0) {
      appointmentDoctorIds = [...new Set(calDocRows.map((r: any) => r.doctor_id))];
    }
  } else {
    const { data: calDocs } = await supabase
      .from('calendar_doctors')
      .select('calendar_id')
      .eq('doctor_id', doctorId)
      .eq('is_active', true);
    if (calDocs && calDocs.length > 0) {
      const calIds = calDocs.map((cd: any) => cd.calendar_id);
      const { data: allCalDocs } = await supabase
        .from('calendar_doctors')
        .select('doctor_id')
        .in('calendar_id', calIds)
        .eq('is_active', true);
      if (allCalDocs && allCalDocs.length > 0) {
        appointmentDoctorIds = [...new Set(allCalDocs.map((r: any) => r.doctor_id))];
      }
    }
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('time, duration_minutes')
    .in('doctor_id', appointmentDoctorIds)
    .eq('date', date)
    .not('status', 'in', '("cancelled","canceled","cancelada")');

  // Build occupied intervals
  const occupiedIntervals = (appointments || []).map((apt: any) => {
    const start = DateTime.fromISO(`${date}T${apt.time.substring(0, 5)}:00`);
    const end = start.plus({ minutes: apt.duration_minutes || 60 });
    return { startMs: start.toMillis(), endMs: end.toMillis() };
  });

  // Generate available slots
  const availableSlots: string[] = [];

  for (const schedule of schedules) {
    const workStart = DateTime.fromISO(`${date}T${schedule.start_time.substring(0, 5)}:00`);
    const workEnd = DateTime.fromISO(`${date}T${schedule.end_time.substring(0, 5)}:00`);
    const workEndMs = workEnd.toMillis();

    let slotStart = workStart;

    while (slotStart.plus({ minutes: durationMinutes }).toMillis() <= workEndMs) {
      const slotStartMs = slotStart.toMillis();
      const slotEndMs = slotStart.plus({ minutes: durationMinutes }).toMillis();

      const hasOverlap = occupiedIntervals.some(({ startMs, endMs }: any) => {
        return slotStartMs < endMs && startMs < slotEndMs;
      });

      if (!hasOverlap) {
        availableSlots.push(slotStart.toFormat('HH:mm'));
      }

      slotStart = slotStart.plus({ minutes: SLOT_GRANULARITY });
    }
  }

  // Sort and deduplicate
  return Array.from(new Set(availableSlots)).sort((a, b) => a.localeCompare(b));
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

// ============================================================================
// ANALYTICS & LOGGING
// ============================================================================

function detectIntent(
  stateBefore: string,
  stateAfter: string,
  userMessage: string
): string {
  const msg = userMessage.trim().toLowerCase();

  // Reset intent
  if (msg === '0' || msg === 'reiniciar' || msg === 'inicio') return 'reset';

  // Based on state transitions
  if (stateAfter.startsWith('booking_')) return 'booking';
  if (stateAfter === 'reschedule_list' || stateAfter === 'cancel_confirm') {
    if (stateBefore === 'cancel_confirm') return 'cancel';
    return 'reschedule';
  }
  if (stateAfter === 'faq_search') return 'faq';
  if (stateAfter === 'handoff_secretary') return 'handoff';
  if (stateAfter === 'main_menu' && stateBefore === 'greeting') return 'greeting';
  if (stateAfter === 'main_menu') return 'navigation';
  if (stateAfter === 'completed') return 'completed';

  return 'other';
}

async function logConversation(
  sessionId: string,
  whatsappLineId: string,
  organizationId: string,
  patientPhone: string,
  stateBefore: string,
  stateAfter: string,
  userMessage: string,
  botResponse: string,
  optionsShown: string[],
  intent: string,
  responseTimeMs: number,
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from('bot_conversation_logs')
    .insert({
      session_id: sessionId,
      whatsapp_line_id: whatsappLineId,
      organization_id: organizationId,
      patient_phone: patientPhone,
      direction: 'inbound',
      state_before: stateBefore,
      state_after: stateAfter,
      user_message: userMessage,
      bot_response: botResponse.substring(0, 2000), // Truncate to avoid large payloads
      options_shown: optionsShown,
      intent_detected: intent,
      response_time_ms: responseTimeMs,
    });

  if (error) {
    console.error('[logConversation] Error:', error);
  }
}
