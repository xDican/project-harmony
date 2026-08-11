/**
 * Prompt del bot de bienes raices (piloto Bruno, 10 Ago 2026) + contrato de
 * salida del LLM. Paralelo a sdr-prompt.ts (medicina) — NO lo modifica, NO lo
 * importa. Bloques de persona (tono, agendamiento, anti-alucinacion) copiados
 * y adaptados de buildSdrSystemPrompt; el conocimiento es una sola propiedad,
 * no un catalogo. Ver CLAUDE.md / memoria piloto-bienes-raices-bruno.md.
 *
 * Alcance MVP (Fase 0, 8 Ago + Fase 3, 10 Ago): calificar + agendar visita.
 * Sin FAQ, sin gestion de visita propia (reagendar/cancelar cae al flujo
 * clasico del bot).
 */

export const REALESTATE_INTENTS = [
  "saludo",
  "precio",
  "info_propiedad",
  "agendar",
  "gestion_visita", // ya tiene visita agendada — el caller cae al flujo clasico
  "ack",
  "rechazo",
  "futuro",
  "humano",
  "otro",
] as const;
export type RealEstateIntent = (typeof REALESTATE_INTENTS)[number];

/** Mismos valores que conversations.lead_stage (CHECK compartido con medicina). */
export const REALESTATE_LEAD_STAGES = [
  "nuevo",
  "calificando",
  "cotizado",
  "agendado",
  "seguimiento",
  "handoff",
  "perdido",
] as const;
export type RealEstateLeadStage = (typeof REALESTATE_LEAD_STAGES)[number];

export interface RealEstateBooking {
  date_text: string | null;
  period: "morning" | "afternoon" | null;
  chosen_time: string | null;
  time_text: string | null;
}

export interface RealEstateLLMOutput {
  intent: RealEstateIntent;
  lead_stage: RealEstateLeadStage;
  needs_handoff: boolean;
  handoff_reason: string | null;
  /** Respuesta redactada para el lead (max 3-4 lineas). */
  reply: string;
  booking: RealEstateBooking | null;
}

export interface RealEstatePropertyInfo {
  code: string;
  title: string;
  propertyType: string;
  zone: string | null;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeVaras: number | null;
  constructionSizeM2: number | null;
  parkingSpots: number | null;
  frontYard: boolean;
  backYard: boolean;
  /** disponible|reservada|vendida|inactiva — CHECK de properties.status. */
  status: string;
}

export interface RealEstatePromptOptions {
  /** Slots REALES ofrecidos este turno ("h:mm AM/PM"). El LLM solo puede mencionar estos. */
  offeredSlots?: string[];
  offeredDayLabel?: string;
}

function fichaBlock(p: RealEstatePropertyInfo): string {
  const lines = [
    `Codigo: ${p.code}`,
    `Titulo: ${p.title}`,
    `Tipo: ${p.propertyType}`,
    p.zone ? `Zona: ${p.zone}` : null,
    p.price != null ? `Precio: ${p.currency} ${p.price.toLocaleString("es-HN")}` : "Precio: a consultar",
    p.bedrooms != null ? `Habitaciones: ${p.bedrooms}` : null,
    p.bathrooms != null ? `Banos: ${p.bathrooms}` : null,
    p.sizeVaras != null ? `Terreno: ${p.sizeVaras} varas cuadradas` : null,
    p.constructionSizeM2 != null ? `Construccion: ${p.constructionSizeM2} m2` : null,
    p.parkingSpots != null ? `Parqueos: ${p.parkingSpots}` : null,
    p.frontYard || p.backYard
      ? `Patio: ${[p.frontYard && "frontal", p.backYard && "trasero"].filter(Boolean).join(" y ")}`
      : null,
  ].filter((l): l is string => !!l);
  return lines.join("\n");
}

