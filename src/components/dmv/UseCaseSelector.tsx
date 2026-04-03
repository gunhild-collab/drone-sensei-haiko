import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { ActiveDepartment } from "@/components/dmv/DepartmentEditor";

interface UseCase {
  id: string;
  use_case_id: string;
  use_case_name: string;
  department: string;
  description: string | null;
  priority_score: number | null;
}

// Map DB department names → department template IDs
const DEPT_DB_TO_ID: Record<string, string> = {
  "Brann og redning": "dept-brann",
  "Vei og transport": "dept-vei",
  "Vann og avløp": "dept-va",
  "Plan og bygg": "dept-bygg",
  "Teknisk drift": "dept-teknisk",
  "Miljø": "dept-miljo",
  "Kraft/energi": "dept-kraft",
  "Landbruk": "dept-landbruk",
  "Helse og omsorg": "dept-helse",
  "Beredskap": "dept-beredskap",
  "Naturforvaltning": "dept-natur",
};

// Reverse map
const DEPT_ID_TO_DB: Record<string, string[]> = {};
for (const [dbName, id] of Object.entries(DEPT_DB_TO_ID)) {
  if (!DEPT_ID_TO_DB[id]) DEPT_ID_TO_DB[id] = [];
  DEPT_ID_TO_DB[id].push(dbName);
}

// Display order for departments
const DEPT_ORDER = [
  "Brann og redning",
  "Vei og transport",
  "Vann og avløp",
  "Plan og bygg",
  "Teknisk drift",
  "Miljø",
  "Kraft/energi",
  "Landbruk",
  "Helse og omsorg",
  "Beredskap",
];

// Short descriptions (max ~80 chars) - override DB descriptions
const UC_DESCRIPTIONS: Record<string, string> = {
  "Førsteinnsats situasjonsbilde": "Rask oversikt ved utrykning: brann, ulykke, industrihendelse",
  "SAR — savnet person": "Systematisk søk med termisk og zoom, dag og natt",
  "Skogbrann situasjonsbilde": "Termisk overblikk over brannområde for innsatsleder",
  "Autonom førsteinnsats (dock)": "Drone-in-a-box på stasjon, autonom ved alarm",
  "Skredvurdering og naturfare": "Kartlegging av skredutsatt terreng",
  "CBRNE-vurdering": "Drone inn i farlig sone uten å eksponere mannskap",
  "Brannetterforskning dokumentasjon": "3D-dokumentasjon av branntomt",
  "Veiinspeksjon asfalt/dekke": "Systematisk foto av veibane for sprekker og hull",
  "Broinspeksjon": "Nærinspeksjon av underside, søyler, fugekonstruksjoner",
  "Trafikktelling og flyt": "AI-basert telling fra lufta",
  "Vintervedlikehold / snøkartlegging": "Snødybde, isforhold, brøytebehov",
  "Skiltinspeksjon og veimerking": "Registrering av skilttilstand",
  "VA-inspeksjon overflate": "Pumpestasjoner, overløp, lekkasjedeteksjon",
  "Flomkartlegging og overvåkning": "Sanntidsbilder av oversvømt areal",
  "Ledningskartlegging og VA-nettverk": "GIS-oppdatering med nøyaktige posisjoner",
  "Vannkvalitet overvåkning": "Multispektral kartlegging av alger, forurensning",
  "Arealplan ortofoto": "Ortofoto og 3D for reguleringsplaner",
  "Byggetilsyn og ulovlighetskontroll": "Kontroll av byggeaktivitet mot godkjente tegninger",
  "3D bymodell og digital tvilling": "3D-modell av tettsted for planlegging",
  "Kulturminnedokumentasjon": "3D-dokumentasjon av fredede bygninger",
  "Bygningsinspeksjon tak og fasade": "Inspeksjon av kommunale bygg",
  "Energikartlegging kommunale bygg": "Termisk kartlegging for varmetap",
  "Parkforvaltning og grøntareal": "Vegetasjonskartlegging og trær",
  "Innendørs inspeksjon (confined space)": "Tanker, siloer, tunneler",
  "Naturkartlegging og artsmangfold": "Kartlegging av naturtyper for konsekvensutredning",
  "Forurensningsovervåkning": "Overvåkning av utslipp og avrenning",
  "Erosjon og klimatilpasning": "Kartlegging av erosjonsutsatte områder",
  "Kraftlinjeinspeksjon visuell": "Erstatter helikopter og klatring",
  "Kraftlinjeinspeksjon termisk/LiDAR": "Hotspots og vegetasjonsklaring",
  "Vindturbin og solcelleinspeksjon": "Bladsprekker og defekte celler",
  "Jordbrukskartlegging NDVI": "Multispektral vekststatus",
  "Landbrukstilskudd kontroll": "Verifisering av arealoppgaver",
  "Sprøyting og gjødsling": "Presisjonssprøyting",
  "Medisinsk transport (blodprøver/medisiner)": "Transport av blodprøver og medisiner",
  "Hjertestarter-levering": "AED-levering ved alarm",
  "Beredskapsøvelse og trening": "Drone under samvirkeøvelser",
  "Massehendelse og publikumssikkerhet": "Overvåkning ved store arrangementer",
};

