import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dimensions, calculateWeightedScore, calculateDimensionScore, getMaturityLevel, getRecommendedUseCases, maturityLevels } from "@/data/dmvData";
import { evaluationApi, KostraData, EasaEvaluation, PlatformRecommendation, SoraAssessment } from "@/lib/evaluationApi";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ClipboardCheck, Loader2, AlertTriangle, Shield, Cpu, MapPin, ExternalLink, Target } from "lucide-react";

export default function Results() {
  const answers: Record<string, number> = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("dmv-answers") || "{}"); } catch { return {}; }
  }, []);
  const municipalityName = sessionStorage.getItem("dmv-municipality") || "Ukjent kommune";
  const assessorName = sessionStorage.getItem("dmv-assessor") || "";
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
    });

    evaluationApi.evaluateEasa({
      answers, municipality_name: municipalityName, maturity_level: level.level, use_case_ids: ucIds,
    }).then(d => {
      setEasa(d);
      setLoading(prev => ({ ...prev, easa: false }));
    });

    evaluationApi.recommendPlatforms({
      maturity_level: level.level, use_case_ids: ucIds,
    }).then(d => {
      setPlatforms(d);
      setLoading(prev => ({ ...prev, platforms: false }));

      // After platforms load, calculate SORA for top recommended platforms
      if (d.success && d.platforms && d.platforms.length > 0) {
        const popDensity = kostra?.drone_relevance?.population_density || undefined;
        evaluationApi.calculateSora({
          platform_ids: d.platforms.slice(0, 5).map(p => p.id),
          municipality_name: municipalityName,
          population_density: popDensity ?? undefined,
          use_case_ids: ucIds,
        }).then(s => {
          setSora(s);
          setLoading(prev => ({ ...prev, sora: false }));
        });
      } else {
        setLoading(prev => ({ ...prev, sora: false }));
      }
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

      {/* Tabbed cross-reference sections */}
      <Tabs defaultValue="dimensions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dimensions">Dimensjoner</TabsTrigger>
          <TabsTrigger value="kostra" className="gap-1">
            <MapPin className="w-3 h-3" /> KOSTRA
            {loading.kostra && <Loader2 className="w-3 h-3 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="easa" className="gap-1">
            <Shield className="w-3 h-3" /> EASA
            {loading.easa && <Loader2 className="w-3 h-3 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="sora" className="gap-1">
            <Target className="w-3 h-3" /> SORA
            {loading.sora && <Loader2 className="w-3 h-3 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="platforms" className="gap-1">
            <Cpu className="w-3 h-3" /> Plattformer
            {loading.platforms && <Loader2 className="w-3 h-3 animate-spin" />}
          </TabsTrigger>
        </TabsList>

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

        {/* KOSTRA tab */}
        <TabsContent value="kostra" className="space-y-4">
          {loading.kostra ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Henter data fra SSB...</p></CardContent></Card>
          ) : kostra?.success ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Kommunedata fra SSB</CardTitle>
                  <CardDescription>Kilde: {kostra.source === 'ssb' ? 'Statistisk sentralbyrå (SSB)' : 'Estimert basert på tilgjengelig data'}</CardDescription>
                </CardHeader>
                <CardContent>
                  {kostra.indicators && kostra.indicators.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {kostra.indicators.map(ind => (
                        <div key={ind.id} className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">{ind.name}</p>
                          <p className="text-xl font-display font-bold">{ind.value?.toLocaleString('nb-NO')}</p>
                          <p className="text-xs text-muted-foreground">{ind.unit}{ind.year ? ` (${ind.year})` : ''}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{kostra.source === 'estimated' ? 'Kommunekode ikke funnet i SSB-registeret. Viser estimerte verdier.' : 'Ingen indikatorer tilgjengelig.'}</p>
                  )}
                </CardContent>
              </Card>

              {kostra.drone_relevance && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dronerelevans-indikatorer</CardTitle>
                    <CardDescription>Utledet fra kommunedata for å vurdere dronebehov</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {kostra.drone_relevance.population_density && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Befolkningstetthet</p>
                          <p className="text-xl font-display font-bold">{kostra.drone_relevance.population_density}</p>
                          <p className="text-xs text-muted-foreground">innb./km²</p>
                        </div>
                      )}
                      {kostra.drone_relevance.estimated_road_km && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Estimert veinett</p>
                          <p className="text-xl font-display font-bold">{kostra.drone_relevance.estimated_road_km}</p>
                          <p className="text-xs text-muted-foreground">km</p>
                        </div>
                      )}
                      {kostra.drone_relevance.estimated_buildings && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Estimert bygningsmasse</p>
                          <p className="text-xl font-display font-bold">{kostra.drone_relevance.estimated_buildings?.toLocaleString('nb-NO')}</p>
                          <p className="text-xs text-muted-foreground">bygg</p>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Infrastrukturkompleksitet</p>
                        <p className="text-xl font-display font-bold">{kostra.drone_relevance.infrastructure_complexity}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-8 text-center"><AlertTriangle className="w-8 h-8 mx-auto text-destructive/50" /><p className="mt-2 text-sm text-muted-foreground">Kunne ikke hente KOSTRA-data: {kostra?.error}</p></CardContent></Card>
          )}
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

        {/* Platforms tab */}
        <TabsContent value="platforms" className="space-y-4">
          {loading.platforms ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Analyserer droneplattformer...</p></CardContent></Card>
          ) : platforms?.success && platforms.platforms ? (
            <>
              <p className="text-sm text-muted-foreground">{platforms.total_available} plattformer vurdert · Topp {platforms.platforms.length} anbefalinger basert på modenhetsnivå og bruksområder</p>
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
                        <div className="mt-2 text-xs text-muted-foreground">
                          {p.match_reasons.slice(0, 3).join(' · ')}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        {p.price_nok_estimate && (
                          <span className="text-sm font-medium">~{p.price_nok_estimate.toLocaleString('nb-NO')} NOK</span>
                        )}
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                            Detaljer <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card><CardContent className="py-8 text-center"><AlertTriangle className="w-8 h-8 mx-auto text-destructive/50" /><p className="mt-2 text-sm text-muted-foreground">Kunne ikke hente plattformanbefalinger: {platforms?.error}</p></CardContent></Card>
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
