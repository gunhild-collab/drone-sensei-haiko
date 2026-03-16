import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, Plane, Shield, GraduationCap, Clock, DollarSign, Users,
  ChevronRight, ChevronDown, AlertTriangle, Flame, Route, Droplets,
  Building2, TreePine, Heart, Map, Leaf, Sparkles, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ActiveDepartment } from "./DepartmentEditor";

const iconMap: Record<string, React.ComponentType<any>> = {
  Flame, Route, Droplets, Building2, TreePine, Heart, Map, Leaf,
};

export interface DroneAnalysisResult {
  summary: string;
  department_analyses: Array<{
    department: string;
    use_cases: Array<{
      name: string;
      description: string;
      operation_type: string;
      easa_category: string;
      required_permit: string;
      pilot_certification: string;
      drone_type: string;
      priority: string;
      annual_flight_hours: number;
      calculation_basis?: string;
      needs_thermal?: boolean;
      needs_rtk?: boolean;
    }>;
    total_annual_hours: number;
  }>;
  certification_plan?: {
    pilot_groups: Array<{
      group_name: string;
      certification_path: string;
      covers_use_cases: string[];
      training_description: string;
      estimated_training_days: number;
    }>;
  };
  drone_fleet: Array<{
    drone_type: string;
    recommended_model: string;
    quantity: number;
    shared_between: string[];
    estimated_cost_nok: number;
    key_features?: string[];
  }>;
  iks_recommendation: {
    can_share: boolean;
    shared_resources?: string[];
    recommendation: string;
    partner_municipalities?: string[];
  };
  total_drones_needed: number;
  total_annual_cost_nok: number;
  total_annual_flight_hours: number;
  implementation_priority: Array<{
    phase: number;
    title: string;
    departments: string[];
    description: string;
  }>;
}

interface Props {
  municipalityName: string;
  population: number;
  areaKm2: number | null;
  roadKm: number | null;
  vaKm: number | null;
  buildings: number | null;
  terrainType: string;
  densityPerKm2: number;
  departments: ActiveDepartment[];
  iksPartners: string[];
  onContinue: () => void;
  onBack: () => void;
}

