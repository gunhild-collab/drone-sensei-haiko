import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { evaluationApi, KostraData } from "@/lib/evaluationApi";
import { ChevronRight, MapPin, Users, Route, Building2, Droplets, AlertTriangle, CheckCircle2, Plane, TreePine } from "lucide-react";
import { motion } from "framer-motion";

interface KostraPreviewProps {
  municipalityName: string;
  onContinue: (kostraOverrides: KostraOverrides) => void;
  onBack: () => void;
}

export interface KostraOverrides {
  population: number | null;
  roadKm: number | null;
  buildings: number | null;
  vaKm: number | null;
}

export function KostraPreview({ municipalityName, onContinue, onBack }: KostraPreviewProps) {
  const [kostra, setKostra] = useState<KostraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<KostraOverrides>({
    population: null,
    roadKm: null,
    buildings: null,
    vaKm: null,
  });

  useEffect(() => {
    setLoading(true);
    evaluationApi.fetchKostraData(municipalityName).then((data) => {
      setKostra(data);
      if (data.success) {
        const pop = data.indicators?.find(i => i.id === "population")?.value ?? null;
        const roadInd = data.indicators?.find(i => i.id === "road_km");
        const vaTotal = (data.va_network?.water_pipe_km ?? 0) + (data.va_network?.sewage_pipe_km ?? 0);
        setOverrides({
          population: pop,
          roadKm: roadInd?.value ?? null,
          buildings: data.buildings?.total ?? null,
          vaKm: vaTotal || null,
        });
      }
      setLoading(false);
    });
  }, [municipalityName]);

  const updateField = (field: keyof KostraOverrides, value: string) => {
    const num = value === "" ? null : parseInt(value);
    setOverrides(prev => ({ ...prev, [field]: isNaN(num as number) ? null : num }));
  };

  const fields = [
    { key: "population" as const, label: "Folketall", icon: Users, unit: "innbyggere", placeholder: "f.eks. 200000" },
    { key: "roadKm" as const, label: "Kommunale veier", icon: Route, unit: "km", placeholder: "f.eks. 3000" },
    { key: "buildings" as const, label: "Bygninger", icon: Building2, unit: "stk", placeholder: "f.eks. 80000" },
    { key: "vaKm" as const, label: "VA-ledningsnett", icon: Droplets, unit: "km", placeholder: "f.eks. 2000" },
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold">{municipalityName}</h1>
            <p className="text-sm text-muted-foreground">Kommunedata fra KOSTRA / SSB</p>
          </div>
        </div>

        {kostra?.success ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1 text-xs">
              <CheckCircle2 className="w-3 h-3" />
              Kilde: {kostra.source === "ssb" ? "SSB (live)" : "Estimat"}
            </Badge>
            {kostra.drone_relevance?.urban_rural && (
              <Badge variant="secondary" className="text-xs">{kostra.drone_relevance.urban_rural}</Badge>
            )}
            {kostra.drone_relevance?.controlled_airspace && (
              <Badge variant="destructive" className="text-xs gap-1">
                <Plane className="w-3 h-3" /> {kostra.drone_relevance.controlled_airspace.type} ({kostra.drone_relevance.controlled_airspace.airport})
              </Badge>
            )}
            {kostra.drone_relevance?.protected_areas && kostra.drone_relevance.protected_areas.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1">
                <TreePine className="w-3 h-3" /> {kostra.drone_relevance.protected_areas.length} verneområde(r)
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Kunne ikke hente data automatisk. Fyll inn manuelt.
          </div>
        )}

        {/* Services */}
        {kostra?.services && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Identifiserte kommunale tjenester</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {kostra.services.active_services.map(s => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Nøkkeltall for droneoperasjoner</CardTitle>
            <p className="text-sm text-muted-foreground">
              Verdiene brukes til å tilpasse anbefalinger. Korriger gjerne om du har bedre tall.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {fields.map(({ key, label, icon: FIcon, unit, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <FIcon className="w-4 h-4 text-muted-foreground" />
                  {label}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={overrides[key] ?? ""}
                    onChange={e => updateField(key, e.target.value)}
                    placeholder={placeholder}
                    className="max-w-[200px]"
                  />
                  <span className="text-sm text-muted-foreground">{unit}</span>
                  {overrides[key] === null && (
                    <Badge variant="secondary" className="text-xs">Mangler</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Tilbake</Button>
          <Button onClick={() => onContinue(overrides)} className="gap-2 font-display font-semibold">
            Start vurdering <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
