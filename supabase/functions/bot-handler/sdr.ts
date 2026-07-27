/**
 * Capa SDR del bot — LLM entiende/redacta, la máquina de estados decide.
 * Fase 2b (plan: .claude/plans/atomic-sauteeing-hummingbird.md).
 *
 * Integración por inyección de dependencias: index.ts pasa sus funciones
 * internas (parseDateHint, resolveServiceAndContinue, etc.) en `deps` — evita
 * import circular y deja el flujo clásico 100% intacto.
 *
 * Invariantes:
 * - Inerte con whatsapp_lines.sdr_mode_enabled=false (default de todas las líneas).
 * - El LLM jamás calcula fechas (parseDateHint resuelve) ni inventa horarios
 *   (slots del motor real + checkTimeGuard) ni precios (checkPriceGuard).
 * - Todo fallo (LLM caído, presupuesto excedido, JSON inválido) → return null
 *   = el flujo clásico de menús responde. El bot NUNCA queda mudo.
 * - La cita se crea por el camino clásico (booking_confirm → createAppointment
 *   WithPatient): validación de slot, paciente, ask_name — sin cambios.
 * - Handoff SILENCIOSO (decisión Diego 24 Jul, org con Coexistence): TODO
 *   handoff (brecha de conocimiento, pedido explícito de humano, caso médico
 *   delicado, guard bloqueado) es silencioso hacia el paciente — el humano
 *   ya ve la conversación en su propio WhatsApp vía Coexistence y puede
 *   intervenir sin que se note que "algo más" (el bot) estaba hablando. La
 *   notificación INTERNA a doctor/secretaria (con su dedupe de 5 min) sigue
 *   disparando igual — solo se suprime el mensaje al paciente. Ver
 *   `silentHandoff()`. Brechas de conocimiento reales (no pedidos de humano
 *   ni gestión de cita) quedan registradas en `bot_faq_proposals` para
 *   revisión posterior — ver `registerFaqProposal()`.
 */

import {
  callLLM,
  estimateCostUsd,
  logLLMCall,
  type LLMProvider,
  type LLMResult,
} from "../_shared/llm.ts";
import {
  buildSdrContext,
  buildSdrSystemPrompt,
  parseSdrOutput,
  type SdrContext,
  type SdrLLMOutput,
} from "../_shared/sdr-prompt.ts";
import { checkPriceGuard, checkTimeGuard } from "../_shared/sdr-guards.ts";
import { formatTimeForTemplate } from "../_shared/datetime.ts";
import { isConditionalSi, normalizeTypos } from "../_shared/honduras-intents.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

const SDR_PRIMARY: { provider: LLMProvider; model: string } = {
  provider: "gemini",
  model: "gemini-3.5-flash-lite",
};
const SDR_FALLBACK: { provider: LLMProvider; model: string } = {
  provider: "anthropic",
  model: "claude-haiku-4-5",
};
const MAX_HISTORY = 8;
const MAX_LLM_TOKENS = 600;
const BUDGET_RECHECK_MS = 10 * 60 * 1000;
const SLOT_SCAN_DAYS = 6;
const TIMEZONE = "America/Tegucigalpa";

// deno-lint-ignore no-explicit-any
type Any = any;

/** Subconjunto de BotResponse que produce esta capa (compatible con index.ts). */
interface SdrBotResponse {
  message: string;
  options?: string[];
  showMenuHint?: boolean;
  requiresInput: boolean;
  nextState: string;
  sessionComplete: boolean;
  skipDefaultSend?: boolean;
}

/** Funciones internas de index.ts inyectadas para reuso sin import circular. */
export interface SdrDeps {
  parseDateHint: (input: string) => Any | null;
  parseTimeHint: (input: string) => string | null;
  fuzzyMatchOption: (input: string, options: string[]) => number | null;
  resolveServiceAndContinue: (service: Any, session: Any, organizationId: string, supabase: Any) => Promise<Any>;
  getCombinedSlotsForDate: (qualifiedDoctors: Any[], date: string, duration: number, supabase: Any, granularity: number, serviceTypeId: Any, organizationId: Any) => Promise<Map<string, string[]>>;
  getAvailableSlotsForDate: (doctorId: Any, date: string, duration: number, supabase: Any, calendarId: Any, granularity: number, serviceTypeId: Any, organizationId: Any) => Promise<string[]>;
  getDoctorLoadForDate: (supabase: Any, organizationId: string, date: string, ids: string[]) => Promise<Any>;
  pickLeastLoaded: (ids: string[], load: Any) => string | null;
  lineCalendarForDoctor: (supabase: Any, lineId: string, doctorId: string) => Promise<string | null>;
  firstActiveCalendarId: (supabase: Any, doctorId: string) => Promise<string | null>;
  handleHandoffToSecretary: (lineId: string, phone: string, organizationId: string, supabase: Any, handoffLabels: Any, context: Any, sessionId: string) => Promise<Any>;
  handleGreeting: (session: Any, organizationId: string, supabase: Any, handoffLabels: Any, messageText: string) => Promise<Any>;
  handleBookingConfirm: (input: string, session: Any, organizationId: string, supabase: Any, handoffLabels: Any) => Promise<Any>;
  detectIntent: (text: string) => { intent: string; confidence: string };
  findPatientByPhone: (phone: string, organizationId: string, supabase: Any) => Promise<Any | null>;
  getPatientUpcomingAppointments: (patientId: string, organizationId: string, supabase: Any) => Promise<Any[]>;
  confirmAppointmentFromText: (appointment: Any, supabase: Any) => Promise<Any>;
}

interface SdrArgs {
  session: Any;
  messageText: string;
  whatsappLineId: string;
  patientPhone: string;
  organizationId: string;
  supabase: Any;
  handoffLabels: Any;
  deps: SdrDeps;
}

// ============================================================================
// ROUTER
// ============================================================================

/**
 * Devuelve la respuesta SDR, o null para que el flujo clásico continúe.
 * Llamar desde handleBotMessage ANTES del switch de estados.
 */
