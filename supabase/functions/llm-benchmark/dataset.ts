/**
 * Dataset del benchmark del bot SDR — 25 casos REALES (anonimizados) extraídos
 * de las conversaciones de la línea piloto (org Dra. Hanoy, 22-24 Jul 2026,
 * 102 conversaciones / 290 mensajes de texto revisados a mano).
 *
 * Etiquetado (criterios fijados al curar, aplicar consistente):
 * - lead_stage esperada = etapa DESPUÉS de responder este mensaje.
 *   "cotizado" = el bot ya respondió el tema precio (cifra pública o "se
 *   determina en la evaluación"). "calificando" = aún identificando tratamiento.
 * - expected.leadStage undefined = no se puntúa etapa en ese caso (ej. paciente
 *   existente gestionando cita, donde el embudo de lead no aplica).
 * - needsHandoff true SOLO donde el bot no debe responder: condición médica
 *   delicada, pregunta técnica/de política sin FAQ configurada, pedir humano.
 * - serviceHint: nombre del servicio del catálogo real de la org piloto que el
 *   LLM debería identificar (se resuelve a id en el runner); null = no aplica.
 */

import type { LeadStage, SdrIntent } from "../_shared/sdr-prompt.ts";

export interface BenchCase {
  id: string;
  /** Turnos previos de la conversación (si el caso necesita contexto). */
  history?: { role: "user" | "assistant"; content: string }[];
  message: string;
  expected: {
    intent: SdrIntent | SdrIntent[];
    leadStage?: LeadStage | LeadStage[];
    needsHandoff: boolean;
    serviceHint?: string;
  };
  notes: string;
}

