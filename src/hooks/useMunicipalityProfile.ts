import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RosEvent {
  type: string; // flom, skred, skogbrann, trafikkulykke, CBRNE, annet
  description: string;
  year?: number;
  severity?: "lav" | "middels" | "høy" | "kritisk";
}

export interface ResponseTime {
  brann_min?: number;
  helse_min?: number;
  redning_min?: number;
  teknisk_vakt_min?: number;
  notes?: string;
}

export interface CriticalInfra {
  name: string;
  type: string; // skole, sykehjem, arrangement, kraftverk, etc.
  lat?: number;
  lng?: number;
}

export interface EmergencyPlanLink {
  title: string;
  url: string;
  type: "ros_analyse" | "beredskapsplan" | "annet";
}

export interface RiskProfile {
  ros_events: RosEvent[];
  response_times: ResponseTime;
  critical_infrastructure: CriticalInfra[];
  emergency_plan_links: EmergencyPlanLink[];
}

export interface GisLayer {
  name: string;
  type: string; // topografi, skogdekke, vassdrag, flomsone, skred
  url?: string;
}

export interface Settlement {
  name: string;
  population?: number;
  distance_km?: number;
  type?: "tettsted" | "ressurssenter" | "kommunesenter";
}

export interface InfrastructureData {
  road_km?: number;
  bridges_count?: number;
  building_portfolio?: number;
  va_km?: number;
  powerlines_km?: number;
}

export interface DroneZone {
  name: string;
  type: "drone_intensive" | "dronehavn" | "flykorridor";
  lat?: number;
  lng?: number;
  description?: string;
}

export interface GeographyInfrastructure {
  gis_layers: GisLayer[];
  settlements: Settlement[];
  infrastructure: InfrastructureData;
  drone_zones: DroneZone[];
}

export interface SectorBudget {
  sector: string;
  maintenance_nok?: number;
  investment_nok?: number;
  year?: number;
}

export interface StaffingEntry {
  sector: string;
  headcount?: number;
  drone_eligible_hours?: number;
  tasks?: string;
}

export interface ExistingDroneUse {
  has_drones: boolean;
  drone_types?: string;
  use_areas?: string;
  internal_pilots?: number;
  external_suppliers?: string;
}

export interface SectorPotential {
  sector: string;
  time_saving: "lav" | "medium" | "høy";
  cost_saving: "lav" | "medium" | "høy";
  primary_tasks?: string;
}

export interface RegulatoryStatus {
  knows_easa: boolean;
  knows_sora_sts: boolean;
  has_internal_routines: boolean;
  notes?: string;
}

export interface OperationsEconomy {
  budgets: SectorBudget[];
  staffing: StaffingEntry[];
  existing_drone_use: ExistingDroneUse;
  sector_potential: SectorPotential[];
  regulatory_status: RegulatoryStatus;
}

export interface MunicipalityProfile {
  id?: string;
  municipality_name: string;
  risk_profile: RiskProfile;
  geography_infrastructure: GeographyInfrastructure;
  operations_economy: OperationsEconomy;
}

const defaultRiskProfile: RiskProfile = {
  ros_events: [],
  response_times: {},
  critical_infrastructure: [],
  emergency_plan_links: [],
};

const defaultGeography: GeographyInfrastructure = {
  gis_layers: [],
  settlements: [],
  infrastructure: {},
  drone_zones: [],
};

const defaultOperations: OperationsEconomy = {
  budgets: [],
  staffing: [],
  existing_drone_use: { has_drones: false },
  sector_potential: [],
  regulatory_status: { knows_easa: false, knows_sora_sts: false, has_internal_routines: false },
};

export function useMunicipalityProfile(municipalityName: string) {
  const [profile, setProfile] = useState<MunicipalityProfile>({
    municipality_name: municipalityName,
    risk_profile: defaultRiskProfile,
    geography_infrastructure: defaultGeography,
    operations_economy: defaultOperations,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!municipalityName) return;
    setLoading(true);
    supabase
      .from("municipality_profiles")
      .select("*")
      .eq("municipality_name", municipalityName)
      .maybeSingle()
      .then(({ data, error }) => {
        if (data) {
          setProfile({
            id: data.id,
            municipality_name: data.municipality_name,
            risk_profile: (data.risk_profile as unknown as RiskProfile) || defaultRiskProfile,
            geography_infrastructure: (data.geography_infrastructure as unknown as GeographyInfrastructure) || defaultGeography,
            operations_economy: (data.operations_economy as unknown as OperationsEconomy) || defaultOperations,
          });
        } else {
          setProfile({
            municipality_name: municipalityName,
            risk_profile: defaultRiskProfile,
            geography_infrastructure: defaultGeography,
            operations_economy: defaultOperations,
          });
        }
        setLoading(false);
      });
  }, [municipalityName]);

  const updateRisk = useCallback((update: Partial<RiskProfile>) => {
    setProfile(prev => ({ ...prev, risk_profile: { ...prev.risk_profile, ...update } }));
  }, []);

  const updateGeography = useCallback((update: Partial<GeographyInfrastructure>) => {
    setProfile(prev => ({ ...prev, geography_infrastructure: { ...prev.geography_infrastructure, ...update } }));
  }, []);

  const updateOperations = useCallback((update: Partial<OperationsEconomy>) => {
    setProfile(prev => ({ ...prev, operations_economy: { ...prev.operations_economy, ...update } }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        municipality_name: profile.municipality_name,
        risk_profile: profile.risk_profile as unknown as Record<string, unknown>,
        geography_infrastructure: profile.geography_infrastructure as unknown as Record<string, unknown>,
        operations_economy: profile.operations_economy as unknown as Record<string, unknown>,
      };

      if (profile.id) {
        await supabase.from("municipality_profiles").update(payload).eq("id", profile.id);
      } else {
        const { data } = await supabase.from("municipality_profiles").insert(payload).select("id").single();
        if (data) setProfile(prev => ({ ...prev, id: data.id }));
      }
      toast.success("Kommuneprofil lagret");
    } catch {
      toast.error("Kunne ikke lagre profilen");
    } finally {
      setSaving(false);
    }
  }, [profile]);

  return { profile, loading, saving, updateRisk, updateGeography, updateOperations, save };
}
