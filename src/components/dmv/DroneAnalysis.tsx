import React, { useState, useEffect } from "react";
import type { BrisMissionData } from "@/hooks/useMunicipalityProfile";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Loader2, Plane, Shield, GraduationCap, Clock, DollarSign, Users, MapPin,
  ChevronRight, ChevronDown, AlertTriangle, Flame, Route, Droplets,
  Building2, TreePine, Heart, Map, Leaf, Sparkles, ArrowRight,
  Info, BookOpen, Siren, Milestone, Home
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { KostraSectorData } from "@/lib/evaluationApi";
import type { ActiveDepartment } from "./DepartmentEditor";

const iconMap: Record<string, React.ComponentType<any>> = {
  Flame, Route, Droplets, Building2, TreePine, Heart, Map, Leaf,
};

// ─── Friendly scenario labels ───
function friendlyLabel(code: string): string {
  if (!code) return code;
  const map: Record<string, string> = {
    'VLOS': '👁️ Visuell kontakt (VLOS)',
    'BVLOS': '🛩️ Utenfor synsrekkevidde (BVLOS)',
    'A1/A3': '📝 Grunnkurs A1/A3',
    'A2': '🎓 Utvidet VLOS (A2)',
    'STS-01': '📋 Standard VLOS (STS-01)',
    'STS-02': '📋 Standard BVLOS (STS-02)',
    'PDRA': '📑 Forhåndsvurdert risiko (PDRA)',
    'SORA': '🔬 Full risikovurdering (SORA)',
  };
  const lower = code.toLowerCase();
  // Exact match first
  if (map[code]) return map[code];
  // Partial match
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return code;
}

function friendlyCategory(cat: string): string {
  if (!cat) return cat;
  const lower = cat.toLowerCase();
  if (lower.includes('åpen')) return '🟢 Åpen kategori';
  if (lower.includes('spesifikk')) return '🟡 Spesifikk kategori';
  if (lower.includes('sertifisert')) return '🔴 Sertifisert kategori';
  return cat;
}

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
      practical_outcome?: string;
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
  drone_mission_savings?: {
    total_annual_missions: number;
    drone_replaceable_missions: number;
    categories: Array<{
      category: string;
      mission_types: string[];
      annual_missions: number;
      drone_role: 'erstatter_utrykning' | 'raskere_situasjonsbilde' | 'reduserer_biler';
      description: string;
      estimated_truck_reduction_pct: number;
      estimated_time_saved_min?: number;
      annual_savings_nok?: number;
    }>;
    total_annual_savings_nok?: number;
    summary: string;
  };
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
  fireDeptName: string | null;
  fireDeptType: string | null;
  alarmSentralName: string | null;
  regionMunicipalities: string[];
  sectorData: KostraSectorData[];
  fireStats: {
    fire_expenditure_1000nok?: number;
    year?: string;
    source?: string;
  } | null;
  brisMissionData: BrisMissionData | null;
  onContinue: () => void;
  onBack: () => void;
}

/* ─── Reusable info-box widget ─── */
function InfoBox({ title, icon, children, variant = "default" }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "warning" | "accent";
}) {
  const variants = {
    default: "border-primary/20 bg-primary/[0.03]",
    warning: "border-chart-3/30 bg-chart-3/[0.04]",
    accent: "border-accent/30 bg-accent/[0.04]",
  };
  const iconColors = {
    default: "text-primary",
    warning: "text-chart-3",
    accent: "text-accent",
  };
  return (
    <Card className={cn("border", variants[variant])}>
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={iconColors[variant]}>{icon}</span>
          <p className="text-sm font-display font-semibold">{title}</p>
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">{children}</div>
      </CardContent>
    </Card>
  );
}

/* ─── "How to read this report" box ─── */
function HowToReadBox() {
  return (
    <InfoBox title="Slik leser du denne rapporten" icon={<BookOpen className="w-4 h-4" />}>
      <p>Rapporten skiller mellom tre typer innhold:</p>
      <ul className="list-none space-y-1 ml-0">
        <li className="flex items-start gap-2">
          <Badge variant="outline" className="text-[9px] mt-0.5 flex-shrink-0 border-green-500/40 text-green-700">Fakta</Badge>
          <span>Tekniske data fra produsent og gjeldende EASA/Luftfartstilsynet-regelverk.</span>
        </li>
        <li className="flex items-start gap-2">
          <Badge variant="outline" className="text-[9px] mt-0.5 flex-shrink-0 border-blue-500/40 text-blue-700">Estimat</Badge>
          <span>Flytimer, kostnader og dekningsområder beregnet av modellen basert på kommunedata — ikke historiske tall eller vedtatte budsjett.</span>
        </li>
        <li className="flex items-start gap-2">
          <Badge variant="outline" className="text-[9px] mt-0.5 flex-shrink-0 border-purple-500/40 text-purple-700">Anbefaling</Badge>
          <span>Strategiske forslag til implementering, IKS-samarbeid og organisering. Disse er scenarier for vurdering, ikke vedtatte tiltak.</span>
        </li>
      </ul>
    </InfoBox>
  );
}

/* ─── Glossary box ─── */
function GlossaryTerms() {
  const terms = [
    { term: "VLOS", emoji: "👁️", desc: "Visual Line of Sight — piloten ser dronen hele tiden." },
    { term: "BVLOS", emoji: "🛩️", desc: "Beyond Visual Line of Sight — dronen flyr utenfor synsrekkevidde, f.eks. fra en dronestasjon." },
    { term: "A1/A3", emoji: "📝", desc: "Grunnleggende nettkurs for åpen kategori. Gir rett til å fly lette droner (<25 kg) med visuell kontakt." },
    { term: "A2", emoji: "🎓", desc: "Utvidet sertifikat for åpen kategori — gir rett til å fly nærmere mennesker med droner opp til 4 kg." },
    { term: "STS-01 / STS-02", emoji: "📋", desc: "Standardscenarier i spesifikk kategori. Krever erklæring, opplæring og operasjonsmanual." },
    { term: "SORA", emoji: "🔬", desc: "Specific Operations Risk Assessment — en systematisk risikovurdering for droneoperasjoner utenfor standardscenarier." },
    { term: "PDRA", emoji: "📑", desc: "Predefined Risk Assessment — forhåndsdefinert risikoscenario som forenkler søknadsprosessen." },
    { term: "ERP", emoji: "🚨", desc: "Emergency Response Plan — beredskapsplan for uforutsette hendelser under flyging." },
    { term: "OpAuth", emoji: "✅", desc: "Operasjonsautorisasjon — godkjenning fra Luftfartstilsynet som gir rett til å fly i spesifikk kategori." },
    { term: "Spesifikk kategori", emoji: "🟡", desc: "Droneoperasjoner som krever ekstra risikovurdering og tillatelse ut over åpen kategori." },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      {terms.map(t => (
        <p key={t.term}><span className="font-semibold text-foreground">{t.emoji} {t.term}:</span> {t.desc}</p>
      ))}
    </div>
  );
}

const priorityColor = (p: string) => {
  if (p === "Høy") return "bg-destructive/10 text-destructive border-destructive/20";
  if (p === "Medium") return "bg-chart-3/10 text-chart-3 border-chart-3/20";
  return "bg-muted text-muted-foreground border-border";
};

