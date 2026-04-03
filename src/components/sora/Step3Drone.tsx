import { useState, useMemo } from "react";
import { Search, Check, Plane } from "lucide-react";
import { DroneSpec } from "@/data/droneDatabase";
import { useDronePlatforms } from "@/hooks/useDronePlatforms";

interface Props {
  selectedDrone: DroneSpec | null;
  onSelect: (drone: DroneSpec) => void;
}

const fieldClass = "bg-sora-bg rounded-lg p-3";
const labelClass = "text-sora-text-dim text-xs";
const valueClass = "text-sora-text font-semibold text-sm";

export default function Step3Drone({ selectedDrone, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return DRONE_DATABASE;
    const q = search.toLowerCase();
    return DRONE_DATABASE.filter(d => d.name.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Velg dronemodell</h2>
        <p className="text-sora-text-muted text-sm">Velg dronen som skal brukes i operasjonen.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-text-dim" />
        <input
          type="text"
          className="w-full bg-sora-surface border border-sora-border rounded-lg pl-10 pr-4 py-3 text-sora-text placeholder:text-sora-text-dim focus:outline-none focus:ring-2 focus:ring-sora-purple transition-colors"
          placeholder="Søk etter drone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Drone list */}
      <div className="grid gap-2">
        {filtered.map(d => (
          <button
            key={d.id}
            onClick={() => onSelect(d)}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
              selectedDrone?.id === d.id
                ? 'bg-sora-purple/10 border-sora-purple'
                : 'bg-sora-surface border-sora-border hover:bg-sora-surface-hover'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedDrone?.id === d.id ? 'bg-sora-purple/20' : 'bg-sora-bg'}`}>
                <Plane className={`w-5 h-5 ${selectedDrone?.id === d.id ? 'text-sora-purple' : 'text-sora-text-dim'}`} />
              </div>
              <div>
                <p className="text-sora-text font-medium text-sm">{d.name}</p>
                <p className="text-sora-text-dim text-xs">
                  {d.manufacturer} · {d.mtom} kg · {d.categoryClass} · {d.easaCategory}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {d.supportsBVLOS && <span className="text-xs px-2 py-0.5 rounded-full bg-sora-purple/20 text-sora-purple">BVLOS</span>}
              {d.hasThermal && <span className="text-xs px-2 py-0.5 rounded-full bg-sora-pink/20 text-sora-pink">Termisk</span>}
              {d.hasRTK && <span className="text-xs px-2 py-0.5 rounded-full bg-sora-success/20 text-sora-success">RTK</span>}
              {selectedDrone?.id === d.id && <Check className="w-5 h-5 text-sora-purple" />}
            </div>
          </button>
        ))}
      </div>

      {/* Selected drone details */}
      {selectedDrone && (
        <div className="bg-sora-surface border border-sora-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sora-purple font-semibold">
            <Plane className="w-4 h-4" />
            {selectedDrone.name}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={fieldClass}>
              <p className={labelClass}>MTOM</p>
              <p className={valueClass}>{selectedDrone.mtom} kg</p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>Karakteristisk dimensjon</p>
              <p className={valueClass}>{selectedDrone.characteristicDimension} m</p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>Maks hastighet</p>
              <p className={valueClass}>{selectedDrone.maxSpeed} m/s</p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>C-klasse</p>
              <p className={valueClass}>{selectedDrone.categoryClass}</p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>EASA-kategori</p>
              <p className={valueClass}>{selectedDrone.easaCategory}</p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>Flytid</p>
              <p className={valueClass}>{selectedDrone.maxFlightTime} min</p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>BVLOS-kapabel</p>
              <p className={`font-semibold text-sm ${selectedDrone.supportsBVLOS ? 'text-sora-success' : 'text-sora-danger'}`}>
                {selectedDrone.supportsBVLOS ? 'Ja' : 'Nei'}
              </p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>Termisk kamera</p>
              <p className={`font-semibold text-sm ${selectedDrone.hasThermal ? 'text-sora-success' : 'text-sora-text-dim'}`}>
                {selectedDrone.hasThermal ? 'Ja' : 'Nei'}
              </p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>Fallskjerm</p>
              <p className={`font-semibold text-sm ${selectedDrone.hasParachute ? 'text-sora-success' : 'text-sora-text-dim'}`}>
                {selectedDrone.hasParachute ? 'Ja' : 'Nei'}
              </p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>RTK</p>
              <p className={`font-semibold text-sm ${selectedDrone.hasRTK ? 'text-sora-success' : 'text-sora-text-dim'}`}>
                {selectedDrone.hasRTK ? 'Ja' : 'Nei'}
              </p>
            </div>
            <div className={fieldClass}>
              <p className={labelClass}>Remote ID</p>
              <p className={`font-semibold text-sm ${selectedDrone.hasRemoteId ? 'text-sora-success' : 'text-sora-danger'}`}>
                {selectedDrone.hasRemoteId ? 'Ja' : 'Nei'}
              </p>
            </div>
            {selectedDrone.payloadKg > 0 && (
              <div className={fieldClass}>
                <p className={labelClass}>Payload</p>
                <p className={valueClass}>{selectedDrone.payloadKg} kg</p>
              </div>
            )}
          </div>
          {selectedDrone.notes && (
            <p className="text-sora-text-muted text-xs italic">{selectedDrone.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
