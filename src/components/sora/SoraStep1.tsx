import { useState, useEffect } from "react";
import { Info, ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SoraInputs } from "@/lib/soraCalculations";

interface Props {
  inputs: SoraInputs;
  onChange: (updates: Partial<SoraInputs>) => void;
}

interface DronePlatform {
  id: string;
  manufacturer: string;
  model: string;
  max_takeoff_weight_kg: number | null;
  category: string;
  c_class: string | null;
  easa_category: string | null;
  max_flight_time_min: number | null;
  max_range_km: number | null;
  sensor_types: string[] | null;
  has_rtk: boolean | null;
  wind_resistance_ms: number | null;
  ip_rating: string | null;
}

const selectClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";
const inputClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";
const labelClass = "block text-sm font-medium text-gray-300 mb-2";

function InfoTooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block ml-1.5 align-middle">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#2a2a3e] text-gray-400 hover:text-white hover:bg-[#7c3aed]/40 transition-colors"
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-[#1e1e30] border border-[#2a2a3e] rounded-lg p-3 text-xs text-gray-300 shadow-xl">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[#1e1e30] border-r border-b border-[#2a2a3e]" />
          {children}
        </div>
      )}
    </span>
  );
}

const EASA_MAP_URL = "https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/statistical-population-density-easa-member-states";

