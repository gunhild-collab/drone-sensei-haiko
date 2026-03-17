import { useState } from "react";
import {
  BookOpen,
  ShieldAlert,
  GraduationCap,
  FileText,
  Upload,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Phone,
} from "lucide-react";

interface Props {
  scenario: string;
  sailRoman: string;
  sail: number;
  operationType: string;
  droneName: string;
  onCompletedChange?: (completed: Set<string>) => void;
}

interface Requirement {
  id: string;
  title: string;
  description: string;
  why: string;
  icon: React.ReactNode;
  required: boolean;
  actions: RequirementAction[];
}

interface RequirementAction {
  label: string;
  type: "toggle" | "upload" | "link" | "contact";
  href?: string;
}

const OPEN_SCENARIOS = ["A1", "A2", "A3"];

function getRequirements(scenario: string, sail: number, operationType: string): Requirement[] {
  const isOpen = OPEN_SCENARIOS.includes(scenario);
  const isSTS = scenario.startsWith("STS");
  const isPDRA = scenario.startsWith("PDRA");
  const isBVLOS = operationType === "BVLOS";
  const needsStsePilot = isSTS || isPDRA || sail >= 2;

  if (isOpen) {
    return [
      {
        id: "registration",
        title: "Operatørregistrering",
        description: "Du må registrere deg som droneoperatør hos Luftfartstilsynet via flydrone.no.",
        why: "Alle som flyr drone over 250g eller med kamera må være registrert.",
        icon: <FileText className="w-5 h-5" />,
        required: true,
        actions: [
          { label: "Gå til flydrone.no", type: "link", href: "https://flydrone.no" },
        ],
      },
      {
        id: "a-cert",
        title: "A1/A3-kompetansebevis",
        description: "Gjennomfør nettbasert kunnskapsprøve hos Luftfartstilsynet.",
        why: "Påkrevd for alle operasjoner i åpen kategori med droner over 250g.",
        icon: <GraduationCap className="w-5 h-5" />,
        required: true,
        actions: [
          { label: "Gå til nettprøve", type: "link", href: "https://flydrone.no" },
        ],
      },
    ];
  }

  const reqs: Requirement[] = [
    {
      id: "ops-manual",
      title: "Operasjonsmanual",
      description: `En operasjonsmanual beskriver organisasjonen din, prosedyrer for sikker flyging, vedlikehold, nødprosedyrer og ansvarsforhold. For SAIL ${sail >= 3 ? "III+" : sail === 2 ? "II" : "I"} kreves ${sail >= 3 ? "en detaljert manual med SMS (Safety Management System)" : "en grunnleggende manual"}.`,
      why: "Luftfartstilsynet krever at alle operatører i spesifikk kategori har en godkjent operasjonsmanual som dokumenterer hvordan operasjoner gjennomføres sikkert.",
      icon: <BookOpen className="w-5 h-5" />,
      required: true,
      actions: [
        { label: "Jeg har operasjonsmanual", type: "toggle" },
        { label: "Last opp eksisterende manual", type: "upload" },
        { label: "Haiko kan hjelpe med å lage en", type: "contact" },
      ],
    },
    {
      id: "erp",
      title: "Beredskapsplan (ERP)",
      description: `En Emergency Response Plan beskriver hva som skjer hvis noe går galt: nødlanding, flyktplan, kontaktpersoner og varslingsprosedyrer.${isBVLOS ? " For BVLOS-operasjoner kreves det en utvidet ERP med kommunikasjonskjede og automatiske failsafe-prosedyrer." : ""}`,
      why: "ERP sikrer at du og teamet vet nøyaktig hva som skal gjøres i en nødsituasjon. Dette reduserer skadeomfanget og er lovpålagt for spesifikk kategori.",
      icon: <ShieldAlert className="w-5 h-5" />,
      required: true,
      actions: [
        { label: "Jeg har ERP", type: "toggle" },
        { label: "Last opp eksisterende ERP", type: "upload" },
        { label: "Haiko kan hjelpe med å lage en", type: "contact" },
      ],
    },
  ];

  if (needsStsePilot) {
    reqs.push({
      id: "pilot-cert",
      title: isSTS ? "STS-sertifisert pilot" : "Pilotsertifikat for spesifikk kategori",
      description: isSTS
        ? `For ${scenario} kreves det at piloten har gjennomført praktisk og teoretisk opplæring ved et godkjent treningssenter (ATO). Dette inkluderer flygetimer, teoriprøve og praktisk eksamen.`
        : `For SAIL ${sail >= 3 ? "III+" : "II"} trenger piloten tilstrekkelig opplæring dokumentert i operasjonsmanualen. ${isPDRA ? "PDRA-scenariet krever spesifikk treningsdokumentasjon." : ""}`,
      why: "Pilotkompetanse er den viktigste enkeltfaktoren for sikker droneoperasjon. Sertifiseringen sikrer at piloten kan håndtere unormale situasjoner.",
      icon: <GraduationCap className="w-5 h-5" />,
      required: true,
      actions: [
        { label: "Piloten er sertifisert", type: "toggle" },
        { label: "Finn godkjent treningssenter (ATO)", type: "link", href: "https://luftfartstilsynet.no/droner/opplaring/" },
      ],
    });
  }

  reqs.push({
    id: "insurance",
    title: "Ansvarsforsikring",
    description: "Du må ha gyldig ansvarsforsikring som dekker droneoperasjoner. De fleste forsikringsselskaper tilbyr dette som tillegg eller egen polise.",
    why: "Forsikring er lovpålagt for alle kommersielle droneoperasjoner og anbefalt for alle andre. Den dekker skade på tredjeperson og eiendom.",
    icon: <FileText className="w-5 h-5" />,
    required: true,
    actions: [
      { label: "Jeg har forsikring", type: "toggle" },
    ],
  });

  reqs.push({
    id: "registration",
    title: "Operatørregistrering",
    description: "Du må være registrert som droneoperatør hos Luftfartstilsynet og ha et gyldig operatør-ID (NOR-nummer).",
    why: "Registrering er lovpålagt og gir deg et unikt operatør-ID som skal merkes på dronen.",
    icon: <FileText className="w-5 h-5" />,
    required: true,
    actions: [
      { label: "Jeg er registrert", type: "toggle" },
      { label: "Gå til flydrone.no", type: "link", href: "https://flydrone.no" },
    ],
  });

  return reqs;
}

