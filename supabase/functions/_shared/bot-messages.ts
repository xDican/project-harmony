/**
 * Premium message formatting helpers for the WhatsApp bot.
 * Shared between bot-handler and whatsapp-inbound-webhook.
 */

// Visual separator
export const SEP = '────────────';

// Emoji numbers for numbered options
export const EMOJI_NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

// Emoji map for recurring option types
export const OPT_EMOJI: Record<string, string> = {
  agendar: '📅',
  reagendar: '🔁',
  cancelar: '❌',
  faq: '❓',
  secretaria: '👩🏻‍💼',
  doctor_handoff: '🩺',
  confirmar: '✅',
  cambiar: '🔄',
  volver: '⬅️',
  menu: '🏠',
  horarios: '🕒',
};

/**
 * Builds a step wizard title line.
 * Example: "📅 *Agendar cita* — Paso 2/5"
 */
export function buildStepTitle(emoji: string, flowName: string, step: number, total: number): string {
  return `${emoji} *${flowName}* — Paso ${step}/${total}`;
}

// Standardized error messages
export const ERR = {
  invalidOption: '⚠️ Opcion no valida.\n👉 Responda con el numero de la lista.',
  noAvailability: '⚠️ No encontramos disponibilidad para esa seleccion.',
  sessionExpired: '⚠️ Su sesion ha expirado. Volvamos al menu principal.',
};
