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
      assessments: {
        Row: {
          answers: Json
          assessor_name: string | null
          created_at: string
          easa_evaluation: Json | null
          id: string
          kostra_enrichment: Json | null
          maturity_level: number | null
          municipality_name: string
          platform_recommendations: Json | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          assessor_name?: string | null
          created_at?: string
          easa_evaluation?: Json | null
          id?: string
          kostra_enrichment?: Json | null
          maturity_level?: number | null
          municipality_name: string
          platform_recommendations?: Json | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          assessor_name?: string | null
          created_at?: string
          easa_evaluation?: Json | null
          id?: string
          kostra_enrichment?: Json | null
          maturity_level?: number | null
          municipality_name?: string
          platform_recommendations?: Json | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      drone_platforms: {
        Row: {
          c_class: string | null
          camera_specs: string | null
          category: string
          characteristic_dimension: number | null
          created_at: string
          drone_type: string
          easa_category: string | null
          has_parachute: boolean | null
          has_remote_id: boolean | null
          has_rtk: boolean | null
          has_thermal: boolean | null
          id: string
          ip_rating: string | null
          manufacturer: string
          max_altitude: number | null
          max_flight_time_min: number | null
          max_range_km: number | null
          max_speed: number | null
          max_takeoff_weight_kg: number | null
          model: string
          name: string | null
          notes: string | null
          payload_kg: number | null
          price_nok_estimate: number | null
          propulsion: string | null
          requires_cert: string | null
          sensor_types: string[] | null
          slug: string | null
          suitable_use_cases: string[] | null
          supports_bvlos: boolean | null
          url: string | null
          wind_resistance_ms: number | null
        }
        Insert: {
          c_class?: string | null
          camera_specs?: string | null
          category: string
          characteristic_dimension?: number | null
          created_at?: string
          drone_type?: string
          easa_category?: string | null
          has_parachute?: boolean | null
          has_remote_id?: boolean | null
          has_rtk?: boolean | null
          has_thermal?: boolean | null
          id?: string
          ip_rating?: string | null
          manufacturer: string
          max_altitude?: number | null
          max_flight_time_min?: number | null
          max_range_km?: number | null
          max_speed?: number | null
          max_takeoff_weight_kg?: number | null
          model: string
          name?: string | null
          notes?: string | null
          payload_kg?: number | null
          price_nok_estimate?: number | null
          propulsion?: string | null
          requires_cert?: string | null
          sensor_types?: string[] | null
          slug?: string | null
          suitable_use_cases?: string[] | null
          supports_bvlos?: boolean | null
          url?: string | null
          wind_resistance_ms?: number | null
        }
        Update: {
          c_class?: string | null
          camera_specs?: string | null
          category?: string
          characteristic_dimension?: number | null
          created_at?: string
          drone_type?: string
          easa_category?: string | null
          has_parachute?: boolean | null
          has_remote_id?: boolean | null
          has_rtk?: boolean | null
          has_thermal?: boolean | null
          id?: string
          ip_rating?: string | null
          manufacturer?: string
          max_altitude?: number | null
          max_flight_time_min?: number | null
          max_range_km?: number | null
          max_speed?: number | null
          max_takeoff_weight_kg?: number | null
          model?: string
          name?: string | null
          notes?: string | null
          payload_kg?: number | null
          price_nok_estimate?: number | null
          propulsion?: string | null
          requires_cert?: string | null
          sensor_types?: string[] | null
          slug?: string | null
          suitable_use_cases?: string[] | null
          supports_bvlos?: boolean | null
          url?: string | null
          wind_resistance_ms?: number | null
        }
        Relationships: []
      }
      easa_rules: {
        Row: {
          allows_bvlos: boolean | null
          allows_over_people: boolean | null
          c_class: string | null
          category: string
          created_at: string
          description_no: string
          id: string
          luftfartstilsynet_ref: string | null
          max_height_m: number | null
          max_weight_kg: number | null
          min_distance_people_m: number | null
          requirements_no: string | null
          requires_operator_reg: boolean | null
          requires_pilot_cert: string | null
          subcategory: string | null
          use_case_ids: string[] | null
        }
        Insert: {
          allows_bvlos?: boolean | null
          allows_over_people?: boolean | null
          c_class?: string | null
          category: string
          created_at?: string
          description_no: string
          id?: string
          luftfartstilsynet_ref?: string | null
          max_height_m?: number | null
          max_weight_kg?: number | null
          min_distance_people_m?: number | null
          requirements_no?: string | null
          requires_operator_reg?: boolean | null
          requires_pilot_cert?: string | null
          subcategory?: string | null
          use_case_ids?: string[] | null
        }
        Update: {
          allows_bvlos?: boolean | null
          allows_over_people?: boolean | null
          c_class?: string | null
          category?: string
          created_at?: string
          description_no?: string
          id?: string
          luftfartstilsynet_ref?: string | null
          max_height_m?: number | null
          max_weight_kg?: number | null
          min_distance_people_m?: number | null
          requirements_no?: string | null
          requires_operator_reg?: boolean | null
          requires_pilot_cert?: string | null
          subcategory?: string | null
          use_case_ids?: string[] | null
        }
        Relationships: []
      }
      flight_logs: {
        Row: {
          cost_model_version: number
          created_at: string
          drone_id: string | null
          drone_time_minutes: number | null
          end_time: string | null
          flight_date: string
          id: string
          location_description: string | null
          manual_reference_time_minutes: number | null
          mission_type: string
          notes: string | null
          organization_id: string
          pilot_id: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          cost_model_version?: number
          created_at?: string
          drone_id?: string | null
          drone_time_minutes?: number | null
          end_time?: string | null
          flight_date?: string
          id?: string
          location_description?: string | null
          manual_reference_time_minutes?: number | null
          mission_type?: string
          notes?: string | null
          organization_id: string
          pilot_id?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          cost_model_version?: number
          created_at?: string
          drone_id?: string | null
          drone_time_minutes?: number | null
          end_time?: string | null
          flight_date?: string
          id?: string
          location_description?: string | null
          manual_reference_time_minutes?: number | null
          mission_type?: string
          notes?: string | null
          organization_id?: string
          pilot_id?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_logs_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "org_drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      kostra_data: {
        Row: {
          fetched_at: string
          id: string
          indicator_id: string
          indicator_name: string
          municipality_code: string
          municipality_name: string
          unit: string | null
          value: number | null
          year: number
        }
        Insert: {
          fetched_at?: string
          id?: string
          indicator_id: string
          indicator_name: string
          municipality_code: string
          municipality_name: string
          unit?: string | null
          value?: number | null
          year: number
        }
        Update: {
          fetched_at?: string
          id?: string
          indicator_id?: string
          indicator_name?: string
          municipality_code?: string
          municipality_name?: string
          unit?: string | null
          value?: number | null
          year?: number
        }
        Relationships: []
      }
      municipality_profiles: {
        Row: {
          created_at: string
          geography_infrastructure: Json
          id: string
          municipality_name: string
          operations_economy: Json
          risk_profile: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          geography_infrastructure?: Json
          id?: string
          municipality_name: string
          operations_economy?: Json
          risk_profile?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          geography_infrastructure?: Json
          id?: string
          municipality_name?: string
          operations_economy?: Json
          risk_profile?: Json
          updated_at?: string
        }
        Relationships: []
      }
      org_documents: {
        Row: {
          created_at: string
          doc_type: string
          drone_id: string | null
          file_url: string | null
          id: string
          organization_id: string
          title: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          drone_id?: string | null
          file_url?: string | null
          id?: string
          organization_id: string
          title: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          drone_id?: string | null
          file_url?: string | null
          id?: string
          organization_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_documents_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "org_drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_drones: {
        Row: {
          created_at: string
          id: string
          model: string | null
          name: string
          organization_id: string
          owner_type: string
          serial_number: string | null
          status: Database["public"]["Enums"]["resource_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          name: string
          organization_id: string
          owner_type?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          name?: string
          organization_id?: string
          owner_type?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
        }
        Relationships: [
          {
            foreignKeyName: "org_drones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          config: Json | null
          created_at: string
          dmv_report: Json | null
          id: string
          municipality_number: string | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          dmv_report?: Json | null
          id?: string
          municipality_number?: string | null
          name: string
          org_type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          dmv_report?: Json | null
          id?: string
          municipality_number?: string | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: []
      }
      pilots: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          role: string | null
          status: Database["public"]["Enums"]["resource_status"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pilots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: {
        Args: {
          _name: string
          _org_type?: Database["public"]["Enums"]["org_type"]
        }
        Returns: string
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      org_role: "admin" | "member" | "viewer"
      org_type: "municipality" | "iks"
      resource_status: "active" | "inactive"
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
      org_role: ["admin", "member", "viewer"],
      org_type: ["municipality", "iks"],
      resource_status: ["active", "inactive"],
    },
  },
} as const
