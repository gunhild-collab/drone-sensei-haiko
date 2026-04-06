import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Clock } from "lucide-react";

interface Props {
  municipalityName: string;
  population: number;
  areaKm2: number | null;
  roadKm: number | null;
  vaKm: number | null;
  buildings: number | null;
  selectedDepartments: string[];
}

const TASK_TIME_ESTIMATES = [
  {
    department: "Brann og redning",
    task: "Situasjonsvurdering ved utrykning",
    manual_hours_per_event: 1.5,
    drone_hours_per_event: 0.25,
    events_per_year_base: 40,
    scalePer: 10000,
    scaleBy: "population",
    note: "Drone gir oversiktsbilde på <2 min vs. manuell rekognosering",
  },
  {
    department: "Brann og redning",
    task: "Etterslukking og dokumentasjon",
    manual_hours_per_event: 3,
    drone_hours_per_event: 0.5,
    events_per_year_base: 15,
    scalePer: 10000,
    scaleBy: "population",
    note: "Termisk kamera identifiserer hotspots uten å sende mannskap inn",
  },
  {
    department: "Vei og transport",
    task: "Veiinspeksjon (tilstandsvurdering)",
    manual_per_unit: 2,
    drone_per_unit: 0.15,
    scaleBy: "roadKm",
    note: "VTOL fixed-wing dekker 20x mer areal per time",
  },
  {
    department: "Vei og transport",
    task: "Broinspeksjon",
    manual_hours_per_event: 8,
    drone_hours_per_event: 1.5,
    events_per_year_base: 4,
    scalePer: 10000,
    scaleBy: "population",
    note: "Eliminerer stillas/lift. 30–50% kostnadsreduksjon",
  },
  {
    department: "Vann og avløp",
    task: "Inspeksjon av vannverk/renseanlegg",
    manual_hours_per_event: 4,
    drone_hours_per_event: 0.75,
    events_per_year_base: 12,
    scalePer: 1,
    scaleBy: "fixed",
    note: "Autonom drone-in-a-box kan inspisere daglig",
  },
  {
    department: "Vann og avløp",
    task: "Lekkasjesøk i VA-nett (termisk)",
    manual_hours_per_event: 6,
    drone_hours_per_event: 1,
    events_per_year_base: 8,
    scalePer: 10000,
    scaleBy: "population",
    note: "Termisk drone finner lekkasjer fra luft på minutter",
  },
  {
    department: "Bygg og eiendom",
    task: "Fasadeinspeksjon kommunale bygg",
    manual_hours_per_event: 6,
    drone_hours_per_event: 0.75,
    events_per_year_base: 25,
    scalePer: 10000,
    scaleBy: "population",
    note: "Eliminerer stillas (50–200k per bygg). AI-defektdeteksjon",
  },
  {
    department: "Plan og geodata",
    task: "Kartoppdatering / ortofoto",
    manual_per_unit: 4,
    drone_per_unit: 0.3,
    scaleBy: "areaKm2_partial",
    note: "VTOL fixed-wing + Pix4D. 1 cm presisjon med PPK",
  },
  {
    department: "Plan og geodata",
    task: "3D-modell av sentrumsområder",
    manual_per_unit: 40,
    drone_per_unit: 3,
    scaleBy: "areaKm2_tiny",
    note: "Digital tvilling via RealityCapture/Skydio 3D Scan",
  },
  {
    department: "Landbruk",
    task: "Tilskuddskontroll jordbruksareal",
    manual_per_unit: 3,
    drone_per_unit: 0.2,
    scaleBy: "areaKm2_partial",
    note: "Multispektral analyse. Objektiv dokumentasjon",
  },
  {
    department: "Miljø og naturforvaltning",
    task: "Forurensningsovervåking vassdrag",
    manual_hours_per_event: 4,
    drone_hours_per_event: 0.5,
    events_per_year_base: 6,
    scalePer: 1,
    scaleBy: "fixed",
    note: "Autonom rute langs vassdrag. Termisk + RGB",
  },
  {
    department: "Helse og omsorg",
    task: "Transport av biologiske prøver",
    manual_hours_per_event: 1.5,
    drone_hours_per_event: 0.25,
    events_per_year_base: 50,
    scalePer: 10000,
    scaleBy: "population",
    note: "VTOL levering. Avhenger av BVLOS-godkjenning",
  },
];

function deptMatches(deptA: string, deptB: string): boolean {
  const a = deptA.toLowerCase();
  const b = deptB.toLowerCase();
  return a.includes(b.split(" ")[0]) || b.includes(a.split(" ")[0]);
}

