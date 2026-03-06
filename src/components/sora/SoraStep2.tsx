import { SoraInputs, calculateIntrinsicGrc, calculateFinalGrc } from "@/lib/soraCalculations";

interface Props {
  inputs: SoraInputs;
  onChange: (updates: Partial<SoraInputs>) => void;
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

function getDimRow(dim: number): number {
  if (dim < 1) return 0;
  if (dim <= 3) return 1;
  if (dim <= 8) return 2;
  return 3;
}

function getPopCol(pop: string): number {
  const map: Record<string, number> = { controlled: 0, sparsely: 1, populated: 2, gathering: 3 };
  return map[pop] ?? 0;
}

export default function SoraStep2({ inputs, onChange }: Props) {
  const intrinsicGrc = calculateIntrinsicGrc(inputs.characteristicDimension, inputs.populationDensity);
  const finalGrc = calculateFinalGrc(intrinsicGrc, inputs.m1, inputs.m2);
  const activeRow = getDimRow(inputs.characteristicDimension);
  const activeCol = getPopCol(inputs.populationDensity);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Ground Risk Class (GRC)</h2>
        <p className="text-gray-400 text-sm">Beregnet basert på karakteristisk dimensjon og befolkningstetthet.</p>
      </div>

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
                  <td key={ci} className={`px-3 py-2 text-center font-mono font-bold ${ri === activeRow && ci === activeCol ? 'text-[#ec4899] text-lg' : 'text-gray-400'}`}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Intrinsic GRC */}
      <div className="flex items-center gap-4 bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a3e]">
        <div className="w-16 h-16 rounded-xl bg-[#7c3aed]/20 flex items-center justify-center">
          <span className="text-3xl font-bold text-[#7c3aed]">{intrinsicGrc}</span>
        </div>
        <div>
          <p className="text-white font-semibold">Intrinsic GRC</p>
          <p className="text-gray-400 text-sm">Basert på {inputs.characteristicDimension || 0} m dimensjon i {inputs.populationDensity === 'controlled' ? 'kontrollert' : inputs.populationDensity === 'sparsely' ? 'tynt befolket' : inputs.populationDensity === 'populated' ? 'befolket' : 'forsamlings'}område</p>
        </div>
      </div>

      {/* Mitigations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Bakkemitigasjoner</h3>
        <div>
          <label className={labelClass}>M1 — Strategisk mitigering</label>
          <select className={selectClass} value={inputs.m1} onChange={e => onChange({ m1: parseInt(e.target.value) as any })}>
            <option value={0}>Ingen (0)</option>
            <option value={-1}>Lav robusthet (−1)</option>
            <option value={-2}>Middels robusthet (−2)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>M2 — Effekt av nedslag</label>
          <select className={selectClass} value={inputs.m2} onChange={e => onChange({ m2: parseInt(e.target.value) as any })}>
            <option value={0}>Ingen (0)</option>
            <option value={-1}>Lav robusthet (−1)</option>
          </select>
        </div>
      </div>

      {/* Final GRC */}
      <div className="flex items-center gap-4 bg-[#1a1a2e] rounded-xl p-5 border border-[#ec4899]/30">
        <div className="w-16 h-16 rounded-xl bg-[#ec4899]/20 flex items-center justify-center">
          <span className="text-3xl font-bold text-[#ec4899]">{finalGrc}</span>
        </div>
        <div>
          <p className="text-white font-semibold">Final GRC</p>
          <p className="text-gray-400 text-sm">Intrinsic GRC ({intrinsicGrc}) {inputs.m1 !== 0 ? `+ M1 (${inputs.m1})` : ''} {inputs.m2 !== 0 ? `+ M2 (${inputs.m2})` : ''} = {finalGrc}</p>
        </div>
      </div>
    </div>
  );
}
