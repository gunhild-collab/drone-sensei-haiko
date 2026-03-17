import { Info, AlertTriangle, ChevronDown, ChevronUp, Zap, Shield, Plane, Target, BookOpen } from "lucide-react";
import { useState } from "react";
import { DroneSpec } from "@/data/droneDatabase";

interface Props {
  drone: DroneSpec | null;
  scenario: string;
  sailRoman: string;
  sail: number;
  intrinsicGrc: number;
  finalGrc: number;
  initialArc: string;
  residualArc: string;
  operationType: string;
  populationDensity: string;
  warnings: string[];
  groundMitigationTotal: number;
  airMitigationCount: number;
}

const SCENARIO_INFO: Record<string, { emoji: string; label: string; shortDesc: string; fullDesc: string; allows: string[]; requires: string[]; submission: string }> = {
  'A1': { emoji: '🟢', label: 'Åpen A1', shortDesc: 'Fly over folk med liten drone', fullDesc: 'Du kan fly over folk (men ikke folkemengder) med en drone under 250g. Dette er den enkleste kategorien.', allows: ['Fly nær og over folk', 'Ingen søknad', 'Ingen operasjonsmanual'], requires: ['A1/A3 kompetansebevis (gratis online)', 'Drone registrert på flydrone.no', 'Forsikring'], submission: 'Ingen søknad — bare registrer dronen på flydrone.no' },
  'A2': { emoji: '🟢', label: 'Åpen A2', shortDesc: 'Fly nær folk med mellomstor drone', fullDesc: 'Du kan fly i nærheten av folk med en C2-drone opptil 4 kg. Krever A2-sertifikat (teori + selvtrening).', allows: ['Fly min. 30m fra folk', 'Ned til 5m med lav hastighet', 'Ingen søknad'], requires: ['A2-sertifikat (teori + selvtrening)', 'Drone registrert', 'Forsikring'], submission: 'Ingen søknad — bare registrer dronen på flydrone.no' },
  'A3': { emoji: '🟢', label: 'Åpen A3', shortDesc: 'Fly langt fra folk', fullDesc: 'Du kan fly i kontrollert/ubebodd område. Ingen ubeskyttede personer i nærheten.', allows: ['Droner opptil 25 kg', 'Ingen søknad'], requires: ['A1/A3 kompetansebevis', 'Ingen ubeskyttede personer i nærheten', 'Forsikring'], submission: 'Ingen søknad — bare registrer dronen på flydrone.no' },
  'STS-01': { emoji: '🔵', label: 'Standard STS-01', shortDesc: 'VLOS over kontrollert område', fullDesc: 'Standardscenario for VLOS-operasjoner. Forenklet prosess — du sender inn en deklarasjon (ikke full søknad). Krever C5-merket drone og STS-sertifikat.', allows: ['VLOS i kontrollert/tynt befolket', 'Forenklet deklarasjon', 'Operasjonsmanual etter mal'], requires: ['STS-sertifikat fra godkjent ATO', 'C5-merket drone', 'Operasjonsmanual', 'Deklarasjon NF-1172'], submission: 'Deklarasjon NF-1172 på luftfartstilsynet.no' },
  'STS-02': { emoji: '🔵', label: 'Standard STS-02', shortDesc: 'BVLOS i tynt befolket område', fullDesc: 'Standardscenario for BVLOS. Dronen må ha C6-merking med detect-and-avoid. Krever STS-sertifikat.', allows: ['BVLOS i tynt befolket', 'Forenklet deklarasjon'], requires: ['STS-sertifikat med BVLOS-tillegg', 'C6-drone med DAA', 'Operasjonsmanual', 'Deklarasjon NF-1172'], submission: 'Deklarasjon NF-1172 på luftfartstilsynet.no' },
  'PDRA-G01': { emoji: '🟡', label: 'PDRA-G01', shortDesc: 'VLOS, tynt befolket, lav risiko', fullDesc: 'Forhåndsdefinert risikovurdering for VLOS i tynt befolket område. Enklere enn full SORA — du bruker en ferdig samsvarsmatrise.', allows: ['VLOS i tynt befolket', 'Droner opptil 10 kg', 'Maks 50m AGL'], requires: ['Pilotsertifikat', 'Operasjonsmanual', 'Samsvarsmatrise PDRA-G01', 'Forsikring'], submission: 'Søknad NF-1145 via Altinn' },
  'PDRA-G02': { emoji: '🟡', label: 'PDRA-G02', shortDesc: 'VLOS, tynt befolket, middels risiko', fullDesc: 'Forhåndsdefinert risikovurdering for VLOS med tyngre droner i tynt befolket område.', allows: ['VLOS i tynt befolket', 'Droner opptil 25 kg', 'Maks 50m AGL'], requires: ['Pilotsertifikat', 'Operasjonsmanual', 'Samsvarsmatrise PDRA-G02', 'Forsikring'], submission: 'Søknad NF-1145 via Altinn' },
  'PDRA-G03': { emoji: '🟡', label: 'PDRA-G03', shortDesc: 'VLOS, befolket, mikrodroner', fullDesc: 'For lette droner (under 1 kg) i befolkede områder på lav høyde. Begrenset til 30m.', allows: ['VLOS i befolket område', 'Droner opptil 1 kg', 'Maks 30m AGL'], requires: ['Pilotsertifikat', 'Operasjonsmanual', 'Samsvarsmatrise PDRA-G03', 'ERP'], submission: 'Søknad NF-1145 via Altinn' },
  'PDRA-S01': { emoji: '🟡', label: 'PDRA-S01', shortDesc: 'VLOS, befolket område', fullDesc: 'For VLOS over befolket område med droner opptil 4 kg. Krever ERP og detaljert operasjonsmanual.', allows: ['VLOS i befolket', 'Droner opptil 4 kg'], requires: ['Pilotsertifikat', 'Operasjonsmanual', 'ERP', 'Samsvarsmatrise PDRA-S01'], submission: 'Søknad NF-1145 via Altinn' },
  'PDRA-S02': { emoji: '🟠', label: 'PDRA-S02', shortDesc: 'BVLOS, tynt befolket', fullDesc: 'BVLOS i tynt befolket/kontrollert område. Omfattende krav.', allows: ['BVLOS i tynt befolket', 'Droner opptil 25 kg'], requires: ['Pilotsertifikat', 'Operasjonsmanual', 'ConOps', 'ERP', 'Samsvarsmatrise'], submission: 'Søknad NF-1145 via Altinn' },
  'SORA-III-IV': { emoji: '🔴', label: 'Full SORA', shortDesc: 'Ingen standardscenario passer', fullDesc: 'Din operasjon passer ikke inn i noen standardscenario eller PDRA. Du må gjennomføre en full SORA-risikovurdering og sende komplett søknad til Luftfartstilsynet.', allows: ['Alt som kan dokumenteres trygt'], requires: ['Full SORA-risikovurdering', 'ConOps', 'Operasjonsmanual', 'OSO-dokumentasjon', 'ERP'], submission: 'Søknad NF-1145 via Altinn' },
  'SORA-V-VI': { emoji: '🔴', label: 'SORA (høy risiko)', shortDesc: 'Svært kompleks operasjon', fullDesc: 'SAIL V–VI krever høy robusthet på alle OSO-er. Ta kontakt med Luftfartstilsynet tidlig. Kan kreve LUC (Light UAS Operator Certificate).', allows: ['Komplekse operasjoner'], requires: ['Alt fra SORA III–IV', 'LUC kan kreves', 'Tidlig dialog med Luftfartstilsynet'], submission: 'Søknad NF-1145 via Altinn + tidlig dialog med tilsynet' },
};

