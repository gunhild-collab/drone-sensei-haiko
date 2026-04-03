import { Badge } from "@/components/ui/badge";
import { Flame, Building2, Home, Truck, DollarSign, Users, Loader2 } from "lucide-react";
import type { RiskProfile } from "@/hooks/useMunicipalityProfile";

interface Props {
  data: RiskProfile;
  onChange: (update: Partial<RiskProfile>) => void;
  loading?: boolean;
}

export default function RiskProfileTab({ data, onChange, loading }: Props) {
  const fireStats = data.fire_stats;

  const statItems = fireStats ? [
    { icon: Flame, label: "Branner totalt", value: fireStats.total_fires, unit: "" },
    { icon: Building2, label: "Bygningsbranner", value: fireStats.building_fires, unit: "" },
    { icon: Home, label: "Pipebranner", value: fireStats.chimney_fires, unit: "" },
    { icon: Truck, label: "Utrykninger", value: fireStats.total_callouts, unit: "" },
    { icon: DollarSign, label: "Brannvernbudsjett", value: fireStats.fire_expenditure_1000nok != null ? `${(fireStats.fire_expenditure_1000nok / 1000).toFixed(1)}M kr` : null, unit: "" },
    { icon: Users, label: "Årsverk brannvern", value: fireStats.fire_ftes != null ? fireStats.fire_ftes.toFixed(1) : null, unit: "" },
  ].filter(s => s.value != null) : [];

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-secondary/50">
          <Loader2 className="w-4 h-4 animate-spin" /> Henter brannstatistikk fra SSB...
        </div>
      )}

      {statItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-destructive" />
            <p className="text-sm font-display font-semibold">Brannstatistikk</p>
            <Badge variant="outline" className="text-[10px] ml-auto">SSB {fireStats!.year}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="w-8 h-8 rounded-md bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-display font-bold leading-tight">{value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!fireStats && !loading && (
        <p className="text-xs text-muted-foreground italic">Ingen brannstatistikk tilgjengelig for denne kommunen.</p>
      )}
    </div>
  );
}
