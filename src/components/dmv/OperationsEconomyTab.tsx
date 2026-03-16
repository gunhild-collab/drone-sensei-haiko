import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Users, Plane, TrendingUp, ShieldCheck, Plus, X } from "lucide-react";
import type { OperationsEconomy, SectorBudget, StaffingEntry, SectorPotential } from "@/hooks/useMunicipalityProfile";

const SECTORS = ["Plan", "Byggesak", "Drift/vei", "Landbruk", "Miljø", "Brann", "Helse", "VA", "Eiendom", "Annet"];
const LEVELS = ["lav", "medium", "høy"] as const;

interface Props {
  data: OperationsEconomy;
  onChange: (update: Partial<OperationsEconomy>) => void;
}

export default function OperationsEconomyTab({ data, onChange }: Props) {
  // Budgets
  const addBudget = () => onChange({ budgets: [...data.budgets, { sector: "Drift/vei" }] });
  const removeBudget = (i: number) => onChange({ budgets: data.budgets.filter((_, idx) => idx !== i) });
  const updateBudget = (i: number, patch: Partial<SectorBudget>) => {
    const updated = [...data.budgets];
    updated[i] = { ...updated[i], ...patch };
    onChange({ budgets: updated });
  };

  // Staffing
  const addStaff = () => onChange({ staffing: [...data.staffing, { sector: "Drift/vei" }] });
  const removeStaff = (i: number) => onChange({ staffing: data.staffing.filter((_, idx) => idx !== i) });
  const updateStaff = (i: number, patch: Partial<StaffingEntry>) => {
    const updated = [...data.staffing];
    updated[i] = { ...updated[i], ...patch };
    onChange({ staffing: updated });
  };

  // Sector potential
  const addPotential = () => onChange({ sector_potential: [...data.sector_potential, { sector: "Drift/vei", time_saving: "medium", cost_saving: "medium" }] });
  const removePotential = (i: number) => onChange({ sector_potential: data.sector_potential.filter((_, idx) => idx !== i) });
  const updatePotential = (i: number, patch: Partial<SectorPotential>) => {
    const updated = [...data.sector_potential];
    updated[i] = { ...updated[i], ...patch };
    onChange({ sector_potential: updated });
  };

  const drone = data.existing_drone_use;
  const reg = data.regulatory_status;

  return (
    <div className="space-y-5">
      {/* Budgets */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-display">Vedlikeholds- og investeringsbudsjett</CardTitle>
          </div>
          <CardDescription>Årlige budsjetter per sektor (vei, bygg, VA, teknisk)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.budgets.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <Select value={b.sector} onValueChange={v => updateBudget(i, { sector: v })}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input type="number" placeholder="Vedlikehold" value={b.maintenance_nok ?? ""} onChange={e => updateBudget(i, { maintenance_nok: e.target.value ? parseInt(e.target.value) : undefined })} className="w-28" />
                <span className="text-xs text-muted-foreground">kr</span>
              </div>
              <div className="flex items-center gap-1">
                <Input type="number" placeholder="Investering" value={b.investment_nok ?? ""} onChange={e => updateBudget(i, { investment_nok: e.target.value ? parseInt(e.target.value) : undefined })} className="w-28" />
                <span className="text-xs text-muted-foreground">kr</span>
              </div>
              <Input type="number" placeholder="År" value={b.year ?? ""} onChange={e => updateBudget(i, { year: e.target.value ? parseInt(e.target.value) : undefined })} className="w-20" />
              <Button variant="ghost" size="icon" onClick={() => removeBudget(i)}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addBudget} className="gap-1"><Plus className="w-3 h-3" /> Legg til budsjettpost</Button>
        </CardContent>
      </Card>

      {/* Staffing */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            <CardTitle className="text-base font-display">Ansatte og timebruk</CardTitle>
          </div>
          <CardDescription>Antall ansatte og estimert drone-effektiviserbar timebruk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.staffing.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <Select value={s.sector} onValueChange={v => updateStaff(i, { sector: v })}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>{SECTORS.map(sec => <SelectItem key={sec} value={sec}>{sec}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Ansatte" value={s.headcount ?? ""} onChange={e => updateStaff(i, { headcount: e.target.value ? parseInt(e.target.value) : undefined })} className="w-24" />
              <Input type="number" placeholder="Timer/år" value={s.drone_eligible_hours ?? ""} onChange={e => updateStaff(i, { drone_eligible_hours: e.target.value ? parseInt(e.target.value) : undefined })} className="w-24" />
              <Input placeholder="Oppgaver" value={s.tasks || ""} onChange={e => updateStaff(i, { tasks: e.target.value })} className="flex-1 min-w-[120px]" />
              <Button variant="ghost" size="icon" onClick={() => removeStaff(i)}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addStaff} className="gap-1"><Plus className="w-3 h-3" /> Legg til sektor</Button>
        </CardContent>
      </Card>

      {/* Existing drone use */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-display">Eksisterende dronebruk</CardTitle>
          </div>
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

      {/* Sector potential */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <CardTitle className="text-base font-display">Tids- og kostnadsgevinster per sektor</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.sector_potential.map((sp, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <Select value={sp.sector} onValueChange={v => updatePotential(i, { sector: v })}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Label className="text-xs whitespace-nowrap">Tid:</Label>
                <Select value={sp.time_saving} onValueChange={v => updatePotential(i, { time_saving: v as typeof LEVELS[number] })}>
                  <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs whitespace-nowrap">Kost:</Label>
                <Select value={sp.cost_saving} onValueChange={v => updatePotential(i, { cost_saving: v as typeof LEVELS[number] })}>
                  <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Hovedoppgaver" value={sp.primary_tasks || ""} onChange={e => updatePotential(i, { primary_tasks: e.target.value })} className="flex-1 min-w-[100px]" />
              <Button variant="ghost" size="icon" onClick={() => removePotential(i)}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPotential} className="gap-1"><Plus className="w-3 h-3" /> Legg til sektor</Button>
        </CardContent>
      </Card>

      {/* Regulatory status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-display">Regelverk og kompetanse</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              { key: "knows_easa" as const, label: "Kjenner EASA-regelverket" },
              { key: "knows_sora_sts" as const, label: "Kjenner SORA/STS-prosessen" },
              { key: "has_internal_routines" as const, label: "Har interne rutiner for dronebruk" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <Switch
                  checked={reg[key]}
                  onCheckedChange={v => onChange({ regulatory_status: { ...reg, [key]: v } })}
                />
                <Label className="text-sm">{label}</Label>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Merknader</Label>
            <Textarea
              value={reg.notes || ""}
              onChange={e => onChange({ regulatory_status: { ...reg, notes: e.target.value } })}
              placeholder="F.eks. har planlagt kurs, bruker ekstern konsulent..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
