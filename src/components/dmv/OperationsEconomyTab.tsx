import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Wallet, Users, Plane, Plus, X, Loader2, Edit2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { OperationsEconomy, SectorBudget, StaffingEntry } from "@/hooks/useMunicipalityProfile";

const SECTORS = ["Plan", "Byggesak", "Drift/vei", "Landbruk", "Miljø", "Brann", "Helse", "VA", "Eiendom", "Annet"];

interface Props {
  data: OperationsEconomy;
  onChange: (update: Partial<OperationsEconomy>) => void;
  kostraLoading?: boolean;
}

function formatNok(value: number | undefined): string {
  if (!value) return "–";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mill. kr`;
  if (value >= 1000) return `${Math.round(value / 1000)} tusen kr`;
  return `${value} kr`;
}

export default function OperationsEconomyTab({ data, onChange, kostraLoading }: Props) {
  const [manualBudgetMode, setManualBudgetMode] = useState(false);
  const [manualStaffMode, setManualStaffMode] = useState(false);

  const hasKostraBudgets = data.budgets.some(b => b.source === "kostra" || b.source === "estimated");
  const hasKostraStaff = data.staffing.some(s => s.source === "kostra" || s.source === "estimated");

  // Budgets – manual mode handlers
  const addBudget = () => onChange({ budgets: [...data.budgets, { sector: "Drift/vei", source: "manual" }] });
  const removeBudget = (i: number) => onChange({ budgets: data.budgets.filter((_, idx) => idx !== i) });
  const updateBudget = (i: number, patch: Partial<SectorBudget>) => {
    const updated = [...data.budgets];
    updated[i] = { ...updated[i], ...patch };
    onChange({ budgets: updated });
  };

  // Staffing – manual mode handlers
  const addStaff = () => onChange({ staffing: [...data.staffing, { sector: "Drift/vei", source: "manual" }] });
  const removeStaff = (i: number) => onChange({ staffing: data.staffing.filter((_, idx) => idx !== i) });
  const updateStaff = (i: number, patch: Partial<StaffingEntry>) => {
    const updated = [...data.staffing];
    updated[i] = { ...updated[i], ...patch };
    onChange({ staffing: updated });
  };

  const drone = data.existing_drone_use;

  return (
    <div className="space-y-5">
      {kostraLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-secondary/50">
          <Loader2 className="w-4 h-4 animate-spin" /> Henter driftsdata fra KOSTRA/SSB…
        </div>
      )}

      {/* ── Budgets ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <CardTitle className="text-base font-display">Driftsutgifter per sektor</CardTitle>
            </div>
            {hasKostraBudgets && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs gap-1">
                  {data.budgets.some(b => b.source === "kostra") ? (
                    <><CheckCircle2 className="w-3 h-3" /> KOSTRA/SSB</>
                  ) : (
                    <><AlertTriangle className="w-3 h-3" /> Estimert</>
                  )}
                </Badge>
                <Button
                  variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                  onClick={() => setManualBudgetMode(!manualBudgetMode)}
                >
                  <Edit2 className="w-3 h-3" />
                  {manualBudgetMode ? "Vis automatisk" : "Rediger manuelt"}
                </Button>
              </div>
            )}
          </div>
          <CardDescription>
            {hasKostraBudgets
              ? "Brutto driftsutgifter (1000 kr) hentet fra SSB tabell 12367"
              : "Ingen KOSTRA-data funnet – legg inn manuelt"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasKostraBudgets && !manualBudgetMode ? (
            /* Auto-populated read-only view */
            <div className="space-y-2">
              {data.budgets.filter(b => b.source === "kostra" || b.source === "estimated").map((b, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm w-24">{b.sector}</span>
                    <span className="text-sm">{formatNok(b.maintenance_nok)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{b.year || ""}</span>
                </div>
              ))}
              {data.budgets.filter(b => b.source === "manual").length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground pt-2">Manuelt lagt til:</div>
                  {data.budgets.filter(b => b.source === "manual").map((b, i) => (
                    <div key={`m-${i}`} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                      <span className="font-medium text-sm w-24">{b.sector}</span>
                      <span className="text-sm">{formatNok(b.maintenance_nok)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            /* Manual edit mode / fallback */
            <>
              {data.budgets.map((b, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
                  <Select value={b.sector} onValueChange={v => updateBudget(i, { sector: v })}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Input type="number" placeholder="Driftsutgifter" value={b.maintenance_nok ?? ""} onChange={e => updateBudget(i, { maintenance_nok: e.target.value ? parseInt(e.target.value) : undefined })} className="w-28" />
                    <span className="text-xs text-muted-foreground">kr</span>
                  </div>
                  <Input type="number" placeholder="År" value={b.year ?? ""} onChange={e => updateBudget(i, { year: e.target.value ? parseInt(e.target.value) : undefined })} className="w-20" />
                  {b.source === "kostra" && <Badge variant="secondary" className="text-[10px]">KOSTRA</Badge>}
                  <Button variant="ghost" size="icon" onClick={() => removeBudget(i)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addBudget} className="gap-1"><Plus className="w-3 h-3" /> Legg til budsjettpost</Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Staffing ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <CardTitle className="text-base font-display">Årsverk per sektor</CardTitle>
            </div>
            {hasKostraStaff && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs gap-1">
                  {data.staffing.some(s => s.source === "kostra") ? (
                    <><CheckCircle2 className="w-3 h-3" /> KOSTRA/SSB</>
                  ) : (
                    <><AlertTriangle className="w-3 h-3" /> Estimert</>
                  )}
                </Badge>
                <Button
                  variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                  onClick={() => setManualStaffMode(!manualStaffMode)}
                >
                  <Edit2 className="w-3 h-3" />
                  {manualStaffMode ? "Vis automatisk" : "Rediger manuelt"}
                </Button>
              </div>
            )}
          </div>
          <CardDescription>
            {hasKostraStaff
              ? "Avtalte årsverk per tjenesteområde fra SSB"
              : "Ingen SSB-data funnet – legg inn manuelt"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasKostraStaff && !manualStaffMode ? (
            <div className="space-y-2">
              {data.staffing.filter(s => s.source === "kostra" || s.source === "estimated").map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm w-24">{s.sector}</span>
                    <span className="text-sm">{s.headcount ?? "–"} årsverk</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {data.staffing.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
                  <Select value={s.sector} onValueChange={v => updateStaff(i, { sector: v })}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{SECTORS.map(sec => <SelectItem key={sec} value={sec}>{sec}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Årsverk" value={s.headcount ?? ""} onChange={e => updateStaff(i, { headcount: e.target.value ? parseInt(e.target.value) : undefined })} className="w-24" />
                  <Input type="number" placeholder="Drone-timer/år" value={s.drone_eligible_hours ?? ""} onChange={e => updateStaff(i, { drone_eligible_hours: e.target.value ? parseInt(e.target.value) : undefined })} className="w-24" />
                  <Input placeholder="Oppgaver" value={s.tasks || ""} onChange={e => updateStaff(i, { tasks: e.target.value })} className="flex-1 min-w-[120px]" />
                  {s.source === "kostra" && <Badge variant="secondary" className="text-[10px]">KOSTRA</Badge>}
                  <Button variant="ghost" size="icon" onClick={() => removeStaff(i)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addStaff} className="gap-1"><Plus className="w-3 h-3" /> Legg til sektor</Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Existing drone use ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-display">Eksisterende dronebruk</CardTitle>
          </div>
          <CardDescription>Valgfritt — påvirker sluttresultatet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={drone.has_drones}
              onCheckedChange={v => onChange({ existing_drone_use: { ...drone, has_drones: v } })}
            />
            <Label className="text-sm">Kommunen har allerede droner</Label>
          </div>
          {drone.has_drones && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Dronetyper</Label>
                <Input value={drone.drone_types || ""} onChange={e => onChange({ existing_drone_use: { ...drone, drone_types: e.target.value } })} placeholder="F.eks. DJI Mavic 3E" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bruksområder</Label>
                <Input value={drone.use_areas || ""} onChange={e => onChange({ existing_drone_use: { ...drone, use_areas: e.target.value } })} placeholder="Inspeksjon, kartlegging..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Interne piloter</Label>
                <Input type="number" value={drone.internal_pilots ?? ""} onChange={e => onChange({ existing_drone_use: { ...drone, internal_pilots: e.target.value ? parseInt(e.target.value) : undefined } })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Eksterne leverandører</Label>
                <Input value={drone.external_suppliers || ""} onChange={e => onChange({ existing_drone_use: { ...drone, external_suppliers: e.target.value } })} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
