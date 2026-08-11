/**
 * Capa de bienes raices del bot (piloto Bruno, 10 Ago 2026) — paralela al SDR
 * medico (sdr.ts), NO lo modifica ni lo importa. Mismo patron de inyeccion de
 * dependencias (reusa los tipos SdrArgs/SdrDeps de sdr.ts — misma forma,
 * generica, no especifica de medicina) y reusa de sdr.ts solo lo genuinamente
 * agnostico al rubro (matchOfferedSlot, pickSlots, fetchSlotsForDate,
 * resolveConversationId, updateLeadStage, underLlmBudget) via `export`.
 *
 * Alcance MVP confirmado (Fase 0 8 Ago + Fase 3 10 Ago): identificar
 * propiedad -> presentar ficha real -> calificar interes -> agendar visita.
 * Sin FAQ, sin gestion de visita propia — reagendar/cancelar cae al flujo
 * CLASICO del bot (confirmado reusable sin cambios, 10 Ago — solo se le quito
 * el emoji medico hardcodeado del copy).
 *
 * Invariantes (mismos que sdr.ts):
 * - Inerte para cualquier org con vertical != 'bienes_raices' (gate en index.ts).
 * - El LLM jamas calcula fechas ni inventa horarios/specs/precio.
 * - Todo fallo (LLM caido, presupuesto excedido, JSON invalido) -> return null
 *   = el flujo clasico responde. El bot NUNCA queda mudo.
 * - La visita se crea por el camino clasico (booking_confirm ->
 *   createAppointmentWithPatient), igual que SDR — sin duplicar esa logica.
 * - Handoff SILENCIOSO hacia el lead (mismo principio Coexistence que SDR).
 *
 * Ver CLAUDE.md / memoria persistente project_piloto-bienes-raices-bruno.md.
 */

// deno-lint-ignore-file no-explicit-any

import { callLLM, logLLMCall, type LLMProvider, type LLMResult } from "../_shared/llm.ts";
import {
  buildRealEstateSystemPrompt,
  parseRealEstateOutput,
  type RealEstateLLMOutput,
  type RealEstatePropertyInfo,
} from "../_shared/realestate-prompt.ts";
import { getPropertyById } from "../_shared/properties.ts";
import { checkPriceGuard, checkTimeGuard } from "../_shared/sdr-guards.ts";
import { formatTimeForTemplate } from "../_shared/datetime.ts";
import {
  type SdrArgs,
  type SdrBotResponse,
  matchOfferedSlot,
  pickSlots,
  fetchSlotsForDate,
  resolveConversationId,
  updateLeadStage,
  underLlmBudget,
} from "./sdr.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

type Any = any;

const RE_PRIMARY: { provider: LLMProvider; model: string } = {
  provider: "gemini",
  model: "gemini-3.5-flash-lite",
};
const RE_FALLBACK: { provider: LLMProvider; model: string } = {
  provider: "anthropic",
  model: "claude-haiku-4-5",
};
const MAX_HISTORY = 8;
const MAX_LLM_TOKENS = 500;
const SLOT_SCAN_DAYS = 6;
const TIMEZONE = "America/Tegucigalpa";

// ============================================================================
// ROUTER
// ============================================================================

/**
 * Devuelve la respuesta de bienes raices, o null para que el flujo clasico
 * continue. Llamar desde handleBotMessage en vez de maybeHandleSdr cuando
 * organizations.vertical === 'bienes_raices' (nunca ambos a la vez).
 */
