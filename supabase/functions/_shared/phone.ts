/**
 * Phone number utilities for Project Harmony.
 * Default country: Honduras (+504)
 */

const DEFAULT_COUNTRY_CODE = "504";

/**
 * Normalizes any phone input to E.164 format: +504XXXXXXXX
 *
 * Handles:
 * - "whatsapp:+50493133496" -> "+50493133496"
 * - "+50493133496"          -> "+50493133496"
 * - "50493133496"           -> "+50493133496"
 * - "93133496"              -> "+50493133496"  (assumes Honduras)
 * - " 9313-3496 "           -> "+50493133496"
 */
export function normalizeToE164(phone: string): string {
  if (!phone) return "";

  // Strip "whatsapp:" prefix (case-insensitive)
  let cleaned = phone.replace(/^whatsapp:/i, "").trim();

  // Remove all non-digit characters except leading +
  const hasPlus = cleaned.startsWith("+");
  cleaned = cleaned.replace(/\D/g, "");

  // If 8 digits or fewer (local Honduras number), prepend country code
  if (!hasPlus && cleaned.length <= 8) {
    cleaned = DEFAULT_COUNTRY_CODE + cleaned;
  }

  // If the number already starts with the country code, keep as is
  // Otherwise if it had a +, the digits are the full international number
  return `+${cleaned}`;
}

/**
 * Returns phone in Twilio WhatsApp format: whatsapp:+504XXXXXXXX
 */
export function toTwilioFormat(phone: string): string {
  return `whatsapp:${normalizeToE164(phone)}`;
}

/**
 * Returns phone in Meta format: digits only without + (e.g. "50493133496")
 */
export function toMetaFormat(phone: string): string {
  return normalizeToE164(phone).replace(/^\+/, "");
}
