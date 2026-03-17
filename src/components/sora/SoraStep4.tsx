import { SoraResults, getGroupRobustness, sailToRoman, getContainmentRequirements } from "@/lib/soraCalculations";

interface Props {
  results: SoraResults;
}

function sailColor(sail: number): string {
  if (sail <= 2) return 'text-green-400 bg-green-400/20 border-green-400/30';
  if (sail <= 4) return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
  return 'text-red-400 bg-red-400/20 border-red-400/30';
}

function sailBg(sail: number): string {
  if (sail <= 2) return 'from-green-500/10 to-green-500/5';
  if (sail <= 4) return 'from-yellow-500/10 to-yellow-500/5';
  return 'from-red-500/10 to-red-500/5';
}

// SORA 2.5 exact per-GRC-row SAIL matrix
const SAIL_MATRIX_DISPLAY = [
  { label: 'GRC = 1', values: ['I', 'I', 'I', 'II'] },
  { label: 'GRC = 2', values: ['I', 'I', 'II', 'II'] },
  { label: 'GRC = 3', values: ['I', 'II', 'II', 'III'] },
  { label: 'GRC = 4', values: ['II', 'II', 'III', 'IV'] },
  { label: 'GRC = 5', values: ['II', 'III', 'III', 'V'] },
  { label: 'GRC = 6', values: ['III', 'IV', 'V', 'VI'] },
  { label: 'GRC = 7', values: ['IV', 'V', 'VI', 'VI'] },
];

function getActiveRow(grc: number): number {
  return Math.min(Math.max(grc, 1), 7) - 1;
}

function getActiveCol(arc: string): number {
  return ['ARC-a', 'ARC-b', 'ARC-c', 'ARC-d'].indexOf(arc);
}

const robustnessColor: Record<string, string> = {
  'Lav': 'text-green-400',
  'Middels': 'text-yellow-400',
  'Høy': 'text-red-400',
};

export default function SoraStep4({ results }: Props) {
  const groups = getGroupRobustness(results.sail);
  const activeRow = getActiveRow(results.finalGrc);
  const activeCol = getActiveCol(results.residualArc);

  const recommendation = results.sail <= 2
    ? 'Forenklet søknadsprosess. Redusert dokumentasjonskrav i SORA 2.5.'
    : results.sail <= 4
      ? 'Standard SORA-prosess. Anbefaler ekstern rådgiver for OSO-dokumentasjon.'
      : 'Kompleks operasjon. Krever høy robusthet på alle OSO-er. Ta kontakt med Luftfartstilsynet tidlig.';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">SAIL & Resultater</h2>
        <p className="text-gray-400 text-sm">Beregnet SAIL-nivå basert på Final GRC og Residual ARC.</p>
      </div>

      {/* SAIL Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-gray-400 px-3 py-2"></th>
              {['ARC-a', 'ARC-b', 'ARC-c', 'ARC-d'].map((h, i) => (
                <th key={h} className={`px-3 py-2 text-center ${i === activeCol ? 'text-[#7c3aed]' : 'text-gray-400'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAIL_MATRIX_DISPLAY.map((row, ri) => (
              <tr key={ri} className={ri === activeRow ? 'bg-[#7c3aed]/10' : ''}>
                <td className={`px-3 py-2 font-medium ${ri === activeRow ? 'text-[#7c3aed]' : 'text-gray-300'}`}>{row.label}</td>
                {row.values.map((v, ci) => (
                  <td key={ci} className={`px-3 py-2 text-center font-mono font-bold ${ri === activeRow && ci === activeCol ? 'text-[#ec4899] text-lg' : 'text-gray-400'}`}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SAIL Result */}
      <div className={`rounded-xl p-6 border bg-gradient-to-br ${sailBg(results.sail)} ${sailColor(results.sail)}`}>
        <div className="flex items-center gap-5">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${sailColor(results.sail)}`}>
            <span className="text-4xl font-bold">{results.sailRoman}</span>
          </div>
          <div>
            <p className="text-white text-xl font-bold">SAIL {results.sailRoman}</p>
            <p className="text-gray-300 text-sm mt-1">Final GRC: {results.finalGrc} | Residual ARC: {results.residualArc}</p>
          </div>
        </div>
      </div>

      {/* OSO Summary */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">OSO-krav (forenklet)</h3>
        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.name} className="flex items-center justify-between bg-[#1a1a2e] rounded-lg px-4 py-3 border border-[#2a2a3e]">
              <span className="text-gray-300 text-sm">{g.name}</span>
              <span className={`font-semibold text-sm ${robustnessColor[g.level]}`}>{g.level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-[#1a1a2e] rounded-xl p-5 border border-[#7c3aed]/30">
        <h3 className="text-white font-semibold mb-2">Anbefalt neste steg</h3>
        <p className="text-gray-300 text-sm">{recommendation}</p>
      </div>
    </div>
  );
}