export async function maybeHandleRealEstate(args: SdrArgs): Promise<SdrBotResponse | null> {
  const { session, messageText, organizationId, supabase } = args;

  const state = session.state as string;
  const inReState = state === "realestate_chat" || state === "realestate_booking";
  const isEntryState = state === "greeting" || state === "main_menu" ||
    state === "completed" || state === "expired";
  if (!inReState && !isEntryState) return null;

  const trimmed = messageText.trim();
  // Numeros puros en estados de menu = navegacion clasica.
  if (isEntryState && /^\d+$/.test(trimmed)) return null;

  // Sesion terminada que revive: limpiar contexto de booking e historial —
  // mismo criterio que sdr.ts (evita que el LLM arrastre datos viejos).
  if (state === "completed" || state === "expired") {
    delete session.context.reSelectedPropertyId;
    delete session.context.reOfferedSlots;
    delete session.context.reOfferedDayLabel;
    delete session.context.reBookingSetup;
    delete session.context.selectedDate;
    delete session.context.selectedTime;
    delete session.context.reHistory;
    delete session.context.reInterestPropertyId;
  }

  if (!(await underLlmBudget(session, organizationId, supabase))) {
    console.warn("[realestate] LLM budget exceeded for org", organizationId, "— falling back to classic flow");
    return null;
  }

  try {
    if (state === "realestate_booking") return await handleRealEstateBooking(args, null);
    return await handleRealEstateChat(args);
  } catch (e) {
    console.error("[realestate] Unexpected error, falling back to classic flow:", e);
    return null;
  }
}

// ============================================================================
// CHAT (estado realestate_chat + entrada desde greeting/main_menu)
// ============================================================================

async function handleRealEstateChat(args: SdrArgs): Promise<SdrBotResponse | null> {
  const { session, messageText } = args;

  const property = await loadProperty(args);
  if (!property) {
    const msg = "Hola! Sobre cuál propiedad es su consulta? Puede darme el código (ej. COD-104) 😊";
    pushReHistory(session, messageText, msg);
    return { message: msg, requiresInput: true, nextState: "realestate_chat", sessionComplete: false, showMenuHint: false };
  }

  const agentName = await loadAgentName(args);
  const system = buildRealEstateSystemPrompt(property, agentName);
  const messages = [...reHistoryOf(session), { role: "user" as const, content: messageText }];
  const out = await callRealEstateLLM(args, system, messages);
  if (!out) return null;

  // Guard de precio: acotado al precio real de ESTA propiedad (una sola, no
  // catalogo) — igual que el guard de SDR, nunca confiar ciegamente en el LLM.
  const price = checkPriceGuard(out.reply, property.price != null ? [property.price] : []);
  if (!price.ok) {
    console.error("[realestate] GUARD_BLOCKED precio:", JSON.stringify({ violations: price.violations, reply: out.reply.slice(0, 300) }));
    return await silentReHandoff(args, "guard_precio_bloqueado");
  }

  // Ya tiene visita agendada y quiere gestionarla — el flujo clasico ya sabe
  // reagendar/cancelar (confirmado reusable 10 Ago), no se duplica esa logica.
  if (out.intent === "gestion_visita") return null;

  if (out.needs_handoff) return await silentReHandoff(args, out.handoff_reason ?? "pidio_humano");

  const passiveIntent = ["ack", "rechazo", "futuro", "humano"].includes(out.intent);
  const wantsBooking = !passiveIntent &&
    (out.intent === "agendar" || !!out.booking?.date_text || !!out.booking?.chosen_time);

  if (wantsBooking) {
    if (property.status !== "disponible" && property.status !== "reservada") {
      const msg = "Justo esta propiedad ya no está disponible — le puedo ayudar con alguna otra?";
      pushReHistory(session, messageText, msg);
      return { message: msg, requiresInput: true, nextState: "realestate_chat", sessionComplete: false, showMenuHint: false };
    }
    await updateLeadStage(args, out.lead_stage, null);
    session.context.reSelectedPropertyId = property.id;
    return await handleRealEstateBooking(args, out);
  }

  await updateLeadStage(args, out.lead_stage, null);
  pushReHistory(session, messageText, out.reply);
  return {
    message: out.reply,
    requiresInput: true,
    nextState: out.lead_stage === "perdido" ? "completed" : "realestate_chat",
    sessionComplete: out.lead_stage === "perdido",
    showMenuHint: false,
  };
}

