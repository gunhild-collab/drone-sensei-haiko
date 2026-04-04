import React, { useState, useEffect, useRef } from "react";
import type { BrisMissionData } from "@/hooks/useMunicipalityProfile";
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
  Info, BookOpen, Siren, Milestone, Home, Download, Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { KostraSectorData } from "@/lib/evaluationApi";
import type { ActiveDepartment } from "./DepartmentEditor";

/* ═══════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════
   Sticky Topbar
   ═══════════════════════════════════════════════════ */

const navSections = [
  { id: "sammendrag", label: "Sammendrag" },
  { id: "flate", label: "Flåte" },
  { id: "sambruk", label: "Sambruk" },
  { id: "roi", label: "ROI" },
  { id: "regulatorisk", label: "Regulatorisk" },
  { id: "veien-videre", label: "Veien videre" },
];

function StickyTopbar({
  municipalityName,
  activeSection,
  onBack,
}: {
  municipalityName: string;
  activeSection: string;
  onBack: () => void;
}) {
  return (
    <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="max-w-[960px] mx-auto flex items-center justify-between px-6 h-14">
        {/* Left: brand + municipality */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display font-bold text-sm text-primary whitespace-nowrap">Haiko Radar</span>
          <span className="text-muted-foreground text-sm hidden sm:inline">·</span>
          <span className="text-muted-foreground text-sm truncate hidden sm:inline">{municipalityName}</span>
        </div>

        {/* Center: nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navSections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeSection === s.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Right: buttons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 hidden sm:flex" onClick={onBack}>
            <Settings2 className="w-3.5 h-3.5" /> Juster analyse
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 font-display font-semibold"
            style={{ background: 'linear-gradient(135deg, #FF66C4, #685BF8)' }}
            onClick={() => window.print()}
          >
            <Download className="w-3.5 h-3.5" /> Last ned PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Hero / Sammendrag Section
   ═══════════════════════════════════════════════════ */

function HeroSection({
  municipalityName,
  analysis,
  departments,
}: {
  municipalityName: string;
  analysis: DroneAnalysisResult;
  departments: ActiveDepartment[];
}) {
  const activeDepts = departments.filter(d => d.enabled);
  const totalUseCases = analysis.department_analyses.reduce((s, d) => s + d.use_cases.length, 0);
  const totalFleetCost = analysis.drone_fleet.reduce((s, d) => s + d.estimated_cost_nok * d.quantity, 0);
  // Rough annual savings estimate
  const annualSavings = analysis.drone_mission_savings?.total_annual_savings_nok;
  const savingsDisplay = annualSavings
    ? `${(annualSavings / 1000).toFixed(0)}k–${((annualSavings * 1.4) / 1000).toFixed(0)}k kr`
    : `${(totalFleetCost * 0.3 / 1000).toFixed(0)}k–${(totalFleetCost * 0.6 / 1000).toFixed(0)}k kr`;

  // Payback estimate in months
  const paybackMonths = annualSavings && annualSavings > 0
    ? Math.round((totalFleetCost / annualSavings) * 12)
    : null;

  const droneTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('dock') || t.includes('autonom')) return '🏠';
    if (t.includes('fixed') || t.includes('wing')) return '✈️';
    return '🚁';
  };

  return (
    <section
      id="sammendrag"
      className="scroll-mt-16 rounded-2xl p-8 md:p-10"
      style={{
        background: 'linear-gradient(135deg, rgba(255,102,196,0.08), rgba(104,91,248,0.08), rgba(255,255,255,1))',
      }}
    >
      {/* Header */}
      <h1 className="text-2xl md:text-3xl font-display font-bold" style={{ color: '#1C0059' }}>
        Mulighetsanalyse for {municipalityName}
      </h1>
      <p className="text-sm mt-1" style={{ color: '#999999' }}>
        Generert {new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} · Basert på SSB/KOSTRA-data og {totalUseCases} valgte bruksområder
      </p>

      {/* 3 key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
        <div className="text-center">
          <p className="text-4xl font-display font-bold text-primary">{totalUseCases}</p>
          <p className="text-sm mt-1" style={{ color: '#555555' }}>bruksområder</p>
          <p className="text-xs" style={{ color: '#999999' }}>valgt av kommunen</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-display font-bold text-primary">{activeDepts.length}</p>
          <p className="text-sm mt-1" style={{ color: '#555555' }}>avdelinger deler nytte</p>
          <p className="text-xs" style={{ color: '#999999' }}>dekkes av felles droneflåte</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-display font-bold" style={{ color: '#10B981' }}>{savingsDisplay}</p>
          <p className="text-sm mt-1" style={{ color: '#555555' }}>estimert årlig besparelse</p>
          <p className="text-xs" style={{ color: '#999999' }}>sammenlignet med dagens metoder</p>
        </div>
      </div>

      {/* Fleet preview chips */}
      <div className="mt-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#999999' }}>Anbefalt flåte</p>
        <div className="flex flex-wrap gap-3">
          {analysis.drone_fleet.map((d, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-card rounded-xl border border-border px-4 py-3 shadow-sm"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <span className="text-2xl">{droneTypeIcon(d.drone_type)}</span>
              <div>
                <p className="text-sm font-display font-semibold" style={{ color: '#1C0059' }}>{d.recommended_model}</p>
                <p className="text-xs" style={{ color: '#999999' }}>
                  Dekker {d.shared_between.length} avdelinger · {d.estimated_cost_nok > 0 ? `€${Math.round(d.estimated_cost_nok / 11.5).toLocaleString('nb-NO')}` : 'Tilbud'}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <p className="text-sm font-display font-semibold" style={{ color: '#1C0059' }}>
            Estimert flåtekostnad: {totalFleetCost.toLocaleString('nb-NO')} kr
          </p>
          {paybackMonths && paybackMonths > 0 && paybackMonths < 120 && (
            <p className="text-sm" style={{ color: '#10B981' }}>
              · Tilbakebetalt innen ~{paybackMonths} måneder
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Fleet Section — Seksjon 2
   ═══════════════════════════════════════════════════ */

function FleetSection({
  analysis,
  departments,
}: {
  analysis: DroneAnalysisResult;
  departments: ActiveDepartment[];
}) {
  // Build department → use case mapping per drone
  const getDroneUseCases = (drone: DroneAnalysisResult['drone_fleet'][0]) => {
    const result: Record<string, string[]> = {};
    for (const dept of analysis.department_analyses) {
      const matching = dept.use_cases.filter(uc => {
        const ucType = (uc.drone_type || '').toLowerCase();
        const droneModel = drone.recommended_model.toLowerCase();
        const droneType = drone.drone_type.toLowerCase();
        return (
          drone.shared_between.some(s => dept.department.includes(s) || s.includes(dept.department)) ||
          ucType.includes(droneType) ||
          droneModel.includes(ucType) ||
          ucType.includes('multirotor') && (droneType.includes('multirotor') || droneModel.includes('dock') || droneModel.includes('matrice')) ||
          ucType.includes('fixed') && droneType.includes('fixed')
        );
      });
      if (matching.length > 0) {
        result[dept.department] = matching.map(uc => uc.name);
      }
    }
    return result;
  };

  const droneTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('dock') || t.includes('autonom')) return '🏠';
    if (t.includes('fixed') || t.includes('wing')) return '✈️';
    return '🚁';
  };

  // Comparison: silo vs Haiko
  const haikoCount = analysis.drone_fleet.length;
  const haikoCost = analysis.drone_fleet.reduce((s, d) => s + d.estimated_cost_nok * d.quantity, 0);
  const haikoUseCases = analysis.department_analyses.reduce((s, d) => s + d.use_cases.length, 0);
  const haikoDepts = analysis.department_analyses.length;
  const siloCount = Math.max(haikoCount + 2, 5);
  const siloCost = Math.round(haikoCost * 1.6);
  const siloUseCases = Math.round(haikoUseCases * 0.6);
  const siloDepts = Math.min(haikoDepts, 3);
  const savings = siloCost - haikoCost;

  return (
    <section id="flate" className="scroll-mt-16 space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Anbefalt droneflåte</h2>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>
          Basert på kommunens bruksområder, geografi og budsjettramme
        </p>
      </div>

      {/* Platform cards */}
      <div className="space-y-6">
        {analysis.drone_fleet.map((drone, i) => {
          const d = drone as any;
          const isPrimary = i === 0;
          const deptUcs = getDroneUseCases(drone);
          const totalUcs = Object.values(deptUcs).reduce((s, arr) => s + arr.length, 0);

          const specs = [
            d.max_flight_time_min && { icon: '⏱', label: 'Flygetid', value: `${d.max_flight_time_min} min` },
            { icon: '📏', label: 'Rekkevidde', value: d.max_range_km ? `${d.max_range_km} km` : '—' },
            { icon: '⚖️', label: 'Vekt', value: d.max_takeoff_weight_kg ? `${d.max_takeoff_weight_kg} kg` : '—' },
            { icon: '🌡', label: 'Sensor', value: d.needs_thermal ? 'RGB + Termisk' : d.needs_lidar ? 'RGB + LiDAR' : 'RGB' },
            { icon: '📡', label: 'BVLOS', value: d.autonomous || d.drone_type?.toLowerCase().includes('dock') ? 'Ja' : 'Nei' },
            d.c_class && { icon: '🏷', label: 'C-merking', value: d.c_class },
            d.ip_rating && { icon: '🛡', label: 'IP-rating', value: d.ip_rating },
            d.autonomous && { icon: '🔧', label: 'Oppstart', value: 'Dock, <45 sek' },
          ].filter(Boolean) as { icon: string; label: string; value: string }[];

          // Build score bar segments (visual only, relative)
          const scoreSegments = [
            { label: 'Dronetype-match', color: '#685BF8', pct: 30 },
            { label: 'Sensor', color: '#3B82F6', pct: 20 },
            { label: 'Pris', color: '#10B981', pct: 15 },
            { label: 'EASA', color: '#F59E0B', pct: 15 },
            { label: 'Deployment', color: '#06B6D4', pct: 12 },
            { label: 'Vær', color: '#9CA3AF', pct: 8 },
          ];

          return (
            <div
              key={i}
              className="bg-card rounded-2xl border border-border p-6 md:p-8 relative overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              {isPrimary && (
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #FF66C4, #685BF8)' }} />
              )}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Left column (60%) */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{droneTypeIcon(drone.drone_type)}</span>
                    <div>
                      <h3 className="text-lg font-display font-bold" style={{ color: '#1C0059' }}>
                        {drone.recommended_model}
                        {drone.quantity > 1 && <span className="text-sm font-normal text-muted-foreground ml-2">×{drone.quantity}</span>}
                      </h3>
                      <p className="text-sm" style={{ color: '#999999' }}>{drone.drone_type}</p>
                    </div>
                    {isPrimary && (
                      <Badge className="ml-auto text-xs border-0 text-white" style={{ background: 'linear-gradient(135deg, #FF66C4, #685BF8)' }}>
                        Hovedplattform
                      </Badge>
                    )}
                  </div>

                  {/* Why chosen */}
                  {d.why_chosen && (
                    <p className="text-sm leading-relaxed" style={{ color: '#555555' }}>
                      {d.why_chosen}
                    </p>
                  )}
                  {!d.why_chosen && (
                    <p className="text-sm leading-relaxed" style={{ color: '#555555' }}>
                      Dekker {totalUcs} bruksområder på tvers av {Object.keys(deptUcs).length} avdelinger.
                      {d.needs_thermal && ' Termisk og zoom for SAR og inspeksjon.'}
                      {d.autonomous && ' Dock-løsning muliggjør autonom førsteinnsats.'}
                    </p>
                  )}

                  {/* Use cases grouped by dept */}
                  <div className="space-y-2">
                    {Object.entries(deptUcs).map(([dept, ucs]) => (
                      <div key={dept} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold" style={{ color: '#1C0059' }}>{dept}:</span>
                        {ucs.map((uc, j) => (
                          <Badge key={j} variant="secondary" className="text-[10px] font-normal">{uc}</Badge>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right column (40%) */}
                <div className="w-full md:w-[38%] space-y-4">
                  {/* Specs */}
                  <div className="space-y-2">
                    {specs.map((s, si) => (
                      <div key={si} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-center">{s.icon}</span>
                        <span style={{ color: '#999999' }} className="w-24">{s.label}:</span>
                        <span className="font-medium" style={{ color: '#1C0059' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Price box */}
                  <div className="rounded-xl border border-border p-4 text-center">
                    {drone.estimated_cost_nok > 0 ? (
                      <>
                        <p className="text-xl font-display font-bold text-primary">
                          €{Math.round(drone.estimated_cost_nok / 11.5).toLocaleString('nb-NO')}
                        </p>
                        <p className="text-xs" style={{ color: '#999999' }}>
                          ca. {drone.estimated_cost_nok.toLocaleString('nb-NO')} kr
                        </p>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="text-xs gap-1.5" style={{ color: '#685BF8', borderColor: '#685BF8' }}>
                        Be om tilbud fra produsent
                      </Button>
                    )}
                  </div>

                  {/* Score bar */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#999999' }}>Relativ styrke</p>
                    <div className="flex h-3 rounded-full overflow-hidden">
                      {scoreSegments.map((seg, si) => (
                        <div
                          key={si}
                          style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                          title={seg.label}
                          className="transition-all"
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {scoreSegments.map((seg, si) => (
                        <div key={si} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                          <span className="text-[9px]" style={{ color: '#999999' }}>{seg.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison box */}
      <div className="bg-muted/40 rounded-2xl border border-border p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 className="text-base font-display font-semibold mb-4" style={{ color: '#1C0059' }}>Uten sambruksplanlegging</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-normal" style={{ color: '#999999' }}></th>
                <th className="text-center py-2 font-semibold" style={{ color: '#685BF8' }}>Haiko-anbefaling</th>
                <th className="text-center py-2 font-normal" style={{ color: '#999999' }}>Typisk silotilnærming</th>
              </tr>
            </thead>
            <tbody style={{ color: '#555555' }}>
              <tr className="border-b border-border/50">
                <td className="py-2.5">Antall plattformer</td>
                <td className="py-2.5 text-center font-semibold" style={{ color: '#1C0059' }}>{haikoCount}</td>
                <td className="py-2.5 text-center">{siloCount}–{siloCount + 2}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2.5">Total flåtekostnad</td>
                <td className="py-2.5 text-center font-semibold" style={{ color: '#1C0059' }}>{haikoCost.toLocaleString('nb-NO')} kr</td>
                <td className="py-2.5 text-center">{siloCost.toLocaleString('nb-NO')} kr</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2.5">Bruksområder dekket</td>
                <td className="py-2.5 text-center font-semibold" style={{ color: '#1C0059' }}>{haikoUseCases}</td>
                <td className="py-2.5 text-center">{siloUseCases}</td>
              </tr>
              <tr>
                <td className="py-2.5">Avdelinger med nytte</td>
                <td className="py-2.5 text-center font-semibold" style={{ color: '#1C0059' }}>{haikoDepts}</td>
                <td className="py-2.5 text-center">{siloDepts}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {savings > 0 && (
          <p className="mt-4 text-sm font-semibold" style={{ color: '#10B981' }}>
            Estimert besparelse med sambruk: {savings.toLocaleString('nb-NO')} kr sammenlignet med siloinnkjøp
          </p>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Sambruk Section — Placeholder for next iteration
   ═══════════════════════════════════════════════════ */

function SambrukSection({ analysis }: { analysis: DroneAnalysisResult }) {
  const activeDepts = analysis.department_analyses;
  const fleet = analysis.drone_fleet;

  // Build matrix data
  const getDeptCountForDrone = (drone: typeof fleet[0], dept: typeof activeDepts[0]) => {
    return dept.use_cases.filter(uc => {
      const shared = drone.shared_between.some(s =>
        dept.department.toLowerCase().includes(s.toLowerCase()) ||
        s.toLowerCase().includes(dept.department.toLowerCase().split(' ')[0])
      );
      if (shared) return true;
      const ucType = (uc.drone_type || '').toLowerCase();
      const droneType = drone.drone_type.toLowerCase();
      return ucType.includes(droneType) || droneType.includes(ucType);
    }).length;
  };

  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-muted/30';
    if (count <= 2) return 'bg-primary/10';
    if (count <= 4) return 'bg-primary/20';
    return 'bg-primary/35';
  };

  // Find "workhorse"
  const droneUcCounts = fleet.map(d => ({
    model: d.recommended_model,
    total: activeDepts.reduce((s, dept) => s + getDeptCountForDrone(d, dept), 0),
    deptCount: activeDepts.filter(dept => getDeptCountForDrone(d, dept) > 0).length,
  }));
  const workhorse = droneUcCounts.sort((a, b) => b.total - a.total)[0];

  return (
    <section id="sambruk" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Sambruk på tvers av avdelinger</h2>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>
          Hver plattform betjener flere avdelinger. Det er her verdien ligger.
        </p>
      </div>

      {/* Matrix */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left py-3 px-4 font-medium text-xs" style={{ color: '#999999' }}>Plattform</th>
                {activeDepts.map(d => (
                  <th key={d.department} className="text-center py-3 px-3 font-medium text-xs" style={{ color: '#999999' }}>
                    {d.department.length > 12 ? d.department.substring(0, 10) + '…' : d.department}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fleet.map((drone, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 px-4 font-medium text-sm" style={{ color: '#1C0059' }}>
                    {drone.recommended_model}
                  </td>
                  {activeDepts.map(dept => {
                    const count = getDeptCountForDrone(drone, dept);
                    return (
                      <td key={dept.department} className="py-3 px-3 text-center">
                        <div className={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold", getCellColor(count))}>
                          {count > 0 ? count : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {workhorse && (
        <p className="text-sm" style={{ color: '#555555' }}>
          <strong style={{ color: '#1C0059' }}>{workhorse.model}</strong> er kommunens arbeidshest — den dekker bruksområder i {workhorse.deptCount} av {activeDepts.length} avdelinger og er den mest kostnadseffektive investeringen.
        </p>
      )}

      {/* Distribution bar */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#999999' }}>Fordeling av bruksområder per plattform</p>
        <div className="flex h-8 rounded-full overflow-hidden">
          {droneUcCounts.map((d, i) => {
            const totalAll = droneUcCounts.reduce((s, x) => s + x.total, 0) || 1;
            const pct = (d.total / totalAll) * 100;
            const colors = ['#685BF8', '#FF66C4', '#06B6D4', '#10B981', '#F59E0B'];
            return (
              <div
                key={i}
                style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: colors[i % colors.length] }}
                className="flex items-center justify-center"
                title={`${d.model}: ${d.total} bruksområder`}
              >
                <span className="text-[10px] text-white font-semibold truncate px-1">{d.total}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          {droneUcCounts.map((d, i) => {
            const colors = ['#685BF8', '#FF66C4', '#06B6D4', '#10B981', '#F59E0B'];
            return (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                <span className="text-xs" style={{ color: '#555555' }}>{d.model} ({d.total})</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   ROI Section
   ═══════════════════════════════════════════════════ */

function ROISection({ analysis }: { analysis: DroneAnalysisResult }) {
  const totalFleetCost = analysis.drone_fleet.reduce((s, d) => s + d.estimated_cost_nok * d.quantity, 0);
  const annualSavings = analysis.drone_mission_savings?.total_annual_savings_nok || Math.round(totalFleetCost * 0.4);
  const paybackMonths = annualSavings > 0 ? Math.round((totalFleetCost / annualSavings) * 12) : null;

  return (
    <section id="roi" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Estimert gevinst</h2>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>
          Basert på KOSTRA-data, bransjetall og kommunens nøkkeltall. Estimatene er veiledende.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border-l-4 p-6 text-center" style={{ borderLeftColor: '#10B981', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p className="text-3xl font-display font-bold" style={{ color: '#10B981' }}>{(annualSavings / 1000).toFixed(0)}k kr</p>
          <p className="text-sm mt-1" style={{ color: '#555555' }}>Årlig besparelse</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p className="text-3xl font-display font-bold" style={{ color: '#1C0059' }}>{(totalFleetCost / 1000).toFixed(0)}k kr</p>
          <p className="text-sm mt-1" style={{ color: '#555555' }}>Investeringskostnad</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p className="text-3xl font-display font-bold" style={{ color: '#1C0059' }}>{paybackMonths || '—'} mnd</p>
          <p className="text-sm mt-1" style={{ color: '#555555' }}>Tilbakebetalt</p>
        </div>
      </div>

      {/* Savings by category */}
      {analysis.drone_mission_savings && analysis.drone_mission_savings.categories.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p className="text-sm font-display font-semibold mb-4" style={{ color: '#1C0059' }}>Besparelse per kategori</p>
          <div className="space-y-3">
            {analysis.drone_mission_savings.categories.filter(c => c.annual_savings_nok).map((cat, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1C0059' }}>{cat.category}</p>
                  <p className="text-xs" style={{ color: '#999999' }}>{cat.annual_missions} oppdrag/år</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
                  {cat.annual_savings_nok ? `${(cat.annual_savings_nok / 1000).toFixed(0)}k kr/år` : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs leading-relaxed" style={{ color: '#999999' }}>
        Estimatene er basert på bransjedata, KOSTRA-statistikk og erfaringstall fra sammenlignbare kommuner. Faktiske besparelser avhenger av driftsvolum, pilotkompetanse og implementeringstempo. En fullstendig Preflight Pro-analyse gir mer presise tall tilpasset deres situasjon.
      </p>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Regulatorisk Section
   ═══════════════════════════════════════════════════ */

function RegulatorySection({ analysis }: { analysis: DroneAnalysisResult }) {
  // Categorize use cases by regulatory complexity
  const allUcs = analysis.department_analyses.flatMap(d => d.use_cases);
  const openCount = allUcs.filter(uc => uc.easa_category?.toLowerCase().includes('åpen') || uc.pilot_certification?.toLowerCase().includes('a1')).length;
  const stsCount = allUcs.filter(uc => uc.pilot_certification?.toLowerCase().includes('sts') || uc.pilot_certification?.toLowerCase().includes('a2')).length;
  const soraCount = allUcs.filter(uc => uc.pilot_certification?.toLowerCase().includes('sora') || uc.operation_type === 'BVLOS').length;
  const adjustedOpen = openCount || Math.max(0, allUcs.length - stsCount - soraCount);

  const soraApps = Math.max(1, Math.ceil(soraCount / 3));

  const phases = [
    { months: 'Måned 1–2', color: '#10B981', items: ['Pilotopplæring A2 (Open-kategori)', 'Operations Manual utarbeidelse'] },
    { months: 'Måned 2–4', color: '#F59E0B', items: ['STS-sertifisering (hvis nødvendig)', 'SORA-søknad skriving (per operasjonstype)'] },
    { months: 'Måned 4–6', color: '#F59E0B', items: ['Innlevering til Luftfartstilsynet', 'OA-behandling (8–12 uker)'] },
    { months: 'Måned 6–8', color: '#685BF8', items: ['Operasjonstillatelse mottatt', 'Oppstart BVLOS-operasjoner'] },
  ];

  const costTable = [
    { activity: 'A2-pilotsertifisering (per pilot)', cost: '8 000–12 000 kr', time: '2–3 dager' },
    { activity: 'STS-sertifisering', cost: '15 000–25 000 kr', time: '1–2 uker' },
    { activity: 'SORA-søknad (per operasjonstype)', cost: '40 000–80 000 kr', time: '4–8 uker' },
    { activity: 'Operations Manual', cost: '25 000–50 000 kr', time: '2–4 uker' },
  ];

  return (
    <section id="regulatorisk" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Regulatorisk veikart</h2>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>
          Hva som kreves for å fly lovlig med den anbefalte flåten
        </p>
      </div>

      {/* Complexity summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Open-kategori', count: adjustedOpen, detail: 'Pilotsertifikat A1/A2', badge: '✅ Enkelt', color: '#10B981' },
          { label: 'Specific (STS)', count: stsCount, detail: 'STS-sertifisering + Operations Manual', badge: '⚠️ Moderat', color: '#F59E0B' },
          { label: 'Specific (SORA)', count: soraCount, detail: 'SORA-søknad + OA fra Luftfartstilsynet', badge: '🔶 Komplekst', color: '#F97316' },
        ].map((cat, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p className="text-2xl font-display font-bold" style={{ color: '#1C0059' }}>{cat.count}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: '#1C0059' }}>{cat.label}</p>
            <p className="text-xs mt-1" style={{ color: '#999999' }}>{cat.detail}</p>
            <Badge className="mt-2 text-xs border-0" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>{cat.badge}</Badge>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <p className="text-sm font-display font-semibold" style={{ color: '#1C0059' }}>Tidslinje</p>
        <div className="space-y-3">
          {phases.map((phase, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                {i < phases.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
              </div>
              <div className="pb-4">
                <p className="text-xs font-semibold" style={{ color: phase.color }}>{phase.months}</p>
                {phase.items.map((item, j) => (
                  <p key={j} className="text-sm" style={{ color: '#555555' }}>{item}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SORA count note */}
      {soraCount > 0 && (
        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5">
          <p className="text-sm" style={{ color: '#555555' }}>
            <strong style={{ color: '#1C0059' }}>{soraApps} SORA-søknader kreves</strong> for den anbefalte flåten. Hver søknad dekker én operasjonstype (drone + scenario + miljø). Haiko bistår med hele prosessen.
          </p>
        </div>
      )}

      {/* Cost table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="text-left py-3 px-4 font-medium text-xs" style={{ color: '#999999' }}>Aktivitet</th>
              <th className="text-center py-3 px-4 font-medium text-xs" style={{ color: '#999999' }}>Estimert kostnad</th>
              <th className="text-center py-3 px-4 font-medium text-xs" style={{ color: '#999999' }}>Tidsbruk</th>
            </tr>
          </thead>
          <tbody>
            {costTable.map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-3 px-4" style={{ color: '#555555' }}>{row.activity}</td>
                <td className="py-3 px-4 text-center font-medium" style={{ color: '#1C0059' }}>{row.cost}</td>
                <td className="py-3 px-4 text-center" style={{ color: '#999999' }}>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Veien Videre / CTA Section
   ═══════════════════════════════════════════════════ */

function CTASection({ municipalityName, analysis, iksPartners, fireDeptName }: {
  municipalityName: string;
  analysis: DroneAnalysisResult;
  iksPartners: string[];
  fireDeptName: string | null;
}) {
  const phases = [
    {
      icon: '🔍', title: 'Preflight Pro', duration: '4–6 uker', price: '65 000–80 000 kr',
      desc: 'Detaljert behovsanalyse med workshop, avdelingsintervjuer og endelig flåteanbefaling med presist kostnadsestimat.',
      items: ['Workshop med aktuelle avdelinger', 'Detaljert kravspesifikasjon per bruksområde', 'Endelig flåteanbefaling med prisforhandling', 'ROI-beregning med kommunespesifikke tall', 'Beslutningsdokument for rådmann/kommunestyre'],
    },
    {
      icon: '🚀', title: 'Implementering', duration: '3–6 måneder', price: 'Prosjektbasert',
      desc: 'Fra vedtak til operativ drift. Haiko bistår med anskaffelse, regulatorisk godkjenning, pilotsertifisering og systemoppsett.',
      items: ['Anskaffelsesrådgivning og leverandørkontakt', 'SORA-søknader og Operations Manual', 'Pilotsertifisering via godkjent treningspartner', 'Systemintegrasjon (GIS, FlightHub, dataflyt)', 'Oppsett, testing og akseptanseflyging'],
    },
    {
      icon: '🔄', title: 'Drift og utvikling', duration: 'Løpende', price: 'Retainer',
      desc: 'Løpende støtte, vedlikehold og utvidelse av droneprogrammet etter hvert som behovene utvikler seg.',
      items: ['Driftsavtale og teknisk support', 'Vedlikehold og firmware-oppdateringer', 'Regulatorisk compliance (OA-fornyelse)', 'Utvidelse av dronepark ved nye behov', 'Kvartalsvis statusgjennomgang'],
    },
  ];

  return (
    <section id="veien-videre" className="scroll-mt-16 space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Veien videre med Haiko</h2>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>
          Fra analyse til operativ droneavdeling
        </p>
      </div>

      {/* 3 phases */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {phases.map((phase, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-6 space-y-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{phase.icon}</span>
              <div>
                <p className="font-display font-bold text-sm" style={{ color: '#1C0059' }}>{phase.title}</p>
                <p className="text-xs" style={{ color: '#999999' }}>{phase.duration}</p>
              </div>
            </div>
            <p className="text-sm" style={{ color: '#555555' }}>{phase.desc}</p>
            <ul className="space-y-1">
              {phase.items.map((item, j) => (
                <li key={j} className="text-xs flex items-start gap-2" style={{ color: '#555555' }}>
                  <span className="mt-1 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs font-medium pt-2 border-t border-border" style={{ color: '#999999' }}>{phase.price}</p>
          </div>
        ))}
      </div>

      {/* IKS note */}
      {iksPartners.length > 0 && fireDeptName && (
        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5">
          <p className="text-sm" style={{ color: '#555555' }}>
            <strong style={{ color: '#1C0059' }}>Samarbeid i {fireDeptName}:</strong> Droneflåten kan stasjoneres sentralt og betjene alle {iksPartners.length + 1} eierkommuner. Haiko kan bistå med å etablere en felles droneavdeling på tvers av kommunene, noe som reduserer kostnaden per kommune og sikrer lik beredskap i hele regionen.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="rounded-2xl p-8 text-center space-y-4" style={{ backgroundColor: '#1C0059' }}>
        <h3 className="text-xl font-display font-bold text-white">Klar for neste steg?</h3>
        <p className="text-sm text-white/80">
          Vi gjennomgår analysen sammen og planlegger Preflight Pro for {municipalityName}.
        </p>
        <a href={`mailto:gunhild@haiko.no?subject=Oppfølgingsmøte droneanalyse – ${municipalityName}`}>
          <Button
            size="lg"
            className="text-white font-display font-semibold gap-2 h-12 px-8"
            style={{ background: 'linear-gradient(135deg, #FF66C4, #685BF8)' }}
          >
            Book møte med Haiko <ArrowRight className="w-4 h-4" />
          </Button>
        </a>
        <p className="text-xs text-white/60">Gratis og uforpliktende. 30 minutter.</p>
      </div>

      {/* PDF alt */}
      <p className="text-center text-sm" style={{ color: '#999999' }}>
        Eller last ned rapporten som PDF for å dele internt:{' '}
        <button onClick={() => window.print()} className="underline font-medium" style={{ color: '#685BF8' }}>
          Last ned PDF
        </button>
      </p>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */

export default function DroneAnalysis({
  municipalityName, population, areaKm2, roadKm, vaKm, buildings,
  terrainType, densityPerKm2, departments, iksPartners,
  fireDeptName, fireDeptType, alarmSentralName, regionMunicipalities,
  sectorData, fireStats, brisMissionData, onContinue, onBack
}: Props) {
  const [analysis, setAnalysis] = useState<DroneAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("sammendrag");
  const [preferEuropean, setPreferEuropean] = useState(false);

  // Intersection observer for sticky nav tracking
  useEffect(() => {
    if (!analysis) return;
    const ids = navSections.map(s => s.id);
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

  // Fetch analysis
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
            prefer_european: preferEuropean,
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
  }, [municipalityName, population, areaKm2, roadKm, vaKm, buildings, terrainType, densityPerKm2, departments, iksPartners, fireDeptName, fireDeptType, alarmSentralName, regionMunicipalities, sectorData, fireStats, brisMissionData, preferEuropean]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="max-w-[960px] mx-auto px-6 py-16 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(255,102,196,0.1), rgba(104,91,248,0.1))' }}>
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Analyserer mulighetsrom</h1>
              <p className="text-sm" style={{ color: '#999999' }}>AI vurderer droneoperasjoner for {municipalityName}...</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferEuropean}
                onChange={e => setPreferEuropean(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
              />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#1C0059' }}>🇪🇺 Foretrekk europeisk/nordisk produsent</p>
                <p className="text-xs" style={{ color: '#999999' }}>Vekter droner fra europeiske og nordiske produsenter høyere i anbefalingene.</p>
              </div>
            </label>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-4 max-w-md" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive/60" />
          <h2 className="text-lg font-display font-bold" style={{ color: '#1C0059' }}>Analyse feilet</h2>
          <p className="text-sm" style={{ color: '#555555' }}>{error}</p>
          <Button onClick={onBack} variant="outline">Tilbake</Button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Sticky topbar */}
      <StickyTopbar
        municipalityName={municipalityName}
        activeSection={activeSection}
        onBack={onBack}
      />

      {/* Main content */}
      <main className="max-w-[960px] mx-auto px-6 py-10 space-y-12">
        <HeroSection
          municipalityName={municipalityName}
          analysis={analysis}
          departments={departments}
        />

        <FleetSection analysis={analysis} departments={departments} />

        <SambrukSection analysis={analysis} />

        <ROISection analysis={analysis} />

        <RegulatorySection analysis={analysis} />

        <CTASection
          municipalityName={municipalityName}
          analysis={analysis}
          iksPartners={iksPartners}
          fireDeptName={fireDeptName}
        />

        {/* Bottom actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={onBack}>Tilbake til pre-analyse</Button>
          <Button onClick={onContinue} className="gap-2 font-display font-semibold">
            Fordyp med DMV-vurdering <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
