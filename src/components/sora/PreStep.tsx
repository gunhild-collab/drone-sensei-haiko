interface Props {
  applicantName: string;
  applicantEmail: string;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onContinue: () => void;
}

const inputClass = "w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-colors";

export default function PreStep({ applicantName, applicantEmail, onChangeName, onChangeEmail, onContinue }: Props) {
  const canContinue = applicantName.trim().length > 0 && applicantEmail.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#0f0f17] flex items-center justify-center px-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#ec4899] bg-clip-text text-transparent">
            SORA DMA
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Spesifikk Operations Risk Assessment — Digital Municipal Assistant
          </p>
          <p className="text-gray-500 text-xs mt-1">SORA 2.5 • Luftfartstilsynet</p>
        </div>

        <div className="bg-[#1a1a2e] rounded-2xl p-6 border border-[#2a2a3e] space-y-5">
          <div>
            <p className="text-white font-semibold mb-1">Før vi starter</p>
            <p className="text-gray-400 text-sm">Oppgi navn og e-post. Brukes i alle genererte dokumenter.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Søkers navn / organisasjon</label>
            <input
              className={inputClass}
              placeholder="F.eks. Verdal kommune"
              value={applicantName}
              onChange={e => onChangeName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">E-post</label>
            <input
              className={inputClass}
              type="email"
              placeholder="kontakt@eksempel.no"
              value={applicantEmail}
              onChange={e => onChangeEmail(e.target.value)}
            />
          </div>

          <button
            onClick={onContinue}
            disabled={!canContinue}
            className="w-full py-3 rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Start SORA-vurdering
          </button>
        </div>

        <p className="text-center text-gray-600 text-xs">
          Ingen pålogging kreves. All data holdes i minnet.
        </p>
      </div>
    </div>
  );
}
