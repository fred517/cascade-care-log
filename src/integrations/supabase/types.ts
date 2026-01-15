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
      alert_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          metric_id: string
          metric_name: string
          notes: string | null
          resolved_at: string | null
          severity: string
          site_id: string | null
          status: string
          threshold_max: number | null
          threshold_min: number | null
          triggered_at: string
          value: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          metric_id: string
          metric_name: string
          notes?: string | null
          resolved_at?: string | null
          severity?: string
          site_id?: string | null
          status?: string
          threshold_max?: number | null
          threshold_min?: number | null
          triggered_at?: string
          value: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          metric_id?: string
          metric_name?: string
          notes?: string | null
          resolved_at?: string | null
          severity?: string
          site_id?: string | null
          status?: string
          threshold_max?: number | null
          threshold_min?: number | null
          triggered_at?: string
          value?: number
        }
        Relationships: []
      }
      comparison_annotations: {
        Row: {
          comparison_type: string
          created_at: string
          id: string
          is_resolved: boolean | null
          metric_id: string
          note: string
          period_end: string
          period_start: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          site_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comparison_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          metric_id: string
          note: string
          period_end: string
          period_start: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          site_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comparison_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          metric_id?: string
          note?: string
          period_end?: string
          period_start?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          site_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparison_annotations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          alert_event_id: string | null
          body: string | null
          created_at: string
          fail_reason: string | null
          id: string
          provider_id: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          alert_event_id?: string | null
          body?: string | null
          created_at?: string
          fail_reason?: string | null
          id?: string
          provider_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          alert_event_id?: string | null
          body?: string | null
          created_at?: string
          fail_reason?: string | null
          id?: string
          provider_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      email_recipients: {
        Row: {
          alert_types: string[] | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          name: string
          site_id: string | null
          updated_at: string
        }
        Insert: {
          alert_types?: string[] | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_types?: string[] | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          site_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          site_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          site_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          site_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      readings: {
        Row: {
          attachment_url: string | null
          created_at: string
          entered_by: string
          id: string
          metric_id: string
          notes: string | null
          recorded_at: string
          site_id: string
          updated_at: string
          value: number
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          entered_by: string
          id?: string
          metric_id: string
          notes?: string | null
          recorded_at?: string
          site_id: string
          updated_at?: string
          value: number
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          entered_by?: string
          id?: string
          metric_id?: string
          notes?: string | null
          recorded_at?: string
          site_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "readings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          custom_end_date: string | null
          custom_start_date: string | null
          date_range_days: number | null
          date_range_type: string
          default_notes: string | null
          default_title: string | null
          default_view_mode: string | null
          description: string | null
          id: string
          is_shared: boolean | null
          name: string
          selected_metrics: string[] | null
          site_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_end_date?: string | null
          custom_start_date?: string | null
          date_range_days?: number | null
          date_range_type?: string
          default_notes?: string | null
          default_title?: string | null
          default_view_mode?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          selected_metrics?: string[] | null
          site_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_end_date?: string | null
          custom_start_date?: string | null
          date_range_days?: number | null
          date_range_type?: string
          default_notes?: string | null
          default_title?: string | null
          default_view_mode?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          selected_metrics?: string[] | null
          site_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_members: {
        Row: {
          created_at: string
          id: string
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_members_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          ammonia_basis: string | null
          created_at: string
          id: string
          name: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          ammonia_basis?: string | null
          created_at?: string
          id?: string
          name: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          ammonia_basis?: string | null
          created_at?: string
          id?: string
          name?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      thresholds: {
        Row: {
          created_at: string
          effective_from: string | null
          enabled: boolean | null
          id: string
          max_value: number
          metric_id: string
          min_value: number
          site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          enabled?: boolean | null
          id?: string
          max_value: number
          metric_id: string
          min_value: number
          site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          enabled?: boolean | null
          id?: string
          max_value?: number
          metric_id?: string
          min_value?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thresholds_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_site_member: {
        Args: { _site_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "operator" | "supervisor" | "admin"
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
      app_role: ["operator", "supervisor", "admin"],
    },
  },
} as const
