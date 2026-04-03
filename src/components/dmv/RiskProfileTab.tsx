import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Clock, Building2, FileText, Flame, Plus, X, Loader2 } from "lucide-react";
import type { RiskProfile, RosEvent, CriticalInfra, EmergencyPlanLink } from "@/hooks/useMunicipalityProfile";

const ROS_TYPES = ["Flom", "Skred", "Skogbrann", "Trafikkulykke", "CBRNE", "Annet"];
const SEVERITY = ["lav", "middels", "høy", "kritisk"] as const;
const INFRA_TYPES = ["Skole", "Sykehjem", "Arrangement", "Kraftverk", "Bru", "Annet"];

interface Props {
  data: RiskProfile;
  onChange: (update: Partial<RiskProfile>) => void;
  loading?: boolean;
}

export default function RiskProfileTab({ data, onChange, loading }: Props) {
  const addRosEvent = () => {
    onChange({ ros_events: [...data.ros_events, { type: "Flom", description: "", severity: "middels" }] });
  };
  const removeRosEvent = (i: number) => {
    onChange({ ros_events: data.ros_events.filter((_, idx) => idx !== i) });
  };
  const updateRosEvent = (i: number, patch: Partial<RosEvent>) => {
    const updated = [...data.ros_events];
    updated[i] = { ...updated[i], ...patch };
    onChange({ ros_events: updated });
  };

  const addInfra = () => {
    onChange({ critical_infrastructure: [...data.critical_infrastructure, { name: "", type: "Skole" }] });
  };
  const removeInfra = (i: number) => {
    onChange({ critical_infrastructure: data.critical_infrastructure.filter((_, idx) => idx !== i) });
  };
  const updateInfra = (i: number, patch: Partial<CriticalInfra>) => {
    const updated = [...data.critical_infrastructure];
    updated[i] = { ...updated[i], ...patch };
    onChange({ critical_infrastructure: updated });
  };

  const addLink = () => {
    onChange({ emergency_plan_links: [...data.emergency_plan_links, { title: "", url: "", type: "ros_analyse" }] });
  };
  const removeLink = (i: number) => {
    onChange({ emergency_plan_links: data.emergency_plan_links.filter((_, idx) => idx !== i) });
  };
  const updateLink = (i: number, patch: Partial<EmergencyPlanLink>) => {
    const updated = [...data.emergency_plan_links];
    updated[i] = { ...updated[i], ...patch };
    onChange({ emergency_plan_links: updated });
  };

  const fireStats = data.fire_stats;

  return (
    <div className="space-y-5">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-secondary/50">
          <Loader2 className="w-4 h-4 animate-spin" /> Henter brannstatistikk fra SSB...
        </div>
      )}

      {/* Fire stats from SSB/brannstatistikk */}
      {fireStats && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-destructive" />
              <CardTitle className="text-base font-display">Brannstatistikk</CardTitle>
              <Badge variant="outline" className="text-[10px] ml-auto">Kilde: SSB {fireStats.year}</Badge>
            </div>
            <CardDescription>Automatisk hentet fra SSB tabell 12362</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {fireStats.total_fires != null && (
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="text-2xl font-display font-bold text-foreground">{fireStats.total_fires}</div>
                  <div className="text-xs text-muted-foreground">Branner totalt</div>
                </div>
              )}
              {fireStats.building_fires != null && (
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="text-2xl font-display font-bold text-foreground">{fireStats.building_fires}</div>
                  <div className="text-xs text-muted-foreground">Bygningsbranner</div>
                </div>
              )}
              {fireStats.chimney_fires != null && (
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="text-2xl font-display font-bold text-foreground">{fireStats.chimney_fires}</div>
                  <div className="text-xs text-muted-foreground">Pipebranner</div>
                </div>
              )}
              {fireStats.total_callouts != null && (
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="text-2xl font-display font-bold text-foreground">{fireStats.total_callouts}</div>
                  <div className="text-xs text-muted-foreground">Utrykninger totalt</div>
                </div>
              )}
              {fireStats.fire_expenditure_1000nok != null && (
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="text-2xl font-display font-bold text-foreground">{(fireStats.fire_expenditure_1000nok / 1000).toFixed(1)}M</div>
                  <div className="text-xs text-muted-foreground">Brannvern (kr)</div>
                </div>
              )}
              {fireStats.fire_ftes != null && (
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="text-2xl font-display font-bold text-foreground">{fireStats.fire_ftes.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Årsverk brann</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
