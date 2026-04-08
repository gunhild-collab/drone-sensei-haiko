import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLayoutSidebar } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KommuneCombobox } from "@/components/KommuneCombobox";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { dimensions } from "@/data/dmvData";
import { useAssessment } from "@/hooks/useAssessment";
import { useMunicipalityProfile } from "@/hooks/useMunicipalityProfile";
import { evaluationApi, KostraData } from "@/lib/evaluationApi";
import { getSuggestedDepartments } from "@/data/departmentTemplates";
import { findFireDepartment, findAlarmSentral, getPartnerMunicipalities, get110RegionMunicipalities, findIKSPartners, getIKSPartnerMunicipalities } from "@/data/iksData";
import { calculateIksRange, MUNICIPALITY_GEO } from "@/data/municipalityCoordinates";
import DepartmentEditor, { type ActiveDepartment } from "@/components/dmv/DepartmentEditor";
import DroneAnalysis from "@/components/dmv/DroneAnalysis";
import UseCaseSelector from "@/components/dmv/UseCaseSelector";
import ExistingDronesSection from "@/components/dmv/ExistingDronesSection";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Target, Shield, Cpu,
  Building2, Network, MapPin, Users, Route, Droplets, Plane,
  TreePine, AlertTriangle, Flame, Loader2, Mountain, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const dimensionIcons = [Target, Shield, Cpu, Building2, Network];

type Step = "intro" | "data" | "analysis" | "questions";

