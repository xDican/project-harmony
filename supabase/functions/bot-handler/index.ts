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
import { detectIntent, isAcknowledgment } from '../_shared/honduras-intents.ts';
import { downloadFromStorage, uploadMetaMedia } from '../_shared/meta-media.ts';
import { getAvailableSlotsForDate as computeAvailableSlots } from '../_shared/availability.ts';

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
  | 'promo_browse'         // Lista de promociones activas — usuario puede pedir mas detalle o volver
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
  // Sprint 5: si true, el webhook NO envia el `message` via send-whatsapp-message
  // porque el bot ya envio directamente (ej. mensaje multimedia con caption).
  // Igual se loggea la conversation transition.
  skipDefaultSend?: boolean;
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
  min_match_score?: number;
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

  // Fase 2: org disponible en context para el motor resource-aware (availability)
  session.context.organizationId = organizationId;

  // Load handoff labels and service types once per session
  if (!session.context.handoffLabels) {
    const { data: lineConfig } = await supabase
      .from('whatsapp_lines')
      .select('bot_handoff_type')
      .eq('id', whatsappLineId)
      .single();
    session.context.handoffLabels = HANDOFF_LABELS[lineConfig?.bot_handoff_type || 'secretary'];

    // Fase 1 motor: los tipos de servicio son la tabla service_types (fuente unica),
    // ya no el JSONB whatsapp_lines.bot_service_types. display_name = lo que ve el
    // paciente; el id se propaga al INSERT (appointments.service_type_id).
    // Catalogo ORG-LEVEL (decision Diego 2 Jun): el bot ofrece todos los servicios
    // activos del org, no filtra por linea — multiples consumidores (promos, quick
    // replies, recetas/skills del motor) ya referencian service_type_id a nivel org.
    // Para clientes reales (1 linea/org) es identico a filtrar por linea.
    const { data: stRows } = await supabase
      .from('service_types')
      .select('id, display_name, duration_minutes, price, requires_prior_consult')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    session.context.lineServiceTypes = (stRows || []).map((st: any) => ({
      id: st.id,
      name: st.display_name,
      duration_minutes: st.duration_minutes ?? undefined,
      // Fase 6: price (el bot lo da en confirmacion) + requires_prior_consult
      // (paciente nuevo debe ver al doctor antes del procedimiento).
      price: st.price ?? undefined,
      requires_prior_consult: st.requires_prior_consult ?? false,
    }));
  }
  const handoffLabels = session.context.handoffLabels as { menuOption: string; connecting: string; emoji: string };

  const stateBefore = session.state;

  // Guard: mensaje vacio (sticker/audio/imagen/ubicacion sin transcribir).
  // Antes: caia al handler del estado, marcaba "opcion no valida", incrementaba
  //   invalidAttempts y eventualmente disparaba handoff (a veces duplicado en ms).
  // Ahora: pedimos texto sin avanzar el estado.
  if (!messageText || messageText.trim().length === 0) {
    console.log('[bot-handler] Empty user_message (likely media without transcript). State:', session.state, 'Phone:', patientPhone);

    // Dedupe: si en los ultimos 5s ya respondimos a este caso, no repetir
    const recentCutoff = new Date(Date.now() - 5000).toISOString();
    const { data: recentLogs } = await supabase
      .from('bot_conversation_logs')
      .select('id, user_message')
      .eq('session_id', session.id)
      .gte('created_at', recentCutoff)
      .limit(2);

    const recentDup = (recentLogs || []).some((r: any) => !r.user_message || r.user_message.trim() === '');
    if (recentDup) {
      console.log('[bot-handler] Duplicate empty-message detected, skipping response');
      return {
        message: '',
        requiresInput: false,
        nextState: session.state,
        sessionComplete: false,
      };
    }

    const emptyResp: BotResponse = {
      message: '🤔 Solo veo un audio/imagen/sticker. Por favor escriba su mensaje en texto para poder ayudarle.',
      requiresInput: true,
      nextState: session.state, // mantener estado actual sin avanzar
      sessionComplete: false,
    };
    // Log para tracking de incidencia
    const emptyMs = Date.now() - startTime;
    const emptyIntent = 'media_no_text';
    logConversation(
      session.id, whatsappLineId, organizationId, patientPhone,
      stateBefore, session.state, '', emptyResp.message,
      [], emptyIntent, emptyMs, supabase
    ).catch((err) => console.error('[bot-handler] Log error (non-fatal):', err));
    return emptyResp;
  }

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
  const CANCEL_WORDS = ['cancelar', 'canselar'];
  const EXIT_WORDS = ['salir', 'menu', 'volver', 'bolber'];
  const ESCAPE_WORDS = [...CANCEL_WORDS, ...EXIT_WORDS];

  // Caso especial: durante reschedule en booking_*, "cancelar" = confirmar destruccion
  // de la cita original (no salir del flow). Lleva al phase 2 de cancel_confirm.
  if (
    BOOKING_ESCAPABLE_STATES.includes(session.state) &&
    CANCEL_WORDS.includes(trimmedMsg) &&
    session.context.isReschedule &&
    session.context.rescheduleAppointmentId
  ) {
    console.log('[bot-handler] Cancel during reschedule: jumping to phase 2 confirmation');
    const dateLabel = DateTime.fromISO(session.context.rescheduleAppointmentDate, { zone: 'America/Tegucigalpa' })
      .toFormat('EEEE dd MMMM yyyy', { locale: 'es' });
    session.context.cancelConfirmPhase = 'confirm_delete';
    const cancelResp: BotResponse = {
      message: `⚠️ ¿Esta seguro que desea *cancelar* su cita?\n\n🩺 ${session.context.rescheduleAppointmentDoctorName}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(session.context.rescheduleAppointmentTime)}\n\n_Esta accion no se puede deshacer._`,
      options: [`${OPT_EMOJI.cancelar} Si, cancelar cita`, `${OPT_EMOJI.volver} No, volver`],
      requiresInput: true,
      nextState: 'cancel_confirm',
      sessionComplete: false,
    };
    await updateSession(session.id, cancelResp.nextState, session.context, false, supabase);
    const cancelMs = Date.now() - startTime;
    const cancelIntent = detectSessionIntent(stateBefore, cancelResp.nextState, messageText);
    logConversation(
      session.id, whatsappLineId, organizationId, patientPhone,
      stateBefore, cancelResp.nextState, messageText, cancelResp.message,
      cancelResp.options || [], cancelIntent, cancelMs, supabase
    ).catch((err) => console.error('[bot-handler] Log error (non-fatal):', err));
    return cancelResp;
  }

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
        `${OPT_EMOJI.promociones} Ver promociones del mes`,
      ],
      showMenuHint: false,
      requiresInput: true,
      nextState: 'main_menu',
      sessionComplete: false,
    };
    await updateSession(session.id, escapeResponse.nextState, session.context, false, supabase);
    const escResponseTimeMs = Date.now() - startTime;
    const escIntent = detectSessionIntent(stateBefore,escapeResponse.nextState, messageText);
    logConversation(
      session.id, whatsappLineId, organizationId, patientPhone,
      stateBefore, escapeResponse.nextState, messageText, escapeResponse.message,
      escapeResponse.options || [], escIntent, escResponseTimeMs, supabase
    ).catch((err) => console.error('[bot-handler] Log error (non-fatal):', err));
    return escapeResponse;
  }

  // Direct reschedule: when appointmentId arrives (from reminder button click),
  // skip the menu and jump straight to the reschedule/cancel options.
  let response: BotResponse;

  if (input.appointmentId) {
    response = await handleDirectReschedule(input.appointmentId, session, organizationId, supabase, handoffLabels);

    // Update session and log, then return early
    await updateSession(session.id, response.nextState, session.context, response.sessionComplete, supabase);

    const responseTimeMs = Date.now() - startTime;
    const intent = detectSessionIntent(stateBefore,response.nextState, messageText);
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

    case 'promo_browse':
      response = await handlePromoBrowse(messageText, session, organizationId, supabase, handoffLabels);
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
      response = await handleHandoffToSecretary(whatsappLineId, patientPhone, organizationId, supabase, handoffLabels, session.context, session.id);
      break;

    default:
      // Unknown state, reset to greeting
      response = await handleGreeting(session, organizationId, supabase, handoffLabels, messageText);
  }

  // Update session with new state and context
  await updateSession(session.id, response.nextState, session.context, response.sessionComplete, supabase);

  // Log conversation asynchronously (fire and forget - don't block response)
  const responseTimeMs = Date.now() - startTime;
  const intent = detectSessionIntent(stateBefore,response.nextState, messageText);
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
    .select('id, date, time, duration_minutes, status, doctor_id, service_type, service_type_id, doctors:doctor_id (id, name, prefix)')
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
  if (appointment.service_type_id) {
    session.context.selectedServiceTypeId = appointment.service_type_id;
  }
  // Clean stale booking context to prevent "Paso 5/4" bug
  delete session.context.availableDoctors;
  delete session.context.availableServiceTypes;
  session.context.bookingTotalSteps = 4;

  // 6. Saltar menu intermedio — paciente vino del boton "No puedo asistir" o intent
  //    explicito ("reagendar", "no puedo"), no necesita re-seleccionar accion.
  //    Antes: nextState='cancel_confirm' con 3 opciones (47% abandono).
  //    Ahora: directo a seleccion de semana. Escape "cancelar" disponible en booking_*.
  const dateLabel = DateTime.fromISO(appointment.date, { zone: 'America/Tegucigalpa' })
    .toFormat("EEEE dd 'de' MMMM yyyy", { locale: 'es' });

  const weeks = await getAvailableWeeks(appointment.doctor_id, durationMinutes, supabase, calendarId, slotGranularity, session.context.selectedServiceTypeId, session.context.organizationId);

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
    message: `Entendido, le ayudo a reagendar.\n\n🩺 ${doctorName}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(appointment.time)}\n\n${stepTitle}\n\nSeleccione la nueva semana:\n👉 Escriba el numero\n\n_Si prefiere cancelar definitivamente, escriba *cancelar*._`,
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
  // Acks puros ("ok", "gracias", emoji solo) — confirma recepcion sin abrir menu
  if (isAcknowledgment(messageText)) {
    return {
      message: '👍 ¡Recibido! Si necesita algo, escriba *hola*.',
      requiresInput: false,
      nextState: 'completed',
      sessionComplete: true,
      showMenuHint: false,
    };
  }

  // Pre-check con detector hondureno natural (cubre lenguaje libre, typos, preambulos)
  const hnIntent = detectIntent(messageText);

  // Texto libre con intent claro de confirm/reschedule/cancel: replica el camino feliz
  // del boton del recordatorio (meta-webhook). Sin esto, "Confirmo" solo respondia
  // "Recibido" sin actualizar appointments.status — la cita seguia 'agendada' y a las
  // 7am auto-cancel la liberaba silenciosamente.
  if (hnIntent.intent === 'confirm' || hnIntent.intent === 'reschedule' || hnIntent.intent === 'cancel') {
    const patient = await findPatientByPhone(session.patient_phone, organizationId, supabase);
    const upcoming = patient ? await getPatientUpcomingAppointments(patient.id, organizationId, supabase) : [];

    if (upcoming.length > 0) {
      const apt = upcoming[0];
      if (hnIntent.intent === 'confirm') {
        return await confirmAppointmentFromText(apt, supabase);
      }
      if (hnIntent.intent === 'reschedule') {
        return await handleDirectReschedule(apt.id, session, organizationId, supabase, handoffLabels);
      }
      if (hnIntent.intent === 'cancel') {
        return await startDestructiveCancelFromText(apt, session);
      }
    }
    // Sin cita inminente: cae al greeting + menu generico (decision UX alineada con Diego)
  }

  if (hnIntent.intent === 'wrong_number' || hnIntent.intent === 'spam_external_bot') {
    // No abrir menu — paciente no es relevante
    return {
      message: '👍 Anotado, gracias.',
      requiresInput: false,
      nextState: 'completed',
      sessionComplete: true,
      showMenuHint: false,
    };
  }
  if (hnIntent.intent === 'out_of_scope') {
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
  }

  // Detect intent in first message before showing generic greeting.
  // Covers cases like "Reagendar", "quiero agendar cita", "cuanto cuesta la consulta"
  // that would otherwise be lost when greeting responds with menu.
  const normalizedMsg = messageText.trim().toLowerCase();
  const detectedIntent = detectMenuIntent(normalizedMsg);

  // Also check direct keywords (same as handleMainMenu lines 658-679)
  const hasAgendar = (normalizedMsg.includes('agendar') || normalizedMsg.includes('ajendar')) && !normalizedMsg.includes('reagendar') && !normalizedMsg.includes('reajendar');
  const hasReagendar = normalizedMsg.includes('reagendar') || normalizedMsg.includes('reajendar') || normalizedMsg.includes('reprogram') || normalizedMsg.includes('cancelar') || normalizedMsg.includes('canselar');
  const hasHandoff = normalizedMsg.includes('secretar') || normalizedMsg.includes('sekretari') || normalizedMsg.startsWith('hablar con') || normalizedMsg.startsWith('ablar con');

  if (hasAgendar || detectedIntent === 'booking') {
    return await startBookingFlow(session, organizationId, supabase);
  }
  if (hasReagendar || detectedIntent === 'reschedule') {
    return await startRescheduleFlow(session, organizationId, supabase);
  }
  if (hasHandoff || detectedIntent === 'handoff') {
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
  }
  if (detectedIntent === 'faq') {
    // Search FAQ directly with their message instead of showing menu
    const faq = await searchFAQ(messageText, session.context.doctorId, session.context.clinicId, organizationId, supabase);
    if (faq) {
      session.context.lastFaqResult = 'found';
      return {
        message: `${OPT_EMOJI.faq} *Respuesta*\n\n*${faq.question}*\n${faq.answer}`,
        options: [`${OPT_EMOJI.faq} Otra pregunta`, `${OPT_EMOJI.menu} Menu principal`],
        requiresInput: true,
        nextState: 'faq_search',
        sessionComplete: false,
      };
    }
    // FAQ not found — fall through to greeting + menu so they can try other options
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
  const RESCHEDULE = ['reagendar', 'reajendar', 'cancelar', 'canselar',
    'cambiar cita', 'mover cita', 'cambiar fecha', 'mi cita',
    'mi agenda', 'cuando es mi cita', 'cuando sera mi cita', 'no puedo ir',
    'no podre', 'no asistir', 'posponer', 'aplazar',
    'reprogram', 'otra fecha', 'cambiar dia', 'cambiar hora',
    'mover fecha', 'cambiar el dia', 'pasarla para'];
  for (const kw of RESCHEDULE) if (n.includes(kw)) return 'reschedule';

  const FAQ = ['ubicacion', 'ubicasion', 'direccion', 'direcion', 'donde queda', 'donde estan',
    'horario', 'horarios', 'orario', 'a que hora', 'que hora', 'q hora',
    'precio', 'precios', 'presio', 'presios', 'cuanto cuesta', 'cuanto vale', 'costo', 'costos', 'tarifa',
    'resultado', 'resultados', 'examenes', 'examen',
    'informacion', 'informasion', 'info', 'estacionamiento', 'estasionamiento', 'parqueo',
    'seguro', 'seguros', 'aceptan seguro'];
  for (const kw of FAQ) if (n.includes(kw)) return 'faq';

  const HANDOFF = ['hablar', 'hablame', 'llamar', 'llamame', 'contacto',
    'contactar', 'humano', 'persona', 'alguien', 'atencion', 'atension', 'ayuda',
    'necesito ayuda', 'nesesito ayuda', 'comunicarme', 'komunicarme'];
  for (const kw of HANDOFF) if (n.includes(kw)) return 'handoff';

  const BOOKING = ['agendar', 'ajendar', 'cita', 'sita', 'consulta', 'konsulta', 'turno', 'disponibilidad',
    'apartar', 'reservar', 'reserbar', 'tratamiento', 'procedimiento', 'cirugia', 'sirugia',
    'operacion', 'lunar', 'revision', 'chequeo', 'control',
    'citologia', 'limpieza', 'extraccion', 'muela'];
  for (const kw of BOOKING) if (n.includes(kw)) return 'booking';

  // Date/time patterns → booking
  if (/\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.test(n)) return 'booking';
  if (/\bmanana\b/.test(n) || /\bpasado manana\b/.test(n)) return 'booking';
  if (/\b\d{1,2}\s*(am|pm)\b/.test(n)) return 'booking';

  return null;
}