const POP_LABELS: Record<string, string> = {
  controlled: 'Kontrollert', sparsely: 'Spredt', sparse: 'Spredt', populated: 'Befolket', gathering: 'Folkemengde',
};

function sailColor(sail: number): string {
  if (sail <= 2) return 'text-green-400';
  if (sail <= 4) return 'text-yellow-400';
  return 'text-red-400';
}

function sailBg(sail: number): string {
  if (sail <= 2) return 'bg-green-500/10 border-green-500/30';
  if (sail <= 4) return 'bg-yellow-500/10 border-yellow-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

export default function LiveSoraPanel({ drone, scenario, sailRoman, sail, intrinsicGrc, finalGrc, initialArc, residualArc, operationType, populationDensity, warnings, groundMitigationTotal, airMitigationCount }: Props) {
  const [expanded, setExpanded] = useState(true);
  const info = SCENARIO_INFO[scenario] || SCENARIO_INFO['SORA-III-IV'];

  return (
    <div className="sticky top-4 space-y-3">
      {/* Scenario card */}
      <div className={`rounded-xl border p-4 ${sailBg(sail)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{info.emoji}</span>
          <span className={`text-3xl font-bold font-mono ${sailColor(sail)}`}>{sailRoman || '—'}</span>
        </div>
        <p className="text-sora-text font-bold text-sm">{info.label}</p>
        <p className="text-sora-text-dim text-xs mt-0.5">{info.shortDesc}</p>
      </div>

      {/* Risk metrics */}
      <div className="bg-sora-surface border border-sora-border rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-sora-text-dim flex items-center gap-1"><Shield className="w-3 h-3" /> GRC</span>
          <span className="text-sora-text font-mono font-bold">{intrinsicGrc} → {finalGrc} <span className="text-sora-text-dim font-normal">({groundMitigationTotal > 0 ? `−${groundMitigationTotal}` : 'ingen reduksjon'})</span></span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-sora-text-dim flex items-center gap-1"><Plane className="w-3 h-3" /> ARC</span>
          <span className="text-sora-text font-mono font-bold">{initialArc} → {residualArc} <span className="text-sora-text-dim font-normal">({airMitigationCount > 0 ? `−${airMitigationCount}` : 'ingen reduksjon'})</span></span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-sora-text-dim flex items-center gap-1"><Target className="w-3 h-3" /> Type</span>
          <span className="text-sora-text font-bold">{operationType || '—'} · {POP_LABELS[populationDensity] || populationDensity}</span>
        </div>
      </div>

      {/* Drone limitations */}
      {drone && (
        <div className="bg-sora-surface border border-sora-border rounded-xl p-3 space-y-1.5">
          <p className="text-sora-text-dim text-[10px] font-semibold uppercase tracking-wider">Dronebegrensninger</p>
          <p className="text-sora-text text-xs font-bold">{drone.name}</p>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <span className="text-sora-text-dim">MTOM:</span><span className="text-sora-text font-mono">{drone.mtom} kg</span>
            <span className="text-sora-text-dim">Klasse:</span><span className="text-sora-text font-mono">{drone.categoryClass}</span>
            <span className="text-sora-text-dim">Maks høyde:</span><span className="text-sora-text font-mono">{drone.maxAltitude}m</span>
            <span className="text-sora-text-dim">Flygetid:</span><span className="text-sora-text font-mono">{drone.maxFlightTime} min</span>
            <span className="text-sora-text-dim">BVLOS:</span><span className={`font-mono ${drone.supportsBVLOS ? 'text-green-400' : 'text-red-400'}`}>{drone.supportsBVLOS ? 'Ja' : 'Nei'}</span>
            <span className="text-sora-text-dim">Fallskjerm:</span><span className={`font-mono ${drone.hasParachute ? 'text-green-400' : 'text-sora-text-dim'}`}>{drone.hasParachute ? 'Ja' : 'Nei'}</span>
            <span className="text-sora-text-dim">Remote ID:</span><span className={`font-mono ${drone.hasRemoteId ? 'text-green-400' : 'text-sora-text-dim'}`}>{drone.hasRemoteId ? 'Ja' : 'Nei'}</span>
          </div>
          {!drone.supportsBVLOS && operationType === 'BVLOS' && (
            <div className="mt-1.5 bg-destructive/10 border border-destructive/30 rounded-lg p-2 text-[11px] text-destructive flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>Denne dronen støtter ikke BVLOS. Du trenger en C6-drone eller spesialtilpasset system.</span>
            </div>
          )}
          {drone.categoryClass === 'C0' && operationType !== 'VLOS' && (
            <div className="mt-1.5 bg-destructive/10 border border-destructive/30 rounded-lg p-2 text-[11px] text-destructive flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>C0-drone er kun godkjent for åpen kategori (A1). Velg VLOS eller bytt drone.</span>
            </div>
          )}
        </div>
      )}

      {/* Scenario explanation */}
      <button onClick={() => setExpanded(!expanded)} className="w-full bg-sora-surface border border-sora-border rounded-xl p-3 text-left hover:bg-sora-surface-hover transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-sora-text-dim text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1"><BookOpen className="w-3 h-3" /> Hvorfor dette scenariet?</p>
          {expanded ? <ChevronUp className="w-3 h-3 text-sora-text-dim" /> : <ChevronDown className="w-3 h-3 text-sora-text-dim" />}
        </div>
        {expanded && (
          <div className="mt-2 space-y-2">
            <p className="text-sora-text text-xs leading-relaxed">{info.fullDesc}</p>
            <div>
              <p className="text-green-400 text-[10px] font-semibold mb-0.5">✓ Dette lar deg:</p>
              <ul className="text-sora-text-dim text-[11px] space-y-0.5 pl-3">
                {info.allows.map((a, i) => <li key={i}>• {a}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-sora-warning text-[10px] font-semibold mb-0.5">📋 Du trenger:</p>
              <ul className="text-sora-text-dim text-[11px] space-y-0.5 pl-3">
                {info.requires.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
            <div className="pt-1 border-t border-sora-border">
              <p className="text-sora-text-dim text-[10px]">📤 <strong>Innsending:</strong> {info.submission}</p>
            </div>
          </div>
        )}
      </button>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-sora-surface border border-sora-border rounded-xl p-3 space-y-1.5">
          <p className="text-sora-warning text-[10px] font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Advarsler</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-sora-text-dim text-[11px] leading-tight">⚠️ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export { SCENARIO_INFO };
