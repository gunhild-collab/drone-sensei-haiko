import { useState, useEffect, useMemo } from "react";
import { Info, Search, MapPin, X, ExternalLink, FileText, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SoraInputs } from "@/lib/soraCalculations";
import { kommuner } from "@/data/kommuner";
import { USE_CASES, TYPE_COLORS, PRIORITY_COLORS, UseCaseRecord } from "@/data/useCaseData";

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

// SORA 2.5 / EASA population density thresholds mapped to SSB data
// Based on Luftfartstilsynet guidance and EASA AMC to Article 11
// < 25 innb/km² → Tynt befolket (sparsely populated)
// 25–150 innb/km² → Grensesone — default tynt, men kontekstavhengig
// 150+ innb/km² → Befolket (populated)
// Forsamling = situasjonsbasert, ikke tetthetsbasert
function mapDensityToSora(densityPerKm2: number): 'sparsely' | 'populated' {
  if (densityPerKm2 < 150) return 'sparsely';
  return 'populated';
}

function getDensityLabel(density: number): string {
  if (density < 25) return 'Svært tynt befolket';
  if (density < 150) return 'Tynt befolket';
  if (density < 500) return 'Befolket';
  if (density < 2000) return 'Tett befolket';
  return 'Bykjerne / svært tett';
}

function getDensityColor(density: number): string {
  if (density < 25) return 'text-green-400';
  if (density < 150) return 'text-blue-400';
  if (density < 500) return 'text-yellow-400';
  if (density < 2000) return 'text-orange-400';
  return 'text-red-400';
}

// Estimated population density per km² for Norwegian municipalities
// Source: SSB table 07459 + areal. This is a representative subset.
const KOMMUNE_DENSITY: Record<string, number> = {
  "Oslo": 1590, "Bergen": 290, "Trondheim": 570, "Stavanger": 2490,
  "Bærum": 695, "Kristiansand": 130, "Drammen": 665, "Asker": 420,
  "Lillestrøm": 480, "Fredrikstad": 305, "Sandnes": 270, "Tromsø": 9,
  "Ålesund": 87, "Sandefjord": 170, "Sarpsborg": 175, "Nordre Follo": 470,
  "Skien": 105, "Tønsberg": 270, "Bodø": 14, "Larvik": 80,
  "Indre Østfold": 55, "Arendal": 120, "Lørenskog": 1680, "Karmøy": 190,
  "Ullensaker": 130, "Haugesund": 610, "Ringsaker": 18, "Øygarden": 70,
  "Porsgrunn": 310, "Ringerike": 12, "Moss": 365, "Halden": 50,
  "Hamar": 170, "Molde": 35, "Gjøvik": 55, "Horten": 280,
  "Askøy": 225, "Lillehammer": 30, "Lier": 120, "Eidsvoll": 55,
  "Sola": 355, "Rana": 5, "Harstad": 30, "Nittedal": 200,
  "Lindesnes": 30, "Kristiansund": 215, "Stjørdal": 17,
  "Steinkjer": 7, "Narvik": 5, "Alta": 3, "Levanger": 23,
  "Stord": 80, "Melhus": 15, "Kongsvinger": 11, "Notodden": 14,
  "Namsos": 10, "Hammerfest": 3, "Fauske": 8, "Sogndal": 5,
  "Oppdal": 2, "Trysil": 2, "Tynset": 2, "Vadsø": 6, "Verdal": 13,
  "Klepp": 110, "Time": 100, "Hå": 35, "Randaberg": 480,
  "Skaun": 22, "Malvik": 72, "Gjesdal": 25,
};

// Estimate density for municipalities not in the lookup
function estimateDensity(name: string): number {
  // Default to 30 innb/km² (typical small Norwegian municipality)
  return KOMMUNE_DENSITY[name] || 30;
}

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

