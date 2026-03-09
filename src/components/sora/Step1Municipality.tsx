import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";

export interface MunicipalityData {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    municipality?: string;
    village?: string;
    county?: string;
  };
}

interface Props {
  municipality: string;
  municipalityData: MunicipalityData | null;
  onSelect: (name: string, data: MunicipalityData) => void;
}

async function searchAddress(query: string): Promise<NominatimResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=no&format=json&addressdetails=1&limit=5`,
    { headers: { 'Accept-Language': 'no', 'User-Agent': 'SORA-DMA-Haiko/1.0' } }
  );
  return await res.json();
}

function extractMunicipality(addr?: NominatimResult['address']): string {
  if (!addr) return '';
  return addr.municipality || addr.city || addr.town || addr.village || addr.county || '';
}

export default function Step1Municipality({ municipality, municipalityData, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAddress(query);
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((result: NominatimResult) => {
    const municName = extractMunicipality(result.address);
    const data: MunicipalityData = {
      name: municName,
      address: result.display_name,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    };
    onSelect(municName, data);
    setQuery(result.display_name);
    setOpen(false);
  }, [onSelect]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Velg takeoff-lokasjon</h2>
        <p className="text-sora-text-muted text-sm">Søk etter adressen eller stedet der dronen skal ta av.</p>
      </div>

      {/* Address search */}
      <div ref={containerRef} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-text-dim" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-text-dim animate-spin" />}
        <input
          type="text"
          className="w-full bg-sora-surface border border-sora-border rounded-lg pl-10 pr-10 py-3 text-sora-text placeholder:text-sora-text-dim focus:outline-none focus:ring-2 focus:ring-sora-purple transition-colors"
          placeholder="Søk etter adresse eller sted..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {open && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-sora-surface border border-sora-border rounded-lg max-h-72 overflow-y-auto shadow-xl">
            {results.map(r => (
              <button
                key={r.place_id}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-3 text-sm text-sora-text hover:bg-sora-surface-hover transition-colors border-b border-sora-border last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-sora-purple shrink-0 mt-0.5" />
                  <span className="leading-tight">{r.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected address display */}
      {municipalityData && (
        <div className="bg-sora-surface border border-sora-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sora-purple font-semibold text-sm">
            <MapPin className="w-4 h-4" />
            Takeoff: {municipalityData.address}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-sora-bg rounded-lg p-3">
              <p className="text-sora-text-dim text-xs mb-1">Kommune</p>
              <p className="text-sora-text font-semibold text-sm">{municipalityData.name || '—'}</p>
            </div>
            <div className="bg-sora-bg rounded-lg p-3">
              <p className="text-sora-text-dim text-xs mb-1">Koordinater</p>
              <p className="text-sora-text font-semibold text-sm">{municipalityData.lat.toFixed(5)}, {municipalityData.lon.toFixed(5)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