// ============================================================================
// PROMO SEARCH (Sprint 5 + 5.1 — Promociones del mes con matching escalonado)
// ============================================================================

interface PromoRow {
  id: string;
  title: string;
  description: string;
  conditions: string | null;
  valid_from: string;
  valid_to: string;
  service_type_id: string | null;
  image_url: string | null;
  keywords?: string[];
  is_featured?: boolean;
  related_faq_ids?: string[];
}

/** Normaliza para matching: lowercase + sin acentos + trim. */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sprint 5.1 - Matching escalonado con keywords.
 *
 * Asigna un score a la promo segun cuanto matchea con el mensaje del paciente.
 *   - title (cada palabra >=4 chars que aparece en msg): 3 pts
 *   - keywords (cada keyword que aparece): 2 pts
 *   - service_type name (cada palabra que aparece): 2 pts
 *   - description (palabras distintivas >=5 chars): 0.5 pts
 *
 * Retorna 0 si no hay match. Si paciente pidio genericamente ("promociones",
 * "ofertas") sin nombrar servicio, todas las promos retornan 0 y la funcion
 * caller debe devolver todas (no filtrar).
 */
function scorePromo(
  promo: PromoRow,
  normMessage: string,
  serviceTypeName: string | null,
): number {
  if (!normMessage || normMessage.length < 3) return 0;

  let score = 0;

  // Title
  const titleNorm = normalizeForMatch(promo.title);
  const titleWords = titleNorm.split(/\s+/).filter((w) => w.length >= 4);
  for (const w of titleWords) {
    if (normMessage.includes(w)) score += 3;
  }
  // Tambien match del title completo si es corto
  if (titleNorm.length >= 4 && normMessage.includes(titleNorm)) score += 2;

  // Keywords
  for (const kw of promo.keywords ?? []) {
    const kwNorm = normalizeForMatch(kw);
    if (kwNorm.length >= 3 && normMessage.includes(kwNorm)) score += 2;
  }

  // Service type name
  if (serviceTypeName) {
    const stNorm = normalizeForMatch(serviceTypeName);
    const stWords = stNorm.split(/\s+/).filter((w) => w.length >= 4);
    for (const w of stWords) {
      if (normMessage.includes(w)) score += 2;
    }
  }

  // Description (palabras distintivas)
  const descNorm = normalizeForMatch(promo.description);
  const descWords = descNorm.split(/\s+/).filter((w) => w.length >= 5);
  for (const w of descWords) {
    if (normMessage.includes(w)) score += 0.5;
  }

  return score;
}

/**
 * Detecta si el mensaje es una pregunta GENERICA sobre promociones
 * ("tienen promociones?", "hay ofertas?", "que descuentos hay"). En ese caso
 * el scoring debe ignorar las keywords genericas de promo y retornar TODAS.
 */
