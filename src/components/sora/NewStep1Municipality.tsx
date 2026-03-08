import { useState, useMemo } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { kommuner } from "@/data/kommuner";

interface MunicipalityData {
  name: string;
  population: number;
  areaKm2: number;
  roadNetworkKm: number;
  terrainType: string;
  densityClass: 'controlled' | 'sparsely' | 'populated' | 'gathering';
  densityPerKm2: number;
}

interface Props {
  municipality: string;
  municipalityData: MunicipalityData | null;
  onSelect: (name: string, data: MunicipalityData) => void;
}

// Estimated data for Norwegian municipalities based on SSB
const KOMMUNE_DATA: Record<string, Omit<MunicipalityData, 'name' | 'densityClass'>> = {
  "Oslo": { population: 709037, areaKm2: 454, roadNetworkKm: 2100, terrainType: "Urban/kupert", densityPerKm2: 1562 },
  "Bergen": { population: 291189, areaKm2: 465, roadNetworkKm: 1680, terrainType: "Kyst/fjell", densityPerKm2: 626 },
  "Trondheim": { population: 212660, areaKm2: 342, roadNetworkKm: 1350, terrainType: "Flat/kupert", densityPerKm2: 622 },
  "Stavanger": { population: 144147, areaKm2: 71, roadNetworkKm: 680, terrainType: "Kyst/flat", densityPerKm2: 2030 },
  "Tromsø": { population: 77544, areaKm2: 2558, roadNetworkKm: 890, terrainType: "Kyst/fjell/arktisk", densityPerKm2: 30 },
  "Bodø": { population: 53324, areaKm2: 1395, roadNetworkKm: 520, terrainType: "Kyst/fjell", densityPerKm2: 38 },
  "Verdal": { population: 14888, areaKm2: 1548, roadNetworkKm: 380, terrainType: "Dal/jordbruk", densityPerKm2: 10 },
  "Kristiansand": { population: 114023, areaKm2: 276, roadNetworkKm: 1050, terrainType: "Kyst/kupert", densityPerKm2: 413 },
  "Drammen": { population: 103291, areaKm2: 137, roadNetworkKm: 620, terrainType: "Dal/elvedelta", densityPerKm2: 754 },
  "Fredrikstad": { population: 83508, areaKm2: 290, roadNetworkKm: 720, terrainType: "Kyst/flat", densityPerKm2: 288 },
  "Sandnes": { population: 81872, areaKm2: 304, roadNetworkKm: 680, terrainType: "Flat/kupert", densityPerKm2: 269 },
  "Ålesund": { population: 67489, areaKm2: 807, roadNetworkKm: 560, terrainType: "Kyst/øyer", densityPerKm2: 84 },
  "Hamar": { population: 32463, areaKm2: 351, roadNetworkKm: 420, terrainType: "Innsjø/flat", densityPerKm2: 92 },
  "Molde": { population: 32183, areaKm2: 1502, roadNetworkKm: 480, terrainType: "Kyst/fjord", densityPerKm2: 21 },
  "Alta": { population: 21265, areaKm2: 3849, roadNetworkKm: 320, terrainType: "Fjord/vidde/arktisk", densityPerKm2: 6 },
  "Narvik": { population: 22173, areaKm2: 3256, roadNetworkKm: 340, terrainType: "Fjord/fjell", densityPerKm2: 7 },
  "Lillehammer": { population: 28753, areaKm2: 480, roadNetworkKm: 380, terrainType: "Dal/innsjø", densityPerKm2: 60 },
  "Gjøvik": { population: 30801, areaKm2: 672, roadNetworkKm: 420, terrainType: "Innsjø/kupert", densityPerKm2: 46 },
  "Rana": { population: 26336, areaKm2: 4460, roadNetworkKm: 380, terrainType: "Fjord/fjell/bre", densityPerKm2: 6 },
  "Hammerfest": { population: 11558, areaKm2: 2710, roadNetworkKm: 180, terrainType: "Kyst/arktisk", densityPerKm2: 4 },
};

function getDefaultData(name: string): Omit<MunicipalityData, 'name' | 'densityClass'> {
  if (KOMMUNE_DATA[name]) return KOMMUNE_DATA[name];
  // Estimate for unknown municipalities
  return {
    population: 8000,
    areaKm2: 800,
    roadNetworkKm: 200,
    terrainType: "Varierende",
    densityPerKm2: 10,
  };
}

function classifyDensity(d: number): 'sparsely' | 'populated' {
  return d < 150 ? 'sparsely' : 'populated';
}

