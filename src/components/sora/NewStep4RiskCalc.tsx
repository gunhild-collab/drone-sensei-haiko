import { useMemo } from "react";
import { SoraInputs, SoraResults, calculateAll, sailToRoman, getGroupRobustness } from "@/lib/soraCalculations";
import { matchPdraScenarios, PdraScenario } from "@/data/pdraScenarios";
import { Info, AlertTriangle, CheckCircle, Shield } from "lucide-react";

interface Props {
  inputs: SoraInputs;
  results: SoraResults;
  onChange: (updates: Partial<SoraInputs>) => void;
}

function sailColor(sail: number): string {
  if (sail <= 2) return 'text-green-400';
  if (sail <= 4) return 'text-yellow-400';
  return 'text-red-400';
}

function sailBg(sail: number): string {
  if (sail <= 2) return 'bg-green-400/10 border-green-400/30';
  if (sail <= 4) return 'bg-yellow-400/10 border-yellow-400/30';
  return 'bg-red-400/10 border-red-400/30';
}

const selectClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";
const labelClass = "block text-sm font-medium text-gray-300 mb-2";

const GRC_TABLE = [
  { dim: '< 1 m', values: [1, 2, 3, 4] },
  { dim: '1–3 m', values: [2, 3, 4, 5] },
  { dim: '3–8 m', values: [3, 4, 5, 6] },
  { dim: '> 8 m', values: [4, 5, 6, 7] },
];
const POP_HEADERS = ['Kontrollert', 'Tynt befolket', 'Befolket', 'Forsamling'];

function getDimRow(dim: number) { return dim < 1 ? 0 : dim <= 3 ? 1 : dim <= 8 ? 2 : 3; }
function getPopCol(pop: string) { return { controlled: 0, sparsely: 1, populated: 2, gathering: 3 }[pop] ?? 0; }

const SAIL_MATRIX = [
  { label: 'GRC ≤ 2', values: ['I', 'I', 'II', 'IV'] },
  { label: 'GRC 3–4', values: ['II', 'II', 'IV', 'V'] },
  { label: 'GRC 5–6', values: ['III', 'IV', 'V', 'VI'] },
  { label: 'GRC ≥ 7', values: ['IV', 'V', 'VI', 'VI'] },
];

function getGrcRow(grc: number) { return grc <= 2 ? 0 : grc <= 4 ? 1 : grc <= 6 ? 2 : 3; }
function getArcCol(arc: string) { return ['ARC-a', 'ARC-b', 'ARC-c', 'ARC-d'].indexOf(arc); }

