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
    const classicMatch = /^[123]$/.test(trimmed) ||
      /\bs[ií]\b|confirm|cambiar|cancelar|canselar/.test(lower);
    if (classicMatch) return null; // el handler clásico ya lo entiende
    const di = args.deps.detectIntent(messageText);
    if (di.intent === "confirm") {
      return await args.deps.handleBookingConfirm("si", session, organizationId, supabase, args.handoffLabels);
    }
    if (di.intent === "cancel") {
      return await args.deps.handleBookingConfirm("cancelar", session, organizationId, supabase, args.handoffLabels);
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

  const price = checkPriceGuard(out.reply, publicPrices(ctx));
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

  const ctx = await getSdrCtx(args);
  if (!ctx) return null;

  const system = buildSdrSystemPrompt(ctx);
  const messages = [...historyOf(session), { role: "user" as const, content: messageText }];
  const out = await callSdrLLM(args, system, messages);
  if (!out) return null;

  // Guard de precios: siempre. (El de horarios solo aplica en booking — las FAQs
  // pueden mencionar horas legítimas, ej. "atendemos desde las 9:00 AM".)
  const price = checkPriceGuard(out.reply, publicPrices(ctx));
  if (!price.ok) return await guardBlockedHandoff(args, out, price.violations);

  // Gestión de cita existente → caminos clásicos ya probados (confirmar /
  // reagendar / cancelar cita inminente viven en handleGreeting+detectIntent).
  if (out.intent === "gestion_cita") {
    return await deps.handleGreeting(session, organizationId, supabase, args.handoffLabels, messageText);
  }

  if (out.needs_handoff) {
    await updateLeadStage(args, "handoff", out.service_id);
    const handoff = await deps.handleHandoffToSecretary(
      args.whatsappLineId, args.patientPhone, organizationId, supabase, args.handoffLabels, session.context, session.id,
    );
    // La notificación/dedupe ya corrió; el paciente recibe la respuesta empática del LLM.
    handoff.message = out.reply;
    handoff.options = undefined;
    handoff.showMenuHint = false;
    pushHistory(session, messageText, out.reply);
    return handoff;
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
      ? `¡Con gusto! ¿Para qué tratamiento le gustaría agendar su cita?\n\n${list}`
      : "¡Con gusto! ¿Para qué tratamiento le gustaría agendar su cita?";
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
      return sdrReply(session, messageText, "¿Para qué tratamiento le gustaría su cita? 😊", "sdr_chat");
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
    await updateLeadStage(args, "handoff", null);
    const handoff = await deps.handleHandoffToSecretary(
      args.whatsappLineId, args.patientPhone, organizationId, supabase, args.handoffLabels, session.context, session.id,
    );
    handoff.message = out.reply;
    handoff.options = undefined;
    handoff.showMenuHint = false;
    return handoff;
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
        "¿Para qué día le gustaría su cita? Puede decirme por ejemplo *mañana*, *el viernes* o una fecha 😊",
        "sdr_booking");
    }
    return await offerSlotsForDate(args, ctx, hint.toISODate(), out.booking?.period ?? null);
  }

  // (f) Negociación dentro del set ofrecido (el LLM ya tiene los slots en el prompt).
  const time = checkTimeGuard(out.reply, offered);
  const price = checkPriceGuard(out.reply, publicPrices(ctx));
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
  const picked = pickSlots(slots, period);
  const dayLabel = DateTime.fromISO(date, { zone: TIMEZONE }).setLocale("es").toFormat("EEEE d 'de' MMMM");

  session.context.selectedDate = date;
  session.context.sdrOfferedSlots = picked;
  session.context.sdrOfferedDayLabel = dayLabel;

  // Redacción por LLM con los slots REALES inyectados; fallback determinista si falla.
  const formatted = picked.map(formatTimeForTemplate);
  const fallbackMsg = `${dayMoved ? `Fíjese que para el día que me pidió no tengo espacio, pero para *${dayLabel}* sí 😊 ` : `Para *${dayLabel}* tengo disponible: `}${formatted.join(" y ")}. ¿Cuál le queda mejor?`;

  const system = buildSdrSystemPrompt(ctx, { offeredSlots: formatted, offeredDayLabel: dayLabel });
  const renderHint = dayMoved
    ? `[PLATAFORMA] El día pedido no tenía espacio. Ofrecé estos horarios de ${dayLabel}: ${formatted.join(", ")}.`
    : `[PLATAFORMA] Ofrecé estos horarios de ${dayLabel}: ${formatted.join(", ")}.`;
  const messages = [...historyOf(session), { role: "user" as const, content: `${messageText}\n\n${renderHint}` }];
  const out = await callSdrLLM(args, system, messages);

  let reply = fallbackMsg;
  if (out) {
    const time = checkTimeGuard(out.reply, picked);
    const price = checkPriceGuard(out.reply, publicPrices(ctx));
    if (time.ok && price.ok) reply = out.reply;
    else console.warn("[sdr] Offer render blocked by guard, using deterministic fallback:", time.violations, price.violations);
  }

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
  const msg = `Perfecto 😊 Le confirmo su cita: ${svcLine}*${dayLabel}* a las *${formatTimeForTemplate(selectedTime)}* con ${session.context.doctorName}. ¿Se la confirmo?`;
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
  return ctx.services.filter((s) => s.priceIsPublic && s.price != null).map((s) => Number(s.price));
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

/** 2-3 slots: filtrados por franja si la hay; si no, inicio/medio/fin del día. */
function pickSlots(slots: string[], period: "morning" | "afternoon" | null): string[] {
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
  const { session, deps, supabase, organizationId } = args;
  console.error("[sdr] GUARD_BLOCKED — reply retenido:", JSON.stringify({ violations, reply: out.reply.slice(0, 300) }));
  session.context.lastGuardBlock = { violations, reply: out.reply.slice(0, 500), at: new Date().toISOString() };
  await updateLeadStage(args, "handoff", null);
  const handoff = await deps.handleHandoffToSecretary(
    args.whatsappLineId, args.patientPhone, organizationId, supabase, args.handoffLabels, session.context, session.id,
  );
  return handoff;
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