/* ─── Department × Drone Matrix ─── */
function DepartmentDroneMatrix({ departmentAnalyses, droneFleet, expandedDept, setExpandedDept }: {
  departmentAnalyses: DroneAnalysisResult['department_analyses'];
  droneFleet: DroneAnalysisResult['drone_fleet'];
  expandedDept: string | null;
  setExpandedDept: (d: string | null) => void;
}) {
  const droneColumns = droneFleet.length > 0
    ? droneFleet.map(d => ({ label: d.recommended_model, type: d.drone_type, departments: d.shared_between }))
    : [
        { label: 'DJI Dock 2', type: 'Multirotor', departments: [] as string[] },
        { label: 'FX10', type: 'Fixed-wing', departments: [] as string[] },
        { label: 'M30T', type: 'Feltdrone', departments: [] as string[] },
      ];

  function getMatchingUseCases(dept: DroneAnalysisResult['department_analyses'][0], droneCol: typeof droneColumns[0]) {
    return dept.use_cases.filter(uc => {
      const ucType = (uc.drone_type || '').toLowerCase();
      const colType = droneCol.type.toLowerCase();
      const colLabel = droneCol.label.toLowerCase();
      if (ucType.includes(colType) || ucType.includes(colLabel) || colType.includes(ucType)) return true;
      if (ucType.includes('multirotor') || ucType.includes('dock') || ucType.includes('dji dock')) return colType.includes('multirotor') || colLabel.includes('dock');
      if (ucType.includes('fixed') || ucType.includes('wing') || ucType.includes('fx')) return colType.includes('fixed') || colLabel.includes('fx');
      if (ucType.includes('felt') || ucType.includes('m30') || ucType.includes('matrice 30')) return colType.includes('felt') || colLabel.includes('m30');
      return false;
    });
  }

  const totalDepts = departmentAnalyses.length;
  const totalOps = departmentAnalyses.reduce((s, d) => s + d.use_cases.length, 0);
  const activeDrones = droneColumns.filter(dc =>
    departmentAnalyses.some(dept => getMatchingUseCases(dept, dc).length > 0)
  ).length;

  function getQuickWin(dept: DroneAnalysisResult['department_analyses'][0]) {
    const sorted = [...dept.use_cases].sort((a, b) => {
      const prio: Record<string, number> = { 'Høy': 0, 'Medium': 1, 'Lav': 2 };
      const pa = prio[a.priority] ?? 2;
      const pb = prio[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return a.annual_flight_hours - b.annual_flight_hours;
    });
    return sorted[0] || null;
  }

  const droneEmojis = ['🏠', '✈️', '🚁', '🤖', '📡'];

  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="py-3">
          <p className="text-sm font-medium text-center">
            <span className="text-primary font-bold">{activeDrones || droneColumns.length} droner</span> dekker{' '}
            <span className="text-primary font-bold">{totalDepts} avdelinger</span> og{' '}
            <span className="text-primary font-bold">{totalOps} operasjoner</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Avdeling</th>
                  {droneColumns.map((dc, i) => (
                    <th key={i} className="text-center py-3 px-3 font-medium text-xs min-w-[90px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-lg">{droneEmojis[i] || '🚁'}</span>
                        <span className="text-muted-foreground leading-tight truncate max-w-[100px]">{dc.label}</span>
                        <span className="text-[10px] text-muted-foreground/60">{dc.type}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Timer/år</th>
                </tr>
              </thead>
              <tbody>
                {departmentAnalyses.map((dept, deptIdx) => {
                  const isExpanded = expandedDept === dept.department;
                  const quickWin = getQuickWin(dept);
                  return (
                    <React.Fragment key={dept.department}>
                      <tr
                        id={`dept-${deptIdx}`}
                        className={cn(
                          "border-b cursor-pointer transition-colors scroll-mt-6",
                          isExpanded ? "bg-primary/[0.04]" : "hover:bg-muted/30"
                        )}
                        onClick={() => setExpandedDept(isExpanded ? null : dept.department)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                            <span className="font-medium">{dept.department}</span>
                          </div>
                        </td>
                        {droneColumns.map((dc, ci) => {
                          const matches = getMatchingUseCases(dept, dc);
                          return (
                            <td key={ci} className="py-3 px-3 text-center">
                              {matches.length > 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-green-600 text-base">✓</span>
                                  <span className="text-[11px] text-muted-foreground">{matches.length} ops</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-center">
                          <Badge variant="secondary" className="text-[11px]">{dept.total_annual_hours} t</Badge>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={droneColumns.length + 2} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 py-4 bg-muted/20 space-y-3">
                                  {quickWin && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/[0.04]">
                                      <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs font-semibold text-primary">⚡ Quick win</p>
                                        <p className="text-sm font-medium mt-0.5">{quickWin.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{quickWin.description}</p>
                                        <div className="flex gap-1.5 mt-2">
                                          <Badge className={cn("text-[10px]", priorityColor(quickWin.priority))}>{quickWin.priority} prioritet</Badge>
                                          <Badge variant="secondary" className="text-[10px]">{quickWin.annual_flight_hours} t/år</Badge>
                                          <Badge variant="outline" className="text-[10px]">{quickWin.drone_type}</Badge>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alle operasjoner ({dept.use_cases.length})</p>
                                    {dept.use_cases.map((uc, i) => (
                                      <div key={i} className="p-3 rounded-lg bg-background border text-sm space-y-2">
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
                                          <Badge variant="outline" className="text-[10px] gap-1">{friendlyLabel(uc.operation_type)}</Badge>
                                          <Badge variant="outline" className="text-[10px] gap-1">{friendlyCategory(uc.easa_category)}</Badge>
                                          <Badge variant="outline" className="text-[10px] gap-1">
                                            <GraduationCap className="w-2.5 h-2.5" /> {friendlyLabel(uc.pilot_certification)}
                                          </Badge>
                                          <Badge variant="secondary" className="text-[10px]">{uc.drone_type}</Badge>
                                          <Badge variant="secondary" className="text-[10px]">{uc.annual_flight_hours} t/år</Badge>
                                          {uc.calculation_basis && (
                                            <span className="text-[10px] text-muted-foreground italic">{uc.calculation_basis}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Maturity Roadmap ─── */
function MaturityRoadmap({ currentStep = 1 }: { currentStep?: number }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const steps = [
    {
      n: 1, title: "A1/A3 — Grunnleggende",
      short: "Enkel OM + ERP",
      details: {
        hva: "Fly med mikrodrone (< 250g, f.eks. DJI Mini 4 Pro) for foto/video og enkel dokumentasjon. Visuell kontakt (VLOS) påkrevd.",
        krav: "A1/A3-kompetansebevis (netteksamen via Luftfartstilsynet), operatørregistrering, enkel operasjonsmanual (1–2 sider) og grunnleggende ERP.",
        tid: "1–2 uker fra start til operativ",
        kostnad: "~5 000–15 000 NOK (drone + kurs)",
      },
    },
    {
      n: 2, title: "STS / A2 — Utvidet",
      short: "STS-01 + A2-sertifikat",
      details: {
        hva: "Fly tyngre droner (opptil 4 kg) nærmere mennesker. STS-01 gir standardisert VLOS, A2 gir utvidede rettigheter i tettbygd strøk.",
        krav: "A2-kompetansebevis (praktisk og teoretisk prøve), STS-01 erklæring, utvidet operasjonsmanual med sikkerhetsprosedyrer.",
        tid: "2–4 uker opplæring",
        kostnad: "~30 000–80 000 NOK (kurs + drone)",
      },
    },
    {
      n: 3, title: "SORA / BVLOS",
      short: "Operasjonsautorisasjon",
      details: {
        hva: "Fly utenfor synsrekkevidde (BVLOS) for inspeksjon, kartlegging, søk og redning. Krever full risikovurdering.",
        krav: "Full SORA-vurdering, komplett operasjonsmanual (SORA-format), ERP med kontaktpunkter, SMS (Safety Management System) for SAIL III+, søknad om OpAuth fra Luftfartstilsynet.",
        tid: "3–6 måneder inkl. søknadsbehandling",
        kostnad: "~150 000–400 000 NOK (drone + opplæring + søknad)",
      },
    },
    {
      n: 4, title: "Autonome stasjoner + IKS",
      short: "Drone-in-a-box",
      details: {
        hva: "Permanente dronestasjoner med autonom take-off/landing. Samarbeid med nabokommuner (IKS) for delte ressurser og kostnadsfordeling.",
        krav: "U-space luftromsintegrasjon, avansert SMS, IKS-avtale, driftsstøtteavtale med leverandør, kommunalt vedtak.",
        tid: "12–24 måneder fra planlegging til drift",
        kostnad: "~500 000–2 000 000 NOK per stasjon",
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Horizontal progress bar */}
      <div className="relative">
        <div className="flex items-center justify-between relative z-10">
          {steps.map((s, i) => {
            const isActive = s.n === currentStep;
            const isPast = s.n < currentStep;
            const isFuture = s.n > currentStep;
            return (
              <button
                key={s.n}
                onClick={() => setExpanded(expanded === s.n ? null : s.n)}
                className={cn(
                  "flex flex-col items-center text-center group relative",
                  "transition-all duration-200",
                  i === 0 ? "items-start" : i === steps.length - 1 ? "items-end" : ""
                )}
                style={{ flex: 1 }}
              >
                {/* "Du er her" marker */}
                {isActive && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <Badge className="text-[9px] bg-[#6858f8] text-white border-0 shadow-md animate-pulse">
                      Du er her
                    </Badge>
                  </div>
                )}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm border-2 transition-all",
                  isActive
                    ? "bg-gradient-to-br from-[#ff66c4] to-[#6858f8] text-white border-[#6858f8] shadow-lg shadow-[#6858f8]/30 scale-110"
                    : isPast
                      ? "bg-[#6858f8] text-white border-[#6858f8]"
                      : "bg-muted text-muted-foreground border-border group-hover:border-primary/40"
                )}>
                  {isPast ? '✓' : s.n}
                </div>
                <p className={cn(
                  "text-[11px] font-semibold mt-1.5 leading-tight max-w-[90px]",
                  isActive ? "text-[#6858f8]" : isPast ? "text-foreground" : "text-muted-foreground"
                )}>{s.title}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[80px] leading-tight">{s.short}</p>
              </button>
            );
          })}
        </div>
        {/* Connecting line */}
        <div className="absolute top-5 left-[12%] right-[12%] h-0.5 bg-border z-0">
          <div
            className="h-full bg-gradient-to-r from-[#6858f8] to-[#6858f8]/40 transition-all"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Expanded detail panel */}
      <AnimatePresence>
        {expanded && (() => {
          const step = steps.find(s => s.n === expanded)!;
          return (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Card className={cn(
                "border",
                expanded === currentStep ? "border-[#6858f8]/30 bg-[#6858f8]/[0.03]" : "border-border"
              )}>
                <CardContent className="pt-4 pb-3 space-y-3">
                  <p className="text-sm font-display font-semibold">{step.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Hva kan du gjøre?</p>
                        <p className="text-xs text-foreground mt-0.5">{step.details.hva}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Krav</p>
                        <p className="text-xs text-foreground mt-0.5">{step.details.krav}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">⏱️ Tidsbruk</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{step.details.tid}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">💰 Estimert kostnad</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{step.details.kostnad}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

/* ─── Operations manual info box — dynamic ─── */
function OpsManualBox({ hasSpecific }: { hasSpecific: boolean }) {
  return (
    <InfoBox title="📘 Hva er en operasjonsmanual?" icon={<Info className="w-4 h-4" />}>
      {hasSpecific ? (
        <>
          <p>
            Når operasjoner går ut over åpen kategori (f.eks. STS, PDRA eller SORA-basert BVLOS), kreves en <strong>grundig operasjonsmanual</strong> etter SORA-logikk. Den bør inneholde:
          </p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li>Organisasjon og roller (driftsansvarlig, piloter, observatører)</li>
            <li>Prosedyrer for normal, unormal og nødssituasjon</li>
            <li>Teknisk vedlikehold og inspeksjon av droner</li>
            <li>Opplæringsplan og kompetansekrav</li>
            <li>Dokumentstyring og versjonskontroll</li>
            <li>Kontinuerlig forbedring og hendelsesrapportering</li>
          </ul>
          <p className="mt-1">Luftfartstilsynet vurderer operasjonsmanualen som en del av søknaden om operasjonsautorisasjon.</p>
        </>
      ) : (
        <p>
          For operasjoner i åpen kategori (A1/A3) holder det med en <strong>enkel operasjonsmanual (1–2 sider)</strong> som kort beskriver hvem som flyr, hvor det flys, hvordan utstyret brukes, en enkel risikovurdering, og hva man gjør før, under og etter flyging.
        </p>
      )}
    </InfoBox>
  );
}

/* ─── ERP info box ─── */
function ErpBox() {
  return (
    <InfoBox title="🚨 Emergency Response Plan (ERP)" icon={<Siren className="w-4 h-4" />} variant="warning">
      <p>
        En ERP beskriver hva man gjør ved <strong>tap av forbindelse, uforutsette hendelser, skade på tredjepart, brudd på geofencing eller teknisk feil</strong>. Planen definerer tydelige roller og kontaktpunkter.
      </p>
      <p className="font-semibold text-foreground mt-1">Slik kan kommunen implementere ERP i praksis:</p>
      <ul className="list-disc ml-4 space-y-0.5">
        <li>Koble droneoperasjoner til eksisterende beredskapsplaner og ROS-arbeid.</li>
        <li>Inkluder dronehendelser som eget punkt i kommunens årlige beredskapsøvelser.</li>
        <li>Utpek en kontaktperson for dronehendelser (f.eks. beredskapskoordinator).</li>
        <li>Loggfør alle hendelser og avvik for systematisk læring og forbedring.</li>
      </ul>
    </InfoBox>
  );
}

/* ─── Fire Statistics helpers ─── */
function timeToMinutes(t: string): number {
  if (!t || t === '00:00:00') return 0;
  const parts = t.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0) + (parts[2] || 0) / 60;
}

interface GroupedMission {
  category: string;
  emoji: string;
  missions: Array<{ t: string; n: number; rt: string; dt: string }>;
  totalMissions: number;
  avgResponseMin: number;
  droneScenario?: { title: string; description: string; icon: string };
}

function groupBrisMissions(missions: Array<{ t: string; n: number; rt: string; dt: string }>): GroupedMission[] {
  const groups: Record<string, { emoji: string; types: string[]; droneScenario?: GroupedMission['droneScenario'] }> = {
    'Automatiske brannalarmer (ABA)': {
      emoji: '🔔',
      types: ['ABA'],
      droneScenario: {
        title: 'Drone verifiserer alarm før utrykning',
        description: 'Ved ABA-alarmer kan en drone nå adressen på 1–3 minutter og bekrefte om det er reell brann via termisk kamera. Ved falsk alarm avblåses utrykning — sparer ca. 30 min per hendelse.',
        icon: '🚁',
      },
    },
    'Bygningsbrann': {
      emoji: '🏠🔥',
      types: ['Brann i bygning', 'Branntilløp i bygg', 'Branntilløp komfyr', 'Brann i skorstein', 'Brann gjenoppblussing', 'Brann i el installasjon'],
      droneScenario: {
        title: 'Situasjonsbilde for innsatsleder',
        description: 'Drone gir termisk oversikt over brannen før mannskapene er på stedet. Innsatsleder ser hvor brannen er verst, om det er fare for spredning, og kan planlegge angrepsvei fra luften.',
        icon: '🌡️',
      },
    },
    'Skog- og naturbrann': {
      emoji: '🌲🔥',
      types: ['Brann i skog', 'Brann i gress', 'Brann i søppelkasse', 'Branntilløp utenfor'],
      droneScenario: {
        title: 'Oversiktskartlegging og brannfront',
        description: 'Ved skog- og markbrann gir drone sanntids oversikt over brannfronten, vindretning og truede områder. Erstatter helikopterbehov i tidlig fase og gir kontinuerlig oppdatering under slukkingen.',
        icon: '🗺️',
      },
    },
    'Trafikkulykker': {
      emoji: '🚗',
      types: ['Trafikkulykke'],
      droneScenario: {
        title: 'Raskere situasjonsbilde ved ulykke',
        description: 'Drone når ulykkesstedet raskt og gir oversikt over omfang, antall involverte kjøretøy, trafikkdirigering og adkomstvei for utrykningskjøretøy.',
        icon: '📸',
      },
    },
    'Naturhendelser': {
      emoji: '🌊',
      types: ['Naturhendelse'],
      droneScenario: {
        title: 'Skadekartlegging og overvåking',
        description: 'Ved flom, ras eller stormskader kan dronen kartlegge skadeomfang over store områder uten risiko for mannskaper. Spesielt nyttig for å vurdere om evakuering er nødvendig.',
        icon: '🔍',
      },
    },
    'Redning og helseoppdrag': { emoji: '🚑', types: ['Helseoppdrag', 'Person i vann', 'Ulykke/redning', 'Trussel om selvdrap'] },
    'Kjøretøy- og utstyrsbrann': { emoji: '🚘🔥', types: ['Brann i personbil', 'Brann i motorredskap', 'Brann i fritidsbåt', 'Brann annet'] },
    'Unødig alarm / avbrutt': { emoji: '❌', types: ['Avbrutt utrykning', 'Unødig'] },
    'Øvrige oppdrag': { emoji: '📋', types: [] }, // catch-all
  };

  const result: GroupedMission[] = [];
  const used = new Set<number>();

  for (const [category, cfg] of Object.entries(groups)) {
    const matched = missions
      .map((m, i) => ({ ...m, _i: i }))
      .filter(m => {
        if (used.has(m._i)) return false;
        if (cfg.types.length === 0) return false;
        return cfg.types.some(t => m.t.startsWith(t) || m.t.includes(t));
      });

    if (matched.length > 0) {
      matched.forEach(m => used.add(m._i));
      const totalN = matched.reduce((s, m) => s + m.n, 0);
      const weightedRT = matched.reduce((s, m) => s + timeToMinutes(m.rt) * m.n, 0);
      result.push({
        category,
        emoji: cfg.emoji,
        missions: matched,
        totalMissions: totalN,
        avgResponseMin: totalN > 0 ? Math.round(weightedRT / totalN * 10) / 10 : 0,
        droneScenario: cfg.droneScenario,
      });
    }
  }

  // Catch-all for remaining
  const remaining = missions.filter((_, i) => !used.has(i));
  if (remaining.length > 0) {
    const totalN = remaining.reduce((s, m) => s + m.n, 0);
    const weightedRT = remaining.reduce((s, m) => s + timeToMinutes(m.rt) * m.n, 0);
    result.push({
      category: 'Øvrige oppdrag',
      emoji: '📋',
      missions: remaining,
      totalMissions: totalN,
      avgResponseMin: totalN > 0 ? Math.round(weightedRT / totalN * 10) / 10 : 0,
    });
  }

  return result.sort((a, b) => b.totalMissions - a.totalMissions);
}

/* ─── Report Sidebar ─── */
const sidebarSections = [
  { id: "leseguide", label: "📖 Leseguide", icon: BookOpen },
  { id: "modningsreise", label: "🗺️ Modningsreise", icon: Milestone },
  { id: "kommuneprofil", label: "🏘️ Kommuneprofil", icon: MapPin },
  { id: "dronekart", label: "🗺️ Ditt dronekart", icon: Map },
  { id: "nokkeltall", label: "📊 Nøkkeltall", icon: Clock },
  { id: "brannstatistikk", label: "🔥 Brannstatistikk", icon: Flame },
  
  { id: "ordliste", label: "📚 Ordliste & veiledning", icon: BookOpen },
  { id: "operasjoner", label: "⚙️ Operasjoner", icon: Shield },
  { id: "droneflate", label: "🚁 Droneflåte", icon: Plane },
  { id: "sertifisering", label: "🎓 Sertifisering", icon: GraduationCap },
  { id: "iks", label: "🤝 IKS-samarbeid", icon: Flame },
  { id: "implementering", label: "📅 Implementering", icon: ArrowRight },
];

/* ─── Drone Map Hub Diagram ─── */
function DroneMapHub({ departmentAnalyses, onClickDepartment }: {
  departmentAnalyses: DroneAnalysisResult['department_analyses'];
  onClickDepartment: (deptName: string) => void;
}) {
  const deptIconEmoji: Record<string, string> = {
    'Brann og redning': '🔥', 'Tekniske tjenester - Vei': '🛣️', 'Vann og avløp': '💧',
    'Byggesak / Eiendom': '🏗️', 'Naturforvaltning': '🌲', 'Helse og omsorg': '❤️',
    'Plan og utvikling': '🗺️', 'Miljø og klima': '🌿',
  };

  const maxHours = Math.max(...departmentAnalyses.map(d => d.total_annual_hours), 1);
  const total = departmentAnalyses.reduce((s, d) => s + d.total_annual_hours, 0);

  // Priority based on hours
  const getPriority = (hours: number): { label: string; color: string; bgColor: string; ringColor: string } => {
    const pct = hours / maxHours;
    if (pct >= 0.6) return { label: 'Høy', color: 'hsl(var(--destructive))', bgColor: 'hsl(var(--destructive) / 0.08)', ringColor: 'hsl(var(--destructive) / 0.3)' };
    if (pct >= 0.25) return { label: 'Medium', color: 'hsl(var(--chart-3))', bgColor: 'hsl(var(--chart-3) / 0.08)', ringColor: 'hsl(var(--chart-3) / 0.3)' };
    return { label: 'Lav', color: 'hsl(var(--muted-foreground))', bgColor: 'hsl(var(--muted) / 0.5)', ringColor: 'hsl(var(--border))' };
  };

  const cx = 300, cy = 250, radius = 180;
  const nodeRadius = 52;

  return (
    <Card id="dronekart" className="mb-6 scroll-mt-6 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          🗺️ Ditt dronekart
        </CardTitle>
        <CardDescription>Klikk på en avdeling for å navigere til operasjonene</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-3">
          {[
            { label: 'Høy prioritet', color: 'bg-destructive/20 border-destructive/40' },
            { label: 'Medium', color: 'bg-chart-3/10 border-chart-3/30' },
            { label: 'Lav', color: 'bg-muted border-border' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className={cn("w-3 h-3 rounded-full border", l.color)} />
              {l.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
            Linjetykkelse = timer/år
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 600 500" className="w-full max-w-[600px] mx-auto" style={{ minWidth: 400 }}>
            {/* Lines from center to nodes */}
            {departmentAnalyses.map((dept, i) => {
              const angle = (2 * Math.PI * i) / departmentAnalyses.length - Math.PI / 2;
              const x = cx + radius * Math.cos(angle);
              const y = cy + radius * Math.sin(angle);
              const thickness = Math.max(1.5, (dept.total_annual_hours / maxHours) * 8);
              const priority = getPriority(dept.total_annual_hours);
              return (
                <line
                  key={`line-${i}`}
                  x1={cx} y1={cy} x2={x} y2={y}
                  stroke={priority.color}
                  strokeWidth={thickness}
                  strokeOpacity={0.35}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Center hub */}
            <circle cx={cx} cy={cy} r={38} fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth={2.5} />
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize={20}>🚁</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fontWeight={700} fill="hsl(var(--primary))">Dronepark</text>
            <text x={cx} y={cy + 24} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">{total} t/år</text>

            {/* Department nodes */}
            {departmentAnalyses.map((dept, i) => {
              const angle = (2 * Math.PI * i) / departmentAnalyses.length - Math.PI / 2;
              const x = cx + radius * Math.cos(angle);
              const y = cy + radius * Math.sin(angle);
              const priority = getPriority(dept.total_annual_hours);
              const emoji = deptIconEmoji[dept.department] || '📋';
              const shortName = dept.department.length > 16
                ? dept.department.substring(0, 14) + '…'
                : dept.department;
              return (
                <g
                  key={`node-${i}`}
                  className="cursor-pointer"
                  onClick={() => onClickDepartment(dept.department)}
                  role="button"
                  tabIndex={0}
                >
                  <circle
                    cx={x} cy={y} r={nodeRadius}
                    fill={priority.bgColor}
                    stroke={priority.ringColor}
                    strokeWidth={2}
                  />
                  <text x={x} y={y - 16} textAnchor="middle" fontSize={18}>{emoji}</text>
                  <text x={x} y={y + 2} textAnchor="middle" fontSize={9} fontWeight={600} fill="hsl(var(--foreground))">
                    {shortName}
                  </text>
                  <text x={x} y={y + 14} textAnchor="middle" fontSize={8} fill="hsl(var(--muted-foreground))">
                    {dept.use_cases.length} bruksområder
                  </text>
                  <text x={x} y={y + 25} textAnchor="middle" fontSize={9} fontWeight={700} fill={priority.color}>
                    {dept.total_annual_hours} t/år
                  </text>
                  {/* Priority badge */}
                  <rect x={x - 14} y={y + 30} width={28} height={12} rx={6} fill={priority.color} fillOpacity={0.15} />
                  <text x={x} y={y + 39} textAnchor="middle" fontSize={7} fontWeight={600} fill={priority.color}>
                    {priority.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportSidebar({ activeSection }: { activeSection: string }) {
  return (
    <aside className="hidden lg:block w-56 flex-shrink-0">
      <div className="sticky top-6 space-y-1">
        <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-3">
          <Home className="w-4 h-4" />
          Hjem
        </Link>
        <p className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Rapport</p>
        {sidebarSections.map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "block px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeSection === s.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {s.label}
          </a>
        ))}
      </div>
    </aside>
  );
}
/* ─── Fire Stats Tabs Component ─── */
function FireStatsTabs({ grouped, droneGroups, maxRT, yearData, yearKey, droneMissionSavings }: {
  grouped: GroupedMission[];
  droneGroups: GroupedMission[];
  maxRT: number;
  yearData: { total: number; missions: any[] };
  yearKey: string;
  droneMissionSavings: DroneAnalysisResult['drone_mission_savings'];
}) {
  return (
    <Tabs defaultValue="oversikt" className="w-full">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="oversikt" className="text-xs">📊 Oversikt</TabsTrigger>
        <TabsTrigger value="scenarier" className="text-xs">🚁 Dronescenarier</TabsTrigger>
        <TabsTrigger value="besparelse" className="text-xs">💰 Besparelse</TabsTrigger>
      </TabsList>

      {/* Tab 1: Oversikt */}
      <TabsContent value="oversikt" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-display font-bold">{yearData.total}</p>
              <p className="text-xs text-muted-foreground">Oppdrag totalt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-display font-bold">{grouped.length}</p>
              <p className="text-xs text-muted-foreground">Kategorier</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-display font-bold text-primary">{droneGroups.length}</p>
              <p className="text-xs text-muted-foreground">Drone-relevante</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-display font-bold text-destructive">
                {droneGroups.reduce((s, g) => s + g.totalMissions, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Dronepotensial</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Median responstid per kategori
            </CardTitle>
            <CardDescription className="text-xs">
              Drone kan typisk nå stedet på 1–3 min fra dronestasjon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {grouped.map(g => {
              const pct = Math.min((g.avgResponseMin / maxRT) * 100, 100);
              const isDroneRelevant = !!g.droneScenario;
              return (
                <Collapsible key={g.category}>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[50%]">{g.emoji} {g.category}</span>
                      <span className="text-muted-foreground flex items-center gap-2">
                        <span className="font-semibold text-foreground">{g.avgResponseMin.toFixed(1)} min</span>
                        <span>({g.totalMissions} oppdrag)</span>
                        {g.missions.length > 1 && (
                          <CollapsibleTrigger asChild>
                            <button className="text-[10px] text-primary hover:underline ml-1">Detaljer</button>
                          </CollapsibleTrigger>
                        )}
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isDroneRelevant ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                      {isDroneRelevant && g.avgResponseMin > 3 && (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-chart-2"
                          style={{ left: `${Math.min((2 / maxRT) * 100, 100)}%` }}
                          title="Drone responstid ~2 min"
                        />
                      )}
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="flex flex-wrap gap-1 mt-1.5 mb-2 ml-4">
                      {g.missions.map((m, mi) => (
                        <Badge key={mi} variant="secondary" className="text-[9px]">
                          {m.t} ({m.n})
                        </Badge>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2 border-t">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary inline-block" /> Drone-relevant</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-muted-foreground/30 inline-block" /> Øvrig</span>
              <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-chart-2 inline-block" /> Drone ~2 min</span>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 2: Dronescenarier */}
      <TabsContent value="scenarier" className="mt-4">
        {droneGroups.length > 0 ? (
          <ScenarioSimulator droneGroups={droneGroups} yearKey={yearKey} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Ingen drone-relevante scenarier funnet.</p>
        )}
      </TabsContent>

      {/* Tab 3: Besparelsesberegning */}
      <TabsContent value="besparelse" className="space-y-4 mt-4">
        {droneMissionSavings ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-display font-bold text-foreground">{droneMissionSavings.total_annual_missions}</p>
                  <p className="text-xs text-muted-foreground">Oppdrag/år (snitt)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-display font-bold text-primary">{droneMissionSavings.drone_replaceable_missions}</p>
                  <p className="text-xs text-muted-foreground">Drone-relevante</p>
                </CardContent>
              </Card>
              {droneMissionSavings.total_annual_savings_nok != null && (
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-2xl font-display font-bold text-chart-2">{(droneMissionSavings.total_annual_savings_nok / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground">Est. besparelse/år (NOK)</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{droneMissionSavings.summary}</p>

            <div className="space-y-3">
              {droneMissionSavings.categories.map((cat, i) => {
                const roleLabels: Record<string, { label: string; color: string }> = {
                  erstatter_utrykning: { label: "Erstatter utrykning", color: "bg-chart-2/10 text-chart-2 border-chart-2/30" },
                  raskere_situasjonsbilde: { label: "Raskere situasjonsbilde", color: "bg-primary/10 text-primary border-primary/30" },
                  reduserer_biler: { label: "Reduserer antall biler", color: "bg-chart-3/10 text-chart-3 border-chart-3/30" },
                };
                const role = roleLabels[cat.drone_role] || roleLabels.raskere_situasjonsbilde;
                return (
                  <Card key={i} className="border">
                    <CardContent className="pt-4 pb-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-display font-semibold">{cat.category}</p>
                          <Badge variant="outline" className={cn("text-[10px] mt-1 border", role.color)}>{role.label}</Badge>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-display font-bold">{cat.annual_missions}</p>
                          <p className="text-[10px] text-muted-foreground">oppdrag/år</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                      <div className="flex flex-wrap gap-3 text-[11px]">
                        <span>📉 ~{cat.estimated_truck_reduction_pct}% reduksjon</span>
                        {cat.estimated_time_saved_min != null && <span>⏱️ ~{cat.estimated_time_saved_min} min spart/oppdrag</span>}
                        {cat.annual_savings_nok != null && <span>💰 ~{(cat.annual_savings_nok / 1000).toFixed(0)}k kr/år</span>}
                      </div>
                      <Collapsible>
                        {cat.mission_types.length > 0 && (
                          <CollapsibleTrigger asChild>
                            <button className="text-[10px] text-primary hover:underline mt-1">Se detaljer ({cat.mission_types.length} typer)</button>
                          </CollapsibleTrigger>
                        )}
                        <CollapsibleContent>
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {cat.mission_types.map(mt => (
                              <Badge key={mt} variant="secondary" className="text-[9px]">{mt}</Badge>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Besparelsesdata er ikke tilgjengelig for denne kommunen.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}

/* ─── Scenario Simulator Component ─── */
function ScenarioSimulator({ droneGroups, yearKey }: { droneGroups: GroupedMission[]; yearKey: string }) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...droneGroups].sort((a, b) => {
    if (a.category.includes('ABA')) return -1;
    if (b.category.includes('ABA')) return 1;
    return b.totalMissions - a.totalMissions;
  });
  const isHero = (g: GroupedMission) => g.category.includes('ABA');
  const visible = showAll ? sorted : sorted.slice(0, 3);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-display font-semibold flex items-center gap-2">
        🚁 Scenario-simulator — drone vs. tradisjonell utrykning
      </h3>

      {visible.map(g => {
        const hero = isHero(g);
        const savedMin = Math.max(0, Math.round(g.avgResponseMin - 2));
        const annualSavedHours = Math.round((savedMin * g.totalMissions) / 60);

        const tradSteps = [
          { label: 'Alarm mottas', time: '0 min', icon: '🔔' },
          { label: 'Mannskap alarmert', time: '~1 min', icon: '📟' },
          { label: 'Utrykning starter', time: '~3 min', icon: '🚒' },
          { label: 'Ankomst', time: `~${Math.round(g.avgResponseMin)} min`, icon: '📍' },
        ];
        const droneSteps = [
          { label: 'Alarm mottas', time: '0 min', icon: '🔔' },
          { label: 'Drone startet', time: '~15 sek', icon: '🚁' },
          { label: 'På stedet', time: '~2 min', icon: '📍' },
        ];

        return (
          <Card
            key={g.category}
            className={cn(
              "overflow-hidden transition-shadow",
              hero
                ? "border-primary/30 bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] shadow-md"
                : "border-border"
            )}
          >
            <CardContent className={cn("space-y-4", hero ? "pt-6 pb-5" : "pt-4 pb-3")}>
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex items-center justify-center rounded-xl flex-shrink-0",
                  hero ? "w-14 h-14 text-3xl bg-primary/10" : "w-10 h-10 text-xl bg-muted"
                )}>
                  {g.droneScenario!.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-display font-semibold", hero ? "text-base" : "text-sm")}>
                    {g.droneScenario!.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {g.emoji} {g.category} · {g.totalMissions} oppdrag/{yearKey}
                  </p>
                </div>
                <div className={cn(
                  "text-right flex-shrink-0 rounded-xl px-3 py-2",
                  hero ? "bg-chart-2/10" : "bg-muted"
                )}>
                  <p className={cn("font-display font-bold", hero ? "text-2xl text-chart-2" : "text-lg text-chart-2")}>
                    -{savedMin} min
                  </p>
                  <p className="text-[10px] text-muted-foreground">per oppdrag</p>
                </div>
              </div>

              {/* Side-by-side timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-destructive/20 bg-destructive/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-destructive mb-2">
                    I dag: mannskap i bil
                  </p>
                  <div className="space-y-0">
                    {tradSteps.map((s, si) => (
                      <div key={si} className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center text-[10px]">{s.icon}</div>
                          {si < tradSteps.length - 1 && <div className="w-px h-4 bg-destructive/20" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-[11px] font-medium leading-tight">{s.label}</p>
                          <p className="text-[10px] text-destructive font-semibold">{s.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-chart-2/20 bg-chart-2/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-chart-2 mb-2">
                    Med drone
                  </p>
                  <div className="space-y-0">
                    {droneSteps.map((s, si) => (
                      <div key={si} className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-5 h-5 rounded-full bg-chart-2/15 flex items-center justify-center text-[10px]">{s.icon}</div>
                          {si < droneSteps.length - 1 && <div className="w-px h-4 bg-chart-2/20" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-[11px] font-medium leading-tight">{s.label}</p>
                          <p className="text-[10px] text-chart-2 font-semibold">{s.time}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-1 pt-1 border-t border-chart-2/10">
                      <span className="text-[11px]">✅</span>
                      <p className="text-[10px] text-chart-2 font-semibold">Situasjonsbilde levert</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{g.droneScenario!.description}</p>

              {hero && annualSavedHours > 0 && (
                <div className="flex items-center gap-4 p-2.5 rounded-lg bg-chart-2/[0.06] border border-chart-2/15">
                  <div>
                    <p className="text-xs font-semibold text-chart-2">Estimert årlig gevinst</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.totalMissions} oppdrag × {savedMin} min spart = <span className="font-bold text-foreground">~{annualSavedHours} timer/år</span> frigjort kapasitet
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {sorted.length > 3 && !showAll && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAll(true)}>
          Vis alle {sorted.length} scenarier
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}

export default function DroneAnalysis({
  municipalityName, population, areaKm2, roadKm, vaKm, buildings,
  terrainType, densityPerKm2, departments, iksPartners,
  fireDeptName, fireDeptType, alarmSentralName, regionMunicipalities,
  sectorData, fireStats, brisMissionData, onContinue, onBack
}: Props) {
  const [analysis, setAnalysis] = useState<DroneAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("leseguide");

  // Intersection observer for active sidebar tracking
  useEffect(() => {
    if (!analysis) return;
    const ids = sidebarSections.map(s => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [analysis]);

  useEffect(() => {
    const activeDepts = departments.filter(d => d.enabled).map(d => d.name);
    if (activeDepts.length === 0) return;
    
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
            departments: activeDepts,
            iks_partners: iksPartners,
            fire_dept_name: fireDeptName,
            fire_dept_type: fireDeptType,
            alarm_sentral_name: alarmSentralName,
            region_municipalities: regionMunicipalities,
            sector_data: sectorData,
            fire_stats: fireStats,
            bris_mission_data: brisMissionData,
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
  }, [municipalityName, population, areaKm2, roadKm, vaKm, buildings, terrainType, densityPerKm2, departments, iksPartners, fireDeptName, fireDeptType, alarmSentralName, regionMunicipalities, sectorData, fireStats, brisMissionData]);

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

  const hasSpecificCategory = analysis.department_analyses.some(d =>
    d.use_cases.some(uc =>
      uc.easa_category?.toLowerCase().includes("spesifikk") ||
      uc.operation_type === "BVLOS" ||
      uc.pilot_certification?.toLowerCase().includes("sts") ||
      uc.pilot_certification?.toLowerCase().includes("sora")
    )
  );

  // priorityColor moved to module level


  return (
    <div className="flex gap-6 p-6 lg:p-10">
      {/* Sidebar */}
      <ReportSidebar activeSection={activeSection} />

      {/* Main content */}
      <div className="flex-1 max-w-4xl space-y-6">
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

          {/* How to read this report */}
          <div id="leseguide" className="mb-6 scroll-mt-6">
            <HowToReadBox />
          </div>

          {/* Maturity roadmap — prominent position */}
          <div id="modningsreise" className="mb-6 scroll-mt-6">
            <Card className="border-primary/15 bg-gradient-to-br from-[#6858f8]/[0.02] to-transparent">
              <CardContent className="pt-5 pb-4">
                <h2 className="text-sm font-display font-semibold flex items-center gap-2 mb-5">
                  <Milestone className="w-4 h-4 text-[#6858f8]" /> Modningsreise — hvor er kommunen i dag?
                </h2>
                <MaturityRoadmap currentStep={1} />
              </CardContent>
            </Card>
          </div>

          <Card id="kommuneprofil" className="mb-6 border-primary/20 bg-primary/[0.02] scroll-mt-6">
            <CardContent className="pt-5 pb-4 space-y-4">
              <h2 className="text-sm font-display font-semibold text-primary flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Kommuneprofil
              </h2>

              {/* Row 1: Topography & demographics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-background rounded-lg p-3 border border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Topografi</p>
                  <p className="text-sm font-semibold">{terrainType || 'Ukjent'}</p>
                </div>
                <div className="bg-background rounded-lg p-3 border border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Innbyggere</p>
                  <p className="text-sm font-semibold">{population?.toLocaleString('nb-NO') || '—'}</p>
                </div>
                <div className="bg-background rounded-lg p-3 border border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Areal</p>
                  <p className="text-sm font-semibold">{areaKm2 ? `${Math.round(areaKm2).toLocaleString('nb-NO')} km²` : '—'}</p>
                </div>
                <div className="bg-background rounded-lg p-3 border border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Tetthet</p>
                  <p className="text-sm font-semibold">{densityPerKm2 ? `${Math.round(densityPerKm2)} innb/km²` : '—'}</p>
                </div>
              </div>

              {/* Row 2: Sector costs from SSB */}
              {sectorData.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Driftskostnader per sektor (KOSTRA/SSB tabell 12362, 1000 kr)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {sectorData.filter(s => s.expenditure_1000nok != null).map(s => {
                      const perCapita = population && s.expenditure_1000nok ? Math.round((s.expenditure_1000nok * 1000) / population) : null;
                      return (
                        <div key={s.sector} className="bg-background rounded-lg p-2.5 border border-border">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{s.sector}</p>
                          <p className="text-sm font-semibold">{s.expenditure_1000nok!.toLocaleString('nb-NO')}</p>
                          {perCapita != null && (
                            <p className="text-[10px] text-muted-foreground">{perCapita.toLocaleString('nb-NO')} kr/innb</p>
                          )}
                          {s.employees_fte != null && (
                            <p className="text-[10px] text-muted-foreground">~{s.employees_fte} årsverk</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Kilde: {sectorData[0]?.source === 'ssb_12362' ? 'SSB tabell 12362' : 'Estimat'} · År {sectorData[0]?.year || '—'} · Årsverk estimert fra lønnskostnader
                  </p>
                </div>
              )}

              {/* Row 3: Active departments */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Aktive avdelinger i analysen</p>
                <div className="flex flex-wrap gap-1.5">
                  {departments.filter(d => d.enabled).map(d => (
                    <Badge key={d.id} variant="secondary" className="text-xs gap-1">
                      {d.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Row 4: Fire department structure */}
              {fireDeptName && (
                <div className="bg-background rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> Brannvesenstruktur
                  </p>
                  <p className="text-sm font-semibold">{fireDeptName} <span className="text-muted-foreground font-normal">({fireDeptType || 'ukjent type'})</span></p>
                  {iksPartners.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Partnerkommuner: {iksPartners.join(', ')}
                    </p>
                  )}
                  {alarmSentralName && (
                    <p className="text-xs text-muted-foreground">110-sentral: {alarmSentralName}</p>
                  )}
                  {fireStats?.fire_expenditure_1000nok != null && (
                    <p className="text-xs mt-1">
                      Brannbudsjett: <span className="font-semibold">{fireStats.fire_expenditure_1000nok.toLocaleString('nb-NO')}</span> (1000 kr)
                      {population && <span className="text-muted-foreground"> · {Math.round((fireStats.fire_expenditure_1000nok * 1000) / population).toLocaleString('nb-NO')} kr/innb</span>}
                    </p>
                  )}
                </div>
              )}

              {/* Infrastructure quick stats */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {roadKm && <span className="flex items-center gap-1"><Route className="w-3 h-3" /> {roadKm.toLocaleString('nb-NO')} km vei</span>}
                {vaKm && <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {vaKm.toLocaleString('nb-NO')} km VA</span>}
                {buildings && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {buildings.toLocaleString('nb-NO')} bygninger</span>}
              </div>
            </CardContent>
          </Card>

          {/* Drone Map Hub */}
          <DroneMapHub
            departmentAnalyses={analysis.department_analyses}
            onClickDepartment={(deptName) => {
              // Find the department section and scroll to it
              const deptIdx = analysis.department_analyses.findIndex(d => d.department === deptName);
              if (deptIdx >= 0) {
                setExpandedDept(deptName);
                setTimeout(() => {
                  const el = document.getElementById(`dept-${deptIdx}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
          />

          {/* Key metrics */}
          <div id="nokkeltall" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 scroll-mt-6">
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
                <p className="text-xs text-muted-foreground">Flytimer/år (estimat)</p>
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

          {/* ─── Brannstatistikk fra BRIS — tabbed ─── */}
          {brisMissionData && (() => {
            const yearKey = Object.keys(brisMissionData).sort().reverse()[0];
            const yearData = brisMissionData[yearKey];
            if (!yearData?.missions?.length) return null;
            const grouped = groupBrisMissions(yearData.missions);
            const maxRT = Math.max(...grouped.map(g => g.avgResponseMin), 1);
            const droneGroups = grouped.filter(g => g.droneScenario);

            return (
              <div id="brannstatistikk" className="space-y-4 mb-6 scroll-mt-6">
                <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                  <Flame className="w-5 h-5 text-destructive" /> 🔥 Brannstatistikk ({yearKey})
                </h2>
                <p className="text-sm text-muted-foreground">
                  Basert på {yearData.total} registrerte oppdrag fra brannstatistikk.no (BRIS).
                </p>

                <FireStatsTabs
                  grouped={grouped}
                  droneGroups={droneGroups}
                  maxRT={maxRT}
                  yearData={yearData}
                  yearKey={yearKey}
                  droneMissionSavings={analysis.drone_mission_savings}
                />

                <p className="text-[10px] text-muted-foreground">
                  Kilde: brannstatistikk.no (BRIS) · Periode: {yearKey} · Responstid angitt som median · 
                  Drone-responstid (~2 min) forutsetter dronestasjon innen 3 km radius
                </p>
              </div>
            );
          })()}

          {/* ─── Ordliste section: Glossary + OpsManual + ERP ─── */}
          <div id="ordliste" className="space-y-4 mb-6 scroll-mt-6">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> 📚 Ordliste og veiledning
            </h2>
            <InfoBox title="Ordliste — nøkkelbegreper" icon={<BookOpen className="w-4 h-4" />}>
              <GlossaryTerms />
            </InfoBox>
            <OpsManualBox hasSpecific={hasSpecificCategory} />
            <ErpBox />
          </div>


          {/* Department × Drone matrix */}
          <div id="operasjoner" className="space-y-3 mb-6 scroll-mt-6">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> ⚙️ Operasjoner per avdeling
            </h2>
            <DepartmentDroneMatrix
              departmentAnalyses={analysis.department_analyses}
              droneFleet={analysis.drone_fleet}
              expandedDept={expandedDept}
              setExpandedDept={setExpandedDept}
            />
          </div>

          {/* Drone fleet — Haiko anbefaler */}
          <div id="droneflate" className="space-y-4 mb-6 scroll-mt-6">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Plane className="w-5 h-5 text-[#6858f8]" /> ✨ Haiko anbefaler
            </h2>
            <p className="text-sm text-muted-foreground">
              Basert på kommunens avdelinger, bruksområder og geografi — her er droneflåten vi anbefaler.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analysis.drone_fleet.map((drone, i) => {
                const isPrimary = i === 0;
                const d = drone as any;
                const specItems = [
                  d.max_flight_time_min && { icon: '⏱️', label: 'Flytid', value: `${d.max_flight_time_min} min` },
                  d.needs_thermal && { icon: '🌡️', label: 'Kamera', value: 'Termisk + RGB' },
                  !d.needs_thermal && { icon: '📷', label: 'Kamera', value: 'RGB' },
                  d.needs_rtk && { icon: '📍', label: 'Presisjon', value: 'RTK' },
                  d.needs_lidar && { icon: '📐', label: 'Sensor', value: 'LiDAR' },
                  d.autonomous && { icon: '🤖', label: 'Type', value: 'Autonom stasjon' },
                  !d.autonomous && { icon: '🎮', label: 'Type', value: 'Manuell / felt' },
                ].filter(Boolean) as { icon: string; label: string; value: string }[];

                return (
                  <Card
                    key={i}
                    className={cn(
                      "relative overflow-hidden transition-shadow flex flex-col",
                      isPrimary
                        ? "border-[#6858f8]/40 shadow-lg shadow-[#6858f8]/10 ring-1 ring-[#6858f8]/20"
                        : "border-border hover:shadow-md"
                    )}
                  >
                    {isPrimary && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff66c4] to-[#6858f8]" />
                    )}

                    <CardContent className="pt-5 pb-4 flex flex-col flex-1 space-y-4">
                      {/* Badge */}
                      {isPrimary && (
                        <Badge className="self-start bg-gradient-to-r from-[#ff66c4] to-[#6858f8] text-white border-0 text-[10px]">
                          ⭐ Prioritert innkjøp
                        </Badge>
                      )}

                      {/* Image placeholder */}
                      <div className={cn(
                        "w-full h-28 rounded-lg flex items-center justify-center text-4xl",
                        isPrimary ? "bg-[#6858f8]/[0.06]" : "bg-muted/50"
                      )}>
                        {d.autonomous ? '🏠🚁' : drone.drone_type?.toLowerCase().includes('fixed') ? '✈️' : '🚁'}
                      </div>

                      {/* Name + type */}
                      <div>
                        <p className={cn("font-display font-semibold", isPrimary ? "text-base" : "text-sm")}>
                          {drone.recommended_model}
                        </p>
                        <p className="text-xs text-muted-foreground">{drone.drone_type}</p>
                        {drone.quantity > 1 && (
                          <Badge variant="secondary" className="text-[10px] mt-1">×{drone.quantity} enheter</Badge>
                        )}
                      </div>

                      {/* Price */}
                      <div className={cn(
                        "rounded-lg px-3 py-2 text-center",
                        isPrimary ? "bg-[#6858f8]/[0.06]" : "bg-muted/50"
                      )}>
                        <p className={cn(
                          "font-display font-bold text-lg",
                          isPrimary ? "text-[#6858f8]" : "text-foreground"
                        )}>
                          {drone.estimated_cost_nok.toLocaleString('nb-NO')} NOK
                        </p>
                        <p className="text-[10px] text-muted-foreground">estimert pris</p>
                      </div>

                      {/* Specs grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {specItems.slice(0, 4).map((spec, si) => (
                          <div key={si} className="flex items-center gap-1.5 text-xs">
                            <span className="text-sm">{spec.icon}</span>
                            <div>
                              <p className="text-[10px] text-muted-foreground leading-tight">{spec.label}</p>
                              <p className="font-medium leading-tight">{spec.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Why chosen */}
                      {d.why_chosen && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-[#6858f8]/30 pl-2">
                          {d.why_chosen}
                        </p>
                      )}

                      {/* Passer til */}
                      <div className="mt-auto pt-3 border-t border-border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Passer til</p>
                        <div className="flex flex-wrap gap-1">
                          {drone.shared_between.map(dept => (
                            <Badge key={dept} variant="outline" className="text-[10px]">{dept}</Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Total fleet cost */}
            <Card className="border-[#6858f8]/20 bg-gradient-to-r from-[#6858f8]/[0.03] to-[#ff66c4]/[0.03]">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-display font-semibold">Total flåtekostnad</p>
                  <p className="text-xs text-muted-foreground">
                    {analysis.drone_fleet.length} droner · {analysis.drone_fleet.reduce((s, d) => s + d.quantity, 0)} enheter totalt
                  </p>
                </div>
                <p className="text-2xl font-display font-bold text-[#6858f8]">
                  {analysis.drone_fleet.reduce((s, d) => s + d.estimated_cost_nok * d.quantity, 0).toLocaleString('nb-NO')} NOK
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Certification plan */}
          {analysis.certification_plan && analysis.certification_plan.pilot_groups.length > 0 && (
            <div id="sertifisering" className="space-y-3 mb-6 scroll-mt-6">
              <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> 🎓 Sertifiseringsplan
              </h2>

              <Card className="border-primary/10 bg-primary/[0.02]">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    For de fleste kommuner starter reisen med <strong>A1/A3-kompetanse</strong> og en enkel operasjonsmanual.
                    Når behovet blir mer avansert (STS, PDRA, BVLOS), øker også kravene til kurs, operasjonsmanual og ERP.
                    Antall dager oppgitt nedenfor er <strong>foreslåtte opplæringsopplegg</strong>, ikke regulatoriske minstekrav.
                  </p>
                </CardContent>
              </Card>

              {analysis.certification_plan.pilot_groups.map((group, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{group.group_name}</p>
                      <Badge variant="secondary" className="text-xs">~{group.estimated_training_days} dager (foreslått)</Badge>
                    </div>
                    <p className="text-xs font-medium text-primary">{friendlyLabel(group.certification_path)}</p>
                    {(group as any).practical_outcome && (
                      <p className="text-xs text-foreground bg-primary/5 rounded-md p-2 border border-primary/10">
                        <strong>Etter opplæring:</strong> {(group as any).practical_outcome}
                      </p>
                    )}
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
            <Card id="iks" className="mb-6 scroll-mt-6">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  🤝 IKS-samarbeid (brannvesen)
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

          {/* Implementation timeline — Gantt-style */}
          {analysis.implementation_priority.length > 0 && (() => {
            const phases = [
              { months: '0–6', label: 'Fase 1', color: 'from-[#6858f8] to-[#6858f8]/80', width: '16.7%' },
              { months: '6–18', label: 'Fase 2', color: 'from-[#6858f8]/70 to-[#ff66c4]/70', width: '33.3%' },
              { months: '18–36', label: 'Fase 3', color: 'from-[#ff66c4]/60 to-[#ff66c4]/40', width: '50%' },
            ];
            const totalCost = analysis.drone_fleet.reduce((s, d) => s + d.estimated_cost_nok * d.quantity, 0);
            // Rough ROI breakeven estimate: ~18 months
            const breakevenPct = 50; // 18 months out of 36

            return (
              <div id="implementering" className="space-y-4 mb-6 scroll-mt-6">
                <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                  📅 Implementeringsplan
                </h2>
                <p className="text-xs text-muted-foreground -mt-2">
                  Strategisk anbefaling — tilpass til kommunens budsjett og forutsetninger.
                </p>

                {/* Gantt timeline bar */}
                <Card>
                  <CardContent className="pt-5 pb-4 space-y-4">
                    {/* Month axis */}
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                      <span>0 mnd</span>
                      <span>6 mnd</span>
                      <span>12 mnd</span>
                      <span>18 mnd</span>
                      <span>24 mnd</span>
                      <span>36 mnd</span>
                    </div>

                    {/* Phase bars */}
                    <div className="space-y-2">
                      {analysis.implementation_priority.slice(0, 3).map((phase, i) => {
                        const p = phases[i] || phases[2];
                        const isExpanded = expandedPhase === i;
                        return (
                          <div key={phase.phase}>
                            <button
                              onClick={() => setExpandedPhase(isExpanded ? null : i)}
                              className="w-full text-left"
                            >
                              <div className="relative h-10 bg-muted/30 rounded-lg overflow-hidden">
                                <div
                                  className={cn("absolute top-0 left-0 h-full rounded-lg bg-gradient-to-r flex items-center px-3 gap-2 transition-all", p.color)}
                                  style={{
                                    width: p.width,
                                    marginLeft: i === 0 ? '0' : i === 1 ? '16.7%' : '50%',
                                  }}
                                >
                                  <span className="text-white text-xs font-semibold whitespace-nowrap drop-shadow-sm">
                                    {p.label}
                                  </span>
                                  <span className="text-white/80 text-[10px] whitespace-nowrap hidden sm:inline">
                                    {p.months} mnd
                                  </span>
                                </div>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                              </div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-2 p-4 rounded-lg bg-muted/20 border space-y-3">
                                    <p className="text-sm font-display font-semibold">{phase.title}</p>
                                    <p className="text-xs text-muted-foreground">{phase.description}</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      {/* Purchased */}
                                      <div className="bg-background rounded-lg p-3 border">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">🚁 Innkjøp</p>
                                        <div className="space-y-1">
                                          {i === 0 && analysis.drone_fleet.slice(0, 1).map((d, di) => (
                                            <p key={di} className="text-xs font-medium">{d.recommended_model}</p>
                                          ))}
                                          {i === 1 && analysis.drone_fleet.slice(1, 2).map((d, di) => (
                                            <p key={di} className="text-xs font-medium">{d.recommended_model}</p>
                                          ))}
                                          {i === 2 && analysis.drone_fleet.slice(2).map((d, di) => (
                                            <p key={di} className="text-xs font-medium">{d.recommended_model}</p>
                                          ))}
                                          {i === 0 && analysis.drone_fleet.length === 0 && <p className="text-xs text-muted-foreground">Pilotprosjekt-utstyr</p>}
                                        </div>
                                      </div>

                                      {/* Training */}
                                      <div className="bg-background rounded-lg p-3 border">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">🎓 Opplæring</p>
                                        {i === 0 && <p className="text-xs">A1/A3-kurs for nøkkelpersonell</p>}
                                        {i === 1 && <p className="text-xs">STS-01 / A2-sertifisering</p>}
                                        {i === 2 && <p className="text-xs">SORA / BVLOS-kompetanse</p>}
                                      </div>

                                      {/* Use cases going live */}
                                      <div className="bg-background rounded-lg p-3 border">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">✅ Bruksområder</p>
                                        <div className="flex flex-wrap gap-1">
                                          {phase.departments.map(d => (
                                            <Badge key={d} variant="secondary" className="text-[9px]">{d}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>

                    {/* ROI breakeven indicator */}
                    <div className="relative h-6 mt-2">
                      <div className="absolute top-0 left-0 right-0 h-px bg-border" />
                      <div
                        className="absolute top-0 flex flex-col items-center"
                        style={{ left: `${breakevenPct}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="w-0.5 h-3 bg-chart-2" />
                        <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/30 text-[9px] mt-0.5 whitespace-nowrap">
                          💰 Estimert ROI breakeven
                        </Badge>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t">
                      <span className="text-muted-foreground">Total investering over 36 mnd</span>
                      <span className="font-display font-bold text-[#6858f8]">{totalCost.toLocaleString('nb-NO')} NOK</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack}>Tilbake</Button>
            <Button onClick={onContinue} className="gap-2 font-display font-semibold">
              Fordyp med DMV-vurdering <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