export async function maybeHandleSdr(args: SdrArgs): Promise<SdrBotResponse | null> {
  const { session, messageText, organizationId, supabase } = args;
  if (!session.context.sdrModeEnabled) return null;

  const state = session.state as string;
  const inSdrState = state === "sdr_chat" || state === "sdr_booking";
  const isEntryState = state === "greeting" || state === "main_menu" ||
    state === "completed" || state === "expired";
  const isSdrConfirm = state === "booking_confirm" && session.context.sdrActive === true;
  if (!inSdrState && !isEntryState && !isSdrConfirm) return null;

  const trimmed = messageText.trim();
  // Números puros en estados de menú = navegación clásica (coexistencia total).
  if (isEntryState && /^\d+$/.test(trimmed)) return null;

  // booking_confirm en sesión SDR: entender texto libre sin romper el clásico.
  if (isSdrConfirm) {
    const lower = trimmed.toLowerCase();
    const normalized = normalizeTypos(trimmed);
    // "si"/"sí" (WhatsApp casi nunca tilda, quedan indistinguibles) solo cuenta
    // como confirmación cuando NO es el "si" condicional de una frase como "si
    // tiene espacio el jueves" — sin esto, esa frase se leía como "confirmo".
    const bareSi = /\bs[ií]\b/.test(lower) && !isConditionalSi(normalized);
    const classicMatch = /^[123]$/.test(trimmed) ||
      bareSi || /confirm|cambiar|cancelar|canselar/.test(lower);
    if (classicMatch) return null; // el handler clásico ya lo entiende
    const di = args.deps.detectIntent(messageText);
    if (di.intent === "confirm") {
      return await args.deps.handleBookingConfirm("si", session, organizationId, supabase, args.handoffLabels);
    }
    if (di.intent === "cancel") {
      return await args.deps.handleBookingConfirm("cancelar", session, organizationId, supabase, args.handoffLabels);
    }
    // Rechaza la cita pendiente y da (o cambia a) otro día/hora — ej. "mejor
    // no, para el proximo lunes tiene espacio?". Sin esto, el LLM no tiene los
    // horarios reales de ese día y si inventa uno el guard lo bloquea, cayendo
    // al clásico con "Opción no válida" sin salida real (bug real 27 Jul).
    const dateHint = args.deps.parseDateHint(messageText);
    if (dateHint) {
      const ctx = await getSdrCtx(args);
      if (ctx) {
        clearBookingContext(session);
        const preferredTime = args.deps.parseTimeHint(messageText);
        return await offerSlotsForDate(args, ctx, dateHint.toISODate(), null, preferredTime);
      }
    }
    // Pregunta/otro a mitad de confirmación → responder y re-preguntar (LLM).
    if (!(await underLlmBudget(session, organizationId, supabase))) return null;
    return await handleSdrConfirmQuestion(args);
  }

  // Sesión terminada que revive (ej. "gracias" post-cita): limpiar contexto de
  // booking, historial e interés. Sin esto, el historial le filtra al LLM datos
  // viejos ("lunes") y un simple "gracias" re-dispara agendamiento (visto en QA).
  if (state === "completed" || state === "expired") {
    const justBooked = !!session.context.selectedTime;
    clearBookingContext(session);
    delete session.context.sdrHistory;
    delete session.context.sdrInterestServiceId;
    if (justBooked) {
      // Nota sintética (no se envía): el LLM sabe que la cita quedó, sin
      // arrastrar fechas/horas que puedan re-disparar un agendamiento.
      session.context.sdrHistory = [{
        role: "assistant",
        content: "(La cita del paciente acaba de quedar agendada y confirmada. Si solo agradece o se despide, respondé breve y cálido — sin ofrecer agendar de nuevo.)",
      }];
    }
  }

  if (!(await underLlmBudget(session, organizationId, supabase))) {
    console.warn("[sdr] LLM budget exceeded for org", organizationId, "— falling back to classic flow");
    return null;
  }

  session.context.sdrActive = true;
  try {
    if (state === "sdr_booking") return await handleSdrBooking(args, null);
    return await handleSdrChat(args);
  } catch (e) {
    console.error("[sdr] Unexpected error, falling back to classic flow:", e);
    return null;
  }
}

/** Limpia todo rastro de un agendamiento previo (anti cita duplicada). */
function clearBookingContext(session: Any): void {
  delete session.context.sdrBookingSetup;
  delete session.context.sdrOfferedSlots;
  delete session.context.sdrOfferedDayLabel;
  delete session.context.selectedDate;
  delete session.context.selectedTime;
  delete session.context.availableSlots;
  delete session.context.combinedSlotDoctors;
}

/** Pregunta del paciente a mitad de booking_confirm: responder + re-preguntar. */
async function handleSdrConfirmQuestion(args: SdrArgs): Promise<SdrBotResponse | null> {
  const { session, messageText } = args;
  const ctx = await getSdrCtx(args);
  if (!ctx) return null;

  const pending = `${session.context.selectedServiceType ?? "su cita"} — ${session.context.sdrOfferedDayLabel ?? session.context.selectedDate} a las ${formatTimeForTemplate(session.context.selectedTime ?? "")}`;
  const system = buildSdrSystemPrompt(ctx);
  const messages = [...historyOf(session), {
    role: "user" as const,
    content: `${messageText}\n\n[PLATAFORMA] El paciente está a UN PASO de confirmar esta cita: ${pending}. Respondé su mensaje y terminá preguntando de nuevo, con naturalidad, si le confirmás la cita.`,
  }];
  const out = await callSdrLLM(args, system, messages);
  if (!out) return null;

  const price = checkPriceGuard(out.reply, allowedPricesFor(ctx, session.context.selectedServiceTypeId));
  const time = checkTimeGuard(out.reply, [session.context.selectedTime].filter(Boolean));
  if (!price.ok || !time.ok) return null; // clásico re-pregunta (feo pero seguro)

  pushHistory(session, messageText, out.reply);
  return { message: out.reply, requiresInput: true, nextState: "booking_confirm", sessionComplete: false, showMenuHint: false };
}

// ============================================================================
// CHAT (estado sdr_chat + entrada desde greeting/main_menu)
// ============================================================================

