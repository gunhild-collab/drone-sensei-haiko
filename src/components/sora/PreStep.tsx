import { useState } from "react";
import { ArrowRight, Plane, CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  applicantName: string;
  applicantEmail: string;
  flightDate: string;
  timeFrom: string;
  timeTo: string;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangeFlightDate: (v: string) => void;
  onChangeTimeFrom: (v: string) => void;
  onChangeTimeTo: (v: string) => void;
  onContinue: () => void;
}

const inputClass = "w-full bg-sora-surface border border-sora-border rounded-lg px-4 py-3 text-sora-text placeholder:text-sora-text-dim focus:outline-none focus:ring-2 focus:ring-sora-purple transition-colors font-sora";
const labelClass = "block text-sm font-medium text-sora-text-muted mb-2 font-sora";

export default function PreStep({
  applicantName, applicantEmail, flightDate, timeFrom, timeTo,
  onChangeName, onChangeEmail, onChangeFlightDate, onChangeTimeFrom, onChangeTimeTo,
  onContinue,
}: Props) {
  const canContinue = applicantName.trim() && applicantEmail.trim();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedDate = flightDate ? new Date(flightDate) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChangeFlightDate(format(date, 'yyyy-MM-dd'));
    }
    setCalendarOpen(false);
  };

  return (
    <div className="min-h-screen bg-sora-bg flex items-center justify-center px-4 font-sora">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-sora-purple/20 flex items-center justify-center mx-auto mb-4">
            <Plane className="w-8 h-8 text-sora-purple" />
          </div>
          <h1 className="text-3xl font-bold text-sora-text mb-2">SORA DMA</h1>
          <p className="text-sora-text-muted text-sm">Norsk droneflyging autorisasjonsveiviser</p>
        </div>

        <div className="bg-sora-surface border border-sora-border rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-sora-text">Søkerinformasjon</h2>

          <div>
            <label className={labelClass}>Søkers navn / bedriftsnavn *</label>
            <input type="text" className={inputClass} placeholder="Navn eller bedrift" value={applicantName} onChange={e => onChangeName(e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>E-post *</label>
            <input type="email" className={inputClass} placeholder="din@epost.no" value={applicantEmail} onChange={e => onChangeEmail(e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Dato for flyging</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    inputClass,
                    "flex items-center gap-3 text-left",
                    !flightDate && "text-sora-text-dim"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 text-sora-text shrink-0" />
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Velg dato'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-sora-surface border-sora-border" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Klokkeslett fra</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-text pointer-events-none" />
                <input
                  type="time"
                  step="60"
                  style={{ colorScheme: 'dark' }}
                  className={cn(inputClass, "pl-10")}
                  value={timeFrom}
                  onChange={e => onChangeTimeFrom(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Klokkeslett til</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-text pointer-events-none" />
                <input
                  type="time"
                  className={cn(inputClass, "pl-10 [&::-webkit-calendar-picker-indicator]:invert")}
                  value={timeTo}
                  onChange={e => onChangeTimeTo(e.target.value)}
                  placeholder="TT:MM"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onContinue}
            disabled={!canContinue}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-sora-purple text-sora-text font-semibold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all mt-2"
          >
            Start veiviseren <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-sora-text-dim text-xs mt-6">
          Ingen innlogging nødvendig. All data holdes i nettleseren.
        </p>
      </div>
    </div>
  );
}
