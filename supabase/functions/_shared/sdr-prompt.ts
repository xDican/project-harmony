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

import { formatTimeForTemplate } from "./datetime.ts";
import { loadSchedulesAllDows } from "./availability.ts";

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
  /**
   * Preferencia de agendamiento extraída (Fase 2b). El LLM NUNCA calcula
   * fechas: `date_text` es la expresión del paciente tal cual ("mañana",
   * "el viernes", "3 de agosto") — el backend la resuelve con parseDateHint.
   * `chosen_time` solo cuando el paciente elige una hora YA ofrecida.
   */
  booking?: {
    date_text: string | null;
    period: "morning" | "afternoon" | null;
    chosen_time: string | null;
    /**
     * Hora ESPECÍFICA que el paciente mencionó por su cuenta ("a las 3",
     * "tiene espacio a las 10am?"), ANTES de que se le ofreciera nada — nunca
     * confundir con `chosen_time` (esa es solo al elegir de horarios YA
     * ofrecidos). El backend la resuelve con parseTimeHint y prioriza slots
     * reales cercanos a esa hora en la primera oferta.
     */
    time_text: string | null;
  } | null;
}

export interface SdrService {
  id: string;
  name: string;
  price: number | null;
  /**
   * "¿Se puede cotizar sin evaluación previa?" — derivado de requires_prior_consult,
   * NUNCA de service_types.price_is_public (columna redundante desde 24 Jul: si el
   * servicio requiere consulta previa, el precio real depende de lo que el médico
   * decida en esa cita — no hay caso real en la plataforma donde un precio cargado
   * deba ocultarse SIN requerir consulta previa, ni viceversa. Confirmado con Diego
   * contra los datos reales de las 3 orgs configuradas ese día — cero excepciones).
   */
  requiresPriorConsult: boolean;
  durationMinutes: number | null;
}

export interface SdrDoctorInfo {
  name: string;
  specialty: string | null;
  /** Patrón semanal recurrente formateado ("Lunes a martes: 8:00 AM a 5:00 PM") o null si no hay horario configurado. */
  schedule: string | null;
}

export interface SdrContext {
  organizationId: string;
  organizationName: string;
  whatsappLineId: string;
  greeting: string | null;
  services: SdrService[];
  faqs: { question: string; answer: string }[];
  /** Profesionales activos con su horario recurrente real (fuente: doctor_schedules). */
  doctors: SdrDoctorInfo[];
}

/**
 * Dominios donde YA existe una tabla que el sistema usa activamente como
 * fuente de verdad — el SDR debe ignorar cualquier FAQ que los toque, sin
 * importar qué diga, para que un dato desactualizado nunca contradiga la
 * plataforma real. Hallazgo 24 Jul 2026: FAQ de horario decía "lunes a
 * viernes" mientras el horario real (doctor_schedules) era lunes-martes
 * solamente — y Ecoclinicas tenía 2 FAQs de horario CONTRADICTORIAS entre sí.
 * Auditoría completa de bot_faqs (todas las orgs) confirmó 3 dominios de riesgo:
 * horario (doctor_schedules), precio (service_types — ya tenía guard reactivo,
 * esto lo hace preventivo) y especialidad/nombres de doctor (doctors+specialties).
 * Ubicación, formas de pago y políticas generales NO tienen tabla real detrás
 * en la práctica (clinics.address casi siempre NULL) — esas SÍ siguen siendo FAQ.
 */
const STRUCTURED_DOMAIN_PATTERNS: { domain: string; re: RegExp }[] = [
  { domain: "horario", re: /horario|hora de atenci[oó]n|atienden.*(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo)|qu[ée] d[ií]as.*atienden/i },
  { domain: "precio", re: /precio|costo|cu[aá]nto (cuesta|vale)|cu[aá]l es el (costo|precio)/i },
  { domain: "especialidad", re: /especialidad|son (dermat[oó]logas?|pediatras?|odont[oó]logas?|especialistas)|qui[eé]n(es)? (es|son) (el|la|los|las) doctor/i },
];

