import { Link, useNavigate } from "react-router-dom";
import { Plus, MapPin, FileSearch, Map, ArrowRight, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AnalysisRow {
  id: string;
  municipality_name: string;
  created_at: string;
  total_score: number | null;
  maturity_level: number | null;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const outputCards = [
  {
    icon: "📍",
    label: "Kommuneprofil",
    body: "KOSTRA-data, befolkning, geografi og avdelingsstruktur hentet automatisk.",
  },
  {
    icon: "🚁",
    label: "Dronescenarier",
    body: "Konkrete bruksområder med estimert besparelse og responstidsgevinst per avdeling.",
  },
  {
    icon: "🗺️",
    label: "Implementeringsveikart",
    body: "Anbefalt droneflåte, sertifiseringsplan og faseinndelt implementering.",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("assessments")
      .select("id, municipality_name, created_at, total_score, maturity_level")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAnalyses((data as unknown as AnalysisRow[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "#0f0b2d" }}>
            God dag, Gunhild
          </h1>
          <Link to="/vurdering">
            <Button
              className="gap-2 text-white border-0"
              style={{
                background: "linear-gradient(135deg, #e91e8c 0%, #7c3aed 100%)",
                borderRadius: 8,
              }}
            >
              <Plus className="w-4 h-4" />
              Start ny analyse
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Aktive analyser */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.05 }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>
          Dine analyser
        </p>

        {loading ? (
          <div className="text-sm text-muted-foreground">Laster…</div>
        ) : analyses.length === 0 ? (
          <Card className="border" style={{ borderColor: "#e5e7eb", borderRadius: 10 }}>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="w-10 h-10 mb-3" style={{ color: "#d1d5db" }} />
              <p className="text-sm font-medium" style={{ color: "#374151" }}>
                Ingen analyser ennå
              </p>
              <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
                Start med å velge en kommune.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {analyses.map((a) => {
              const done = a.total_score != null;
              const date = new Date(a.created_at).toLocaleDateString("nb-NO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <Card
                  key={a.id}
                  className="border cursor-pointer hover:shadow-sm transition-shadow"
                  style={{ borderColor: "#e5e7eb", borderRadius: 10 }}
                  onClick={() => navigate(`/resultater?id=${a.id}`)}
                >
                  <CardContent className="flex items-center justify-between py-4 px-5">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-sm" style={{ color: "#0f0b2d" }}>
                        {a.municipality_name}
                      </span>
                      <span className="text-xs" style={{ color: "#6b7280" }}>
                        {date}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className="text-[11px] font-medium"
                        style={{
                          background: done ? "#ecfdf5" : "#fef3c7",
                          color: done ? "#065f46" : "#92400e",
                          border: "none",
                        }}
                      >
                        {done ? "Fullført" : "Påbegynt"}
                      </Badge>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        Åpne <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Hva analysen gir deg */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>
          Hva analysen gir deg
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {outputCards.map((c) => (
            <Card
              key={c.label}
              className="border"
              style={{ borderColor: "#e5e7eb", borderRadius: 10, padding: 20 }}
            >
              <CardContent className="p-0 space-y-2">
                <span className="text-[32px] leading-none">{c.icon}</span>
                <p className="font-bold text-[15px]" style={{ color: "#0f0b2d" }}>
                  {c.label}
                </p>
                <p className="text-[13px] leading-snug" style={{ color: "#6b7280" }}>
                  {c.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
