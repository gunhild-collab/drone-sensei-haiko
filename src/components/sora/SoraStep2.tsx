import { SoraInputs, calculateIntrinsicGrc, calculateFinalGrc } from "@/lib/soraCalculations";
import { Info } from "lucide-react";

interface Props {
  inputs: SoraInputs;
  onChange: (updates: Partial<SoraInputs>) => void;
}

const selectClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";
const labelClass = "block text-sm font-medium text-gray-300 mb-2";
const hintClass = "text-xs text-gray-500 mt-1.5 leading-relaxed";
const sectionHintClass = "bg-[#1a1a2e]/50 border border-[#2a2a3e] rounded-lg p-3 text-xs text-gray-400 leading-relaxed flex gap-2";

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
        <p className="text-gray-400 text-sm">GRC beskriver risikoen for folk på bakken dersom dronen faller ned. Jo større drone og jo flere mennesker i området, desto høyere GRC.</p>
      </div>

      {/* Explanation box */}
      <div className={sectionHintClass}>
        <Info className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
        <div>
          <p className="text-gray-300 font-medium mb-1">Hvordan GRC beregnes</p>
          <p>Tabellen under viser GRC-verdien basert på to faktorer: <span className="text-white">dronens størrelse</span> (lengste side, «karakteristisk dimensjon») og <span className="text-white">hvor mange mennesker som befinner seg i operasjonsområdet</span>. Høyere GRC betyr strengere krav til sikkerhetstiltak og dokumentasjon.</p>
        </div>
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
          <p className="text-gray-400 text-sm">Grunnrisiko basert på {inputs.characteristicDimension || 0} m dimensjon i {inputs.populationDensity === 'controlled' ? 'kontrollert' : inputs.populationDensity === 'sparsely' ? 'tynt befolket' : inputs.populationDensity === 'populated' ? 'befolket' : 'forsamlings'}område — <em>før</em> sikkerhetstiltak.</p>
        </div>
      </div>

      {/* Mitigations */}
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-white">Bakkemitigasjoner</h3>
          <p className="text-gray-400 text-sm mt-1">Tiltak som reduserer risikoen for folk på bakken. Jo bedre tiltak, desto lavere endelig GRC — og enklere godkjenningsprosess.</p>
        </div>

        {/* M1 */}
        <div>
          <label className={labelClass}>M1 — Strategisk mitigering av bakkerisiko</label>
          <select className={selectClass} value={inputs.m1} onChange={e => onChange({ m1: parseInt(e.target.value) as any })}>
            <option value={0}>Ingen tiltak (0) — Ingen spesielle tiltak for å hindre overflyvning av mennesker</option>
            <option value={-1}>Lav robusthet (−1) — Grunnleggende tiltak, f.eks. NOTAM publisert, enkel sperring av området</option>
            <option value={-2}>Middels robusthet (−2) — Fysisk sperring, sikkerhetsvakter, kontrollert adgang til området</option>
          </select>
          <p className={hintClass}>
            M1 handler om hva du gjør for å <span className="text-gray-300">holde mennesker unna operasjonsområdet</span>. 
            «Ingen tiltak» betyr at du flyr over et område der folk kan være. 
            «Lav» betyr at du har tatt noen forholdsregler (f.eks. varslet om flygingen). 
            «Middels» betyr at du fysisk kontrollerer hvem som er i området under flygingen.
          </p>
        </div>

        {/* M2 */}
        <div>
          <label className={labelClass}>M2 — Reduksjon av effekt ved nedslag</label>
          <select className={selectClass} value={inputs.m2} onChange={e => onChange({ m2: parseInt(e.target.value) as any })}>
            <option value={0}>Ingen tiltak (0) — Dronen har ingen spesielle systemer for å begrense skade ved fall</option>
            <option value={-1}>Lav robusthet (−1) — Dronen har fallskjerm, frangibel konstruksjon eller annen energiabsorbering</option>
          </select>
          <p className={hintClass}>
            M2 handler om hva som skjer <span className="text-gray-300">dersom dronen faktisk faller ned</span>. 
            «Ingen tiltak» betyr at dronen treffer bakken med full kraft. 
            «Lav robusthet» betyr at dronen har systemer som reduserer skadepotensialet — 
            for eksempel en <span className="text-gray-300">fallskjerm</span> som bremser fallet, 
            eller en <span className="text-gray-300">knusbar konstruksjon</span> (frangibel) som absorberer energi ved nedslag.
          </p>
        </div>
      </div>

      {/* Final GRC */}
      <div className="flex items-center gap-4 bg-[#1a1a2e] rounded-xl p-5 border border-[#ec4899]/30">
        <div className="w-16 h-16 rounded-xl bg-[#ec4899]/20 flex items-center justify-center">
          <span className="text-3xl font-bold text-[#ec4899]">{finalGrc}</span>
        </div>
        <div>
          <p className="text-white font-semibold">Final GRC</p>
          <p className="text-gray-400 text-sm">
            Grunnrisiko ({intrinsicGrc}) etter sikkerhetstiltak: {inputs.m1 !== 0 ? `M1 (${inputs.m1})` : ''} {inputs.m2 !== 0 ? `${inputs.m1 !== 0 ? ' + ' : ''}M2 (${inputs.m2})` : ''}{inputs.m1 === 0 && inputs.m2 === 0 ? 'ingen mitigasjoner valgt' : ''} = <span className="text-white font-bold">{finalGrc}</span>
          </p>
        </div>
      </div>

      <div className={sectionHintClass}>
        <Info className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
        <p>Lavere Final GRC gir lavere SAIL-nivå, som betyr enklere søknadsprosess hos Luftfartstilsynet. GRC 1–2 er typisk for små droner i åpent terreng. GRC 5+ krever grundig dokumentasjon.</p>
      </div>
    </div>
  );
}
