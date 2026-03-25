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
import { formatTimeForTemplate } from '../_shared/datetime.ts';
import { OPT_EMOJI, buildStepTitle } from '../_shared/bot-messages.ts';
import { normalizeToE164 } from '../_shared/phone.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

// ============================================================================
// HANDOFF LABELS — configurable per whatsapp_line.bot_handoff_type
// ============================================================================

const HANDOFF_LABELS: Record<string, { menuOption: string; connecting: string; emoji: string }> = {
  secretary: {
    menuOption: '👩🏻‍💼 Hablar con la secretaria',
    connecting: 'la secretaria',
    emoji: '👩🏻‍💼',
  },
  doctor: {
    menuOption: '🩺 Hablar con el doctor',
    connecting: 'el doctor',
    emoji: '🩺',
  },
};

// ============================================================================
// TYPES
// ============================================================================

type BotState =
  | 'greeting'
  | 'main_menu'
  | 'faq_search'
  | 'booking_select_doctor'
  | 'booking_select_service'
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
  showMenuHint?: boolean; // false hides "0️⃣ Menu principal" in formatBotMessage (default true)
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
  appointmentId?: string;  // direct reschedule from template quick reply
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

    return new Response(JSON.stringify({
      message: response.message,
      options: response.options,
      showMenuHint: response.showMenuHint,
      requiresInput: response.requiresInput,
      nextState: response.nextState,
      sessionComplete: response.sessionComplete,
    }), {
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

  // Load handoff labels and service types once per session
  if (!session.context.handoffLabels) {
    const { data: lineConfig } = await supabase
      .from('whatsapp_lines')
      .select('bot_handoff_type, bot_service_types')
      .eq('id', whatsappLineId)
      .single();
    session.context.handoffLabels = HANDOFF_LABELS[lineConfig?.bot_handoff_type || 'secretary'];
    session.context.lineServiceTypes = lineConfig?.bot_service_types || [];
  }
  const handoffLabels = session.context.handoffLabels as { menuOption: string; connecting: string; emoji: string };

  const stateBefore = session.state;

  // Universal escape: "0" or "reiniciar" resets to greeting from any state
  const trimmedMsg = messageText.trim().toLowerCase();
  if (session.state !== 'greeting' && (trimmedMsg === '0' || trimmedMsg === 'reiniciar' || trimmedMsg === 'inicio')) {
    console.log('[bot-handler] User requested session reset with:', trimmedMsg);
    session = await resetSession(session.id, supabase);
    // Fall through to greeting handler
  }

  // Escape from booking states: "cancelar", "salir", "menu", "volver" → back to main_menu
  const BOOKING_ESCAPABLE_STATES: BotState[] = [
    'booking_select_doctor', 'booking_select_service', 'booking_select_day',
    'booking_select_hour', 'booking_ask_name',
  ];
  const ESCAPE_WORDS = ['cancelar', 'salir', 'menu', 'volver'];
  if (BOOKING_ESCAPABLE_STATES.includes(session.state) && ESCAPE_WORDS.includes(trimmedMsg)) {
    console.log('[bot-handler] Booking escape:', trimmedMsg, 'from', session.state);
    // Clean booking context but preserve line config
    const preserved = { handoffLabels: session.context.handoffLabels, lineServiceTypes: session.context.lineServiceTypes };
    session.context = { ...preserved };
    const escapeResponse: BotResponse = {
      message: `${OPT_EMOJI.cancelar} Proceso cancelado.\n\n¿En que puedo ayudarle?`,
      options: [
        `${OPT_EMOJI.agendar} Agendar cita`,
        `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
        `${OPT_EMOJI.faq} Preguntas frecuentes`,
        handoffLabels.menuOption,
      ],
      showMenuHint: false,
      requiresInput: true,
      nextState: 'main_menu',
      sessionComplete: false,
    };
    await updateSession(session.id, escapeResponse.nextState, session.context, false, supabase);
    const escResponseTimeMs = Date.now() - startTime;
    const escIntent = detectIntent(stateBefore, escapeResponse.nextState, messageText);
    logConversation(
      session.id, whatsappLineId, organizationId, patientPhone,
      stateBefore, escapeResponse.nextState, messageText, escapeResponse.message,
      escapeResponse.options || [], escIntent, escResponseTimeMs, supabase
    ).catch((err) => console.error('[bot-handler] Log error (non-fatal):', err));
    return escapeResponse;
  }

  // Direct reschedule: when appointmentId arrives and session is fresh (greeting),
  // skip the menu and jump straight to the reschedule week-selection flow.
  let response: BotResponse;

  if (input.appointmentId && session.state === 'greeting') {
    response = await handleDirectReschedule(input.appointmentId, session, organizationId, supabase, handoffLabels);

    // Update session and log, then return early
    await updateSession(session.id, response.nextState, session.context, response.sessionComplete, supabase);

    const responseTimeMs = Date.now() - startTime;
    const intent = detectIntent(stateBefore, response.nextState, messageText);
    logConversation(
      session.id, whatsappLineId, organizationId, patientPhone,
      stateBefore, response.nextState, messageText, response.message,
      response.options || [], intent, responseTimeMs, supabase
    ).catch((err) => console.error('[bot-handler] Log error (non-fatal):', err));

    return response;
  }

  // Route to state handler based on current state
  switch (session.state) {
    case 'greeting':
      response = await handleGreeting(session, organizationId, supabase, handoffLabels, messageText);
      break;

    case 'main_menu':
      response = await handleMainMenu(messageText, session, organizationId, supabase, handoffLabels);
      break;

    case 'faq_search':
      response = await handleFAQSearch(messageText, session, organizationId, supabase, handoffLabels);
      break;

    case 'booking_select_doctor':
      response = await handleBookingSelectDoctor(messageText, session, organizationId, supabase);
      break;

    case 'booking_select_service':
      response = await handleBookingSelectService(messageText, session, organizationId, supabase);
      break;

    case 'booking_select_week':
      response = await handleBookingSelectWeek(messageText, session, organizationId, supabase, handoffLabels);
      break;

    case 'booking_select_day':
      response = await handleBookingSelectDay(messageText, session, organizationId, supabase);
      break;

    case 'booking_select_hour':
      response = await handleBookingSelectHour(messageText, session, organizationId, supabase);
      break;

    case 'booking_confirm':
      response = await handleBookingConfirm(messageText, session, organizationId, supabase, handoffLabels);
      break;

    case 'booking_ask_name':
      response = await handleBookingAskName(messageText, session, organizationId, supabase, handoffLabels);
      break;

    case 'reschedule_list':
      response = await handleRescheduleList(messageText, session, organizationId, supabase, handoffLabels);
      break;

    case 'cancel_confirm':
      response = await handleCancelConfirm(messageText, session, organizationId, supabase, handoffLabels);
      break;

    case 'handoff_secretary':
      response = await handleHandoffToSecretary(whatsappLineId, patientPhone, organizationId, supabase, handoffLabels, session.context);
      break;

    default:
      // Unknown state, reset to greeting
      response = await handleGreeting(session, organizationId, supabase, handoffLabels, messageText);
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

/**
 * Direct reschedule: patient tapped "Reagendar" on a confirmation/reminder template.
 * Skips greeting → menu → reschedule_list and jumps straight to week selection.
 */
async function handleDirectReschedule(
  appointmentId: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string }
): Promise<BotResponse> {
  console.log('[bot-handler] Direct reschedule for appointment:', appointmentId);

  // 1. Fetch appointment with doctor info
  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .select('id, date, time, duration_minutes, status, doctor_id, service_type, doctors:doctor_id (id, name, prefix)')
    .eq('id', appointmentId)
    .maybeSingle();

  if (aptError || !appointment || appointment.status === 'cancelada' || appointment.status === 'cancelled') {
    console.log('[bot-handler] Direct reschedule: appointment not found or cancelled, falling back to greeting');
    return await handleGreeting(session, organizationId, supabase, handoffLabels);
  }

  // 2. Find patient by phone
  const patient = await findPatientByPhone(session.patient_phone, organizationId, supabase);

  // 3. Get calendarId from whatsapp_line_doctors
  const { data: lineDoctor } = await supabase
    .from('whatsapp_line_doctors')
    .select('calendar_id')
    .eq('whatsapp_line_id', session.whatsapp_line_id)
    .eq('doctor_id', appointment.doctor_id)
    .limit(1)
    .maybeSingle();

  const calendarId = lineDoctor?.calendar_id;

  // 4. Get default duration from whatsapp_lines
  const { data: lineData } = await supabase
    .from('whatsapp_lines')
    .select('default_duration_minutes')
    .eq('id', session.whatsapp_line_id)
    .single();

  const durationMinutes = lineData?.default_duration_minutes || appointment.duration_minutes || 60;
  const slotGranularity = Math.min(durationMinutes, 30);

  const doctor = appointment.doctors as any;
  const doctorName = doctor ? `${doctor.prefix} ${doctor.name}` : 'Doctor';

  // 5. Pre-populate context
  session.context.rescheduleAppointmentId = appointment.id;
  session.context.rescheduleAppointmentDate = appointment.date;
  session.context.rescheduleAppointmentTime = appointment.time;
  session.context.rescheduleAppointmentDoctorName = doctorName;
  session.context.doctorId = appointment.doctor_id;
  session.context.doctorName = doctorName;
  session.context.isReschedule = true;
  session.context.durationMinutes = durationMinutes;
  session.context.slotGranularity = slotGranularity;
  session.context.calendarId = calendarId;
  if (patient) {
    session.context.patientId = patient.id;
    session.context.patientName = patient.name;
  }
  // Carry over service type from original appointment
  if (appointment.service_type) {
    session.context.selectedServiceType = appointment.service_type;
  }
  session.context.bookingTotalSteps = 4; // Direct reschedule always 4 steps

  // 6. Get available weeks
  const weeks = await getAvailableWeeks(appointment.doctor_id, durationMinutes, supabase, calendarId, slotGranularity);

  if (weeks.length === 0) {
    return {
      message: `⚠️ No encontramos disponibilidad en las proximas semanas para reagendar su cita con ${doctorName}.\n\nConectando con ${handoffLabels.connecting}...`,
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  session.context.availableWeeks = weeks;

  const stepTitle = buildStepTitle(OPT_EMOJI.reagendar, 'Reagendar cita', 1, 4);

  return {
    message: `${stepTitle}\n\nSeleccione la nueva semana para su cita con ${doctorName}:\n👉 Escriba el numero`,
    options: weeks.map((w) => w.weekLabel),
    requiresInput: true,
    nextState: 'booking_select_day',
    sessionComplete: false,
  };
}

async function handleGreeting(
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string },
  messageText: string = ''
): Promise<BotResponse> {
  // Detect acknowledgment responses (replies to reminders like "Ok", "Gracias", "Listo")
  const ACKNOWLEDGMENTS = ['ok', 'okey', 'okay', 'listo', 'gracias', 'de acuerdo',
    'perfecto', 'entendido', 'dale', 'va', 'genial', 'excelente', 'bien',
    'bueno', 'esta bien', 'recibido', 'anotado', 'si', 'claro'];
  const ackNorm = messageText.trim().toLowerCase()
    .replace(/[!¡.,;:?¿🙏😊😁👍👌✅🥰❤️💪]+/g, '').trim();
  const ackWords = ackNorm.split(/\s+/).filter(w => w.length > 0);
  const isAck = ackNorm.length > 0 && ackWords.length <= 3 &&
    ackWords.every(w => ACKNOWLEDGMENTS.includes(w) || w.length <= 2);
  if (isAck) {
    return {
      message: '👍 ¡Recibido! Si necesita algo, escriba *hola*.',
      requiresInput: false,
      nextState: 'completed',
      sessionComplete: true,
      showMenuHint: false,
    };
  }

  // Get bot greeting from whatsapp_line
  const { data: lineData } = await supabase
    .from('whatsapp_lines')
    .select('bot_greeting, label')
    .eq('id', session.whatsapp_line_id)
    .single();

  const greeting = lineData?.bot_greeting || 'Hola, soy el asistente virtual.';

  return {
    message: `${greeting}\n\n¿En que puedo ayudarle?`,
    options: [
      `${OPT_EMOJI.agendar} Agendar cita`,
      `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
      `${OPT_EMOJI.faq} Preguntas frecuentes`,
      handoffLabels.menuOption,
    ],
    showMenuHint: false,
    requiresInput: true,
    nextState: 'main_menu',
    sessionComplete: false,
  };
}

// Detect user intent from natural language in main menu
function detectMenuIntent(input: string): 'booking' | 'reschedule' | 'faq' | 'handoff' | null {
  const n = input.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Order: reschedule before booking to avoid false positive with "mi cita"
  const RESCHEDULE = ['cambiar cita', 'mover cita', 'cambiar fecha', 'mi cita',
    'mi agenda', 'cuando es mi cita', 'cuando sera mi cita', 'no puedo ir',
    'no podre', 'no asistir', 'posponer', 'aplazar'];
  for (const kw of RESCHEDULE) if (n.includes(kw)) return 'reschedule';

  const FAQ = ['ubicacion', 'direccion', 'donde queda', 'donde estan',
    'horario', 'horarios', 'a que hora', 'que hora',
    'precio', 'precios', 'cuanto cuesta', 'costo', 'costos', 'tarifa',
    'resultado', 'resultados', 'examenes', 'examen',
    'informacion', 'info', 'estacionamiento', 'parqueo',
    'seguro', 'seguros', 'aceptan seguro'];
  for (const kw of FAQ) if (n.includes(kw)) return 'faq';

  const HANDOFF = ['hablar', 'hablame', 'llamar', 'llamame', 'contacto',
    'contactar', 'humano', 'persona', 'alguien', 'atencion', 'ayuda',
    'necesito ayuda'];
  for (const kw of HANDOFF) if (n.includes(kw)) return 'handoff';

  const BOOKING = ['cita', 'consulta', 'turno', 'disponibilidad',
    'apartar', 'reservar', 'tratamiento', 'procedimiento', 'cirugia',
    'operacion', 'lunar', 'revision', 'chequeo', 'control',
    'citologia', 'limpieza', 'extraccion', 'muela'];
  for (const kw of BOOKING) if (n.includes(kw)) return 'booking';

  // Date/time patterns → booking
  if (/\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.test(n)) return 'booking';
  if (/\bmanana\b/.test(n) || /\bpasado manana\b/.test(n)) return 'booking';
  if (/\b\d{1,2}\s*(am|pm)\b/.test(n)) return 'booking';

  return null;
}

async function handleMainMenu(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string }
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
    delete session.context.lastFaqResult;
    delete session.context.faqNotFoundCount;
    return {
      message: `${OPT_EMOJI.faq} *Preguntas frecuentes*\n\nEscriba su pregunta y buscare la respuesta.`,
      requiresInput: true,
      nextState: 'faq_search',
      sessionComplete: false,
    };
  }

  if (normalizedInput === '4' || normalizedInput.includes('secretar') || normalizedInput.startsWith('hablar con')) {
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context);
  }

  // Recognize greetings — re-show menu friendly instead of "opcion no valida"
  const SALUDOS = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buenas', 'buen dia', 'hey'];
  const isGreeting = SALUDOS.some(s => normalizedInput === s || normalizedInput.startsWith(s + ' ') || normalizedInput.startsWith(s + ','));
  if (isGreeting) {
    session.context.invalidAttempts = 0;
    return {
      message: '¡Hola! 👋 ¿En que puedo ayudarle?',
      options: [
        `${OPT_EMOJI.agendar} Agendar cita`,
        `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
        `${OPT_EMOJI.faq} Preguntas frecuentes`,
        handoffLabels.menuOption,
      ],
      showMenuHint: false,
      requiresInput: true,
      nextState: 'main_menu',
      sessionComplete: false,
    };
  }

  // Detect intent from natural language before giving up
  const detectedIntent = detectMenuIntent(normalizedInput);
  if (detectedIntent) {
    session.context.invalidAttempts = 0;
    if (detectedIntent === 'booking') return await startBookingFlow(session, organizationId, supabase);
    if (detectedIntent === 'reschedule') return await startRescheduleFlow(session, organizationId, supabase);
    if (detectedIntent === 'handoff') return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context);
    if (detectedIntent === 'faq') {
      delete session.context.lastFaqResult;
      delete session.context.faqNotFoundCount;
      const faqResult = await searchFAQ(input, session.context.doctorId, session.context.clinicId, organizationId, supabase);
      if (faqResult) {
        session.context.lastFaqResult = 'found';
        return {
          message: `${OPT_EMOJI.faq} *Respuesta*\n\n*${faqResult.question}*\n${faqResult.answer}`,
          options: [`${OPT_EMOJI.faq} Otra pregunta`, `${OPT_EMOJI.menu} Menu principal`],
          requiresInput: true, nextState: 'faq_search', sessionComplete: false,
        };
      }
      return {
        message: `${OPT_EMOJI.faq} *Preguntas frecuentes*\n\nEscriba su pregunta y buscare la respuesta.`,
        requiresInput: true, nextState: 'faq_search', sessionComplete: false,
      };
    }
  }

  // Invalid input - increment attempt counter
  const invalidAttempts = (session.context.invalidAttempts || 0) + 1;
  session.context.invalidAttempts = invalidAttempts;

  if (invalidAttempts >= 3) {
    // Auto-handoff after 3 invalid attempts
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context);
  }

  return {
    message: '⚠️ Opcion no valida.\n\n¿En que puedo ayudarle?',
    options: [
      `${OPT_EMOJI.agendar} Agendar cita`,
      `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
      `${OPT_EMOJI.faq} Preguntas frecuentes`,
      handoffLabels.menuOption,
    ],
    showMenuHint: false,
    requiresInput: true,
    nextState: 'main_menu',
    sessionComplete: false,
  };
}