export default function SoraStep1({ inputs, onChange }: Props) {
  const [showUseCaseSelector, setShowUseCaseSelector] = useState(false);
  const [useCaseFilter, setUseCaseFilter] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState<UseCaseRecord | null>(null);

  const [drones, setDrones] = useState<DronePlatform[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<DronePlatform | null>(null);
  const [showDensityLookup, setShowDensityLookup] = useState(false);
  const [kommuneSearch, setKommuneSearch] = useState('');
  const [selectedKommune, setSelectedKommune] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("drone_platforms").select("*").then(({ data }) => {
      if (data) setDrones(data as unknown as DronePlatform[]);
    });
  }, []);

  const filteredKommuner = useMemo(() => {
    if (!kommuneSearch.trim()) return kommuner.slice(0, 20);
    const q = kommuneSearch.toLowerCase();
    return kommuner.filter(k => k.toLowerCase().includes(q)).slice(0, 20);
  }, [kommuneSearch]);

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

  const handleKommuneSelect = (name: string) => {
    setSelectedKommune(name);
    const density = estimateDensity(name);
    const soraCategory = mapDensityToSora(density);
    onChange({ populationDensity: soraCategory });
  };

  const kommuneDensity = selectedKommune ? estimateDensity(selectedKommune) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Drone & operasjonsdata</h2>
        <p className="text-gray-400 text-sm">Velg drone fra databasen eller fyll inn manuelt.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className={labelClass}>Dronenavn</label>
          <select className={selectClass} value={inputs.droneName} onChange={e => handleDroneSelect(e.target.value)}>
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
                <li><span className="text-[#7c3aed] font-medium">VLOS</span> — Visual Line of Sight. Piloten ser dronen direkte til enhver tid.</li>
                <li><span className="text-[#7c3aed] font-medium">EVLOS</span> — Extended VLOS. Observatører opprettholder visuell kontakt.</li>
                <li><span className="text-[#7c3aed] font-medium">BVLOS</span> — Beyond Visual Line of Sight. Utenfor synsrekkevidde. Krever høyere SAIL.</li>
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
                <li><span className="text-[#7c3aed] font-medium">Dag</span> — Dagslys. Enkleste kategori.</li>
                <li><span className="text-[#7c3aed] font-medium">Natt</span> — Mørke. Krever anti-kollisjonslys og ekstra risikovurdering.</li>
                <li><span className="text-[#7c3aed] font-medium">Begge</span> — Dokumentasjonen må dekke begge scenarioer.</li>
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
              <p className="font-semibold text-white mb-1">SORA 2.5 befolkningskategorier</p>
              <ul className="space-y-1.5">
                <li><span className="text-green-400 font-medium">Kontrollert</span> — Bakkeområdet er sperret. Ingen uvedkommende.</li>
                <li><span className="text-blue-400 font-medium">Tynt befolket</span> — &lt; 150 innb/km² (SSB). Landlig/spredt bebyggelse.</li>
                <li><span className="text-yellow-400 font-medium">Befolket</span> — ≥ 150 innb/km². Tettsted, by, boligområder.</li>
                <li><span className="text-red-400 font-medium">Forsamling</span> — Store folkemengder (arrangementer, konserter).</li>
              </ul>
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
              onClick={() => setShowDensityLookup(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#7c3aed]/20 text-[#7c3aed] hover:bg-[#7c3aed]/30 border border-[#7c3aed]/30 transition-colors text-xs font-medium whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5" /> Slå opp
            </button>
          </div>
        </div>
      </div>

      {/* Population density lookup modal */}
      {showDensityLookup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#12121f] border border-[#2a2a3e] rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a3e]">
              <div>
                <h3 className="text-white font-bold text-lg">Befolkningstetthet — oppslag</h3>
                <p className="text-gray-400 text-xs mt-0.5">SSB-data mappet mot SORA 2.5 / EASA kategorier</p>
              </div>
              <button onClick={() => setShowDensityLookup(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  className={`${inputClass} pl-10`}
                  placeholder="Søk etter kommune..."
                  value={kommuneSearch}
                  onChange={e => setKommuneSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Results */}
              <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                {filteredKommuner.map(k => {
                  const density = estimateDensity(k);
                  const soraCategory = mapDensityToSora(density);
                  return (
                    <button
                      key={k}
                      onClick={() => handleKommuneSelect(k)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedKommune === k
                          ? 'bg-[#7c3aed]/20 border border-[#7c3aed]/50'
                          : 'bg-[#1a1a2e] hover:bg-[#222238] border border-transparent'
                      }`}
                    >
                      <span className="text-white">{k}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${getDensityColor(density)}`}>
                          ~{density} innb/km²
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          soraCategory === 'sparsely'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {soraCategory === 'sparsely' ? 'Tynt befolket' : 'Befolket'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected result */}
              {selectedKommune && kommuneDensity !== null && (
                <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-semibold">{selectedKommune}</h4>
                    <span className={`text-sm font-medium ${getDensityColor(kommuneDensity)}`}>
                      {getDensityLabel(kommuneDensity)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">SSB befolkningstetthet</span>
                      <p className="text-white font-medium">~{kommuneDensity} innb/km²</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">SORA 2.5 kategori</span>
                      <p className={`font-medium ${kommuneDensity < 150 ? 'text-blue-400' : 'text-yellow-400'}`}>
                        {kommuneDensity < 150 ? 'Tynt befolket' : 'Befolket'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#0f0f17] rounded-lg p-3 text-xs text-gray-400 space-y-1">
                    <p className="font-medium text-gray-300">EASA / Luftfartstilsynet mapping:</p>
                    <p>• <span className="text-blue-400">&lt; 150 innb/km²</span> → Tynt befolket (GRC reduseres)</p>
                    <p>• <span className="text-yellow-400">≥ 150 innb/km²</span> → Befolket (standard GRC)</p>
                    <p className="mt-2 italic">NB: «Kontrollert bakkeområde» og «Forsamling» er operasjonelle valg, ikke tetthetsbasert. Velg manuelt om relevant.</p>
                  </div>
                </div>
              )}

              {/* Info box */}
              <div className="flex gap-2 text-xs text-gray-500 items-start">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>
                  Tetthetsdata er basert på SSB tabell 07459 (befolkning) / 09280 (areal).
                  Faktisk tetthet i operasjonsområdet kan avvike fra kommunegjennomsnittet.
                  <a
                    href="https://www.ssb.no/befolkning/folketall/statistikk/befolkning-og-areal-i-kommunene"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[#7c3aed] hover:underline ml-1"
                  >
                    SSB kilde <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>
            </div>

            <div className="border-t border-[#2a2a3e] p-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDensityLookup(false)}
                className="px-4 py-2 rounded-lg bg-[#1a1a2e] text-gray-300 hover:bg-[#2a2a3e] transition-colors text-sm"
              >
                Lukk
              </button>
              {selectedKommune && (
                <button
                  onClick={() => setShowDensityLookup(false)}
                  className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors text-sm"
                >
                  Bruk valgt kategori
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
