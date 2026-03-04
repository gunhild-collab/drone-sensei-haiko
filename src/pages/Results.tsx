import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { dimensions, calculateWeightedScore, calculateDimensionScore, getMaturityLevel, getRecommendedUseCases, maturityLevels } from "@/data/dmvData";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ClipboardCheck } from "lucide-react";

export default function Results() {
  const answers: Record<string, number> = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("dmv-answers") || "{}");
    } catch { return {}; }
  }, []);

  const municipalityName = sessionStorage.getItem("dmv-municipality") || "Ukjent kommune";
  const assessorName = sessionStorage.getItem("dmv-assessor") || "";

  const totalScore = calculateWeightedScore(answers);
  const level = getMaturityLevel(totalScore);
  const recommendedUseCases = getRecommendedUseCases(totalScore);
  const hasAnswers = Object.keys(answers).length > 0;

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
            <Button className="mt-4 gap-2">
              Start vurdering <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
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

      {/* Score overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Totalskår</CardTitle>
              <CardDescription>Vektet gjennomsnitt av alle dimensjoner</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                  <circle
                    cx="80" cy="80" r="70" fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(totalScore / 100) * 440} 440`}
                  />
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
            <CardHeader>
              <CardTitle>Dimensjonsprofil</CardTitle>
              <CardDescription>Radardiagram over alle fem dimensjoner</CardDescription>
            </CardHeader>
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

      {/* Dimension scores */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-xl font-display font-semibold mb-4">Dimensjonsresultater</h2>
        <div className="space-y-3">
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
        </div>
      </motion.div>

      {/* Recommended use cases */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold">Anbefalte bruksområder</h2>
          <Link to="/bruksomrader">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Se alle <ArrowRight className="w-3 h-3" />
            </Button>
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
