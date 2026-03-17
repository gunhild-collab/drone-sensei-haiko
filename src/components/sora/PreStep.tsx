import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ArrowRight, CalendarIcon, Search, Plane, Check, Building2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DroneSpec, DRONE_DATABASE } from "@/data/droneDatabase";
import HaikoLogo from "./HaikoLogo";

interface BrregUnit {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: { kode: string; beskrivelse: string };
  forretningsadresse?: { kommune?: string; poststed?: string };
}

function useBrregSearch(query: string) {
  const [results, setResults] = useState<BrregUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query.trim())}&size=8`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error('BRREG error');
        const data = await res.json();
        setResults((data._embedded?.enheter ?? []) as BrregUnit[]);
      } catch (e: any) {
        if (e.name !== 'AbortError') setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  return { results, loading };
}

interface Props {
  applicantName: string;
  applicantEmail: string;
  flightDate: string;
  selectedDrone: DroneSpec | null;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangeFlightDate: (v: string) => void;
  onSelectDrone: (drone: DroneSpec) => void;
  onContinue: () => void;
}

export default function PreStep({
  applicantName, applicantEmail, flightDate, selectedDrone,
  onChangeName, onChangeEmail, onChangeFlightDate, onSelectDrone,
  onContinue,
}: Props) {
  const canContinue = applicantName.trim() && applicantEmail.trim() && selectedDrone !== null;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [droneSearch, setDroneSearch] = useState('');
  const [droneDropdownOpen, setDroneDropdownOpen] = useState(false);
  const selectedDate = flightDate ? new Date(flightDate) : undefined;
  const [brregQuery, setBrregQuery] = useState('');
  const [brregOpen, setBrregOpen] = useState(false);
  const { results: brregResults, loading: brregLoading } = useBrregSearch(brregQuery);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) onChangeFlightDate(format(date, 'yyyy-MM-dd'));
    setCalendarOpen(false);
  };

  const filteredDrones = useMemo(() => {
    if (!droneSearch) return DRONE_DATABASE;
    const q = droneSearch.toLowerCase();
    return DRONE_DATABASE.filter(d => d.name.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q));
  }, [droneSearch]);

  return (
    <div className="min-h-screen bg-sora-bg flex items-center justify-center px-4 font-sora">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <HaikoLogo />
          </div>
          <h1 className="text-[28px] font-display font-bold text-sora-text mb-2">SORA DMA</h1>
          <p className="text-sora-text-muted text-[15px]">Norsk droneflyging autorisasjonsveiviser</p>
        </div>

        <div className="haiko-card p-6 space-y-5">
          <h2 className="text-[18px] font-display font-bold text-sora-text">Søkerinformasjon</h2>

          <div>
            <label className="haiko-label block mb-2">Søkers navn / bedriftsnavn *</label>
            <div className="relative">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-text-dim" strokeWidth={1.5} />
                {brregLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-purple animate-spin" />}
                <input
                  type="text"
                  className="haiko-input w-full !pl-10"
                  placeholder="Søk i Brønnøysundregistrene..."
                  value={brregQuery || applicantName}
                  onChange={e => { setBrregQuery(e.target.value); onChangeName(e.target.value); setBrregOpen(true); }}
                  onFocus={() => brregQuery.length >= 2 && setBrregOpen(true)}
                />
              </div>
              {brregOpen && brregResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-sora-border rounded-lg shadow-lg">
                  {brregResults.map(unit => (
                    <button
                      key={unit.organisasjonsnummer}
                      onClick={() => {
                        onChangeName(unit.navn);
                        setBrregQuery(unit.navn);
                        setBrregOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sora-light transition-colors text-sm"
                    >
                      <Building2 className="w-4 h-4 text-sora-purple shrink-0" strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className="text-sora-text font-medium truncate">{unit.navn}</p>
                        <p className="text-sora-text-dim text-xs">
                          Org.nr {unit.organisasjonsnummer}
                          {unit.organisasjonsform && ` · ${unit.organisasjonsform.beskrivelse}`}
                          {unit.forretningsadresse?.poststed && ` · ${unit.forretningsadresse.poststed}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="haiko-label block mb-2">E-post *</label>
            <input type="email" className="haiko-input w-full" placeholder="din@epost.no" value={applicantEmail} onChange={e => onChangeEmail(e.target.value)} />
          </div>

          {/* Drone selection */}
          <div>
            <label className="haiko-label block mb-2">Hvilken drone skal du bruke? *</label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-text-dim" strokeWidth={1.5} />
                <input
                  type="text"
                  className="haiko-input w-full pl-10"
                  placeholder="Søk etter drone..."
                  value={droneSearch}
                  onChange={e => { setDroneSearch(e.target.value); setDroneDropdownOpen(true); }}
                  onFocus={() => setDroneDropdownOpen(true)}
                />
              </div>
              {droneDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-sora-border rounded-lg shadow-lg">
                  {filteredDrones.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { onSelectDrone(d); setDroneSearch(d.name); setDroneDropdownOpen(false); }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-sora-light transition-colors text-sm",
                        selectedDrone?.id === d.id && "bg-sora-light"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Plane className="w-4 h-4 text-sora-purple shrink-0" strokeWidth={1.5} />
                        <div className="min-w-0">
                          <p className="text-sora-text font-medium truncate">{d.name}</p>
                          <p className="text-sora-text-dim text-xs">{d.mtom} kg · {d.categoryClass} · {d.easaCategory}</p>
                        </div>
                      </div>
                      {selectedDrone?.id === d.id && <Check className="w-4 h-4 text-sora-purple shrink-0" strokeWidth={1.5} />}
                    </button>
                  ))}
                  {filteredDrones.length === 0 && (
                    <p className="px-4 py-3 text-sora-text-dim text-sm">Ingen droner funnet</p>
                  )}
                </div>
              )}
            </div>
            {selectedDrone && (
              <div className="mt-2 p-3 bg-sora-light border-l-2 border-sora-purple rounded-lg">
                <p className="text-sora-text font-medium text-sm">{selectedDrone.name}</p>
                <p className="text-sora-text-dim text-xs mt-0.5">
                  {selectedDrone.mtom} kg · {selectedDrone.characteristicDimension} m · {selectedDrone.categoryClass} · {selectedDrone.maxSpeed} m/s
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="haiko-label block mb-2">Dato for flyging</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn("haiko-input w-full flex items-center gap-3 text-left", !flightDate && "text-sora-text-dim")}
                >
                  <CalendarIcon className="w-5 h-5 text-sora-purple shrink-0" strokeWidth={1.5} />
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Velg dato'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 sora-calendar" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <button onClick={onContinue} disabled={!canContinue} className="haiko-btn-primary w-full mt-2">
            Start veiviseren <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-center text-sora-text-dim text-xs mt-6 font-sora">
          Ingen innlogging nødvendig. All data holdes i nettleseren.
        </p>
      </div>
    </div>
  );
}