/** Filtra FAQs que dupliquen un dominio con tabla real. Loguea qué excluyó (auditable, no silencioso). */
function filterStructuredDomainFaqs(
  faqs: { question: string; answer: string }[],
  organizationId: string,
): { question: string; answer: string }[] {
  const kept: { question: string; answer: string }[] = [];
  for (const f of faqs) {
    const hit = STRUCTURED_DOMAIN_PATTERNS.find((p) => p.re.test(f.question));
    if (hit) {
      console.warn(`[sdr-prompt] FAQ excluida del prompt (dominio '${hit.domain}' ya tiene fuente estructurada) org=${organizationId}: "${f.question}"`);
      continue;
    }
    kept.push(f);
  }
  return kept;
}

/**
 * Segunda capa, complementaria a la de arriba: cruce de CONTENIDO contra el
 * catálogo real. El filtro de dominio solo mira palabras clave en la PREGUNTA
 * ("precio", "horario"...) — se le escapa una FAQ como "¿Cual es el
 * blanquemiento?" (sin esas palabras) cuya RESPUESTA cotiza un tratamiento que
 * no existe en el catálogo de esa org. Auditoría 24 Jul confirmó el patrón en
 * 2 orgs reales (demo + Dr. Wilmer Guevara — cliente pagando).
 *
 * Heurística agnóstica al rubro: el "vocabulario" de tratamientos se construye
 * de los nombres REALES de servicios de TODA la plataforma (no una lista fija
 * hardcodeada), excluyendo palabras genéricas de categoría. Si una FAQ
 * menciona un término que SÍ es un tratamiento conocido en la plataforma pero
 * NO está en el catálogo de ESTA org → se excluye. Es heurística, no perfecta
 * (por eso loguea qué excluyó — auditable, no silencioso).
 */
const GENERIC_CATALOG_WORDS = new Set([
  "general", "dental", "medica", "especialista", "especialistas",
  "valoracion", "servicio", "servicios", "cita", "citas", "tratamiento",
  "tratamientos", "consulta", "consultas", "procedimiento", "procedimientos",
  "examen", "examenes", "laboratorio", "ocupado", "clinica",
]);

// Rango de marcas diacríticas combinantes (U+0300-U+036F) tras NFD — mismo
// criterio de "quitar acentos" que ya usa parseDateHint en bot-handler/index.ts.
function stripAccentsLower(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Palabras distintivas (≥5 letras, sin genéricas) de un nombre de servicio. */
function significantTerms(name: string): string[] {
  return stripAccentsLower(name)
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 5 && !GENERIC_CATALOG_WORDS.has(w));
}

