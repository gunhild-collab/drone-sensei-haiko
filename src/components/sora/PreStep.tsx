import { useState } from "react";
import { ArrowRight, CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import HaikoLogo from "./HaikoLogo";

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

export default function PreStep({
  applicantName, applicantEmail, flightDate, timeFrom, timeTo,
  onChangeName, onChangeEmail, onChangeFlightDate, onChangeTimeFrom, onChangeTimeTo,
  onContinue,
}: Props) {
  const canContinue = applicantName.trim() && applicantEmail.trim();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selectedDate = flightDate ? new Date(flightDate) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) onChangeFlightDate(format(date, 'yyyy-MM-dd'));
    setCalendarOpen(false);
  };

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
            <input type="text" className="haiko-input w-full" placeholder="Navn eller bedrift" value={applicantName} onChange={e => onChangeName(e.target.value)} />
          </div>

          <div>
            <label className="haiko-label block mb-2">E-post *</label>
            <input type="email" className="haiko-input w-full" placeholder="din@epost.no" value={applicantEmail} onChange={e => onChangeEmail(e.target.value)} />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="haiko-label block mb-2">Klokkeslett fra</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sora-purple pointer-events-none" strokeWidth={1.5} />
                <input type="time" step="60" className="haiko-input w-full pl-10" value={timeFrom} onChange={e => onChangeTimeFrom(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="haiko-label block mb-2">Klokkeslett til</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sora-purple pointer-events-none" strokeWidth={1.5} />
                <input type="time" step="60" className="haiko-input w-full pl-10" value={timeTo} onChange={e => onChangeTimeTo(e.target.value)} />
              </div>
            </div>
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
