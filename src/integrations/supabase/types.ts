export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      _debug_calls_payloads: {
        Row: {
          error_message: string | null
          field: string | null
          id: number
          raw_value: Json
          received_at: string
          step: string | null
        }
        Insert: {
          error_message?: string | null
          field?: string | null
          id?: number
          raw_value: Json
          received_at?: string
          step?: string | null
        }
        Update: {
          error_message?: string | null
          field?: string | null
          id?: number
          raw_value?: Json
          received_at?: string
          step?: string | null
        }
        Relationships: []
      }
      activation_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          organization_id: string
          performed_by: string | null
          performed_by_email: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          organization_id: string
          performed_by?: string | null
          performed_by_email?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          organization_id?: string
          performed_by?: string | null
          performed_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_at: string
          auto_cancelled: boolean
          auto_cancelled_at: string | null
          calendar_id: string | null
          confirmation_message_sent: boolean
          created_at: string | null
          date: string
          doctor_id: string
          duration_minutes: number
          id: string
          notes: string | null
          organization_id: string
          patient_id: string
          reminder_24h_sent: boolean
          reminder_24h_sent_at: string | null
          reminder_3d_enabled: boolean
          reminder_3d_sent: boolean
          reminder_3d_sent_at: string | null
          reminder_followup_sent: boolean
          reminder_followup_sent_at: string | null
          reminder_morning_sent: boolean
          reminder_morning_sent_at: string | null
          reschedule_notified_at: string | null
          service_type: string | null
          service_type_id: string | null
          status: string
          time: string
          visit_id: string | null
        }
        Insert: {
          appointment_at: string
          auto_cancelled?: boolean
          auto_cancelled_at?: string | null
          calendar_id?: string | null
          confirmation_message_sent?: boolean
          created_at?: string | null
          date: string
          doctor_id: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          organization_id: string
          patient_id: string
          reminder_24h_sent?: boolean
          reminder_24h_sent_at?: string | null
          reminder_3d_enabled?: boolean
          reminder_3d_sent?: boolean
          reminder_3d_sent_at?: string | null
          reminder_followup_sent?: boolean
          reminder_followup_sent_at?: string | null
          reminder_morning_sent?: boolean
          reminder_morning_sent_at?: string | null
          reschedule_notified_at?: string | null
          service_type?: string | null
          service_type_id?: string | null
          status?: string
          time: string
          visit_id?: string | null
        }
        Update: {
          appointment_at?: string
          auto_cancelled?: boolean
          auto_cancelled_at?: string | null
          calendar_id?: string | null
          confirmation_message_sent?: boolean
          created_at?: string | null
          date?: string
          doctor_id?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string
          reminder_24h_sent?: boolean
          reminder_24h_sent_at?: string | null
          reminder_3d_enabled?: boolean
          reminder_3d_sent?: boolean
          reminder_3d_sent_at?: string | null
          reminder_followup_sent?: boolean
          reminder_followup_sent_at?: string | null
          reminder_morning_sent?: boolean
          reminder_morning_sent_at?: string | null
          reschedule_notified_at?: string | null
          service_type?: string | null
          service_type_id?: string | null
          status?: string
          time?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_settings: {
        Row: {
          created_at: string
          currency: string
          effective_from: string
          id: number
          is_active: boolean
          meta_fee_outside_window: number | null
          per_message_price: number
          window_hours: number
        }
        Insert: {
          created_at?: string
          currency?: string
          effective_from?: string
          id?: number
          is_active?: boolean
          meta_fee_outside_window?: number | null
          per_message_price: number
          window_hours?: number
        }
        Update: {
          created_at?: string
          currency?: string
          effective_from?: string
          id?: number
          is_active?: boolean
          meta_fee_outside_window?: number | null
          per_message_price?: number
          window_hours?: number
        }
        Relationships: []
      }
      bot_conversation_logs: {
        Row: {
          bot_response: string | null
          created_at: string | null
          direction: string
          id: string
          intent_detected: string | null
          metadata: Json | null
          options_shown: string[] | null
          organization_id: string
          patient_phone: string
          response_time_ms: number | null
          session_id: string
          state_after: string
          state_before: string
          user_message: string | null
          whatsapp_line_id: string
        }
        Insert: {
          bot_response?: string | null
          created_at?: string | null
          direction: string
          id?: string
          intent_detected?: string | null
          metadata?: Json | null
          options_shown?: string[] | null
          organization_id: string
          patient_phone: string
          response_time_ms?: number | null
          session_id: string
          state_after: string
          state_before: string
          user_message?: string | null
          whatsapp_line_id: string
        }
        Update: {
          bot_response?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          intent_detected?: string | null
          metadata?: Json | null
          options_shown?: string[] | null
          organization_id?: string
          patient_phone?: string
          response_time_ms?: number | null
          session_id?: string
          state_after?: string
          state_before?: string
          user_message?: string | null
          whatsapp_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_conversation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_conversation_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_conversation_logs_whatsapp_line_id_fkey"
            columns: ["whatsapp_line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_faqs: {
        Row: {
          answer: string
          clinic_id: string | null
          created_at: string
          display_order: number
          doctor_id: string | null
          id: string
          is_active: boolean
          keywords: string[] | null
          min_match_score: number
          organization_id: string
          question: string
          scope_priority: number
          updated_at: string
        }
        Insert: {
          answer: string
          clinic_id?: string | null
          created_at?: string
          display_order?: number
          doctor_id?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          min_match_score?: number
          organization_id: string
          question: string
          scope_priority?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          clinic_id?: string | null
          created_at?: string
          display_order?: number
          doctor_id?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          min_match_score?: number
          organization_id?: string
          question?: string
          scope_priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_faqs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_faqs_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_faqs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_sessions: {
        Row: {
          context: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          last_message_at: string | null
          patient_phone: string
          state: string
          whatsapp_line_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_message_at?: string | null
          patient_phone: string
          state?: string
          whatsapp_line_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_message_at?: string | null
          patient_phone?: string
          state?: string
          whatsapp_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_sessions_whatsapp_line_id_fkey"
            columns: ["whatsapp_line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_doctors: {
        Row: {
          calendar_id: string
          doctor_id: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          calendar_id: string
          doctor_id: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          calendar_id?: string
          doctor_id?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_doctors_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_doctors_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_schedules: {
        Row: {
          calendar_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          calendar_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          calendar_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_schedules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_permissions: {
        Row: {
          conversation_id: string
          created_at: string
          expires_at: string | null
          granted_at: string | null
          id: string
          organization_id: string
          raw_event: Json | null
          revoked_at: string | null
          source: string
          status: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          organization_id: string
          raw_event?: Json | null
          revoked_at?: string | null
          source?: string
          status: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          organization_id?: string
          raw_event?: Json | null
          revoked_at?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_permissions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          last_inbound_at: string | null
          last_message_at: string
          notes: string | null
          organization_id: string
          patient_id: string | null
          patient_name: string | null
          patient_phone: string
          status: string
          tags: string[]
          unread_count: number
          updated_at: string
          urgency: string
          whatsapp_line_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string
          notes?: string | null
          organization_id: string
          patient_id?: string | null
          patient_name?: string | null
          patient_phone: string
          status?: string
          tags?: string[]
          unread_count?: number
          updated_at?: string
          urgency?: string
          whatsapp_line_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string
          status?: string
          tags?: string[]
          unread_count?: number
          updated_at?: string
          urgency?: string
          whatsapp_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_line_id_fkey"
            columns: ["whatsapp_line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_patients: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          organization_id: string
          patient_id: string
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          organization_id: string
          patient_id: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          organization_id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_patients_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_patients_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_schedules: {
        Row: {
          calendar_id: string | null
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          calendar_id?: string | null
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          calendar_id?: string | null
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          prefix: string | null
          specialty_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          prefix?: string | null
          specialty_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          prefix?: string | null
          specialty_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          appointment_id: string | null
          billable: boolean
          billed_at: string | null
          body: string | null
          call_direction: string | null
          call_duration_seconds: number | null
          call_ended_at: string | null
          call_id_meta: string | null
          call_started_at: string | null
          call_status: string | null
          channel: string
          conversation_id: string | null
          created_at: string
          direction: string
          doctor_id: string | null
          error_code: string | null
          error_message: string | null
          from_phone: string
          id: string
          is_in_service_window: boolean | null
          media_mime: string | null
          media_url: string | null
          message_type: string
          organization_id: string | null
          patient_id: string | null
          price_category: string | null
          provider: string | null
          provider_message_id: string | null
          raw_payload: Json | null
          sent_by: string | null
          source: string | null
          status: string | null
          template_name: string | null
          to_phone: string
          total_price: number | null
          transcription: string | null
          type: string | null
          unit_price: number | null
          whatsapp_line_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          billable?: boolean
          billed_at?: string | null
          body?: string | null
          call_direction?: string | null
          call_duration_seconds?: number | null
          call_ended_at?: string | null
          call_id_meta?: string | null
          call_started_at?: string | null
          call_status?: string | null
          channel?: string
          conversation_id?: string | null
          created_at?: string
          direction: string
          doctor_id?: string | null
          error_code?: string | null
          error_message?: string | null
          from_phone: string
          id?: string
          is_in_service_window?: boolean | null
          media_mime?: string | null
          media_url?: string | null
          message_type?: string
          organization_id?: string | null
          patient_id?: string | null
          price_category?: string | null
          provider?: string | null
          provider_message_id?: string | null
          raw_payload?: Json | null
          sent_by?: string | null
          source?: string | null
          status?: string | null
          template_name?: string | null
          to_phone: string
          total_price?: number | null
          transcription?: string | null
          type?: string | null
          unit_price?: number | null
          whatsapp_line_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          billable?: boolean
          billed_at?: string | null
          body?: string | null
          call_direction?: string | null
          call_duration_seconds?: number | null
          call_ended_at?: string | null
          call_id_meta?: string | null
          call_started_at?: string | null
          call_status?: string | null
          channel?: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          doctor_id?: string | null
          error_code?: string | null
          error_message?: string | null
          from_phone?: string
          id?: string
          is_in_service_window?: boolean | null
          media_mime?: string | null
          media_url?: string | null
          message_type?: string
          organization_id?: string | null
          patient_id?: string | null
          price_category?: string | null
          provider?: string | null
          provider_message_id?: string | null
          raw_payload?: Json | null
          sent_by?: string | null
          source?: string | null
          status?: string | null
          template_name?: string | null
          to_phone?: string
          total_price?: number | null
          transcription?: string | null
          type?: string | null
          unit_price?: number | null
          whatsapp_line_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_whatsapp_line_id_fkey"
            columns: ["whatsapp_line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_oauth_states: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          state: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          state: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          state?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_oauth_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          secretary_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          secretary_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          secretary_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "secretaries"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          auto_cancel_enabled: boolean
          billing_status: string | null
          billing_type: string | null
          country_code: string | null
          created_at: string | null
          daily_message_cap: number | null
          email: string | null
          id: string
          is_active: boolean | null
          max_calendars: number
          messaging_enabled: boolean | null
          monthly_message_cap: number | null
          name: string
          onboarding_status: string | null
          owner_user_id: string | null
          phone: string | null
          slug: string
          timezone: string | null
          trial_ends_at: string | null
        }
        Insert: {
          auto_cancel_enabled?: boolean
          billing_status?: string | null
          billing_type?: string | null
          country_code?: string | null
          created_at?: string | null
          daily_message_cap?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          max_calendars?: number
          messaging_enabled?: boolean | null
          monthly_message_cap?: number | null
          name: string
          onboarding_status?: string | null
          owner_user_id?: string | null
          phone?: string | null
          slug: string
          timezone?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          auto_cancel_enabled?: boolean
          billing_status?: string | null
          billing_type?: string | null
          country_code?: string | null
          created_at?: string | null
          daily_message_cap?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          max_calendars?: number
          messaging_enabled?: boolean | null
          monthly_message_cap?: number | null
          name?: string
          onboarding_status?: string | null
          owner_user_id?: string | null
          phone?: string | null
          slug?: string
          timezone?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          email: string | null
          id: string
          id_last_appointment: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          reminder_3d_preferred: boolean
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          email?: string | null
          id?: string
          id_last_appointment?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          reminder_3d_preferred?: boolean
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          email?: string | null
          id?: string
          id_last_appointment?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          reminder_3d_preferred?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "patients_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_services: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          is_active: boolean
          organization_id: string
          service_type_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          is_active?: boolean
          organization_id: string
          service_type_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          service_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_services_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          clinic_id: string | null
          conditions: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          image_url: string | null
          is_featured: boolean
          keywords: string[]
          organization_id: string
          related_faq_ids: string[]
          service_type_id: string | null
          status: string
          title: string
          updated_at: string
          valid_from: string
          valid_to: string
        }
        Insert: {
          clinic_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          keywords?: string[]
          organization_id: string
          related_faq_ids?: string[]
          service_type_id?: string | null
          status?: string
          title: string
          updated_at?: string
          valid_from: string
          valid_to: string
        }
        Update: {
          clinic_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          keywords?: string[]
          organization_id?: string
          related_faq_ids?: string[]
          service_type_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          category: string
          clinic_id: string | null
          content: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          organization_id: string
          service_type_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          clinic_id?: string | null
          content: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id: string
          service_type_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          clinic_id?: string | null
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string
          service_type_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_replies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_replies_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          quantity: number
          resource_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          quantity?: number
          resource_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          quantity?: number
          resource_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      secretaries: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          organization_id: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secretaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_resources: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          quantity_required: number
          resource_id: string
          service_type_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          quantity_required?: number
          resource_id: string
          service_type_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          quantity_required?: number
          resource_id?: string
          service_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_resources_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          aliases: string[]
          buffer_minutes: number
          clinic_id: string | null
          created_at: string
          display_name: string
          display_order: number
          duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          price: number | null
          requires_prior_consult: boolean
          updated_at: string
          whatsapp_line_id: string | null
        }
        Insert: {
          aliases?: string[]
          buffer_minutes?: number
          clinic_id?: string | null
          created_at?: string
          display_name: string
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          price?: number | null
          requires_prior_consult?: boolean
          updated_at?: string
          whatsapp_line_id?: string | null
        }
        Update: {
          aliases?: string[]
          buffer_minutes?: number
          clinic_id?: string | null
          created_at?: string
          display_name?: string
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          price?: number | null
          requires_prior_consult?: boolean
          updated_at?: string
          whatsapp_line_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_types_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_types_whatsapp_line_id_fkey"
            columns: ["whatsapp_line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      superadmin_whitelist: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      template_mappings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logical_type: string
          meta_status: string | null
          meta_template_id: string | null
          parameter_order: string[]
          provider: string
          template_language: string
          template_name: string
          whatsapp_line_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logical_type: string
          meta_status?: string | null
          meta_template_id?: string | null
          parameter_order?: string[]
          provider?: string
          template_language?: string
          template_name: string
          whatsapp_line_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logical_type?: string
          meta_status?: string | null
          meta_template_id?: string | null
          parameter_order?: string[]
          provider?: string
          template_language?: string
          template_name?: string
          whatsapp_line_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_mappings_whatsapp_line_id_fkey"
            columns: ["whatsapp_line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          email: string
          id: string
          secretary_id: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          email: string
          id?: string
          secretary_id?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          email?: string
          id?: string
          secretary_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "secretaries"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_line_doctors: {
        Row: {
          calendar_id: string
          doctor_id: string
          id: string
          whatsapp_line_id: string
        }
        Insert: {
          calendar_id: string
          doctor_id: string
          id?: string
          whatsapp_line_id: string
        }
        Update: {
          calendar_id?: string
          doctor_id?: string
          id?: string
          whatsapp_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_line_doctors_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_line_doctors_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_line_doctors_whatsapp_line_id_fkey"
            columns: ["whatsapp_line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_lines: {
        Row: {
          bot_enabled: boolean | null
          bot_greeting: string | null
          bot_handoff_type: string
          bot_service_types: Json
          clinic_id: string | null
          created_at: string | null
          default_duration_minutes: number | null
          id: string
          is_active: boolean | null
          label: string
          last_historical_webhook_at: string | null
          meta_access_token: string | null
          meta_phone_number_id: string | null
          meta_registered: boolean | null
          meta_registration_pin: string | null
          meta_waba_id: string | null
          organization_id: string
          phone_number: string
          provider: string | null
          sync_in_progress: boolean
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_messaging_service_sid: string | null
          twilio_phone_from: string | null
          twilio_template_confirmation: string | null
          twilio_template_reminder: string | null
          twilio_template_reschedule: string | null
        }
        Insert: {
          bot_enabled?: boolean | null
          bot_greeting?: string | null
          bot_handoff_type?: string
          bot_service_types?: Json
          clinic_id?: string | null
          created_at?: string | null
          default_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          last_historical_webhook_at?: string | null
          meta_access_token?: string | null
          meta_phone_number_id?: string | null
          meta_registered?: boolean | null
          meta_registration_pin?: string | null
          meta_waba_id?: string | null
          organization_id: string
          phone_number: string
          provider?: string | null
          sync_in_progress?: boolean
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_messaging_service_sid?: string | null
          twilio_phone_from?: string | null
          twilio_template_confirmation?: string | null
          twilio_template_reminder?: string | null
          twilio_template_reschedule?: string | null
        }
        Update: {
          bot_enabled?: boolean | null
          bot_greeting?: string | null
          bot_handoff_type?: string
          bot_service_types?: Json
          clinic_id?: string | null
          created_at?: string | null
          default_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          last_historical_webhook_at?: string | null
          meta_access_token?: string | null
          meta_phone_number_id?: string | null
          meta_registered?: boolean | null
          meta_registration_pin?: string | null
          meta_waba_id?: string | null
          organization_id?: string
          phone_number?: string
          provider?: string | null
          sync_in_progress?: boolean
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_messaging_service_sid?: string | null
          twilio_phone_from?: string | null
          twilio_template_confirmation?: string | null
          twilio_template_reminder?: string | null
          twilio_template_reschedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_lines_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          language: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          language?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          language?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      bot_analytics_summary: {
        Row: {
          bookings_completed: number | null
          expired_sessions: number | null
          handoffs: number | null
          in_progress: number | null
          reschedules_completed: number | null
          session_date: string | null
          total_sessions: number | null
          unique_patients: number | null
          whatsapp_line_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_sessions_whatsapp_line_id_fkey"
            columns: ["whatsapp_line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      current_billing_settings: {
        Args: never
        Returns: {
          currency: string
          meta_fee_outside_window: number
          twilio_fee: number
          window_hours: number
        }[]
      }
      current_doctor_id: { Args: never; Returns: string }
      current_per_message_price: { Args: never; Returns: number }
      find_or_create_patient: {
        Args: {
          p_doctor_id?: string
          p_email?: string
          p_name: string
          p_notes?: string
          p_organization_id?: string
          p_phone: string
        }
        Returns: Json
      }
      get_message_usage: {
        Args: { period_end: string; period_start: string }
        Returns: {
          billable_outbound: number
          estimated_cost: number
          period_end: string
          period_start: string
          total_outbound: number
          unit_price: number
        }[]
      }
      get_message_usage_current_month: {
        Args: never
        Returns: {
          billable_outbound: number
          estimated_cost: number
          period_end: string
          period_start: string
          unit_price: number
        }[]
      }
      get_message_usage_daily: {
        Args: { period_end: string; period_start: string }
        Returns: {
          billable_outbound: number
          day: string
          estimated_cost: number
        }[]
      }
      get_monthly_billing_summary: {
        Args: { p_doctor_id: string; p_month: string }
        Returns: {
          avg_cost_per_message: number
          base_fee: number
          in_window_cost: number
          in_window_msgs: number
          inbound_cost: number
          inbound_msgs: number
          messages_total: number
          month_key: string
          outside_window_template_cost: number
          outside_window_template_msgs: number
          total_due: number
          usage_total: number
        }[]
      }
      get_user_organizations: { Args: { _user_id: string }; Returns: string[] }
      get_weekly_agenda: {
        Args: {
          p_doctor_id?: string
          p_user_id: string
          p_week_end: string
          p_week_start: string
        }
        Returns: Json
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initiate_conversation: {
        Args: {
          p_organization_id: string
          p_patient_name?: string
          p_patient_phone: string
        }
        Returns: Json
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "secretary" | "doctor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "secretary", "doctor"],
    },
  },
} as const