async function handleSdrChat(args: SdrArgs): Promise<SdrBotResponse | null> {
  const { session, messageText, organizationId, supabase, deps } = args;

  // ctx y la cita existente (si tiene) se resuelven en paralelo — la cita se
  // le pasa a la PRIMERA llamada para que, si el intent resulta gestion_cita,
  // el `out.reply` de ESTA MISMA llamada ya sirva sin gastar una 2da llamada
  // solo para redactar el reconocimiento (ahorro de costo, Diego 27 Jul).
  const [ctx, apt] = await Promise.all([getSdrCtx(args), getUpcomingAppointmentForSession(args)]);
  if (!ctx) return null;

  const system = buildSdrSystemPrompt(ctx, apt ? { existingAppointment: existingApptPromptData(apt) } : undefined);
  const messages = [...historyOf(session), { role: "user" as const, content: messageText }];
  const out = await callSdrLLM(args, system, messages);
  if (!out) return null;

  // Guard de precios: siempre. (El de horarios solo aplica en booking — las FAQs
  // pueden mencionar horas legítimas, ej. "atendemos desde las 9:00 AM".)
  // Acotado al servicio en foco este turno (identificado por el LLM, o el de
  // la cita existente si es gestión de cita) — sin servicio claro, catálogo
  // completo (preguntas tipo "qué servicios ofrecen" mencionan varios precios).
  const focusServiceId = out.service_id ?? apt?.service_type_id ?? session.context.sdrInterestServiceId ?? null;
  const price = checkPriceGuard(out.reply, allowedPricesFor(ctx, focusServiceId));
  if (!price.ok) return await guardBlockedHandoff(args, out, price.violations);

  // Gestión de cita existente (confirmar/reagendar/cancelar) — conversacional
  // (Fase 3): handleGestionCita resuelve lo que puede y devuelve null para los
  // casos que aún deben caer al clásico (sin paciente, sin cita, u "aviso"
  // ambiguo que no es confirm/reschedule/cancel claro).
  if (out.intent === "gestion_cita") {
    const gestionResp = await handleGestionCita(args, apt, out);
    if (gestionResp) return gestionResp;
    // Con cita existente pero sin acción clara (ej. "para cuándo es mi
    // cita?") el LLM ya respondió informado por existingApptBlock — usar ESE
    // reply en vez de caer al clásico: detectMenuIntent (honduras-intents no
    // relacionado) bucketea la frase literal "cuando es mi cita" junto con
    // "reagendar"/"cancelar", y handleGreeting abría el menú de reagendar
    // aunque el paciente solo pedía información (bug real 27 Jul).
    if (apt) {
      await updateLeadStage(args, out.lead_stage, null);
      return sdrReply(session, messageText, out.reply, "sdr_chat");
    }
    return await deps.handleGreeting(session, organizationId, supabase, args.handoffLabels, messageText);
  }

  if (out.needs_handoff) {
    const registerProposal = !["humano", "gestion_cita"].includes(out.intent);
    return await silentHandoff(args, out, registerProposal);
  }

  // Quiere agendar (o ya dio fecha/hora) y hay servicio identificable → booking.
  // Los intents pasivos (ack/rechazo/futuro/humano) JAMÁS disparan booking aunque
  // el LLM arrastre datos de booking del historial (fix: "gracias" post-cita
  // re-ofrecía confirmar la misma cita → riesgo de duplicado).
  const serviceId = out.service_id ?? session.context.sdrInterestServiceId ?? null;
  const passiveIntent = ["ack", "rechazo", "futuro", "humano", "gestion_cita"].includes(out.intent);
  const wantsBooking = !passiveIntent &&
    (out.intent === "agendar" || !!out.booking?.date_text || !!out.booking?.chosen_time);
  if (wantsBooking) {
    const svc = resolveServiceForBooking(session, ctx, serviceId);
    if (svc) {
      await updateLeadStage(args, out.lead_stage, serviceId);
      return await handleSdrBooking(args, out);
    }
    // Quiere agendar/preguntó disponibilidad pero el servicio es AMBIGUO (org
    // con 2+ tratamientos, ninguno identificado aún) — sin esto, el turno caía
    // en silencio a solo repetir la respuesta del LLM sin agendar nada (bug
    // real cazado en QA 24 Jul: "¿tiene espacio el sábado?" antes de decir el
    // tratamiento). Preguntar explícito en vez de confiar en el reply del LLM.
    const list = ctx.services.map((s) => `• ${s.name}`).join("\n");
    const msg = ctx.services.length > 1
      ? `¡Con gusto! Para qué tratamiento le gustaría agendar su cita?\n\n${list}`
      : "¡Con gusto! Para qué tratamiento le gustaría agendar su cita?";
    await updateLeadStage(args, out.lead_stage, null);
    pushHistory(session, messageText, msg);
    return { message: msg, requiresInput: true, nextState: "sdr_chat", sessionComplete: false, showMenuHint: false };
  }

  await updateLeadStage(args, out.lead_stage, serviceId);
  if (serviceId) session.context.sdrInterestServiceId = serviceId;
  pushHistory(session, messageText, out.reply);

  return {
    message: out.reply,
    requiresInput: true,
    nextState: out.lead_stage === "perdido" ? "completed" : "sdr_chat",
    sessionComplete: out.lead_stage === "perdido",
    showMenuHint: false,
  };
}

// ============================================================================
// GESTIÓN DE CITA EXISTENTE (confirmar / cancelar / reagendar conversacional)
// ============================================================================

/**
 * Paciente ya tiene cita — sub-clasifica con el mismo detector determinista que
 * usa el flujo clásico (`detectIntent`, honduras-intents.ts) porque el LLM del
 * SDR no sub-clasifica `gestion_cita` (su prompt ni lo menciona). `apt` y
 * `chatOut` ya vienen resueltos por `handleSdrChat` (la cita se buscó ANTES de
 * llamar al LLM y se le pasó en el prompt — ahorro de costo, Diego 27 Jul).
 * Devuelve null para que el caller haga fallback al clásico (sin cita previa,
 * o intent ambiguo tipo "aviso" que no es confirm/reschedule/cancel claro).
 */
async function handleGestionCita(
  args: SdrArgs,
  apt: Any | null,
  chatOut: SdrLLMOutput,
): Promise<SdrBotResponse | null> {
  const { messageText, supabase, deps } = args;
  if (!apt) return null; // una sola cita activa a la vez — no hay caso real de varias (Diego, 27 Jul)

  const hnIntent = deps.detectIntent(messageText);

  if (hnIntent.intent === "confirm") {
    return await deps.confirmAppointmentFromText(apt, supabase);
  }
  if (hnIntent.intent === "cancel") {
    return await cancelAppointmentConversational(args, apt, chatOut);
  }
  if (hnIntent.intent === "reschedule") {
    return await startConversationalReschedule(args, apt, chatOut);
  }
  return null;
}

/** Cita → contexto compacto para inyectar en el prompt (sección "Cita existente"). */
function existingApptPromptData(apt: Any): { dateLabel: string; time: string; doctorName: string; serviceType: string | null } {
  const dateLabel = DateTime.fromISO(apt.date, { zone: TIMEZONE }).setLocale("es").toFormat("EEEE d 'de' MMMM");
  const doctorName = apt.doctors?.prefix ? `${apt.doctors.prefix} ${apt.doctors.name}` : (apt.doctors?.name ?? "su profesional");
  return { dateLabel, time: formatTimeForTemplate(apt.time), doctorName, serviceType: apt.service_type ?? null };
}

/** Busca (sin cachear — el estado puede cambiar entre turnos) la próxima cita del paciente, o null. */
async function getUpcomingAppointmentForSession(args: SdrArgs): Promise<Any | null> {
  const { session, organizationId, supabase, deps } = args;
  const patient = await deps.findPatientByPhone(session.patient_phone, organizationId, supabase);
  if (!patient) return null;
  const upcoming = await deps.getPatientUpcomingAppointments(patient.id, organizationId, supabase);
  return upcoming[0] ?? null;
}

