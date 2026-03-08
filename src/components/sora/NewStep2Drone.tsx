import { useState, useMemo } from "react";
import { Search, Plane } from "lucide-react";
import { DRONE_DATABASE, DroneSpec } from "@/data/droneDatabase";

interface Props {
  selectedDrone: DroneSpec | null;
  onSelect: (drone: DroneSpec) => void;
}

const inputClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";

export default function NewStep2Drone({ selectedDrone, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return DRONE_DATABASE;
    const q = search.toLowerCase();
    return DRONE_DATABASE.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.manufacturer.toLowerCase().includes(q) ||
      d.categoryClass.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Velg drone</h2>
        <p className="text-gray-400 text-sm">Alle tekniske verdier fylles inn automatisk. Dronedatabasen vil kobles til Airtable senere.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          className={`${inputClass} pl-11`}
          placeholder="Søk etter drone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Drone list */}
      <div className="space-y-2">
        {filtered.map(drone => {
          const isSelected = selectedDrone?.id === drone.id;
          return (
            <button
              key={drone.id}
              onClick={() => onSelect(drone)}
              className={`w-full text-left bg-[#1a1a2e] rounded-xl p-4 border transition-all ${
                isSelected
                  ? 'border-[#7c3aed] ring-1 ring-[#7c3aed]/50'
                  : 'border-[#2a2a3e] hover:border-[#7c3aed]/40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#7c3aed]/20 text-[#7c3aed]' : 'bg-[#0f0f17] text-gray-500'}`}>
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{drone.name}</p>
                    <p className="text-gray-500 text-xs">{drone.manufacturer} • {drone.categoryClass}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {drone.supportsBVLOS && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7c3aed]/20 text-[#7c3aed] font-bold">BVLOS</span>
                  )}
                  <span className="text-gray-500 text-xs">{drone.mtom} kg</span>
                </div>
              </div>

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-[#2a2a3e] grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-gray-500">MTOM</p>
                    <p className="text-white font-bold">{drone.mtom} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Dimensjon</p>
                    <p className="text-white font-bold">{drone.characteristicDimension} m</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Maks hastighet</p>
                    <p className="text-white font-bold">{drone.maxSpeed} m/s</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Flytid</p>
                    <p className="text-white font-bold">{drone.maxFlightTime} min</p>
                  </div>
                  <div>
                    <p className="text-gray-500">C-klasse</p>
                    <p className="text-white font-bold">{drone.categoryClass}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">BVLOS</p>
                    <p className="text-white font-bold">{drone.supportsBVLOS ? 'Ja' : 'Nei'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Propulsjon</p>
                    <p className="text-white font-bold capitalize">{drone.propulsion}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Remote ID</p>
                    <p className="text-white font-bold">{drone.hasRemoteId ? 'Ja' : 'Nei'}</p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