export const BENCH_CASES: BenchCase[] = [
  // ── CTA del ad y saludos ──────────────────────────────────────────────
  {
    id: "cta-ad",
    message: "¡Hola! Quiero más información",
    expected: { intent: "saludo", leadStage: "calificando", needsHandoff: false },
    notes: "El mensaje más común (69/102 conversaciones). Debe saludar y preguntar qué tratamiento le interesa.",
  },
  {
    id: "saludo-solo",
    message: "Buenas noches",
    expected: { intent: "saludo", leadStage: ["nuevo", "calificando"], needsHandoff: false },
    notes: "Saludo pelado sin pregunta.",
  },
  {
    id: "interes-vago",
    message: "Estoy interesada",
    expected: { intent: ["saludo", "otro"], leadStage: "calificando", needsHandoff: false },
    notes: "Interés sin especificar — calificar, no asumir tratamiento.",
  },

  // ── Precios: público vs requiere evaluación ──────────────────────────
  {
    id: "precio-evaluacion-typo",
    message: "Y solo la ebaluasion q precio tiene",
    history: [
      { role: "user", content: "Precio por favor de 2 piezas" },
      { role: "assistant", content: "Con gusto. Para prótesis necesitamos una evaluación para darle plan y presupuesto exacto. ¿Le gustaría agendarla?" },
    ],
    expected: { intent: "precio", leadStage: "cotizado", needsHandoff: false, serviceHint: "Evaluación" },
    notes: "Typo real. Evaluación tiene precio PÚBLICO (L460) — debe dar la cifra exacta.",
  },
  {
    id: "precio-consulta-typo",
    message: "Que vale  la clnsulta",
    expected: { intent: "precio", leadStage: "cotizado", needsHandoff: false, serviceHint: "Evaluación" },
    notes: "Typo real ('clnsulta'). 'Consulta' debe mapear a Evaluación (L460 pública).",
  },
  {
    id: "precio-protesis-total",
    message: "Cuanto vale una protesis  total  superior  d buen material",
    expected: { intent: "precio", leadStage: "cotizado", needsHandoff: false, serviceHint: "Prótesis Total" },
    notes: "Prótesis Total NO tiene precio público → 'se determina en la evaluación' + ofrecer agendar. JAMÁS inventar cifra.",
  },
  {
    id: "precio-limpieza",
    message: "quw vale la limpieza?",
    expected: { intent: "precio", leadStage: "cotizado", needsHandoff: false, serviceHint: "Limpieza Dental" },
    notes: "Typo real. Limpieza sin precio público → evaluación, sin inventar cifra.",
  },
  {
    id: "precio-piezas-caps",
    message: "SI FUERAN  DE  11 A 12 PUEZAS CUAL SERIA EL PRECIO",
    history: [
      { role: "user", content: "Precio de las prótesis fijas de zirconia" },
      { role: "assistant", content: "Para prótesis fija el precio depende de su caso — se determina en la cita de evaluación. ¿Le gustaría agendarla?" },
    ],
    expected: { intent: "precio", leadStage: "cotizado", needsHandoff: false, serviceHint: "Prótesis fija" },
    notes: "Mayúsculas + typos reales. Insiste por cifra de un servicio sin precio público — mantenerse en evaluación sin inventar.",
  },
  {
    id: "precio-caso-mixto",
    message: "A mi hacen falta 2 muelas de arriba y en la parte de abajo 3 cuanto me saldría una prótesis",
    expected: { intent: "precio", leadStage: "cotizado", needsHandoff: false },
    notes: "Describe su caso + pide precio. Sin criterio clínico, sin cifra — evaluación + agendar.",
  },
  {
    id: "precio-blanqueamiento",
    message: "Que precio tiene el blanqueamiento?",
    expected: { intent: "precio", leadStage: "cotizado", needsHandoff: false, serviceHint: "Blanqueamiento" },
    notes: "Blanqueamiento tiene precio PÚBLICO (L3800) — debe dar la cifra.",
  },

  // ── Caso clínico descrito (evaluación, no opinión) ────────────────────
  {
    id: "clinico-colmillos",
    message: "Me han dicho que mis colmillos están bien para anclar la prótesis",
    history: [
      { role: "user", content: "Prótesis fija" },
      { role: "assistant", content: "Para prótesis fija hacemos una evaluación para valorar las piezas. ¿Le gustaría agendarla?" },
    ],
    expected: { intent: "info_servicio", leadStage: ["calificando", "cotizado"], needsHandoff: false, serviceHint: "Prótesis fija" },
    notes: "Busca validación clínica. NO opinar si sus colmillos sirven — eso lo determina la doctora en la evaluación.",
  },
  {
    id: "clinico-cuellitos",
    message: "Si tengo cuellitos en los dientes, aplico para blanqueamiento?",
    expected: { intent: "info_servicio", leadStage: ["calificando", "cotizado"], needsHandoff: false, serviceHint: "Blanqueamiento" },
    notes: "Pregunta de idoneidad clínica REAL. La respuesta correcta es evaluación, nunca 'sí aplica/no aplica'.",
  },
  {
    id: "clinico-piezas-fracturadas",
    message: "Tengo solo 2 piezas fracturadas ( pedazos de diente ,me quedo nada más ) pudieran hacer algo por mi?",
    expected: { intent: "info_servicio", leadStage: ["calificando", "cotizado"], needsHandoff: false },
    notes: "Caso sensible emocionalmente. Empatía + evaluación + agendar, sin prometer resultados.",
  },

  // ── Handoff genuino ───────────────────────────────────────────────────
  {
    id: "handoff-oncologico",
    message: "Soy paciente oncologico",
    history: [
      { role: "user", content: "Que precio tiene la extracción" },
      { role: "assistant", content: "Las extracciones dependen del caso — se valoran en la evaluación. ¿Le gustaría agendarla?" },
    ],
    expected: { intent: "info_servicio", leadStage: "handoff", needsHandoff: true },
    notes: "Caso REAL. Condición médica delicada → la doctora responde personalmente. Regla dura.",
  },
  {
    id: "handoff-protocolo-tecnico",
    message: "Que protocolo utiliza para retira la amalgama de mercurio",
    expected: { intent: "info_servicio", leadStage: "handoff", needsHandoff: true },
    notes: "Pregunta técnica sin FAQ configurada. No inventar protocolo → handoff (y en producción, gap → propuesta de FAQ).",
  },
  {
    id: "handoff-ninos",
    message: "Atiende ninos de 7 años ?",
    expected: { intent: ["info_servicio", "logistica", "otro"], leadStage: "handoff", needsHandoff: true },
    notes: "Política de la clínica que NO está en FAQs ni catálogo. No asumir que sí — handoff.",
  },
  {
    id: "handoff-pide-humano",
    message: "Puedo hablar con la doctora directamente?",
    expected: { intent: "humano", leadStage: "handoff", needsHandoff: true },
    notes: "Pedido explícito de humano → confirmar el traspaso explícitamente (regla dedupe-handoff del repo).",
  },

  // ── Logística (FAQ configurada vs no configurada) ─────────────────────
  {
    id: "faq-ubicacion",
    message: "Dónde están ubicados?",
    expected: { intent: "logistica", leadStage: ["nuevo", "calificando"], needsHandoff: false },
    notes: "FAQ configurada (Torre Morazán…) — debe responder con ESA dirección, sin inventar detalles.",
  },
  {
    id: "faq-ubicacion-virtual",
    message: "Me manda la ubicación virtual",
    expected: { intent: "logistica", leadStage: ["nuevo", "calificando"], needsHandoff: false },
    notes: "Variante coloquial real de pedir la dirección.",
  },
  {
    id: "faq-horarios-sin-config",
    message: "Cuáles son los horarios de atención?",
    expected: { intent: "logistica", leadStage: ["handoff", "nuevo", "calificando"], needsHandoff: true },
    notes: "NO hay FAQ de horarios configurada → no inventar horarios. Handoff (en producción: gap → propuesta FAQ).",
  },
  {
    id: "faq-cita-o-llegada",
    message: "Hay que hacer cita o por orden de llegada",
    expected: { intent: "logistica", leadStage: ["nuevo", "calificando"], needsHandoff: false },
    notes: "La clínica trabaja con citas (es el modelo de la plataforma) — responder eso y ofrecer agendar es seguro.",
  },

  // ── Soft-no, rechazo y seguimiento (cultura hondureña) ────────────────
  {
    id: "softno-analizar",
    message: "Bien, listo, gracias lo voy a analizar",
    history: [
      { role: "user", content: "Si tengo cuellitos en los dientes, aplico para blanqueamiento?" },
      { role: "assistant", content: "Eso lo valora la doctora en la evaluación (L460). ¿Le gustaría agendarla?" },
    ],
    expected: { intent: "futuro", leadStage: "seguimiento", needsHandoff: false },
    notes: "El soft-no hondureño clásico. NO insistir, dejar puerta abierta, etiquetar seguimiento.",
  },
  {
    id: "futuro-regreso-ciudad",
    message: "Cuando regrese a Tegucigalpa haré una cita,, muy amable",
    expected: { intent: "futuro", leadStage: "seguimiento", needsHandoff: false },
    notes: "Intención futura genuina (viaje). Respuesta cálida sin presión.",
  },
  {
    id: "rechazo-explicito",
    message: "NO GRACIAS",
    history: [
      { role: "user", content: "SI FUERAN DE 11 A 12 PUEZAS CUAL SERIA EL PRECIO" },
      { role: "assistant", content: "El precio exacto se determina en la evaluación (L460). ¿Le gustaría agendarla?" },
    ],
    expected: { intent: "rechazo", leadStage: "perdido", needsHandoff: false },
    notes: "Rechazo explícito real. Aceptar con amabilidad, CERO insistencia (regla cultural).",
  },

  // ── Paciente existente (el embudo de lead no aplica) ──────────────────
  {
    id: "gestion-cambio-hora",
    message: "Cree que pueda ajustar la hora ha las 10:00am?",
    history: [
      { role: "assistant", content: "Su cita quedó confirmada para mañana a las 11:00 AM. ¡Le esperamos!" },
    ],
    expected: { intent: "gestion_cita", needsHandoff: false },
    notes: "Paciente real con cita gestionando cambio. El SDR debe reconocer gestion_cita (la máquina de estados/bot clásico lo maneja). No se puntúa lead_stage.",
  },
];
