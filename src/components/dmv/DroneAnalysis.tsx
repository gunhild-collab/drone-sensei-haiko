import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

/* ─── Journey / timeline box ─── */
function JourneyBox() {
  const steps = [
    { n: 1, title: "Start enkelt", desc: "A1/A3-kompetanse + enkel operasjonsmanual + grunnleggende ERP. Fly med mikrodrone (f.eks. DJI Mini 4 Pro) til dokumentasjon og opplæring." },
    { n: 2, title: "Utvid til STS/A2", desc: "STS-01-erklæring for standardiserte operasjoner. A2-sertifikat gir adgang til mer krevende VLOS-oppdrag nærmere mennesker med tyngre droner." },
    { n: 3, title: "Spesifikk kategori / BVLOS", desc: "Full SORA-vurdering, komplett operasjonsmanual og utvidet ERP. Søknad om operasjonsautorisasjon (OpAuth) fra Luftfartstilsynet." },
    { n: 4, title: "Autonome dronestasjoner og IKS", desc: "Etabler permanente dronestasjoner for autonom drift. Vurder samarbeid med nabokommuner for delte ressurser og kostnadsfordeling." },
  ];
  return (
    <InfoBox title="Typisk modningsreise for kommunal dronebruk" icon={<Milestone className="w-4 h-4" />} variant="accent">
      <div className="space-y-2 mt-1">
        {steps.map(s => (
          <div key={s.n} className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-[10px] flex-shrink-0 mt-0.5">{s.n}</div>
            <div>
              <p className="text-xs font-semibold text-foreground">{s.title}</p>
              <p className="text-[11px]">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </InfoBox>
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

/* ─── Report Sidebar ─── */
const sidebarSections = [
  { id: "leseguide", label: "📖 Leseguide", icon: BookOpen },
  { id: "kommuneprofil", label: "🏘️ Kommuneprofil", icon: MapPin },
  { id: "nokkeltall", label: "📊 Nøkkeltall", icon: Clock },
  { id: "ordliste", label: "📚 Ordliste & veiledning", icon: BookOpen },
  { id: "modningsreise", label: "🗺️ Modningsreise", icon: Milestone },
  { id: "operasjoner", label: "⚙️ Operasjoner", icon: Shield },
  { id: "droneflate", label: "🚁 Droneflåte", icon: Plane },
  { id: "sertifisering", label: "🎓 Sertifisering", icon: GraduationCap },
  { id: "iks", label: "🤝 IKS-samarbeid", icon: Flame },
  { id: "implementering", label: "📅 Implementering", icon: ArrowRight },
];

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

export default function DroneAnalysis({
  municipalityName, population, areaKm2, roadKm, vaKm, buildings,
  terrainType, densityPerKm2, departments, iksPartners,
  fireDeptName, fireDeptType, alarmSentralName, regionMunicipalities,
  sectorData, fireStats, onContinue, onBack
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
  }, [municipalityName, population, areaKm2, roadKm, vaKm, buildings, terrainType, densityPerKm2, departments, iksPartners, fireDeptName, fireDeptType, alarmSentralName, regionMunicipalities, sectorData, fireStats]);

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

  const priorityColor = (p: string) => {
    if (p === "Høy") return "bg-destructive/10 text-destructive border-destructive/20";
    if (p === "Medium") return "bg-chart-3/10 text-chart-3 border-chart-3/20";
    return "bg-muted text-muted-foreground border-border";
  };

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

          {/* Municipality profile summary */}
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

          {/* Journey / timeline */}
          <div id="modningsreise" className="mb-6 scroll-mt-6">
            <JourneyBox />
          </div>

          {/* Department breakdown */}
          <div id="operasjoner" className="space-y-3 mb-6 scroll-mt-6">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> ⚙️ Operasjoner per avdeling
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
                          <p className="text-xs text-muted-foreground">{dept.use_cases.length} operasjoner · {dept.total_annual_hours} timer/år (estimat)</p>
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
                                {friendlyLabel(uc.operation_type)}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] gap-1">
                                {friendlyCategory(uc.easa_category)}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <GraduationCap className="w-2.5 h-2.5" /> {friendlyLabel(uc.pilot_certification)}
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
          <div id="droneflate" className="space-y-3 mb-6 scroll-mt-6">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" /> 🚁 Anbefalt droneflåte
            </h2>
            <div className="space-y-3">
              {analysis.drone_fleet.map((drone, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 pb-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{drone.recommended_model}</p>
                        <p className="text-xs text-muted-foreground">{drone.drone_type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">×{drone.quantity}</Badge>
                        <p className="text-sm font-semibold text-primary">
                          {drone.estimated_cost_nok.toLocaleString('nb-NO')} NOK
                        </p>
                      </div>
                    </div>

                    {(drone as any).why_chosen && (
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                        <p className="text-xs font-medium text-primary mb-1">Hvorfor denne dronen?</p>
                        <p className="text-xs text-foreground">{(drone as any).why_chosen}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {(drone as any).autonomous && <Badge variant="outline" className="text-[10px]">🤖 Autonom dronestasjon</Badge>}
                      {(drone as any).needs_thermal && <Badge variant="outline" className="text-[10px]">🌡️ Termisk kamera</Badge>}
                      {(drone as any).needs_rtk && <Badge variant="outline" className="text-[10px]">📍 RTK-presisjon</Badge>}
                      {(drone as any).needs_lidar && <Badge variant="outline" className="text-[10px]">📐 LiDAR</Badge>}
                      {(drone as any).max_flight_time_min && <Badge variant="outline" className="text-[10px]">⏱️ {(drone as any).max_flight_time_min} min flytid</Badge>}
                    </div>

                    {drone.key_features && drone.key_features.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {drone.key_features.map((f, fi) => (
                          <Badge key={fi} variant="secondary" className="text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Deles mellom avdelinger</p>
                      <div className="flex flex-wrap gap-1">
                        {drone.shared_between.map(dept => (
                          <Badge key={dept} variant="outline" className="text-[10px]">{dept}</Badge>
                        ))}
                      </div>
                    </div>

                    {(drone as any).covers_use_cases && (drone as any).covers_use_cases.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Dekker bruksområder</p>
                        <div className="flex flex-wrap gap-1">
                          {(drone as any).covers_use_cases.map((uc: string) => (
                            <Badge key={uc} variant="secondary" className="text-[10px]">{uc}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
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

          {/* Implementation phases */}
          {analysis.implementation_priority.length > 0 && (
            <div id="implementering" className="space-y-3 mb-6 scroll-mt-6">
              <h2 className="text-lg font-display font-semibold">📅 Foreslått implementeringsplan</h2>
              <p className="text-xs text-muted-foreground -mt-1">Fasene nedenfor er strategiske anbefalinger og bør tilpasses kommunens egne forutsetninger og budsjett.</p>
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
    </div>
  );
}
