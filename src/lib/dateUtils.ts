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
 * Gets a Date object representing the start of today in local timezone
 */
export function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
