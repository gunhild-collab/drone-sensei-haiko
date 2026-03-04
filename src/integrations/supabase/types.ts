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
          created_at: string
          easa_category: string | null
          has_rtk: boolean | null
          id: string
          ip_rating: string | null
          manufacturer: string
          max_flight_time_min: number | null
          max_range_km: number | null
          max_takeoff_weight_kg: number | null
          model: string
          price_nok_estimate: number | null
          requires_cert: string | null
          sensor_types: string[] | null
          suitable_use_cases: string[] | null
          url: string | null
          wind_resistance_ms: number | null
        }
        Insert: {
          c_class?: string | null
          camera_specs?: string | null
          category: string
          created_at?: string
          easa_category?: string | null
          has_rtk?: boolean | null
          id?: string
          ip_rating?: string | null
          manufacturer: string
          max_flight_time_min?: number | null
          max_range_km?: number | null
          max_takeoff_weight_kg?: number | null
          model: string
          price_nok_estimate?: number | null
          requires_cert?: string | null
          sensor_types?: string[] | null
          suitable_use_cases?: string[] | null
          url?: string | null
          wind_resistance_ms?: number | null
        }
        Update: {
          c_class?: string | null
          camera_specs?: string | null
          category?: string
          created_at?: string
          easa_category?: string | null
          has_rtk?: boolean | null
          id?: string
          ip_rating?: string | null
          manufacturer?: string
          max_flight_time_min?: number | null
          max_range_km?: number | null
          max_takeoff_weight_kg?: number | null
          model?: string
          price_nok_estimate?: number | null
          requires_cert?: string | null
          sensor_types?: string[] | null
          suitable_use_cases?: string[] | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
