import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format phone number for display: +504XXXXXXXX -> XXXX-XXXX
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('504')) {
    const local = digits.slice(3);
    return `${local.slice(0, 4)}-${local.slice(4)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return phone;
}

/**
 * Format phone number for storage: XXXX-XXXX -> +504XXXXXXXX (E.164)
 */
export function formatPhoneForStorage(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 8) return `+504${digits}`;
  if (digits.startsWith('504') && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Format phone number as user types: auto-add hyphen at position 4
 */
export function formatPhoneInput(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}
