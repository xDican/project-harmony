import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format phone number for display: XXXXXXXX -> XXXX-XXXX
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 8) return phone;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

/**
 * Format phone number for storage: XXXX-XXXX -> XXXXXXXX
 */
export function formatPhoneForStorage(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Format phone number as user types: auto-add hyphen at position 4
 */
export function formatPhoneInput(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}
