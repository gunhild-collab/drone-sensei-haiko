import { SoraResults } from "@/lib/soraCalculations";

interface Props {
  applicantName: string;
  municipality: string;
  droneName: string;
  results: SoraResults;
  step: number;
}

function sailColor(sail: number): string {
  if (sail <= 2) return 'text-green-400';
  if (sail <= 4) return 'text-yellow-400';
  return 'text-red-400';
}

function sailBg(sail: number): string {
  if (sail <= 2) return 'bg-green-400/10 border-green-400/30';
  if (sail <= 4) return 'bg-yellow-400/10 border-yellow-400/30';
  return 'bg-red-400/10 border-red-400/30';
}

export default function LiveSummary({ applicantName, municipality, droneName, results, step }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-4 space-y-4">
          {/* SAIL badge */}
          <div className={`rounded-xl p-4 border ${sailBg(results.sail)}`}>
            <p className="text-gray-400 text-xs font-medium mb-1">SAIL-nivå</p>
            <p className={`text-4xl font-bold ${sailColor(results.sail)}`}>{results.sailRoman || '—'}</p>
          </div>

          {/* Key metrics */}
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a3e] space-y-3">
            <div>
              <p className="text-gray-500 text-xs">Søker</p>
              <p className="text-white text-sm font-medium truncate">{applicantName || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Kommune</p>
              <p className="text-white text-sm font-medium truncate">{municipality || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Drone</p>
              <p className="text-white text-sm font-medium truncate">{droneName || '—'}</p>
            </div>
            <div className="h-px bg-[#2a2a3e]" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-500 text-xs">GRC</p>
                <p className="text-[#ec4899] text-lg font-bold">{results.finalGrc || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">ARC</p>
                <p className="text-[#7c3aed] text-lg font-bold">{results.residualArc || '—'}</p>
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a3e]">
            <p className="text-gray-500 text-xs mb-2">Fremgang</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map(s => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    s < step ? 'bg-[#7c3aed]' :
                    s === step ? 'bg-[#ec4899]' :
                    'bg-[#2a2a3e]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-[#0f0f17]/95 backdrop-blur-sm border-t border-[#1a1a2e] px-4 py-2 z-40">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className={`font-bold text-lg ${sailColor(results.sail)}`}>SAIL {results.sailRoman || '—'}</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">GRC <span className="text-[#ec4899] font-bold">{results.finalGrc || '—'}</span></span>
            <span className="text-gray-400">ARC <span className="text-[#7c3aed] font-bold">{results.residualArc || '—'}</span></span>
          </div>
          <div className="text-gray-500 truncate max-w-[120px]">{municipality || droneName || ''}</div>
        </div>
      </div>
    </>
  );
}
