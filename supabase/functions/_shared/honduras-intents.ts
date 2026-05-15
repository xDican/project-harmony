// Capa universal de procesamiento de lenguaje natural hondureno para bot-handler.
// No depende de IA externa — patrones del diccionario de hondurenismos.
// Fuente: 2,357 mensajes reales de pacientes (25 Feb - 4 May 2026).
// Diccionario vivo en `.claude/memory/diccionario-hondurenismos.md`.

export type Intent =
  | 'confirm'
  | 'reschedule'
  | 'cancel'
  | 'soft_no'
  | 'greeting'
  | 'faq_price'
  | 'faq_location'
  | 'faq_schedule'
  | 'faq_services'
  | 'faq_my_appointment'
  | 'handoff'
  | 'out_of_scope'
  | 'wrong_number'
  | 'spam_external_bot'
  | 'ack_only'
  | 'unknown';

export interface DetectedIntent {
  intent: Intent;
  confidence: 'high' | 'medium' | 'low';
  matched?: string;
  /** Texto residual tras quitar preambulo (ej. "fijese que..."). Util para reprocesar. */
  payload?: string;
}

// =====================================================================
// Normalizacion de typos hondurenos
// =====================================================================

const TYPO_MAP: Record<string, string> = {
  sita: 'cita',
  sitas: 'citas',
  sitita: 'cita',
  ajendar: 'agendar',
  reajendar: 'reagendar',
  canselar: 'cancelar',
  presio: 'precio',
  presios: 'precios',
  ubicasion: 'ubicacion',
  orario: 'horario',
  sirugia: 'cirugia',
  konsulta: 'consulta',
  nesesito: 'necesito',
  nesecito: 'necesito',
  nesesita: 'necesita',
  sekretari: 'secretaria',
  atension: 'atencion',
  dlctor: 'doctor',
  komunicarme: 'comunicarme',
  diq: 'dia',
  pq: 'porque',
  xq: 'porque',
  q: 'que',
  k: 'que',
  ke: 'que',
};

const ACCENT_MAP: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n',
  Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ñ: 'n',
};

function stripAccents(s: string): string {
  return s.replace(/[áéíóúÁÉÍÓÚñÑ]/g, (c) => ACCENT_MAP[c] || c);
}

/**
 * Normaliza un mensaje: lowercase, sin acentos, sin tildes raras, y typos comunes
 * convertidos a su forma canonica.
 */
export function normalizeTypos(text: string): string {
  if (!text) return '';
  const lower = stripAccents(text.toLowerCase().trim());
  // Reemplazar typos palabra por palabra
  const tokens = lower.split(/\s+/);
  const normalized = tokens.map((tok) => {
    const clean = tok.replace(/[^\w]/g, '');
    return TYPO_MAP[clean] ?? tok;
  });
  return normalized.join(' ').replace(/\s+/g, ' ').trim();
}

// =====================================================================
// Acks / cierres conversacionales (no abren flujo nuevo)
// =====================================================================

const ACKS = new Set([
  'ok', 'okey', 'okay', 'oki', 'o ke', 'ok gracias', 'ok...',
  'gracias', 'muchas gracias', 'mil gracias', 'gracias feliz dia',
  'de acuerdo', 'entendido', 'recibido', 'anotado',
  '👍', '🙏', '✅', 'ya quedo', 'quedo',
]);

/**
 * Detecta acks puros: paciente confirma recepcion del ultimo mensaje sin pedir
 * ninguna accion nueva. En Honduras "ok" o "gracias" solos NO abren menu.
 */
export function isAcknowledgment(text: string): boolean {
  const norm = normalizeTypos(text);
  if (ACKS.has(norm)) return true;
  // Solo emojis
  if (/^[👍🙏✅😊❤️🌹💐]+$/u.test(text.trim())) return true;
  return false;
}

// =====================================================================
// Patrones por intent (orden importa — primero matcheado gana)
// =====================================================================

// CONFIRM: confirma asistencia
const CONFIRM_PHRASES = [
  // Directos
  'confirmo', 'confirmado', 'confirma',
  'ahi estare', 'ahi estaremos', 'ahi este', 'alli estare',
  'gracias alli estare', 'gracias ahi estare',
  'si ahi estare', 'si alli estare',
  'ok ahi estare', 'ok ay estare', 'ay estare', 'ay yegare',
  'estare alli', 'estare ahi',
  // Hondurenismos
  'sale pues', 'va pues', 'dale pues', 'vaya pues',
  'ahi vamos', 'ahi mero', 'asi mero', 'asimero',
  'de una', 'sin falta', 'todo bien',
  'listo', 'listo gracias',
  'esta bien',
  'perfecto', 'excelente', 'por supuesto', 'claro', 'seguro',
  'primero dios', 'si dios quiere', 'diosito mediante',
  // Acks fuertes (cuentan como confirm en contexto de cancel_confirm)
  'si', 'sip', 'sii', 'sí',
];