export default function SoraStep1({ inputs, onChange }: Props) {
  const [drones, setDrones] = useState<DronePlatform[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<DronePlatform | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    supabase.from("drone_platforms").select("*").then(({ data }) => {
      if (data) setDrones(data as unknown as DronePlatform[]);
    });
  }, []);

  const handleDroneSelect = (value: string) => {
    const drone = drones.find(d => `${d.manufacturer} ${d.model}` === value);
    setSelectedDrone(drone || null);
    if (drone) {
      const dimEstimate = drone.max_takeoff_weight_kg
        ? drone.max_takeoff_weight_kg < 0.9 ? 0.3
        : drone.max_takeoff_weight_kg < 4 ? 0.7
        : drone.max_takeoff_weight_kg < 25 ? 1.5
        : 3.0
        : inputs.characteristicDimension;

      onChange({
        droneName: `${drone.manufacturer} ${drone.model}`,
        mtom: drone.max_takeoff_weight_kg || 0,
        characteristicDimension: dimEstimate,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Drone & operasjonsdata</h2>
        <p className="text-gray-400 text-sm">Velg drone fra databasen eller fyll inn manuelt.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className={labelClass}>Dronenavn</label>
          <select
            className={selectClass}
            value={inputs.droneName}
            onChange={e => handleDroneSelect(e.target.value)}
          >
            <option value="">— Velg drone fra databasen —</option>
            {drones.map(d => {
              const name = `${d.manufacturer} ${d.model}`;
              return <option key={d.id} value={name}>{name}</option>;
            })}
          </select>
        </div>

        <div>
          <label className={labelClass}>MTOM (kg)</label>
          <input className={inputClass} type="number" min={0} max={150} step={0.1} placeholder="0–150" value={inputs.mtom || ''} onChange={e => onChange({ mtom: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className={labelClass}>Karakteristisk dimensjon (m)</label>
          <input className={inputClass} type="number" min={0} step={0.01} placeholder="Lengste side i meter" value={inputs.characteristicDimension || ''} onChange={e => onChange({ characteristicDimension: parseFloat(e.target.value) || 0 })} />
        </div>

        {selectedDrone && (
          <div className="md:col-span-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {selectedDrone.c_class && (
              <div><span className="text-gray-500">C-klasse</span><p className="text-white font-medium">{selectedDrone.c_class}</p></div>
            )}
            {selectedDrone.easa_category && (
              <div><span className="text-gray-500">EASA-kategori</span><p className="text-white font-medium">{selectedDrone.easa_category}</p></div>
            )}
            {selectedDrone.max_flight_time_min && (
              <div><span className="text-gray-500">Flytid</span><p className="text-white font-medium">{selectedDrone.max_flight_time_min} min</p></div>
            )}
            {selectedDrone.max_range_km && (
              <div><span className="text-gray-500">Rekkevidde</span><p className="text-white font-medium">{selectedDrone.max_range_km} km</p></div>
            )}
            {selectedDrone.wind_resistance_ms && (
              <div><span className="text-gray-500">Vindmotstand</span><p className="text-white font-medium">{selectedDrone.wind_resistance_ms} m/s</p></div>
            )}
            {selectedDrone.ip_rating && (
              <div><span className="text-gray-500">IP-klasse</span><p className="text-white font-medium">{selectedDrone.ip_rating}</p></div>
            )}
            {selectedDrone.has_rtk && (
              <div><span className="text-gray-500">RTK</span><p className="text-white font-medium">Ja</p></div>
            )}
            {selectedDrone.sensor_types && selectedDrone.sensor_types.length > 0 && (
              <div className="col-span-2"><span className="text-gray-500">Sensorer</span><p className="text-white font-medium">{selectedDrone.sensor_types.join(', ')}</p></div>
            )}
          </div>
        )}

        <div>
          <label className={labelClass}>
            Operasjonstype
            <InfoTooltip>
              <p className="font-semibold text-white mb-1">Operasjonstyper</p>
              <ul className="space-y-1.5">
                <li><span className="text-[#7c3aed] font-medium">VLOS</span> — Visual Line of Sight. Piloten ser dronen direkte til enhver tid uten hjelpemidler (unntatt briller).</li>
                <li><span className="text-[#7c3aed] font-medium">EVLOS</span> — Extended VLOS. Piloten bruker observatører som opprettholder visuell kontakt og kommuniserer med piloten.</li>
                <li><span className="text-[#7c3aed] font-medium">BVLOS</span> — Beyond Visual Line of Sight. Dronen opereres utenfor synsrekkevidde. Krever høyere SAIL og ekstra mitigasjoner.</li>
              </ul>
            </InfoTooltip>
          </label>
          <select className={selectClass} value={inputs.operationType} onChange={e => onChange({ operationType: e.target.value as any })}>
            <option value="VLOS">VLOS</option>
            <option value="EVLOS">EVLOS</option>
            <option value="BVLOS">BVLOS</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            Dag/natt
            <InfoTooltip>
              <p className="font-semibold text-white mb-1">Dag- og nattoperasjoner</p>
              <ul className="space-y-1.5">
                <li><span className="text-[#7c3aed] font-medium">Dag</span> — Operasjon i dagslys. Enkleste kategori med færrest tilleggskrav.</li>
                <li><span className="text-[#7c3aed] font-medium">Natt</span> — Operasjon i mørke. Krever anti-kollisjonslys, god belysning av operasjonsområdet og ekstra risikovurdering.</li>
                <li><span className="text-[#7c3aed] font-medium">Begge</span> — Operasjonen kan utføres både dag og natt. Dokumentasjonen må dekke begge scenarioer.</li>
              </ul>
            </InfoTooltip>
          </label>
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
        <div>
          <label className={labelClass}>
            Befolkningstetthet i overflyvningsområdet
            <InfoTooltip>
              <p className="font-semibold text-white mb-1">Befolkningstetthet (SORA 2.5)</p>
              <ul className="space-y-1.5">
                <li><span className="text-[#7c3aed] font-medium">Kontrollert</span> — Bakkeområdet er sperret og kontrollert. Ingen uvedkommende.</li>
                <li><span className="text-[#7c3aed] font-medium">Tynt befolket</span> — Landlig område med lav befolkningstetthet.</li>
                <li><span className="text-[#7c3aed] font-medium">Befolket</span> — Tettsted eller by med moderat tetthet.</li>
                <li><span className="text-[#7c3aed] font-medium">Forsamling</span> — Store folkemengder (konserter, idrettsarrangement o.l.).</li>
              </ul>
              <p className="mt-2 text-gray-400">Bruk «Velg på kart» for å sjekke EASAs befolkningstetthets&shy;kart.</p>
            </InfoTooltip>
          </label>
          <div className="flex gap-2">
            <select className={`${selectClass} flex-1`} value={inputs.populationDensity} onChange={e => onChange({ populationDensity: e.target.value as any })}>
              <option value="controlled">Kontrollert bakkeområde</option>
              <option value="sparsely">Tynt befolket</option>
              <option value="populated">Befolket</option>
              <option value="gathering">Forsamling av mennesker</option>
            </select>
            <button
              type="button"
              onClick={() => setShowMapModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#7c3aed]/20 text-[#7c3aed] hover:bg-[#7c3aed]/30 border border-[#7c3aed]/30 transition-colors text-xs font-medium whitespace-nowrap"
            >
              🗺️ Velg på kart
            </button>
          </div>
        </div>
      </div>

      {/* EASA Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#12121f] border border-[#2a2a3e] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a3e]">
              <div>
                <h3 className="text-white font-bold text-lg">EASA befolkningstetthets&shy;kart</h3>
                <p className="text-gray-400 text-xs mt-0.5">Finn ditt operasjonsområde og velg riktig kategori under</p>
              </div>
              <button onClick={() => setShowMapModal(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 p-4">
              <div className="bg-[#1a1a2e] rounded-lg overflow-hidden h-[50vh]">
                <iframe
                  src={EASA_MAP_URL}
                  className="w-full h-full border-0"
                  title="EASA Population Density Map"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
              <a
                href={EASA_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-[#7c3aed] hover:underline"
              >
                Åpne i nytt vindu <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="border-t border-[#2a2a3e] p-4">
              <p className="text-gray-400 text-xs mb-3">Basert på kartet, velg befolkningstetthet for ditt operasjonsområde:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {([
                  { value: 'controlled', label: 'Kontrollert', desc: 'Sperret område', color: 'bg-green-500/20 border-green-500/40 text-green-300' },
                  { value: 'sparsely', label: 'Tynt befolket', desc: '< 50 innb/km²', color: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
                  { value: 'populated', label: 'Befolket', desc: '50–500 innb/km²', color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
                  { value: 'gathering', label: 'Forsamling', desc: 'Store folkemengder', color: 'bg-red-500/20 border-red-500/40 text-red-300' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange({ populationDensity: opt.value });
                      setShowMapModal(false);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all hover:scale-[1.02] ${
                      inputs.populationDensity === opt.value
                        ? opt.color + ' ring-1 ring-white/20'
                        : 'bg-[#1a1a2e] border-[#2a2a3e] text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
