import { SoraResults } from "@/lib/soraCalculations";
import { PdraScenario } from "@/data/pdraScenarios";

interface Props {
  applicantName: string;
  municipality: string;
  droneName: string;
  results: SoraResults;
  matchedScenario: PdraScenario | null;
  step: number;
  totalSteps: number;
}

function sailColor(sail: number): string {
  if (sail <= 2) return 'text-sora-success';
  if (sail <= 4) return 'text-sora-warning';
  return 'text-sora-danger';
}

function sailBg(sail: number): string {
  if (sail <= 2) return 'bg-sora-success/10 border-sora-success/30';
  if (sail <= 4) return 'bg-sora-warning/10 border-sora-warning/30';
  return 'bg-sora-danger/10 border-sora-danger/30';
}

export default function LiveSummary({ applicantName, municipality, droneName, results, matchedScenario, step, totalSteps }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-4 space-y-4">
          {/* SAIL badge */}
          <div className={`rounded-xl p-4 border ${sailBg(results.sail)}`}>
            <p className="text-sora-text-dim text-xs font-medium mb-1">SAIL-nivå</p>
            <p className={`text-4xl font-bold ${sailColor(results.sail)}`}>{results.sailRoman || '—'}</p>
          </div>

          {/* Key metrics */}
          <div className="bg-sora-surface rounded-xl p-4 border border-sora-border space-y-3">
            <MetricRow label="Søker" value={applicantName} />
            <MetricRow label="Kommune" value={municipality} />
            <MetricRow label="Drone" value={droneName} />
            {matchedScenario && <MetricRow label="Scenario" value={matchedScenario.id} highlight />}
            <div className="h-px bg-sora-border" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sora-text-dim text-xs">GRC</p>
                <p className="text-sora-pink text-lg font-bold">{results.finalGrc || '—'}</p>
              </div>
              <div>
                <p className="text-sora-text-dim text-xs">ARC</p>
                <p className="text-sora-purple text-lg font-bold">{results.residualArc || '—'}</p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-sora-surface rounded-xl p-4 border border-sora-border">
            <p className="text-sora-text-dim text-xs mb-2">Steg {step} av {totalSteps}</p>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i + 1 < step ? 'bg-sora-purple' :
                    i + 1 === step ? 'bg-sora-pink' :
                    'bg-sora-border'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-sora-bg/95 backdrop-blur-sm border-t border-sora-border px-4 py-2 z-40">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className={`font-bold text-lg ${sailColor(results.sail)}`}>SAIL {results.sailRoman || '—'}</span>
            <span className="text-sora-text-dim">|</span>
            <span className="text-sora-text-muted">GRC <span className="text-sora-pink font-bold">{results.finalGrc || '—'}</span></span>
            <span className="text-sora-text-muted">ARC <span className="text-sora-purple font-bold">{results.residualArc || '—'}</span></span>
          </div>
          <div className="text-sora-text-dim truncate max-w-[120px]">{matchedScenario?.id || municipality || ''}</div>
        </div>
      </div>
    </>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-sora-text-dim text-xs">{label}</p>
      <p className={`text-sm font-medium truncate ${highlight ? 'text-sora-purple' : 'text-sora-text'}`}>{value || '—'}</p>
    </div>
  );
}
