import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map, Home, Route, Plane, Plus, X } from "lucide-react";
import type { GeographyInfrastructure, GisLayer, Settlement, DroneZone } from "@/hooks/useMunicipalityProfile";

const GIS_TYPES = ["Topografi", "Skogdekke", "Vassdrag", "Flomsone", "Skredutsatt", "Annet"];
const SETTLEMENT_TYPES = ["tettsted", "ressurssenter", "kommunesenter"] as const;
const DRONE_ZONE_TYPES = ["drone_intensive", "dronehavn", "flykorridor"] as const;

interface Props {
  data: GeographyInfrastructure;
  onChange: (update: Partial<GeographyInfrastructure>) => void;
}

export default function GeographyInfraTab({ data, onChange }: Props) {
  // GIS layers
  const addGis = () => onChange({ gis_layers: [...data.gis_layers, { name: "", type: "Topografi" }] });
  const removeGis = (i: number) => onChange({ gis_layers: data.gis_layers.filter((_, idx) => idx !== i) });
  const updateGis = (i: number, patch: Partial<GisLayer>) => {
    const updated = [...data.gis_layers];
    updated[i] = { ...updated[i], ...patch };
    onChange({ gis_layers: updated });
  };

  // Settlements
  const addSettlement = () => onChange({ settlements: [...data.settlements, { name: "", type: "tettsted" }] });
  const removeSettlement = (i: number) => onChange({ settlements: data.settlements.filter((_, idx) => idx !== i) });
  const updateSettlement = (i: number, patch: Partial<Settlement>) => {
    const updated = [...data.settlements];
    updated[i] = { ...updated[i], ...patch };
    onChange({ settlements: updated });
  };

  // Drone zones
  const addZone = () => onChange({ drone_zones: [...data.drone_zones, { name: "", type: "drone_intensive" }] });
  const removeZone = (i: number) => onChange({ drone_zones: data.drone_zones.filter((_, idx) => idx !== i) });
  const updateZone = (i: number, patch: Partial<DroneZone>) => {
    const updated = [...data.drone_zones];
    updated[i] = { ...updated[i], ...patch };
    onChange({ drone_zones: updated });
  };

  return (
    <div className="space-y-5">
      {/* Infrastructure metrics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-display">Vei- og infrastrukturdata</CardTitle>
          </div>
          <CardDescription>Lengde/omfang av vei, bruer, bygg, VA og kraftlinjer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: "road_km" as const, label: "Veier (km)", step: "0.1" },
              { key: "bridges_count" as const, label: "Bruer (stk)", step: "1" },
              { key: "building_portfolio" as const, label: "Bygninger", step: "1" },
              { key: "va_km" as const, label: "VA-nett (km)", step: "0.1" },
              { key: "powerlines_km" as const, label: "Kraftlinjer (km)", step: "0.1" },
            ].map(({ key, label, step }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  step={step}
                  value={data.infrastructure[key] ?? ""}
                  onChange={e => onChange({
                    infrastructure: {
                      ...data.infrastructure,
                      [key]: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* GIS layers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-accent" />
            <CardTitle className="text-base font-display">GIS-lag og kartdata</CardTitle>
          </div>
          <CardDescription>Topografi, flomsoner, skredutsatte områder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.gis_layers.map((gl, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <Input placeholder="Navn" value={gl.name} onChange={e => updateGis(i, { name: e.target.value })} className="flex-1 min-w-[100px]" />
              <Select value={gl.type} onValueChange={v => updateGis(i, { type: v })}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>{GIS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="URL" value={gl.url || ""} onChange={e => updateGis(i, { url: e.target.value })} className="flex-1 min-w-[150px]" />
              <Button variant="ghost" size="icon" onClick={() => removeGis(i)}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addGis} className="gap-1"><Plus className="w-3 h-3" /> Legg til GIS-lag</Button>
        </CardContent>
      </Card>

      {/* Settlements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-display">Tettsteder og bosettingsmønster</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.settlements.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <Input placeholder="Stedsnavn" value={s.name} onChange={e => updateSettlement(i, { name: e.target.value })} className="flex-1 min-w-[100px]" />
              <Select value={s.type || "tettsted"} onValueChange={v => updateSettlement(i, { type: v as typeof SETTLEMENT_TYPES[number] })}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>{SETTLEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Folketall" value={s.population ?? ""} onChange={e => updateSettlement(i, { population: e.target.value ? parseInt(e.target.value) : undefined })} className="w-24" />
              <Input type="number" step="0.1" placeholder="Avstand (km)" value={s.distance_km ?? ""} onChange={e => updateSettlement(i, { distance_km: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-28" />
              <Button variant="ghost" size="icon" onClick={() => removeSettlement(i)}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addSettlement} className="gap-1"><Plus className="w-3 h-3" /> Legg til tettsted</Button>
        </CardContent>
      </Card>

      {/* Drone zones */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-display">Dronesoner og flykorridorer</CardTitle>
          </div>
          <CardDescription>Drone-intensive soner, potensielle dronehavner og korridorer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.drone_zones.map((dz, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <Input placeholder="Navn" value={dz.name} onChange={e => updateZone(i, { name: e.target.value })} className="flex-1 min-w-[100px]" />
              <Select value={dz.type} onValueChange={v => updateZone(i, { type: v as typeof DRONE_ZONE_TYPES[number] })}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="drone_intensive">Drone-intensiv sone</SelectItem>
                  <SelectItem value="dronehavn">Dronehavn</SelectItem>
                  <SelectItem value="flykorridor">Flykorridor</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="any" placeholder="Lat" value={dz.lat ?? ""} onChange={e => updateZone(i, { lat: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-24" />
              <Input type="number" step="any" placeholder="Lng" value={dz.lng ?? ""} onChange={e => updateZone(i, { lng: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-24" />
              <Button variant="ghost" size="icon" onClick={() => removeZone(i)}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addZone} className="gap-1"><Plus className="w-3 h-3" /> Legg til sone</Button>
        </CardContent>
      </Card>
    </div>
  );
}
