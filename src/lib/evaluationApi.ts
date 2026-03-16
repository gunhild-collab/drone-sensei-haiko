import { supabase } from '@/integrations/supabase/client';

export interface KostraSectorData {
  sector: string;
  expenditure_1000nok: number | null;
  employees_fte: number | null;
  year: string;
  source: string;
}

export interface KostraData {
  success: boolean;
  source?: string;
  municipality?: string;
  municipality_code?: string;
  area_km2?: number;
  indicators?: Array<{ id: string; name: string; value: number; unit: string; year?: string }>;
  drone_relevance?: {
    population_density: number | null;
    population_bracket: string;
    estimated_road_km: number | null;
    estimated_buildings: number | null;
    estimated_va_km: number | null;
    estimated_agri_km2: number | null;
    infrastructure_complexity: string;
    centrality_index: number | null;
    urban_rural: string | null;
    controlled_airspace: { type: string; airport: string; radius_km: number } | null;
    protected_areas: string[];
  };
  services?: {
    active_services: string[];
    departments: Array<{ id: string; name: string; relevant_use_cases: string[] }>;
  };
  fire_stats?: any;
  sector_data?: KostraSectorData[];
  sector_data_source?: 'ssb' | 'estimated';
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

export interface FlightHourEstimate {
  use_case_id: string;
  department: string;
  hours: number;
  basis: string;
}

export interface DepartmentNeed {
  department_id: string;
  department_name: string;
  annual_flight_hours: number;
  use_cases: string[];
  drones_needed: number;
}

export interface ConsolidationGroup {
  departments: string[];
  shared_drone_type: string;
  combined_hours: number;
  can_share: boolean;
  reason: string;
}

export interface ProgramCost {
  hardware_total: number;
  permit_setup_cost: number;
  drones_needed: number;
  consolidated_drones_needed: number;
  consolidated_hardware_total: number;
  consolidated_permit_cost: number;
  savings_nok: number;
  total_annual_flight_hours: number;
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
  flight_hours?: FlightHourEstimate[];
  department_needs?: DepartmentNeed[];
  consolidation?: {
    shared_groups: ConsolidationGroup[];
    consolidated_drone_count: number;
    consolidated_permit_count: number;
    recommendations: string[];
  };
  program_cost?: ProgramCost;
  error?: string;
}

export interface SoraAssessment {
  success: boolean;
  municipality?: string;
  population_density?: number;
  population_category?: string;
  scenario?: { altitude_m: number; is_controlled_airspace: boolean; is_bvlos: boolean };
  assessments?: Array<{
    platform_id: string;
    platform_name: string;
    max_takeoff_weight_kg: number | null;
    c_class: string | null;
    easa_category: string | null;
    sora: {
      intrinsic_grc: number;
      grc_mitigations: number;
      final_grc: number;
      grc_size_class: string;
      population_category: string;
      scenario: string;
      initial_arc: string;
      residual_arc: string;
      arc_mitigations: string;
      sail: number | string;
      sail_description: string;
      tmpr: { level: string; description_no: string };
      needs_sora_application: boolean;
      needs_sts: boolean;
      recommendation_no: string;
    };
    caa_compliance: {
      categories: string[];
      sts_eligible: string[];
      certifications_no: string[];
      luftfartstilsynet_refs: string[];
    };
    operational_limits: {
      max_altitude_m: number | string;
      vlos_required: boolean;
      min_distance_people_m: number;
      requires_operator_registration: boolean;
      requires_insurance: boolean;
    };
  }>;
  references?: Record<string, string>;
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
    municipal_data?: {
      road_km?: number | null;
      buildings?: number | null;
      va_km?: number | null;
      area_km2?: number | null;
    };
    area_km2?: number;
  }): Promise<PlatformRecommendation> {
    const { data, error } = await supabase.functions.invoke('platform-recommend', {
      body: params,
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async calculateSora(params: {
    platform_ids?: string[];
    municipality_name: string;
    population_density?: number;
    use_case_ids?: string[];
    altitude_m?: number;
    is_controlled_airspace?: boolean;
    is_bvlos?: boolean;
  }): Promise<SoraAssessment> {
    const { data, error } = await supabase.functions.invoke('sora-calculate', {
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
