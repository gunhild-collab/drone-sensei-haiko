import { SoraInputs } from "@/lib/soraCalculations";

interface Props {
  inputs: SoraInputs;
  onChange: (updates: Partial<SoraInputs>) => void;
}

const selectClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";
const inputClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";
const labelClass = "block text-sm font-medium text-gray-300 mb-2";

export default function SoraStep1({ inputs, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Drone & operasjonsdata</h2>
        <p className="text-gray-400 text-sm">Fyll inn grunnleggende data om dronen og operasjonen.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Dronenavn</label>
          <input className={inputClass} placeholder="f.eks. DJI Mavic 3 Enterprise" value={inputs.droneName} onChange={e => onChange({ droneName: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>MTOM (kg)</label>
          <input className={inputClass} type="number" min={0} max={150} step={0.1} placeholder="0–150" value={inputs.mtom || ''} onChange={e => onChange({ mtom: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className={labelClass}>Karakteristisk dimensjon (m)</label>
          <input className={inputClass} type="number" min={0} step={0.01} placeholder="Lengste side i meter" value={inputs.characteristicDimension || ''} onChange={e => onChange({ characteristicDimension: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className={labelClass}>Operasjonstype</label>
          <select className={selectClass} value={inputs.operationType} onChange={e => onChange({ operationType: e.target.value as any })}>
            <option value="VLOS">VLOS</option>
            <option value="EVLOS">EVLOS</option>
            <option value="BVLOS">BVLOS</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Dag/natt</label>
          <select className={selectClass} value={inputs.dayNight} onChange={e => onChange({ dayNight: e.target.value as any })}>
            <option value="day">Dag</option>
            <option value="night">Natt</option>
            <option value="both">Begge</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Maks høyde AGL (m)</label>
          <input className={inputClass} type="number" min={0} step={1} placeholder="f.eks. 120" value={inputs.maxAltitude || ''} onChange={e => onChange({ maxAltitude: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Befolkningstetthet i overflyvningsområdet</label>
          <select className={selectClass} value={inputs.populationDensity} onChange={e => onChange({ populationDensity: e.target.value as any })}>
            <option value="controlled">Kontrollert bakkeområde</option>
            <option value="sparsely">Tynt befolket</option>
            <option value="populated">Befolket</option>
            <option value="gathering">Forsamling av mennesker</option>
          </select>
        </div>
      </div>
    </div>
  );
}
