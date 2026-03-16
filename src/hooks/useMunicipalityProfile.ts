import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RosEvent {
  type: string;
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
  type: string;
  lat?: number;
  lng?: number;
}

export interface EmergencyPlanLink {
  title: string;
  url: string;
  type: "ros_analyse" | "beredskapsplan" | "annet";
}

export interface FireStats {
  total_fires?: number;
  building_fires?: number;
  chimney_fires?: number;
  total_callouts?: number;
  fire_expenditure_1000nok?: number;
  fire_ftes?: number;
  year?: string;
  source?: string;
}

export interface RiskProfile {
  ros_events: RosEvent[];
  response_times: ResponseTime;
  critical_infrastructure: CriticalInfra[];
  emergency_plan_links: EmergencyPlanLink[];
  fire_stats?: FireStats;
}

export interface SectorBudget {
  sector: string;
  maintenance_nok?: number;
  investment_nok?: number;
  year?: number;
  source?: string; // "kostra" | "manual"
}

export interface StaffingEntry {
  sector: string;
  headcount?: number;
  drone_eligible_hours?: number;
  tasks?: string;
  source?: string; // "kostra" | "manual"
}

export interface ExistingDroneUse {
  has_drones: boolean;
  drone_types?: string;
  use_areas?: string;
  internal_pilots?: number;
  external_suppliers?: string;
}

export interface OperationsEconomy {
  budgets: SectorBudget[];
  staffing: StaffingEntry[];
  existing_drone_use: ExistingDroneUse;
}

export interface MunicipalityProfile {
  id?: string;
  municipality_name: string;
  risk_profile: RiskProfile;
  operations_economy: OperationsEconomy;
}

const defaultRiskProfile: RiskProfile = {
  ros_events: [],
  response_times: {},
  critical_infrastructure: [],
  emergency_plan_links: [],
};

const defaultOperations: OperationsEconomy = {
  budgets: [],
  staffing: [],
  existing_drone_use: { has_drones: false },
};

export function useMunicipalityProfile(municipalityName: string) {
  const [profile, setProfile] = useState<MunicipalityProfile>({
    municipality_name: municipalityName,
    risk_profile: defaultRiskProfile,
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
      .then(({ data }) => {
        if (data) {
          setProfile({
            id: data.id,
            municipality_name: data.municipality_name,
            risk_profile: (data.risk_profile as unknown as RiskProfile) || defaultRiskProfile,
            operations_economy: (data.operations_economy as unknown as OperationsEconomy) || defaultOperations,
          });
        } else {
          setProfile({
            municipality_name: municipalityName,
            risk_profile: defaultRiskProfile,
            operations_economy: defaultOperations,
          });
        }
        setLoading(false);
      });
  }, [municipalityName]);

  const updateRisk = useCallback((update: Partial<RiskProfile>) => {
    setProfile(prev => ({ ...prev, risk_profile: { ...prev.risk_profile, ...update } }));
  }, []);

  const updateOperations = useCallback((update: Partial<OperationsEconomy>) => {
    setProfile(prev => ({ ...prev, operations_economy: { ...prev.operations_economy, ...update } }));
  }, []);

  // Populate from KOSTRA data
  const populateFromKostra = useCallback((kostraData: any) => {
    if (!kostraData?.success) return;

    // Fire stats from SSB
    if (kostraData.fire_stats) {
      setProfile(prev => ({
        ...prev,
        risk_profile: {
          ...prev.risk_profile,
          fire_stats: kostraData.fire_stats,
        },
      }));
    }

    // Budget data from KOSTRA
    if (kostraData.municipal_economy) {
      const eco = kostraData.municipal_economy;
      const kostraBudgets: SectorBudget[] = [];
      if (eco.fire_expenditure_1000nok) {
        kostraBudgets.push({ sector: "Brann", maintenance_nok: eco.fire_expenditure_1000nok * 1000, source: "kostra", year: parseInt(eco.year) || undefined });
      }
      if (eco.road_expenditure_1000nok) {
        kostraBudgets.push({ sector: "Drift/vei", maintenance_nok: eco.road_expenditure_1000nok * 1000, source: "kostra", year: parseInt(eco.year) || undefined });
      }
      if (eco.va_expenditure_1000nok) {
        kostraBudgets.push({ sector: "VA", maintenance_nok: eco.va_expenditure_1000nok * 1000, source: "kostra", year: parseInt(eco.year) || undefined });
      }

      const kostraStaffing: StaffingEntry[] = [];
      if (eco.fire_ftes) {
        kostraStaffing.push({ sector: "Brann", headcount: Math.round(eco.fire_ftes), source: "kostra" });
      }

      setProfile(prev => {
        const manualBudgets = prev.operations_economy.budgets.filter(b => b.source !== "kostra");
        const manualStaff = prev.operations_economy.staffing.filter(s => s.source !== "kostra");
        return {
          ...prev,
          operations_economy: {
            ...prev.operations_economy,
            budgets: [...kostraBudgets, ...manualBudgets],
            staffing: [...kostraStaffing, ...manualStaff],
          },
        };
      });
    }
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        municipality_name: profile.municipality_name,
        risk_profile: profile.risk_profile as any,
        geography_infrastructure: {} as any,
        operations_economy: profile.operations_economy as any,
      };

      if (profile.id) {
        await supabase.from("municipality_profiles").update(payload).eq("id", profile.id);
      } else {
        const { data } = await supabase.from("municipality_profiles").insert([payload]).select("id").single();
        if (data) setProfile(prev => ({ ...prev, id: data.id }));
      }
      toast.success("Kommuneprofil lagret");
    } catch {
      toast.error("Kunne ikke lagre profilen");
    } finally {
      setSaving(false);
    }
  }, [profile]);

  return { profile, loading, saving, updateRisk, updateOperations, populateFromKostra, save };
}
