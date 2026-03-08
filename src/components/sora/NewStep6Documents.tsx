import { useState } from "react";
import { Download, FileText, CheckCircle, AlertTriangle, FileCheck, BookOpen } from "lucide-react";
import { SoraInputs, SoraResults } from "@/lib/soraCalculations";
import { ConOpsFields } from "@/components/sora/SoraStep6";
import {
  generateSoknadsskjemaNO,
  generateSoknadsskjemaEN,
  generateComplianceMatrix,
} from "@/lib/soraDocumentGenerators";
import { generateOperationsManual } from "@/lib/operationsManualGenerator";

interface Props {
  inputs: SoraInputs;
  results: SoraResults;
  osoTexts: Record<number, string>;
  conopsFields: ConOpsFields;
  applicantName: string;
  applicantEmail: string;
  municipality: string;
  flightAreaDescription: string;
}

interface DocCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  format: string;
  generate: () => Promise<void>;
}

export default function NewStep6Documents({ inputs, results, osoTexts, conopsFields, applicantName, applicantEmail, municipality, flightAreaDescription }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  const handleDownload = async (id: string, generate: () => Promise<void>) => {
    setDownloading(id);
    try {
      await generate();
      setDownloaded(prev => new Set(prev).add(id));
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  const sailDesc = results.sail <= 2
    ? 'Kort mal (~8 sider) — grunnleggende prosedyrer'
    : results.sail <= 4
    ? 'Medium mal (~20 sider) — inkluderer SMS og risikovurdering'
    : 'Full mal (~40 sider) — komplett med OSO-detaljer og ERP';

  const documents: DocCard[] = [
    {
      id: "soknad-no",
      title: "SORA-søknad / ConOps (Norsk)",
      subtitle: "Offisielt skjema fra Luftfartstilsynet",
      description: "Ferdig utfylt søknad med operasjonsoversikt, ConOps, GRC/ARC/SAIL-vurdering, OSO compliance, nærområdevurdering og beredskapsplan.",
      icon: <FileText className="w-6 h-6" />,
      required: true,
      format: ".docx / PDF",
      generate: () => generateSoknadsskjemaNO(inputs, results, conopsFields, osoTexts),
    },
    {
      id: "soknad-en",
      title: "Application Form (English)",
      subtitle: "Official CAA Norway template",
      description: "English version of the SORA 2.5 application for international operations or English-speaking reviewers.",
      icon: <FileText className="w-6 h-6" />,
      required: false,
      format: ".docx",
      generate: () => generateSoknadsskjemaEN(inputs, results, conopsFields, osoTexts),
    },
    {
      id: "compliance",
      title: "Compliance Matrix",
      subtitle: "Samsvarsmatrise — påkrevd vedlegg",
      description: `OSO-matrise for SAIL ${results.sailRoman} med robusthetsnivå, M1/M2, ARC-mitigasjoner, TMPR og containment.`,
      icon: <FileCheck className="w-6 h-6" />,
      required: true,
      format: ".docx",
      generate: () => generateComplianceMatrix(inputs, results, conopsFields, osoTexts),
    },
    {
      id: "ops-manual",
      title: "Operasjonsmanual",
      subtitle: sailDesc,
      description: `Skalert operasjonsmanual basert på SAIL ${results.sailRoman}. Inneholder organisasjon, pilotkrav, prosedyrer, sjekklister, nødprosedyrer og vedlikehold.`,
      icon: <BookOpen className="w-6 h-6" />,
      required: true,
      format: ".docx (redigerbar)",
      generate: () => generateOperationsManual({
        applicantName,
        applicantEmail,
        municipality,
        droneName: inputs.droneName,
        mtom: inputs.mtom,
        charDim: inputs.characteristicDimension,
        maxSpeed: parseFloat(conopsFields.maxSpeed) || 15,
        operationType: inputs.operationType,
        dayNight: inputs.dayNight,
        maxAltitude: inputs.maxAltitude,
        populationDensity: inputs.populationDensity,
        results,
        osoTexts,
        flightAreaDescription,
      }),
    },
  ];

  const requiredCount = documents.filter(d => d.required).length;
  const downloadedRequired = documents.filter(d => d.required && downloaded.has(d.id)).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Dokumentgenerering</h2>
        <p className="text-gray-400 text-sm">Alle dokumenter er ferdig utfylt med dine data. Last ned, gjennomgå og send inn.</p>
      </div>

      {/* Readiness */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a3e] flex items-start gap-3">
        <div className={`mt-0.5 ${downloadedRequired === requiredCount ? "text-green-400" : "text-yellow-400"}`}>
          {downloadedRequired === requiredCount ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div>
          <p className="text-white text-sm font-medium">
            {downloadedRequired === requiredCount
              ? "Alle påkrevde dokumenter er lastet ned!"
              : `${downloadedRequired} av ${requiredCount} påkrevde dokumenter lastet ned`}
          </p>
          <p className="text-gray-400 text-xs mt-1">Søknad + compliance matrix + operasjonsmanual trengs for innsending.</p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <p className="text-red-300 text-sm">
          <strong>VIKTIG:</strong> Dokumentene er utkast generert som arbeidsverktøy. Gjennomgå og kvalitetssikre alle dokumenter før innsending til Luftfartstilsynet. Fyll inn tomme felt markert med «___» eller «[…]».
        </p>
      </div>

      {/* Document cards */}
      <div className="space-y-3">
        {documents.map(doc => {
          const isDownloading = downloading === doc.id;
          const isDownloaded = downloaded.has(doc.id);

          return (
            <div
              key={doc.id}
              className={`bg-[#1a1a2e] rounded-xl p-5 border transition-all ${
                isDownloaded ? "border-green-500/30" : "border-[#2a2a3e] hover:border-[#7c3aed]/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg ${isDownloaded ? "bg-green-500/10 text-green-400" : "bg-[#7c3aed]/10 text-[#7c3aed]"}`}>
                    {doc.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold text-sm">{doc.title}</h3>
                      {doc.required && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#7c3aed]/20 text-[#7c3aed]">Påkrevd</span>
                      )}
                      {isDownloaded && <CheckCircle className="w-4 h-4 text-green-400" />}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{doc.subtitle}</p>
                    <p className="text-gray-400 text-xs mt-2 leading-relaxed">{doc.description}</p>
                    <p className="text-gray-600 text-[10px] mt-1">Format: {doc.format}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(doc.id, doc.generate)}
                  disabled={isDownloading}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isDownloading
                      ? "bg-[#2a2a3e] text-gray-500 cursor-wait"
                      : isDownloaded
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      : "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                  }`}
                >
                  <Download className={`w-4 h-4 ${isDownloading ? "animate-bounce" : ""}`} />
                  {isDownloading ? "Genererer..." : isDownloaded ? "Last ned igjen" : "Last ned"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission */}
      <div className="bg-[#0f0f17] rounded-xl p-4 border border-[#2a2a3e]">
        <p className="text-gray-400 text-xs font-semibold mb-2">📬 Innsending til Luftfartstilsynet:</p>
        <p className="text-gray-500 text-xs leading-relaxed">
          Send komplett dokumentasjon til <strong className="text-gray-300">postmottak@caa.no</strong>. Legg ved alle tre dokumenter.
          Saksbehandlingstid er normalt 2–6 uker avhengig av kompleksitet.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a3e]">
        <h3 className="text-white font-semibold text-sm mb-3">Oppsummering</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="text-gray-500">Søker:</span> <span className="text-white">{applicantName}</span></div>
          <div><span className="text-gray-500">Kommune:</span> <span className="text-white">{municipality}</span></div>
          <div><span className="text-gray-500">Drone:</span> <span className="text-white">{inputs.droneName}</span></div>
          <div><span className="text-gray-500">SAIL:</span> <span className="text-[#ec4899] font-bold">{results.sailRoman}</span></div>
          <div><span className="text-gray-500">GRC:</span> <span className="text-white">{results.finalGrc}</span></div>
          <div><span className="text-gray-500">ARC:</span> <span className="text-white">{results.residualArc}</span></div>
        </div>
      </div>
    </div>
  );
}