function filterOrphanServiceFaqs(
  faqs: { question: string; answer: string }[],
  orgTerms: Set<string>,
  globalVocab: Set<string>,
  organizationId: string,
): { question: string; answer: string }[] {
  const kept: { question: string; answer: string }[] = [];
  for (const f of faqs) {
    const words = stripAccentsLower(`${f.question} ${f.answer}`)
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 5);
    const orphan = words.find((w) => globalVocab.has(w) && !orgTerms.has(w));
    if (orphan) {
      console.warn(`[sdr-prompt] FAQ excluida del prompt (menciona '${orphan}', tratamiento conocido en la plataforma pero AUSENTE del catálogo de esta org) org=${organizationId}: "${f.question}"`);
      continue;
    }
    kept.push(f);
  }
  return kept;
}

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** Orden de lectura natural (lunes→domingo) para agrupar días consecutivos. day_of_week: 0=domingo..6=sábado (mismo criterio que doctor_schedules). */
const DIA_ORDEN = [1, 2, 3, 4, 5, 6, 0];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Lunes a martes: 8:00 AM a 5:00 PM\nSábado: 9:00 AM a 12:00 PM" — agrupa días consecutivos con mismo horario. */
function formatWeeklySchedule(rows: { day_of_week: number; start_time: string; end_time: string }[]): string | null {
  if (rows.length === 0) return null;
  const byDay = new Map<number, { start: string; end: string }>();
  for (const r of rows) byDay.set(r.day_of_week, { start: r.start_time, end: r.end_time });

  const groups: { days: number[]; start: string; end: string }[] = [];
  for (const d of DIA_ORDEN) {
    const sch = byDay.get(d);
    if (!sch) continue;
    const last = groups[groups.length - 1];
    const lastDay = last?.days[last.days.length - 1];
    const isConsecutive = last && lastDay !== undefined &&
      DIA_ORDEN[DIA_ORDEN.indexOf(lastDay) + 1] === d;
    if (last && isConsecutive && last.start === sch.start && last.end === sch.end) {
      last.days.push(d);
    } else {
      groups.push({ days: [d], start: sch.start, end: sch.end });
    }
  }

  return groups.map((g) => {
    const label = g.days.length === 1
      ? capitalize(DIAS_SEMANA[g.days[0]])
      : `${capitalize(DIAS_SEMANA[g.days[0]])} a ${DIAS_SEMANA[g.days[g.days.length - 1]]}`;
    return `${label}: ${formatTimeForTemplate(g.start)} a ${formatTimeForTemplate(g.end)}`;
  }).join("\n");
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

  const [{ data: org }, { data: services }, { data: faqs }, { data: doctors }, { data: allServiceNames }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", line.organization_id).single(),
    supabase
      .from("service_types")
      .select("id, display_name, price, requires_prior_consult, duration_minutes")
      .eq("organization_id", line.organization_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("bot_faqs")
      .select("question, answer")
      .eq("organization_id", line.organization_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("doctors")
      .select("id, name, prefix, specialties(name)")
      .eq("organization_id", line.organization_id),
    // Vocabulario de tratamientos de TODA la plataforma (no solo esta org) —
    // necesario para el filtro de FAQs huérfanas de abajo.
    supabase.from("service_types").select("display_name").eq("is_active", true),
  ]);

  const rawFaqs = (faqs ?? []).map((f: any) => ({ question: f.question, answer: f.answer }));

  const globalVocab = new Set<string>();
  for (const s of allServiceNames ?? []) {
    for (const t of significantTerms(s.display_name)) globalVocab.add(t);
  }
  const orgTerms = new Set<string>();
  for (const s of services ?? []) {
    for (const t of significantTerms(s.display_name)) orgTerms.add(t);
  }
  const domainFiltered = filterStructuredDomainFaqs(rawFaqs, line.organization_id);
  const finalFaqs = filterOrphanServiceFaqs(domainFiltered, orgTerms, globalVocab, line.organization_id);

  // Mismo resolutor que usa el motor real (calendar_schedules → fallback
  // doctor_schedules, ScheduleDowRow por doctor) — así el bloque de horario del
  // prompt NUNCA puede divergir de lo que el flujo de agendamiento va a encontrar
  // (hallazgo 24 Jul: doctor_schedules solo no bastaba, el demo tenía horario
  // real en calendar_schedules incluyendo sábado).
  const doctorsWithSchedule = await Promise.all(
    (doctors ?? []).map(async (d: any) => ({
      name: d.prefix ? `${d.prefix} ${d.name}` : d.name,
      specialty: d.specialties?.name ?? null,
      schedule: formatWeeklySchedule(await loadSchedulesAllDows(supabase, d.id)),
    })),
  );

  return {
    organizationId: line.organization_id,
    organizationName: org?.name ?? "la clínica",
    whatsappLineId: line.id,
    greeting: line.bot_greeting ?? null,
    services: (services ?? []).map((s: any) => ({
      id: s.id,
      name: s.display_name,
      price: s.price ?? null,
      requiresPriorConsult: s.requires_prior_consult ?? false,
      durationMinutes: s.duration_minutes ?? null,
    })),
    faqs: finalFaqs,
    doctors: doctorsWithSchedule,
  };
}

/** Catálogo en texto para el prompt: la política de precio es POR servicio. */
function catalogBlock(services: SdrService[]): string {
  if (services.length === 0) return "(la clínica aún no configuró servicios)";
  return services
    .map((s) => {
      const price = !s.requiresPriorConsult && s.price != null
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

/** Horario real por profesional — fuente que SIEMPRE gana sobre cualquier FAQ. */
function scheduleBlock(doctors: SdrDoctorInfo[]): string {
  if (doctors.length === 0) return "(sin profesionales configurados)";
  return doctors.map((d) => {
    const spec = d.specialty ? ` — ${d.specialty}` : "";
    const sched = d.schedule ?? "horario aún no configurado en la plataforma";
    return `- ${d.name}${spec}\n  Horario: ${sched}`;
  }).join("\n\n");
}

export interface SdrExistingAppointment {
  /** Etiqueta ya formateada, ej. "jueves 30 de julio". */
  dateLabel: string;
  /** Hora ya formateada 12h, ej. "3:00 PM". */
  time: string;
  doctorName: string;
  serviceType?: string | null;
}

export interface SdrPromptOptions {
  /** Slots REALES ofrecidos este turno ("h:mm AM/PM"). El LLM solo puede mencionar estos. */
  offeredSlots?: string[];
  /** Etiqueta del día de los slots ofrecidos (ej. "viernes 25 de julio"). */
  offeredDayLabel?: string;
  /**
   * Cita que el paciente YA tiene agendada (si tiene) — se le pasa a la PRIMERA
   * llamada (clasificación) para que, si el intent resulta "gestion_cita", el
   * `reply` de esa misma llamada ya sirva sin necesitar una 2da llamada solo
   * para redactar el reconocimiento (ahorro de costo, decisión Diego 27 Jul).
   */
  existingAppointment?: SdrExistingAppointment | null;
}

export function buildSdrSystemPrompt(ctx: SdrContext, opts?: SdrPromptOptions): string {
  const now = new Date();
  // Fecha actual Honduras (UTC-6 fijo, sin DST) — para que el LLM etiquete bien
  // "mañana"/"el viernes". La RESOLUCIÓN de fechas sigue siendo del backend.
  const hn = new Date(now.getTime() - 6 * 3600 * 1000);
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const hoyLabel = `${dias[hn.getUTCDay()]} ${hn.getUTCDate()} de ${meses[hn.getUTCMonth()]} de ${hn.getUTCFullYear()}`;

  const slotsBlock = opts?.offeredSlots?.length
    ? `\n## Horarios disponibles OFRECIDOS en este turno (${opts.offeredDayLabel ?? "día elegido"})
${opts.offeredSlots.join(", ")}
Estos son los ÚNICOS horarios que podés mencionar. Si el paciente pide otro, ofrecé el más cercano DE ESTA LISTA o decile que consultás otro día. Si elige uno, ponelo en booking.chosen_time (formato del listado).`
    : "";

  const apt = opts?.existingAppointment;
  const existingApptBlock = apt
    ? `\n## Cita existente del paciente (ya la tiene agendada)
${apt.serviceType ? `${apt.serviceType} — ` : ""}${apt.dateLabel} a las ${apt.time} con ${apt.doctorName}.
Si el paciente avisa que no puede asistir, pide cancelar, reagendar o confirmar ESTA cita (intent="gestion_cita"): reconocé la fecha/hora exacta de arriba en tu respuesta (no genérico), agradecé el aviso con calidez y de forma directa, y preguntá el siguiente paso. Ejemplo de tono: "Gracias por avisarme que no podrá asistir el {día} a las {hora}. Desea que agendemos la cita para otro día?" — NO ofrezcas horarios nuevos todavía, eso lo hace la plataforma en el siguiente turno con disponibilidad real.`
    : "";

  return `Sos la asistente virtual de ${ctx.organizationName}, una clínica en Honduras. Atendés WhatsApp: leads que llegan de publicidad y pacientes. Tu objetivo es que cada lead termine con una cita agendada. Hoy es ${hoyLabel} (hora de Honduras).

## Cómo hablás
- Español hondureño natural, trato de "usted", cálido y profesional. Nada robótico.
- Máximo 3-4 líneas por mensaje. Sin párrafos largos, sin listas salvo que ayuden.
- NUNCA uses el signo de apertura ¿ — solo el de cierre (?), como escribe la gente real por WhatsApp.
- Directo, sin explicaciones de más ("puede decirme por ejemplo...", "esto significa que..."). Hablás con adultos, no con niños.
- Entendé typos y lenguaje coloquial hondureño: "clnsulta"/"konsulta"=consulta, "ebaluasion"/"ebaluasión"=evaluación, "protecis"/"ptotesis"=prótesis, "puezas"/"piesas"=piezas, "nohjes"=noches, "asen"/"aser"=hacen/hacer, "yamo"=llamo, "presio"=precio, "quw"=qué, "mus"=muy, "d"="de", "fíjese que...", "ahí estaré".
- Los pacientes suelen escribir en fragmentos sueltos ("Precio", "Consulta", "Flexible", "Activa") esperando que entiendas por el hilo de la conversación — no le pidas que "dé más detalles" si la respuesta corta ya contesta lo que preguntaste.
- MAYÚSCULAS no indican enojo — es énfasis o que el teclado quedó en bloqueo. Nunca respondas como si el paciente estuviera molesto solo por eso.

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

## Agendamiento (cómo manejar fechas y horarios)
- Vos NUNCA inventás ni calculás horarios — la plataforma te da los horarios reales cuando toca ofrecerlos.
- **Distinción importante:**
  - Pregunta GENERAL de horario ("¿qué días atienden?", "¿cuál es su horario?") → respondé con el bloque "Horario real de atención" de abajo. intent="logistica".
  - Pregunta de disponibilidad de un DÍA CONCRETO ("¿tiene cupo el jueves?", "¿hay espacio el sábado?", "¿puedo ir mañana?") → NUNCA la respondas vos con prosa, aunque te parezca obvia por el horario general. Tratala SIEMPRE como intent="agendar" con booking.date_text = esa expresión — la plataforma consulta la agenda real (incluye bloqueos/excepciones que vos no ves) y te da el resultado exacto para que lo redactes el próximo turno.
- Cuando el paciente exprese CUÁNDO quiere su cita, copiá su expresión textual en booking.date_text ("mañana", "el viernes", "3 de agosto") y la franja en booking.period ("morning"/"afternoon") si la dijo. No la conviertas a fecha.
- Si además menciona una HORA específica por su cuenta ("a las 3", "tiene espacio a las 10am?"), copiala tal cual en booking.time_text — incluso si todavía no le has ofrecido nada. Esto es distinto de booking.chosen_time (esa es SOLO para cuando elige una hora de las que YA le ofreciste este turno).
- Cuando el paciente elija una hora de las ofrecidas, ponela en booking.chosen_time.
- Ofrecé máximo 2-3 horarios por mensaje, como lo haría una persona.
${slotsBlock}
${existingApptBlock}

## Horario real de atención (fuente: agenda del sistema — SIEMPRE gana sobre cualquier FAQ o suposición)
${scheduleBlock(ctx.doctors)}

## Catálogo de servicios (única fuente de precios)
${catalogBlock(ctx.services)}

## Preguntas frecuentes de la clínica (respondé con esta información, sin inventar; NUNCA la uses para horarios ni precios — para eso usá los bloques de arriba)
${faqBlock(ctx.faqs)}

## Formato de salida
Respondé ÚNICAMENTE un objeto JSON válido, sin texto antes ni después, sin markdown:
{
  "intent": "saludo|precio|info_servicio|logistica|agendar|gestion_cita|ack|rechazo|futuro|humano|otro",
  "service_id": "<id del catálogo si identificaste el tratamiento de interés, si no null>",
  "lead_stage": "nuevo|calificando|cotizado|agendado|seguimiento|handoff|perdido",
  "needs_handoff": true|false,
  "handoff_reason": "<motivo corto si needs_handoff, si no null>",
  "reply": "<tu mensaje para el paciente>",
  "booking": { "date_text": "<expresión textual del paciente o null>", "period": "morning|afternoon|null", "chosen_time": "<hora elegida de las ofrecidas o null>", "time_text": "<hora específica que pidió por su cuenta, antes de ofrecerle nada, o null>" }
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

  let booking: SdrLLMOutput["booking"] = null;
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
    service_id: typeof parsed.service_id === "string" && parsed.service_id ? parsed.service_id : null,
    lead_stage: leadStage,
    needs_handoff: parsed.needs_handoff === true,
    handoff_reason:
      typeof parsed.handoff_reason === "string" && parsed.handoff_reason
        ? parsed.handoff_reason
        : null,
    reply,
    booking,
  };
}