// RESCHEDULE: quiere mover la cita (incluye "no puedo asistir" — soft cancel = reschedule en Honduras)
const RESCHEDULE_PHRASES = [
  // Directos
  'reagendar', 'reagendar cita', 'reagendar mi cita',
  'quiero reagendar', 'reprogramar', 'quiero reprogramar', 'reprograme',
  'cambiar fecha', 'cambiar dia', 'cambiar hora', 'cambiar cita', 'cambiar',
  'mover la cita', 'moverla', 'moverlo', 'mover',
  'posponer', 'aplazar',
  'para otro dia', 'para otra fecha', 'otro horario',
  'para la proxima', 'para la proxima semana', 'prox semana',
  'para la siguiente',
  // Imposibilidad (en Honduras = reschedule, no cancel)
  'no puedo', 'no puedo asistir', 'no puedo a esa hora', 'no puedo ir',
  'no podre', 'no podre asistir', 'no voy a poder', 'no voy a poder ir',
  'no me sera posible', 'no me dara tiempo',
  'manana no puedo', 'hoy no puedo', 'no podia',
  // Razones humanas comunes
  'estare fuera', 'estoy fuera de ciudad', 'estoy fuera del pais',
  'no estoy en el pais', 'fuera de tegus',
  'ando enfermo', 'ando mal', 'me siento mal',
  'tengo gripe', 'tengo fiebre', 'tengo emergencia',
  'emergencia', 'imprevisto', 'inconveniente',
  'tengo clases', 'tengo compromiso', 'tengo otro compromiso',
  'asuntos pendientes', 'se me presento algo', 'me surgio algo',
];

// SOFT_NO: indecision / "yo aviso" — no avanzar automaticamente
const SOFT_NO_PHRASES = [
  'yo aviso', 'yo le aviso', 'yo les aviso', 'yo te aviso',
  'le aviso', 'les aviso', 'aviso despues', 'aviso luego',
  'yo le hablo', 'yo le digo',
  'yo llamare', 'llamare', 'llamo despues',
  'yo escribire', 'le escribire',
  'me comunico', 'me comunicare', 'me comunico despues',
  'cuando me decida', 'cuando pueda', 'cuando sepa',
  'lo pienso', 'lo voy a pensar', 'dejeme pensar', 'dejeme verlo',
  'tengo que ver', 'voy a ver', 'ahi veo', 'ahi vere', 'ahi veremos',
  'verifico', 'tengo que consultar', 'tengo que confirmar con',
  'por ahora no', 'por el momento no', 'por los momentos no',
  'mas adelante', 'otro dia', 'despues vemos',
  'estamos en contacto', 'hablamos despues', 'en otro momento',
  // Variantes con "confirmo" detectadas en produccion 14-May 2026
  'yo le confirmo despues', 'le confirmo despues', 'confirmo despues', 'confirmo luego',
];

// CANCEL: cancelar definitivo (raro en Honduras, validar antes de ejecutar)
const CANCEL_PHRASES = [
  'cancelar', 'cancelar cita', 'cancelar la cita', 'cancelar mi cita',
  'quiero cancelar', 'prefiero cancelar', 'mejor cancelar',
  'ya no quiero', 'ya no la necesito', 'al final cancelar',
];

// GREETING
const GREETING_PHRASES = [
  'hola', 'holi', 'holis', 'hi', 'hello', 'hellow',
  'buenos dias', 'buen dia',
  'buenas tardes', 'buenas tarde', 'buenas',
  'buenas noches',
  'saludos', 'que tal',
  'hola dr', 'hola doctor', 'hola doctora',
];

// FAQ — sub-categorias
const FAQ_PRICE_PHRASES = [
  'precio', 'precios', 'costo', 'costos', 'valor', 'tarifa', 'honorarios',
  'cuanto cuesta', 'cuanto vale', 'cuanto sale', 'cuanto cobran', 'cuanto debo',
  'que precio', 'me gustaria saber el precio', 'quiero precio', 'quiero saber precio',
];

