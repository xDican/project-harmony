export interface WaLinkData {
  phone: string;
  text: string | null;
}

export interface ParsedAppointmentData {
  patientName: string | null;
  doctor: string | null;
  date: string | null;
  time: string | null;
  templateType: "confirmation" | "reminder_24h" | "reminder_3d";
}

export type InputDetection =
  | { type: "wa_link"; data: WaLinkData; parsed: ParsedAppointmentData | null }
  | { type: "phone"; phone: string }
  | { type: "search"; query: string };

const WA_LINK_REGEX =
  /^https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send)\b/i;

export function parseWaLink(input: string): WaLinkData | null {
  const trimmed = input.trim();
  if (!WA_LINK_REGEX.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);

    let phone: string | null = null;
    let text: string | null = null;

    if (url.hostname === "wa.me") {
      // https://wa.me/504XXXXXXXX?text=...
      phone = url.pathname.replace(/^\/+/, "").replace(/\D/g, "");
      text = url.searchParams.get("text");
    } else if (url.hostname === "api.whatsapp.com") {
      // https://api.whatsapp.com/send?phone=504XXXXXXXX&text=...
      phone = (url.searchParams.get("phone") ?? "").replace(/\D/g, "");
      text = url.searchParams.get("text");
    }

    if (!phone || phone.length < 8) return null;

    return { phone, text: text || null };
  } catch {
    return null;
  }
}

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const APPOINTMENT_REGEX =
  /program[oó]\s+una\s+cita.*?horario:\s*\*?(\d{2}-\d{2}-\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)\*?/i;

export function parseAppointmentText(
  text: string,
): ParsedAppointmentData | null {
  const match = text.match(APPOINTMENT_REGEX);
  if (!match) return null;

  const [, rawDate, rawTime] = match;
  const time = rawTime.trim();

  const [dd, mm, yyyy] = rawDate.split("-").map(Number);
  const apptDate = new Date(yyyy, mm - 1, dd);
  if (isNaN(apptDate.getTime())) return null;

  const dateFormatted = `${DAYS[apptDate.getDay()]} ${dd} de ${MONTHS[mm - 1]}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  apptDate.setHours(0, 0, 0, 0);

  let templateType: ParsedAppointmentData["templateType"];
  if (apptDate.getTime() === today.getTime()) {
    templateType = "reminder_3d";
  } else if (apptDate.getTime() === tomorrow.getTime()) {
    templateType = "reminder_24h";
  } else {
    templateType = "confirmation";
  }

  return {
    patientName: null,
    doctor: null,
    date: dateFormatted,
    time,
    templateType,
  };
}

const PHONE_REGEX = /^\+?\d[\d\s\-]{6,14}$/;

export function detectPhoneNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!PHONE_REGEX.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function detectInputType(input: string): InputDetection {
  const trimmed = input.trim();
  if (!trimmed) return { type: "search", query: "" };

  const waLink = parseWaLink(trimmed);
  if (waLink) {
    const parsed = waLink.text ? parseAppointmentText(waLink.text) : null;
    return { type: "wa_link", data: waLink, parsed };
  }

  const phone = detectPhoneNumber(trimmed);
  if (phone) {
    return { type: "phone", phone };
  }

  return { type: "search", query: trimmed };
}