export default function DroneAnalysis({
  municipalityName, population, areaKm2, roadKm, vaKm, buildings,
  terrainType, densityPerKm2, departments, iksPartners, onContinue, onBack
}: Props) {
  const [analysis, setAnalysis] = useState<DroneAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("dmv-analyze", {
          body: {
            municipality_name: municipalityName,
            population,
            area_km2: areaKm2,
            road_km: roadKm,
            va_km: vaKm,
            buildings,
            terrain_type: terrainType,
            density_per_km2: densityPerKm2,
            departments: departments.filter(d => d.enabled).map(d => d.name),
            iks_partners: iksPartners,
          },
        });
        if (fnError) throw new Error(fnError.message);
        if (!data?.success) throw new Error(data?.error || "Analyse feilet");
        setAnalysis(data.analysis);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [municipalityName]);

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Analyserer mulighetsrom</h1>
            <p className="text-sm text-muted-foreground">AI vurderer droneoperasjoner for {municipalityName}...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive/60" />
            <h2 className="text-lg font-display font-bold">Analyse feilet</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={onBack} variant="outline">Tilbake</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) return null;

  const priorityColor = (p: string) => {
    if (p === "Høy") return "bg-destructive/10 text-destructive border-destructive/20";
    if (p === "Medium") return "bg-chart-3/10 text-chart-3 border-chart-3/20";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Mulighetsrom — {municipalityName}</h1>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Plane className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-display font-bold">{analysis.total_drones_needed}</p>
              <p className="text-xs text-muted-foreground">Droner totalt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Clock className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-display font-bold">{analysis.total_annual_flight_hours}</p>
              <p className="text-xs text-muted-foreground">Flytimer/år</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <DollarSign className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-display font-bold">{(analysis.total_annual_cost_nok / 1000).toFixed(0)}k</p>
              <p className="text-xs text-muted-foreground">Estimert kostnad (NOK)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Users className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-display font-bold">{analysis.department_analyses.length}</p>
              <p className="text-xs text-muted-foreground">Avdelinger</p>
            </CardContent>
          </Card>
        </div>

        {/* Department breakdown */}
        <div className="space-y-3 mb-6">
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Operasjoner per avdeling
          </h2>
          {analysis.department_analyses.map((dept) => (
            <Card key={dept.department}>
              <button
                onClick={() => setExpandedDept(expandedDept === dept.department ? null : dept.department)}
                className="w-full text-left"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{dept.department}</p>
                        <p className="text-xs text-muted-foreground">{dept.use_cases.length} operasjoner · {dept.total_annual_hours} timer/år</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {dept.use_cases.filter(uc => uc.priority === "Høy").length > 0 && (
                          <Badge className={cn("text-[10px]", priorityColor("Høy"))}>
                            {dept.use_cases.filter(uc => uc.priority === "Høy").length} høy
                          </Badge>
                        )}
                      </div>
                      {expandedDept === dept.department ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </CardContent>
              </button>

              <AnimatePresence>
                {expandedDept === dept.department && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 space-y-2">
                      {dept.use_cases.map((uc, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50 text-sm space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{uc.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{uc.description}</p>
                            </div>
                            <Badge className={cn("text-[10px] ml-2 flex-shrink-0", priorityColor(uc.priority))}>
                              {uc.priority}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Plane className="w-2.5 h-2.5" /> {uc.operation_type}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Shield className="w-2.5 h-2.5" /> {uc.easa_category}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <GraduationCap className="w-2.5 h-2.5" /> {uc.pilot_certification}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {uc.drone_type}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {uc.annual_flight_hours} t/år
                            </Badge>
                            {uc.calculation_basis && (
                              <span className="text-[10px] text-muted-foreground italic">{uc.calculation_basis}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>

        {/* Drone fleet */}
        <div className="space-y-3 mb-6">
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" /> Anbefalt droneflåte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.drone_fleet.map((drone, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{drone.recommended_model}</p>
                    <Badge variant="secondary" className="text-xs">×{drone.quantity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{drone.drone_type}</p>
                  <div className="flex flex-wrap gap-1">
                    {drone.shared_between.map(dept => (
                      <Badge key={dept} variant="outline" className="text-[10px]">{dept}</Badge>
                    ))}
                  </div>
                  {drone.key_features && (
                    <div className="flex flex-wrap gap-1">
                      {drone.key_features.map((f, fi) => (
                        <Badge key={fi} variant="secondary" className="text-[10px]">{f}</Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs font-medium text-primary">
                    {drone.estimated_cost_nok.toLocaleString('nb-NO')} NOK
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Certification plan */}
        {analysis.certification_plan && analysis.certification_plan.pilot_groups.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> Sertifiseringsplan
            </h2>
            {analysis.certification_plan.pilot_groups.map((group, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{group.group_name}</p>
                    <Badge variant="secondary" className="text-xs">{group.estimated_training_days} dager</Badge>
                  </div>
                  <p className="text-xs font-medium text-primary">{group.certification_path}</p>
                  <p className="text-xs text-muted-foreground">{group.training_description}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.covers_use_cases.map(uc => (
                      <Badge key={uc} variant="outline" className="text-[10px]">{uc}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* IKS */}
        {analysis.iks_recommendation && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-accent" /> IKS-samarbeid (brannvesen)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{analysis.iks_recommendation.recommendation}</p>
              {analysis.iks_recommendation.partner_municipalities && analysis.iks_recommendation.partner_municipalities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {analysis.iks_recommendation.partner_municipalities.map(m => (
                    <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Implementation phases */}
        {analysis.implementation_priority.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="text-lg font-display font-semibold">Implementeringsplan</h2>
            {analysis.implementation_priority.map((phase) => (
              <Card key={phase.phase}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-sm flex-shrink-0">
                      {phase.phase}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{phase.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {phase.departments.map(d => (
                          <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>Tilbake</Button>
          <Button onClick={onContinue} className="gap-2 font-display font-semibold">
            Fordyp med DMV-vurdering <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