function isGenericPromoQuery(normMessage: string): boolean {
  // Palabras "ruido" que NO indican un servicio especifico — solo formulan la
  // pregunta. Si las significativas restantes son cero, es generic.
  const NOISE_WORDS = new Set([
    // Promo keywords genericos
    'promocion', 'promociones', 'promo', 'promos',
    'oferta', 'ofertas',
    'descuento', 'descuentos', 'rebaja', 'rebajas',
    'paquete', 'paquetes', 'combo', 'combos',
    // Question words / verbos auxiliares
    'que', 'cual', 'cuales', 'cuando', 'donde',
    'hay', 'tienen', 'tiene', 'tienes',
    'ofrecen', 'mostrar', 'ver', 'dame', 'dime', 'dale',
    'algo', 'alguna', 'alguno', 'algunos', 'algunas',
    'hoy', 'ahora',
    'este', 'esta', 'estos', 'estas', 'mes',
    'por favor', 'porfa', 'pls',
    // Saludos cortos
    'hola', 'buenas', 'buen', 'dia', 'tardes', 'noches',
    'gracias', 'mira', 'oye',
    'puedes', 'pueden', 'puede',
    'disponible', 'disponibles',
    'actual', 'actuales',
  ]);
  const words = normMessage.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) return true;
  const significantWords = words.filter((w) => !NOISE_WORDS.has(w));
  return significantWords.length === 0;
}

/**
 * Retorna el texto de mencion de la promo destacada del mes para agregar al
 * cierre de otros flujos. Retorna '' si no hay featured activa.
 */
async function getFeaturedPromoCloser(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('promotions')
    .select('title')
    .eq('organization_id', organizationId)
    .eq('is_featured', true)
    .eq('status', 'active')
    .lte('valid_from', today)
    .gte('valid_to', today)
    .maybeSingle();
  if (error || !data) return '';
  return `\n\n${OPT_EMOJI.promociones} _Por cierto, este mes destacamos: *${data.title as string}*. Si le interesa, me dice "promociones"._`;
}

function formatPromoCaption(p: PromoRow): string {
  const validUntil = new Date(p.valid_to + 'T00:00:00').toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'short',
  });
  const conditionsLine = p.conditions ? `\n_⚠️ ${p.conditions}_` : '';
  return `${OPT_EMOJI.promociones} *${p.title}*\n\n${p.description}${conditionsLine}\n\n_Vigente hasta el ${validUntil}_`;
}

/**
 * Envia una promo al paciente.
 *   - Si tiene image_url: descarga de Storage → upload Meta → mensaje multimedia
 *     con la promo como caption. Una sola burbuja en WhatsApp.
 *   - Si no tiene imagen: retorna el texto como BotResponse para que el webhook
 *     lo envie normal.
 *
 * Retorna { multimediaSent: true } si ya envio la imagen directamente — en ese
 * caso el handler debe setear skipDefaultSend en su BotResponse.
 */
/**
 * Sprint 5.1 bug 3 fix: Detecta el MIME real del archivo via magic bytes,
 * ignorando lo que diga el Content-Type/extension. Meta rechaza media con
 * error async 131053 cuando el contenido real no coincide con lo que decia
 * el upload (ej. WebP renombrado a .jpg). Validamos a priori para evitar
 * el envio fallido.
 */
function detectMimeFromMagicBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) return 'image/png';
  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp';
  // GIF: GIF87a o GIF89a
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  return null;
}

async function sendPromoMultimedia(
  promo: PromoRow,
  whatsappLineId: string,
  patientPhone: string,
  organizationId: string,
  supabase: SupabaseClient,
): Promise<{ multimediaSent: boolean; error?: string }> {
  if (!promo.image_url) return { multimediaSent: false };

  // 1. Cargar credenciales de la linea
  const { data: line, error: lineErr } = await supabase
    .from('whatsapp_lines')
    .select('id, provider, meta_phone_number_id, meta_access_token')
    .eq('id', whatsappLineId)
    .single();

  if (lineErr || !line || line.provider !== 'meta' || !line.meta_phone_number_id || !line.meta_access_token) {
    console.warn('[sendPromoMultimedia] no Meta credentials for line; fallback to text');
    return { multimediaSent: false, error: 'no_meta_credentials' };
  }

  // 2. Descargar de Storage bucket promo-images (NO conversation-media)
  const downloaded = await downloadFromStorage(
    supabase as unknown as Parameters<typeof downloadFromStorage>[0],
    promo.image_url,
    'promo-images',
  );
  if (!downloaded) {
    console.warn('[sendPromoMultimedia] download failed from promo-images; fallback to text', { path: promo.image_url });
    return { multimediaSent: false, error: 'download_failed' };
  }

  // 2b. Detectar MIME real (magic bytes) y validar que sea WhatsApp-compatible.
  // Meta rechaza async (error 131053) si el contenido no es JPG/PNG real
  // aunque la extension/MIME del Storage diga otra cosa.
  const realMime = detectMimeFromMagicBytes(downloaded.bytes);
  const allowedForWhatsapp = ['image/jpeg', 'image/png'];
  if (!realMime || !allowedForWhatsapp.includes(realMime)) {
    console.warn('[sendPromoMultimedia] file not WhatsApp-compatible; fallback to text', {
      path: promo.image_url,
      declaredMime: downloaded.mime,
      realMime: realMime ?? 'unknown',
      bytes: downloaded.bytes.length,
    });
    return { multimediaSent: false, error: `incompatible_mime:${realMime ?? 'unknown'}` };
  }
  console.log('[sendPromoMultimedia] downloaded + validated', {
    path: promo.image_url,
    realMime,
    bytes: downloaded.bytes.length,
  });
  // Sobrescribir el mime con el real para upload a Meta
  downloaded.mime = realMime;

  // 3. Upload a Meta → mediaId
  const uploaded = await uploadMetaMedia(
    downloaded.bytes,
    downloaded.mime,
    line.meta_phone_number_id as string,
    line.meta_access_token as string,
  );
  if (!uploaded) {
    console.warn('[sendPromoMultimedia] meta upload failed; fallback to text');
    return { multimediaSent: false, error: 'meta_upload_failed' };
  }

  // 4. POST a messaging-gateway con type=media + mediaId + caption
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET') ?? '';
  const gatewayUrl = `${supabaseUrl}/functions/v1/messaging-gateway`;

  try {
    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({
        to: patientPhone,
        body: formatPromoCaption(promo),
        type: 'generic',
        messageType: 'image',
        mediaId: uploaded.mediaId,
        mediaKind: 'image',
        mediaUrl: promo.image_url,
        mediaMime: downloaded.mime,
        whatsappLineId,
        organizationId,
        source: 'bot',
      }),
    });
    const body = await res.json().catch(() => null) as { ok?: boolean; status?: string; error?: string } | null;
    // Gateway puede retornar HTTP 200 con ok:false cuando el provider rechaza.
    // Sin chequear body.ok teniamos un falso positivo y el bot mandaba solo
    // el segundo mensaje sin la imagen+caption.
    if (!res.ok || !body || body.ok === false || body.status === 'failed') {
      console.error('[sendPromoMultimedia] gateway/provider failed:', res.status, body);
      return { multimediaSent: false, error: 'gateway_or_provider_failed' };
    }
  } catch (e) {
    console.error('[sendPromoMultimedia] gateway exception:', e);
    return { multimediaSent: false, error: 'gateway_exception' };
  }

  return { multimediaSent: true };
}

function noPromosResponse(handoffLabels: { menuOption: string }): BotResponse {
  return {
    message:
      `${OPT_EMOJI.promociones} *Promociones del mes*\n\n` +
      `Por ahora no tenemos promociones activas. Le avisamos cuando lancemos algo nuevo.\n\n` +
      `¿Le ayudo a agendar una consulta?`,
    options: [
      `${OPT_EMOJI.agendar} Agendar cita`,
      handoffLabels.menuOption,
      `${OPT_EMOJI.menu} Menu principal`,
    ],
    requiresInput: true,
    nextState: 'main_menu',
    sessionComplete: false,
  };
}

/**
 * Maneja la peticion "promociones" del paciente.
 *
 * Comportamiento:
 *   - 0 promos: deriva a agendar cita
 *   - 1 promo: envia la promo de una vez (con imagen si tiene)
 *   - N promos: muestra menu breve con titulos numerados; guarda IDs en
 *     session.context.promoIds para que handlePromoBrowse responda a la
 *     seleccion del paciente
 *
 * Si el paciente menciono un servicio (botox, dental, etc.), filtra primero.
 */
