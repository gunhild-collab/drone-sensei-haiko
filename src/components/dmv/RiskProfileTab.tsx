import { Badge } from "@/components/ui/badge";
import { Flame, Loader2 } from "lucide-react";
import type { RiskProfile } from "@/hooks/useMunicipalityProfile";

interface Props {
  data: RiskProfile;
  onChange: (update: Partial<RiskProfile>) => void;
  loading?: boolean;
}

export default function RiskProfileTab({ data, onChange, loading }: Props) {
  const fireStats = data.fire_stats;

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-secondary/50">
          <Loader2 className="w-4 h-4 animate-spin" /> Henter brannstatistikk fra SSB...
        </div>
      )}

      {/* Compact fire stats row */}
      {fireStats && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-destructive" />
            <p className="text-sm font-display font-semibold">Brannstatistikk</p>
            <Badge variant="outline" className="text-[10px] ml-auto">SSB {fireStats.year}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {fireStats.total_fires != null && (
              <span><span className="font-semibold text-foreground">{fireStats.total_fires}</span> branner</span>
            )}
            {fireStats.building_fires != null && (
              <span><span className="font-semibold text-foreground">{fireStats.building_fires}</span> bygningsbranner</span>
            )}
            {fireStats.chimney_fires != null && (
              <span><span className="font-semibold text-foreground">{fireStats.chimney_fires}</span> pipebranner</span>
            )}
            {fireStats.total_callouts != null && (
              <span><span className="font-semibold text-foreground">{fireStats.total_callouts}</span> utrykninger</span>
            )}
            {fireStats.fire_expenditure_1000nok != null && (
              <span><span className="font-semibold text-foreground">{(fireStats.fire_expenditure_1000nok / 1000).toFixed(1)}M</span> kr brannvern</span>
            )}
            {fireStats.fire_ftes != null && (
              <span><span className="font-semibold text-foreground">{fireStats.fire_ftes.toFixed(1)}</span> årsverk</span>
            )}
          </div>
        </div>
      )}

      {!fireStats && !loading && (
        <p className="text-xs text-muted-foreground italic">Ingen brannstatistikk tilgjengelig for denne kommunen.</p>
      )}
    </div>
  );
}
