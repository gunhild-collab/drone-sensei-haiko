import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ActiveDepartment } from "@/components/dmv/DepartmentEditor";

interface ExistingDrone {
  id: string;
  model: string;
  department: string;
  useCase: string;
}

interface Props {
  departments: ActiveDepartment[];
  value: ExistingDrone[];
  onChange: (drones: ExistingDrone[]) => void;
}

interface DroneOption {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
}

interface UseCaseOption {
  use_case_id: string;
  use_case_name: string;
}

function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  displayKey 
}: { 
  options: { id: string; label: string }[]; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder: string;
  displayKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm truncate">
          {selected ? (
            <span className="truncate">{selected.label}</span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Søk..." className="h-9" />
          <CommandList>
            <CommandEmpty>Ingen treff</CommandEmpty>
            <CommandGroup>
              {options.map(opt => (
                <CommandItem
                  key={opt.id}
                  value={opt.label}
                  onSelect={() => { onChange(opt.id); setOpen(false); }}
                  className="text-sm"
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ExistingDronesSection({ departments, value, onChange }: Props) {
  const [hasDrones, setHasDrones] = useState<string>("");
  const [droneOptions, setDroneOptions] = useState<DroneOption[]>([]);
  const [useCaseOptions, setUseCaseOptions] = useState<UseCaseOption[]>([]);

  useEffect(() => {
    supabase.from("drone_platforms").select("id, name, manufacturer, model").order("name").then(({ data }) => {
      if (data) setDroneOptions(data as DroneOption[]);
    });
    supabase.from("use_case_requirements").select("use_case_id, use_case_name").order("use_case_name").then(({ data }) => {
      if (data) setUseCaseOptions(data as UseCaseOption[]);
    });
  }, []);

  const activeDepts = departments.filter(d => d.enabled);

  const deptOptions = activeDepts.map(d => ({ id: d.id, label: d.name }));
  const droneSelectOptions = droneOptions.map(d => ({ 
    id: d.name || `${d.manufacturer} ${d.model}`, 
    label: d.name || `${d.manufacturer} ${d.model}` 
  }));
  const ucSelectOptions = useCaseOptions.map(uc => ({ id: uc.use_case_id, label: uc.use_case_name }));

  const addDrone = () => {
    onChange([...value, { id: crypto.randomUUID(), model: "", department: "", useCase: "" }]);
  };

  const updateDrone = (id: string, field: keyof ExistingDrone, val: string) => {
    onChange(value.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  const removeDrone = (id: string) => {
    onChange(value.filter(d => d.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Plane className="w-5 h-5 text-primary" />
          Droner i dag
        </CardTitle>
        <CardDescription>Har kommunen droner allerede? Vi tilpasser anbefalingen.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={hasDrones} onValueChange={(v) => {
          setHasDrones(v);
          if (v === "no") onChange([]);
        }}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id="no-drones" />
            <Label htmlFor="no-drones" className="text-sm cursor-pointer">Nei, ingen droner i dag</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yes" id="yes-drones" />
            <Label htmlFor="yes-drones" className="text-sm cursor-pointer">Ja</Label>
          </div>
        </RadioGroup>

        {hasDrones === "yes" && (
          <div className="space-y-3 pt-2">
            {value.map((drone, idx) => (
              <div key={drone.id} className="border rounded-lg p-3 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Drone {idx + 1}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDrone(drone.id)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Modell</Label>
                    <SearchableSelect
                      options={droneSelectOptions}
                      value={drone.model}
                      onChange={(v) => updateDrone(drone.id, "model", v)}
                      placeholder="F.eks. DJI Mini 4 Pro"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Brukes av</Label>
                    <SearchableSelect
                      options={deptOptions}
                      value={drone.department}
                      onChange={(v) => updateDrone(drone.id, "department", v)}
                      placeholder="F.eks. Brann, teknisk etat"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Brukes til</Label>
                    <SearchableSelect
                      options={ucSelectOptions}
                      value={drone.useCase}
                      onChange={(v) => updateDrone(drone.id, "useCase", v)}
                      placeholder="F.eks. Foto av byggetomter"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={addDrone}>
              <Plus className="w-3.5 h-3.5" /> Legg til drone
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
