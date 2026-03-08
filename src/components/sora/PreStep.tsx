import { ArrowRight, Plane } from "lucide-react";

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
            <input type="date" className={inputClass} value={flightDate} onChange={e => onChangeFlightDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Klokkeslett fra</label>
              <input type="time" className={inputClass} value={timeFrom} onChange={e => onChangeTimeFrom(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Klokkeslett til</label>
              <input type="time" className={inputClass} value={timeTo} onChange={e => onChangeTimeTo(e.target.value)} />
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
