/**
 * Date utility functions for handling timezone-aware dates
 */

/**
 * Gets the current date in the user's local timezone as YYYY-MM-DD string
 * This prevents timezone issues where UTC date differs from local date
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the date string for tomorrow in the user's local timezone as YYYY-MM-DD string
 */
export function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets a Date object representing the start of today in local timezone
 */
export function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Gets a Date object representing the start of tomorrow in local timezone
 */
export function getLocalTomorrow(): Date {
  const today = getLocalToday();
  today.setDate(today.getDate() + 1);
  return today;
}

/**
 * Checks if a given date is today
 */
export function isToday(date: Date): boolean {
  const today = getLocalToday();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
}

/**
 * Converts a time string in HH:MM format to 12-hour format with AM/PM
 * @param timeStr - Time in 24-hour format (e.g., "14:30", "09:00")
 * @returns Time in 12-hour format (e.g., "2:30 PM", "9:00 AM")
 */
export function formatTimeTo12Hour(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Gets the current time in minutes since midnight
 */
export function getCurrentTimeInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Converts a time string (HH:MM) to minutes since midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