// ============================================================================
// BOOKING (estado realestate_booking)
// ============================================================================

async function handleRealEstateBooking(args: SdrArgs, fromChat: RealEstateLLMOutput | null): Promise<SdrBotResponse | null> {
  const { session, messageText, deps } = args;

  // Setup una sola vez: Bruno opera solo (Fase 0) — sin eleccion de
  // profesional, resuelve directo su unica fila de doctors.
  if (!session.context.reBookingSetup) {
    const agent = await loadSoleAgentDoctor(args);
    if (!agent) return await silentReHandoff(args, "sin_profesional_configurado");
    session.context.doctorId = agent.id;
    session.context.calendarId = agent.calendarId ?? undefined;
    session.context.doctorName = agent.name;
    session.context.reBookingSetup = true;
  }

  // Intento deterministico de eleccion de hora (sin LLM) — mismo criterio que sdr.ts.
  const offered: string[] = session.context.reOfferedSlots || [];
  if (offered.length > 0 && !fromChat) {
    const idx = matchOfferedSlot(messageText, offered, deps);
    if (idx !== null) return await acceptRealEstateSlot(args, offered[idx]);

    const requestedTime = deps.parseTimeHint(messageText);
    if (requestedTime && session.context.selectedDate) {
      const fullDaySlots = await fetchSlotsForDate(args, session.context.selectedDate);
      if (fullDaySlots.includes(requestedTime)) return await acceptRealEstateSlot(args, requestedTime);
      if (fullDaySlots.length > 0) {
        const picked = pickSlots(fullDaySlots, null, requestedTime);
        session.context.reOfferedSlots = picked;
        const formatted = picked.map(formatTimeForTemplate);
        const msg = `A las ${formatTimeForTemplate(requestedTime)} no tengo espacio ese día, pero sí tengo ${formatted.join(" o ")}. Le sirve alguna?`;
        pushReHistory(session, messageText, msg);
        return { message: msg, requiresInput: true, nextState: "realestate_booking", sessionComplete: false, showMenuHint: false };
      }
    }
  }

  // Entender el mensaje con LLM (con los slots ofrecidos en el prompt si existen).
  let out = fromChat;
  if (!out) {
    const property = await loadProperty(args);
    if (!property) return null;
    const agentName = await loadAgentName(args);
    const system = buildRealEstateSystemPrompt(property, agentName, offered.length > 0
      ? { offeredSlots: offered.map(formatTimeForTemplate), offeredDayLabel: session.context.reOfferedDayLabel }
      : undefined);
    const messages = [...reHistoryOf(session), { role: "user" as const, content: messageText }];
    out = await callRealEstateLLM(args, system, messages);
    if (!out) return null;
  }

  if (out.needs_handoff) return await silentReHandoff(args, out.handoff_reason ?? "pidio_humano");

  if (out.booking?.chosen_time && offered.length > 0) {
    const idx = matchOfferedSlot(out.booking.chosen_time, offered, deps);
    if (idx !== null) return await acceptRealEstateSlot(args, offered[idx]);
  }

  const dateText = out.booking?.date_text ?? null;
  if (dateText || !session.context.reOfferedSlots) {
    const hint = dateText
      ? deps.parseDateHint(dateText) ?? deps.parseDateHint(messageText)
      : deps.parseDateHint(messageText);
    if (!hint) {
      return {
        message: "Para qué día le gustaría la visita — mañana, el viernes, o dígame la fecha 😊",
        requiresInput: true, nextState: "realestate_booking", sessionComplete: false, showMenuHint: false,
      };
    }
    const preferredTime = out.booking?.time_text ? deps.parseTimeHint(out.booking.time_text) : null;
    return await offerRealEstateSlots(args, hint.toISODate(), out.booking?.period ?? null, preferredTime);
  }

  const time = checkTimeGuard(out.reply, offered);
  if (!time.ok) {
    console.error("[realestate] GUARD_BLOCKED horario:", JSON.stringify({ violations: time.violations, reply: out.reply.slice(0, 300) }));
    return await silentReHandoff(args, "guard_horario_bloqueado");
  }
  pushReHistory(session, messageText, out.reply);
  return { message: out.reply, requiresInput: true, nextState: "realestate_booking", sessionComplete: false, showMenuHint: false };
}

