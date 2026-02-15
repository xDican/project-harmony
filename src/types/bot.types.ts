// Bot-related types for WhatsApp automation

export type BotState =
  | "greeting"
  | "main_menu"
  | "booking_select_week"
  | "booking_select_day"
  | "booking_select_hour"
  | "booking_confirm"
  | "reschedule_list"
  | "reschedule_select"
  | "cancel_confirm"
  | "faq_search"
  | "faq_result"
  | "handoff_secretary"
  | "done";

export interface BotFAQ {
  id: string;
  organization_id: string;
  clinic_id: string | null;
  doctor_id: string | null;
  scope_priority: 1 | 2 | 3; // 1=doctor, 2=clinic, 3=org
  question: string;
  answer: string;
  keywords: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BotFAQInsert {
  organization_id: string;
  clinic_id?: string | null;
  doctor_id?: string | null;
  scope_priority: 1 | 2 | 3;
  question: string;
  answer: string;
  keywords: string[];
  is_active?: boolean;
  display_order?: number;
}

export interface BotFAQUpdate {
  question?: string;
  answer?: string;
  keywords?: string[];
  is_active?: boolean;
  display_order?: number;
}

export interface BotSession {
  id: string;
  whatsapp_line_id: string;
  from_number: string;
  state: BotState;
  context: BotSessionContext;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface BotSessionContext {
  // Booking flow context
  selected_week?: { start: string; end: string };
  selected_date?: string;
  selected_time?: string;
  selected_doctor_id?: string;
  patient_id?: string;
  patient_name?: string;

  // Reschedule flow context
  appointment_id?: string;
  appointments_list?: Array<{
    id: string;
    date: string;
    time: string;
    doctor_name: string;
  }>;

  // FAQ context
  faq_query?: string;
  faq_results?: BotFAQ[];

  // Pagination context
  current_page?: number;
  total_pages?: number;

  // Error/retry context
  retry_count?: number;
  last_error?: string;

  // User messages for context
  last_user_message?: string;
  previous_state?: BotState;
}

export interface WeekOption {
  week_number: number;
  week_label: string; // e.g., "Semana 1: Feb 15-21"
  start_date: string; // ISO date
  end_date: string; // ISO date
  has_slots: boolean;
}

export interface DayOption {
  date: string; // ISO date
  day_label: string; // e.g., "Lunes 15 de Febrero"
  available_slots_count: number;
}

export interface HourOption {
  time: string; // HH:MM format
  time_label: string; // e.g., "09:00 AM"
  is_available: boolean;
}

export interface BotMessage {
  text: string;
  options?: string[]; // For menu options (numbered 1, 2, 3...)
}

// FAQ Search result with relevance scoring
export interface FAQSearchResult {
  faq: BotFAQ;
  relevance_score: number; // 0-1, based on keyword matching
  match_type: "exact" | "keyword" | "fuzzy";
}

// Bot analytics event types
export type BotEventType =
  | "session_started"
  | "menu_selected"
  | "booking_completed"
  | "booking_cancelled"
  | "reschedule_completed"
  | "cancel_completed"
  | "faq_searched"
  | "handoff_requested"
  | "session_expired"
  | "error_occurred";

export interface BotAnalyticsEvent {
  id: string;
  whatsapp_line_id: string;
  session_id: string | null;
  event_type: BotEventType;
  from_number: string;
  metadata: Record<string, any>;
  created_at: string;
}
