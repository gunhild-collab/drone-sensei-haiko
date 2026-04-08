import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dimensions, calculateWeightedScore, calculateDimensionScore, getMaturityLevel, getRecommendedUseCases, maturityLevels, useCases } from "@/data/dmvData";
import { evaluationApi, KostraData, EasaEvaluation, PlatformRecommendation, SoraAssessment } from "@/lib/evaluationApi";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ClipboardCheck, Loader2, AlertTriangle, Shield, Cpu, MapPin, ExternalLink, Target, Clock, Users, Plane, DollarSign, Building2, TreePine } from "lucide-react";

export default function Results() {
  const answers: Record<string, number> = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("dmv-answers") || "{}"); } catch { return {}; }
  }, []);
  const municipalityName = sessionStorage.getItem("dmv-municipality") || "Ukjent kommune";
  const assessorName = sessionStorage.getItem("dmv-assessor") || "";
  const kostraOverrides = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("dmv-kostra-overrides") || "null"); } catch { return null; }
  }, []);
  const totalScore = calculateWeightedScore(answers);
  const level = getMaturityLevel(totalScore);
  const recommendedUseCases = getRecommendedUseCases(totalScore);
  const hasAnswers = Object.keys(answers).length > 0;

  const [kostra, setKostra] = useState<KostraData | null>(null);
  const [easa, setEasa] = useState<EasaEvaluation | null>(null);
  const [platforms, setPlatforms] = useState<PlatformRecommendation | null>(null);
  const [sora, setSora] = useState<SoraAssessment | null>(null);
  const [loading, setLoading] = useState({ kostra: false, easa: false, platforms: false, sora: false });

  useEffect(() => {
    if (!hasAnswers) return;
    const ucIds = recommendedUseCases.map(uc => uc.id);

    setLoading({ kostra: true, easa: true, platforms: true, sora: true });

    evaluationApi.fetchKostraData(municipalityName).then(d => {
      setKostra(d);
      setLoading(prev => ({ ...prev, kostra: false }));

      // Once we have kostra data, fetch platforms with municipal data
      const roadInd = d.indicators?.find(i => i.id === "road_km");
      const vaTotal = (d.va_network?.water_pipe_km ?? 0) + (d.va_network?.sewage_pipe_km ?? 0);
      const municipalData = {
        road_km: kostraOverrides?.roadKm ?? roadInd?.value ?? null,
        buildings: kostraOverrides?.buildings ?? d.buildings?.total ?? null,
        va_km: kostraOverrides?.vaKm ?? (vaTotal || null),
        area_km2: d.area_km2 || null,
      };

      evaluationApi.recommendPlatforms({
        maturity_level: level.level,
        use_case_ids: ucIds,
        municipal_data: municipalData,
        area_km2: d.area_km2,
      }).then(pd => {
        setPlatforms(pd);
        setLoading(prev => ({ ...prev, platforms: false }));

        if (pd.success && pd.platforms && pd.platforms.length > 0) {
          const popDensity = d.drone_relevance?.population_density || undefined;
          const isControlled = !!d.drone_relevance?.controlled_airspace;
          evaluationApi.calculateSora({
            platform_ids: pd.platforms.slice(0, 5).map(p => p.id),
            municipality_name: municipalityName,
            population_density: popDensity ?? undefined,
            use_case_ids: ucIds,
            is_controlled_airspace: isControlled,
          }).then(s => {
            setSora(s);
            setLoading(prev => ({ ...prev, sora: false }));
          });
        } else {
          setLoading(prev => ({ ...prev, sora: false }));
        }
      });
    });

    evaluationApi.evaluateEasa({
      answers, municipality_name: municipalityName, maturity_level: level.level, use_case_ids: ucIds,
    }).then(d => {
      setEasa(d);
      setLoading(prev => ({ ...prev, easa: false }));
    });
  }, [hasAnswers]);

  const radarData = dimensions.map(d => ({
    dimension: d.name.split(" ")[0],
    fullName: d.name,
    score: Math.round(calculateDimensionScore(answers, d.id)),
    fullMark: 100,
  }));

  const dimDetails = dimensions.map(d => {
    const score = calculateDimensionScore(answers, d.id);
    const answeredCount = d.questions.filter(q => answers[q.id] !== undefined).length;
    return { ...d, score: Math.round(score), answeredCount };
  });

  if (!hasAnswers) {
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto text-center space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <h1 className="text-2xl font-display font-bold mt-4">Ingen resultater ennå</h1>
          <p className="text-muted-foreground">Gjennomfør en vurdering for å se resultater her.</p>
          <Link to="/vurdering">
            <Button className="mt-4 gap-2">Start vurdering <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const ucMap = Object.fromEntries(useCases.map(uc => [uc.id, uc]));

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
          <div>
            <p className="text-sm text-muted-foreground">{municipalityName}{assessorName && ` · ${assessorName}`}</p>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Resultater</h1>
          </div>
          <Badge variant="outline" className="self-start text-base px-4 py-2 font-display">
            Nivå {level.level}: {level.name}
          </Badge>
        </div>
      </motion.div>

      {/* Score + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader><CardTitle>Totalskår</CardTitle><CardDescription>Vektet gjennomsnitt av alle dimensjoner</CardDescription></CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                  <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--primary))" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(totalScore / 100) * 440} 440`} />
                </svg>
                <div className="text-center">
                  <span className="text-4xl font-display font-bold">{totalScore}</span>
                  <span className="text-sm text-muted-foreground block">/ 100</span>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground max-w-xs">{level.description}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader><CardTitle>Dimensjonsprofil</CardTitle><CardDescription>Radardiagram over alle fem dimensjoner</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                  <Radar name="Skår" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabbed sections */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7">
          <TabsTrigger value="profile" className="gap-1"><MapPin className="w-3 h-3" /> Profil</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensjoner</TabsTrigger>
          <TabsTrigger value="easa" className="gap-1"><Shield className="w-3 h-3" /> EASA</TabsTrigger>
          <TabsTrigger value="sora" className="gap-1"><Target className="w-3 h-3" /> SORA</TabsTrigger>
          <TabsTrigger value="platforms" className="gap-1"><Cpu className="w-3 h-3" /> Droner</TabsTrigger>
          <TabsTrigger value="consolidation" className="gap-1"><Users className="w-3 h-3" /> Deling</TabsTrigger>
          <TabsTrigger value="cost" className="gap-1"><DollarSign className="w-3 h-3" /> Kostnad</TabsTrigger>
        </TabsList>

        {/* Municipality Profile tab */}
        <TabsContent value="profile" className="space-y-4">
          {loading.kostra ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Henter kommunedata...</p></CardContent></Card>
          ) : kostra?.success ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5" /> Kommuneprofil: {municipalityName}</CardTitle>
                  <CardDescription>
                    Kilde: {kostra.source === 'ssb' ? 'Statistisk sentralbyrå (SSB)' : 'Estimert'}
                    {kostra.drone_relevance?.urban_rural && ` · ${kostra.drone_relevance.urban_rural}`}
                    {kostra.drone_relevance?.centrality_index && ` · Sentralitetsindeks ${kostra.drone_relevance.centrality_index}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {kostra.indicators?.map(ind => (
                      <div key={ind.id} className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">{ind.name}</p>
                        <p className="text-lg font-display font-bold">{ind.value?.toLocaleString('nb-NO')}</p>
                        <p className="text-xs text-muted-foreground">{ind.unit}{ind.year ? ` (${ind.year})` : ''}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Airspace & protected areas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plane className="w-4 h-4" /> Luftrom</CardTitle></CardHeader>
                  <CardContent>
                    {kostra.drone_relevance?.controlled_airspace ? (
                      <div className="space-y-2">
                        <Badge variant="destructive" className="text-xs">{kostra.drone_relevance.controlled_airspace.type}</Badge>
                        <p className="text-sm">{kostra.drone_relevance.controlled_airspace.airport}</p>
                        <p className="text-xs text-muted-foreground">Radius: {kostra.drone_relevance.controlled_airspace.radius_km} km — Krever ATC-klarering</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Ingen kontrollert luftrom (CTR/ATZ) identifisert i kommunen</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TreePine className="w-4 h-4" /> Verneområder</CardTitle></CardHeader>
                  <CardContent>
                    {kostra.drone_relevance?.protected_areas && kostra.drone_relevance.protected_areas.length > 0 ? (
                      <div className="space-y-1">
                        {kostra.drone_relevance.protected_areas.map((a, i) => (
                          <Badge key={i} variant="secondary" className="text-xs mr-1">{a}</Badge>
                        ))}
                        <p className="text-xs text-muted-foreground mt-2">Restriksjoner kan gjelde for droneflygning</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Ingen kjente verneområder i nærheten</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Active services */}
              {kostra.services && (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Kommunale tjenester</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {kostra.services.active_services.map(s => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{kostra.services.departments.length} avdelinger med potensielle dronebruksområder</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-8 text-center"><AlertTriangle className="w-8 h-8 mx-auto text-destructive/50" /><p className="mt-2 text-sm text-muted-foreground">Kunne ikke hente kommunedata: {kostra?.error}</p></CardContent></Card>
          )}
        </TabsContent>

        {/* Dimensions tab */}
        <TabsContent value="dimensions" className="space-y-3">
          {dimDetails.map(d => (
            <Card key={d.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">{d.id}</span>
                    <h3 className="font-medium text-sm">{d.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-display font-bold">{d.score}%</span>
                    <p className="text-xs text-muted-foreground">{d.answeredCount}/{d.questions.length} besvart</p>
                  </div>
                </div>
                <Progress value={d.score} className="h-2" />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* EASA tab */}
        <TabsContent value="easa" className="space-y-4">
          {loading.easa ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Evaluerer regulatorisk modenhet...</p></CardContent></Card>
          ) : easa?.success && easa.evaluation ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Regulatorisk modenhet</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                          <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--accent))" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(easa.evaluation.regulatory_maturity_percent / 100) * 201} 201`} />
                        </svg>
                        <span className="text-lg font-display font-bold">{easa.evaluation.regulatory_maturity_percent}%</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Tillatte kategorier:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {easa.evaluation.allowed_categories.map(cat => (
                            <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Påkrevde sertifiseringer</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {easa.evaluation.required_certifications.map(cert => (
                        <Badge key={cert} variant="outline" className="text-xs">{cert}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              {easa.evaluation.gaps.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Regulatoriske gap</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {easa.evaluation.gaps.map((gap, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <Badge variant={gap.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs flex-shrink-0">
                            {gap.severity === 'critical' ? 'Kritisk' : gap.severity === 'high' ? 'Høy' : 'Middels'}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{gap.area}</p>
                            <p className="text-xs text-muted-foreground">{gap.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle className="text-lg">Anbefalinger</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {easa.evaluation.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{i + 1}</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-8 text-center"><AlertTriangle className="w-8 h-8 mx-auto text-destructive/50" /><p className="mt-2 text-sm text-muted-foreground">Kunne ikke evaluere EASA-regler: {easa?.error}</p></CardContent></Card>
          )}
        </TabsContent>

        {/* SORA tab */}
        <TabsContent value="sora" className="space-y-4">
          {loading.sora ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Beregner SORA risikovurdering...</p></CardContent></Card>
          ) : sora?.success && sora.assessments ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5" /> SORA Risikovurdering</CardTitle>
                  <CardDescription>SORA 2.5 – Krysssjekket mot Luftfartstilsynet og EASA befolkningstetthetsdata</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Befolkningskategori</p>
                      <p className="font-display font-bold">
                        {sora.population_category === 'sparsely_populated' ? 'Tynt befolket' : sora.population_category === 'populated' ? 'Befolket' : 'Tett befolket'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Operasjonshøyde</p>
                      <p className="font-display font-bold">{sora.scenario?.altitude_m || 120} m</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Operasjonstype</p>
                      <p className="font-display font-bold">{sora.scenario?.is_bvlos ? 'BVLOS' : 'VLOS'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {sora.assessments.map((a) => (
                <Card key={a.platform_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{a.platform_name}</CardTitle>
                      <div className="flex gap-2">
                        {a.c_class && <Badge variant="outline" className="text-xs">{a.c_class}</Badge>}
                        <Badge variant={a.sora.needs_sora_application ? 'destructive' : a.sora.needs_sts ? 'secondary' : 'default'} className="text-xs">
                          {a.sora.needs_sora_application ? 'Krever SORA' : a.sora.needs_sts ? 'STS' : 'Åpen'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">GRC (Final)</p>
                        <p className="text-2xl font-display font-bold">{a.sora.final_grc}</p>
                        <p className="text-xs text-muted-foreground">Intrinsic: {a.sora.intrinsic_grc}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">ARC (Residual)</p>
                        <p className="text-2xl font-display font-bold">{a.sora.residual_arc}</p>
                        <p className="text-xs text-muted-foreground">Initial: {a.sora.initial_arc}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">SAIL</p>
                        <p className="text-2xl font-display font-bold">{typeof a.sora.sail === 'number' ? `SAIL ${a.sora.sail}` : 'N/A'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">TMPR</p>
                        <p className="text-2xl font-display font-bold">{a.sora.tmpr.level}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 text-sm">
                      <p className="font-medium text-xs text-muted-foreground mb-1">Taktisk mitigering</p>
                      <p className="text-sm">{a.sora.tmpr.description_no}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-sm ${a.sora.needs_sora_application ? 'bg-destructive/10 border border-destructive/30' : 'bg-accent/10 border border-accent/30'}`}>
                      <p className="font-medium">{a.sora.recommendation_no}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {sora.references && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Kilder</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <a href={sora.references.url_caa} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">Luftfartstilsynet <ExternalLink className="w-3 h-3" /></a>
                    <a href={sora.references.url_easa_map} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">EASA befolkningstetthetsdata <ExternalLink className="w-3 h-3" /></a>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-8 text-center"><AlertTriangle className="w-8 h-8 mx-auto text-destructive/50" /><p className="mt-2 text-sm text-muted-foreground">Kunne ikke beregne SORA: {sora?.error}</p></CardContent></Card>
          )}
        </TabsContent>

        {/* Platforms tab */}
        <TabsContent value="platforms" className="space-y-4">
          {loading.platforms ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
          ) : platforms?.success && platforms.platforms ? (
            <>
              <p className="text-sm text-muted-foreground">{platforms.total_available} plattformer vurdert · Topp {platforms.platforms.length} anbefalinger</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {platforms.platforms.map((p, i) => (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-muted-foreground">{p.manufacturer}</p>
                          <h3 className="font-medium text-sm">{p.model}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-display">{p.match_score}%</Badge>
                          {i < 3 && <Badge className="text-xs">Topp {i + 1}</Badge>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-3">
                        {p.c_class && <div>C-klasse: <span className="font-medium text-foreground">{p.c_class}</span></div>}
                        {p.max_flight_time_min && <div>Flytid: <span className="font-medium text-foreground">{p.max_flight_time_min} min</span></div>}
                        {p.max_takeoff_weight_kg && <div>Vekt: <span className="font-medium text-foreground">{p.max_takeoff_weight_kg} kg</span></div>}
                        {p.easa_category && <div>Kategori: <span className="font-medium text-foreground">{p.easa_category}</span></div>}
                      </div>
                      {p.sensor_types && p.sensor_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.sensor_types.map(s => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}
                      {p.match_reasons.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">{p.match_reasons.slice(0, 3).join(' · ')}</div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        {p.price_nok_estimate && <span className="text-sm font-medium">~{p.price_nok_estimate.toLocaleString('nb-NO')} NOK</span>}
                        {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">Detaljer <ExternalLink className="w-3 h-3" /></a>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Flight hours per use case */}
              {platforms.flight_hours && platforms.flight_hours.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5" /> Estimerte flytimer per bruksområde</CardTitle>
                    <CardDescription>Basert på kommunens infrastrukturdata</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {platforms.flight_hours.map((fh, i) => {
                        const uc = ucMap[fh.use_case_id];
                        return (
                          <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                            <div>
                              <span className="font-medium">{uc?.name || fh.use_case_id}</span>
                              <span className="text-xs text-muted-foreground ml-2">({fh.basis})</span>
                            </div>
                            <span className="font-display font-bold">{Math.round(fh.hours)}t/år</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Department needs */}
              {platforms.department_needs && platforms.department_needs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dronebehov per avdeling</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, platforms.department_needs.length * 40)}>
                      <BarChart data={platforms.department_needs} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis dataKey="department_name" type="category" width={130} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Bar dataKey="annual_flight_hours" fill="hsl(var(--primary))" name="Timer/år" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {platforms.department_needs.map(dn => (
                        <div key={dn.department_id} className="flex justify-between p-2 rounded bg-muted/30 text-xs">
                          <span>{dn.department_name}</span>
                          <span className="font-medium">{dn.drones_needed} drone{dn.drones_needed > 1 ? 'r' : ''} · {dn.annual_flight_hours}t/år</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-8 text-center"><AlertTriangle className="w-8 h-8 mx-auto text-destructive/50" /><p className="mt-2 text-sm text-muted-foreground">Kunne ikke hente plattformanbefalinger: {platforms?.error}</p></CardContent></Card>
          )}
        </TabsContent>

        {/* Consolidation tab */}
        <TabsContent value="consolidation" className="space-y-4">
          {loading.platforms ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
          ) : platforms?.consolidation ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Konsolideringsanbefaling</CardTitle>
                  <CardDescription>Kan avdelinger dele droner for å redusere kostnad?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {platforms.consolidation.shared_groups.map((g, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${g.can_share ? 'border-accent/30 bg-accent/5' : 'border-border bg-muted/20'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-wrap gap-1">
                          {g.departments.map(d => (
                            <Badge key={d} variant={g.can_share ? "default" : "outline"} className="text-xs">{d}</Badge>
                          ))}
                        </div>
                        <span className="text-sm font-display font-bold">{g.combined_hours}t/år</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{g.reason}</p>
                      <p className="text-xs mt-1">Dronetype: {g.shared_drone_type}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {platforms.consolidation.recommendations.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Anbefalinger</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {platforms.consolidation.recommendations.map((r, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{i + 1}</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Ingen konsolideringsdata tilgjengelig</CardContent></Card>
          )}
        </TabsContent>

        {/* Cost tab */}
        <TabsContent value="cost" className="space-y-4">
          {loading.platforms ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
          ) : platforms?.program_cost ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="w-5 h-5" /> Total programkostnad</CardTitle>
                  <CardDescription>Estimert hardware + tillatelser/oppsett</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">Droner (uten konsolidering)</p>
                      <p className="text-xl font-display font-bold">{platforms.program_cost.drones_needed}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">Droner (konsolidert)</p>
                      <p className="text-xl font-display font-bold text-accent">{platforms.program_cost.consolidated_drones_needed}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">Flytimer/år totalt</p>
                      <p className="text-xl font-display font-bold">{platforms.program_cost.total_annual_flight_hours}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 text-center">
                      <p className="text-xs text-muted-foreground">Besparelse v/konsolidering</p>
                      <p className="text-xl font-display font-bold text-accent">{platforms.program_cost.savings_nok.toLocaleString('nb-NO')} NOK</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Kostnadsoppstilling</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 rounded bg-muted/30">
                      <span className="text-sm">Hardware (uten konsolidering)</span>
                      <span className="font-display font-bold">{platforms.program_cost.hardware_total.toLocaleString('nb-NO')} NOK</span>
                    </div>
                    <div className="flex justify-between p-3 rounded bg-accent/10">
                      <span className="text-sm">Hardware (konsolidert)</span>
                      <span className="font-display font-bold text-accent">{platforms.program_cost.consolidated_hardware_total.toLocaleString('nb-NO')} NOK</span>
                    </div>
                    <div className="flex justify-between p-3 rounded bg-muted/30">
                      <span className="text-sm">Tillatelser/operasjonell autorisasjon</span>
                      <span className="font-display font-bold">{platforms.program_cost.consolidated_permit_cost.toLocaleString('nb-NO')} NOK</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="text-sm font-semibold">Totalt (konsolidert)</span>
                      <span className="text-lg font-display font-bold">{(platforms.program_cost.consolidated_hardware_total + platforms.program_cost.consolidated_permit_cost).toLocaleString('nb-NO')} NOK</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">* Tillatelseskostnad beregnet med NOK 45 000 per operasjonell autorisasjon. Faktisk kostnad kan variere.</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Ingen kostnadsdata tilgjengelig</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Use cases */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold">Anbefalte bruksområder</h2>
          <Link to="/bruksomrader">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">Se alle <ArrowRight className="w-3 h-3" /></Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recommendedUseCases.slice(0, 6).map(uc => (
            <Card key={uc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <Badge variant="secondary" className="text-xs mb-2">{uc.sector}</Badge>
                <h3 className="font-medium text-sm">{uc.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{uc.description}</p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">Kompleksitet: {uc.complexity}</Badge>
                  <Badge variant="outline" className="text-xs">Min. nivå {uc.minLevel}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
