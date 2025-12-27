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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_options: {
        Row: {
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          name: string
          name_ar: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
          sort_order?: number
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_reference: string
          created_at: string
          customer_name: string
          email: string | null
          group_id: string
          id: string
          language: string
          meeting_point: string
          notes: string | null
          number_of_people: number
          phone: string | null
          postponed_to: string | null
          status: string
        }
        Insert: {
          booking_reference: string
          created_at?: string
          customer_name: string
          email?: string | null
          group_id: string
          id?: string
          language?: string
          meeting_point: string
          notes?: string | null
          number_of_people?: number
          phone?: string | null
          postponed_to?: string | null
          status?: string
        }
        Update: {
          booking_reference?: string
          created_at?: string
          customer_name?: string
          email?: string | null
          group_id?: string
          id?: string
          language?: string
          meeting_point?: string
          notes?: string | null
          number_of_people?: number
          phone?: string | null
          postponed_to?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_assignments: {
        Row: {
          assignment_date: string
          created_at: string
          created_by: string
          group_number: number
          guide_id: string
          id: string
        }
        Insert: {
          assignment_date?: string
          created_at?: string
          created_by: string
          group_number: number
          guide_id: string
          id?: string
        }
        Update: {
          assignment_date?: string
          created_at?: string
          created_by?: string
          group_number?: number
          guide_id?: string
          id?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          activity_id: string
          completed_at: string
          created_at: string
          guide_id: string
          id: string
          report_date: string
        }
        Insert: {
          activity_id: string
          completed_at?: string
          created_at?: string
          guide_id: string
          id?: string
          report_date?: string
        }
        Update: {
          activity_id?: string
          completed_at?: string
          created_at?: string
          guide_id?: string
          id?: string
          report_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_options"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          customer_email: string
          customer_language: string
          guide_id: string
          id: string
          pickup_time: string
          sent_at: string
        }
        Insert: {
          customer_email: string
          customer_language: string
          guide_id: string
          id?: string
          pickup_time: string
          sent_at?: string
        }
        Update: {
          customer_email?: string
          customer_language?: string
          guide_id?: string
          id?: string
          pickup_time?: string
          sent_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          group_number: number
          guide_id: string | null
          id: string
          meeting_time: string
          notes: string | null
          status: string
          total_participants: number | null
          tour_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          group_number: number
          guide_id?: string | null
          id?: string
          meeting_time: string
          notes?: string | null
          status?: string
          total_participants?: number | null
          tour_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          group_number?: number
          guide_id?: string | null
          id?: string
          meeting_time?: string
          notes?: string | null
          status?: string
          total_participants?: number | null
          tour_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      guide_unavailability: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          reason: string
          unavailable_date: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          reason: string
          unavailable_date: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          reason?: string
          unavailable_date?: string
        }
        Relationships: []
      }
      issue_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          issue_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          issue_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_attachments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          booking_reference: string
          created_at: string
          description: string
          guide_id: string
          id: string
          issue_type: string
          updated_at: string
        }
        Insert: {
          booking_reference: string
          created_at?: string
          description: string
          guide_id: string
          id?: string
          issue_type?: string
          updated_at?: string
        }
        Update: {
          booking_reference?: string
          created_at?: string
          description?: string
          guide_id?: string
          id?: string
          issue_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      email_logs_secure: {
        Row: {
          customer_email: string | null
          customer_language: string | null
          guide_id: string | null
          id: string | null
          pickup_time: string | null
          sent_at: string | null
        }
        Insert: {
          customer_email?: never
          customer_language?: string | null
          guide_id?: string | null
          id?: string | null
          pickup_time?: string | null
          sent_at?: string | null
        }
        Update: {
          customer_email?: never
          customer_language?: string | null
          guide_id?: string | null
          id?: string | null
          pickup_time?: string | null
          sent_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_email_logs: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mask_email: { Args: { email_address: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "guide"
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
      app_role: ["admin", "guide"],
    },
  },
} as const