export default function Assessment() {
  const navigate = useNavigate();
  const { requestCollapse, requestExpand } = useLayoutSidebar();
  const {
    answers, setAnswer, currentDimension, setCurrentDimension,
    municipalityName, setMunicipalityName, assessorName, setAssessorName,
    totalScore, maturityLevel, dimensionScores, progress, totalAnswered, totalQuestions,
  } = useAssessment();

  const [step, setStep] = useState<Step>("intro");

  // Auto-collapse Layout sidebar when report is shown, expand when leaving
  useEffect(() => {
    if (step === "analysis") {
      requestCollapse();
    } else {
      requestExpand();
    }
  }, [step, requestCollapse, requestExpand]);
  const [kostra, setKostra] = useState<KostraData | null>(null);
  const [kostraLoading, setKostraLoading] = useState(false);
  const [departments, setDepartments] = useState<ActiveDepartment[]>([]);
  const [overrides, setOverrides] = useState({
    population: null as number | null,
    roadKm: null as number | null,
    buildings: null as number | null,
    vaKm: null as number | null,
  });
  const [geoData, setGeoData] = useState({
    areaKm2: null as number | null,
    coastlineKm: null as number | null,
    terrainType: "" as string,
    settlementPattern: "" as string,
  });
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [existingDrones, setExistingDrones] = useState<{ id: string; model: string; department: string; useCase: string }[]>([]);
  const topRef = useRef<HTMLDivElement>(null);
  const { profile, loading: profileLoading, populateFromKostra, save: saveProfile } = useMunicipalityProfile(municipalityName);

  const dim = dimensions[currentDimension];
  const Icon = dimensionIcons[currentDimension];
  const currentDimScore = dimensionScores[currentDimension];
  const allCurrentAnswered = dim.questions.every(q => answers[q.id] !== undefined);

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  // IKS / brannvesen data — use full fire department lookup, not just IKS
  const fireDept = findFireDepartment(municipalityName);
  const alarmSentral = findAlarmSentral(municipalityName);
  const iksPartnership = findIKSPartners(municipalityName); // legacy — only IKS-type
  const fireDeptPartners = fireDept ? fireDept.municipalities.filter(m => m.toLowerCase() !== municipalityName.toLowerCase()) : [];
  const regionMunicipalities = get110RegionMunicipalities(municipalityName);

  // Fetch KOSTRA and initialize departments when moving to data step
  // Auto-classify terrain and settlement from geodata
  const classifyTerrain = (areaKm2: number | null, pop: number | null, lat: number | null): { terrain: string; settlement: string } => {
    const area = areaKm2 || 500;
    const population = pop || 5000;
    const density = population / area;
    const latitude = lat || 60;

    let terrain = "blandet";
    if (area > 1500 && latitude > 64) terrain = "fjell";
    else if (area > 1000 || latitude > 66) terrain = "fjell";
    else if (area > 400 && density < 30) terrain = "kupert";
    else if (density > 200) terrain = "flatland";
    else if (area < 200 && density > 50) terrain = "flatland";

    let settlement = "blandet";
    if (density > 150) settlement = "tett";
    else if (density < 15) settlement = "spredt";

    return { terrain, settlement };
  };

  const handleStartData = async () => {
    setStep("data");
    setKostraLoading(true);
    try {
      const data = await evaluationApi.fetchKostraData(municipalityName);
      setKostra(data);
      if (data.success) {
        const pop = data.indicators?.find(i => i.id === "population")?.value ?? null;
        setOverrides({
          population: pop,
          roadKm: data.drone_relevance?.estimated_road_km ?? null,
          buildings: data.drone_relevance?.estimated_buildings ?? null,
          vaKm: data.drone_relevance?.estimated_va_km ?? null,
        });
        const geoLookup = MUNICIPALITY_GEO[municipalityName];
        const { terrain, settlement } = classifyTerrain(data.area_km2, pop, geoLookup?.lat ?? null);
        setGeoData({
          areaKm2: data.area_km2 ?? null,
          coastlineKm: null,
          terrainType: terrain,
          settlementPattern: settlement,
        });
        const suggested = getSuggestedDepartments(pop || 8000);
        setDepartments(suggested.map((d, i) => ({
          id: d.id, name: d.name, icon: d.icon, description: d.description, enabled: true, order: i,
        })));
        populateFromKostra(data);
      }
    } catch {
      const suggested = getSuggestedDepartments(8000);
      setDepartments(suggested.map((d, i) => ({
        id: d.id, name: d.name, icon: d.icon, description: d.description, enabled: true, order: i,
      })));
    } finally {
      setKostraLoading(false);
    }
  };

  const updateField = (field: keyof typeof overrides, value: string) => {
    const num = value === "" ? null : parseInt(value);
    setOverrides(prev => ({ ...prev, [field]: isNaN(num as number) ? null : num }));
  };

  const handleFinish = async () => {
    // Save profile to DB before navigating
    await saveProfile();
    sessionStorage.setItem("dmv-answers", JSON.stringify(answers));
    sessionStorage.setItem("dmv-municipality", municipalityName);
    sessionStorage.setItem("dmv-assessor", assessorName);
    sessionStorage.setItem("dmv-kostra-overrides", JSON.stringify(overrides));
    sessionStorage.setItem("dmv-departments", JSON.stringify(departments.filter(d => d.enabled)));
    sessionStorage.setItem("dmv-municipality-profile", JSON.stringify(profile));
    navigate("/resultater");
  };

  // ---- STEP 1: INTRO ----
  if (step === "intro") {
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-display">Start ny analyse</CardTitle>
              <CardDescription>Velg kommune. Vi henter data og bygger analysen automatisk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Kommune</Label>
                <KommuneCombobox value={municipalityName} onValueChange={setMunicipalityName} />
                <p className="text-[12px]" style={{ color: '#6b7280' }}>Alle 357 norske kommuner er tilgjengelige</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessor">Vurderer</Label>
                <Input
                  id="assessor"
                  placeholder="Ditt navn"
                  value={assessorName}
                  onChange={e => setAssessorName(e.target.value)}
                />
              </div>
              <Button
                className="w-full gap-2 font-display font-semibold"
                size="lg"
                disabled={!municipalityName.trim()}
                onClick={handleStartData}
              >
                Neste: Se kommunedata <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ---- STEP 2: DATA + DEPARTMENTS ----
  if (step === "data") {
    const fields = [
      { key: "population" as const, label: "Folketall", icon: Users, unit: "innbyggere" },
      { key: "roadKm" as const, label: "Kommunale veier", icon: Route, unit: "km" },
      { key: "buildings" as const, label: "Bygninger", icon: Building2, unit: "stk" },
      { key: "vaKm" as const, label: "VA-ledningsnett", icon: Droplets, unit: "km" },
    ];

    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-display font-bold">{municipalityName}</h1>
              <p className="text-sm text-muted-foreground">Bekreft kommunedata og avdelinger</p>
            </div>
          </div>

          {kostraLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Henter data fra SSB/KOSTRA...
              </div>
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <>
              {/* Source badge */}
              <div className="flex items-center gap-2 flex-wrap">
                {kostra?.success && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Kilde: {kostra.source === "ssb" ? "SSB (live)" : "Estimat"}
                  </Badge>
                )}
                {kostra?.drone_relevance?.controlled_airspace && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <Plane className="w-3 h-3" /> {kostra.drone_relevance.controlled_airspace.type}
                  </Badge>
                )}
                {fireDept && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Flame className="w-3 h-3" /> {fireDept.name} ({fireDept.type})
                  </Badge>
                )}
                {alarmSentral && (
                  <Badge variant="outline" className="text-xs gap-1">
                    110: {alarmSentral.name}
                  </Badge>
                )}
              </div>

              {/* Key metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display">Nøkkeltall</CardTitle>
                  <CardDescription>Korriger gjerne om du har bedre tall.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map(({ key, label, icon: FIcon, unit }) => (
                    <div key={key} className="flex items-center gap-3">
                      <FIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Label className="w-32 text-sm">{label}</Label>
                      <Input
                        type="number"
                        value={overrides[key] ?? ""}
                        onChange={e => updateField(key, e.target.value)}
                        className="max-w-[160px]"
                      />
                      <span className="text-xs text-muted-foreground">{unit}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Fire department info */}
              {fireDept && (
                <Card>
                  <CardContent className="pt-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-accent" />
                      <p className="font-display font-semibold text-sm">
                        Brannvesen: {fireDept.name}
                        <Badge variant="outline" className="ml-2 text-[10px]">{fireDept.type}</Badge>
                      </p>
                    </div>
                    {fireDeptPartners.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {fireDeptPartners.map(m => (
                          <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {fireDept.type === 'IKS'
                        ? `Brannvesenet deler ressurser med ${fireDeptPartners.length} nabokommuner.`
                        : fireDept.type === 'KF'
                        ? 'Kommunalt foretak — egen brannberedskap.'
                        : 'Enkeltkommunalt brannvesen.'}
                    </p>
                    {fireDept.type === 'IKS' && (() => {
                      const rangeResult = calculateIksRange(fireDept.municipalities);
                      return (
                        <div className="space-y-2">
                          <p className="text-xs text-primary font-medium">
                            🚁 Dronestasjonen kan stasjoneres sentralt og betjene alle eierkommuner i IKS-et.
                          </p>
                          {rangeResult && (
                            <div className="bg-secondary/60 rounded-lg p-3 space-y-2">
                              <p className="text-xs font-semibold flex items-center gap-1.5">
                                <Route className="w-3.5 h-3.5 text-primary" />
                                Minimumskrav til rekkevidde: <span className="text-primary">{rangeResult.maxRangeKm} km</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Basert på stasjon i {rangeResult.centerMunicipality} (geografisk sentrum).
                              </p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {rangeResult.distances.map(d => (
                                  <div key={d.municipality} className="flex items-center justify-between text-[11px]">
                                    <span className={d.municipality === rangeResult.centerMunicipality ? 'font-semibold' : ''}>
                                      {d.municipality}
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">
                                      {d.distToEdge} km
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {alarmSentral && (
                      <p className="text-xs text-muted-foreground">
                        110-sentral: {alarmSentral.name} ({alarmSentral.region}) — dekker {regionMunicipalities.length} kommuner i regionen.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Departments */}
              <DepartmentEditor
                departments={departments}
                onUpdate={setDepartments}
                population={overrides.population || 8000}
              />

              {/* Geography — auto-classified, display-only */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display">Geografi</CardTitle>
                  <CardDescription>Automatisk klassifisert basert på areal, befolkningstetthet og breddegrad</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Areal</p>
                      <p className="text-sm font-semibold">{geoData.areaKm2?.toLocaleString("nb-NO") ?? "–"} km²</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Terrengtype</p>
                      <Badge variant="outline" className="capitalize">{geoData.terrainType || "–"}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Bebyggelse</p>
                      <Badge variant="outline" className="capitalize">{geoData.settlementPattern || "–"}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Tetthet</p>
                      <p className="text-sm font-semibold">
                        {geoData.areaKm2 && overrides.population
                          ? `${Math.round(overrides.population / geoData.areaKm2)} innb/km²`
                          : "–"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Existing drones */}
              <ExistingDronesSection
                departments={departments}
                value={existingDrones}
                onChange={setExistingDrones}
              />

              {/* Use cases */}
              <UseCaseSelector
                departments={departments}
                selectedUseCases={selectedUseCases}
                onSelectionChange={setSelectedUseCases}
              />

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("intro")}>Tilbake</Button>
                <Button
                  onClick={() => setStep("analysis")}
                  disabled={departments.filter(d => d.enabled).length === 0}
                  className="gap-2 font-display font-semibold"
                >
                  Analyser mulighetsrom <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  // ---- STEP 3: AI ANALYSIS ----
  if (step === "analysis") {
    return (
      <DroneAnalysis
        municipalityName={municipalityName}
        population={overrides.population || 8000}
        areaKm2={kostra?.area_km2 || null}
        roadKm={overrides.roadKm}
        vaKm={overrides.vaKm}
        buildings={overrides.buildings}
        terrainType={kostra?.drone_relevance?.urban_rural || "Ukjent"}
        densityPerKm2={kostra?.drone_relevance?.population_density || 10}
        departments={departments}
        iksPartners={fireDeptPartners}
        fireDeptName={fireDept?.name || null}
        fireDeptType={fireDept?.type || null}
        alarmSentralName={alarmSentral?.name || null}
        regionMunicipalities={regionMunicipalities}
        sectorData={kostra?.sector_data || []}
        fireStats={kostra?.fire_stats || null}
        brisMissionData={profile.risk_profile.bris_mission_data || null}
        onContinue={() => setStep("questions")}
        onBack={() => setStep("data")}
      />
    );
  }

  // ---- STEP 4: DMV QUESTIONS (optional deep dive) ----
  return (
    <div ref={topRef} className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{municipalityName} · Fordypet vurdering</p>
          <h1 className="text-2xl font-display font-bold">DMV-modenhetsvurdering</h1>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          {totalAnswered} / {totalQuestions} besvart
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Dimension tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dimensions.map((d, i) => {
          const DIcon = dimensionIcons[i];
          const ds = dimensionScores[i];
          const isComplete = ds.answeredCount === d.questions.length;
          return (
            <button
              key={d.id}
              onClick={() => setCurrentDimension(i)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
                currentDimension === i
                  ? "bg-primary text-primary-foreground border-primary"
                  : isComplete
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30"
              )}
            >
              {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <DIcon className="w-4 h-4" />}
              <span className="hidden sm:inline">{d.name}</span>
              <span className="sm:hidden">{d.id}</span>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline" size="sm"
          onClick={() => {
            if (currentDimension === 0) { setStep("analysis"); return; }
            setCurrentDimension(currentDimension - 1); scrollToTop();
          }}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> {currentDimension === 0 ? "Tilbake til analyse" : "Forrige"}
        </Button>
        {currentDimension < dimensions.length - 1 ? (
          <Button size="sm" onClick={() => { setCurrentDimension(currentDimension + 1); scrollToTop(); }} disabled={!allCurrentAnswered} className="gap-2">
            Neste <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleFinish} disabled={!allCurrentAnswered} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            Se resultater <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={dim.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-display font-semibold">{dim.name}</h2>
              <p className="text-sm text-muted-foreground">{dim.weight * 100}% vekting · {dim.questions.length} spørsmål</p>
            </div>
          </div>

          {dim.questions.map((q, qi) => (
            <Card key={q.id} className={cn("transition-all", answers[q.id] !== undefined && "border-accent/30 bg-accent/5")}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">{qi + 1}</span>
                  <div>
                    <p className="font-medium text-sm">{q.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">Metode: {q.method}</p>
                  </div>
                </div>
                <RadioGroup value={answers[q.id]?.toString()} onValueChange={val => setAnswer(q.id, parseInt(val))} className="grid gap-2">
                  {q.levels.map((level, li) => (
                    <label key={li} className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                      answers[q.id] === li ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    )}>
                      <RadioGroupItem value={li.toString()} />
                      <span className="flex-shrink-0 w-5 h-5 rounded text-xs font-semibold flex items-center justify-center bg-muted text-muted-foreground">{li}</span>
                      <span>{level}</span>
                    </label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Bottom nav */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => {
          if (currentDimension === 0) { setStep("analysis"); return; }
          setCurrentDimension(Math.max(0, currentDimension - 1)); scrollToTop();
        }} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> {currentDimension === 0 ? "Tilbake" : "Forrige"}
        </Button>
        {currentDimension < dimensions.length - 1 ? (
          <Button onClick={() => { setCurrentDimension(currentDimension + 1); scrollToTop(); }} disabled={!allCurrentAnswered} className="gap-2">
            Neste <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={!allCurrentAnswered} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            Se resultater <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