async function handleFAQSearch(
  query: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string }
): Promise<BotResponse> {
  const normalizedInput = query.trim().toLowerCase();
  const lastFaqResult = session.context.lastFaqResult;

  // Route numeric inputs based on which options were shown
  if (lastFaqResult === 'found') {
    // Options shown: [1: Otra pregunta, 2: Menu principal]
    if (normalizedInput === '1' || normalizedInput.includes('otra pregunta')) {
      return {
        message: `${OPT_EMOJI.faq} Escriba su pregunta:`,
        requiresInput: true,
        nextState: 'faq_search',
        sessionComplete: false,
      };
    }
    if (normalizedInput === '2' || normalizedInput.includes('menu') || normalizedInput.includes('menú') || normalizedInput.includes('volver')) {
      return {
        message: '¿En que puedo ayudarle?',
        options: [
          `${OPT_EMOJI.agendar} Agendar cita`,
          `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
          `${OPT_EMOJI.faq} Preguntas frecuentes`,
          handoffLabels.menuOption,
        ],
        showMenuHint: false,
        requiresInput: true,
        nextState: 'main_menu',
        sessionComplete: false,
      };
    }
  } else if (lastFaqResult === 'not_found') {
    // Options shown: [1: Menu principal, 2: Handoff]
    if (normalizedInput === '1' || normalizedInput.includes('menu') || normalizedInput.includes('menú') || normalizedInput.includes('volver')) {
      return {
        message: '¿En que puedo ayudarle?',
        options: [
          `${OPT_EMOJI.agendar} Agendar cita`,
          `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
          `${OPT_EMOJI.faq} Preguntas frecuentes`,
          handoffLabels.menuOption,
        ],
        showMenuHint: false,
        requiresInput: true,
        nextState: 'main_menu',
        sessionComplete: false,
      };
    }
    if (normalizedInput === '2' || normalizedInput.includes('secretar') || normalizedInput.includes('hablar con')) {
      return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context);
    }
  } else if (lastFaqResult === 'not_found_auto') {
    // Options shown: [1: Si conectar, 2: Menu principal]
    if (normalizedInput === '1' || normalizedInput.includes('si') || normalizedInput.includes('secretar') || normalizedInput.includes('conectar')) {
      return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context);
    }
    if (normalizedInput === '2' || normalizedInput.includes('menu') || normalizedInput.includes('menú') || normalizedInput.includes('volver')) {
      return {
        message: '¿En que puedo ayudarle?',
        options: [
          `${OPT_EMOJI.agendar} Agendar cita`,
          `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
          `${OPT_EMOJI.faq} Preguntas frecuentes`,
          handoffLabels.menuOption,
        ],
        showMenuHint: false,
        requiresInput: true,
        nextState: 'main_menu',
        sessionComplete: false,
      };
    }
    // Any other text → fall through to search
  }

  // Fallback: text-based matching (no lastFaqResult or first entry)
  if (normalizedInput.includes('menu') || normalizedInput.includes('menú') || normalizedInput.includes('volver')) {
    return {
      message: '¿En que puedo ayudarle?',
      options: [
        `${OPT_EMOJI.agendar} Agendar cita`,
        `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
        `${OPT_EMOJI.faq} Preguntas frecuentes`,
        handoffLabels.menuOption,
      ],
      showMenuHint: false,
      requiresInput: true,
      nextState: 'main_menu',
      sessionComplete: false,
    };
  }
  if (normalizedInput.includes('otra pregunta')) {
    return {
      message: `${OPT_EMOJI.faq} Escriba su pregunta:`,
      requiresInput: true,
      nextState: 'faq_search',
      sessionComplete: false,
    };
  }
  if (normalizedInput.includes('secretar') || normalizedInput.includes('hablar con')) {
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context);
  }

  // Get doctor_id and clinic_id from session context if available
  const doctorId = session.context.doctorId;
  const clinicId = session.context.clinicId;

  const faq = await searchFAQ(query, doctorId, clinicId, organizationId, supabase);

  if (faq) {
    session.context.lastFaqResult = 'found';
    session.context.faqNotFoundCount = 0;
    return {
      message: `${OPT_EMOJI.faq} *Respuesta*\n\n*${faq.question}*\n${faq.answer}`,
      options: [`${OPT_EMOJI.faq} Otra pregunta`, `${OPT_EMOJI.menu} Menu principal`],
      requiresInput: true,
      nextState: 'faq_search',
      sessionComplete: false,
    };
  }

  // No FAQ found — track consecutive misses
  const faqNotFoundCount = (session.context.faqNotFoundCount || 0) + 1;
  session.context.faqNotFoundCount = faqNotFoundCount;

  if (faqNotFoundCount >= 3) {
    // Auto-offer handoff after 3 consecutive misses
    session.context.lastFaqResult = 'not_found_auto';
    return {
      message: `No he podido encontrar la informacion que busca. ¿Desea que le conecte con ${handoffLabels.connecting}?`,
      options: [`${handoffLabels.emoji} Si, conectar con ${handoffLabels.connecting}`, `${OPT_EMOJI.menu} Menu principal`],
      requiresInput: true,
      nextState: 'faq_search',
      sessionComplete: false,
    };
  }

  session.context.lastFaqResult = 'not_found';
  return {
    message: '⚠️ No encontre una respuesta para esa pregunta.',
    options: [`${OPT_EMOJI.menu} Menu principal`, handoffLabels.menuOption],
    requiresInput: true,
    nextState: 'faq_search',
    sessionComplete: false,
  };
}