const FAQ_LOCATION_PHRASES = [
  'ubicacion', 'direccion', 'donde estan', 'donde queda', 'donde se encuentra',
  'como llego', 'en que zona', 'enviar la ubicacion', 'mandar ubicacion',
];

const FAQ_SCHEDULE_PHRASES = [
  'horario', 'horarios', 'que horario', 'horario de atencion',
  'a que hora abren', 'hasta que hora atienden', 'que hora cierran',
  'cuando atienden', 'a que hora atienden',
];

const FAQ_SERVICES_PHRASES = [
  'que servicios', 'atienden ninos', 'atienden ninas', 'atienden adultos',
  'que tratamientos', 'que hacen', 'que ofrecen',
];

const FAQ_MY_APPOINTMENT_PHRASES = [
  'cuando es mi cita', 'cuando sera mi cita', 'cuando tengo cita',
  'cual es mi cita', 'mi proxima cita', 'me confirma cuando',
  'me recuerda cuando', 'tengo cita', 'para que procedimiento tengo cita',
];

// HANDOFF
const HANDOFF_PHRASES = [
  'secretaria', 'hablar con secretaria', 'hablar con la secretaria',
  'hablar con el doctor', 'hablar con la doctora', 'hablar con el dr',
  'quiero hablar con', 'hablar', 'llamar', 'contacto', 'contactar',
  'humano', 'persona', 'alguien', 'ayuda', 'necesito ayuda',
  'comunicarme', 'atencion al cliente',
];

// OUT_OF_SCOPE
const OUT_OF_SCOPE_PHRASES = [
  'video llamada', 'videollamada', 'consulta online', 'consulta virtual',
  'cita virtual', 'en linea', 'por zoom', 'telemedicina',
  'mandar foto', 'enviar foto', 'mandar la receta', 'enviar la receta',
  'mandar la orden', 'enviar la orden', 'copia de la receta',
  'es normal que', 'es normal de que',
];

// WRONG_NUMBER
const WRONG_NUMBER_PHRASES = [
  'se equivoco de numero', 'se equivocaron', 'estaba mal el numero',
  'no es el numero de', 'no soy', 'esto no es',
];

// SPAM externo (otros bots / negocios)
const SPAM_MARKERS = [
  'gracias por comunicarte con', 'le saluda', 'soy creadora de contenido',
  'banco ficohsa', 'aseguradora', 'oferta exclusiva',
];

// =====================================================================
// Preambulos: extraer texto residual util
// =====================================================================

const PREAMBLE_PREFIXES = [
  'fijese que', 'fijese', 'mire que', 'mire no que', 'vea que', 'vea pues que',
  'disculpe', 'disculpa', 'disculpen', 'mil disculpas', 'perdone', 'perdon',
  'escuche', 'escucheme', 'hola buenos dias',
  'hola buen dia', 'hola buenas tardes', 'hola buenas noches', 'hola buenas',
  'buenos dias', 'buen dia', 'buenas tardes', 'buenas noches', 'buenas',
  'le habla', 'le saluda', 'soy', 'me llamo', 'hola soy',
  'buenas tardes estimada', 'buenas tardes estimado',
];

/**
 * Si el mensaje empieza con un preambulo conocido, retorna el resto del texto.
 * Si no, retorna el texto original.
 */
export function stripPreamble(text: string): { stripped: string; preamble?: string } {
  const norm = normalizeTypos(text);
  for (const pre of PREAMBLE_PREFIXES) {
    if (norm.startsWith(pre + ' ') || norm.startsWith(pre + ',') || norm === pre) {
      const rest = norm.slice(pre.length).replace(/^[\s,.:;-]+/, '').trim();
      if (rest.length > 0) return { stripped: rest, preamble: pre };
    }
  }
  return { stripped: norm };
}

// =====================================================================
// Matching helpers
// =====================================================================

