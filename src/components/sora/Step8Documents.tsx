import { useState } from "react";
import { Download, FileText, Table, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { SoraInputs, SoraResults } from "@/lib/soraCalculations";
import { generateSoknadsskjemaNO, generateSoknadsskjemaEN, generateComplianceMatrix } from "@/lib/soraDocumentGenerators";
import { generateOperationsManual } from "@/lib/operationsManualGenerator";
import { PdraScenario } from "@/data/pdraScenarios";
import { ScenarioFormData } from "./Step5ScenarioForm";

interface Props {
  inputs: SoraInputs;
  results: SoraResults;
  osoTexts: Record<number, string>;
  applicantName: string;
  applicantEmail: string;
  municipality: string;
  flightAreaDescription: string;
  matchedScenario: PdraScenario | null;
  scenarioFormData: ScenarioFormData;
}

export default function Step8Documents({ inputs, results, osoTexts, applicantName, applicantEmail, municipality, flightAreaDescription, matchedScenario, scenarioFormData }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  const sailRoman = results.sailRoman;
  const isSora = !matchedScenario || results.sail >= 3;
  const isPdra = matchedScenario?.id.startsWith('PDRA');

  const conops = {
    operatorName: applicantName,
    maxSpeed: String(inputs.mtom > 2 ? 23 : 16),
    propulsion: 'elektrisk' as const,
    hasRemoteId: inputs.hasTransponder ? 'ja' : 'nei',
    flightGeography: flightAreaDescription,
    contingencyBuffer: scenarioFormData.contingencyBuffer || '50',
    grbMeters: scenarioFormData.grbMeters || '30',
    operationDuration: '',
    terrain: scenarioFormData.terrain || '',
    nearestAirport: scenarioFormData.nearestAirport || '',
    restrictions: scenarioFormData.restrictions || '',
  };

  const handleDownload = async (docType: string, generator: () => Promise<void>) => {
    setDownloading(docType);
    try {
      await generator();
      setDownloaded(prev => new Set(prev).add(docType));
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  const documents = [
    {
      id: 'soknad-no',
      name: 'Søknadsskjema (norsk)',
      desc: 'Offisielt SORA 2.5 søknadsskjema på norsk',
      icon: <FileText className="w-5 h-5" />,
      format: '.docx',
      show: true,
      generate: () => generateSoknadsskjemaNO(inputs, results, conops, osoTexts),
    },
    {
      id: 'soknad-en',
      name: 'Application form (English)',
      desc: 'SORA 2.5 application form in English',
      icon: <FileText className="w-5 h-5" />,
      format: '.docx',
      show: true,
      generate: () => generateSoknadsskjemaEN(inputs, results, conops, osoTexts),
    },
    {
      id: 'compliance',
      name: 'Compliance Matrix',
      desc: 'OSO compliance matrise med alle mitigeringer',
      icon: <Table className="w-5 h-5" />,
      format: '.docx',
      show: isSora || isPdra,
      generate: () => generateComplianceMatrix(inputs, results, conops, osoTexts),
    },
    {
      id: 'operations-manual',
      name: 'Operasjonsmanual',
      desc: `Tilpasset SAIL ${sailRoman} — ${results.sail <= 2 ? '~8 sider' : results.sail <= 4 ? '~20 sider' : '~40 sider'}`,
      icon: <FileText className="w-5 h-5" />,
      format: '.docx',
      show: true,
      generate: () => generateOperationsManual({
        applicantName, applicantEmail, municipality, droneName: inputs.droneName,
        mtom: inputs.mtom, charDim: inputs.characteristicDimension, maxSpeed: parseFloat(conops.maxSpeed),
        operationType: inputs.operationType, dayNight: inputs.dayNight, maxAltitude: inputs.maxAltitude,
        populationDensity: inputs.populationDensity, results, osoTexts, flightAreaDescription,
      }),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Dokumentnedlasting</h2>
        <p className="text-sora-text-muted text-sm">Last ned alle relevante dokumenter for din søknad.</p>
      </div>

      {/* Disclaimer */}
      <div className="bg-sora-warning/10 border border-sora-warning/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-sora-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sora-warning font-semibold text-sm">Viktig</p>
          <p className="text-sora-text-muted text-xs mt-1">
            Disse dokumentene er generert som arbeidsverktøy og må kvalitetssikres av ansvarlig operatør og eventuell regulatorisk rådgiver før innsending til Luftfartstilsynet.
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-sora-surface border border-sora-border rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryItem label="Søker" value={applicantName} />
        <SummaryItem label="Kommune" value={municipality} />
        <SummaryItem label="Drone" value={inputs.droneName} />
        <SummaryItem label="SAIL" value={sailRoman} highlight />
        <SummaryItem label="GRC" value={String(results.finalGrc)} />
        <SummaryItem label="ARC" value={results.residualArc} />
        <SummaryItem label="Scenario" value={matchedScenario?.id || 'Full SORA'} />
        <SummaryItem label="Type" value={inputs.operationType} />
      </div>

      {/* Document cards */}
      <div className="space-y-3">
        {documents.filter(d => d.show).map(doc => (
          <div key={doc.id} className="bg-sora-surface border border-sora-border rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${downloaded.has(doc.id) ? 'bg-sora-success/20 text-sora-success' : 'bg-sora-purple/20 text-sora-purple'}`}>
                {downloaded.has(doc.id) ? <CheckCircle className="w-5 h-5" /> : doc.icon}
              </div>
              <div>
                <p className="text-sora-text font-medium text-sm">{doc.name}</p>
                <p className="text-sora-text-dim text-xs">{doc.desc}</p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(doc.id, doc.generate)}
              disabled={downloading === doc.id}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sora-purple text-sora-text text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {downloading === doc.id ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Laster...</>
              ) : (
                <><Download className="w-4 h-4" /> {doc.format}</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Submit info */}
      <div className="bg-sora-surface border border-sora-border rounded-xl p-5">
        <h3 className="text-sora-text font-semibold text-sm mb-2">Innsending</h3>
        <p className="text-sora-text-muted text-sm">
          Send komplett søknad med alle vedlegg til: <span className="text-sora-purple font-medium">postmottak@caa.no</span>
        </p>
        <p className="text-sora-text-dim text-xs mt-2">
          Behandlingstid: ca. 8–12 uker for SORA-søknader. STS-erklæringer behandles raskere.
        </p>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-sora-text-dim text-xs">{label}</p>
      <p className={`font-semibold text-sm ${highlight ? 'text-sora-purple' : 'text-sora-text'}`}>{value || '—'}</p>
    </div>
  );
}
