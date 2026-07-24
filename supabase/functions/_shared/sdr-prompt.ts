/**
 * Prompt del bot SDR v0 + contrato de salida del LLM.
 * Fase 2 del bot SDR híbrido (plan: .claude/plans/atomic-sauteeing-hummingbird.md).
 *
 * El prompt se arma 100% server-side con datos de la plataforma (service_types,
 * bot_faqs, whatsapp_lines) — el LLM jamás ve conocimiento que no esté en la BD.
 * El LLM solo ENTIENDE y REDACTA; las acciones (slots, citas) las decide la
 * máquina de estados (integración en fase posterior).
 *
 * Guión base: el flujo validado por la Dra. Hanoy en ~100 conversaciones reales
 * (saludo → calificar tratamiento → precio público o evaluación → ofrecer agendar).
 */

// deno-lint-ignore-file no-explicit-any

export const SDR_INTENTS = [
  "saludo", // CTA del ad / saludo sin pregunta concreta
  "precio", // pregunta cuánto cuesta algo
  "info_servicio", // pregunta clínica o de detalle del tratamiento / describe su caso
  "logistica", // ubicación, horarios, parqueo, formas de pago
  "agendar", // quiere cita
  "gestion_cita", // ya tiene cita: reagendar / cancelar / confirmar / aviso
  "ack", // ok / gracias / perfecto
  "rechazo", // no le interesa (explícito)
  "futuro", // volverá después ("cuando junte el dinero", "cuando regrese")
  "humano", // pide hablar con una persona
  "otro",
] as const;
export type SdrIntent = (typeof SDR_INTENTS)[number];

