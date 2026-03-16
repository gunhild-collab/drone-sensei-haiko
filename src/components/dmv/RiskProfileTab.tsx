import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Clock, Building2, FileText, Plus, X } from "lucide-react";
import type { RiskProfile, RosEvent, CriticalInfra, EmergencyPlanLink } from "@/hooks/useMunicipalityProfile";

const ROS_TYPES = ["Flom", "Skred", "Skogbrann", "Trafikkulykke", "CBRNE", "Annet"];
const SEVERITY = ["lav", "middels", "høy", "kritisk"] as const;
const INFRA_TYPES = ["Skole", "Sykehjem", "Arrangement", "Kraftverk", "Bru", "Annet"];

interface Props {
  data: RiskProfile;
  onChange: (update: Partial<RiskProfile>) => void;
}

export default function RiskProfileTab({ data, onChange }: Props) {
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

  return (
    <div className="space-y-5">
      {/* ROS-hendelser */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <CardTitle className="text-base font-display">ROS-hendelser og historikk</CardTitle>
          </div>
          <CardDescription>Flom, skred, skogbrann, CBRNE og andre hendelser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.ros_events.map((ev, i) => (
            <div key={i} className="flex flex-wrap items-start gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <Select value={ev.type} onValueChange={v => updateRosEvent(i, { type: v })}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>{ROS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Beskrivelse" value={ev.description} onChange={e => updateRosEvent(i, { description: e.target.value })} className="flex-1 min-w-[150px]" />
              <Input type="number" placeholder="År" value={ev.year ?? ""} onChange={e => updateRosEvent(i, { year: e.target.value ? parseInt(e.target.value) : undefined })} className="w-20" />
              <Select value={ev.severity || "middels"} onValueChange={v => updateRosEvent(i, { severity: v as typeof SEVERITY[number] })}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => removeRosEvent(i)} className="shrink-0"><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRosEvent} className="gap-1"><Plus className="w-3 h-3" /> Legg til hendelse</Button>
        </CardContent>
      </Card>

      {/* Responstider */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-display">Responstider og kapasitet</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "brann_min" as const, label: "Brann (min)" },
              { key: "helse_min" as const, label: "Helse (min)" },
              { key: "redning_min" as const, label: "Redning (min)" },
              { key: "teknisk_vakt_min" as const, label: "Teknisk vakt (min)" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  value={data.response_times[key] ?? ""}
                  onChange={e => onChange({ response_times: { ...data.response_times, [key]: e.target.value ? parseInt(e.target.value) : undefined } })}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1">
            <Label className="text-xs">Merknader</Label>
            <Textarea
              value={data.response_times.notes || ""}
              onChange={e => onChange({ response_times: { ...data.response_times, notes: e.target.value } })}
              placeholder="F.eks. lang utrykningstid i dal, begrenset nattberedskap..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Kritisk infrastruktur */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" />
            <CardTitle className="text-base font-display">Kritisk infrastruktur</CardTitle>
          </div>
          <CardDescription>Skoler, sykehjem, større arrangementer, kraftverk m.m.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.critical_infrastructure.map((ci, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <Input placeholder="Navn" value={ci.name} onChange={e => updateInfra(i, { name: e.target.value })} className="flex-1 min-w-[120px]" />
              <Select value={ci.type} onValueChange={v => updateInfra(i, { type: v })}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>{INFRA_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" step="any" placeholder="Lat" value={ci.lat ?? ""} onChange={e => updateInfra(i, { lat: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-24" />
              <Input type="number" step="any" placeholder="Lng" value={ci.lng ?? ""} onChange={e => updateInfra(i, { lng: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-24" />
              <Button variant="ghost" size="icon" onClick={() => removeInfra(i)}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addInfra} className="gap-1"><Plus className="w-3 h-3" /> Legg til</Button>
        </CardContent>
      </Card>

      {/* Planer og lenker */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-display">Beredskapsplaner og ROS-analyser</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.emergency_plan_links.map((link, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <Input placeholder="Tittel" value={link.title} onChange={e => updateLink(i, { title: e.target.value })} className="flex-1 min-w-[120px]" />
              <Input placeholder="URL" value={link.url} onChange={e => updateLink(i, { url: e.target.value })} className="flex-1 min-w-[150px]" />
              <Select value={link.type} onValueChange={v => updateLink(i, { type: v as EmergencyPlanLink["type"] })}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ros_analyse">ROS-analyse</SelectItem>
                  <SelectItem value="beredskapsplan">Beredskapsplan</SelectItem>
                  <SelectItem value="annet">Annet</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => removeLink(i)}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLink} className="gap-1"><Plus className="w-3 h-3" /> Legg til lenke</Button>
        </CardContent>
      </Card>
    </div>
  );
}
