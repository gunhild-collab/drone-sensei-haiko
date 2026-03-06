import { SoraInputs, calculateInitialArc, calculateResidualArc } from "@/lib/soraCalculations";

interface Props {
  inputs: SoraInputs;
  onChange: (updates: Partial<SoraInputs>) => void;
}

const selectClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";
const labelClass = "block text-sm font-medium text-gray-300 mb-2";

const ARC_COLORS: Record<string, string> = {
  'ARC-a': 'text-green-400 bg-green-400/20',
  'ARC-b': 'text-yellow-400 bg-yellow-400/20',
  'ARC-c': 'text-orange-400 bg-orange-400/20',
  'ARC-d': 'text-red-400 bg-red-400/20',
};

const ARC_LABELS: Record<string, string> = {
  'ARC-a': 'ARC-a — Laveste luftrisiko',
  'ARC-b': 'ARC-b — Lav luftrisiko',
  'ARC-c': 'ARC-c — Middels luftrisiko',
  'ARC-d': 'ARC-d — Høy luftrisiko',
};

export default function SoraStep3({ inputs, onChange }: Props) {
  const initialArc = calculateInitialArc(inputs.airspaceClass);
  const residualArc = calculateResidualArc(initialArc, inputs.hasTransponder, inputs.hasAirspaceObservers, inputs.operationType === 'BVLOS');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Air Risk Class (ARC)</h2>
        <p className="text-gray-400 text-sm">Bestem luftrisiko basert på luftromsklasse og taktiske tiltak.</p>
      </div>

      <div>
        <label className={labelClass}>Luftromsklasse</label>
        <select className={selectClass} value={inputs.airspaceClass} onChange={e => onChange({ airspaceClass: e.target.value as any })}>
          <option value="uncontrolled_low">Ukontrollert G — lav høyde (&lt; 120 m)</option>
          <option value="uncontrolled_high">Ukontrollert G — høyere høyde</option>
          <option value="class_e">Klasse E</option>
          <option value="controlled">Kontrollert luftrom (C/D/A-B)</option>
        </select>
      </div>

      {/* Initial ARC */}
      <div className="flex items-center gap-4 bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a3e]">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${ARC_COLORS[initialArc]}`}>
          <span className="text-xl font-bold">{initialArc.split('-')[1]}</span>
        </div>
        <div>
          <p className="text-white font-semibold">Initial ARC</p>
          <p className="text-gray-400 text-sm">{ARC_LABELS[initialArc]}</p>
        </div>
      </div>

      {/* Tactical mitigations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Taktiske mitigasjoner</h3>

        <label className="flex items-center gap-3 bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e] cursor-pointer hover:border-[#7c3aed]/50 transition-colors">
          <input type="checkbox" checked={inputs.hasTransponder} onChange={e => onChange({ hasTransponder: e.target.checked })} className="w-5 h-5 rounded border-[#2a2a3e] bg-[#0f0f17] text-[#7c3aed] focus:ring-[#7c3aed]" />
          <div>
            <p className="text-white font-medium">Transponder / Remote ID aktiv</p>
            <p className="text-gray-400 text-sm">Kan redusere ARC med 1 nivå</p>
          </div>
        </label>

        <label className={`flex items-center gap-3 bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e] cursor-pointer hover:border-[#7c3aed]/50 transition-colors ${inputs.operationType !== 'BVLOS' ? 'opacity-50' : ''}`}>
          <input type="checkbox" checked={inputs.hasAirspaceObservers} disabled={inputs.operationType !== 'BVLOS'} onChange={e => onChange({ hasAirspaceObservers: e.target.checked })} className="w-5 h-5 rounded border-[#2a2a3e] bg-[#0f0f17] text-[#7c3aed] focus:ring-[#7c3aed]" />
          <div>
            <p className="text-white font-medium">Luftromsobservatørnettverk</p>
            <p className="text-gray-400 text-sm">{inputs.operationType !== 'BVLOS' ? 'Kun relevant for BVLOS' : 'Kan redusere ARC med 1 nivå'}</p>
          </div>
        </label>
      </div>

      {/* Residual ARC */}
      <div className="flex items-center gap-4 bg-[#1a1a2e] rounded-xl p-5 border border-[#ec4899]/30">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${ARC_COLORS[residualArc]}`}>
          <span className="text-xl font-bold">{residualArc.split('-')[1]}</span>
        </div>
        <div>
          <p className="text-white font-semibold">Residual ARC</p>
          <p className="text-gray-400 text-sm">{ARC_LABELS[residualArc]}{residualArc !== initialArc ? ` (redusert fra ${initialArc})` : ''}</p>
        </div>
      </div>
    </div>
  );
}