/** Mismos valores que el CHECK de conversations.lead_stage (migración bot_sdr_01). */
export const LEAD_STAGES = [
  "nuevo",
  "calificando",
  "cotizado",
  "agendado",
  "seguimiento",
  "handoff",
  "perdido",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export interface SdrLLMOutput {
  intent: SdrIntent;
  /** id de service_types si identificó el tratamiento de interés. */
  service_id: string | null;
  lead_stage: LeadStage;
  needs_handoff: boolean;
  handoff_reason: string | null;
  /** Respuesta redactada para el paciente (máx 3-4 líneas). */
  reply: string;
}

export interface SdrService {
  id: string;
  name: string;
  price: number | null;
  priceIsPublic: boolean;
  durationMinutes: number | null;
}

export interface SdrContext {
  organizationId: string;
  organizationName: string;
  whatsappLineId: string;
  greeting: string | null;
  services: SdrService[];
  faqs: { question: string; answer: string }[];
}

/**
 * Carga la config de la línea desde la BD. Catálogo ORG-LEVEL, mismo criterio
 * que bot-handler (decisión 2 Jun: el bot ofrece todos los servicios activos
 * del org, no filtra por línea).
 */
export async function buildSdrContext(
  supabase: any,
  whatsappLineId: string,
): Promise<SdrContext | null> {
  const { data: line, error: lineErr } = await supabase
    .from("whatsapp_lines")
    .select("id, organization_id, bot_greeting")
    .eq("id", whatsappLineId)
    .single();
  if (lineErr || !line) {
    console.error("[sdr-prompt] line not found:", whatsappLineId, lineErr?.message);
    return null;
  }

  const [{ data: org }, { data: services }, { data: faqs }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", line.organization_id).single(),
    supabase
      .from("service_types")
      .select("id, display_name, price, price_is_public, duration_minutes")
      .eq("organization_id", line.organization_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("bot_faqs")
      .select("question, answer")
      .eq("organization_id", line.organization_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ]);

  return {
    organizationId: line.organization_id,
    organizationName: org?.name ?? "la clínica",
    whatsappLineId: line.id,
    greeting: line.bot_greeting ?? null,
    services: (services ?? []).map((s: any) => ({
      id: s.id,
      name: s.display_name,
      price: s.price ?? null,
      priceIsPublic: s.price_is_public ?? false,
      durationMinutes: s.duration_minutes ?? null,
    })),
    faqs: (faqs ?? []).map((f: any) => ({ question: f.question, answer: f.answer })),
  };
}

/** Catálogo en texto para el prompt: la política de precio es POR servicio. */
function catalogBlock(services: SdrService[]): string {
  if (services.length === 0) return "(la clínica aún no configuró servicios)";
  return services
    .map((s) => {
      const price = s.priceIsPublic && s.price != null
        ? `precio L${s.price}`
        : "precio: se determina en la cita de evaluación (NO dar cifras)";
      return `- ${s.name} [id: ${s.id}] — ${price}`;
    })
    .join("\n");
}

function faqBlock(faqs: { question: string; answer: string }[]): string {
  if (faqs.length === 0) return "(sin preguntas frecuentes configuradas)";
  return faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n");
}

export function buildSdrSystemPrompt(ctx: SdrContext): string {
  return `Sos la asistente virtual de ${ctx.organizationName}, una clínica en Honduras. Atendés WhatsApp: leads que llegan de publicidad y pacientes. Tu objetivo es que cada lead termine con una cita agendada.

## Cómo hablás
- Español hondureño natural, trato de "usted", cálido y profesional. Nada robótico.
- Máximo 3-4 líneas por mensaje. Sin párrafos largos, sin listas salvo que ayuden.
- Entendé typos y lenguaje coloquial ("clnsulta"=consulta, "ebaluasion"=evaluación, "fíjese que...", "ahí estaré").

## Tu guión (en este orden, sin saltarte pasos)
1. Si solo saludan o piden "más información": saludá y preguntá en qué tratamiento está interesado/a.
2. Si preguntan precio: respondé SOLO según el catálogo de abajo. Si el servicio dice "se determina en la cita de evaluación", explicá eso con naturalidad (cada caso es distinto, la doctora lo evalúa y le da plan y presupuesto exacto).
3. SIEMPRE cerrá tu mensaje ofreciendo el siguiente paso, normalmente agendar: "¿Le gustaría que le agende su cita?". Nunca dejés un precio o respuesta sin cierre.
4. Si describen su caso clínico (piezas que faltan, dolor, condiciones): NO des opinión clínica. Respondé que justamente eso se determina en la evaluación, y ofrecé agendar.

## Reglas duras (nunca las rompas)
- JAMÁS inventés precios, servicios, promociones ni horarios que no estén en este prompt.
- CERO criterio clínico: no diagnostiqués, no recomendés tratamientos, no opinés si algo "le sirve".
- Si mencionan una condición médica delicada (embarazo, cáncer/oncológico, cirugías recientes, menores con condiciones): needs_handoff=true y decile que la doctora le responderá personalmente.
- Si piden hablar con una persona: needs_handoff=true, confirmáselo explícitamente.
- Si dicen que no les interesa: aceptalo con amabilidad, sin insistir (lead_stage=perdido).
- Si dicen que volverán después ("cuando junte el dinero", "cuando regrese a la ciudad"): respondé cálido dejando la puerta abierta (lead_stage=seguimiento).

## Etapas del embudo (lead_stage) — cómo asignarla
- "nuevo": primer contacto, todavía sin conversación útil.
- "calificando": aún estás identificando qué tratamiento le interesa.
- "cotizado": ya respondiste el tema de precio (con cifra o con "se determina en la evaluación").
- "agendado": NUNCA la declarés vos — la asigna la plataforma cuando la cita queda creada. Si el paciente quiere agendar, mantené la etapa en la que estaba.
- "seguimiento": dijo que volverá después (tiempo, dinero, viaje).
- "handoff": lo estás pasando a un humano (needs_handoff=true).
- "perdido": rechazo explícito.

## Catálogo de servicios (única fuente de precios)
${catalogBlock(ctx.services)}

## Preguntas frecuentes de la clínica (respondé con esta información, sin inventar)
${faqBlock(ctx.faqs)}

## Formato de salida
Respondé ÚNICAMENTE un objeto JSON válido, sin texto antes ni después, sin markdown:
{
  "intent": "saludo|precio|info_servicio|logistica|agendar|gestion_cita|ack|rechazo|futuro|humano|otro",
  "service_id": "<id del catálogo si identificaste el tratamiento de interés, si no null>",
  "lead_stage": "nuevo|calificando|cotizado|agendado|seguimiento|handoff|perdido",
  "needs_handoff": true|false,
  "handoff_reason": "<motivo corto si needs_handoff, si no null>",
  "reply": "<tu mensaje para el paciente>"
}`;
}

/**
 * Parser tolerante de la salida del LLM: acepta fences de markdown y texto
 * alrededor; valida enums contra los valores reales (lead_stage = CHECK de BD).
 * Retorna null si no hay JSON utilizable — el caller decide el fallback.
 */
export function parseSdrOutput(text: string | null): SdrLLMOutput | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  const intent = SDR_INTENTS.includes(parsed.intent) ? parsed.intent : null;
  const leadStage = LEAD_STAGES.includes(parsed.lead_stage) ? parsed.lead_stage : null;
  const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
  if (!intent || !leadStage || !reply) return null;

  return {
    intent,
    service_id: typeof parsed.service_id === "string" && parsed.service_id ? parsed.service_id : null,
    lead_stage: leadStage,
    needs_handoff: parsed.needs_handoff === true,
    handoff_reason:
      typeof parsed.handoff_reason === "string" && parsed.handoff_reason
        ? parsed.handoff_reason
        : null,
    reply,
  };
}