export default function StepRequirements({ scenario, sailRoman, sail, operationType, droneName, onCompletedChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ops-manual"]));
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [hasItem, setHasItem] = useState<Record<string, boolean>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  const requirements = getRequirements(scenario, sail, operationType);
  const completedCount = requirements.filter(r => completed.has(r.id)).length;

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markHasItem = (id: string) => {
    setHasItem(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) {
        setCompleted(p => new Set(p).add(id));
      } else {
        setCompleted(p => { const n = new Set(p); n.delete(id); return n; });
      }
      return next;
    });
  };

  const handleFileUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [id]: file.name }));
      setCompleted(prev => new Set(prev).add(id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[22px] font-bold text-sora-text font-sora mb-1">Hva kreves nå?</h2>
        <p className="text-sora-text-dim text-[14px] font-sora">
          Basert på scenario <span className="haiko-badge text-[11px]">{scenario}</span> og SAIL {sailRoman} — her er alt du trenger for å komme i gang.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-sora-surface border border-sora-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sora-text text-sm font-semibold font-sora">Fremgang</span>
          <span className="text-sora-text-dim text-xs font-sora">{completedCount} av {requirements.length} fullført</span>
        </div>
        <div className="w-full h-2 bg-sora-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sora-pink to-sora-purple rounded-full transition-all duration-500"
            style={{ width: `${requirements.length > 0 ? (completedCount / requirements.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Info box */}
      <div className="bg-sora-light border-l-[3px] border-sora-purple rounded-lg p-4">
        <p className="text-sora-text text-[13px] font-sora leading-relaxed">
          <strong>Hvorfor er dette viktig?</strong> Luftfartstilsynet krever at du har dokumentasjon på plass
          <em> før</em> du sender inn søknaden. Gå gjennom hvert punkt under — vi forklarer hva det er og hvorfor det trengs.
        </p>
      </div>

      {/* Requirement cards */}
      <div className="space-y-3">
        {requirements.map((req, idx) => {
          const isExpanded = expanded.has(req.id);
          const isDone = completed.has(req.id);
          const hasToggle = hasItem[req.id];

          return (
            <div
              key={req.id}
              className={`bg-sora-surface rounded-xl border transition-all ${
                isDone ? "border-green-500/30" : "border-sora-border hover:border-sora-purple/30"
              }`}
            >
              {/* Header row */}
              <button
                onClick={() => toggle(req.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                  isDone
                    ? "bg-green-500/10 text-green-400"
                    : "bg-sora-light text-sora-purple"
                }`}>
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold font-sora">{idx + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sora-text font-semibold text-[14px] font-sora">{req.title}</h3>
                    {req.required && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sora-purple/10 text-sora-purple font-sora">
                        Påkrevd
                      </span>
                    )}
                  </div>
                </div>
                <div className={`p-1.5 rounded-lg ${isDone ? "text-green-400" : "text-sora-text-dim"}`}>
                  {req.icon}
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-sora-text-dim shrink-0" /> : <ChevronRight className="w-4 h-4 text-sora-text-dim shrink-0" />}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0 space-y-4">
                  <div className="ml-11 space-y-3">
                    {/* Description */}
                    <p className="text-sora-text text-[13px] font-sora leading-relaxed">{req.description}</p>

                    {/* Why box */}
                    <div className="bg-sora-bg rounded-lg p-3 border border-sora-border">
                      <p className="text-sora-text-dim text-[12px] font-sora leading-relaxed">
                        <span className="text-sora-purple font-semibold">Hvorfor?</span> {req.why}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {req.actions.map((action, ai) => {
                        if (action.type === "toggle") {
                          return (
                            <button
                              key={ai}
                              onClick={() => markHasItem(req.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium font-sora transition-all ${
                                hasToggle
                                  ? "bg-green-500/10 text-green-400 border border-green-500/30"
                                  : "bg-sora-light text-sora-text border border-sora-border hover:border-sora-purple/30"
                              }`}
                            >
                              {hasToggle ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                              {action.label}
                            </button>
                          );
                        }
                        if (action.type === "upload") {
                          const fileId = `upload-${req.id}`;
                          return (
                            <label
                              key={ai}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium font-sora bg-sora-light text-sora-text border border-sora-border hover:border-sora-purple/30 cursor-pointer transition-all"
                            >
                              <Upload className="w-4 h-4" />
                              {uploadedFiles[req.id] || action.label}
                              <input
                                id={fileId}
                                type="file"
                                className="hidden"
                                accept=".pdf,.docx,.doc"
                                onChange={(e) => handleFileUpload(req.id, e)}
                              />
                            </label>
                          );
                        }
                        if (action.type === "link") {
                          return (
                            <a
                              key={ai}
                              href={action.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium font-sora bg-sora-light text-sora-purple border border-sora-border hover:border-sora-purple/30 transition-all"
                            >
                              <ExternalLink className="w-4 h-4" />
                              {action.label}
                            </a>
                          );
                        }
                        if (action.type === "contact") {
                          return (
                            <a
                              key={ai}
                              href="mailto:gunhild@haiko.no?subject=Hjelp med operasjonsmanual"
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium font-sora bg-sora-purple/10 text-sora-purple border border-sora-purple/20 hover:bg-sora-purple/20 transition-all"
                            >
                              <Phone className="w-4 h-4" />
                              {action.label}
                            </a>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary when all done */}
      {completedCount === requirements.length && requirements.length > 0 && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sora-text text-sm font-semibold font-sora">Alt er på plass!</p>
            <p className="text-sora-text-dim text-xs font-sora mt-1">
              Du har bekreftet alle kravene. Gå videre for å fylle ut søknadsskjema og generere dokumenter.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