/**
 * Cancela DE INMEDIATO, sin gate de "¿está seguro?" (decisión Diego 27 Jul: un
 * paciente que no responde a la confirmación deja la cita "agendada" cuando en
 * realidad ya no va — peor que cancelar directo). Después ofrece reagendar
 * como cortesía, no bloqueante — si dice que sí, el siguiente turno entra como
 * chat normal con el servicio ya conocido (sdrInterestServiceId).
 */
async function cancelAppointmentConversational(
  args: SdrArgs,
  apt: Any,
  chatOut?: SdrLLMOutput | null,
): Promise<SdrBotResponse> {
  const { session, messageText, supabase } = args;

  await supabase
    .from("appointments")
    .update({ status: "cancelada", notes: "Cancelada por paciente via WhatsApp Bot (SDR)" })
    .eq("id", apt.id);

  if (apt.service_type_id) session.context.sdrInterestServiceId = apt.service_type_id;
  clearBookingContext(session);

  const ctx = await getSdrCtx(args);
  const dateLabel = DateTime.fromISO(apt.date, { zone: TIMEZONE }).setLocale("es").toFormat("EEEE d 'de' MMMM");
  const fallbackMsg = `Listo, cancelé su cita del ${dateLabel} a las ${formatTimeForTemplate(apt.time)}. Le ayudo a agendarla para otro día?`;

  let reply = fallbackMsg;
  if (ctx) {
    // Texto libre: reusar el reply de la llamada de clasificación (ya venía
    // informada de la cita vía prompt) — cero llamadas extra. Botón: no hubo
    // llamada previa (detectIntent decide directo desde el texto del botón),
    // así que acá sí se redacta con una llamada propia, como antes.
    if (chatOut) {
      const price = checkPriceGuard(chatOut.reply, allowedPricesFor(ctx, apt.service_type_id));
      if (price.ok) reply = chatOut.reply;
    } else {
      const system = buildSdrSystemPrompt(ctx);
      const hint = `[PLATAFORMA] Acabás de cancelar la cita del paciente (${dateLabel} a las ${formatTimeForTemplate(apt.time)}). Confirmaselo con calidez y preguntale si quiere que le ayudes a agendar una nueva fecha.`;
      const messages = [...historyOf(session), { role: "user" as const, content: `${messageText}\n\n${hint}` }];
      const out = await callSdrLLM(args, system, messages);
      if (out) {
        const price = checkPriceGuard(out.reply, allowedPricesFor(ctx, apt.service_type_id));
        if (price.ok) reply = out.reply;
      }
    }
  }

  pushHistory(session, messageText, reply);
  return { message: reply, requiresInput: true, nextState: "sdr_chat", sessionComplete: false, showMenuHint: false };
}

/**
 * Reagendar directo (el paciente NO pidió cancelar, quiere mover la hora):
 * preserva el MISMO doctor de la cita original — a diferencia de una cita
 * nueva, acá NO se debe pasar por `resolveServiceAndContinue` porque esa
 * función re-califica doctores desde el servicio y podría auto-asignar a
 * alguien distinto (modo combinado). `sdrBookingSetup=true` hace que
 * `handleSdrBooking` salte ese setup y use el doctor/calendario ya fijados
 * acá, entrando directo a elegir día/hora conversacional (slots reales).
 */
async function startConversationalReschedule(
  args: SdrArgs,
  apt: Any,
  chatOut?: SdrLLMOutput | null,
): Promise<SdrBotResponse | null> {
  const { session, messageText, supabase, deps } = args;
  const doctorId = apt.doctors?.id;
  if (!doctorId) return null;

  const doctorName = apt.doctors?.prefix ? `${apt.doctors.prefix} ${apt.doctors.name}` : apt.doctors?.name;

  session.context.isReschedule = true;
  session.context.rescheduleAppointmentId = apt.id;
  session.context.rescheduleAppointmentDate = apt.date;
  session.context.rescheduleAppointmentTime = apt.time;
  session.context.rescheduleAppointmentDoctorName = doctorName;

  session.context.doctorId = doctorId;
  session.context.doctorName = doctorName;
  session.context.calendarId =
    (await deps.lineCalendarForDoctor(supabase, session.whatsapp_line_id, doctorId)) ??
    (await deps.firstActiveCalendarId(supabase, doctorId)) ?? undefined;
  session.context.combinedMode = false;
  session.context.selectedServiceType = apt.service_type || undefined;
  session.context.selectedServiceTypeId = apt.service_type_id || undefined;
  session.context.durationMinutes = apt.duration_minutes || session.context.durationMinutes || 60;
  session.context.slotGranularity = Math.min(session.context.durationMinutes, 30);

  delete session.context.availableDoctors;
  delete session.context.availableServiceTypes;
  delete session.context.qualifiedDoctors;
  delete session.context.combinedSlotDoctors;
  delete session.context.selectedServicePrice;

  session.context.sdrBookingSetup = true; // evita que handleSdrBooking vuelva a calificar doctores

  // Apertura cálida ANTES de entrar a sdr_booking — sin esto, el primer turno caía
  // directo en el "¿Para qué día...?" genérico de handleSdrBooking (sección (e)),
  // que ignora que el paciente acaba de avisar que no puede asistir / pidió
  // reagendar una cita puntual. Mismo patrón que cancelAppointmentConversational.
  const ctx = await getSdrCtx(args);
  const dateLabel = DateTime.fromISO(apt.date, { zone: TIMEZONE }).setLocale("es").toFormat("EEEE d 'de' MMMM");
  const fallbackMsg = `Gracias por avisarme que no podrá asistir el ${dateLabel} a las ${formatTimeForTemplate(apt.time)}. Desea que agendemos la cita para otro día?`;
  let reply = fallbackMsg;
  if (ctx) {
    // Texto libre: reusar el reply de la llamada de clasificación (ver
    // cancelAppointmentConversational). Botón: llamada propia como antes.
    if (chatOut) {
      const price = checkPriceGuard(chatOut.reply, allowedPricesFor(ctx, apt.service_type_id));
      if (price.ok) reply = chatOut.reply;
    } else {
      const system = buildSdrSystemPrompt(ctx);
      const hint = `[PLATAFORMA] El paciente avisó que no puede asistir o pidió reagendar su cita (${dateLabel} a las ${formatTimeForTemplate(apt.time)}). Agradecele el aviso con calidez y preguntale para qué día le gustaría reagendarla — todavía NO ofrezcas horarios.`;
      const messages = [...historyOf(session), { role: "user" as const, content: `${messageText}\n\n${hint}` }];
      const out = await callSdrLLM(args, system, messages);
      if (out) {
        const price = checkPriceGuard(out.reply, allowedPricesFor(ctx, apt.service_type_id));
        if (price.ok) reply = out.reply;
      }
    }
  }
  pushHistory(session, messageText, reply);
  return { message: reply, requiresInput: true, nextState: "sdr_booking", sessionComplete: false, showMenuHint: false };
}