// ============================================================================
// BOOKING FLOW HELPERS — step numbering & service type
// ============================================================================

/**
 * Dynamic step numbering based on whether the flow includes doctor selection
 * and/or service type selection steps.
 */
function getStepNumbers(session: BotSession) {
  const total = session.context.bookingTotalSteps || 4;
  let offset = 0;
  const hasMultiDoc = (session.context.availableDoctors?.length || 0) > 1;
  const hasServiceStep = (session.context.availableServiceTypes?.length || 0) >= 2;
  if (hasMultiDoc) offset++;
  if (hasServiceStep) offset++;
  return {
    weekStep: 1 + offset,
    dayStep: 2 + offset,
    hourStep: 3 + offset,
    confirmStep: total,
    totalSteps: total,
  };
}

/**
 * Checks service types configured on the line and either:
 * - 0 types → returns null (skip, no service step)
 * - 1 type → auto-selects it silently, applies duration override, returns null
 * - 2+ types → returns a BotResponse with options for the patient to choose
 */
function maybeShowServiceTypeStep(session: BotSession): BotResponse | null {
  const serviceTypes: Array<{ name: string; duration_minutes?: number }> = session.context.lineServiceTypes || [];

  if (serviceTypes.length === 0) {
    return null;
  }

  if (serviceTypes.length === 1) {
    // Auto-select the single type silently
    session.context.selectedServiceType = serviceTypes[0].name;
    if (serviceTypes[0].duration_minutes) {
      session.context.serviceDurationOverride = serviceTypes[0].duration_minutes;
    }
    return null;
  }

  // 2+ types: show selection step
  session.context.availableServiceTypes = serviceTypes;

  const isReschedule = session.context.isReschedule;
  const flowEmoji = isReschedule ? OPT_EMOJI.reagendar : OPT_EMOJI.agendar;
  const flowName = isReschedule ? 'Reagendar cita' : 'Agendar cita';
  const hasMultiDoc = (session.context.availableDoctors?.length || 0) > 1;
  const serviceStep = hasMultiDoc ? 2 : 1;
  const totalSteps = session.context.bookingTotalSteps || 4;

  const stepTitle = buildStepTitle(flowEmoji, flowName, serviceStep, totalSteps);

  return {
    message: `${stepTitle}\n\n📋 ¿Que tipo de servicio necesita?`,
    options: serviceTypes.map((st) => st.name),
    requiresInput: true,
    nextState: 'booking_select_service',
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
  // Clear stale booking/reschedule context from previous flows
  delete session.context.isReschedule;
  delete session.context.rescheduleAppointmentId;
  delete session.context.rescheduleAppointmentDate;
  delete session.context.rescheduleAppointmentTime;
  delete session.context.rescheduleAppointmentDoctorName;
  delete session.context.selectedServiceType;
  delete session.context.serviceDurationOverride;
  delete session.context.availableServiceTypes;
  delete session.context.availableWeeks;
  delete session.context.availableDays;
  delete session.context.availableSlots;
  delete session.context.selectedWeek;
  delete session.context.selectedDate;
  delete session.context.selectedTime;
  delete session.context.slotPage;
  delete session.context.cancelConfirmPhase;
  delete session.context.upcomingAppointments;

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
      message: `⚠️ No hay doctores disponibles para agendar.\n\nConectando con ${session.context.handoffLabels?.connecting || 'la secretaria'}...`,
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  // Determine if service types add an extra step
  const serviceTypes: Array<{ name: string; duration_minutes?: number }> = session.context.lineServiceTypes || [];
  const hasServiceStep = serviceTypes.length >= 2;

  // If only 1 doctor, auto-select
  if (lineDoctors.length === 1) {
    const doctor = lineDoctors[0].doctor;
    const calendar = lineDoctors[0].calendar;

    session.context.doctorId = doctor.id;
    session.context.doctorName = `${doctor.prefix} ${doctor.name}`;
    session.context.calendarId = calendar.id;
    session.context.bookingTotalSteps = 4 + (hasServiceStep ? 1 : 0);

    // Check if service type step is needed before going to week selection
    const serviceResponse = maybeShowServiceTypeStep(session);
    if (serviceResponse) return serviceResponse;

    return await handleBookingSelectWeek('', session, organizationId, supabase);
  }

  // Multiple doctors - show selection
  session.context.bookingTotalSteps = 5 + (hasServiceStep ? 1 : 0);

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

  const totalSteps = session.context.bookingTotalSteps;
  const stepTitle = buildStepTitle(OPT_EMOJI.agendar, 'Agendar cita', 1, totalSteps);

  return {
    message: `${stepTitle}\n\n¿Con que doctor desea agendar?`,
    options,
    requiresInput: true,
    nextState: 'booking_select_doctor',
    sessionComplete: false,
  };
}

// Fuzzy match user text against a list of displayed options (accent-insensitive)
function fuzzyMatchOption(input: string, options: string[]): number | null {
  const n = input.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.length < 3) return null;

  // Exact match (accent-insensitive)
  for (let i = 0; i < options.length; i++) {
    const opt = options[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n === opt) return i;
  }
  // Input contains option name or vice versa — pick longest match
  let bestIdx = -1, bestLen = 0;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n.includes(opt) && opt.length > bestLen) { bestIdx = i; bestLen = opt.length; }
    if (opt.includes(n) && n.length > bestLen) { bestIdx = i; bestLen = n.length; }
  }
  if (bestIdx >= 0) return bestIdx;
  return null;
}

