import { supabase } from '@/integrations/supabase/client';

export interface KostraData {
  success: boolean;
  source?: string;
  municipality?: string;
  municipality_code?: string;
  indicators?: Array<{ id: string; name: string; value: number; unit: string; year?: string }>;
  drone_relevance?: {
    population_density: number | null;
    estimated_road_km: number | null;
    estimated_buildings: number | null;
    infrastructure_complexity: string;
  };
  error?: string;
}

export interface EasaEvaluation {
  success: boolean;
  evaluation?: {
    regulatory_maturity_percent: number;
    allowed_categories: string[];
    required_certifications: string[];
    recommendations: string[];
    gaps: Array<{ area: string; severity: string; action: string }>;
    applicable_rules: any[];
  };
  error?: string;
}

export interface PlatformRecommendation {
  success: boolean;
  platforms?: Array<{
    id: string;
    manufacturer: string;
    model: string;
    c_class: string | null;
    category: string;
    max_takeoff_weight_kg: number | null;
    max_flight_time_min: number | null;
    camera_specs: string | null;
    sensor_types: string[];
    has_rtk: boolean;
    ip_rating: string | null;
    price_nok_estimate: number | null;
    suitable_use_cases: string[];
    easa_category: string | null;
    requires_cert: string | null;
    url: string | null;
    match_score: number;
    match_reasons: string[];
  }>;
  total_available?: number;
  error?: string;
}

export const evaluationApi = {
  async fetchKostraData(municipalityName: string): Promise<KostraData> {
    const { data, error } = await supabase.functions.invoke('kostra-data', {
      body: { municipality_name: municipalityName },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async evaluateEasa(params: {
    answers: Record<string, number>;
    municipality_name: string;
    maturity_level: number;
    use_case_ids?: string[];
  }): Promise<EasaEvaluation> {
    const { data, error } = await supabase.functions.invoke('easa-evaluate', {
      body: params,
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async recommendPlatforms(params: {
    maturity_level: number;
    use_case_ids?: string[];
    budget_range?: { min: number; max: number };
    sensor_needs?: string[];
  }): Promise<PlatformRecommendation> {
    const { data, error } = await supabase.functions.invoke('platform-recommend', {
      body: params,
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async saveAssessment(params: {
    municipality_name: string;
    assessor_name: string;
    answers: Record<string, number>;
    total_score: number;
    maturity_level: number;
    kostra_enrichment?: any;
    easa_evaluation?: any;
    platform_recommendations?: any;
  }) {
    const { data, error } = await supabase
      .from('assessments')
      .insert(params as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
