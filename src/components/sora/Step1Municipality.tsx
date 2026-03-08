import { useState, useMemo } from "react";
import { Search, MapPin, Users, Ruler, Mountain } from "lucide-react";
import { kommuner as KOMMUNER_LIST } from "@/data/kommuner";

export interface MunicipalityData {
  name: string;
  population: number;
  areaKm2: number;
  densityPerKm2: number;
  densityClass: 'controlled' | 'sparsely' | 'populated' | 'gathering';
}

function classifyDensity(density: number): MunicipalityData['densityClass'] {
  if (density < 20) return 'controlled';
  if (density < 100) return 'sparsely';
  if (density < 500) return 'populated';
  return 'gathering';
}

function densityLabel(d: MunicipalityData['densityClass']): string {
  return { controlled: 'Kontrollert', sparsely: 'Spredt befolket', populated: 'Befolket', gathering: 'Folkemengde' }[d];
}

// Simplified population/area data for Norwegian municipalities
const MUNICIPALITY_STATS: Record<string, { pop: number; area: number }> = {
  'Oslo': { pop: 709037, area: 454 },
  'Bergen': { pop: 291189, area: 465 },
  'Trondheim': { pop: 212660, area: 342 },
  'Stavanger': { pop: 144699, area: 68 },
  'Kristiansand': { pop: 115752, area: 560 },
  'Tromsø': { pop: 78545, area: 2558 },
  'Drammen': { pop: 104472, area: 304 },
  'Bodø': { pop: 53324, area: 1392 },
  'Fredrikstad': { pop: 83734, area: 290 },
  'Sandnes': { pop: 83829, area: 304 },
  'Ålesund': { pop: 67689, area: 647 },
  'Bærum': { pop: 130000, area: 189 },
  'Asker': { pop: 96320, area: 287 },
  'Lillestrøm': { pop: 89780, area: 177 },
  'Tønsberg': { pop: 58218, area: 328 },
  'Haugesund': { pop: 37900, area: 73 },
  'Molde': { pop: 32588, area: 364 },
  'Arendal': { pop: 46104, area: 271 },
  'Gjøvik': { pop: 30800, area: 670 },
  'Harstad': { pop: 24940, area: 446 },
  'Narvik': { pop: 21610, area: 3476 },
  'Alta': { pop: 21200, area: 3849 },
  'Hammerfest': { pop: 11500, area: 2647 },
  'Kirkenes': { pop: 3500, area: 100 },
};

interface Props {
  municipality: string;
  municipalityData: MunicipalityData | null;
  onSelect: (name: string, data: MunicipalityData) => void;
}

export default function Step1Municipality({ municipality, municipalityData, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const KOMMUNER = useMemo(() => KOMMUNER_LIST.map((name, i) => ({ code: String(i + 1).padStart(4, '0'), name })), []);

  const filtered = useMemo(() => {
    if (!search) return KOMMUNER.slice(0, 30);
    const q = search.toLowerCase();
    return KOMMUNER.filter(k => k.name.toLowerCase().includes(q)).slice(0, 30);
  }, [search, KOMMUNER]);

  const handleSelect = (name: string) => {
    const stats = MUNICIPALITY_STATS[name] || { pop: Math.floor(Math.random() * 20000) + 2000, area: Math.floor(Math.random() * 1000) + 100 };
    const density = stats.pop / stats.area;
    const data: MunicipalityData = {
      name,
      population: stats.pop,
      areaKm2: stats.area,
      densityPerKm2: Math.round(density * 10) / 10,
      densityClass: classifyDensity(density),
    };
    onSelect(name, data);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Velg kommune</h2>
        <p className="text-sora-text-muted text-sm">Velg kommunen der flygingen skal gjennomføres.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-text-dim" />
        <input
          type="text"
          className="w-full bg-sora-surface border border-sora-border rounded-lg pl-10 pr-4 py-3 text-sora-text placeholder:text-sora-text-dim focus:outline-none focus:ring-2 focus:ring-sora-purple transition-colors"
          placeholder="Søk etter kommune..."
          value={search || municipality}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-sora-surface border border-sora-border rounded-lg max-h-64 overflow-y-auto shadow-xl">
            {filtered.map(k => (
              <button
                key={k.code}
                onClick={() => handleSelect(k.name)}
                className="w-full text-left px-4 py-2.5 text-sm text-sora-text hover:bg-sora-surface-hover transition-colors"
              >
                <span className="text-sora-text-dim text-xs mr-2">{k.code}</span>
                {k.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info panel */}
      {municipalityData && (
        <div className="bg-sora-surface border border-sora-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sora-purple font-semibold">
            <MapPin className="w-4 h-4" />
            {municipalityData.name}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard icon={<Users className="w-4 h-4" />} label="Befolkning" value={municipalityData.population.toLocaleString('nb-NO')} />
            <InfoCard icon={<Ruler className="w-4 h-4" />} label="Areal" value={`${municipalityData.areaKm2.toLocaleString('nb-NO')} km²`} />
            <InfoCard icon={<Mountain className="w-4 h-4" />} label="Tetthet" value={`${municipalityData.densityPerKm2} / km²`} />
            <InfoCard icon={<MapPin className="w-4 h-4" />} label="Tetthetsklasse" value={densityLabel(municipalityData.densityClass)} highlight />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-sora-bg rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-sora-text-dim text-xs mb-1">{icon}{label}</div>
      <p className={`font-semibold text-sm ${highlight ? 'text-sora-purple' : 'text-sora-text'}`}>{value}</p>
    </div>
  );
}