async function handleBookingSelectDoctor(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const availableDoctors = session.context.availableDoctors || [];
  let selection = parseInt(input.trim());

  // Fuzzy match text against doctor names
  if (isNaN(selection) || selection < 1 || selection > availableDoctors.length) {
    const fuzzyIdx = fuzzyMatchOption(input, availableDoctors.map((d: any) => d.name));
    if (fuzzyIdx !== null) selection = fuzzyIdx + 1;
  }

  if (isNaN(selection) || selection < 1 || selection > availableDoctors.length) {
    const stepTitle = buildStepTitle(OPT_EMOJI.agendar, 'Agendar cita', 1, session.context.bookingTotalSteps || 5);
    return {
      message: `${stepTitle}\n\n⚠️ Opcion no valida.\n¿Con que doctor desea agendar?`,
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

  // Check if service type step is needed before going to week selection
  const serviceResponse = maybeShowServiceTypeStep(session);
  if (serviceResponse) return serviceResponse;

  // Move to week selection
  return await handleBookingSelectWeek('', session, organizationId, supabase);
}

async function handleBookingSelectService(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const serviceTypes: Array<{ name: string; duration_minutes?: number }> = session.context.availableServiceTypes || [];
  let selection = parseInt(input.trim());

  // Fuzzy match text against service type names
  if (isNaN(selection) || selection < 1 || selection > serviceTypes.length) {
    const fuzzyIdx = fuzzyMatchOption(input, serviceTypes.map(st => st.name));
    if (fuzzyIdx !== null) selection = fuzzyIdx + 1;
  }

  if (isNaN(selection) || selection < 1 || selection > serviceTypes.length) {
    const isReschedule = session.context.isReschedule;
    const flowEmoji = isReschedule ? OPT_EMOJI.reagendar : OPT_EMOJI.agendar;
    const flowName = isReschedule ? 'Reagendar cita' : 'Agendar cita';
    const hasMultiDoc = (session.context.availableDoctors?.length || 0) > 1;
    const serviceStep = hasMultiDoc ? 2 : 1;
    const totalSteps = session.context.bookingTotalSteps || 4;
    const stepTitle = buildStepTitle(flowEmoji, flowName, serviceStep, totalSteps);

    return {
      message: `${stepTitle}\n\n⚠️ Opcion no valida.\n👉 Escriba el *numero* del servicio. Ejemplo: *1*\n\n📋 ¿Que tipo de servicio necesita?`,
      options: serviceTypes.map((st) => st.name),
      requiresInput: true,
      nextState: 'booking_select_service',
      sessionComplete: false,
    };
  }

  const selected = serviceTypes[selection - 1];
  session.context.selectedServiceType = selected.name;
  if (selected.duration_minutes) {
    session.context.serviceDurationOverride = selected.duration_minutes;
  }

  return await handleBookingSelectWeek('', session, organizationId, supabase);
}

async function handleBookingSelectWeek(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels?: { menuOption: string; connecting: string; emoji: string }
): Promise<BotResponse> {
  // Get default duration from whatsapp_line
  const { data: lineData } = await supabase
    .from('whatsapp_lines')
    .select('default_duration_minutes')
    .eq('id', session.whatsapp_line_id)
    .single();

  const durationMinutes = session.context.serviceDurationOverride || lineData?.default_duration_minutes || 60;
  session.context.durationMinutes = durationMinutes;
  const slotGranularity = Math.min(durationMinutes, 30);
  session.context.slotGranularity = slotGranularity;

  // Get available weeks
  const weeks = await getAvailableWeeks(session.context.doctorId, durationMinutes, supabase, session.context.calendarId, slotGranularity);

  if (weeks.length === 0) {
    const connecting = handoffLabels?.connecting || session.context.handoffLabels?.connecting || 'la secretaria';
    return {
      message: `⚠️ No encontramos disponibilidad en las proximas semanas.\n\nConectando con ${connecting}...`,
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  // Store weeks in context for selection
  session.context.availableWeeks = weeks;

  const isReschedule = session.context.isReschedule;
  const flowEmoji = isReschedule ? OPT_EMOJI.reagendar : OPT_EMOJI.agendar;
  const flowName = isReschedule ? 'Reagendar cita' : 'Agendar cita';
  const steps = getStepNumbers(session);
  const stepTitle = buildStepTitle(flowEmoji, flowName, steps.weekStep, steps.totalSteps);

  return {
    message: `${stepTitle}\n\nSeleccione la semana para su cita con ${session.context.doctorName}:\n👉 Escriba el numero`,
    options: weeks.map((w) => w.weekLabel),
    requiresInput: true,
    nextState: 'booking_select_day',
    sessionComplete: false,
  };
}

// Parse natural language date hints into a DateTime (Honduras timezone)
function parseDateHint(input: string): typeof DateTime.prototype | null {
  const n = input.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const tz = 'America/Tegucigalpa';
  const now = DateTime.now().setZone(tz);

  if (/\bhoy\b/.test(n)) return now.startOf('day');
  if (/\bpasado\s*manana\b/.test(n)) return now.plus({ days: 2 }).startOf('day');
  if (/\bmanana\b/.test(n)) return now.plus({ days: 1 }).startOf('day');

  // Day of week → next occurrence
  const dayNames: Record<string, number> = {
    lunes: 1, martes: 2, miercoles: 3, jueves: 4,
    viernes: 5, sabado: 6, domingo: 7,
  };
  for (const [name, iso] of Object.entries(dayNames)) {
    if (n.includes(name)) {
      let target = now.startOf('day');
      while (target.weekday !== iso) target = target.plus({ days: 1 });
      return target;
    }
  }

  // "DD de MES"
  const monthNames: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  };
  const dateMatch = n.match(/(\d{1,2})\s+de\s+(\w+)/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = monthNames[dateMatch[2]];
    if (month && day >= 1 && day <= 31) {
      let dt = DateTime.fromObject({ year: now.year, month, day }, { zone: tz });
      if (dt < now.startOf('day')) dt = DateTime.fromObject({ year: now.year + 1, month, day }, { zone: tz });
      if (dt.isValid) return dt;
    }
  }

  // "el DD" (assume current or next month)
  const justDay = n.match(/\bel\s+(\d{1,2})\b/);
  if (justDay) {
    const day = parseInt(justDay[1]);
    if (day >= 1 && day <= 31) {
      let dt = DateTime.fromObject({ year: now.year, month: now.month, day }, { zone: tz });
      if (!dt.isValid || dt < now.startOf('day')) dt = dt.plus({ months: 1 });
      if (dt.isValid) return dt;
    }
  }

  return null;
}

// Parse natural language time hints into 24h format (e.g., "3pm" → "15:00")
function parseTimeHint(input: string): string | null {
  const n = input.trim().toLowerCase().replace(/[.,;:?¿!¡]+$/g, '');

  // "3pm" / "3 pm" / "3:00pm" / "3:00 pm" / "3:30pm"
  const ampm = n.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (ampm) {
    let hour = parseInt(ampm[1]);
    const min = ampm[2] ? parseInt(ampm[2]) : 0;
    if (ampm[3] === 'pm' && hour < 12) hour += 12;
    if (ampm[3] === 'am' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

  // "las 3" / "a las 3" / "a las 3:30" (assume PM if hour < 8)
  const las = n.match(/(?:a\s+)?las\s+(\d{1,2})(?::(\d{2}))?/);
  if (las) {
    let hour = parseInt(las[1]);
    const min = las[2] ? parseInt(las[2]) : 0;
    if (hour < 8) hour += 12;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

  return null;
}

async function handleBookingSelectDay(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient
): Promise<BotResponse> {
  const availableWeeks = session.context.availableWeeks || [];
  let selection = parseInt(input.trim());

  const isReschedule = session.context.isReschedule;
  const flowEmoji = isReschedule ? OPT_EMOJI.reagendar : OPT_EMOJI.agendar;
  const flowName = isReschedule ? 'Reagendar cita' : 'Agendar cita';
  const steps = getStepNumbers(session);

  // Fuzzy match text against week labels
  if (isNaN(selection) || selection < 1 || selection > availableWeeks.length) {
    const fuzzyIdx = fuzzyMatchOption(input, availableWeeks.map((w: any) => w.weekLabel));
    if (fuzzyIdx !== null) selection = fuzzyIdx + 1;
  }
  // Parse date hint and find which week contains it
  if (isNaN(selection) || selection < 1 || selection > availableWeeks.length) {
    const dateHint = parseDateHint(input);
    if (dateHint) {
      for (let i = 0; i < availableWeeks.length; i++) {
        const ws = DateTime.fromISO(availableWeeks[i].weekStart, { zone: 'America/Tegucigalpa' });
        const we = ws.plus({ days: 6 });
        if (dateHint >= ws && dateHint <= we) { selection = i + 1; break; }
      }
    }
  }

  // Validate selection
  if (isNaN(selection) || selection < 1 || selection > availableWeeks.length) {
    const stepTitle = buildStepTitle(flowEmoji, flowName, steps.weekStep, steps.totalSteps);
    return {
      message: `${stepTitle}\n\n⚠️ Opcion no valida.\n👉 Escriba el *numero* de la semana. Ejemplo: *1*\n\nSeleccione una semana:`,
      options: availableWeeks.map((w: any) => w.weekLabel),
      requiresInput: true,
      nextState: 'booking_select_day',
      sessionComplete: false,
    };
  }

  const selectedWeek = availableWeeks[selection - 1];
  session.context.selectedWeek = selectedWeek.weekStart;

  // Get available days in the selected week
  const durationMins = session.context.durationMinutes || 60;
  const granularity = session.context.slotGranularity || Math.min(durationMins, 30);
  const days = await getAvailableDaysInWeek(
    session.context.doctorId,
    selectedWeek.weekStart,
    durationMins,
    supabase,
    session.context.calendarId,
    granularity
  );

  if (days.length === 0) {
    const stepTitle = buildStepTitle(flowEmoji, flowName, steps.weekStep, steps.totalSteps);
    return {
      message: `${stepTitle}\n\n⚠️ No hay dias disponibles en esta semana.\nSeleccione otra semana:`,
      options: availableWeeks.map((w: any) => w.weekLabel),
      requiresInput: true,
      nextState: 'booking_select_day',
      sessionComplete: false,
    };
  }

  // Store days in context
  session.context.availableDays = days;

  const stepTitle = buildStepTitle(flowEmoji, flowName, steps.dayStep, steps.totalSteps);

  return {
    message: `${stepTitle}\n\n¿Que dia prefiere?`,
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
  let selection = parseInt(input.trim());

  // Check if user wants to see more slots
  if (session.context.availableSlots && input.trim().toLowerCase() === String(session.context.availableSlots.length + 1)) {
    // "Ver más horarios" was selected
    session.context.slotPage = (session.context.slotPage || 1) + 1;
    return await showHourSlots(session, supabase);
  }

  const isReschedule = session.context.isReschedule;
  const flowEmoji = isReschedule ? OPT_EMOJI.reagendar : OPT_EMOJI.agendar;
  const flowName = isReschedule ? 'Reagendar cita' : 'Agendar cita';
  const steps = getStepNumbers(session);

  // Check if user is selecting a time slot (already in hour selection mode)
  if (session.context.availableSlots) {
    const slots = session.context.availableSlots as string[];

    // Fuzzy match text against formatted time options (e.g., "2:00 PM", "3:30 pm")
    if (!(selection >= 1 && selection <= slots.length)) {
      const formattedSlots = slots.map((s: string) => formatTimeForTemplate(s));
      const fuzzyIdx = fuzzyMatchOption(input, formattedSlots);
      if (fuzzyIdx !== null) selection = fuzzyIdx + 1;
    }
    // Parse time hint (e.g., "3pm", "las 2", "a las 3:30") → match to raw slot
    if (!(selection >= 1 && selection <= slots.length)) {
      const timeHint = parseTimeHint(input);
      if (timeHint) {
        const slotIdx = slots.findIndex((s: string) => s === timeHint);
        if (slotIdx >= 0) selection = slotIdx + 1;
      }
    }

    if (selection >= 1 && selection <= slots.length) {
      const selectedTime = slots[selection - 1];
      session.context.selectedTime = selectedTime;

      // Show confirmation
      const timezone = 'America/Tegucigalpa';
      const selectedDate = DateTime.fromISO(session.context.selectedDate, { zone: timezone });
      const dayLabel = selectedDate.toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

      const confirmTitle = buildStepTitle(OPT_EMOJI.confirmar, 'Confirmar cita', steps.confirmStep, steps.totalSteps);

      const serviceTypeLine = session.context.selectedServiceType ? `\n📋 ${session.context.selectedServiceType}` : '';

      return {
        message: `${confirmTitle}\n\n🩺 ${session.context.doctorName}${serviceTypeLine}\n${OPT_EMOJI.agendar} ${dayLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(selectedTime)}\n⏱️ ${session.context.durationMinutes} min`,
        options: [`${OPT_EMOJI.confirmar} Si, confirmar`, `${OPT_EMOJI.cambiar} Cambiar horario`, `${OPT_EMOJI.cancelar} Cancelar`],
        requiresInput: true,
        nextState: 'booking_confirm',
        sessionComplete: false,
      };
    }

    // Invalid slot selection
    return await showHourSlots(session, supabase);
  }

  // First time: user is selecting a day
  // Fuzzy match text against day labels (e.g., "lunes 24 mar")
  if (isNaN(selection) || selection < 1 || selection > availableDays.length) {
    const fuzzyIdx = fuzzyMatchOption(input, availableDays.map((d: any) => d.label));
    if (fuzzyIdx !== null) selection = fuzzyIdx + 1;
  }
  // Parse date hint and match to available day
  if (isNaN(selection) || selection < 1 || selection > availableDays.length) {
    const dateHint = parseDateHint(input);
    if (dateHint) {
      const dateStr = dateHint.toISODate();
      const dayIdx = availableDays.findIndex((d: any) => d.date === dateStr);
      if (dayIdx >= 0) selection = dayIdx + 1;
    }
  }

  if (isNaN(selection) || selection < 1 || selection > availableDays.length) {
    const stepTitle = buildStepTitle(flowEmoji, flowName, steps.dayStep, steps.totalSteps);
    return {
      message: `${stepTitle}\n\n⚠️ Opcion no valida.\n👉 Escriba el *numero* del dia. Ejemplo: *1*\n\n¿Que dia prefiere?`,
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
  const PAGE_SIZE = 10;
  const page = session.context.slotPage || 1;

  const durationMinutes = session.context.durationMinutes || 60;
  const slotGranularity = session.context.slotGranularity || Math.min(durationMinutes, 30);

  const result = await getAvailableHoursForDate(
    session.context.doctorId,
    session.context.selectedDate,
    durationMinutes,
    page,
    PAGE_SIZE,
    supabase,
    session.context.calendarId,
    slotGranularity
  );

  const isReschedule = session.context.isReschedule;
  const flowEmoji = isReschedule ? OPT_EMOJI.reagendar : OPT_EMOJI.agendar;
  const flowName = isReschedule ? 'Reagendar cita' : 'Agendar cita';
  const steps = getStepNumbers(session);

  if (result.slots.length === 0) {
    const stepTitle = buildStepTitle(flowEmoji, flowName, steps.dayStep, steps.totalSteps);
    return {
      message: `${stepTitle}\n\n⚠️ No hay horarios disponibles para este dia.\nSeleccione otro dia:`,
      options: (session.context.availableDays || []).map((d: any) => d.label),
      requiresInput: true,
      nextState: 'booking_select_hour',
      sessionComplete: false,
    };
  }

  // Store current page slots in context
  session.context.availableSlots = result.slots;

  const options = result.slots.map((s: string) => formatTimeForTemplate(s));
  if (result.hasMore) {
    options.push('Ver mas horarios ➡️');
  }

  const timezone = 'America/Tegucigalpa';
  const selectedDate = DateTime.fromISO(session.context.selectedDate, { zone: timezone });
  const dayLabel = selectedDate.toFormat('EEEE dd MMMM', { locale: 'es' });

  const stepTitle = buildStepTitle(flowEmoji, flowName, steps.hourStep, steps.totalSteps);

  return {
    message: `${stepTitle}\n\n${OPT_EMOJI.horarios} Horarios disponibles — *${dayLabel}*\n${session.context.doctorName}`,
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
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string }
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
        message: 'Para completar su cita, necesitamos su nombre completo.\n\n¿Cual es su nombre?',
        requiresInput: true,
        nextState: 'booking_ask_name',
        sessionComplete: false,
      };
    }

    // Link patient to this doctor if not already linked
    if (session.context.doctorId) {
      await supabase.from('doctor_patients').upsert({
        doctor_id: session.context.doctorId,
        patient_id: patient.id,
        organization_id: organizationId,
      }, { onConflict: 'doctor_id,patient_id' });
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
      message: `${OPT_EMOJI.cancelar} Proceso cancelado.\n\n¿En que puedo ayudarle?`,
      options: [
        `${OPT_EMOJI.agendar} Agendar cita`,
        `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
        `${OPT_EMOJI.faq} Preguntas frecuentes`,
        handoffLabels.menuOption,
      ],
      showMenuHint: false,
      requiresInput: true,
      nextState: 'main_menu',
      sessionComplete: false,
    };
  }

  return {
    message: '⚠️ Opcion no valida.\n\n¿Desea confirmar la cita?',
    options: [`${OPT_EMOJI.confirmar} Si, confirmar`, `${OPT_EMOJI.cambiar} Cambiar horario`, `${OPT_EMOJI.cancelar} Cancelar`],
    requiresInput: true,
    nextState: 'booking_confirm',
    sessionComplete: false,
  };
}

async function handleBookingAskName(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string }
): Promise<BotResponse> {
  const trimmedName = input.trim();

  // Validate: name must be at least 3 characters and not a number
  if (trimmedName.length < 3 || /^\d+$/.test(trimmedName)) {
    return {
      message: '⚠️ Por favor ingrese su nombre completo (ej: Juan Perez):',
      requiresInput: true,
      nextState: 'booking_ask_name',
      sessionComplete: false,
    };
  }

  // Create the patient record (RPC also creates doctor_patients junction)
  const { data: rpcResult, error: createError } = await supabase
    .rpc('find_or_create_patient', {
      p_name: trimmedName,
      p_phone: session.patient_phone,
      p_doctor_id: session.context.doctorId,
      p_organization_id: organizationId,
    });

  const newPatient = rpcResult;

  if (createError) {
    console.error('[booking_ask_name] Error creating patient:', createError);
    return {
      message: `⚠️ Error al registrar sus datos.\n\nConectando con ${handoffLabels.connecting}...`,
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
  const checkDuration = session.context.durationMinutes || 60;
  const slotsCheck = await getAvailableSlotsForDate(
    session.context.doctorId,
    session.context.selectedDate,
    checkDuration,
    supabase,
    session.context.calendarId,
    session.context.slotGranularity || Math.min(checkDuration, 30)
  );

  if (!slotsCheck.includes(session.context.selectedTime)) {
    // Slot was taken
    session.context.slotPage = 1;
    session.context.availableSlots = null;
    return {
      message: '⚠️ Ese horario acaba de ser reservado.\n\nHorarios actualizados:',
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
      service_type: session.context.selectedServiceType || null,
      calendar_id: session.context.calendarId || null,
    })
    .select()
    .single();

  if (aptError) {
    console.error('[createAppointment] Error creating appointment:', aptError);
    return {
      message: `⚠️ Error al agendar la cita.\n\nConectando con ${session.context.handoffLabels?.connecting || 'la secretaria'}...`,
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  const timezone = 'America/Tegucigalpa';
  const dateLabel = DateTime.fromISO(session.context.selectedDate, { zone: timezone })
    .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

  const successEmoji = session.context.isReschedule ? OPT_EMOJI.reagendar : OPT_EMOJI.confirmar;
  const successTitle = session.context.isReschedule ? '¡Cita reagendada exitosamente!' : '¡Cita agendada exitosamente!';

  const serviceTypeLine = session.context.selectedServiceType ? `\n📋 ${session.context.selectedServiceType}` : '';

  return {
    message: `${successEmoji} *${successTitle}*\n\n🩺 ${session.context.doctorName}${serviceTypeLine}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(session.context.selectedTime)}\n⏱️ ${session.context.durationMinutes} min\n\nRecibira un recordatorio antes de su cita.`,
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
      message: `⚠️ No encontramos su informacion en el sistema.\n\nConectando con ${session.context.handoffLabels?.connecting || 'la secretaria'}...`,
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  session.context.patientId = patient.id;
  session.context.patientName = patient.name;

  return await handleRescheduleList('', session, organizationId, supabase, session.context.handoffLabels);
}

async function handleRescheduleList(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string }
): Promise<BotResponse> {
  const patientId = session.context.patientId;

  if (!patientId) {
    return {
      message: `⚠️ No encontramos su informacion.\n\nConectando con ${handoffLabels.connecting}...`,
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  // If user already has appointments listed, handle their selection
  if (session.context.upcomingAppointments && input.trim()) {
    const appointments = session.context.upcomingAppointments as any[];
    const selection = parseInt(input.trim());

    // "Volver al menu" is always the last option
    if (selection === appointments.length + 1 || input.trim().toLowerCase().includes('volver') || input.trim().toLowerCase().includes('menu')) {
      return {
        message: '¿En que puedo ayudarle?',
        options: [
          `${OPT_EMOJI.agendar} Agendar cita`,
          `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
          `${OPT_EMOJI.faq} Preguntas frecuentes`,
          handoffLabels.menuOption,
        ],
        showMenuHint: false,
        requiresInput: true,
        nextState: 'main_menu',
        sessionComplete: false,
      };
    }

    if (isNaN(selection) || selection < 1 || selection > appointments.length) {
      const options = appointments.map((apt: any) => {
        const dateLabel = DateTime.fromISO(apt.date, { zone: 'America/Tegucigalpa' }).toFormat('dd MMM', { locale: 'es' });
        return `${apt.doctorName} - ${dateLabel} ${formatTimeForTemplate(apt.time)}`;
      });
      options.push(`${OPT_EMOJI.volver} Volver al menu`);

      return {
        message: '⚠️ Opcion no valida.\n👉 Escriba el *numero* de la cita. Ejemplo: *1*\n\nSeleccione una cita:',
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

    // Lookup calendarId from whatsapp_line_doctors (same pattern as handleDirectReschedule)
    const { data: lineDoc } = await supabase
      .from('whatsapp_line_doctors')
      .select('calendar_id')
      .eq('whatsapp_line_id', session.whatsapp_line_id)
      .eq('doctor_id', selectedApt.doctorId)
      .limit(1)
      .maybeSingle();
    session.context.calendarId = lineDoc?.calendar_id || null;

    const dateLabel = DateTime.fromISO(selectedApt.date, { zone: 'America/Tegucigalpa' })
      .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

    return {
      message: `${OPT_EMOJI.reagendar} *Cita seleccionada*\n\n🩺 ${selectedApt.doctorName}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(selectedApt.time)}\n\n¿Que desea hacer?`,
      options: [`${OPT_EMOJI.reagendar} Reagendar cita`, `${OPT_EMOJI.cancelar} Cancelar cita`, `${OPT_EMOJI.volver} Volver al menu`],
      requiresInput: true,
      nextState: 'cancel_confirm',
      sessionComplete: false,
    };
  }

  // First time: fetch and display appointments
  const appointments = await getPatientUpcomingAppointments(patientId, organizationId, supabase);

  if (appointments.length === 0) {
    return {
      message: `${OPT_EMOJI.reagendar} No tiene citas programadas para reagendar o cancelar.`,
      options: [`${OPT_EMOJI.menu} Menu principal`],
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
    serviceType: apt.service_type || null,
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

    // Lookup calendarId from whatsapp_line_doctors (same pattern as handleDirectReschedule)
    const { data: lineDoc } = await supabase
      .from('whatsapp_line_doctors')
      .select('calendar_id')
      .eq('whatsapp_line_id', session.whatsapp_line_id)
      .eq('doctor_id', apt.doctorId)
      .limit(1)
      .maybeSingle();
    session.context.calendarId = lineDoc?.calendar_id || null;

    const dateLabel = DateTime.fromISO(apt.date, { zone: 'America/Tegucigalpa' })
      .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

    return {
      message: `${OPT_EMOJI.reagendar} *Su cita proxima:*\n\n🩺 ${apt.doctorName}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(apt.time)}\n\n¿Que desea hacer?`,
      options: [`${OPT_EMOJI.reagendar} Reagendar cita`, `${OPT_EMOJI.cancelar} Cancelar cita`, `${OPT_EMOJI.volver} Volver al menu`],
      requiresInput: true,
      nextState: 'cancel_confirm',
      sessionComplete: false,
    };
  }

  // Multiple appointments - list them
  const options = mappedAppointments.map((apt: any) => {
    const dateLabel = DateTime.fromISO(apt.date, { zone: 'America/Tegucigalpa' }).toFormat('dd MMM', { locale: 'es' });
    return `${apt.doctorName} - ${dateLabel} ${formatTimeForTemplate(apt.time)}`;
  });
  options.push(`${OPT_EMOJI.volver} Volver al menu`);

  return {
    message: `${OPT_EMOJI.reagendar} *Sus citas proximas*\n\n¿Cual desea reagendar o cancelar?`,
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
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string }
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
          message: `⚠️ Error al cancelar la cita.\n\nConectando con ${handoffLabels.connecting}...`,
          requiresInput: false,
          nextState: 'handoff_secretary',
          sessionComplete: true,
        };
      }

      const dateLabel = DateTime.fromISO(session.context.rescheduleAppointmentDate, { zone: 'America/Tegucigalpa' })
        .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

      return {
        message: `${OPT_EMOJI.cancelar} *Cita cancelada*\n\n🩺 ${session.context.rescheduleAppointmentDoctorName}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(session.context.rescheduleAppointmentTime)}\n\nLa cita ha sido cancelada exitosamente.\n\n¿En que puedo ayudarle?`,
        options: [
          `${OPT_EMOJI.agendar} Agendar cita`,
          `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
          `${OPT_EMOJI.faq} Preguntas frecuentes`,
          handoffLabels.menuOption,
        ],
        showMenuHint: false,
        requiresInput: true,
        nextState: 'main_menu',
        sessionComplete: false,
      };
    }

    // Option 2 or "no" → go back to action selection
    if (selection === 2 || normalizedInput.includes('no') || normalizedInput.includes('volver')) {
      return {
        message: '¿Que desea hacer con esta cita?',
        options: [`${OPT_EMOJI.reagendar} Reagendar cita`, `${OPT_EMOJI.cancelar} Cancelar cita`, `${OPT_EMOJI.volver} Volver al menu`],
        requiresInput: true,
        nextState: 'cancel_confirm',
        sessionComplete: false,
      };
    }

    // Invalid input in delete confirm phase
    return {
      message: '⚠️ ¿Esta seguro que desea cancelar la cita?',
      options: [`${OPT_EMOJI.cancelar} Si, cancelar cita`, `${OPT_EMOJI.volver} No, volver`],
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

    const selectedApt = (session.context.upcomingAppointments || []).find((a: any) => a.id === session.context.rescheduleAppointmentId);
    session.context.durationMinutes = selectedApt?.durationMinutes || lineData?.default_duration_minutes || 60;
    session.context.slotGranularity = Math.min(session.context.durationMinutes, 30);
    session.context.isReschedule = true; // Flag to know we're rescheduling
    session.context.bookingTotalSteps = 4; // Reschedule always 4 steps (doctor already selected)

    // Carry over service type from original appointment
    if (selectedApt?.serviceType) {
      session.context.selectedServiceType = selectedApt.serviceType;
    }

    // Go to week selection (reuse booking flow)
    const weeks = await getAvailableWeeks(session.context.doctorId, session.context.durationMinutes, supabase, session.context.calendarId, session.context.slotGranularity);

    if (weeks.length === 0) {
      return {
        message: `⚠️ No encontramos disponibilidad en las proximas semanas.\n\nConectando con ${handoffLabels.connecting}...`,
        requiresInput: false,
        nextState: 'handoff_secretary',
        sessionComplete: true,
      };
    }

    session.context.availableWeeks = weeks;

    const stepTitle = buildStepTitle(OPT_EMOJI.reagendar, 'Reagendar cita', 1, 4);

    return {
      message: `${stepTitle}\n\nSeleccione la nueva semana para su cita con ${session.context.doctorName}:\n👉 Escriba el numero`,
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
      message: `⚠️ ¿Esta seguro que desea *cancelar* su cita?\n\n🩺 ${session.context.rescheduleAppointmentDoctorName}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(session.context.rescheduleAppointmentTime)}\n\n_Esta accion no se puede deshacer._`,
      options: [`${OPT_EMOJI.cancelar} Si, cancelar cita`, `${OPT_EMOJI.volver} No, volver`],
      requiresInput: true,
      nextState: 'cancel_confirm',
      sessionComplete: false,
    };
  }

  // Option 3: Volver al menu
  if (selection === 3 || normalizedInput.includes('volver') || normalizedInput.includes('no') || normalizedInput.includes('menu') || normalizedInput.includes('menú')) {
    return {
      message: '¿En que puedo ayudarle?',
      options: [
        `${OPT_EMOJI.agendar} Agendar cita`,
        `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
        `${OPT_EMOJI.faq} Preguntas frecuentes`,
        handoffLabels.menuOption,
      ],
      showMenuHint: false,
      requiresInput: true,
      nextState: 'main_menu',
      sessionComplete: false,
    };
  }

  // Invalid input
  return {
    message: '⚠️ Opcion no valida.\n\n¿Que desea hacer con esta cita?',
    options: [`${OPT_EMOJI.reagendar} Reagendar cita`, `${OPT_EMOJI.cancelar} Cancelar cita`, `${OPT_EMOJI.volver} Volver al menu`],
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
  supabase: SupabaseClient,
  handoffLabels?: { menuOption: string; connecting: string; emoji: string },
  sessionContext?: Record<string, any>
): Promise<BotResponse> {
  const emoji = handoffLabels?.emoji || '\ud83d\udc69\ud83c\udffb\u200d\ud83d\udcbc';
  const connecting = handoffLabels?.connecting || 'la secretaria';

  // Determine handoff target from whatsapp_line config
  const { data: lineConfig } = await supabase
    .from('whatsapp_lines')
    .select('bot_handoff_type')
    .eq('id', whatsappLineId)
    .single();

  const handoffType = lineConfig?.bot_handoff_type || 'secretary';
  let targetPhone: string | null = null;

  if (handoffType === 'secretary') {
    // Find secretary phone via org_members → secretaries
    const { data: member } = await supabase
      .from('org_members')
      .select('secretary:secretary_id(phone)')
      .eq('organization_id', organizationId)
      .eq('role', 'secretary')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    targetPhone = (member?.secretary as any)?.phone || null;
  } else {
    // Find doctor phone via whatsapp_line_doctors → doctors
    const { data: lineDoctor } = await supabase
      .from('whatsapp_line_doctors')
      .select('doctor:doctor_id(phone)')
      .eq('whatsapp_line_id', whatsappLineId)
      .limit(1)
      .maybeSingle();

    targetPhone = (lineDoctor?.doctor as any)?.phone || null;
  }

  // Resolve patient name
  const patientName = sessionContext?.patientName || null;
  let resolvedName = patientName;
  if (!resolvedName) {
    const patient = await findPatientByPhone(patientPhone, organizationId, supabase);
    resolvedName = patient?.name || null;
  }

  // Fire-and-forget notification to target
  if (targetPhone) {
    notifyHandoffTarget(targetPhone, patientPhone, resolvedName, organizationId).catch((err) => {
      console.warn('[bot] Handoff notification failed (non-blocking):', err);
    });
  } else {
    console.warn(`[bot] No phone found for handoff target (${handoffType}), org ${organizationId}`);
  }

  return {
    message: `${emoji} Conectando con ${connecting}...\n\nEn breve recibira respuesta. Gracias por su paciencia.`,
    requiresInput: false,
    nextState: 'handoff_secretary',
    sessionComplete: true,
  };
}

async function notifyHandoffTarget(
  targetPhone: string,
  patientPhone: string,
  patientName: string | null,
  organizationId: string,
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !internalSecret) {
    console.warn('[bot] Missing env vars for handoff notification');
    return;
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

  const normalizedTarget = normalizeToE164(targetPhone);
  const normalizedPatient = normalizeToE164(patientPhone);

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'x-internal-secret': internalSecret,
      'apikey': anonKey,
    },
    body: JSON.stringify({
      to: normalizedTarget,
      type: 'handoff_notification',
      templateParams: {
        '1': normalizedPatient,
        '2': patientName || 'No registrado',
      },
      organizationId,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    console.warn('[bot] Handoff notification gateway error:', data.error || `HTTP ${response.status}`);
  } else {
    console.log('[bot] Handoff notification sent to:', normalizedTarget);
  }
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
  console.log('[searchFAQ] Query:', normalizedQuery);

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

  if (error) {
    console.error('[searchFAQ] Supabase error:', error.message);
    return null;
  }
  if (!faqs || faqs.length === 0) {
    console.log('[searchFAQ] No FAQs found for org/doctor/clinic scope');
    return null;
  }
  console.log('[searchFAQ] FAQs loaded:', faqs.length);

  // Find best match: keyword overlap
  let bestMatch: BotFAQ | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const keywords = faq.keywords || [];
    let score = 0;

    // Check if query contains any keyword (or keyword contains query for short queries)
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      if (normalizedQuery.includes(kw)) {
        score += 1;
      } else if (normalizedQuery.length >= 3 && kw.includes(normalizedQuery)) {
        score += 0.75;
      }
    }

    // Also check if question contains query words (with prefix matching)
    const queryWords = normalizedQuery.split(/\s+/);
    const questionLower = faq.question.toLowerCase();
    const questionWords = questionLower.split(/\s+/);
    for (const word of queryWords) {
      if (word.length >= 3 && questionLower.includes(word)) {
        score += 0.5;
      } else if (word.length >= 4) {
        for (const qw of questionWords) {
          if (qw.startsWith(word)) {
            score += 0.25;
            break;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  if (bestScore > 0 && bestMatch) {
    console.log('[searchFAQ] Best match:', bestMatch.question, '| Score:', bestScore);
  } else {
    const queryWords = normalizedQuery.split(/\s+/);
    console.log('[searchFAQ] No match | Query words:', queryWords);
  }

  return bestScore > 0 ? bestMatch : null;
}

async function getAvailableWeeks(
  doctorId: string,
  durationMinutes: number,
  supabase: SupabaseClient,
  calendarId?: string,
  slotGranularity?: number
): Promise<{ weekStart: string; weekLabel: string }[]> {
  const timezone = 'America/Tegucigalpa';
  const now = DateTime.now().setZone(timezone);
  const weeks: { weekStart: string; weekLabel: string }[] = [];
  const MAX_RESULTS = 2;
  const MAX_SCAN = 6;
  const granularity = slotGranularity || Math.min(durationMinutes, 30);

  for (let i = 0; i < MAX_SCAN && weeks.length < MAX_RESULTS; i++) {
    const weekStart = now.plus({ weeks: i }).startOf('week'); // Monday
    const weekEnd = weekStart.plus({ days: 6 }); // Sunday

    // Verify real availability using getAvailableDaysInWeek (checks past days, booked slots, etc.)
    const days = await getAvailableDaysInWeek(
      doctorId,
      weekStart.toISODate() || '',
      durationMinutes,
      supabase,
      calendarId,
      granularity
    );

    if (days.length > 0) {
      const label = `Semana del ${weekStart.toFormat('dd MMM', { locale: 'es' })} al ${weekEnd.toFormat('dd MMM', { locale: 'es' })}`;
      weeks.push({
        weekStart: weekStart.toISODate() || '',
        weekLabel: label,
      });
    }
  }

  return weeks;
}

async function getAvailableDaysInWeek(
  doctorId: string,
  weekStart: string,
  durationMinutes: number,
  supabase: SupabaseClient,
  calendarId?: string,
  slotGranularity: number = 30
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
    const slots = await getAvailableSlotsForDate(doctorId, dateStr, durationMinutes, supabase, calendarId, slotGranularity);

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
  calendarId?: string,
  slotGranularity: number = 30
): Promise<{ slots: string[]; hasMore: boolean; totalSlots: number }> {
  const allSlots = await getAvailableSlotsForDate(doctorId, date, durationMinutes, supabase, calendarId, slotGranularity);
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
  calendarId?: string,
  slotGranularity: number = 30
): Promise<string[]> {

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

  // Filter past slots for today
  const timezone = 'America/Tegucigalpa';
  const now = DateTime.now().setZone(timezone);
  const isToday = date === now.toISODate();
  const nowHHMM = now.toFormat('HH:mm');

  for (const schedule of schedules) {
    const workStart = DateTime.fromISO(`${date}T${schedule.start_time.substring(0, 5)}:00`);
    const workEnd = DateTime.fromISO(`${date}T${schedule.end_time.substring(0, 5)}:00`);
    const workEndMs = workEnd.toMillis();

    let slotStart = workStart;

    while (slotStart.plus({ minutes: durationMinutes }).toMillis() <= workEndMs) {
      // Skip slots that are in the past for today
      if (isToday && slotStart.toFormat('HH:mm') <= nowHHMM) {
        slotStart = slotStart.plus({ minutes: slotGranularity });
        continue;
      }

      const slotStartMs = slotStart.toMillis();
      const slotEndMs = slotStart.plus({ minutes: durationMinutes }).toMillis();

      const hasOverlap = occupiedIntervals.some(({ startMs, endMs }: any) => {
        return slotStartMs < endMs && startMs < slotEndMs;
      });

      if (!hasOverlap) {
        availableSlots.push(slotStart.toFormat('HH:mm'));
      }

      slotStart = slotStart.plus({ minutes: slotGranularity });
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
  // Normalize to E.164 — DB stores all phones as +504XXXXXXXX
  const normalized = phone.startsWith('+') ? phone : `+504${phone}`;
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('phone', normalized)
    .limit(1)
    .maybeSingle();

  return patient || null;
}

async function getPatientUpcomingAppointments(
  patientId: string,
  organizationId: string,
  supabase: SupabaseClient
): Promise<any[]> {
  const tz = 'America/Tegucigalpa';
  const nowDt = DateTime.now().setZone(tz);
  const todayDate = nowDt.toISODate();
  const currentTime = nowDt.toFormat('HH:mm:ss');

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, date, time, status, notes, duration_minutes, service_type,
      doctors:doctor_id (id, name, prefix)
    `)
    .eq('patient_id', patientId)
    .eq('organization_id', organizationId)
    .gte('date', todayDate || '')
    .in('status', ['agendada', 'confirmada'])
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .limit(10);

  // Filter out today's appointments that already passed
  const filtered = (appointments || []).filter((apt: any) => {
    if (apt.date === todayDate) {
      return apt.time >= currentTime;
    }
    return true;
  });

  return filtered.slice(0, 5);
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
