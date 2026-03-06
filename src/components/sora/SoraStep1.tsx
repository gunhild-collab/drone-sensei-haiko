import { useState, useEffect } from "react";
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

export default function SoraStep1({ inputs, onChange }: Props) {
  const [drones, setDrones] = useState<DronePlatform[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<DronePlatform | null>(null);

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
        <div>
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
