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
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          prefix?: string | null
          specialty_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          prefix?: string | null
          specialty_id?: string | null
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
      patients: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          id_last_appointment: string | null
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_last_appointment?: string | null
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_last_appointment?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      current_doctor_id: { Args: never; Returns: string }
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
