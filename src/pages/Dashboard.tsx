import { Link } from "react-router-dom";
import { ArrowRight, Target, Shield, Cpu, Building2, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { dimensions, maturityLevels } from "@/data/dmvData";

const dimensionIcons = [Target, Shield, Cpu, Building2, Network];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
        <div className="relative overflow-hidden rounded-2xl bg-primary p-8 lg:p-12">
          <div className="relative z-10">
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-foreground mb-3">
              Drone Modenhetsvurdering
            </h1>
            <p className="text-primary-foreground/80 max-w-xl text-lg mb-6">
              Kartlegg kommunens modenhetsnivå for dronebruk på tvers av fem dimensjoner. 
              Få innsikt, anbefalinger og en veikart for videre utvikling.
            </p>
            <Link to="/vurdering">
              <Button size="lg" variant="secondary" className="gap-2 font-display font-semibold">
                Start vurdering
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-primary-foreground/5" />
          <div className="absolute -right-5 -bottom-20 w-48 h-48 rounded-full bg-primary-foreground/5" />
        </div>
      </motion.div>

      {/* SORA Builder Hero */}
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }}>
        <div className="relative overflow-hidden rounded-2xl p-8 lg:p-12" style={{ background: 'linear-gradient(135deg, #0f0f17 0%, #1a1025 50%, #0f0f17 100%)', border: '1px solid #2a2a3e' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#7c3aed]/20 text-[#7c3aed]">NY</span>
              <span className="text-gray-400 text-sm">SORA 2.5</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <span className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] bg-clip-text text-transparent">SORA Builder</span>
            </h2>
            <p className="text-gray-400 max-w-xl text-lg mb-6">
              Beregn GRC, ARC, SAIL og generer komplett OSO-dokumentasjon og ConOps-utkast for din droneoperasjon.
            </p>
            <Link to="/sora">
              <Button size="lg" className="gap-2 font-semibold bg-[#7c3aed] hover:bg-[#6d28d9] text-white">
                Start SORA-vurdering
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-[#7c3aed]/5" />
          <div className="absolute -right-5 -bottom-20 w-48 h-48 rounded-full bg-[#ec4899]/5" />
        </div>
      </motion.div>

      {/* Dimensions overview */}
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
        <h2 className="text-xl font-display font-semibold mb-4">Fem dimensjoner</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dimensions.map((d, i) => {
            const Icon = dimensionIcons[i];
            return (
              <Card key={d.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{d.id}</p>
                      <CardTitle className="text-base">{d.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{d.questions.length} spørsmål</span>
                    <span className="font-medium text-primary">{d.weight * 100}% vekt</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Maturity levels */}
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
        <h2 className="text-xl font-display font-semibold mb-4">Modenhetsnivåer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {maturityLevels.map((ml, i) => (
            <Card key={ml.level} className="relative overflow-hidden">
              <div className={cn("absolute top-0 left-0 w-1 h-full", levelColor(i))} />
              <CardHeader>
                <CardDescription>Nivå {ml.level}</CardDescription>
                <CardTitle className="text-lg">{ml.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{ml.description}</p>
                <p className="text-xs text-muted-foreground mt-2">{ml.range[0]}–{ml.range[1]} poeng</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function levelColor(index: number) {
  const colors = ["bg-level-1", "bg-level-2", "bg-level-3", "bg-level-4"];
  return colors[index] || colors[0];
}
