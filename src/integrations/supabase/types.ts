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
      calibration_logs: {
        Row: {
          calibrated_at: string
          calibrated_by: string
          created_at: string
          deviation_percent: number | null
          id: string
          notes: string | null
          passed: boolean
          post_cal_reading: number | null
          pre_cal_reading: number | null
          reference_value: number | null
          schedule_id: string
        }
        Insert: {
          calibrated_at?: string
          calibrated_by: string
          created_at?: string
          deviation_percent?: number | null
          id?: string
          notes?: string | null
          passed?: boolean
          post_cal_reading?: number | null
          pre_cal_reading?: number | null
          reference_value?: number | null
          schedule_id: string
        }
        Update: {
          calibrated_at?: string
          calibrated_by?: string
          created_at?: string
          deviation_percent?: number | null
          id?: string
          notes?: string | null
          passed?: boolean
          post_cal_reading?: number | null
          pre_cal_reading?: number | null
          reference_value?: number | null
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "calibration_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_schedules: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          interval_days: number
          is_active: boolean
          last_calibration_at: string | null
          meter_name: string
          meter_type: string
          next_due_at: string | null
          notes: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          interval_days?: number
          is_active?: boolean
          last_calibration_at?: string | null
          meter_name: string
          meter_type?: string
          next_due_at?: string | null
          notes?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          interval_days?: number
          is_active?: boolean
          last_calibration_at?: string | null
          meter_name?: string
          meter_type?: string
          next_due_at?: string | null
          notes?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
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
          site_id: string | null
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
          site_id?: string | null
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
          site_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
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
      facilities: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_sitemaps: {
        Row: {
          created_at: string
          facility_id: string
          file_mime: string | null
          file_name: string | null
          file_size: number | null
          id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          facility_id: string
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          facility_id?: string
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_sitemaps_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      odour_incidents: {
        Row: {
          character: string | null
          created_at: string
          created_by: string | null
          description: string | null
          facility_id: string | null
          humidity: number | null
          id: string
          intensity: number | null
          lat: number
          lng: number
          notes: string | null
          occurred_at: string
          org_id: string | null
          site_id: string | null
          source: string | null
          temperature: number | null
          weather: Json | null
          wind_dir: number | null
          wind_speed: number | null
        }
        Insert: {
          character?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          humidity?: number | null
          id?: string
          intensity?: number | null
          lat: number
          lng: number
          notes?: string | null
          occurred_at?: string
          org_id?: string | null
          site_id?: string | null
          source?: string | null
          temperature?: number | null
          weather?: Json | null
          wind_dir?: number | null
          wind_speed?: number | null
        }
        Update: {
          character?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          humidity?: number | null
          id?: string
          intensity?: number | null
          lat?: number
          lng?: number
          notes?: string | null
          occurred_at?: string
          org_id?: string | null
          site_id?: string | null
          source?: string | null
          temperature?: number | null
          weather?: Json | null
          wind_dir?: number | null
          wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "odour_incidents_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odour_incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      odour_predictions: {
        Row: {
          created_at: string | null
          geometry: Json
          id: string
          model_version: string | null
          peak_intensity: number | null
          site_id: string
          source_id: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string | null
          geometry: Json
          id?: string
          model_version?: string | null
          peak_intensity?: number | null
          site_id: string
          source_id: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string | null
          geometry?: Json
          id?: string
          model_version?: string | null
          peak_intensity?: number | null
          site_id?: string
          source_id?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "odour_predictions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odour_predictions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "odour_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      odour_reports: {
        Row: {
          created_at: string
          created_by: string
          id: string
          latitude: number
          longitude: number
          observed_at: string
          odour: Json
          site_id: string
          weather: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          latitude: number
          longitude: number
          observed_at: string
          odour: Json
          site_id: string
          weather: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          latitude?: number
          longitude?: number
          observed_at?: string
          odour?: Json
          site_id?: string
          weather?: Json
        }
        Relationships: [
          {
            foreignKeyName: "odour_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      odour_sources: {
        Row: {
          base_intensity: number | null
          created_at: string | null
          geometry: Json
          id: string
          name: string | null
          site_id: string
        }
        Insert: {
          base_intensity?: number | null
          created_at?: string | null
          geometry: Json
          id?: string
          name?: string | null
          site_id: string
        }
        Update: {
          base_intensity?: number | null
          created_at?: string | null
          geometry?: Json
          id?: string
          name?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "odour_sources_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          support_access_enabled: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          support_access_enabled?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          support_access_enabled?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          facility_name: string | null
          first_name: string | null
          id: string
          is_approved: boolean
          phone_number: string | null
          site_id: string | null
          surname: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          facility_name?: string | null
          first_name?: string | null
          id?: string
          is_approved?: boolean
          phone_number?: string | null
          site_id?: string | null
          surname?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          facility_name?: string | null
          first_name?: string | null
          id?: string
          is_approved?: boolean
          phone_number?: string | null
          site_id?: string | null
          surname?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_values: {
        Row: {
          created_at: string
          id: string
          parameter_key: string
          quality_flag: string | null
          reading_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          parameter_key: string
          quality_flag?: string | null
          reading_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          parameter_key?: string
          quality_flag?: string | null
          reading_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_values_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "readings"
            referencedColumns: ["id"]
          },
        ]
      }
      readings: {
        Row: {
          attachment_url: string | null
          created_at: string
          entered_by: string
          id: string
          metric_id: string
          notes: string | null
          org_id: string | null
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
          org_id?: string | null
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
          org_id?: string | null
          recorded_at?: string
          site_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "readings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      site_maps: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          file_name: string | null
          geo_bounds_east: number | null
          geo_bounds_north: number | null
          geo_bounds_south: number | null
          geo_bounds_west: number | null
          id: string
          image_url: string
          latitude: number | null
          longitude: number | null
          mime_type: string | null
          name: string
          org_id: string | null
          site_id: string
          storage_bucket: string | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          file_name?: string | null
          geo_bounds_east?: number | null
          geo_bounds_north?: number | null
          geo_bounds_south?: number | null
          geo_bounds_west?: number | null
          id?: string
          image_url: string
          latitude?: number | null
          longitude?: number | null
          mime_type?: string | null
          name: string
          org_id?: string | null
          site_id: string
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          file_name?: string | null
          geo_bounds_east?: number | null
          geo_bounds_north?: number | null
          geo_bounds_south?: number | null
          geo_bounds_west?: number | null
          id?: string
          image_url?: string
          latitude?: number | null
          longitude?: number | null
          mime_type?: string | null
          name?: string
          org_id?: string | null
          site_id?: string
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_maps_site_id_fkey"
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
          role: string
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
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
      site_metric_config: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_enabled: boolean
          metric_id: string
          site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          metric_id: string
          site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          metric_id?: string
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_metric_config_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_playbooks: {
        Row: {
          condition: string
          created_at: string
          id: string
          is_active: boolean | null
          metric_id: string
          reference_links: string[]
          site_id: string
          steps: string[]
          title: string
          updated_at: string
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          metric_id: string
          reference_links?: string[]
          site_id: string
          steps?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          metric_id?: string
          reference_links?: string[]
          site_id?: string
          steps?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_playbooks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_sitemaps: {
        Row: {
          public_url: string
          site_id: string
          storage_bucket: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          public_url: string
          site_id: string
          storage_bucket?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          public_url?: string
          site_id?: string
          storage_bucket?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_sitemaps_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          ammonia_basis: string | null
          created_at: string
          id: string
          name: string
          org_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          ammonia_basis?: string | null
          created_at?: string
          id?: string
          name: string
          org_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          ammonia_basis?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_audit_log: {
        Row: {
          acted_by: string
          action: string
          created_at: string
          details: Json | null
          id: string
          org_id: string | null
          site_id: string | null
        }
        Insert: {
          acted_by: string
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          org_id?: string | null
          site_id?: string | null
        }
        Update: {
          acted_by?: string
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          org_id?: string | null
          site_id?: string | null
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
      weather_snapshots: {
        Row: {
          created_at: string | null
          id: string
          recorded_at: string
          site_id: string
          stability_class: string | null
          temperature_c: number | null
          wind_direction_deg: number | null
          wind_speed_mps: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          recorded_at: string
          site_id: string
          stability_class?: string | null
          temperature_c?: number | null
          wind_direction_deg?: number | null
          wind_speed_mps?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          recorded_at?: string
          site_id?: string
          stability_class?: string | null
          temperature_c?: number | null
          wind_direction_deg?: number | null
          wind_speed_mps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_snapshots_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
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
      has_org_role: {
        Args: { _org_id: string; _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_site_role: {
        Args: { _roles: string[]; _site_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_site_member: {
        Args: { _site_id: string; _user_id: string }
        Returns: boolean
      }
      is_support: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "operator" | "supervisor" | "admin" | "support"
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
      app_role: ["operator", "supervisor", "admin", "support"],
    },
  },
} as const
