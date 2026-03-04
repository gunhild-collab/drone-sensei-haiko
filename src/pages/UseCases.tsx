import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCases } from "@/data/dmvData";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const sectors = [...new Set(useCases.map(uc => uc.sector))];

export default function UseCases() {
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return useCases.filter(uc => {
      const matchSearch = !search || uc.name.toLowerCase().includes(search.toLowerCase()) || uc.description.toLowerCase().includes(search.toLowerCase());
      const matchSector = !selectedSector || uc.sector === selectedSector;
      return matchSearch && matchSector;
    });
  }, [search, selectedSector]);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-display font-bold">Bruksområdebibliotek</h1>
        <p className="text-muted-foreground mt-1">Utforsk {useCases.length} kartlagte bruksområder for droner i kommunal sektor.</p>
      </motion.div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Søk i bruksområder..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSector(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              !selectedSector ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"
            )}
          >
            Alle
          </button>
          {sectors.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSector(selectedSector === s ? null : s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                selectedSector === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((uc, i) => (
          <motion.div
            key={uc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">{uc.sector}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">{uc.id}</span>
                </div>
                <h3 className="font-display font-semibold text-sm mb-1">{uc.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{uc.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    {uc.complexity}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Min. nivå {uc.minLevel}
                  </Badge>
                  {uc.dimensions.map(d => (
                    <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Ingen bruksområder funnet.</p>
        </div>
      )}
    </div>
  );
}
