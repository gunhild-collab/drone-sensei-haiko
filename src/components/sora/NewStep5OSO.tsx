import { useState } from "react";
import { OSO_DEFINITIONS, getOsoRobustness, RobustnessLevel } from "@/lib/soraCalculations";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Props {
  sail: number;
  osoTexts: Record<number, string>;
  onOsoChange: (id: number, text: string) => void;
  applicantName: string;
  droneName: string;
  municipality: string;
  operationType: string;
  dayNight: string;
  flightAreaDescription: string;
}

const robustnessStyles: Record<RobustnessLevel, { label: string; bg: string; text: string }> = {
  O: { label: 'Ikke påkrevd', bg: 'bg-gray-700/30', text: 'text-gray-500' },
  L: { label: 'Lav', bg: 'bg-gray-500/20', text: 'text-gray-300' },
  M: { label: 'Middels', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  H: { label: 'Høy', bg: 'bg-red-500/20', text: 'text-red-400' },
};

const OSO_CATEGORIES = [
  { name: 'Organisasjon og ansvar', osos: [1, 2, 3, 4, 5] },
  { name: 'Pilotens kompetanse', osos: [6, 7, 8] },
  { name: 'UAS luftdyktighet', osos: [9, 10, 11, 12] },
  { name: 'Sikker gjennomføring', osos: [13, 14, 15, 16, 17, 18] },
  { name: 'Nødprosedyrer (ERP)', osos: [19, 20, 21, 22, 23, 24] },
];

function getStatus(osoId: number, osoTexts: Record<number, string>, template: string): 'empty' | 'in_progress' | 'complete' {
  const text = osoTexts[osoId];
  if (!text || text === template) return 'empty';
  if (text.includes('[') && text.includes(']')) return 'in_progress';
  return 'complete';
}

function prefillTemplate(template: string, data: { applicantName: string; droneName: string; municipality: string; operationType: string }): string {
  return template
    .replace('[dronenavn]', data.droneName || '[dronenavn]')
    .replace('[produsent]', data.droneName ? data.droneName.split(' ')[0] : '[produsent]')
    .replace('[operatørnavn]', data.applicantName || '[operatørnavn]')
    .replace(/\[navn\]/g, data.applicantName || '[navn]');
}

export default function NewStep5OSO({ sail, osoTexts, onOsoChange, applicantName, droneName, municipality, operationType, dayNight, flightAreaDescription }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set(OSO_CATEGORIES.map(c => c.name)));

  const toggle = (id: number) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const toggleCat = (name: string) => {
    const next = new Set(expandedCat);
    next.has(name) ? next.delete(name) : next.add(name);
    setExpandedCat(next);
  };

  const totalRequired = OSO_DEFINITIONS.filter(o => getOsoRobustness(o, sail) !== 'O').length;
  const completed = OSO_DEFINITIONS.filter(o => {
    const r = getOsoRobustness(o, sail);
    if (r === 'O') return false;
    return getStatus(o.id, osoTexts, o.template) === 'complete';
  }).length;
  const inProgress = OSO_DEFINITIONS.filter(o => {
    const r = getOsoRobustness(o, sail);
    if (r === 'O') return false;
    return getStatus(o.id, osoTexts, o.template) === 'in_progress';
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">OSO-dokumentasjon</h2>
        <p className="text-gray-400 text-sm">Alle 24 OSO-er for SAIL {sail}. Maler er forhåndsutfylt med dine data.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-green-400"><CheckCircle2 className="w-4 h-4" /> {completed} Ferdig</span>
        <span className="flex items-center gap-1.5 text-yellow-400"><Loader2 className="w-4 h-4" /> {inProgress} Under arbeid</span>
        <span className="flex items-center gap-1.5 text-gray-500"><Circle className="w-4 h-4" /> {totalRequired - completed - inProgress} Ikke startet</span>
      </div>

      {/* Categories */}
      {OSO_CATEGORIES.map(cat => {
        const catExpanded = expandedCat.has(cat.name);
        const catOsos = cat.osos.map(id => OSO_DEFINITIONS.find(o => o.id === id)!).filter(Boolean);

        return (
          <div key={cat.name} className="space-y-2">
            <button
              onClick={() => toggleCat(cat.name)}
              className="flex items-center gap-2 text-white font-semibold text-sm hover:text-[#7c3aed] transition-colors"
            >
              {catExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {cat.name}
            </button>

            {catExpanded && catOsos.map(oso => {
              const robustness = getOsoRobustness(oso, sail);
              const style = robustnessStyles[robustness];
              const isExpanded = expanded.has(oso.id);
              const isNA = robustness === 'O';
              const status = isNA ? 'empty' : getStatus(oso.id, osoTexts, oso.template);
              const StatusIcon = status === 'complete' ? CheckCircle2 : status === 'in_progress' ? Loader2 : Circle;
              const statusColor = status === 'complete' ? 'text-green-400' : status === 'in_progress' ? 'text-yellow-400' : 'text-gray-600';

              const prefilledTemplate = prefillTemplate(oso.template, { applicantName, droneName, municipality, operationType });

              return (
                <div key={oso.id} className={`bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] overflow-hidden ${isNA ? 'opacity-50' : ''}`}>
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
                        <p className="text-gray-500 text-sm italic">Ikke påkrevd for SAIL {sail}</p>
                      ) : (
                        <textarea
                          className="w-full bg-[#0f0f17] border border-[#2a2a3e] rounded-lg px-4 py-3 text-gray-200 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-y font-mono"
                          value={osoTexts[oso.id] ?? prefilledTemplate}
                          onChange={e => onOsoChange(oso.id, e.target.value)}
                          placeholder={prefilledTemplate}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