function matchAny(norm: string, phrases: string[]): string | undefined {
  for (const p of phrases) {
    // Match palabra completa: rodeado por espacio/inicio/fin/puntuacion
    const regex = new RegExp(`(^|[\\s,.!?;:¡¿])${escapeRegex(p)}([\\s,.!?;:¡¿]|$)`, 'i');
    if (regex.test(' ' + norm + ' ')) return p;
  }
  return undefined;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =====================================================================
// Reglas culturales que invalidan matches superficiales
// =====================================================================

/**
 * "siempre" en Honduras = "igual/todavia", NO "always". "Siempre voy" = "voy igual"
 * → es CONFIRM, no reschedule, aunque tenga la palabra "lunes" o similar.
 */
function hasCulturalConfirmOverride(norm: string): boolean {
  // "siempre [voy/estare/ire/ahi]" o "siempre el [dia]"
  if (/\bsiempre\s+(voy|ire|estare|ahi|el\s+\w+)/.test(norm)) return true;
  return false;
}

// =====================================================================
// detectIntent — punto de entrada principal
// =====================================================================

/**
 * Clasifica un mensaje de paciente en uno de los intents definidos.
 * Aplica reglas culturales hondurenas. Si el texto empieza con un preambulo,
 * el matching se hace sobre el residual.
 */
export function detectIntent(text: string): DetectedIntent {
  if (!text || text.trim().length === 0) {
    return { intent: 'unknown', confidence: 'high' };
  }

  // Acks puros antes de todo
  if (isAcknowledgment(text)) {
    return { intent: 'ack_only', confidence: 'high', matched: text.trim() };
  }

  // Strip preamble si aplica — matchear sobre residual
  const { stripped, preamble } = stripPreamble(text);
  const norm = stripped || normalizeTypos(text);

  // Regla cultural: "siempre voy/estare" override → confirm
  if (hasCulturalConfirmOverride(norm)) {
    return { intent: 'confirm', confidence: 'high', matched: 'siempre+intent', payload: norm };
  }

  // Spam externo (rebote de otros bots)
  for (const marker of SPAM_MARKERS) {
    if (norm.includes(marker)) {
      return { intent: 'spam_external_bot', confidence: 'high', matched: marker };
    }
  }

  // Wrong number
  const wn = matchAny(norm, WRONG_NUMBER_PHRASES);
  if (wn) return { intent: 'wrong_number', confidence: 'high', matched: wn };

  // Confirmacion — antes que cancel/reschedule
  const cf = matchAny(norm, CONFIRM_PHRASES);
  if (cf) return { intent: 'confirm', confidence: 'high', matched: cf, payload: preamble ? norm : undefined };

  // Reschedule (incluye soft cancel "no puedo asistir")
  const rs = matchAny(norm, RESCHEDULE_PHRASES);
  if (rs) return { intent: 'reschedule', confidence: 'high', matched: rs, payload: preamble ? norm : undefined };

  // Soft NO — "yo aviso", "lo pienso"
  const sn = matchAny(norm, SOFT_NO_PHRASES);
  if (sn) return { intent: 'soft_no', confidence: 'medium', matched: sn };

  // Cancel explicito (despues de reschedule porque "cancelar" puede ser ambiguo)
  const cn = matchAny(norm, CANCEL_PHRASES);
  if (cn) return { intent: 'cancel', confidence: 'medium', matched: cn };

  // Handoff
  const hd = matchAny(norm, HANDOFF_PHRASES);
  if (hd) return { intent: 'handoff', confidence: 'high', matched: hd };

  // Out of scope
  const oos = matchAny(norm, OUT_OF_SCOPE_PHRASES);
  if (oos) return { intent: 'out_of_scope', confidence: 'high', matched: oos };

  // FAQ — sub-categorias
  const fq_price = matchAny(norm, FAQ_PRICE_PHRASES);
  if (fq_price) return { intent: 'faq_price', confidence: 'high', matched: fq_price };

  const fq_loc = matchAny(norm, FAQ_LOCATION_PHRASES);
  if (fq_loc) return { intent: 'faq_location', confidence: 'high', matched: fq_loc };

  const fq_sch = matchAny(norm, FAQ_SCHEDULE_PHRASES);
  if (fq_sch) return { intent: 'faq_schedule', confidence: 'high', matched: fq_sch };

  const fq_sv = matchAny(norm, FAQ_SERVICES_PHRASES);
  if (fq_sv) return { intent: 'faq_services', confidence: 'medium', matched: fq_sv };

  const fq_mc = matchAny(norm, FAQ_MY_APPOINTMENT_PHRASES);
  if (fq_mc) return { intent: 'faq_my_appointment', confidence: 'high', matched: fq_mc };

  // Greeting (al final — muchos saludos vienen acompanados de info real)
  const gr = matchAny(norm, GREETING_PHRASES);
  if (gr && norm.split(/\s+/).length <= 3) {
    // Saludo solo (sin info adicional) → greeting puro
    return { intent: 'greeting', confidence: 'high', matched: gr };
  }

  return { intent: 'unknown', confidence: 'low', payload: norm };
}
