import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { dimensions } from "@/data/dmvData";
import { useAssessment } from "@/hooks/useAssessment";
import { ChevronLeft, ChevronRight, CheckCircle2, Target, Shield, Cpu, Building2, Network } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const dimensionIcons = [Target, Shield, Cpu, Building2, Network];

export default function Assessment() {
  const navigate = useNavigate();
  const {
    answers, setAnswer, currentDimension, setCurrentDimension,
    municipalityName, setMunicipalityName, assessorName, setAssessorName,
    totalScore, maturityLevel, dimensionScores, progress, totalAnswered, totalQuestions,
  } = useAssessment();

  const [showIntro, setShowIntro] = useState(true);
  const dim = dimensions[currentDimension];
  const Icon = dimensionIcons[currentDimension];
  const currentDimScore = dimensionScores[currentDimension];

  if (showIntro) {
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-display">Ny vurdering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="municipality">Kommune</Label>
                <Input
                  id="municipality"
                  placeholder="F.eks. Trondheim kommune"
                  value={municipalityName}
                  onChange={e => setMunicipalityName(e.target.value)}
                />
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
                onClick={() => setShowIntro(false)}
              >
                Start vurdering
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{municipalityName}</p>
          <h1 className="text-2xl font-display font-bold">Vurdering</h1>
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

      {/* Questions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={dim.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-display font-semibold">{dim.name}</h2>
              <p className="text-sm text-muted-foreground">{dim.weight * 100}% vekting · {dim.questions.length} spørsmål</p>
            </div>
          </div>

          {dim.questions.map((q, qi) => (
            <Card key={q.id} className={cn(
              "transition-all",
              answers[q.id] !== undefined && "border-accent/30 bg-accent/5"
            )}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {qi + 1}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{q.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">Metode: {q.method}</p>
                  </div>
                </div>
                <RadioGroup
                  value={answers[q.id]?.toString()}
                  onValueChange={val => setAnswer(q.id, parseInt(val))}
                  className="grid gap-2"
                >
                  {q.levels.map((level, li) => (
                    <label
                      key={li}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                        answers[q.id] === li
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <RadioGroupItem value={li.toString()} />
                      <span className="flex-shrink-0 w-5 h-5 rounded text-xs font-semibold flex items-center justify-center bg-muted text-muted-foreground">
                        {li}
                      </span>
                      <span>{level}</span>
                    </label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentDimension(Math.max(0, currentDimension - 1))}
          disabled={currentDimension === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Forrige
        </Button>
        {currentDimension < dimensions.length - 1 ? (
          <Button
            onClick={() => setCurrentDimension(currentDimension + 1)}
            className="gap-2"
          >
            Neste <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => {
              // Store results in sessionStorage for the results page
              sessionStorage.setItem("dmv-answers", JSON.stringify(answers));
              sessionStorage.setItem("dmv-municipality", municipalityName);
              sessionStorage.setItem("dmv-assessor", assessorName);
              navigate("/resultater");
            }}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Se resultater <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
