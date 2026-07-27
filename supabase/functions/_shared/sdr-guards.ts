/**
 * Guards deterministas del bot SDR — última línea de defensa antes de enviar
 * una respuesta redactada por el LLM al paciente.
 * Fase 2b (plan: .claude/plans/atomic-sauteeing-hummingbird.md).
 *
 * Principio: el LLM redacta, pero NUNCA es la autoridad de precios ni horarios.
 * - Precios: toda cifra con marca de moneda (L460, Lps 3,800, L. 500) debe ser
 *   un precio PÚBLICO del catálogo. Limitación documentada: números sin marca
 *   de moneda no se validan (chocarían con horas, conteos, pisos, etc.).
 * - Horarios: toda hora mencionada debe estar en el set de slots ofrecidos
 *   por el backend en este turno.
 * Violación => la respuesta NO se envía; el caller cae a un mensaje seguro.
 */

export interface GuardResult {
  ok: boolean;
  violations: string[];
}

/** "3,800" | "460.00" | "1.500" -> número normalizado (heurística Lempira). */
function parseMoneyDigits(raw: string): number {
  let s = raw.trim();
  // ".00" / ",00" final = decimales — se descartan.
  s = s.replace(/[.,]00$/, "");
  // Separadores de miles restantes (L3,800 / L3.800) — un Lempira sin decimales.
  s = s.replace(/[.,]/g, "");
  return Number(s);
}

const MONEY_RE = /(?:\bL(?:ps)?\.?\s*|\blempiras?\s+)(\d[\d.,]*)/gi;

/**
 * Toda cifra con marca de moneda en el reply debe existir como precio público.
 * `allowedPrices` = precios de service_types donde !requires_prior_consult
 * (derivado, no la columna price_is_public — ver SdrService en sdr-prompt.ts).
 */
export function checkPriceGuard(reply: string, allowedPrices: number[]): GuardResult {
  const allowed = new Set(allowedPrices.map((p) => Math.round(p)));
  const violations: string[] = [];
  for (const match of reply.matchAll(MONEY_RE)) {
    const value = parseMoneyDigits(match[1]);
    if (!Number.isFinite(value)) continue;
    if (!allowed.has(Math.round(value))) {
      violations.push(match[0].trim());
    }
  }
  return { ok: violations.length === 0, violations };
}

/** "2:30 PM" | "14:30" | "2 pm" -> candidatos "HH:mm" 24h. */
function timeCandidates(hourRaw: string, minuteRaw: string | undefined, meridiem: string | undefined): string[] {
  const hour = Number(hourRaw);
  const minute = minuteRaw ? Number(minuteRaw) : 0;
  if (!Number.isFinite(hour) || hour > 23 || minute > 59) return [];
  const mm = String(minute).padStart(2, "0");
  const m = meridiem?.toLowerCase().replace(/\./g, "");
  if (m === "am") {
    return [`${String(hour % 12).padStart(2, "0")}:${mm}`];
  }
  if (m === "pm") {
    return [`${String((hour % 12) + 12).padStart(2, "0")}:${mm}`];
  }
  // Sin AM/PM: ambiguo — cualquiera de las dos lecturas vale si está ofrecida.
  if (hour >= 13) return [`${String(hour).padStart(2, "0")}:${mm}`];
  return [
    `${String(hour % 12).padStart(2, "0")}:${mm}`,
    `${String((hour % 12) + 12).padStart(2, "0")}:${mm}`,
  ];
}

// h:mm con o sin am/pm, o hora pelada CON am/pm ("2 pm"). Hora pelada sin
// am/pm NO se valida (chocaría con "piso 12", "2 sesiones").
const TIME_RE = /\b(\d{1,2}):(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?|\b(\d{1,2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)/gi;

/**
 * Toda hora mencionada en el reply debe estar en `offeredSlots` ("HH:mm" 24h).
 * Con set vacío, cualquier mención de hora es violación (no hay nada ofrecido).
 */
export function checkTimeGuard(reply: string, offeredSlots: string[]): GuardResult {
  const offered = new Set(offeredSlots);
  const violations: string[] = [];
  for (const match of reply.matchAll(TIME_RE)) {
    const [full, h1, m1, mer1, h2, mer2] = match;
    const candidates = h1 !== undefined
      ? timeCandidates(h1, m1, mer1)
      : timeCandidates(h2, undefined, mer2);
    if (candidates.length === 0) continue;
    if (!candidates.some((c) => offered.has(c))) {
      violations.push(full.trim());
    }
  }
  return { ok: violations.length === 0, violations };
}
