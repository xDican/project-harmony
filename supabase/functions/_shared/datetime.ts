/**
 * Date/time formatting utilities for Project Harmony.
 * All patient-facing dates use Honduras conventions (dd/MM/yyyy, 12-hour).
 */

import { DateTime } from "https://esm.sh/luxon@3.4.4";

/** Honduras timezone */
export const TIMEZONE = "America/Tegucigalpa";

/**
 * Formats a date string (YYYY-MM-DD) to dd/MM/yyyy
 */
export function formatDateForTemplate(dateStr: string): string {
  const dt = DateTime.fromISO(dateStr);
  return dt.toFormat("dd/MM/yyyy");
}

/**
 * Formats time (HH:MM or HH:MM:SS) to 12-hour format: "3:00 PM"
 */
export function formatTimeForTemplate(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Formats date + time into patient-facing string:
 * "12/12/2025 a las 3:00 PM"
 */
export function formatAppointmentDateTime(
  date: string,
  time: string,
): string {
  const formattedDate = formatDateForTemplate(date);
  const formattedTime = formatTimeForTemplate(time);
  return `${formattedDate} a las ${formattedTime}`;
}

/**
 * Returns today's date in Honduras timezone as YYYY-MM-DD
 */
export function todayHonduras(): string {
  return DateTime.now().setZone(TIMEZONE).toFormat("yyyy-MM-dd");
}

/**
 * Returns tomorrow's date in Honduras timezone as YYYY-MM-DD
 */
export function tomorrowHonduras(): string {
  return DateTime.now().setZone(TIMEZONE).plus({ days: 1 }).toFormat("yyyy-MM-dd");
}
