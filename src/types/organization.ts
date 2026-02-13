/**
 * Multi-tenant entity types
 * Maps to DB tables: organizations, clinics, calendars, whatsapp_lines
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerUserId?: string;
  phone?: string;
  email?: string;
  countryCode?: string;
  timezone?: string;
  billingType?: string;
  isActive: boolean;
  trialEndsAt?: string;
  createdAt: string;
}

export interface Clinic {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * CalendarEntry — named to avoid collision with shadcn/ui Calendar component
 */
export interface CalendarEntry {
  id: string;
  organizationId: string;
  clinicId?: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  // Populated via joins:
  clinicName?: string;
  doctors?: Array<{ id: string; name: string }>;
}

export interface WhatsAppLine {
  id: string;
  organizationId: string;
  clinicId?: string;
  label: string;
  phoneNumber: string;
  provider: string;
  botEnabled: boolean;
  botGreeting?: string;
  defaultDurationMinutes?: number;
  isActive: boolean;
  createdAt: string;
  // Populated via join:
  clinicName?: string;
}