/** Busca slots para la fecha (o los dias siguientes) y redacta la oferta — mismo criterio que sdr.ts. */
async function offerRealEstateSlots(
  args: SdrArgs,
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
    const connecting = session.context.handoffLabels?.connecting || "el agente";
    return {
      message: `⚠️ No encontramos disponibilidad en los próximos días.\n\nConectando con ${connecting}...`,
      requiresInput: false, nextState: "handoff_secretary", sessionComplete: true,
    };
  }

  const dayMoved = date !== isoDate;
  const dayLabel = DateTime.fromISO(date, { zone: TIMEZONE }).setLocale("es").toFormat("EEEE d 'de' MMMM");
  session.context.selectedDate = date;
  session.context.reOfferedDayLabel = dayLabel;

  if (preferredTime && !dayMoved && slots.includes(preferredTime)) {
    return await acceptRealEstateSlot(args, preferredTime);
  }

  const picked = preferredTime ? pickSlots(slots, period, preferredTime) : pickSlots(slots, period);
  session.context.reOfferedSlots = picked;

  const formatted = picked.map(formatTimeForTemplate);
  const reply = `${dayMoved ? `Fíjese que para el día que me pidió no tengo espacio, pero para *${dayLabel}* sí 😊 ` : `Para *${dayLabel}* tengo disponible: `}${formatted.join(" y ")}. Cuál le queda mejor?`;

  pushReHistory(session, messageText, reply);
  return { message: reply, requiresInput: true, nextState: "realestate_booking", sessionComplete: false, showMenuHint: false };
}

/** Hora elegida -> confirmacion clasica (booking_confirm crea la cita, mismo camino que SDR). */
async function acceptRealEstateSlot(args: SdrArgs, selectedTime: string): Promise<SdrBotResponse> {
  const { session, messageText } = args;
  session.context.selectedTime = selectedTime;

  const dayLabel = session.context.reOfferedDayLabel ||
    DateTime.fromISO(session.context.selectedDate, { zone: TIMEZONE }).setLocale("es").toFormat("EEEE d 'de' MMMM");

  const msg = `Perfecto 😊 Le confirmo la visita: *${dayLabel}* a las *${formatTimeForTemplate(selectedTime)}*. Se la confirmo?`;
  pushReHistory(session, messageText, msg);
  return { message: msg, requiresInput: true, nextState: "booking_confirm", sessionComplete: false, showMenuHint: false };
}

// ============================================================================
// HELPERS
// ============================================================================

/** Resuelve (y cachea en sesion) el interest_property_id de la conversacion — mismo patron que sdrInterestServiceId. */
async function resolveInterestPropertyId(args: SdrArgs): Promise<string | null> {
  if (args.session.context.reInterestPropertyId !== undefined) {
    return args.session.context.reInterestPropertyId;
  }
  const conversationId = await resolveConversationId(args);
  if (!conversationId) return null;
  const { data } = await args.supabase
    .from("conversations")
    .select("interest_property_id")
    .eq("id", conversationId)
    .maybeSingle();
  const id = data?.interest_property_id ?? null;
  args.session.context.reInterestPropertyId = id;
  return id;
}

async function loadProperty(args: SdrArgs): Promise<(RealEstatePropertyInfo & { id: string }) | null> {
  const propertyId = selectedOrInterestPropertyId(args);
  const id = propertyId ?? (await resolveInterestPropertyId(args));
  if (!id) return null;
  const property = await getPropertyById(args.supabase, args.organizationId, id);
  if (!property) return null;
  return {
    id: property.id,
    code: property.code,
    title: property.title,
    propertyType: property.property_type,
    zone: property.zone,
    price: property.price,
    currency: property.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    sizeVaras: property.size_varas,
    constructionSizeM2: property.construction_size_m2,
    parkingSpots: property.parking_spots,
    frontYard: property.front_yard,
    backYard: property.back_yard,
    status: property.status,
  };
}