/**
 * Entrada desde CLICK DE BOTÓN de plantilla ("Reagendar" en confirmación,
 * "No puedo asistir"/"Confirmo" en recordatorios) — meta-webhook manda
 * `appointmentId` directo (ya sabemos CUÁL cita, sin buscar "upcoming").
 * index.ts la llama ANTES de su fallback clásico `handleDirectReschedule`
 * cuando la línea tiene sdrModeEnabled. Retorna null para que index.ts caiga
 * al flujo clásico (cita no encontrada/cancelada, presupuesto excedido, o
 * intent que no es confirm/reschedule/cancel claro).
 */
export async function maybeHandleSdrButtonAction(
  appointmentId: string,
  args: SdrArgs,
): Promise<SdrBotResponse | null> {
  const { session, messageText, organizationId, supabase, deps } = args;
  if (!session.context.sdrModeEnabled) return null;
  if (!(await underLlmBudget(session, organizationId, supabase))) return null;

  const { data: apt } = await supabase
    .from("appointments")
    .select("id, date, time, duration_minutes, status, service_type, service_type_id, doctors:doctor_id (id, name, prefix)")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!apt || apt.status === "cancelada" || apt.status === "cancelled") return null;

  session.context.sdrActive = true;
  const hnIntent = deps.detectIntent(messageText);
  if (hnIntent.intent === "confirm") return await deps.confirmAppointmentFromText(apt, supabase);
  if (hnIntent.intent === "cancel") return await cancelAppointmentConversational(args, apt);
  if (hnIntent.intent === "reschedule") return await startConversationalReschedule(args, apt);
  return null;
}

// ============================================================================
// BOOKING (estado sdr_booking)
// ============================================================================

async function handleSdrBooking(args: SdrArgs, fromChat: SdrLLMOutput | null): Promise<SdrBotResponse | null> {
  const { session, messageText, organizationId, supabase, deps } = args;
  const ctx = await getSdrCtx(args);
  if (!ctx) return null;

  // (a) Setup de servicio/doctor una sola vez — reusa el camino clásico completo
  // (consulta previa, profesionales calificados, single vs combinado).
  if (!session.context.sdrBookingSetup) {
    const svc = resolveServiceForBooking(session, ctx, fromChat?.service_id ?? session.context.sdrInterestServiceId);
    if (!svc) {
      return sdrReply(session, messageText, "Para qué tratamiento le gustaría su cita? 😊", "sdr_chat");
    }
    const setupResp = await deps.resolveServiceAndContinue(svc, session, organizationId, supabase);
    if (setupResp.nextState === "handoff_secretary" || setupResp.nextState === "booking_select_service") {
      // Sin profesionales / requiere consulta previa → respuesta clásica correcta.
      return setupResp;
    }
    session.context.sdrBookingSetup = true;
  }

  // (b) Turno dentro de booking: primero intento determinista de elección de hora
  // (sin LLM — parseTimeHint/fuzzy ya resuelven "las 3", "3:30 pm", "la segunda").
  const offered: string[] = session.context.sdrOfferedSlots || [];
  if (offered.length > 0 && !fromChat) {
    const idx = matchOfferedSlot(messageText, offered, deps);
    if (idx !== null) return await acceptSlot(args, ctx, offered[idx]);

    // (b2) Pidió una hora ESPECÍFICA que no está entre las 2-3 ofrecidas (solo
    // ofrecemos un subconjunto natural, no la lista completa del día) — antes
    // de asumir que no hay espacio, verificar contra la disponibilidad REAL
    // completa. Bug real cazado en QA 24 Jul: pidió Ultrasonido jueves 10 AM,
    // el bot repitió las mismas 3 horas ofrecidas sin chequear el resto del
    // día — la hora SÍ estaba libre en el motor real, solo no era una de las
    // "representativas" elegidas para la oferta inicial.
    const requestedTime = deps.parseTimeHint(messageText);
    if (requestedTime && session.context.selectedDate) {
      const fullDaySlots = await fetchSlotsForDate(args, session.context.selectedDate);
      if (fullDaySlots.includes(requestedTime)) {
        return await acceptSlot(args, ctx, requestedTime);
      }
      if (fullDaySlots.length > 0) {
        // Genuinamente no disponible esa hora — re-ofrecer priorizando
        // cercanía a lo pedido, con mensaje determinista (no depende del LLM
        // para no arriesgar que "invente" que sí hay espacio).
        const picked = pickSlots(fullDaySlots, null, requestedTime);
        session.context.sdrOfferedSlots = picked;
        const formatted = picked.map(formatTimeForTemplate);
        const msg = `A las ${formatTimeForTemplate(requestedTime)} no tengo espacio ese día, pero sí tengo ${formatted.join(" o ")}. Le sirve alguna?`;
        pushHistory(session, messageText, msg);
        return { message: msg, requiresInput: true, nextState: "sdr_booking", sessionComplete: false, showMenuHint: false };
      }
    }
  }

  // (c) Entender el mensaje con LLM (con los slots ofrecidos en el prompt si existen).
  let out = fromChat;
  if (!out || (!out.booking?.date_text && !out.booking?.chosen_time && !fromChat)) {
    const system = buildSdrSystemPrompt(ctx, offered.length > 0
      ? { offeredSlots: offered.map(formatTimeForTemplate), offeredDayLabel: session.context.sdrOfferedDayLabel }
      : undefined);
    const messages = [...historyOf(session), { role: "user" as const, content: messageText }];
    out = await callSdrLLM(args, system, messages);
    if (!out) return null;
  }

  if (out.needs_handoff) {
    const registerProposal = !["humano", "gestion_cita"].includes(out.intent);
    return await silentHandoff(args, out, registerProposal);
  }

  // (d) ¿Eligió una hora de las ofrecidas?
  if (out.booking?.chosen_time && offered.length > 0) {
    const idx = matchOfferedSlot(out.booking.chosen_time, offered, deps);
    if (idx !== null) return await acceptSlot(args, ctx, offered[idx]);
  }

  // (e) ¿Dio (o cambió) el día? Resolver fecha en backend y ofrecer slots reales.
  const dateText = out.booking?.date_text ?? null;
  if (dateText || !session.context.sdrOfferedSlots) {
    const hint = dateText ? deps.parseDateHint(dateText) ?? deps.parseDateHint(messageText) : deps.parseDateHint(messageText);
    if (!hint) {
      return sdrReply(session, messageText,
        "Para qué día le gustaría su cita — mañana, el viernes, o dígame la fecha 😊",
        "sdr_booking");
    }
    // Hora exacta que el paciente pidió por su cuenta (antes de que se le
    // ofreciera nada) — sin esto, la primera oferta repartía genérico
    // inicio/medio/fin del día e ignoraba que pidió, por ejemplo, "las 3"
    // (bug real reportado por Diego 27 Jul: pidió 3pm, se le ofreció 3:15pm
    // sin haber intentado acercarse a la hora real pedida).
    const preferredTime = out.booking?.time_text ? deps.parseTimeHint(out.booking.time_text) : null;
    return await offerSlotsForDate(args, ctx, hint.toISODate(), out.booking?.period ?? null, preferredTime);
  }

  // (f) Negociación dentro del set ofrecido (el LLM ya tiene los slots en el prompt).
  const time = checkTimeGuard(out.reply, offered);
  const price = checkPriceGuard(out.reply, allowedPricesFor(ctx, session.context.selectedServiceTypeId));
  if (!time.ok || !price.ok) {
    return await guardBlockedHandoff(args, out, [...time.violations, ...price.violations]);
  }
  pushHistory(session, messageText, out.reply);
  return { message: out.reply, requiresInput: true, nextState: "sdr_booking", sessionComplete: false, showMenuHint: false };
}