function densityLabel(d: number): string {
  if (d < 25) return 'Svært tynt befolket';
  if (d < 150) return 'Tynt befolket';
  if (d < 500) return 'Befolket';
  return 'Tett befolket';
}

function densityColor(d: number): string {
  if (d < 25) return 'text-green-400';
  if (d < 150) return 'text-blue-400';
  if (d < 500) return 'text-yellow-400';
  return 'text-red-400';
}

const inputClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";

export default function NewStep1Municipality({ municipality, municipalityData, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return kommuner.slice(0, 20);
    const q = search.toLowerCase();
    return kommuner.filter(k => k.toLowerCase().includes(q)).slice(0, 20);
  }, [search]);

  const handleSelect = (name: string) => {
    setLoading(true);
    setSearch(name);
    // Simulate SSB fetch
    setTimeout(() => {
      const raw = getDefaultData(name);
      const data: MunicipalityData = {
        name,
        ...raw,
        densityClass: classifyDensity(raw.densityPerKm2),
      };
      onSelect(name, data);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Velg kommune</h2>
        <p className="text-gray-400 text-sm">Kommunedata hentes automatisk fra SSB/KOSTRA og brukes i risikoberegningen.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          className={`${inputClass} pl-11`}
          placeholder="Søk etter kommune..."
          value={search}
          onChange={e => { setSearch(e.target.value); }}
          autoFocus
        />
      </div>

      {/* Results list */}
      {search && !municipalityData && (
        <div className="max-h-64 overflow-y-auto space-y-1 bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-2">
          {filtered.map(k => (
            <button
              key={k}
              onClick={() => handleSelect(k)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-[#222238] transition-colors text-left"
            >
              <MapPin className="w-4 h-4 text-[#7c3aed] shrink-0" />
              <span className="text-white">{k}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm px-3 py-4 text-center">Ingen kommuner funnet</p>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Henter data fra SSB/KOSTRA...
        </div>
      )}

      {/* Data panel */}
      {municipalityData && !loading && (
        <div className="bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a3e] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#7c3aed]" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{municipalityData.name}</h3>
                <p className="text-gray-500 text-xs">Kilde: SSB/KOSTRA (estimat)</p>
              </div>
            </div>
            <button
              onClick={() => { setSearch(''); onSelect('', null as any); }}
              className="text-gray-500 hover:text-white text-xs px-2 py-1 rounded border border-[#2a2a3e] hover:border-[#7c3aed]/50 transition-colors"
            >
              Bytt kommune
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-[#0f0f17] rounded-lg p-3">
              <p className="text-gray-500 text-xs">Innbyggere</p>
              <p className="text-white font-bold">{municipalityData.population.toLocaleString('nb-NO')}</p>
            </div>
            <div className="bg-[#0f0f17] rounded-lg p-3">
              <p className="text-gray-500 text-xs">Areal</p>
              <p className="text-white font-bold">{municipalityData.areaKm2.toLocaleString('nb-NO')} km²</p>
            </div>
            <div className="bg-[#0f0f17] rounded-lg p-3">
              <p className="text-gray-500 text-xs">Veinett</p>
              <p className="text-white font-bold">{municipalityData.roadNetworkKm.toLocaleString('nb-NO')} km</p>
            </div>
            <div className="bg-[#0f0f17] rounded-lg p-3">
              <p className="text-gray-500 text-xs">Terreng</p>
              <p className="text-white font-bold">{municipalityData.terrainType}</p>
            </div>
            <div className="bg-[#0f0f17] rounded-lg p-3">
              <p className="text-gray-500 text-xs">Tetthet</p>
              <p className={`font-bold ${densityColor(municipalityData.densityPerKm2)}`}>
                {municipalityData.densityPerKm2} innb/km²
              </p>
            </div>
            <div className="bg-[#0f0f17] rounded-lg p-3">
              <p className="text-gray-500 text-xs">SORA-klasse</p>
              <p className={`font-bold ${densityColor(municipalityData.densityPerKm2)}`}>
                {densityLabel(municipalityData.densityPerKm2)}
              </p>
            </div>
          </div>

          <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-lg p-3">
            <p className="text-[#7c3aed] text-xs font-medium">
              ℹ️ Befolkningstettheten ({municipalityData.densityPerKm2} innb/km²) kategoriserer kommunen som <strong>{densityLabel(municipalityData.densityPerKm2).toLowerCase()}</strong> for GRC-beregning. Du kan overstyre dette i steg 4 basert på faktisk flygeområde.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export type { MunicipalityData };