/** Si ya se fijo una propiedad para esta sesion de booking, priorizarla sobre el interest_property_id actual de la conversacion. */
function selectedOrInterestPropertyId(args: SdrArgs): string | null {
  return args.session.context.reSelectedPropertyId ?? null;
}

/** Nombre del agente para el prompt — org de un solo profesional (Fase 0). */
async function loadAgentName(args: SdrArgs): Promise<string> {
  const { data: org } = await args.supabase
    .from("organizations")
    .select("name")
    .eq("id", args.organizationId)
    .single();
  return org?.name ?? "el agente";
}

/**
 * El unico profesional de la org (Bruno opera solo, Fase 0) — resuelve
 * doctorId/calendarId para agendar. El calendario NO cuelga directo de
 * doctors (calendars no tiene doctor_id) — se resuelve via los mismos deps
 * inyectados que usa el flujo clasico/SDR: preferencia de la linea
 * (whatsapp_line_doctors) con fallback al primer calendario activo
 * (calendar_doctors) — mismo criterio que acceptSlot en sdr.ts.
 */
async function loadSoleAgentDoctor(args: SdrArgs): Promise<{ id: string; name: string; calendarId: string | null } | null> {
  const { data: doctor } = await args.supabase
    .from("doctors")
    .select("id, name, prefix")
    .eq("organization_id", args.organizationId)
    .limit(1)
    .maybeSingle();
  if (!doctor) return null;
  const calendarId =
    (await args.deps.lineCalendarForDoctor(args.supabase, args.whatsappLineId, doctor.id)) ??
    (await args.deps.firstActiveCalendarId(args.supabase, doctor.id)) ??
    null;
  return {
    id: doctor.id,
    name: doctor.prefix ? `${doctor.prefix} ${doctor.name}` : doctor.name,
    calendarId,
  };
}

async function callRealEstateLLM(
  args: SdrArgs,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<RealEstateLLMOutput | null> {
  const { organizationId, supabase } = args;
  const conversationId = await resolveConversationId(args);

  for (const { provider, model } of [RE_PRIMARY, RE_FALLBACK]) {
    const result: LLMResult = await callLLM({ provider, model, system, messages, maxTokens: MAX_LLM_TOKENS, temperature: 0 });
    logLLMCall(supabase, { organizationId, conversationId, purpose: "reply", provider, model, result })
      .catch(() => {});
    if (result.ok) {
      const out = parseRealEstateOutput(result.text);
      if (out) return out;
      console.warn(`[realestate] ${model} returned unparseable output, trying next`);
    } else {
      console.warn(`[realestate] ${model} call failed:`, result.error);
    }
  }
  return null;
}

async function silentReHandoff(args: SdrArgs, reason: string): Promise<SdrBotResponse> {
  const { session, deps, supabase, organizationId } = args;
  await updateLeadStage(args, "handoff", null);
  await deps.handleHandoffToSecretary(
    args.whatsappLineId, args.patientPhone, organizationId, supabase, args.handoffLabels, session.context, session.id,
  );
  console.log("[realestate] silent handoff:", reason);
  return { message: "", requiresInput: false, nextState: "handoff_secretary", sessionComplete: true, skipDefaultSend: true };
}

function reHistoryOf(session: Any): { role: "user" | "assistant"; content: string }[] {
  return session.context.reHistory || [];
}

function pushReHistory(session: Any, userMsg: string, botReply: string): void {
  const history = reHistoryOf(session);
  history.push({ role: "user", content: userMsg }, { role: "assistant", content: botReply });
  session.context.reHistory = history.slice(-MAX_HISTORY);
}