/** Busca slots para la fecha (o los días siguientes) y redacta la oferta. */
async function offerSlotsForDate(
  args: SdrArgs,
  ctx: SdrContext,
  isoDate: string,
  period: "morning" | "afternoon" | null,
  preferredTime?: string | null,
): Promise<SdrBotResponse> {
  const { session, messageText } = args;

  let date = isoDate;
  let slots: string[] = [];
  for (let i = 0; i <= SLOT_SCAN_DAYS; i++) {
    slots = await fetchSlotsForDate(args, date);
    if (slots.length > 0) break;
    date = DateTime.fromISO(date, { zone: TIMEZONE }).plus({ days: 1 }).toISODate()!;
  }

  if (slots.length === 0) {
    const connecting = session.context.handoffLabels?.connecting || "la secretaria";
    return {
      message: `⚠️ No encontramos disponibilidad en los próximos días.\n\nConectando con ${connecting}...`,
      requiresInput: false,
      nextState: "handoff_secretary",
      sessionComplete: true,
    };
  }

  const dayMoved = date !== isoDate;
  const dayLabel = DateTime.fromISO(date, { zone: TIMEZONE }).setLocale("es").toFormat("EEEE d 'de' MMMM");
  session.context.selectedDate = date;
  session.context.sdrOfferedDayLabel = dayLabel;

  // Pidió día Y hora exactos y esa hora está libre → confirmar directo, sin
  // mostrar un menú redundante que ya incluye lo que pidió (bug real 27 Jul:
  // "para el sábado a las 10?" devolvía 9:30/10:00/10:30 en vez de confirmar
  // el 10:00 pedido tal cual).
  if (preferredTime && !dayMoved && slots.includes(preferredTime)) {
    return await acceptSlot(args, ctx, preferredTime);
  }

  // Con hora preferida, pickSlots ignora period y prioriza los 3 slots reales
  // MÁS CERCANOS a esa hora (mismo criterio que ya usa la sección (b2) cuando
  // pide una hora fuera de lo ofrecido) — así "a las 3" cae en 3:00 si está
  // libre, o en la alternativa real más próxima, nunca en algo genérico.
  const picked = preferredTime ? pickSlots(slots, period, preferredTime) : pickSlots(slots, period);
  session.context.sdrOfferedSlots = picked;

  // Determinista, sin LLM (ahorro de costo — decisión Diego 27 Jul: esta oferta
  // es texto de plantilla con datos reales inyectados, el fallback ya sonaba bien
  // y evita gastar una 2da llamada LLM por turno solo para redactar horarios).
  const formatted = picked.map(formatTimeForTemplate);
  const reply = `${dayMoved ? `Fíjese que para el día que me pidió no tengo espacio, pero para *${dayLabel}* sí 😊 ` : `Para *${dayLabel}* tengo disponible: `}${formatted.join(" y ")}. Cuál le queda mejor?`;

  pushHistory(session, messageText, reply);
  return { message: reply, requiresInput: true, nextState: "sdr_booking", sessionComplete: false, showMenuHint: false };
}

/** Hora elegida y validada → auto-asignación (combinado) → confirmación clásica. */
async function acceptSlot(args: SdrArgs, ctx: SdrContext, selectedTime: string): Promise<SdrBotResponse> {
  const { session, messageText, organizationId, supabase, deps } = args;
  session.context.selectedTime = selectedTime;

  // Auto-asignación en modo combinado (mismo criterio que handleBookingSelectHour).
  if (session.context.combinedMode) {
    const freeIds: string[] = (session.context.combinedSlotDoctors || {})[selectedTime] || [];
    if (freeIds.length === 0) {
      // Race / cache vieja → re-ofrecer el mismo día con datos frescos.
      session.context.sdrOfferedSlots = null;
      return await offerSlotsForDate(args, ctx, session.context.selectedDate, null);
    }
    const load = await deps.getDoctorLoadForDate(supabase, organizationId, session.context.selectedDate, freeIds);
    const assignedId = deps.pickLeastLoaded(freeIds, load) ?? freeIds[0];
    const assigned = (session.context.qualifiedDoctors || []).find((d: Any) => d.id === assignedId);
    session.context.doctorId = assignedId;
    session.context.doctorName = assigned?.name || "su profesional";
    session.context.calendarId =
      (await deps.lineCalendarForDoctor(supabase, session.whatsapp_line_id, assignedId)) ??
      (await deps.firstActiveCalendarId(supabase, assignedId)) ?? undefined;
  }

  const dayLabel = session.context.sdrOfferedDayLabel ||
    DateTime.fromISO(session.context.selectedDate, { zone: TIMEZONE }).setLocale("es").toFormat("EEEE d 'de' MMMM");
  const svcLine = session.context.selectedServiceType ? `${session.context.selectedServiceType} — ` : "";

  // Confirmación natural SIN LLM (determinista); el "sí"/"cambiar"/"cancelar"
  // del siguiente turno lo procesa el handler clásico de booking_confirm.
  const msg = `Perfecto 😊 Le confirmo su cita: ${svcLine}*${dayLabel}* a las *${formatTimeForTemplate(selectedTime)}* con ${session.context.doctorName}. Se la confirmo?`;
  pushHistory(session, messageText, msg);
  return { message: msg, requiresInput: true, nextState: "booking_confirm", sessionComplete: false, showMenuHint: false };
}

