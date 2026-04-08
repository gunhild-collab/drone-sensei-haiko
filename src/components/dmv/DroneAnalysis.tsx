import React, { useState, useEffect, useCallback } from "react";
import type { BrisMissionData } from "@/hooks/useMunicipalityProfile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, Plane, Shield, GraduationCap, Clock, Users, MapPin,
  ChevronRight, ChevronDown, AlertTriangle, Flame, Route, Droplets,
  Building2, TreePine, Heart, Map, Leaf, Sparkles, ArrowRight,
  Info, BookOpen, Siren, Milestone, Home, Download, Settings2, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { KostraSectorData } from "@/lib/evaluationApi";
import type { ActiveDepartment } from "./DepartmentEditor";
import { useSoftwareStack, getRecommendedSoftware, formatSoftwarePriceNOK } from "@/hooks/useSoftwareStack";
import type { SoftwareProduct } from "@/hooks/useSoftwareStack";
import TimeSavingsSection, { computeTasks } from "./TimeSavingsSection";
import DroneHubSection from "./DroneHubSection";
import DigitalTwinSection from "./DigitalTwinSection";
import CoUseSection from "./CoUseSection";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { RadarPdfDocument, type RadarPdfData } from "./RadarPdfDocument";
import {
  fetchAndScoreFleet, formatNOK, formatNOKRaw, EUR_TO_NOK,
  COUNTRY_FLAGS, SOFTWARE_CATEGORY_MAP,
  type FleetResult, type ScoredDrone, type DMAProduct,
} from "@/lib/droneFleetEngine";

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
   Nav
   ═══════════════════════════════════════════════════ */

const navSections = [
  { id: "sammendrag", label: "Sammendrag" },
  { id: "flate", label: "Flåte" },
  { id: "tidsbesparelse", label: "Tid" },
  { id: "oppetid", label: "Oppetid" },
  { id: "dronehub", label: "Hub" },
  { id: "digital-tvilling", label: "Tvilling" },
  { id: "sambruk", label: "Sambruk" },
  { id: "roi", label: "ROI" },
  { id: "regulatorisk", label: "Regulatorisk" },
  { id: "veien-videre", label: "Veien videre" },
];

/* ═══════════════════════════════════════════════════
   Sticky Topbar
   ═══════════════════════════════════════════════════ */