interface Props {
  departments: ActiveDepartment[];
  selectedUseCases: string[]; // use_case_id values
  onSelectionChange: (selected: string[]) => void;
}

export default function UseCaseSelector({ departments, selectedUseCases, onSelectionChange }: Props) {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("use_case_requirements")
        .select("id, use_case_id, use_case_name, department, description, priority_score")
        .order("priority_score", { ascending: false });
      if (data) setUseCases(data);
      setLoading(false);
    };
    fetch();
  }, []);

  // Auto-select high priority use cases on first load
  useEffect(() => {
    if (useCases.length > 0 && selectedUseCases.length === 0) {
      const autoSelected = useCases
        .filter(uc => (uc.priority_score ?? 0) >= 7)
        .map(uc => uc.use_case_id);
      onSelectionChange(autoSelected);
    }
  }, [useCases]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get active department DB names
  const activeDeptDbNames = useMemo(() => {
    const names = new Set<string>();
    departments.filter(d => d.enabled).forEach(d => {
      const dbNames = DEPT_ID_TO_DB[d.id];
      if (dbNames) dbNames.forEach(n => names.add(n));
      // Also try matching by name directly
      if (DEPT_DB_TO_ID[d.name]) names.add(d.name);
    });
    return names;
  }, [departments]);

  // Group use cases by department, only active ones
  const grouped = useMemo(() => {
    const map = new Map<string, UseCase[]>();
    for (const dept of DEPT_ORDER) {
      if (!activeDeptDbNames.has(dept)) continue;
      const ucs = useCases.filter(uc => uc.department === dept);
      if (ucs.length > 0) map.set(dept, ucs);
    }
    return map;
  }, [useCases, activeDeptDbNames]);

  const toggleUseCase = (ucId: string) => {
    if (selectedUseCases.includes(ucId)) {
      onSelectionChange(selectedUseCases.filter(id => id !== ucId));
    } else {
      onSelectionChange([...selectedUseCases, ucId]);
    }
  };

  // Summary stats
  const selectedCount = selectedUseCases.length;
  const activeDeptCount = grouped.size;
  const deptsWithSelected = useMemo(() => {
    const set = new Set<string>();
    for (const [dept, ucs] of grouped) {
      if (ucs.some(uc => selectedUseCases.includes(uc.use_case_id))) {
        set.add(dept);
      }
    }
    return set.size;
  }, [grouped, selectedUseCases]);

  // Count shared departments (use cases with shared_departments)
  const sharedDeptCount = useMemo(() => {
    const depts = new Set<string>();
    useCases
      .filter(uc => selectedUseCases.includes(uc.use_case_id))
      .forEach(uc => depts.add(uc.department));
    return depts.size;
  }, [useCases, selectedUseCases]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Henter bruksområder...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-display">Bruksområder</CardTitle>
        <CardDescription>Velg det som er relevant for kommunen. Vi anbefaler basert på aktive avdelinger.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from(grouped.entries()).map(([dept, ucs]) => (
          <Collapsible key={dept} defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors group">
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
              <span className="font-display font-semibold text-sm">{dept}</span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {ucs.filter(uc => selectedUseCases.includes(uc.use_case_id)).length}/{ucs.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-2 pr-1 pb-2">
              {ucs.map(uc => {
                const isSelected = selectedUseCases.includes(uc.use_case_id);
                const isRecommended = (uc.priority_score ?? 0) >= 7;
                const desc = UC_DESCRIPTIONS[uc.use_case_name] || uc.description || "";

                return (
                  <label
                    key={uc.use_case_id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary/30 bg-primary/5"
                        : "border-border hover:bg-secondary/30"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleUseCase(uc.use_case_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{uc.use_case_name}</p>
                      {desc && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{desc}</p>
                      )}
                    </div>
                    {isRecommended && (
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                    )}
                  </label>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ))}

        {grouped.size === 0 && (
          <p className="text-sm text-muted-foreground italic py-4 text-center">
            Ingen aktive avdelinger — aktiver avdelinger ovenfor for å se bruksområder.
          </p>
        )}

        {/* Summary bar */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 text-sm text-muted-foreground border border-border">
            <span className="font-medium text-foreground">{selectedCount} bruksområder</span>
            <span>valgt på tvers av</span>
            <span className="font-medium text-foreground">{deptsWithSelected} avdelinger</span>
            <span>→</span>
            <span className="font-medium text-foreground">{sharedDeptCount} avdelinger</span>
            <span>deler nytteverdi</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
