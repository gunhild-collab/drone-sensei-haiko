import { useState } from "react";
import { OSO_DEFINITIONS, getOsoRobustness, RobustnessLevel } from "@/lib/soraCalculations";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Props {
  sail: number;
  osoTexts: Record<number, string>;
  onOsoChange: (id: number, text: string) => void;
}

const robustnessStyles: Record<RobustnessLevel, { label: string; bg: string; text: string }> = {
  O: { label: 'Ikke påkrevd', bg: 'bg-gray-700/30', text: 'text-gray-500' },
  L: { label: 'Lav', bg: 'bg-gray-500/20', text: 'text-gray-300' },
  M: { label: 'Middels', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  H: { label: 'Høy', bg: 'bg-red-500/20', text: 'text-red-400' },
};

function getStatus(osoId: number, osoTexts: Record<number, string>, template: string): 'empty' | 'in_progress' | 'complete' {
  const text = osoTexts[osoId];
  if (!text || text === template) return 'empty';
  // Check if template placeholders are still present
  if (text.includes('[') && text.includes(']')) return 'in_progress';
  return 'complete';
}

export default function SoraStep5({ sail, osoTexts, onOsoChange }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Komplett OSO-dokumentasjon</h2>
        <p className="text-gray-400 text-sm">Alle 24 OSO-er med påkrevd robusthetsnivå for SAIL {sail}. Fyll ut maler med din operasjonsspesifikke informasjon.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 text-sm">
        {(['complete', 'in_progress', 'empty'] as const).map(status => {
          const count = OSO_DEFINITIONS.filter(o => {
            const r = getOsoRobustness(o, sail);
            if (r === 'O') return false;
            return getStatus(o.id, osoTexts, o.template) === status;
          }).length;
          const Icon = status === 'complete' ? CheckCircle2 : status === 'in_progress' ? Loader2 : Circle;
          const color = status === 'complete' ? 'text-green-400' : status === 'in_progress' ? 'text-yellow-400' : 'text-gray-500';
          const label = status === 'complete' ? 'Ferdig' : status === 'in_progress' ? 'Under arbeid' : 'Ikke startet';
          return (
            <span key={status} className={`flex items-center gap-1.5 ${color}`}>
              <Icon className="w-4 h-4" /> {count} {label}
            </span>
          );
        })}
      </div>

      <div className="space-y-2">
        {OSO_DEFINITIONS.map(oso => {
          const robustness = getOsoRobustness(oso, sail);
          const style = robustnessStyles[robustness];
          const isExpanded = expanded.has(oso.id);
          const isNA = robustness === 'O';
          const status = isNA ? 'empty' : getStatus(oso.id, osoTexts, oso.template);
          const StatusIcon = status === 'complete' ? CheckCircle2 : status === 'in_progress' ? Loader2 : Circle;
          const statusColor = status === 'complete' ? 'text-green-400' : status === 'in_progress' ? 'text-yellow-400' : 'text-gray-600';

          return (
            <div key={oso.id} className={`bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] overflow-hidden ${isNA ? 'opacity-60' : ''}`}>
              <button onClick={() => toggle(oso.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#22223a] transition-colors">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                <span className="text-[#7c3aed] font-mono font-bold text-sm shrink-0 w-12">#{String(oso.id).padStart(2, '0')}</span>
                <span className="text-gray-200 text-sm flex-1 truncate">{oso.description}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${style.bg} ${style.text}`}>{style.label}</span>
                {!isNA && <StatusIcon className={`w-4 h-4 ${statusColor} shrink-0`} />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-1">
                  {isNA ? (
                    <p className="text-gray-500 text-sm italic">Ikke påkrevd for dette SAIL-nivået</p>
                  ) : (
                    <textarea
                      className="w-full bg-[#0f0f17] border border-[#2a2a3e] rounded-lg px-4 py-3 text-gray-200 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-y font-mono"
                      value={osoTexts[oso.id] ?? oso.template}
                      onChange={e => onOsoChange(oso.id, e.target.value)}
                      placeholder={oso.template}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