// ============================================================================
// HELPERS
// ============================================================================

async function getSdrCtx(args: SdrArgs): Promise<SdrContext | null> {
  const { session, whatsappLineId, supabase } = args;
  if (!session.context.sdrCtx) {
    session.context.sdrCtx = await buildSdrContext(supabase, whatsappLineId);
  }
  return session.context.sdrCtx ?? null;
}

function publicPrices(ctx: SdrContext): number[] {
  return ctx.services.filter((s) => !s.requiresPriorConsult && s.price != null).map((s) => Number(s.price));
}

/**
 * Precio(s) permitido(s) para el guard. Con un servicio puntual identificado
 * (booking en curso, cita existente), acota al precio de ESE servicio — sin
 * esto, checkPriceGuard solo valida "¿es un precio real de ALGÚN servicio del
 * catálogo?", y un precio real pero del servicio EQUIVOCADO (ej. confundir el
 * de Evaluación con el de Blanqueamiento) pasaría el guard igual. Sin
 * servicio identificado (chat general, "qué servicios ofrecen") se mantiene
 * el catálogo completo — ahí sí es legítimo mencionar varios precios.
 */
function allowedPricesFor(ctx: SdrContext, serviceId?: string | null): number[] {
  if (!serviceId) return publicPrices(ctx);
  const svc = ctx.services.find((s) => s.id === serviceId);
  if (svc && !svc.requiresPriorConsult && svc.price != null) return [Number(svc.price)];
  return []; // servicio identificado pero sin precio público → cualquier cifra es violación
}

/** Devuelve el service_type COMPLETO (lineServiceTypes) para el booking clásico. */
function resolveServiceForBooking(session: Any, ctx: SdrContext, serviceId: string | null): Any | null {
  const lineTypes: Any[] = session.context.lineServiceTypes || [];
  if (serviceId) {
    const match = lineTypes.find((st) => st.id === serviceId);
    if (match) return match;
  }
  if (lineTypes.length === 1) return lineTypes[0];
  return null;
}

function matchOfferedSlot(input: string, offered: string[], deps: SdrDeps): number | null {
  const hint = deps.parseTimeHint(input);
  if (hint) {
    const idx = offered.indexOf(hint);
    if (idx >= 0) return idx;
  }
  const fuzzy = deps.fuzzyMatchOption(input, offered.map(formatTimeForTemplate));
  return fuzzy;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 2-3 slots a ofrecer. Con `preferredTime` (el paciente pidió una hora exacta
 * que resultó no estar libre): los 3 MÁS CERCANOS a esa hora, en orden
 * cronológico. Sin preferencia: filtrados por franja si la hay, si no
 * inicio/medio/fin del día.
 */
function pickSlots(slots: string[], period: "morning" | "afternoon" | null, preferredTime?: string): string[] {
  if (preferredTime) {
    const target = timeToMinutes(preferredTime);
    return [...slots]
      .sort((a, b) => Math.abs(timeToMinutes(a) - target) - Math.abs(timeToMinutes(b) - target))
      .slice(0, 3)
      .sort();
  }
  let pool = slots;
  if (period === "morning") pool = slots.filter((s) => s < "12:00");
  if (period === "afternoon") pool = slots.filter((s) => s >= "12:00");
  if (pool.length === 0) pool = slots; // la franja pedida no tiene → ofrecer lo que hay
  if (pool.length <= 3) return pool;
  const mid = pool[Math.floor(pool.length / 2)];
  return [...new Set([pool[0], mid, pool[pool.length - 1]])];
}

/** Slots completos del día (sin paginar), mismas fuentes que showHourSlots. */
async function fetchSlotsForDate(args: SdrArgs, date: string): Promise<string[]> {
  const { session, supabase, deps } = args;
  const durationMinutes = session.context.durationMinutes || 60;
  const granularity = session.context.slotGranularity || Math.min(durationMinutes, 30);

  if (session.context.combinedMode) {
    const byTime = await deps.getCombinedSlotsForDate(
      session.context.qualifiedDoctors || [], date, durationMinutes, supabase,
      granularity, session.context.selectedServiceTypeId, session.context.organizationId,
    );
    const freeByTime: Record<string, string[]> = {};
    for (const [t, ids] of byTime.entries()) freeByTime[t] = ids;
    session.context.combinedSlotDoctors = freeByTime;
    return [...byTime.keys()].sort((a, b) => a.localeCompare(b));
  }
  return await deps.getAvailableSlotsForDate(
    session.context.doctorId, date, durationMinutes, supabase,
    session.context.calendarId, granularity, session.context.selectedServiceTypeId, session.context.organizationId,
  );
}

/** LLM primario → fallback → null. Loguea cada intento en llm_call_logs. */
async function callSdrLLM(
  args: SdrArgs,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<SdrLLMOutput | null> {
  const { session, organizationId, supabase } = args;
  const conversationId = await resolveConversationId(args);

  for (const { provider, model } of [SDR_PRIMARY, SDR_FALLBACK]) {
    const result: LLMResult = await callLLM({ provider, model, system, messages, maxTokens: MAX_LLM_TOKENS, temperature: 0 });
    logLLMCall(supabase, { organizationId, conversationId, purpose: "reply", provider, model, result })
      .catch(() => {});
    if (result.ok) {
      const out = parseSdrOutput(result.text);
      if (out) return out;
      console.warn(`[sdr] ${model} returned unparseable output, trying next`);
    } else {
      console.warn(`[sdr] ${model} call failed:`, result.error);
    }
  }
  return null;
}

async function resolveConversationId(args: SdrArgs): Promise<string | null> {
  const { session, whatsappLineId, patientPhone, supabase } = args;
  if (session.context.sdrConversationId !== undefined) return session.context.sdrConversationId;
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("whatsapp_line_id", whatsappLineId)
    .eq("patient_phone", patientPhone)
    .maybeSingle();
  session.context.sdrConversationId = data?.id ?? null;
  return session.context.sdrConversationId;
}

/** Presupuesto mensual LLM del org (cache 10 min en la sesión). */
async function underLlmBudget(session: Any, organizationId: string, supabase: Any): Promise<boolean> {
  const cached = session.context.sdrBudgetCheck;
  if (cached && Date.now() - cached.at < BUDGET_RECHECK_MS) return cached.ok;

  let ok = true;
  try {
    const { data: org } = await supabase
      .from("organizations").select("llm_monthly_budget_usd").eq("id", organizationId).single();
    const budget = Number(org?.llm_monthly_budget_usd ?? 10);
    const monthStart = DateTime.now().setZone(TIMEZONE).startOf("month").toISO();
    const { data: rows } = await supabase
      .from("llm_call_logs")
      .select("model, tokens_in, tokens_out")
      .eq("organization_id", organizationId)
      .gte("created_at", monthStart);
    let spent = 0;
    for (const r of rows ?? []) {
      spent += estimateCostUsd(r.model, r.tokens_in, r.tokens_out) ?? 0;
    }
    ok = spent < budget;
  } catch (e) {
    console.error("[sdr] budget check failed (allowing):", e);
  }
  session.context.sdrBudgetCheck = { ok, at: Date.now() };
  return ok;
}

/** Embudo en conversations. 'agendado' solo lo escribe markLeadAgendado. */
async function updateLeadStage(args: SdrArgs, stage: string, serviceId: string | null): Promise<void> {
  if (stage === "agendado") return;
  const conversationId = await resolveConversationId(args);
  if (!conversationId) return;
  try {
    const update: Record<string, Any> = { lead_stage: stage, lead_stage_updated_at: new Date().toISOString() };
    if (serviceId) update.interest_service_type_id = serviceId;
    // Nunca degradar una cita ya lograda. OJO: .neq solo no basta — en SQL
    // NULL <> 'agendado' es NULL, y las filas virgenes (lead_stage NULL)
    // quedarian excluidas del update. Por eso el .or con is.null explicito.
    await args.supabase
      .from("conversations")
      .update(update)
      .eq("id", conversationId)
      .or("lead_stage.is.null,lead_stage.neq.agendado");
  } catch (e) {
    console.error("[sdr] updateLeadStage failed (non-fatal):", e);
  }
}

/**
 * Hook para index.ts: marca el lead como agendado al crear la cita real
 * (createAppointmentWithPatient éxito, cuando la sesión pasó por SDR).
 */
export async function markLeadAgendado(
  supabase: Any,
  whatsappLineId: string,
  patientPhone: string,
): Promise<void> {
  try {
    await supabase
      .from("conversations")
      .update({ lead_stage: "agendado", lead_stage_updated_at: new Date().toISOString() })
      .eq("whatsapp_line_id", whatsappLineId)
      .eq("patient_phone", patientPhone);
  } catch (e) {
    console.error("[sdr] markLeadAgendado failed (non-fatal):", e);
  }
}

/** Respuesta blindada cuando un guard bloquea la redacción del LLM. */
async function guardBlockedHandoff(args: SdrArgs, out: SdrLLMOutput, violations: string[]): Promise<SdrBotResponse> {
  console.error("[sdr] GUARD_BLOCKED — reply retenido:", JSON.stringify({ violations, reply: out.reply.slice(0, 300) }));
  args.session.context.lastGuardBlock = { violations, reply: out.reply.slice(0, 500), at: new Date().toISOString() };
  // No es brecha de conocimiento (el LLM SÍ sabía qué decir, solo lo dijo mal/
  // inventado) — no vale como propuesta de FAQ, es un bug de redacción a revisar
  // en session.context.lastGuardBlock, no un hueco de contenido.
  return await silentHandoff(args, out, false);
}

/**
 * Handoff SILENCIOSO hacia el paciente (decisión Diego 24 Jul — ver invariantes
 * arriba). La notificación interna a doctor/secretaria sigue disparando con su
 * dedupe de 5 min existente; solo se suprime el mensaje al paciente.
 * sessionComplete=true → updateSession persiste state='completed', así que el
 * próximo mensaje del paciente vuelve a entrar por isEntryState (greeting-like).
 */
async function silentHandoff(args: SdrArgs, out: SdrLLMOutput, registerProposal: boolean): Promise<SdrBotResponse> {
  const { session, deps, supabase, organizationId } = args;
  await updateLeadStage(args, "handoff", out.service_id ?? null);
  await deps.handleHandoffToSecretary(
    args.whatsappLineId, args.patientPhone, organizationId, supabase, args.handoffLabels, session.context, session.id,
  );
  if (registerProposal) await registerFaqProposal(args, args.messageText);
  return { message: "", requiresInput: false, nextState: "handoff_secretary", sessionComplete: true, skipDefaultSend: true };
}

function normalizeQuestion(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:]/g, "").trim();
}

