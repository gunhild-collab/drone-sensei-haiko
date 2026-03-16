import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GripVertical, X, Plus, Flame, Route, Droplets, Building2, TreePine,
  Heart, Map, Leaf, ChevronRight, Users, Settings2
} from "lucide-react";
import { DEPARTMENT_TEMPLATES, type DepartmentTemplate } from "@/data/departmentTemplates";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<any>> = {
  Flame, Route, Droplets, Building2, TreePine, Heart, Map, Leaf,
};

export interface ActiveDepartment {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
  order: number;
}

interface Props {
  departments: ActiveDepartment[];
  onUpdate: (departments: ActiveDepartment[]) => void;
  population: number;
}

export default function DepartmentEditor({ departments, onUpdate, population }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const enabledDepts = departments.filter(d => d.enabled).sort((a, b) => a.order - b.order);
  const availableTemplates = DEPARTMENT_TEMPLATES.filter(
    t => !departments.some(d => d.id === t.id)
  );

  const toggleDept = (id: string) => {
    onUpdate(departments.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d));
  };

  const removeDept = (id: string) => {
    onUpdate(departments.filter(d => d.id !== id));
  };

  const addFromTemplate = (template: DepartmentTemplate) => {
    const maxOrder = Math.max(0, ...departments.map(d => d.order));
    onUpdate([...departments, {
      id: template.id,
      name: template.name,
      icon: template.icon,
      description: template.description,
      enabled: true,
      order: maxOrder + 1,
    }]);
  };

  const addCustom = () => {
    if (!newDeptName.trim()) return;
    const maxOrder = Math.max(0, ...departments.map(d => d.order));
    onUpdate([...departments, {
      id: `dept-custom-${Date.now()}`,
      name: newDeptName.trim(),
      icon: "Building2",
      description: "Egendefinert avdeling",
      enabled: true,
      order: maxOrder + 1,
    }]);
    setNewDeptName("");
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const sorted = [...enabledDepts];
    const [moved] = sorted.splice(dragIdx, 1);
    sorted.splice(idx, 0, moved);
    const reordered = sorted.map((d, i) => ({ ...d, order: i }));
    const disabledDepts = departments.filter(d => !d.enabled);
    onUpdate([...reordered, ...disabledDepts]);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <>
      {/* Compact department list */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-sm">Avdelinger</h3>
              <Badge variant="secondary" className="text-xs">{enabledDepts.length} aktive</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)} className="gap-1.5 text-xs">
              <Settings2 className="w-3.5 h-3.5" /> Rediger
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {enabledDepts.map(d => {
              const Icon = iconMap[d.icon] || Building2;
              return (
                <Badge key={d.id} variant="outline" className="gap-1 text-xs py-1 px-2">
                  <Icon className="w-3 h-3" /> {d.name}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Side panel */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display">Rediger avdelinger</SheetTitle>
            <SheetDescription>Dra for å endre rekkefølge. Legg til eller fjern avdelinger.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Active departments - drag and drop */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aktive avdelinger</p>
              {enabledDepts.map((d, idx) => {
                const Icon = iconMap[d.icon] || Building2;
                return (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border bg-card cursor-grab active:cursor-grabbing transition-all",
                      dragOverIdx === idx && "border-primary bg-primary/5",
                      dragIdx === idx && "opacity-50"
                    )}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.description}</p>
                    </div>
                    <button onClick={() => removeDept(d.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Available templates */}
            {availableTemplates.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tilgjengelige avdelinger</p>
                {availableTemplates.map(t => {
                  const Icon = iconMap[t.icon] || Building2;
                  const tooSmall = population < t.minPopulation;
                  return (
                    <button
                      key={t.id}
                      onClick={() => addFromTemplate(t)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2.5 rounded-lg border border-dashed text-left transition-all",
                        tooSmall
                          ? "opacity-50 border-border"
                          : "border-primary/30 hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                      </div>
                      {tooSmall && (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">{`>${t.minPopulation.toLocaleString('nb-NO')} innb.`}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom department */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Legg til egendefinert</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Avdelingsnavn..."
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustom()}
                  className="text-sm"
                />
                <Button size="sm" onClick={addCustom} disabled={!newDeptName.trim()} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Legg til
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={() => setSheetOpen(false)} className="w-full gap-2">
              Ferdig <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