function StickyTopbar({ municipalityName, activeSection, onBack, onDownloadPdf, generatingPdf }: {
  municipalityName: string; activeSection: string; onBack: () => void;
  onDownloadPdf: () => void; generatingPdf: boolean;
}) {
  return (
    <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="max-w-[960px] mx-auto flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display font-bold text-sm text-primary whitespace-nowrap">Haiko Radar</span>
          <span className="text-muted-foreground text-sm hidden sm:inline">·</span>
          <span className="text-muted-foreground text-sm truncate hidden sm:inline">{municipalityName}</span>
        </div>
        <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
          {navSections.map((s) => (
            <button key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap",
                activeSection === s.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 hidden sm:flex" onClick={onBack}>
            <Settings2 className="w-3.5 h-3.5" /> Juster
          </Button>
          <Button size="sm" className="text-xs gap-1.5 font-display font-semibold"
            style={{ background: 'linear-gradient(135deg, #FF66C4, #685BF8)' }}
            onClick={onDownloadPdf}
            disabled={generatingPdf}>
            {generatingPdf ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Genererer...</>
            ) : (
              <><Download className="w-3.5 h-3.5" /> PDF</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Hero / Sammendrag
   ═══════════════════════════════════════════════════ */

function HeroSection({ municipalityName, analysis, departments, fleetResult }: {
  municipalityName: string;
  analysis: DroneAnalysisResult;
  departments: ActiveDepartment[];
  fleetResult: FleetResult;
}) {
  const activeDepts = departments.filter(d => d.enabled);
  const totalUseCases = analysis.department_analyses.reduce((s, d) => s + d.use_cases.length, 0);
  const annualSavings = analysis.drone_mission_savings?.total_annual_savings_nok;
  const savingsDisplay = annualSavings
    ? `${formatNOKRaw(annualSavings)}–${formatNOKRaw(annualSavings * 1.4)}`
    : 'Beregnes';

  const getFlag = (d: ScoredDrone) => {
    const country = d.product.manufacturers?.country || '';
    return COUNTRY_FLAGS[country] || '🌐';
  };

  return (
    <section id="sammendrag" className="scroll-mt-16 rounded-2xl p-8 md:p-10"
      style={{ background: 'linear-gradient(135deg, rgba(255,102,196,0.08), rgba(104,91,248,0.08), rgba(255,255,255,1))' }}>
      <h1 className="text-2xl md:text-3xl font-display font-bold" style={{ color: '#1C0059' }}>
        Mulighetsanalyse for {municipalityName}
      </h1>
      <p className="text-sm mt-1" style={{ color: '#999999' }}>
        Generert {new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} · Basert på SSB/KOSTRA-data og {totalUseCases} valgte bruksområder
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
        <div className="text-center">
          <p className="text-4xl font-display font-bold text-primary">{totalUseCases}</p>
          <p className="text-sm mt-1" style={{ color: '#555' }}>bruksområder</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-display font-bold text-primary">{activeDepts.length}</p>
          <p className="text-sm mt-1" style={{ color: '#555' }}>avdelinger deler nytte</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-display font-bold" style={{ color: '#10B981' }}>{savingsDisplay}</p>
          <p className="text-sm mt-1" style={{ color: '#555' }}>estimert årlig besparelse</p>
        </div>
      </div>
      <div className="mt-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#999' }}>Anbefalt flåte</p>
        <div className="flex flex-wrap gap-3">
          {fleetResult.fleet.map((d, i) => (
            <div key={i} className="flex items-center gap-3 bg-card rounded-xl border border-border px-4 py-3 shadow-sm">
              <span className="text-2xl">{getFlag(d)}</span>
              <div>
                <p className="text-sm font-display font-semibold" style={{ color: '#1C0059' }}>{d.product.product_name}</p>
                <p className="text-xs" style={{ color: '#999' }}>
                  {d.roleLabel} · {formatNOK(d.product.price_eur, !!d.product.quote_required)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Fleet Section — NEW role-based cards + coverage matrix + cost table
   ═══════════════════════════════════════════════════ */

function FleetSection({ fleetResult, softwareData, analysis }: {
  fleetResult: FleetResult;
  softwareData: SoftwareProduct[];
  analysis: DroneAnalysisResult;
}) {
  const { fleet, coverageMatrix, totalCoveredTags, totalRequiredTags } = fleetResult;

  // Software per drone based on matched tags
  const getDroneSoftware = (drone: ScoredDrone): SoftwareProduct[] => {
    const swCategories = new Set<string>();
    drone.matchedTags.forEach(tag => {
      (SOFTWARE_CATEGORY_MAP[tag] || []).forEach(cat => swCategories.add(cat));
    });
    const matching = softwareData.filter(sw => swCategories.has(sw.category));
    const byCategory: Record<string, SoftwareProduct> = {};
    for (const sw of matching) {
      const existing = byCategory[sw.category];
      if (!existing) { byCategory[sw.category] = sw; continue; }
      const isEu = (c: string) => ['switzerland','germany','france','netherlands','denmark','finland','norway','sweden','belgium','italy','spain','united kingdom','latvia'].includes(c.toLowerCase());
      const scoreA = (isEu(sw.vendor_country) ? 10 : 0) + (sw.api_available ? 3 : 0) + (sw.open_source ? 1 : 0);
      const scoreB = (isEu(existing.vendor_country) ? 10 : 0) + (existing.api_available ? 3 : 0) + (existing.open_source ? 1 : 0);
      if (scoreA > scoreB) byCategory[sw.category] = sw;
    }
    return Object.values(byCategory);
  };

  // Category labels for software
  const SW_CAT_LABELS: Record<string, string> = {
    photogrammetry: "Kartlegging",
    gis_integration: "GIS",
    inspection_analytics: "Inspeksjon",
    digital_twin: "Digital tvilling",
    mission_control: "Oppdragsstyring",
    thermal_analysis: "Termisk",
    agriculture: "Jordbruk",
    fleet_management: "Flåtestyring",
    flight_planning: "Flyplanlegging",
    utm_airspace: "UTM",
    data_processing: "Dataprosessering",
  };

  // Cost calculations
  const allSwItems: { sw: SoftwareProduct; label: string }[] = [];
  const seenSwIds = new Set<string>();
  fleet.forEach(d => {
    getDroneSoftware(d).forEach(sw => {
      if (!seenSwIds.has(sw.id)) {
        seenSwIds.add(sw.id);
        allSwItems.push({ sw, label: SW_CAT_LABELS[sw.category] || sw.category });
      }
    });
  });

  const totalSwEurYear = allSwItems.reduce((s, item) => s + (item.sw.price_eur_year || 0), 0);
  const totalSwNokYear = Math.round(totalSwEurYear * EUR_TO_NOK);
  const accessoriesNok = 60000; // batteries, cases, etc.
  const regulatoryNok = fleet.length * 40000; // SORA per drone type
  const certNok = 5000;
  const trainingNok = 50000;
  const hwHasQuotes = fleet.every(d => d.product.quote_required || d.product.price_eur === null);
  const totalHwNok = fleet.reduce((s, d) => s + ((d.product.price_eur || 0) * EUR_TO_NOK), 0);

  const getFlag = (d: ScoredDrone) => {
    const country = d.product.manufacturers?.country || '';
    return COUNTRY_FLAGS[country] || '🌐';
  };

  const sensorText = (d: DMAProduct) => {
    const parts: string[] = [];
    if (d.sensor_1) parts.push(d.sensor_1);
    if (d.sensor_2) parts.push(d.sensor_2);
    return parts.length > 0 ? parts.join(' + ') : 'RGB';
  };

  return (
    <section id="flate" className="scroll-mt-16 space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Anbefalt droneflåte</h2>
        <p className="text-sm mt-1" style={{ color: '#555' }}>
          Basert på kommunens bruksområder, geografi og budsjettramme — rollebasert utvelgelse
        </p>
      </div>

      {/* Fleet cards */}
      <div className="space-y-6">
        {fleet.map((drone, i) => {
          const p = drone.product;
          const isPrimary = i === 0;
          const droneSw = getDroneSoftware(drone);
          const flag = getFlag(drone);
          const country = p.manufacturers?.country || '';

          return (
            <div key={i} className="bg-card rounded-2xl border border-border p-6 md:p-8 relative overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {isPrimary && <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #FF66C4, #685BF8)' }} />}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Left */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{flag}</span>
                    <div>
                      <h3 className="text-lg font-display font-bold" style={{ color: '#1C0059' }}>
                        {p.product_name}
                      </h3>
                      <p className="text-sm" style={{ color: '#999' }}>
                        {p.aircraft_type || p.category} · {country}
                      </p>
                    </div>
                    {isPrimary && (
                      <Badge className="ml-auto text-xs border-0 text-white" style={{ background: 'linear-gradient(135deg, #FF66C4, #685BF8)' }}>
                        Hovedplattform
                      </Badge>
                    )}
                  </div>

                  {/* Role */}
                  <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#685BF8' }}>
                    Rolle: {drone.roleLabel}
                  </div>

                  {/* Matched use cases as badges */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#999' }}>DEKKER BRUKSOMRÅDER:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {drone.matchedTags.map((tag, j) => {
                        const LABELS: Record<string, string> = {
                          kartlegging: "Kartlegging", jordbruk: "Jordbruk", miljo: "Miljø",
                          helse_transport: "Helse", inspeksjon_bygg: "Bygg", inspeksjon_bro: "Bro",
                          inspeksjon_va: "VA", inspeksjon_vei: "Vei", digital_tvilling: "Tvilling",
                          brann_sar: "Brann/SAR", beredskap: "Beredskap", overvaking: "Overvåking",
                        };
                        return <Badge key={j} variant="secondary" className="text-[10px]">{LABELS[tag] || tag}</Badge>;
                      })}
                    </div>
                  </div>

                  {/* Software stack */}
                  {droneSw.length > 0 && (
                    <div className="rounded-xl border border-border/60 p-4" style={{ backgroundColor: "#FAFAF8" }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: "#685BF8" }}>📦 Anbefalt software:</p>
                      <div className="space-y-1.5">
                        {droneSw.slice(0, 5).map((sw, si) => (
                          <div key={si} className="flex items-center justify-between text-xs">
                            <span style={{ color: "#555" }}>
                              {SW_CAT_LABELS[sw.category] || sw.category}: <strong style={{ color: "#1C0059" }}>{sw.name}</strong>
                              {sw.vendor_country && <span style={{ color: "#999" }}> ({sw.vendor_country})</span>}
                            </span>
                            <span style={{ color: "#685BF8" }}>{formatSoftwarePriceNOK(sw)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right — specs + price */}
                <div className="w-full md:w-[38%] space-y-4">
                  <div className="space-y-2">
                    {[
                      p.endurance_minutes && { icon: '⏱', label: 'Flygetid', value: `${p.endurance_minutes} min` },
                      p.range_km && { icon: '📏', label: 'Rekkevidde', value: `${p.range_km} km` },
                      p.mtow_kg && { icon: '⚖️', label: 'MTOW', value: `${p.mtow_kg} kg` },
                      { icon: '🌡', label: 'Sensor', value: sensorText(p) },
                      { icon: '📡', label: 'BVLOS', value: p.bvlos_ready ? 'Ja' : 'Nei' },
                      p.ip_rating && { icon: '🛡', label: 'IP', value: p.ip_rating },
                      p.launch_method && { icon: '🚀', label: 'Launch', value: p.launch_method },
                    ].filter(Boolean).map((s: any, si) => (
                      <div key={si} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-center">{s.icon}</span>
                        <span style={{ color: '#999' }} className="w-24">{s.label}:</span>
                        <span className="font-medium" style={{ color: '#1C0059' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border p-4 text-center">
                    <p className="text-xl font-display font-bold" style={{ color: '#685BF8' }}>
                      {formatNOK(p.price_eur, !!p.quote_required)}
                    </p>
                    {p.price_eur && !p.quote_required && (
                      <p className="text-xs mt-1" style={{ color: '#999' }}>
                        estimert pris
                      </p>
                    )}
                    {(p.quote_required || !p.price_eur) && (
                      <p className="text-xs mt-1" style={{ color: '#999' }}>
                        Haiko innhenter tilbud
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ COVERAGE MATRIX ═══ */}
      {coverageMatrix.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="p-4 border-b border-border/50">
            <p className="text-sm font-display font-semibold" style={{ color: '#1C0059' }}>Dekningsmatrise</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left py-3 px-4 font-medium text-xs" style={{ color: '#999' }}></th>
                  {fleet.map((d, i) => (
                    <th key={i} className="text-center py-3 px-3 font-medium text-xs" style={{ color: '#1C0059' }}>
                      {d.product.product_name.length > 18 ? d.product.product_name.substring(0, 16) + '…' : d.product.product_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coverageMatrix.map((row, ri) => (
                  <tr key={ri} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-4 text-sm" style={{ color: '#555' }}>{row.label}</td>
                    {row.drones.map((covered, ci) => (
                      <td key={ci} className="py-2.5 px-3 text-center">
                        {covered ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2" style={{ borderColor: '#685BF8' }}>
                  <td className="py-3 px-4 text-xs font-semibold" style={{ color: '#1C0059' }}>Bruksområder dekket:</td>
                  {fleet.map((d, i) => (
                    <td key={i} className="py-3 px-3 text-center text-xs font-semibold" style={{ color: '#685BF8' }}>
                      {d.matchedTags.length}/{totalRequiredTags}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TOTAL SYSTEM COST TABLE ═══ */}
      <div className="rounded-2xl border-2 p-6" style={{ borderColor: "#685BF8", boxShadow: "0 2px 8px rgba(104,91,248,0.08)" }}>
        <h3 className="text-base font-display font-bold mb-4" style={{ color: "#1C0059" }}>
          ESTIMERT SYSTEMKOSTNAD
        </h3>
        <div className="space-y-1">
          {/* Hardware */}
          <p className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: '#999' }}>Hardware</p>
          {fleet.map((d, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30">
              <span className="text-sm" style={{ color: "#555" }}>{d.product.product_name}</span>
              <span className="text-sm font-medium" style={{ color: "#1C0059" }}>
                {formatNOK(d.product.price_eur, !!d.product.quote_required)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between py-1.5 border-b border-border/30">
            <span className="text-sm" style={{ color: "#555" }}>Tilbehør/batterier est.</span>
            <span className="text-sm font-medium" style={{ color: "#1C0059" }}>{formatNOKRaw(accessoriesNok)}</span>
          </div>

          {/* Software */}
          <p className="text-xs font-semibold uppercase tracking-wider pt-3" style={{ color: '#999' }}>Software (årlig)</p>
          {allSwItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30">
              <span className="text-sm" style={{ color: "#555" }}>{item.sw.name}</span>
              <span className="text-sm font-medium" style={{ color: "#1C0059" }}>{formatSoftwarePriceNOK(item.sw)}</span>
            </div>
          ))}

          {/* Regulatory */}
          <p className="text-xs font-semibold uppercase tracking-wider pt-3" style={{ color: '#999' }}>Regulatorisk</p>
          <div className="flex items-center justify-between py-1.5 border-b border-border/30">
            <span className="text-sm" style={{ color: "#555" }}>{Math.ceil(fleet.length)} SORA-søknader est.</span>
            <span className="text-sm font-medium" style={{ color: "#1C0059" }}>{formatNOKRaw(regulatoryNok)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/30">
            <span className="text-sm" style={{ color: "#555" }}>A2-sertifisering</span>
            <span className="text-sm font-medium" style={{ color: "#1C0059" }}>{formatNOKRaw(certNok)}</span>
          </div>

          {/* Training */}
          <p className="text-xs font-semibold uppercase tracking-wider pt-3" style={{ color: '#999' }}>Opplæring</p>
          <div className="flex items-center justify-between py-1.5 border-b border-border/30">
            <span className="text-sm" style={{ color: "#555" }}>Pilotopplæring (2 pers)</span>
            <span className="text-sm font-medium" style={{ color: "#1C0059" }}>{formatNOKRaw(trainingNok)}</span>
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between py-3 mt-2 border-t-2" style={{ borderColor: "#685BF8" }}>
            <span className="text-sm font-bold" style={{ color: "#1C0059" }}>Totalt år 1</span>
            <span className="text-lg font-display font-bold" style={{ color: "#685BF8" }}>
              {hwHasQuotes
                ? `Tilbud + ${formatNOKRaw(accessoriesNok + totalSwNokYear + regulatoryNok + certNok + trainingNok)}`
                : formatNOKRaw(Math.round(totalHwNok + accessoriesNok + totalSwNokYear + regulatoryNok + certNok + trainingNok))
              }
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm" style={{ color: "#999" }}>Løpende årlig (år 2+)</span>
            <span className="text-sm font-medium" style={{ color: "#999" }}>
              {totalSwNokYear > 0 ? `${formatNOKRaw(totalSwNokYear)}/år + vedlikehold` : 'Vedlikehold'}
            </span>
          </div>
        </div>

        {hwHasQuotes && (
          <p className="text-xs mt-3 pt-3 border-t border-border/50" style={{ color: '#999' }}>
            Hvor «Tilbud» vises: Haiko innhenter priser og forhandler på vegne av kommunen som del av implementeringsprosessen.
          </p>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Sambruk (matrix — kept but uses fleet engine data when available)
   ═══════════════════════════════════════════════════ */

function SambrukSection({ analysis, fleetResult }: { analysis: DroneAnalysisResult; fleetResult: FleetResult }) {
  const activeDepts = analysis.department_analyses;
  const fleet = fleetResult.fleet;

  if (fleet.length === 0) return null;

  // Map each department to tags
  const deptTagMap: Record<string, string[]> = {};
  for (const dept of activeDepts) {
    const tags = new Set<string>();
    dept.use_cases.forEach(uc => {
      const ucTags = Object.entries(USE_CASE_TO_TAGS).find(([key]) =>
        uc.name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(uc.name.toLowerCase().split(' ')[0])
      );
      if (ucTags) ucTags[1].forEach(t => tags.add(t));
    });
    deptTagMap[dept.department] = Array.from(tags);
  }

  const getDeptOverlap = (drone: ScoredDrone, dept: typeof activeDepts[0]) => {
    const deptTags = deptTagMap[dept.department] || [];
    return drone.matchedTags.filter(t => deptTags.includes(t)).length;
  };

  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-muted/30';
    if (count <= 2) return 'bg-primary/10';
    return 'bg-primary/25';
  };

  const droneStats = fleet.map(d => ({
    name: d.product.product_name,
    deptCount: activeDepts.filter(dept => getDeptOverlap(d, dept) > 0).length,
  }));
  const workhorse = [...droneStats].sort((a, b) => b.deptCount - a.deptCount)[0];

  return (
    <section id="sambruk" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Sambruk på tvers av avdelinger</h2>
        <p className="text-sm mt-1" style={{ color: '#555' }}>Hver plattform betjener flere avdelinger.</p>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left py-3 px-4 font-medium text-xs" style={{ color: '#999' }}>Plattform</th>
                {activeDepts.map(d => (
                  <th key={d.department} className="text-center py-3 px-3 font-medium text-xs" style={{ color: '#999' }}>
                    {d.department.length > 12 ? d.department.substring(0, 10) + '…' : d.department}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fleet.map((drone, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 px-4 font-medium text-sm" style={{ color: '#1C0059' }}>{drone.product.product_name}</td>
                  {activeDepts.map(dept => {
                    const count = getDeptOverlap(drone, dept);
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
        <p className="text-sm" style={{ color: '#555' }}>
          <strong style={{ color: '#1C0059' }}>{workhorse.name}</strong> er kommunens arbeidshest — dekker bruksområder i {workhorse.deptCount} av {activeDepts.length} avdelinger.
        </p>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   ROI Section
   ═══════════════════════════════════════════════════ */

function ROISection({ analysis }: { analysis: DroneAnalysisResult }) {
  const annualSavings = analysis.drone_mission_savings?.total_annual_savings_nok || 0;

  return (
    <section id="roi" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Estimert gevinst</h2>
        <p className="text-sm mt-1" style={{ color: '#555' }}>Basert på KOSTRA-data og bransjetall.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { value: annualSavings > 0 ? `${formatNOKRaw(annualSavings)}/år` : 'Beregnes', label: 'Årlig besparelse', color: '#10B981' },
          { value: analysis.drone_mission_savings?.drone_replaceable_missions?.toString() || '—', label: 'Drone-oppdrag/år', color: '#1C0059' },
          { value: analysis.drone_mission_savings?.categories?.length?.toString() || '—', label: 'Besparelseskategorier', color: '#1C0059' },
        ].map((item, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-6 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p className="text-3xl font-display font-bold" style={{ color: item.color }}>{item.value}</p>
            <p className="text-sm mt-1" style={{ color: '#555' }}>{item.label}</p>
          </div>
        ))}
      </div>
      {analysis.drone_mission_savings?.categories && analysis.drone_mission_savings.categories.filter(c => c.annual_savings_nok).length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p className="text-sm font-display font-semibold mb-4" style={{ color: '#1C0059' }}>Besparelse per kategori</p>
          {analysis.drone_mission_savings.categories.filter(c => c.annual_savings_nok).map((cat, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1C0059' }}>{cat.category}</p>
                <p className="text-xs" style={{ color: '#999' }}>{cat.annual_missions} oppdrag/år</p>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
                {cat.annual_savings_nok ? `${formatNOKRaw(cat.annual_savings_nok)}/år` : '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Regulatorisk Section — with ladder
   ═══════════════════════════════════════════════════ */

function RegulatorySection({ analysis }: { analysis: DroneAnalysisResult }) {
  const allUcs = analysis.department_analyses.flatMap(d => d.use_cases);
  const openCount = allUcs.filter(uc => uc.easa_category?.toLowerCase().includes('åpen') || uc.pilot_certification?.toLowerCase().includes('a1')).length;
  const stsCount = allUcs.filter(uc => uc.pilot_certification?.toLowerCase().includes('sts') || uc.pilot_certification?.toLowerCase().includes('a2')).length;
  const soraCount = allUcs.filter(uc => uc.pilot_certification?.toLowerCase().includes('sora') || uc.operation_type === 'BVLOS').length;
  const adjustedOpen = openCount || Math.max(0, allUcs.length - stsCount - soraCount);
  const soraApps = Math.max(1, Math.ceil(soraCount / 3));

  const phases = [
    { months: 'Måned 1–2', color: '#10B981', items: ['Pilotopplæring A2 (Open-kategori)', 'Operations Manual utarbeidelse'] },
    { months: 'Måned 2–4', color: '#F59E0B', items: ['STS-sertifisering', 'SORA-søknad skriving'] },
    { months: 'Måned 4–6', color: '#F59E0B', items: ['Innlevering til Luftfartstilsynet', 'OA-behandling (8–12 uker)'] },
    { months: 'Måned 6–8', color: '#685BF8', items: ['Operasjonstillatelse mottatt', 'Oppstart BVLOS-operasjoner'] },
  ];

  const ladderSteps = [
    { title: "A2-sertifikat", subtitle: "VLOS-operasjon", details: ["Manuell pilot", "<120m, <500m avstand"], timeline: "Dag 1", color: "#10B981" },
    { title: "SORA-søknad", subtitle: "BVLOS godkjent", details: ["Remote pilot", "Dock-basert operasjon"], timeline: "3–6 mnd", color: "#F59E0B" },
    { title: "LUC-sertifikat", subtitle: "Selvgodkjenning", details: ["Autonom drift", "Nye kommuner på dager"], timeline: "12–18 mnd", color: "#685BF8" },
  ];

  return (
    <section id="regulatorisk" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Regulatorisk veikart</h2>
        <p className="text-sm mt-1" style={{ color: '#555' }}>Hva som kreves for å fly lovlig med den anbefalte flåten</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Open-kategori', count: adjustedOpen, detail: 'A1/A2', badge: '✅ Enkelt', color: '#10B981' },
          { label: 'Specific (STS)', count: stsCount, detail: 'STS + Operations Manual', badge: '⚠️ Moderat', color: '#F59E0B' },
          { label: 'Specific (SORA)', count: soraCount, detail: 'SORA + OA', badge: '🔶 Komplekst', color: '#F97316' },
        ].map((cat, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p className="text-2xl font-display font-bold" style={{ color: '#1C0059' }}>{cat.count}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: '#1C0059' }}>{cat.label}</p>
            <p className="text-xs mt-1" style={{ color: '#999' }}>{cat.detail}</p>
            <Badge className="mt-2 text-xs border-0" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>{cat.badge}</Badge>
          </div>
        ))}
      </div>
      {/* Ladder */}
      <div className="bg-card rounded-2xl border border-border p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <p className="text-sm font-display font-semibold mb-4" style={{ color: '#1C0059' }}>Fra VLOS til autonom — regulatorisk trappestige</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ladderSteps.map((step, i) => (
            <div key={i} className="rounded-xl border-2 p-5 relative" style={{ borderColor: step.color }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: step.color }}>{i + 1}</div>
                <p className="text-xs font-semibold" style={{ color: step.color }}>{step.timeline}</p>
              </div>
              <p className="text-sm font-display font-bold" style={{ color: '#1C0059' }}>{step.title}</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: '#555' }}>{step.subtitle}</p>
              <div className="mt-2 space-y-1">
                {step.details.map((d, j) => <p key={j} className="text-xs" style={{ color: '#999' }}>• {d}</p>)}
              </div>
              {i < ladderSteps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-xl" style={{ color: step.color }}>→</div>
              )}
            </div>
          ))}
        </div>
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
                {phase.items.map((item, j) => <p key={j} className="text-sm" style={{ color: '#555' }}>{item}</p>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {soraCount > 0 && (
        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5">
          <p className="text-sm" style={{ color: '#555' }}>
            <strong style={{ color: '#1C0059' }}>{soraApps} SORA-søknader kreves</strong>. Haiko bistår med hele prosessen.
          </p>
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   CTA / Veien Videre
   ═══════════════════════════════════════════════════ */

function CTASection({ municipalityName, iksPartners, fireDeptName }: {
  municipalityName: string; iksPartners: string[]; fireDeptName: string | null;
}) {
  const phases = [
    {
      icon: '🔍', title: 'Preflight Pro', duration: '4–6 uker', price: '65 000–80 000 kr',
      desc: 'Detaljert behovsanalyse med workshop, avdelingsintervjuer og endelig flåteanbefaling.',
      items: ['Workshop med aktuelle avdelinger', 'Kravspesifikasjon per bruksområde', 'Endelig flåteanbefaling', 'ROI med kommunespesifikke tall', 'Beslutningsdokument'],
    },
    {
      icon: '🚀', title: 'Implementering', duration: '3–6 måneder', price: 'Prosjektbasert',
      desc: 'Fra vedtak til operativ drift. Anskaffelse, godkjenning, opplæring og oppsett.',
      items: ['Anskaffelsesrådgivning', 'SORA-søknader og Operations Manual', 'Pilotsertifisering', 'Systemintegrasjon', 'Testing og akseptanseflyging'],
    },
    {
      icon: '🔄', title: 'Drift og utvikling', duration: 'Løpende', price: 'Retainer',
      desc: 'Løpende støtte, vedlikehold og utvidelse av droneprogrammet.',
      items: ['Teknisk support', 'Firmware-oppdateringer', 'OA-fornyelse', 'Utvidelse ved nye behov', 'Kvartalsvis gjennomgang'],
    },
  ];

  return (
    <section id="veien-videre" className="scroll-mt-16 space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Veien videre med Haiko</h2>
        <p className="text-sm mt-1" style={{ color: '#555' }}>Fra analyse til operativ droneavdeling</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {phases.map((phase, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-6 space-y-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{phase.icon}</span>
              <div>
                <p className="font-display font-bold text-sm" style={{ color: '#1C0059' }}>{phase.title}</p>
                <p className="text-xs" style={{ color: '#999' }}>{phase.duration}</p>
              </div>
            </div>
            <p className="text-sm" style={{ color: '#555' }}>{phase.desc}</p>
            <ul className="space-y-1">
              {phase.items.map((item, j) => (
                <li key={j} className="text-xs flex items-start gap-2" style={{ color: '#555' }}>
                  <span className="mt-1 w-1 h-1 rounded-full bg-primary flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <p className="text-xs font-medium pt-2 border-t border-border" style={{ color: '#999' }}>{phase.price}</p>
          </div>
        ))}
      </div>
      {iksPartners.length > 0 && fireDeptName && (
        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5">
          <p className="text-sm" style={{ color: '#555' }}>
            <strong style={{ color: '#1C0059' }}>Samarbeid i {fireDeptName}:</strong> Droneflåten kan stasjoneres sentralt og betjene alle {iksPartners.length + 1} eierkommuner.
          </p>
        </div>
      )}
      <div className="rounded-2xl p-8 text-center space-y-4" style={{ backgroundColor: '#1C0059' }}>
        <h3 className="text-xl font-display font-bold text-white">Klar for neste steg?</h3>
        <p className="text-sm text-white/80">Vi gjennomgår analysen sammen og planlegger Preflight Pro for {municipalityName}.</p>
        <a href={`mailto:gunhild@haiko.no?subject=Oppfølgingsmøte droneanalyse – ${municipalityName}`}>
          <Button size="lg" className="text-white font-display font-semibold gap-2 h-12 px-8"
            style={{ background: 'linear-gradient(135deg, #FF66C4, #685BF8)' }}>
            Book møte med Haiko <ArrowRight className="w-4 h-4" />
          </Button>
        </a>
        <p className="text-xs text-white/60">Gratis og uforpliktende. 30 minutter.</p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */

// Import USE_CASE_TO_TAGS for sambruk section
import { USE_CASE_TO_TAGS } from "@/lib/droneFleetEngine";

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
  const [fleetResult, setFleetResult] = useState<FleetResult | null>(null);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { software: softwareData, loading: swLoading } = useSoftwareStack();

  // Intersection observer for sticky nav
  useEffect(() => {
    if (!analysis) return;
    const ids = navSections.map(s => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) { setActiveSection(entry.target.id); break; }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [analysis]);

  // Fetch fleet via new engine
  useEffect(() => {
    const activeDepts = departments.filter(d => d.enabled).map(d => d.name);
    if (activeDepts.length === 0) return;
    setFleetLoading(true);
    // Collect all use case names from analysis (once available) OR from department names
    const useCaseNames = analysis
      ? analysis.department_analyses.flatMap(d => d.use_cases.map(uc => uc.name))
      : activeDepts;
    fetchAndScoreFleet(useCaseNames, areaKm2 || 100, 3)
      .then(result => { setFleetResult(result); setFleetLoading(false); })
      .catch(() => setFleetLoading(false));
  }, [analysis, departments, areaKm2]);

  // Fetch AI analysis from edge function
  useEffect(() => {
    const activeDepts = departments.filter(d => d.enabled).map(d => d.name);
    if (activeDepts.length === 0) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("dmv-analyze", {
          body: {
            municipality_name: municipalityName, population, area_km2: areaKm2,
            road_km: roadKm, va_km: vaKm, buildings, terrain_type: terrainType,
            density_per_km2: densityPerKm2, departments: activeDepts, iks_partners: iksPartners,
            fire_dept_name: fireDeptName, fire_dept_type: fireDeptType,
            alarm_sentral_name: alarmSentralName, region_municipalities: regionMunicipalities,
            sector_data: sectorData, fire_stats: fireStats, bris_mission_data: brisMissionData,
            prefer_european: false,
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

  const activeDeptNames = departments.filter(d => d.enabled).map(d => d.name);

  const handleDownloadPdf = useCallback(async () => {
    if (!fleetResult || !analysis) return;
    setGeneratingPdf(true);
    try {
      const deptNames = departments.filter(d => d.enabled).map(d => d.name);
      const timeEstimates = computeTasks({
        municipalityName, population, areaKm2, roadKm, vaKm, buildings,
        selectedDepartments: deptNames,
      });

      const fleet = fleetResult.fleet;
      const allSwItems: SoftwareProduct[] = [];
      const seenIds = new Set<string>();
      fleet.forEach(d => {
        const cats = new Set<string>();
        d.matchedTags.forEach(tag => (SOFTWARE_CATEGORY_MAP[tag] || []).forEach(c => cats.add(c)));
        softwareData.filter(sw => cats.has(sw.category)).forEach(sw => {
          if (!seenIds.has(sw.id)) { seenIds.add(sw.id); allSwItems.push(sw); }
        });
      });
      const totalSwEur = allSwItems.reduce((s, sw) => s + (sw.price_eur_year || 0), 0);
      const totalSwNok = Math.round(totalSwEur * EUR_TO_NOK);
      const accessoriesNok = 60000;
      const regulatoryNok = fleet.length * 40000;
      const certNok = 5000;
      const trainingNok = 50000;
      const hwHasQuotes = fleet.every(d => d.product.quote_required || d.product.price_eur === null);
      const totalHwNok = fleet.reduce((s, d) => s + ((d.product.price_eur || 0) * EUR_TO_NOK), 0);

      const costLines = [
        ...fleet.map(d => ({
          label: d.product.product_name,
          value: formatNOK(d.product.price_eur, !!d.product.quote_required),
        })),
        { label: "Tilbehør/batterier est.", value: formatNOKRaw(accessoriesNok) },
        { label: "Software (årlig)", value: totalSwNok > 0 ? formatNOKRaw(totalSwNok) + "/år" : "Inkludert" },
        { label: `${fleet.length} SORA-søknader est.`, value: formatNOKRaw(regulatoryNok) },
        { label: "A2-sertifisering", value: formatNOKRaw(certNok) },
        { label: "Pilotopplæring (2 pers)", value: formatNOKRaw(trainingNok) },
      ];

      const fixedCosts = accessoriesNok + regulatoryNok + certNok + trainingNok + totalSwNok;
      const totalYear1 = hwHasQuotes
        ? `Tilbud + ${formatNOKRaw(fixedCosts)}`
        : formatNOKRaw(totalHwNok + fixedCosts);
      const annualOngoing = totalSwNok > 0 ? `${formatNOKRaw(totalSwNok)}/år + vedlikehold` : "Vedlikehold";

      const useCaseNames = analysis.department_analyses.flatMap(d => d.use_cases.map(uc => uc.name));

      const pdfData: RadarPdfData = {
        kommuneNavn: municipalityName,
        kommuneAreaKm2: areaKm2 || 100,
        kommunePopulation: population,
        selectedUseCases: useCaseNames,
        fleet: fleetResult.fleet,
        softwareStack: allSwItems,
        timeEstimates,
        costLines,
        totalYear1,
        annualOngoing,
      };

      const blob = await pdf(<RadarPdfDocument data={pdfData} />).toBlob();
      saveAs(blob, `Haiko_Radar_${municipalityName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setGeneratingPdf(false);
    }
  }, [fleetResult, analysis, municipalityName, population, areaKm2, roadKm, vaKm, buildings, departments, softwareData]);

  // Loading state
  if (loading || fleetLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="max-w-[960px] mx-auto px-6 py-16 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(255,102,196,0.1), rgba(104,91,248,0.1))' }}>
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold" style={{ color: '#1C0059' }}>Analyserer mulighetsrom</h1>
              <p className="text-sm" style={{ color: '#999' }}>AI vurderer droneoperasjoner for {municipalityName}...</p>
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-4 max-w-md" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive/60" />
          <h2 className="text-lg font-display font-bold" style={{ color: '#1C0059' }}>Analyse feilet</h2>
          <p className="text-sm" style={{ color: '#555' }}>{error}</p>
          <Button onClick={onBack} variant="outline">Tilbake</Button>
        </div>
      </div>
    );
  }

  if (!analysis || !fleetResult) return null;

  const swRec = getRecommendedSoftware(softwareData, activeDeptNames, fleetResult.fleet.length);
  const totalSoftwareCostNOK = Math.round(swRec.totalEurYear * EUR_TO_NOK);


  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      <StickyTopbar municipalityName={municipalityName} activeSection={activeSection} onBack={onBack}
        onDownloadPdf={handleDownloadPdf} generatingPdf={generatingPdf} />

      <main className="max-w-[960px] mx-auto px-6 py-10 space-y-12">
        {/* 1. Sammendrag */}
        <HeroSection municipalityName={municipalityName} analysis={analysis} departments={departments} fleetResult={fleetResult} />

        {/* 2. Flåte + software + coverage matrix + cost table */}
        <FleetSection fleetResult={fleetResult} softwareData={softwareData} analysis={analysis} />

        {/* 3. Tidsbesparelse */}
        <TimeSavingsSection
          municipalityName={municipalityName}
          population={population}
          areaKm2={areaKm2}
          roadKm={roadKm}
          vaKm={vaKm}
          buildings={buildings}
          selectedDepartments={activeDeptNames}
        />

        {/* 4. Drone Hub */}
        <DroneHubSection
          municipalityName={municipalityName}
          areaKm2={areaKm2}
          selectedDepartments={activeDeptNames}
        />

        {/* 5. Digital Tvilling */}
        <DigitalTwinSection software={softwareData} />

        {/* 6. Sambruk */}
        <SambrukSection analysis={analysis} fleetResult={fleetResult} />

        {/* 6b. Co-use IKS */}
        {iksPartners.length > 0 && (
          <CoUseSection
            municipalityName={municipalityName}
            iksPartners={iksPartners}
            fireDeptName={fireDeptName}
            population={population}
            totalFleetCostNOK={0}
            totalSoftwareCostNOK={totalSoftwareCostNOK}
          />
        )}

        {/* 7. ROI */}
        <ROISection analysis={analysis} />

        {/* 8. Regulatorisk */}
        <RegulatorySection analysis={analysis} />

        {/* 9. Veien videre */}
        <CTASection municipalityName={municipalityName} iksPartners={iksPartners} fireDeptName={fireDeptName} />

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