/**
 * Registra la brecha de conocimiento en bot_faq_proposals para revisión
 * humana posterior (Fase 3 pendiente: UI de aprobación — la tabla existe
 * desde Fase 1 pero nada la poblaba hasta este cambio). Dedup simple por
 * texto normalizado exacto contra propuestas PENDING de la misma org — si
 * ya existe, solo suma evidencia; si no, crea una nueva.
 */
async function registerFaqProposal(args: SdrArgs, question: string): Promise<void> {
  const trimmed = question.trim();
  if (trimmed.length < 5) return; // no cumple el CHECK de longitud de bot_faq_proposals
  const { supabase, organizationId, whatsappLineId } = args;
  const normalized = normalizeQuestion(trimmed);
  try {
    const { data: pending } = await supabase
      .from("bot_faq_proposals")
      .select("id, question, evidence_count")
      .eq("organization_id", organizationId)
      .eq("status", "pending");
    const dup = (pending ?? []).find((p: Any) => normalizeQuestion(p.question) === normalized);
    if (dup) {
      await supabase.from("bot_faq_proposals")
        .update({ evidence_count: (dup.evidence_count ?? 1) + 1, last_asked_at: new Date().toISOString() })
        .eq("id", dup.id);
      return;
    }
    const conversationId = await resolveConversationId(args);
    await supabase.from("bot_faq_proposals").insert({
      organization_id: organizationId,
      whatsapp_line_id: whatsappLineId,
      question: trimmed.slice(0, 500),
      sample_conversation_id: conversationId,
    });
  } catch (e) {
    console.error("[sdr] registerFaqProposal failed (non-fatal):", e);
  }
}

function sdrReply(session: Any, userMsg: string, message: string, nextState: string): SdrBotResponse {
  pushHistory(session, userMsg, message);
  return { message, requiresInput: true, nextState, sessionComplete: false, showMenuHint: false };
}

function historyOf(session: Any): { role: "user" | "assistant"; content: string }[] {
  return session.context.sdrHistory || [];
}

function pushHistory(session: Any, userMsg: string, botReply: string): void {
  const h = [...historyOf(session),
    { role: "user" as const, content: userMsg.slice(0, 400) },
    { role: "assistant" as const, content: botReply.slice(0, 400) },
  ];
  session.context.sdrHistory = h.slice(-MAX_HISTORY);
}