export function computeTasks(props: Props) {
  const { population, areaKm2, roadKm, selectedDepartments } = props;
  const pop = population || 10000;
  const area = areaKm2 || 100;
  const roads = roadKm || 50;

  return TASK_TIME_ESTIMATES
    .filter(t => selectedDepartments.some(d => deptMatches(d, t.department)))
    .map(t => {
      let events = 0;
      let manualTotal = 0;
      let droneTotal = 0;

      if (t.scaleBy === "population" && t.events_per_year_base && t.scalePer) {
        events = Math.round(t.events_per_year_base * (pop / t.scalePer));
        manualTotal = events * (t.manual_hours_per_event || 0);
        droneTotal = events * (t.drone_hours_per_event || 0);
      } else if (t.scaleBy === "roadKm" && t.manual_per_unit && t.drone_per_unit) {
        const units = roads;
        manualTotal = units * t.manual_per_unit;
        droneTotal = units * t.drone_per_unit;
        events = Math.round(units);
      } else if (t.scaleBy === "areaKm2_partial" && t.manual_per_unit && t.drone_per_unit) {
        const units = Math.max(1, area * 0.05); // 5% of area
        manualTotal = units * t.manual_per_unit;
        droneTotal = units * t.drone_per_unit;
        events = Math.round(units);
      } else if (t.scaleBy === "areaKm2_tiny" && t.manual_per_unit && t.drone_per_unit) {
        const units = Math.max(0.5, area * 0.002); // 0.2% of area (town centers)
        manualTotal = units * t.manual_per_unit;
        droneTotal = units * t.drone_per_unit;
        events = Math.max(1, Math.round(units));
      } else if (t.scaleBy === "fixed") {
        events = t.events_per_year_base || 0;
        manualTotal = events * (t.manual_hours_per_event || 0);
        droneTotal = events * (t.drone_hours_per_event || 0);
      }

      return {
        department: t.department,
        task: t.task,
        note: t.note,
        manualHours: Math.round(manualTotal),
        droneHours: Math.round(droneTotal),
        savedHours: Math.round(manualTotal - droneTotal),
        savedPct: manualTotal > 0 ? Math.round(((manualTotal - droneTotal) / manualTotal) * 100) : 0,
      };
    })
    .filter(t => t.manualHours > 0);
}

export default function TimeSavingsSection(props: Props) {
  const tasks = computeTasks(props);
  if (tasks.length === 0) return null;

  const totalManual = tasks.reduce((s, t) => s + t.manualHours, 0);
  const totalDrone = tasks.reduce((s, t) => s + t.droneHours, 0);
  const totalSaved = totalManual - totalDrone;
  const savedPct = totalManual > 0 ? Math.round((totalSaved / totalManual) * 100) : 0;
  const yearlyFTE = (totalSaved / 1750).toFixed(1);

  const chartData = tasks.map(t => ({
    name: t.task.length > 28 ? t.task.substring(0, 26) + "…" : t.task,
    fullName: t.task,
    Manuelt: t.manualHours,
    Drone: t.droneHours,
    saved: t.savedPct,
  }));

  return (
    <section id="tidsbesparelse" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: "#1C0059" }}>
          ⏱ Tidsbesparelse: manuelt → drone
        </h2>
        <p className="text-sm mt-1" style={{ color: "#555555" }}>
          Basert på {props.municipalityName}s estimerte oppgavevolum
        </p>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border border-border p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ height: Math.max(300, tasks.length * 50) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} unit=" t" />
              <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11, fill: "#555" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number, name: string) => [`${value} timer/år`, name]}
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e8e5f8" }}
              />
              <Bar dataKey="Manuelt" fill="#F87171" radius={[0, 6, 6, 0]} barSize={16}>
                <LabelList dataKey="Manuelt" position="right" fill="#999" fontSize={10} formatter={(v: number) => `${v}t`} />
              </Bar>
              <Bar dataKey="Drone" fill="#34D399" radius={[0, 6, 6, 0]} barSize={16}>
                <LabelList dataKey="Drone" position="right" fill="#999" fontSize={10} formatter={(v: number) => `${v}t`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#F87171" }} />
            <span className="text-xs" style={{ color: "#555" }}>Manuell metode</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#34D399" }} />
            <span className="text-xs" style={{ color: "#555" }}>Med drone</span>
          </div>
        </div>
      </div>

      {/* Summary box */}
      <div className="rounded-2xl p-6 space-y-2" style={{ backgroundColor: "#1C0059" }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-display font-bold text-white">{totalManual.toLocaleString("nb-NO")}</p>
            <p className="text-xs text-white/60">timer/år i dag</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold" style={{ color: "#34D399" }}>{totalDrone.toLocaleString("nb-NO")}</p>
            <p className="text-xs text-white/60">timer/år med drone</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold" style={{ color: "#FF66C4" }}>{totalSaved.toLocaleString("nb-NO")}</p>
            <p className="text-xs text-white/60">timer spart ({savedPct}%)</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-white">{yearlyFTE}</p>
            <p className="text-xs text-white/60">årsverk frigjort</p>
          </div>
        </div>
      </div>

      {/* Task detail table */}
      <details className="group">
        <summary className="text-sm font-medium cursor-pointer" style={{ color: "#685BF8" }}>
          Vis detaljert oppgaveliste ({tasks.length} oppgaver)
        </summary>
        <div className="mt-3 bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left py-2.5 px-4 font-medium text-xs" style={{ color: "#999" }}>Oppgave</th>
                <th className="text-center py-2.5 px-3 font-medium text-xs" style={{ color: "#999" }}>Manuelt</th>
                <th className="text-center py-2.5 px-3 font-medium text-xs" style={{ color: "#999" }}>Drone</th>
                <th className="text-center py-2.5 px-3 font-medium text-xs" style={{ color: "#999" }}>Spart</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 px-4">
                    <p className="font-medium text-sm" style={{ color: "#1C0059" }}>{t.task}</p>
                    <p className="text-[10px]" style={{ color: "#999" }}>{t.department}</p>
                  </td>
                  <td className="py-2.5 px-3 text-center" style={{ color: "#F87171" }}>{t.manualHours}t</td>
                  <td className="py-2.5 px-3 text-center" style={{ color: "#34D399" }}>{t.droneHours}t</td>
                  <td className="py-2.5 px-3 text-center font-semibold" style={{ color: "#1C0059" }}>{t.savedPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
