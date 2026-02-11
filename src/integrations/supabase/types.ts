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
      appointments: {
        Row: {
          appointment_at: string | null
          confirmation_message_sent: boolean
          created_at: string | null
          date: string
          doctor_id: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          reminder_24h_sent: boolean
          reminder_24h_sent_at: string | null
          reschedule_notified_at: string | null
          status: string
          time: string
        }
        Insert: {
          appointment_at?: string | null
          confirmation_message_sent?: boolean
          created_at?: string | null
          date: string
          doctor_id: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          reminder_24h_sent?: boolean
          reminder_24h_sent_at?: string | null
          reschedule_notified_at?: string | null
          status?: string
          time: string
        }
        Update: {
          appointment_at?: string | null
          confirmation_message_sent?: boolean
          created_at?: string | null
          date?: string
          doctor_id?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          reminder_24h_sent?: boolean
          reminder_24h_sent_at?: string | null
          reschedule_notified_at?: string | null
          status?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      doctor_schedules: {
        Row: {
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
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
          phone?: string | null
          prefix?: string | null
          specialty_id?: string | null
          user_id?: string | null
        }
        Relationships: [
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
          channel: string
          created_at: string
          direction: string
          doctor_id: string | null
          error_code: string | null
          error_message: string | null
          from_phone: string
          id: string
          is_in_service_window: boolean | null
          patient_id: string | null
          price_category: string | null
          provider: string | null
          provider_message_id: string | null
          raw_payload: Json | null
          status: string | null
          template_name: string | null
          to_phone: string
          total_price: number | null
          type: string | null
          unit_price: number | null
        }
        Insert: {
          appointment_id?: string | null
          billable?: boolean
          billed_at?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          direction: string
          doctor_id?: string | null
          error_code?: string | null
          error_message?: string | null
          from_phone: string
          id?: string
          is_in_service_window?: boolean | null
          patient_id?: string | null
          price_category?: string | null
          provider?: string | null
          provider_message_id?: string | null
          raw_payload?: Json | null
          status?: string | null
          template_name?: string | null
          to_phone: string
          total_price?: number | null
          type?: string | null
          unit_price?: number | null
        }
        Update: {
          appointment_id?: string | null
          billable?: boolean
          billed_at?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          direction?: string
          doctor_id?: string | null
          error_code?: string | null
          error_message?: string | null
          from_phone?: string
          id?: string
          is_in_service_window?: boolean | null
          patient_id?: string | null
          price_category?: string | null
          provider?: string | null
          provider_message_id?: string | null
          raw_payload?: Json | null
          status?: string | null
          template_name?: string | null
          to_phone?: string
          total_price?: number | null
          type?: string | null
          unit_price?: number | null
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
            foreignKeyName: "message_logs_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_oauth_states: {
        Row: {
          created_at: string
          id: string
          state: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          state: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          state?: string
          used_at?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          created_at: string | null
          doctor_id: string
          email: string | null
          id: string
          id_last_appointment: string | null
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          email?: string | null
          id?: string
          id_last_appointment?: string | null
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          email?: string | null
          id?: string
          id_last_appointment?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
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
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
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
      [_ in never]: never
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