export default function NewStep4RiskCalc({ inputs, results, onChange }: Props) {
  const activeRow = getDimRow(inputs.characteristicDimension);
  const activeCol = getPopCol(inputs.populationDensity);
  const sailRow = getGrcRow(results.finalGrc);
  const sailCol = getArcCol(results.residualArc);

  const matchedScenarios = useMemo(() =>
    matchPdraScenarios(inputs.mtom, inputs.characteristicDimension, inputs.operationType, inputs.maxAltitude, inputs.populationDensity),
    [inputs]
  );

  const groups = getGroupRobustness(results.sail);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Risikoberegning</h2>
        <p className="text-gray-400 text-sm">Automatisk beregnet basert på kommune, drone og flygeområde. Juster mitigasjoner nedenfor.</p>
      </div>

      {/* PDRA/STS match */}
      {matchedScenarios.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-green-400 font-semibold text-sm">Mulig standard scenario funnet!</p>
              <p className="text-gray-300 text-xs mt-1">Din operasjon kan matche disse forhåndsdefinerte scenarioene:</p>
              <div className="mt-2 space-y-1">
                {matchedScenarios.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className="text-green-400 font-bold">{s.id}</span>
                    <span className="text-gray-300">— {s.name}</span>
                    <span className="text-gray-500">SAIL {s.sailLevel}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Vurder å bruke et standard scenario for enklere søknadsprosess. Fortsett med full SORA hvis ingen passer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GRC Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Ground Risk Class (GRC)</h3>

        {/* GRC Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-gray-400 px-3 py-2">Dimensjon</th>
                {POP_HEADERS.map((h, i) => (
                  <th key={h} className={`px-3 py-2 text-center ${i === activeCol ? 'text-[#7c3aed]' : 'text-gray-400'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRC_TABLE.map((row, ri) => (
                <tr key={ri} className={ri === activeRow ? 'bg-[#7c3aed]/10' : ''}>
                  <td className={`px-3 py-2 font-medium ${ri === activeRow ? 'text-[#7c3aed]' : 'text-gray-300'}`}>{row.dim}</td>
                  {row.values.map((v, ci) => (
                    <td key={ci} className={`px-3 py-2 text-center font-mono font-bold ${ri === activeRow && ci === activeCol ? 'text-[#ec4899] text-lg' : 'text-gray-400'}`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mitigations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>M1 — Strategisk mitigering</label>
            <select className={selectClass} value={inputs.m1} onChange={e => onChange({ m1: parseInt(e.target.value) as any })}>
              <option value={0}>Ingen tiltak (0)</option>
              <option value={-1}>Lav robusthet (−1)</option>
              <option value={-2}>Middels robusthet (−2)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>M2 — Treffenergi-reduksjon</label>
            <select className={selectClass} value={inputs.m2} onChange={e => onChange({ m2: parseInt(e.target.value) as any })}>
              <option value={0}>Ingen tiltak (0)</option>
              <option value={-1}>Lav robusthet (−1)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
          <div className="text-center">
            <p className="text-gray-500 text-xs">iGRC</p>
            <p className="text-[#7c3aed] text-2xl font-bold">{results.intrinsicGrc}</p>
          </div>
          <span className="text-gray-500">→</span>
          <div className="text-center">
            <p className="text-gray-500 text-xs">Final GRC</p>
            <p className="text-[#ec4899] text-2xl font-bold">{results.finalGrc}</p>
          </div>
        </div>
      </div>

      {/* ARC Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Air Risk Class (ARC)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Luftromsklasse</label>
            <select className={selectClass} value={inputs.airspaceClass} onChange={e => onChange({ airspaceClass: e.target.value as any })}>
              <option value="uncontrolled_low">Ukontrollert G — lav (&lt;120m)</option>
              <option value="uncontrolled_high">Ukontrollert G — høy</option>
              <option value="class_e">Klasse E</option>
              <option value="controlled">Kontrollert (C/D)</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={inputs.hasTransponder} onChange={e => onChange({ hasTransponder: e.target.checked })} className="w-4 h-4 rounded bg-[#0f0f17] border-[#2a2a3e] text-[#7c3aed] focus:ring-[#7c3aed]" />
              Transponder / Remote ID
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${inputs.operationType !== 'BVLOS' ? 'text-gray-600' : 'text-gray-300'}`}>
              <input type="checkbox" checked={inputs.hasAirspaceObservers} disabled={inputs.operationType !== 'BVLOS'} onChange={e => onChange({ hasAirspaceObservers: e.target.checked })} className="w-4 h-4 rounded bg-[#0f0f17] border-[#2a2a3e] text-[#7c3aed] focus:ring-[#7c3aed]" />
              Luftromsobservatører (kun BVLOS)
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
          <div className="text-center">
            <p className="text-gray-500 text-xs">Initial ARC</p>
            <p className="text-[#7c3aed] text-lg font-bold">{results.initialArc}</p>
          </div>
          <span className="text-gray-500">→</span>
          <div className="text-center">
            <p className="text-gray-500 text-xs">Residual ARC</p>
            <p className="text-[#ec4899] text-lg font-bold">{results.residualArc}</p>
          </div>
        </div>
      </div>

      {/* SAIL Matrix */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">SAIL-nivå</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-gray-400 px-3 py-2"></th>
                {['ARC-a', 'ARC-b', 'ARC-c', 'ARC-d'].map((h, i) => (
                  <th key={h} className={`px-3 py-2 text-center ${i === sailCol ? 'text-[#7c3aed]' : 'text-gray-400'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAIL_MATRIX.map((row, ri) => (
                <tr key={ri} className={ri === sailRow ? 'bg-[#7c3aed]/10' : ''}>
                  <td className={`px-3 py-2 font-medium ${ri === sailRow ? 'text-[#7c3aed]' : 'text-gray-300'}`}>{row.label}</td>
                  {row.values.map((v, ci) => (
                    <td key={ci} className={`px-3 py-2 text-center font-mono font-bold ${ri === sailRow && ci === sailCol ? 'text-[#ec4899] text-lg' : 'text-gray-400'}`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SAIL result */}
        <div className={`rounded-xl p-5 border ${sailBg(results.sail)}`}>
          <div className="flex items-center gap-4">
            <div className={`text-5xl font-bold ${sailColor(results.sail)}`}>{results.sailRoman}</div>
            <div>
              <p className="text-white font-bold text-lg">SAIL {results.sailRoman}</p>
              <p className="text-gray-400 text-sm">GRC {results.finalGrc} × {results.residualArc}</p>
            </div>
          </div>
        </div>

        {/* OSO summary */}
        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.name} className="flex items-center justify-between bg-[#1a1a2e] rounded-lg px-4 py-3 border border-[#2a2a3e]">
              <span className="text-gray-300 text-sm">{g.name}</span>
              <span className={`font-semibold text-sm ${g.level === 'Lav' ? 'text-green-400' : g.level === 'Middels' ? 'text-yellow-400' : 'text-red-400'}`}>{g.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
