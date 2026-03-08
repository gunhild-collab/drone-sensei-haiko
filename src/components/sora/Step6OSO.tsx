import { useState } from "react";
import { ChevronDown, ChevronUp, Info, Shield } from "lucide-react";
import { OSO_DEFINITIONS, OsoDefinition, getOsoRobustness, RobustnessLevel } from "@/lib/soraCalculations";

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

const OSO_CATEGORIES = [
  { name: 'Organisasjon og ansvar', osos: [1, 5, 12] },
  { name: 'Pilotens kompetanse', osos: [6, 7, 8, 23] },
  { name: 'UAS luftdyktighet', osos: [2, 3, 4, 18, 24] },
  { name: 'Sikker gjennomføring', osos: [9, 10, 11, 15, 16, 17] },
  { name: 'Teknisk / DAA', osos: [19, 20, 21, 22] },
  { name: 'Nødprosedyrer (ERP)', osos: [13, 14] },
];

function robLabel(r: RobustnessLevel): string {
  return { O: 'N/A', L: 'Lav', M: 'Middels', H: 'Høy' }[r];
}

function robColor(r: RobustnessLevel): string {
  return { O: 'text-sora-text-dim', L: 'text-sora-success', M: 'text-sora-warning', H: 'text-sora-danger' }[r];
}

function fillTemplate(template: string, data: { applicantName: string; droneName: string; municipality: string; operationType: string; dayNight: string; flightAreaDescription: string }): string {
  return template
    .replace(/\[navn\]/gi, data.applicantName || '[navn]')
    .replace(/\[dronenavn\]/gi, data.droneName || '[dronenavn]')
    .replace(/\[produsent\]/gi, data.droneName?.split(' ')[0] || '[produsent]')
    .replace(/\[kommune\]/gi, data.municipality || '[kommune]');
}

export default function Step6OSO({ sail, osoTexts, onOsoChange, applicantName, droneName, municipality, operationType, dayNight, flightAreaDescription }: Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(OSO_CATEGORIES[0].name);
  const [expandedGuidance, setExpandedGuidance] = useState<number | null>(null);

  const relevantOsos = OSO_DEFINITIONS.filter(oso => {
    const rob = getOsoRobustness(oso, sail);
    return rob !== 'O';
  });

  const relevantCount = relevantOsos.length;
  const filledCount = relevantOsos.filter(oso => (osoTexts[oso.id] || '').trim().length > 20).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">OSO-dokumentasjon</h2>
        <p className="text-sora-text-muted text-sm">
          SAIL {['', 'I', 'II', 'III', 'IV', 'V', 'VI'][sail]} krever dokumentasjon for {relevantCount} OSO-er.
          <span className="text-sora-purple ml-1">{filledCount}/{relevantCount} utfylt</span>
        </p>
      </div>

      {/* Progress */}
      <div className="w-full bg-sora-bg rounded-full h-2">
        <div className="bg-sora-purple h-2 rounded-full transition-all" style={{ width: `${(filledCount / Math.max(relevantCount, 1)) * 100}%` }} />
      </div>

      {/* Categories */}
      {OSO_CATEGORIES.map(cat => {
        const catOsos = cat.osos.map(id => OSO_DEFINITIONS.find(o => o.id === id)!).filter(Boolean);
        const relevantCatOsos = catOsos.filter(oso => getOsoRobustness(oso, sail) !== 'O');
        if (relevantCatOsos.length === 0) return null;

        const isOpen = expandedCategory === cat.name;

        return (
          <div key={cat.name} className="border border-sora-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedCategory(isOpen ? null : cat.name)}
              className="w-full flex items-center justify-between px-5 py-3 bg-sora-surface hover:bg-sora-surface-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-sora-purple" />
                <span className="text-sora-text font-medium text-sm">{cat.name}</span>
                <span className="text-sora-text-dim text-xs">({relevantCatOsos.length})</span>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-sora-text-dim" /> : <ChevronDown className="w-4 h-4 text-sora-text-dim" />}
            </button>

            {isOpen && (
              <div className="p-4 space-y-4 bg-sora-bg">
                {relevantCatOsos.map(oso => {
                  const rob = getOsoRobustness(oso, sail);
                  const currentText = osoTexts[oso.id] ?? fillTemplate(oso.template, { applicantName, droneName, municipality, operationType, dayNight, flightAreaDescription });

                  // Initialize text if not set
                  if (!(oso.id in osoTexts)) {
                    setTimeout(() => onOsoChange(oso.id, currentText), 0);
                  }

                  return (
                    <div key={oso.id} className="bg-sora-surface border border-sora-border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sora-purple font-mono text-xs font-bold">OSO #{String(oso.id).padStart(2, '0')}</span>
                            <span className={`text-xs font-semibold ${robColor(rob)}`}>{robLabel(rob)}</span>
                          </div>
                          <p className="text-sora-text text-sm mt-1">{oso.description}</p>
                        </div>
                        <button
                          onClick={() => setExpandedGuidance(expandedGuidance === oso.id ? null : oso.id)}
                          className="text-sora-text-dim hover:text-sora-purple transition-colors"
                          title="Veiledning"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>

                      {expandedGuidance === oso.id && (
                        <div className="bg-sora-purple/5 border border-sora-purple/20 rounded-lg p-3 text-xs text-sora-text-muted">
                          <p className="font-semibold text-sora-purple mb-1">Veiledning</p>
                          <p>Beskriv hvordan din organisasjon oppfyller dette kravet. Referer til operasjonsmanualen der mulig. For robusthet «{robLabel(rob)}» kreves {rob === 'L' ? 'grunnleggende' : rob === 'M' ? 'dokumenterte prosedyrer med verifisering' : 'uavhengig verifisering og validering'}.</p>
                        </div>
                      )}

                      <textarea
                        className="w-full bg-sora-bg border border-sora-border rounded-lg px-3 py-2 text-sora-text text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-sora-purple transition-colors"
                        value={currentText}
                        onChange={e => onOsoChange(oso.id, e.target.value)}
                        placeholder="Beskriv compliance..."
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
