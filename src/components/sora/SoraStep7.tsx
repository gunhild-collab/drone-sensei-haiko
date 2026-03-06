import { useState } from "react";
import { Download, FileText, CheckCircle, AlertTriangle, FileCheck } from "lucide-react";
import { SoraInputs, SoraResults } from "@/lib/soraCalculations";
import { ConOpsFields } from "./SoraStep6";
import {
  generateSoknadsskjemaNO,
  generateSoknadsskjemaEN,
  generateComplianceMatrix,
} from "@/lib/soraDocumentGenerators";

interface Props {
  inputs: SoraInputs;
  results: SoraResults;
  osoTexts: Record<number, string>;
  conopsFields: ConOpsFields;
}

interface DocCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  generate: () => Promise<void>;
}

export default function SoraStep7({ inputs, results, osoTexts, conopsFields }: Props) {
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

  const documents: DocCard[] = [
    {
      id: "soknad-no",
      title: "Søknadsskjema (Norsk)",
      subtitle: "Offisielt skjema fra Luftfartstilsynet",
      description: "Ferdig utfylt søknad om operasjonstillatelse i spesifikk kategori (SORA 2.5). Inneholder operatørinformasjon, dronedata og alle SORA-steg (1–9).",
      icon: <FileText className="w-6 h-6" />,
      required: true,
      generate: () => generateSoknadsskjemaNO(inputs, results, conopsFields, osoTexts),
    },
    {
      id: "soknad-en",
      title: "Application Form (English)",
      subtitle: "Official CAA Norway template",
      description: "Pre-filled application for operational authorisation in Specific category (SORA 2.5). Same content as the Norwegian version, in English.",
      icon: <FileText className="w-6 h-6" />,
      required: false,
      generate: () => generateSoknadsskjemaEN(inputs, results, conopsFields, osoTexts),
    },
    {
      id: "compliance",
      title: "Compliance Matrix",
      subtitle: "Samsvarsmatrise — påkrevd vedlegg",
      description: "Komplett OSO-matrise med robusthetsnivå for SAIL " + results.sailRoman + ", bakkemitigasjoner (M1/M2), luftrisikoklasse, TMPR og containment-krav.",
      icon: <FileCheck className="w-6 h-6" />,
      required: true,
      generate: () => generateComplianceMatrix(inputs, results, conopsFields, osoTexts),
    },
  ];

  const requiredCount = documents.filter(d => d.required).length;
  const downloadedRequired = documents.filter(d => d.required && downloaded.has(d.id)).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Dokumenter for innsending</h2>
        <p className="text-gray-400 text-sm">
          Last ned ferdig utfylte offisielle maler fra Luftfartstilsynet. Alle dokumenter er fylt ut basert på dataene du har oppgitt i veiviseren.
        </p>
      </div>

      {/* Readiness indicator */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a3e] flex items-start gap-3">
        <div className={`mt-0.5 ${downloadedRequired === requiredCount ? "text-green-400" : "text-yellow-400"}`}>
          {downloadedRequired === requiredCount ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div>
          <p className="text-white text-sm font-medium">
            {downloadedRequired === requiredCount
              ? "Alle påkrevde dokumenter er lastet ned"
              : `${downloadedRequired} av ${requiredCount} påkrevde dokumenter lastet ned`}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Du trenger søknadsskjemaet + samsvarsmatrisen + en operasjonsmanual for å sende inn til Luftfartstilsynet.
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <p className="text-red-300 text-sm">
          <strong>VIKTIG:</strong> Dokumentene er generert som arbeidsverktøy. Gjennomgå og kvalitetssikre alle dokumenter før innsending.
          Fyll inn tomme felt markert med «___» manuelt.
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
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold text-sm">{doc.title}</h3>
                      {doc.required && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#7c3aed]/20 text-[#7c3aed]">
                          Påkrevd
                        </span>
                      )}
                      {isDownloaded && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{doc.subtitle}</p>
                    <p className="text-gray-400 text-xs mt-2 leading-relaxed">{doc.description}</p>
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
                  {isDownloading ? "Genererer..." : isDownloaded ? "Last ned igjen" : "Last ned .docx"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operations manual note */}
      <div className="bg-[#1a1a2e] rounded-xl p-5 border border-dashed border-[#2a2a3e]">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-yellow-500/10 text-yellow-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Operasjonsmanual</h3>
            <p className="text-gray-500 text-xs mt-0.5">Må utarbeides separat</p>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">
              Operasjonsmanualen er et eget dokument som beskriver organisasjonen, prosedyrer, nødprosedyrer og vedlikeholdsrutiner i detalj.
              ConOps-dokumentet (steg 6) kan brukes som grunnlag. Operasjonsmanualen må refereres i søknadsskjemaet felt 2.8.
            </p>
          </div>
        </div>
      </div>

      {/* Submission info */}
      <div className="bg-[#0f0f17] rounded-xl p-4 border border-[#2a2a3e]">
        <p className="text-gray-400 text-xs font-semibold mb-2">📬 Innsending til Luftfartstilsynet:</p>
        <p className="text-gray-500 text-xs leading-relaxed">
          Send komplett dokumentasjon til <strong className="text-gray-300">postmottak@caa.no</strong> eller per post til
          Luftfartstilsynet, Postboks 243, 8001 Bodø. Legg ved: (1) søknadsskjema, (2) samsvarsmatrise, (3) operasjonsmanual.
        </p>
      </div>
    </div>
  );
}