async function handlePromoSearch(
  messageText: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string },
): Promise<BotResponse> {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Fetch TODAS las promos activas (no filtramos por service_type aqui;
  //    el scoring se encarga). Incluimos keywords + is_featured.
  const { data: promosData, error } = await supabase
    .from('promotions')
    .select('id, title, description, conditions, valid_from, valid_to, service_type_id, image_url, keywords, is_featured, related_faq_ids')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .lte('valid_from', today)
    .gte('valid_to', today)
    .order('is_featured', { ascending: false })
    .order('valid_to', { ascending: true });

  if (error) {
    console.error('[handlePromoSearch] query failed:', error.message);
    return {
      message: 'Estamos teniendo un problema buscando las promociones. ¿Le derivo a la asistente?',
      options: [handoffLabels.menuOption, `${OPT_EMOJI.menu} Menu principal`],
      requiresInput: true,
      nextState: 'main_menu',
      sessionComplete: false,
    };
  }

  const promos = (promosData ?? []) as PromoRow[];
  if (promos.length === 0) {
    return noPromosResponse(handoffLabels);
  }

  // 2. Cargar nombres de service_types para scoring
  const stIds = Array.from(
    new Set(promos.map((p) => p.service_type_id).filter((x): x is string => !!x)),
  );
  const serviceTypeNames: Record<string, string> = {};
  if (stIds.length > 0) {
    const { data: sts } = await supabase
      .from('service_types')
      .select('id, name')
      .in('id', stIds);
    for (const s of sts ?? []) {
      serviceTypeNames[s.id as string] = s.name as string;
    }
  }

  // 3. Decidir: pregunta generica o especifica
  const normMsg = normalizeForMatch(messageText);
  const isGeneric = isGenericPromoQuery(normMsg);

  let visiblePromos: PromoRow[];
  if (isGeneric) {
    // "promociones?" / "ofertas?" → mostrar todas
    visiblePromos = promos;
  } else {
    // Especifica: scorear y filtrar a las que matchean
    const scored = promos
      .map((p) => ({
        promo: p,
        score: scorePromo(p, normMsg, p.service_type_id ? serviceTypeNames[p.service_type_id] ?? null : null),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      // Paciente preguntó por algo especifico pero no hay match. Le decimos
      // amablemente y derivamos.
      return {
        message:
          `${OPT_EMOJI.promociones} Por ahora no tenemos una promoción específica de eso. ` +
          `Le puedo agendar una consulta o mostrarle el resto de promociones del mes.`,
        options: [
          `${OPT_EMOJI.agendar} Agendar cita`,
          `${OPT_EMOJI.promociones} Ver todas las promociones`,
          handoffLabels.menuOption,
          `${OPT_EMOJI.menu} Menu principal`,
        ],
        requiresInput: true,
        nextState: 'main_menu',
        sessionComplete: false,
      };
    }
    visiblePromos = scored.map((x) => x.promo);
  }

  // 4. 1 sola promo visible → enviar directo (caso comun cuando el paciente
  //    pidio algo especifico que matchea solo una)
  if (visiblePromos.length === 1) {
    return await sendSinglePromo(
      visiblePromos[0],
      session,
      organizationId,
      supabase,
      handoffLabels,
    );
  }

  // 5. N promos: menu breve numerado con SOLO las que matchean
  session.context.promoIds = visiblePromos.map((p) => p.id);
  const titlesList = visiblePromos
    .map((p, idx) => `${idx + 1}. ${p.title}`)
    .join('\n');

  const header = isGeneric
    ? `${OPT_EMOJI.promociones} *Promociones del mes* (${visiblePromos.length})`
    : `${OPT_EMOJI.promociones} Encontré ${visiblePromos.length} promociones que pueden interesarle`;

  return {
    message: `${header}\n\n${titlesList}\n\nResponda con el número de la que le interesa para ver el detalle.`,
    options: [`${OPT_EMOJI.menu} Menu principal`],
    showMenuHint: false,
    requiresInput: true,
    nextState: 'promo_browse',
    sessionComplete: false,
  };
}

/**
 * Busca si alguna FAQ matchea una promo activa via related_faq_ids.
 * Retorna la promo si encuentra match, o null. Usado en handleFAQSearch
 * para hacer override: si la FAQ tiene promo vinculada, respondemos con
 * la promo en lugar de la respuesta normal de la FAQ.
 */
async function findPromoOverridingFAQ(
  faqId: string,
  organizationId: string,
  supabase: SupabaseClient,
): Promise<PromoRow | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('promotions')
    .select('id, title, description, conditions, valid_from, valid_to, service_type_id, image_url, keywords')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .lte('valid_from', today)
    .gte('valid_to', today)
    .contains('related_faq_ids', [faqId])
    .order('is_featured', { ascending: false })
    .order('valid_to', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as PromoRow;
}

/**
 * Envia 1 promo: si tiene imagen va por messaging-gateway directamente
 * con caption; si no, retorna BotResponse de texto. En ambos casos cierra
 * con opciones para seguir el flujo.
 */
async function sendSinglePromo(
  promo: PromoRow,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string },
): Promise<BotResponse> {
  const caption = formatPromoCaption(promo);

  if (promo.image_url) {
    const { multimediaSent } = await sendPromoMultimedia(
      promo,
      session.whatsapp_line_id,
      session.patient_phone,
      organizationId,
      supabase,
    );

    if (multimediaSent) {
      // Mensaje imagen+caption ya enviado. Mandar opciones de continuacion
      // como SEGUNDO mensaje via flujo normal (sin skipDefaultSend) — el
      // webhook envia el menu como texto, que es lo natural.
      return {
        message: `¿Qué le gustaría hacer?`,
        options: [
          `${OPT_EMOJI.agendar} Agendar cita`,
          handoffLabels.menuOption,
          `${OPT_EMOJI.menu} Menu principal`,
        ],
        requiresInput: true,
        nextState: 'main_menu',
        sessionComplete: false,
      };
    }
    // Fallback: la imagen fallo (Meta error/Storage error) → enviar texto solo
    console.warn('[sendSinglePromo] image send failed, falling back to text');
  }

  // Sin imagen o fallback: enviar la promo como texto completo
  return {
    message:
      `${caption}\n\n` +
      `¿Le interesa? Le puedo agendar una cita o derivarlo a la asistente para más detalles.`,
    options: [
      `${OPT_EMOJI.agendar} Agendar cita`,
      handoffLabels.menuOption,
      `${OPT_EMOJI.menu} Menu principal`,
    ],
    requiresInput: true,
    nextState: 'main_menu',
    sessionComplete: false,
  };
}

/**
 * Handler del estado promo_browse: paciente eligio un numero de la lista de
 * promos. Buscamos la promo correspondiente en session.context.promoIds y
 * la enviamos.
 */
async function handlePromoBrowse(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string },
): Promise<BotResponse> {
  const promoIds: string[] = Array.isArray(session.context.promoIds)
    ? session.context.promoIds
    : [];

  const raw = input.trim();
  const norm = raw.toLowerCase();

  // 1. Escape: volver al menú principal
  if (norm === '0' || norm === 'menu' || norm.includes('menu') || norm.includes('volver') || norm === 'salir') {
    delete session.context.promoIds;
    return await handleMainMenu('', session, organizationId, supabase, handoffLabels);
  }

  // 2. Detectar intents distintos a "elegir promo" — el paciente puede pivotar
  //    a otro flow sin quedar atrapado en el menú.
  const hnIntent = detectIntent(raw);
  if (hnIntent.intent === 'reschedule' || hnIntent.intent === 'cancel') {
    delete session.context.promoIds;
    return await startRescheduleFlow(session, organizationId, supabase);
  }
  if (hnIntent.intent === 'handoff' || hnIntent.intent === 'out_of_scope') {
    delete session.context.promoIds;
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
  }

  // 3. Número directo (1-N)
  const num = parseInt(norm, 10);
  if (Number.isFinite(num) && num >= 1 && num <= promoIds.length) {
    const selectedId = promoIds[num - 1];
    const promo = await fetchPromoById(selectedId, organizationId, supabase);
    if (!promo) {
      delete session.context.promoIds;
      return noPromosResponse(handoffLabels);
    }
    delete session.context.promoIds;
    return await sendSinglePromo(promo, session, organizationId, supabase, handoffLabels);
  }

  // 4. Matcheo natural — paciente escribió texto en lugar de número.
  //    "Me interesa la de Botox" → busca match contra titles/keywords/service_type
  //    de las promos en el menú actual. Reusa scorePromo (agnostico al rubro).
  if (raw.length >= 3) {
    const { data: promosData } = await supabase
      .from('promotions')
      .select('id, title, description, conditions, valid_from, valid_to, service_type_id, image_url, keywords')
      .in('id', promoIds);

    const promos = (promosData ?? []) as PromoRow[];

    if (promos.length > 0) {
      // service_type names para scoring
      const stIds = Array.from(
        new Set(promos.map((p) => p.service_type_id).filter((x): x is string => !!x)),
      );
      const serviceTypeNames: Record<string, string> = {};
      if (stIds.length > 0) {
        const { data: sts } = await supabase
          .from('service_types')
          .select('id, name')
          .in('id', stIds);
        for (const s of sts ?? []) serviceTypeNames[s.id as string] = s.name as string;
      }

      const normMsg = normalizeForMatch(raw);
      const scored = promos
        .map((p) => ({
          promo: p,
          score: scorePromo(p, normMsg, p.service_type_id ? serviceTypeNames[p.service_type_id] ?? null : null),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);

      // 4a. Match unico → enviarla
      if (scored.length === 1) {
        delete session.context.promoIds;
        return await sendSinglePromo(scored[0].promo, session, organizationId, supabase, handoffLabels);
      }

      // 4b. Match top con score significativamente mayor → enviar la mejor
      if (scored.length >= 2 && scored[0].score >= scored[1].score * 2) {
        delete session.context.promoIds;
        return await sendSinglePromo(scored[0].promo, session, organizationId, supabase, handoffLabels);
      }

      // 4c. Multiples matches con scores similares → refinar el menú
      if (scored.length >= 2) {
        session.context.promoIds = scored.map((x) => x.promo.id);
        const titlesList = scored
          .map((x, idx) => `${idx + 1}. ${x.promo.title}`)
          .join('\n');
        return {
          message:
            `Encontré ${scored.length} que pueden interesarle:\n\n${titlesList}\n\n` +
            `Responda con el número.`,
          options: [`${OPT_EMOJI.menu} Menu principal`],
          showMenuHint: false,
          requiresInput: true,
          nextState: 'promo_browse',
          sessionComplete: false,
        };
      }
    }
  }

  // 5. Ningún número, ningún match, ningún intent → recordatorio amable
  return {
    message:
      `🤔 No identifiqué cuál promoción le interesa. ` +
      `Puede responder con el número (1-${promoIds.length}) o escriba "menu" para volver.`,
    requiresInput: true,
    nextState: 'promo_browse',
    sessionComplete: false,
  };
}

/**
 * Helper: busca una promo por id en la org. Centraliza el SELECT estandar.
 */
async function fetchPromoById(
  id: string,
  organizationId: string,
  supabase: SupabaseClient,
): Promise<PromoRow | null> {
  const { data, error } = await supabase
    .from('promotions')
    .select('id, title, description, conditions, valid_from, valid_to, service_type_id, image_url, keywords')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();
  if (error || !data) {
    console.error('[fetchPromoById] not found:', error?.message);
    return null;
  }
  return data as PromoRow;
}

async function handleMainMenu(
  input: string,
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
  handoffLabels: { menuOption: string; connecting: string; emoji: string }
): Promise<BotResponse> {
  const normalizedInput = input.trim().toLowerCase();

  // Pre-check con detector hondureno natural (lenguaje libre, typos, preambulos)
  // Solo aplica si NO es un numero (numeros van a las ramas explicitas debajo)
  if (!/^[1-9]$/.test(normalizedInput)) {
    const hnIntent = detectIntent(input);
    if (hnIntent.intent === 'reschedule' || hnIntent.intent === 'cancel') {
      session.context.invalidAttempts = 0;
      return await startRescheduleFlow(session, organizationId, supabase);
    }
    if (hnIntent.intent === 'handoff' || hnIntent.intent === 'out_of_scope') {
      session.context.invalidAttempts = 0;
      return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
    }
    if (hnIntent.intent === 'wrong_number' || hnIntent.intent === 'spam_external_bot') {
      return {
        message: '👍 Anotado, gracias.',
        requiresInput: false,
        nextState: 'completed',
        sessionComplete: true,
      };
    }
    if (hnIntent.intent === 'promo_search') {
      session.context.invalidAttempts = 0;
      return await handlePromoSearch(input, session, organizationId, supabase, handoffLabels);
    }
    // confirm / faq_* / greeting / unknown → caer a la logica viejo (que ya cubre esos casos)
  }

  // Parse input - accept number or text matching
  if (normalizedInput === '1' || (normalizedInput.includes('agendar') || normalizedInput.includes('ajendar')) && !normalizedInput.includes('reagendar') && !normalizedInput.includes('reajendar')) {
    // Start booking flow
    return await startBookingFlow(session, organizationId, supabase);
  }

  if (normalizedInput === '2' || normalizedInput.includes('reagendar') || normalizedInput.includes('reajendar') || normalizedInput.includes('reprogram') || normalizedInput.includes('cancelar') || normalizedInput.includes('canselar')) {
    // Start reschedule/cancel flow
    return await startRescheduleFlow(session, organizationId, supabase);
  }

  if (normalizedInput === '3' || normalizedInput.includes('faq') || normalizedInput.includes('pregunta') || normalizedInput.includes('duda')) {
    delete session.context.lastFaqResult;
    delete session.context.faqNotFoundCount;
    return {
      message: `${OPT_EMOJI.faq} *Preguntas frecuentes*\n\nEscriba su pregunta y buscare la respuesta.`,
      requiresInput: true,
      nextState: 'faq_search',
      sessionComplete: false,
    };
  }

  if (normalizedInput === '4' || normalizedInput.includes('secretar') || normalizedInput.includes('sekretari') || normalizedInput.startsWith('hablar con') || normalizedInput.startsWith('ablar con')) {
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
  }

  if (normalizedInput === '5' || normalizedInput.includes('promocion') || normalizedInput.includes('promociones') || normalizedInput.includes('ofertas')) {
    session.context.invalidAttempts = 0;
    return await handlePromoSearch(input, session, organizationId, supabase, handoffLabels);
  }

  // Recognize greetings — re-show menu friendly instead of "opcion no valida"
  const SALUDOS = ['hola', 'ola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buenas', 'buen dia', 'hey', 'wenas'];
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
        `${OPT_EMOJI.promociones} Ver promociones del mes`,
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
    if (detectedIntent === 'handoff') return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
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
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
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
    if (normalizedInput === '2' || normalizedInput.includes('secretar') || normalizedInput.includes('sekretari') || normalizedInput.includes('hablar con') || normalizedInput.includes('ablar con')) {
      return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
    }
  } else if (lastFaqResult === 'not_found_auto') {
    // Options shown: [1: Si conectar, 2: Menu principal]
    if (normalizedInput === '1' || normalizedInput.includes('si') || normalizedInput.includes('secretar') || normalizedInput.includes('sekretari') || normalizedInput.includes('conectar') || normalizedInput.includes('konectar')) {
      return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
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
        `${OPT_EMOJI.promociones} Ver promociones del mes`,
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
  if (normalizedInput.includes('secretar') || normalizedInput.includes('sekretari') || normalizedInput.includes('hablar con') || normalizedInput.includes('ablar con')) {
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
  }

  // Detect intent for other flows before searching FAQ.
  // E.g. patient says "quiero agendar cita" while in faq_search → redirect to booking.
  const faqDetectedIntent = detectMenuIntent(normalizedInput);
  if (faqDetectedIntent === 'booking') return await startBookingFlow(session, organizationId, supabase);
  if (faqDetectedIntent === 'reschedule') return await startRescheduleFlow(session, organizationId, supabase);
  if (faqDetectedIntent === 'handoff') return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);

  // Get doctor_id and clinic_id from session context if available
  const doctorId = session.context.doctorId;
  const clinicId = session.context.clinicId;

  const faq = await searchFAQ(query, doctorId, clinicId, organizationId, supabase);

  if (faq) {
    session.context.lastFaqResult = 'found';
    session.context.faqNotFoundCount = 0;

    // Sprint 5.1 — Idea 2: si la FAQ esta vinculada a una promo activa,
    // override de la respuesta con la promo.
    const overridingPromo = await findPromoOverridingFAQ(faq.id, organizationId, supabase);
    if (overridingPromo) {
      console.log('[handleFAQSearch] FAQ', faq.id, 'overrideada por promo', overridingPromo.id);
      return await sendSinglePromo(
        overridingPromo,
        session,
        organizationId,
        supabase,
        handoffLabels,
      );
    }

    // Sprint 5.1 — Idea 3: agregar mencion de promo destacada al cierre
    const featuredCloser = await getFeaturedPromoCloser(organizationId, supabase);
    return {
      message: `${OPT_EMOJI.faq} *Respuesta*\n\n*${faq.question}*\n${faq.answer}${featuredCloser}`,
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
  const serviceTypes: Array<{ id?: string; name: string; duration_minutes?: number }> = session.context.lineServiceTypes || [];

  if (serviceTypes.length === 0) {
    return null;
  }

  if (serviceTypes.length === 1) {
    // Auto-select the single type silently
    session.context.selectedServiceType = serviceTypes[0].name;
    session.context.selectedServiceTypeId = serviceTypes[0].id || null;
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
  delete session.context.selectedServiceTypeId;
  delete session.context.selectedServicePrice;
  delete session.context.serviceDurationOverride;
  delete session.context.availableServiceTypes;
  delete session.context.availableDoctors;
  delete session.context.availableWeeks;
  delete session.context.availableDays;
  delete session.context.availableSlots;
  delete session.context.selectedWeek;
  delete session.context.selectedDate;
  delete session.context.selectedTime;
  delete session.context.slotPage;
  delete session.context.cancelConfirmPhase;
  delete session.context.upcomingAppointments;
  // Fase 6 — estado del modo combinado (service-first multi-profesional)
  delete session.context.combinedMode;
  delete session.context.qualifiedDoctors;
  delete session.context.combinedSlotDoctors;

  // Fase 6 — SERVICE-FIRST: si el org tiene servicios configurados, el servicio va
  // primero (el bot calcula los profesionales calificados y auto-asigna). Si NO hay
  // servicios, cae al flujo professional-first legacy (clientes actuales, degradacion).
  const orgServiceTypes: Array<{ id?: string; name: string }> = session.context.lineServiceTypes || [];
  if (orgServiceTypes.length >= 1) {
    return await startServiceFirstFlow(session, organizationId, supabase);
  }

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

// ============================================================================
// Fase 6 — SERVICE-FIRST + disponibilidad combinada + auto-asignacion
// ============================================================================

/**
 * Profesionales que pueden ejecutar un servicio (skill matrix `professional_services`,
 * org-level). Si NINGUNO tiene el skill declarado, devuelve TODOS los doctores del org
 * (degradacion: no bloquea el agendamiento antes de configurar skills). Port directo de
 * `src/lib/combinedAvailability.ts` getQualifiedDoctors para paridad bot/plataforma.
 */
async function getQualifiedDoctorsForService(
  supabase: SupabaseClient,
  organizationId: string,
  serviceTypeId: string,
): Promise<Array<{ id: string; name: string; prefix: string | null }>> {
  const { data: skills } = await supabase
    .from('professional_services')
    .select('doctor_id')
    .eq('organization_id', organizationId)
    .eq('service_type_id', serviceTypeId)
    .eq('is_active', true);

  const skilledIds = (skills || []).map((s: any) => s.doctor_id);

  let query = supabase
    .from('doctors')
    .select('id, name, prefix')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  if (skilledIds.length > 0) query = query.in('id', skilledIds);

  const { data } = await query;
  return (data || []) as Array<{ id: string; name: string; prefix: string | null }>;
}

/** Etiqueta visible de un profesional ("Dra. Lizzy lopez"). */
function doctorDisplayLabel(d: { prefix?: string | null; name: string }): string {
  return `${d.prefix ?? ''} ${d.name}`.trim();
}

/**
 * Paciente "nuevo" para efectos de consulta previa: no existe registro por telefono,
 * o existe pero sin citas no-canceladas en el org.
 */
async function isNewPatient(
  phone: string,
  organizationId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const patient = await findPatientByPhone(phone, organizationId, supabase);
  if (!patient) return true;
  const { count } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('patient_id', patient.id)
    .not('status', 'in', '("cancelada","cancelled","canceled")');
  return (count ?? 0) === 0;
}

/**
 * Primer calendario activo de un doctor (para setear appointments.calendar_id al
 * auto-asignar en modo combinado). null si no tiene.
 */
async function firstActiveCalendarId(
  supabase: SupabaseClient,
  doctorId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('calendar_doctors')
    .select('calendar_id')
    .eq('doctor_id', doctorId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return (data as any)?.calendar_id ?? null;
}

/**
 * Calendario que la LINEA usa para un doctor (whatsapp_line_doctors). Preservar este
 * calendario en el camino single-doctor es CRITICO para no cambiar la disponibilidad de
 * los clientes actuales: el bot legacy computaba slots con el calendario de la linea.
 */
async function lineCalendarForDoctor(
  supabase: SupabaseClient,
  whatsappLineId: string,
  doctorId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('whatsapp_line_doctors')
    .select('calendar_id')
    .eq('whatsapp_line_id', whatsappLineId)
    .eq('doctor_id', doctorId)
    .limit(1)
    .maybeSingle();
  return (data as any)?.calendar_id ?? null;
}

/** Conteo de citas no-canceladas por doctor en una fecha (para auto-asignar al menos cargado). */
async function getDoctorLoadForDate(
  supabase: SupabaseClient,
  organizationId: string,
  date: string,
  doctorIds: string[],
): Promise<Record<string, number>> {
  const load: Record<string, number> = {};
  for (const id of doctorIds) load[id] = 0;
  if (doctorIds.length === 0) return load;

  const { data } = await supabase
    .from('appointments')
    .select('doctor_id')
    .eq('organization_id', organizationId)
    .eq('date', date)
    .in('doctor_id', doctorIds)
    .not('status', 'in', '("cancelada","cancelled","canceled")');

  for (const row of data || []) {
    const id = (row as any).doctor_id;
    load[id] = (load[id] ?? 0) + 1;
  }
  return load;
}

/** Profesional libre menos cargado. Empate → orden recibido (lista ordenada por nombre = determinista). */
function pickLeastLoaded(freeDoctorIds: string[], load: Record<string, number>): string | null {
  if (freeDoctorIds.length === 0) return null;
  let best = freeDoctorIds[0];
  for (const id of freeDoctorIds) {
    if ((load[id] ?? 0) < (load[best] ?? 0)) best = id;
  }
  return best;
}

/** Union de dias disponibles en una semana entre los profesionales calificados. */
async function getCombinedDaysInWeek(
  doctors: Array<{ id: string }>,
  weekStart: string,
  durationMinutes: number,
  supabase: SupabaseClient,
  slotGranularity: number,
  serviceTypeId?: string,
  organizationId?: string,
): Promise<{ date: string; label: string }[]> {
  const merged = new Map<string, string>();
  for (const d of doctors) {
    // calendarId undefined → agrega los calendarios propios del doctor (igual que la plataforma)
    const days = await getAvailableDaysInWeek(
      d.id, weekStart, durationMinutes, supabase, undefined, slotGranularity, serviceTypeId, organizationId,
    );
    for (const day of days) if (!merged.has(day.date)) merged.set(day.date, day.label);
  }
  return [...merged.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, label]) => ({ date, label }));
}

/** Semanas con al menos un dia disponible entre los profesionales calificados. */
async function getCombinedWeeks(
  doctors: Array<{ id: string }>,
  durationMinutes: number,
  supabase: SupabaseClient,
  slotGranularity: number,
  serviceTypeId?: string,
  organizationId?: string,
): Promise<{ weekStart: string; weekLabel: string }[]> {
  const timezone = 'America/Tegucigalpa';
  const now = DateTime.now().setZone(timezone);
  const weeks: { weekStart: string; weekLabel: string }[] = [];
  const MAX_RESULTS = 2;
  const MAX_SCAN = 6;

  for (let i = 0; i < MAX_SCAN && weeks.length < MAX_RESULTS; i++) {
    const weekStart = now.plus({ weeks: i }).startOf('week');
    const weekEnd = weekStart.plus({ days: 6 });
    const days = await getCombinedDaysInWeek(
      doctors, weekStart.toISODate() || '', durationMinutes, supabase, slotGranularity, serviceTypeId, organizationId,
    );
    if (days.length > 0) {
      const label = `Semana del ${weekStart.toFormat('dd MMM', { locale: 'es' })} al ${weekEnd.toFormat('dd MMM', { locale: 'es' })}`;
      weeks.push({ weekStart: weekStart.toISODate() || '', weekLabel: label });
    }
  }
  return weeks;
}

/**
 * Union de slots (HH:mm) de una fecha entre los profesionales calificados, con la lista
 * de profesionales libres en cada hora (para auto-asignar al elegir). Resource-aware via
 * serviceTypeId (Fase 2B).
 */
async function getCombinedSlotsForDate(
  doctors: Array<{ id: string }>,
  date: string,
  durationMinutes: number,
  supabase: SupabaseClient,
  slotGranularity: number,
  serviceTypeId?: string,
  organizationId?: string,
): Promise<Map<string, string[]>> {
  const byTime = new Map<string, string[]>();
  for (const d of doctors) {
    const slots = await getAvailableSlotsForDate(
      d.id, date, durationMinutes, supabase, undefined, slotGranularity, serviceTypeId, organizationId,
    );
    for (const t of slots) {
      if (!byTime.has(t)) byTime.set(t, []);
      byTime.get(t)!.push(d.id);
    }
  }
  return byTime;
}

/**
 * Entrada del flujo service-first. 1 servicio → auto-select silencioso. 2+ → menu de servicios.
 */
async function startServiceFirstFlow(
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
): Promise<BotResponse> {
  const serviceTypes: Array<{ id?: string; name: string; duration_minutes?: number; price?: number; requires_prior_consult?: boolean }> =
    session.context.lineServiceTypes || [];

  // Un solo servicio → auto-select y resolver profesionales (sin paso visible)
  if (serviceTypes.length === 1) {
    session.context.bookingTotalSteps = 4;
    return await resolveServiceAndContinue(serviceTypes[0], session, organizationId, supabase);
  }

  // 2+ servicios → menu
  session.context.availableServiceTypes = serviceTypes;
  session.context.bookingTotalSteps = 5;
  const stepTitle = buildStepTitle(OPT_EMOJI.agendar, 'Agendar cita', 1, 5);
  return {
    message: `${stepTitle}\n\n📋 ¿Que tipo de servicio necesita?`,
    options: serviceTypes.map((st) => st.name),
    requiresInput: true,
    nextState: 'booking_select_service',
    sessionComplete: false,
  };
}

/**
 * Tras elegir el servicio: (1) gating de consulta previa para paciente nuevo;
 * (2) resuelve profesionales calificados → single-doctor o modo combinado; (3) va a semanas.
 */
async function resolveServiceAndContinue(
  service: { id?: string; name: string; duration_minutes?: number; price?: number; requires_prior_consult?: boolean },
  session: BotSession,
  organizationId: string,
  supabase: SupabaseClient,
): Promise<BotResponse> {
  session.context.selectedServiceType = service.name;
  session.context.selectedServiceTypeId = service.id || null;
  session.context.selectedServicePrice = service.price ?? null;
  if (service.duration_minutes) session.context.serviceDurationOverride = service.duration_minutes;

  const connecting = session.context.handoffLabels?.connecting || 'la secretaria';

  // (1) Consulta previa: paciente nuevo + servicio que la requiere → agendar la consulta primero.
  if (service.requires_prior_consult) {
    const isNew = await isNewPatient(session.patient_phone, organizationId, supabase);
    if (isNew) {
      const allServices: Array<{ id?: string; name: string; requires_prior_consult?: boolean }> =
        session.context.lineServiceTypes || [];
      const consultServices = allServices.filter((st) => !st.requires_prior_consult);
      if (consultServices.length === 0) {
        return {
          message: `📋 *${service.name}* requiere una consulta de valoracion previa.\n\nConectando con ${connecting} para coordinarla...`,
          requiresInput: false,
          nextState: 'handoff_secretary',
          sessionComplete: true,
        };
      }
      session.context.availableServiceTypes = consultServices;
      session.context.bookingTotalSteps = consultServices.length >= 2 ? 5 : 4;
      return {
        message: `📋 *${service.name}* requiere una consulta de valoracion previa para pacientes nuevos.\n\nPrimero agendemos su consulta. ¿Cual necesita?`,
        options: consultServices.map((st) => st.name),
        requiresInput: true,
        nextState: 'booking_select_service',
        sessionComplete: false,
      };
    }
  }

  // (2) Profesionales calificados
  const qualified = service.id
    ? await getQualifiedDoctorsForService(supabase, organizationId, service.id)
    : [];

  if (qualified.length === 0) {
    return {
      message: `⚠️ No hay profesionales disponibles para ese servicio.\n\nConectando con ${connecting}...`,
      requiresInput: false,
      nextState: 'handoff_secretary',
      sessionComplete: true,
    };
  }

  if (qualified.length === 1) {
    // Single-doctor: comportamiento normal (sin auto-asignacion combinada).
    // Preferir el calendario de la LINEA (parity exacta con el bot legacy para clientes
    // actuales); fallback al primer calendario activo del doctor (tecnicas no ligadas a linea).
    const d = qualified[0];
    session.context.doctorId = d.id;
    session.context.doctorName = doctorDisplayLabel(d);
    session.context.calendarId =
      (await lineCalendarForDoctor(supabase, session.whatsapp_line_id, d.id))
      ?? (await firstActiveCalendarId(supabase, d.id))
      ?? undefined;
    session.context.combinedMode = false;
    return await handleBookingSelectWeek('', session, organizationId, supabase);
  }

  // (3) Modo combinado: union de disponibilidad + auto-asignacion al elegir hora
  session.context.combinedMode = true;
  session.context.qualifiedDoctors = qualified.map((d) => ({ id: d.id, name: doctorDisplayLabel(d) }));
  delete session.context.doctorId;
  delete session.context.calendarId;
  return await handleBookingSelectWeek('', session, organizationId, supabase);
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
  const serviceTypes: Array<{ id?: string; name: string; duration_minutes?: number }> = session.context.availableServiceTypes || [];
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
  // Fase 6: service-first → resuelve profesionales calificados + consulta previa + auto-asignacion.
  return await resolveServiceAndContinue(selected, session, organizationId, supabase);
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

  // Get available weeks — Fase 6: en modo combinado, union entre profesionales calificados.
  const weeks = session.context.combinedMode
    ? await getCombinedWeeks(session.context.qualifiedDoctors || [], durationMinutes, supabase, slotGranularity, session.context.selectedServiceTypeId, session.context.organizationId)
    : await getAvailableWeeks(session.context.doctorId, durationMinutes, supabase, session.context.calendarId, slotGranularity, session.context.selectedServiceTypeId, session.context.organizationId);

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

  // En combinado no hay doctor fijo aun (se auto-asigna al elegir hora).
  const weekFor = session.context.combinedMode ? '' : ` con ${session.context.doctorName}`;

  return {
    message: `${stepTitle}\n\nSeleccione la semana para su cita${weekFor}:\n👉 Escriba el numero`,
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

  // "esta semana" / "proxima semana" / "siguiente semana"
  if (/\besta\s+semana\b/.test(n)) return now.startOf('week');
  if (/\b(proxima|siguiente)\s+semana\b/.test(n)) return now.plus({ weeks: 1 }).startOf('week');

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
    ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
    jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
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

  // "semana del DD [de] MES" — e.g., "semana del 6 de abril", "semana del 30 mar"
  const semanaMatch = n.match(/semana\s+del\s+(\d{1,2})(?:\s+de)?\s+(\w+)/);
  if (semanaMatch) {
    const day = parseInt(semanaMatch[1]);
    const month = monthNames[semanaMatch[2]];
    if (month && day >= 1 && day <= 31) {
      let dt = DateTime.fromObject({ year: now.year, month, day }, { zone: tz });
      if (dt < now.startOf('day')) dt = DateTime.fromObject({ year: now.year + 1, month, day }, { zone: tz });
      if (dt.isValid) return dt;
    }
  }

  // "DD MES" sin "de" — e.g., "30 mar", "5 abr", "13 abril"
  const bareDateMatch = n.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (bareDateMatch) {
    const day = parseInt(bareDateMatch[1]);
    const month = monthNames[bareDateMatch[2]];
    if (month && day >= 1 && day <= 31) {
      let dt = DateTime.fromObject({ year: now.year, month, day }, { zone: tz });
      if (dt < now.startOf('day')) dt = DateTime.fromObject({ year: now.year + 1, month, day }, { zone: tz });
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

  // "las 3" / "a las 3" / "a las 3:30" (assume PM if hour < 7 — clinicas no tienen slots de noche)
  const las = n.match(/(?:a\s+)?las\s+(\d{1,2})(?::(\d{2}))?/);
  if (las) {
    let hour = parseInt(las[1]);
    const min = las[2] ? parseInt(las[2]) : 0;
    if (hour < 7) hour += 12;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

  // "8:15" / "08:15" / "14:30" — hora literal sin "las" ni am/pm.
  // Caso real: Jennyfer (Consultorio Familiar, 14-May 2026) escribio "8:15"
  // para seleccionar slot literal del menu.
  // Convencion OrionCare: clinicas NO tienen slots despues de ~18:00.
  //   1-6 → +12 → 13:00-18:00 (tarde clinica)
  //   7   → 07:00 (apertura temprana AM)
  //   8-12 → tal cual (manana / mediodia)
  //   13-23 → tal cual (formato 24h literal)
  const hhmm = n.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    let hour = parseInt(hhmm[1]);
    const min = parseInt(hhmm[2]);
    if (hour < 24 && min < 60) {
      if (hour < 7) hour += 12;
      return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    }
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
  // Fase 6: en modo combinado, union de dias entre profesionales calificados.
  const days = session.context.combinedMode
    ? await getCombinedDaysInWeek(
        session.context.qualifiedDoctors || [],
        selectedWeek.weekStart,
        durationMins,
        supabase,
        granularity,
        session.context.selectedServiceTypeId,
        session.context.organizationId
      )
    : await getAvailableDaysInWeek(
        session.context.doctorId,
        selectedWeek.weekStart,
        durationMins,
        supabase,
        session.context.calendarId,
        granularity,
        session.context.selectedServiceTypeId,
        session.context.organizationId
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

      // Fase 6 — auto-asignacion: en modo combinado, resolver el profesional menos
      // cargado entre los libres en esta hora. De aqui en adelante el flujo es single-doctor.
      if (session.context.combinedMode) {
        const freeIds: string[] = (session.context.combinedSlotDoctors || {})[selectedTime] || [];
        if (freeIds.length === 0) {
          // El slot quedo sin profesional (race / cache vieja) → refrescar horarios.
          session.context.availableSlots = null;
          return await showHourSlots(session, supabase);
        }
        const load = await getDoctorLoadForDate(supabase, organizationId, session.context.selectedDate, freeIds);
        const assignedId = pickLeastLoaded(freeIds, load) as string;
        const assigned = (session.context.qualifiedDoctors || []).find((d: any) => d.id === assignedId);
        session.context.doctorId = assignedId;
        session.context.doctorName = assigned?.name || 'su profesional';
        session.context.calendarId =
          (await lineCalendarForDoctor(supabase, session.whatsapp_line_id, assignedId))
          ?? (await firstActiveCalendarId(supabase, assignedId))
          ?? undefined;
      }

      // Show confirmation
      const timezone = 'America/Tegucigalpa';
      const selectedDate = DateTime.fromISO(session.context.selectedDate, { zone: timezone });
      const dayLabel = selectedDate.toFormat('EEEE dd MMMM yyyy', { locale: 'es' });

      const confirmTitle = buildStepTitle(OPT_EMOJI.confirmar, 'Confirmar cita', steps.confirmStep, steps.totalSteps);

      const serviceTypeLine = session.context.selectedServiceType ? `\n📋 ${session.context.selectedServiceType}` : '';
      // Fase 6 — precio pre-establecido del servicio (si esta configurado).
      const priceVal = session.context.selectedServicePrice;
      const priceLine = (priceVal !== null && priceVal !== undefined)
        ? `\n💵 Lps. ${Number(priceVal).toLocaleString('es-HN')}`
        : '';

      return {
        message: `${confirmTitle}\n\n🩺 ${session.context.doctorName}${serviceTypeLine}${priceLine}\n${OPT_EMOJI.agendar} ${dayLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(selectedTime)}\n⏱️ ${session.context.durationMinutes} min`,
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

  let result: { slots: string[]; hasMore: boolean };
  if (session.context.combinedMode) {
    // Fase 6: union de horas entre profesionales calificados + libres por hora (auto-asignacion).
    const byTime = await getCombinedSlotsForDate(
      session.context.qualifiedDoctors || [],
      session.context.selectedDate,
      durationMinutes,
      supabase,
      slotGranularity,
      session.context.selectedServiceTypeId,
      session.context.organizationId
    );
    // Persistir libres-por-hora para resolver el profesional al confirmar el slot.
    const freeByTime: Record<string, string[]> = {};
    for (const [t, ids] of byTime.entries()) freeByTime[t] = ids;
    session.context.combinedSlotDoctors = freeByTime;

    const allTimes = [...byTime.keys()].sort((a, b) => a.localeCompare(b));
    const startIdx = (page - 1) * PAGE_SIZE;
    result = {
      slots: allTimes.slice(startIdx, startIdx + PAGE_SIZE),
      hasMore: startIdx + PAGE_SIZE < allTimes.length,
    };
  } else {
    result = await getAvailableHoursForDate(
      session.context.doctorId,
      session.context.selectedDate,
      durationMinutes,
      page,
      PAGE_SIZE,
      supabase,
      session.context.calendarId,
      slotGranularity,
      session.context.selectedServiceTypeId,
      session.context.organizationId
    );
  }

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

  // En combinado el profesional se auto-asigna al elegir hora → no se muestra aun.
  const hourSubtitle = session.context.combinedMode ? '' : `\n${session.context.doctorName}`;

  return {
    message: `${stepTitle}\n\n${OPT_EMOJI.horarios} Horarios disponibles — *${dayLabel}*${hourSubtitle}`,
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
  if (selection === 1 || normalizedInput.includes('si') || normalizedInput.includes('sí') || normalizedInput.includes('confirmar') || normalizedInput.includes('konfirmar') || normalizedInput.includes('confirmo')) {
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
  if (selection === 3 || normalizedInput.includes('cancelar') || normalizedInput.includes('canselar')) {
    return {
      message: `${OPT_EMOJI.cancelar} Proceso cancelado.\n\n¿En que puedo ayudarle?`,
      options: [
        `${OPT_EMOJI.agendar} Agendar cita`,
        `${OPT_EMOJI.reagendar} Reagendar o cancelar cita`,
        `${OPT_EMOJI.faq} Preguntas frecuentes`,
        handoffLabels.menuOption,
        `${OPT_EMOJI.promociones} Ver promociones del mes`,
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
    session.context.slotGranularity || Math.min(checkDuration, 30),
    session.context.selectedServiceTypeId,
    session.context.organizationId
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

  // selectedTime llega como 'HH:mm' (ver getAvailableSlotsForDate). Normalizar a
  // 'HH:MM:SS' y agregar offset Honduras (-06:00, sin DST) al construir appointment_at
  // — Postgres timestamptz asume UTC si el string no trae offset.
  const normalizedTime = /^\d{2}:\d{2}$/.test(session.context.selectedTime)
    ? `${session.context.selectedTime}:00`
    : session.context.selectedTime;
  const appointmentAt = `${session.context.selectedDate}T${normalizedTime}-06:00`;

  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .insert({
      doctor_id: session.context.doctorId,
      patient_id: patient.id,
      date: session.context.selectedDate,
      time: normalizedTime,
      appointment_at: appointmentAt,
      duration_minutes: session.context.durationMinutes || 60,
      status: 'agendada',
      organization_id: organizationId,
      notes: appointmentNotes,
      service_type: session.context.selectedServiceType || null,
      service_type_id: session.context.selectedServiceTypeId || null,
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

  // Sprint 5.1 — Idea 3: cierre con promo destacada (si hay)
  const featuredCloser = await getFeaturedPromoCloser(organizationId, supabase);

  return {
    message: `${successEmoji} *${successTitle}*\n\n🩺 ${session.context.doctorName}${serviceTypeLine}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(session.context.selectedTime)}\n⏱️ ${session.context.durationMinutes} min\n\nRecibira un recordatorio antes de su cita.${featuredCloser}`,
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
    serviceTypeId: apt.service_type_id || null,
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

    // Guard: si el input contiene keywords de reagendar/reprogram, NO procesar como
    // confirmación de cancelación. Previene cancelación accidental cuando el paciente
    // escribe "1. Reagendar" y parseInt parsea el "1" como "Sí, cancelar".
    const hasReagendarIntent = /reagendar|reajendar|reprogram/.test(normalizedInput);

    if (!hasReagendarIntent) {
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
    // hasReagendarIntent = true → fall through to Phase 1 (reagendar flow below)
  }

  // PHASE 1: Action selection [Reagendar, Cancelar, Volver]

  // Option 1: Reagendar - start new booking flow for same doctor
  if (selection === 1 || normalizedInput.includes('reagendar') || normalizedInput.includes('reajendar') || normalizedInput.includes('reprogram')) {
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
    // Clean stale booking context to prevent "Paso 5/4" bug
    delete session.context.availableDoctors;
    delete session.context.availableServiceTypes;
    // Fase 6: el reschedule SIEMPRE es single-doctor (mismo doctor de la cita) → limpiar combinado.
    delete session.context.combinedMode;
    delete session.context.qualifiedDoctors;
    delete session.context.combinedSlotDoctors;
    delete session.context.selectedServicePrice;
    session.context.bookingTotalSteps = 4; // Reschedule always 4 steps (doctor already selected)

    // Carry over service type from original appointment
    if (selectedApt?.serviceType) {
      session.context.selectedServiceType = selectedApt.serviceType;
    }
    if (selectedApt?.serviceTypeId) {
      session.context.selectedServiceTypeId = selectedApt.serviceTypeId;
    }

    // Go to week selection (reuse booking flow)
    const weeks = await getAvailableWeeks(session.context.doctorId, session.context.durationMinutes, supabase, session.context.calendarId, session.context.slotGranularity, session.context.selectedServiceTypeId, session.context.organizationId);

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
  if (selection === 2 || normalizedInput.includes('cancelar') || normalizedInput.includes('canselar')) {
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
        `${OPT_EMOJI.promociones} Ver promociones del mes`,
      ],
      showMenuHint: false,
      requiresInput: true,
      nextState: 'main_menu',
      sessionComplete: false,
    };
  }

  // Antes de fallar como invalid, intentar detectar intent natural (texto libre hondureno)
  const hnIntent = detectIntent(input);

  // Confirmacion explicita ("ahi estare", "confirmo") en phase 1 → mantener la cita y salir
  if (hnIntent.intent === 'confirm') {
    return {
      message: `${OPT_EMOJI.agendar} ¡Perfecto! Su cita queda como esta.\n\n¡Le esperamos!`,
      requiresInput: false,
      nextState: 'completed',
      sessionComplete: true,
    };
  }

  // "No puedo asistir" / razon humana → reagendar (mismo handler con selection=1)
  if (hnIntent.intent === 'reschedule') {
    return await handleCancelConfirm('1', session, organizationId, supabase, handoffLabels);
  }

  // "Cancelar" en texto libre → mover a phase 2 (mismo handler con selection=2)
  if (hnIntent.intent === 'cancel') {
    return await handleCancelConfirm('2', session, organizationId, supabase, handoffLabels);
  }

  // Handoff explicito
  if (hnIntent.intent === 'handoff') {
    return await handleHandoffToSecretary(session.whatsapp_line_id, session.patient_phone, organizationId, supabase, handoffLabels, session.context, session.id);
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
  sessionContext?: Record<string, any>,
  sessionId?: string,
): Promise<BotResponse> {
  const emoji = handoffLabels?.emoji || '\ud83d\udc69\ud83c\udffb\u200d\ud83d\udcbc';
  const connecting = handoffLabels?.connecting || 'la secretaria';

  // Dedupe: si en los ultimos 5min ya hubo handoff_secretary para esta session,
  // responder al paciente con confirmacion explicita sin volver a notificar al target.
  // Caso real: Sury (Medilaser, 14-May) escalo 3 veces a Marleny en 2 min.
  if (sessionId) {
    const dedupeCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentHandoff } = await supabase
      .from('bot_conversation_logs')
      .select('id')
      .eq('session_id', sessionId)
      .eq('state_after', 'handoff_secretary')
      .gte('created_at', dedupeCutoff)
      .limit(1)
      .maybeSingle();

    if (recentHandoff) {
      console.log('[bot-handler] Handoff dedup hit, skipping notification. Session:', sessionId);
      return {
        message: `\u2705 Su caso ya fue escalado a ${connecting}. Dentro de poco se estara comunicando con usted. Muchas gracias por su paciencia.`,
        requiresInput: false,
        nextState: 'handoff_secretary',
        sessionComplete: true,
      };
    }
  }

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

    const threshold = faq.min_match_score ?? 1.0;
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  if (bestMatch) {
    console.log('[searchFAQ] Best match:', bestMatch.question, '| Score:', bestScore, '| Threshold:', bestMatch.min_match_score ?? 1.0);
  } else {
    const queryWords = normalizedQuery.split(/\s+/);
    console.log('[searchFAQ] No match (or all below threshold) | Query words:', queryWords);
  }

  return bestMatch;
}

async function getAvailableWeeks(
  doctorId: string,
  durationMinutes: number,
  supabase: SupabaseClient,
  calendarId?: string,
  slotGranularity?: number,
  serviceTypeId?: string,
  organizationId?: string
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
      granularity,
      serviceTypeId,
      organizationId
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
  slotGranularity: number = 30,
  serviceTypeId?: string,
  organizationId?: string
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
    const slots = await getAvailableSlotsForDate(doctorId, dateStr, durationMinutes, supabase, calendarId, slotGranularity, serviceTypeId, organizationId);

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
  slotGranularity: number = 30,
  serviceTypeId?: string,
  organizationId?: string
): Promise<{ slots: string[]; hasMore: boolean; totalSlots: number }> {
  const allSlots = await getAvailableSlotsForDate(doctorId, date, durationMinutes, supabase, calendarId, slotGranularity, serviceTypeId, organizationId);
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
 * Calcula slots disponibles para una fecha. Fase 2: delega en el motor unico
 * `_shared/availability.ts` (antes era una copia del algoritmo de get-available-slots).
 * Se mantiene esta firma posicional para no tocar a los llamadores del bot.
 */
async function getAvailableSlotsForDate(
  doctorId: string,
  date: string,
  durationMinutes: number,
  supabase: SupabaseClient,
  calendarId?: string,
  slotGranularity: number = 30,
  serviceTypeId?: string,
  organizationId?: string
): Promise<string[]> {
  return await computeAvailableSlots(supabase, {
    doctorId,
    date,
    durationMinutes,
    calendarId,
    slotGranularity,
    serviceTypeId,
    organizationId,
  });
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

/**
 * Confirma una cita inminente cuando el paciente escribio texto libre con intent
 * 'confirm' (ej. "Confirmo", "Ahi estare"). Replica el camino feliz del boton
 * "Si, ahi estare" del recordatorio_24h. Idempotente: si la cita ya esta confirmada,
 * solo responde el ack visual.
 */
async function confirmAppointmentFromText(
  appointment: any,
  supabase: SupabaseClient,
): Promise<BotResponse> {
  if (appointment.status !== 'confirmada' && appointment.status !== 'confirmed') {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmada' })
      .eq('id', appointment.id);
    if (error) {
      console.error('[bot-handler] confirmAppointmentFromText UPDATE error:', error);
    } else {
      console.log('[bot-handler] Appointment confirmed via free text:', appointment.id);
    }
  }
  const doctor = appointment.doctors as any;
  const doctorName = doctor ? `${doctor.prefix} ${doctor.name}` : 'el doctor';
  const dateLabel = DateTime.fromISO(appointment.date, { zone: 'America/Tegucigalpa' })
    .toFormat("EEEE dd 'de' MMMM", { locale: 'es' });
  return {
    message: `✅ *Cita confirmada*\n\n🩺 ${doctorName}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(appointment.time)}\n\n¡Le esperamos!`,
    requiresInput: false,
    nextState: 'completed',
    sessionComplete: true,
    showMenuHint: false,
  };
}

/**
 * Entra al prompt destructivo de cancel_confirm (phase 2) cuando el paciente escribio
 * texto libre con intent 'cancel'. Replica el patron del booking_* + "cancelar" durante
 * reschedule (linea 271-297). El UPDATE a status='cancelada' ocurre cuando el paciente
 * responde "Si, cancelar cita" en handleCancelConfirm.
 */
async function startDestructiveCancelFromText(
  appointment: any,
  session: BotSession,
): Promise<BotResponse> {
  const doctor = appointment.doctors as any;
  const doctorName = doctor ? `${doctor.prefix} ${doctor.name}` : 'el doctor';
  const dateLabel = DateTime.fromISO(appointment.date, { zone: 'America/Tegucigalpa' })
    .toFormat("EEEE dd 'de' MMMM yyyy", { locale: 'es' });
  session.context.rescheduleAppointmentId = appointment.id;
  session.context.rescheduleAppointmentDate = appointment.date;
  session.context.rescheduleAppointmentTime = appointment.time;
  session.context.rescheduleAppointmentDoctorName = doctorName;
  session.context.cancelConfirmPhase = 'confirm_delete';
  session.context.isReschedule = true;
  return {
    message: `⚠️ ¿Esta seguro que desea *cancelar* su cita?\n\n🩺 ${doctorName}\n${OPT_EMOJI.agendar} ${dateLabel}\n${OPT_EMOJI.horarios} ${formatTimeForTemplate(appointment.time)}\n\n_Esta accion no se puede deshacer._`,
    options: [`${OPT_EMOJI.cancelar} Si, cancelar cita`, `${OPT_EMOJI.volver} No, volver`],
    requiresInput: true,
    nextState: 'cancel_confirm',
    sessionComplete: false,
  };
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
      id, date, time, status, notes, duration_minutes, service_type, service_type_id,
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

function detectSessionIntent(
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
