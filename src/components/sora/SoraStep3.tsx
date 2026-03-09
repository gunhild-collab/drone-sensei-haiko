import { SoraInputs, calculateInitialArc, calculateResidualArc } from "@/lib/soraCalculations";
import { Info } from "lucide-react";

interface Props {
  inputs: SoraInputs;
  onChange: (updates: Partial<SoraInputs>) => void;
}

const selectClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";
const labelClass = "block text-sm font-medium text-gray-300 mb-2";
const sectionHintClass = "bg-[#1a1a2e]/50 border border-[#2a2a3e] rounded-lg p-3 text-xs text-gray-400 leading-relaxed flex gap-2";

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
        <p className="text-gray-400 text-sm">ARC beskriver risikoen for å kollidere med andre luftfartøy (fly, helikopter, andre droner). Bestemmes av hvor du flyr og hvilke tiltak du har.</p>
      </div>

      {/* Explanation box */}
      <div className={sectionHintClass}>
        <Info className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
        <div>
          <p className="text-gray-300 font-medium mb-1">Hva betyr luftromsklasse?</p>
          <p>Norsk luftrom er delt inn i klasser med ulike regler. <span className="text-white">Klasse G</span> (ukontrollert) er der de fleste droneoperasjoner skjer — her er det ingen flygeleder. <span className="text-white">Klasse E</span> og <span className="text-white">kontrollert luftrom (C/D)</span> er nær flyplasser og krever tillatelse fra Avinor/flykontroll. Jo «travlere» luftrommet, desto høyere ARC.</p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Luftromsklasse</label>
        <select className={selectClass} value={inputs.airspaceClass} onChange={e => onChange({ airspaceClass: e.target.value as any })}>
          <option value="uncontrolled_low">Ukontrollert G — lav høyde (&lt; 120 m) — Vanligste for droner</option>
          <option value="uncontrolled_high">Ukontrollert G — høyere høyde — Over 120 m, mer flytrafikk</option>
          <option value="class_e">Klasse E — Delvis kontrollert, typisk mellom 300–3000 m</option>
          <option value="controlled">Kontrollert luftrom (C/D/A-B) — Nær flyplasser, krever ATC-tillatelse</option>
        </select>
        <p className="text-xs text-gray-500 mt-1.5">Usikker? De fleste droneoperasjoner under 120 m utenfor flyplass-soner er i <span className="text-gray-300">Klasse G lav høyde</span>. Sjekk luftromskart på <a href="https://operatorportal.ninoxdrone.no/" target="_blank" rel="noopener noreferrer" className="text-[#7c3aed] hover:underline">Ninox</a>.</p>
      </div>

      {/* Initial ARC */}
      <div className="flex items-center gap-4 bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a3e]">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${ARC_COLORS[initialArc]}`}>
          <span className="text-xl font-bold">{initialArc.split('-')[1]}</span>
        </div>
        <div>
          <p className="text-white font-semibold">Initial ARC</p>
          <p className="text-gray-400 text-sm">{ARC_LABELS[initialArc]} — dette er utgangspunktet <em>før</em> dine sikkerhetstiltak.</p>
        </div>
      </div>

      {/* Tactical mitigations */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Taktiske mitigasjoner</h3>
          <p className="text-gray-400 text-sm mt-1">Tiltak som reduserer risikoen for kollisjon i luften. Hvert tiltak kan redusere ARC med ett nivå.</p>
        </div>

        <label className="flex items-start gap-3 bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e] cursor-pointer hover:border-[#7c3aed]/50 transition-colors">
          <input type="checkbox" checked={inputs.hasTransponder} onChange={e => onChange({ hasTransponder: e.target.checked })} className="w-5 h-5 rounded border-[#2a2a3e] bg-[#0f0f17] text-[#7c3aed] focus:ring-[#7c3aed] mt-0.5" />
          <div>
            <p className="text-white font-medium">Transponder / Remote ID aktiv</p>
            <p className="text-gray-400 text-sm">Dronen sender ut sin posisjon slik at andre luftfartøy og myndigheter kan se den. De fleste moderne droner har dette innebygd (DJI Remote ID, ADS-B).</p>
            <p className="text-gray-500 text-xs mt-1">→ Reduserer ARC med 1 nivå</p>
          </div>
        </label>

        <label className={`flex items-start gap-3 bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e] cursor-pointer hover:border-[#7c3aed]/50 transition-colors ${inputs.operationType !== 'BVLOS' ? 'opacity-50' : ''}`}>
          <input type="checkbox" checked={inputs.hasAirspaceObservers} disabled={inputs.operationType !== 'BVLOS'} onChange={e => onChange({ hasAirspaceObservers: e.target.checked })} className="w-5 h-5 rounded border-[#2a2a3e] bg-[#0f0f17] text-[#7c3aed] focus:ring-[#7c3aed] mt-0.5" />
          <div>
            <p className="text-white font-medium">Luftromsobservatørnettverk</p>
            <p className="text-gray-400 text-sm">
              {inputs.operationType !== 'BVLOS'
                ? 'Kun relevant for BVLOS-operasjoner. Velg BVLOS i steg 1 for å aktivere dette.'
                : 'Personer som overvåker luftrommet visuelt langs flygeruten og varsler piloten om annen lufttrafikk. Brukes når piloten ikke selv kan se dronen.'}
            </p>
            {inputs.operationType === 'BVLOS' && (
              <p className="text-gray-500 text-xs mt-1">→ Reduserer ARC med 1 nivå</p>
            )}
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
          <p className="text-gray-400 text-sm">{ARC_LABELS[residualArc]}{residualArc !== initialArc ? ` (redusert fra ${initialArc} takket være dine tiltak)` : ' — ingen reduksjon fra tiltak'}</p>
        </div>
      </div>

      <div className={sectionHintClass}>
        <Info className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
        <p>ARC-a er ideelt — det betyr lav risiko for luftkollisjon. ARC-c og ARC-d krever omfattende koordinering med flykontroll og kan gi SAIL V–VI. De fleste droneoperasjoner under 120 m i klasse G oppnår ARC-a eller ARC-b.</p>
      </div>
    </div>
  );
}