export function buildRealEstateSystemPrompt(
  property: RealEstatePropertyInfo,
  agentName: string,
  opts?: RealEstatePromptOptions,
): string {
  const now = new Date();
  // Fecha actual Honduras (UTC-6 fijo, sin DST) — mismo criterio que sdr-prompt.ts.
  const hn = new Date(now.getTime() - 6 * 3600 * 1000);
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const hoyLabel = `${dias[hn.getUTCDay()]} ${hn.getUTCDate()} de ${meses[hn.getUTCMonth()]} de ${hn.getUTCFullYear()}`;

  const notAvailable = property.status !== "disponible" && property.status !== "reservada";

  const slotsBlock = opts?.offeredSlots?.length
    ? `\n## Horarios disponibles OFRECIDOS en este turno (${opts.offeredDayLabel ?? "día elegido"})
${opts.offeredSlots.join(", ")}
Estos son los ÚNICOS horarios que podés mencionar. Si el lead pide otro, ofrecé el más cercano DE ESTA LISTA o decile que consultás otro día. Si elige uno, ponelo en booking.chosen_time (formato del listado).`
    : "";

  const availabilityBlock = notAvailable
    ? `\n## IMPORTANTE — Esta propiedad YA NO ESTÁ DISPONIBLE\nAvisale al lead con amabilidad que esta propiedad ya no está disponible — NUNCA ofrezcas agendar una visita ni menciones horarios. intent="otro", lead_stage="perdido", needs_handoff=false.`
    : "";

  return `Sos la asistente virtual de ${agentName}, agente inmobiliario en Honduras. Atendés WhatsApp: leads que llegan de publicidad sobre una propiedad puntual. Tu objetivo es que el lead agende una visita a la propiedad. Hoy es ${hoyLabel} (hora de Honduras).

## Cómo hablás
- Español hondureño natural, trato de "usted", cálido y profesional. Nada robótico.
- Máximo 3-4 líneas por mensaje. Sin párrafos largos, sin listas salvo que ayuden.
- NUNCA uses el signo de apertura ¿ — solo el de cierre (?), como escribe la gente real por WhatsApp.
- Directo, sin explicaciones de más. Hablás con adultos, no con niños.
- MAYÚSCULAS no indican enojo — es énfasis o que el teclado quedó en bloqueo. Nunca respondas como si el lead estuviera molesto solo por eso.

## Reglas duras (nunca las rompas)
- JAMÁS inventés specs, precio, ubicación ni disponibilidad que no estén en la ficha de abajo.
- Si preguntan algo de la propiedad que NO está en la ficha, decilo con naturalidad ("eso se lo confirma ${agentName} directo") — nunca lo inventés.
- Si piden hablar con una persona: needs_handoff=true, confirmáselo explícitamente.
- Si dicen que no les interesa: aceptalo con amabilidad, sin insistir (lead_stage=perdido).
- Si dicen que volverán después ("cuando junte el dinero", "voy a pensarlo"): respondé cálido dejando la puerta abierta (lead_stage=seguimiento).
${availabilityBlock}

## Etapas del embudo (lead_stage) — cómo asignarla
- "nuevo": primer contacto, todavía sin conversación útil.
- "calificando": identificando qué le interesa de la propiedad.
- "cotizado": ya respondiste el tema de precio.
- "agendado": NUNCA la declarés vos — la asigna la plataforma cuando la visita queda creada.
- "seguimiento": dijo que volverá después.
- "handoff": lo estás pasando a un humano (needs_handoff=true).
- "perdido": rechazo explícito, o propiedad ya no disponible.

## Agendamiento (cómo manejar fechas y horarios)
- Vos NUNCA inventás ni calculás horarios — la plataforma te da los horarios reales cuando toca ofrecerlos.
- Cuando el lead exprese CUÁNDO quiere la visita, copiá su expresión textual en booking.date_text ("mañana", "el viernes", "3 de agosto") y la franja en booking.period ("morning"/"afternoon") si la dijo. No la conviertas a fecha.
- Si además menciona una HORA específica por su cuenta ("a las 3", "tiene espacio a las 10am?"), copiala tal cual en booking.time_text — incluso si todavía no le has ofrecido nada.
- Cuando el lead elija una hora de las ofrecidas, ponela en booking.chosen_time.
- Ofrecé máximo 2-3 horarios por mensaje, como lo haría una persona.
${slotsBlock}

## Ficha de la propiedad (única fuente de información — nunca inventes nada fuera de esto)
${fichaBlock(property)}

## Formato de salida
Respondé ÚNICAMENTE un objeto JSON válido, sin texto antes ni después, sin markdown:
{
  "intent": "saludo|precio|info_propiedad|agendar|gestion_visita|ack|rechazo|futuro|humano|otro",
  "lead_stage": "nuevo|calificando|cotizado|agendado|seguimiento|handoff|perdido",
  "needs_handoff": true|false,
  "handoff_reason": "<motivo corto si needs_handoff, si no null>",
  "reply": "<tu mensaje para el lead>",
  "booking": { "date_text": "<expresión textual del lead o null>", "period": "morning|afternoon|null", "chosen_time": "<hora elegida de las ofrecidas o null>", "time_text": "<hora específica que pidió por su cuenta, antes de ofrecerle nada, o null>" }
}`;
}

/**
 * Parser tolerante de la salida del LLM — mismo criterio que parseSdrOutput
 * (acepta fences de markdown y texto alrededor, valida enums).
 */
export function parseRealEstateOutput(text: string | null): RealEstateLLMOutput | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  // deno-lint-ignore no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  const intent = REALESTATE_INTENTS.includes(parsed.intent) ? parsed.intent : null;
  const leadStage = REALESTATE_LEAD_STAGES.includes(parsed.lead_stage) ? parsed.lead_stage : null;
  const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
  if (!intent || !leadStage || !reply) return null;

  let booking: RealEstateLLMOutput["booking"] = null;
  if (parsed.booking && typeof parsed.booking === "object") {
    const b = parsed.booking;
    booking = {
      date_text: typeof b.date_text === "string" && b.date_text ? b.date_text : null,
      period: b.period === "morning" || b.period === "afternoon" ? b.period : null,
      chosen_time: typeof b.chosen_time === "string" && b.chosen_time ? b.chosen_time : null,
      time_text: typeof b.time_text === "string" && b.time_text ? b.time_text : null,
    };
    if (!booking.date_text && !booking.period && !booking.chosen_time && !booking.time_text) booking = null;
  }

  return {
    intent,
    lead_stage: leadStage,
    needs_handoff: parsed.needs_handoff === true,
    handoff_reason: typeof parsed.handoff_reason === "string" && parsed.handoff_reason ? parsed.handoff_reason : null,
    reply,
    booking,
  };
}
