import { CheckCircle2, AlertTriangle, ArrowRight, Phone, FileText, GraduationCap, ShieldAlert, BookOpen } from "lucide-react";

interface Props {
  scenario: string;
  sailRoman: string;
  sail: number;
  operationType: string;
  droneName: string;
  completedRequirements: Set<string>;
}

interface ActionItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  haikoCanHelp: boolean;
  selfServiceUrl?: string;
  selfServiceLabel?: string;
  summary: string;
}

function getActionItems(scenario: string, sail: number, operationType: string): ActionItem[] {
  const items: ActionItem[] = [
    {
      id: "ops-manual",
      title: "Operasjonsmanual",
      icon: <BookOpen className="w-5 h-5" />,
      haikoCanHelp: true,
      summary: `Du trenger en operasjonsmanual tilpasset SAIL ${sail >= 3 ? "III+" : sail === 2 ? "II" : "I"}${sail >= 3 ? " med SMS (Safety Management System)" : ""}. Haiko lager denne basert på din SORA-analyse.`,
    },
    {
      id: "erp",
      title: "Beredskapsplan (ERP)",
      icon: <ShieldAlert className="w-5 h-5" />,
      haikoCanHelp: true,
      summary: `En Emergency Response Plan som dekker nødlanding, flyktplan og varslingsprosedyrer${operationType === "BVLOS" ? " – utvidet for BVLOS med automatiske failsafe-prosedyrer" : ""}.`,
    },
  ];

  const isSTS = scenario.startsWith("STS");
  const isPDRA = scenario.startsWith("PDRA");
  if (isSTS || isPDRA || sail >= 2) {
    items.push({
      id: "pilot-cert",
      title: isSTS ? "STS-sertifisert pilot" : "Pilotsertifikat",
      icon: <GraduationCap className="w-5 h-5" />,
      haikoCanHelp: false,
      selfServiceUrl: "https://luftfartstilsynet.no/droner/opplaring/",
      selfServiceLabel: "Finn godkjent treningssenter (ATO)",
      summary: isSTS
        ? `For ${scenario} kreves praktisk og teoretisk opplæring ved et godkjent treningssenter.`
        : `For SAIL ${sail >= 3 ? "III+" : "II"} trengs dokumentert pilotkompetanse.`,
    });
  }

  items.push({
    id: "insurance",
    title: "Ansvarsforsikring",
    icon: <FileText className="w-5 h-5" />,
    haikoCanHelp: false,
    summary: "Gyldig ansvarsforsikring som dekker droneoperasjoner er lovpålagt for kommersielle operasjoner.",
  });

  items.push({
    id: "registration",
    title: "Operatørregistrering",
    icon: <FileText className="w-5 h-5" />,
    haikoCanHelp: false,
    selfServiceUrl: "https://flydrone.no",
    selfServiceLabel: "Gå til flydrone.no",
    summary: "Du må være registrert som droneoperatør hos Luftfartstilsynet med et gyldig NOR-nummer.",
  });

  return items;
}

export default function StepActionPlan({ scenario, sailRoman, sail, operationType, droneName, completedRequirements }: Props) {
  const items = getActionItems(scenario, sail, operationType);
  const missing = items.filter(i => !completedRequirements.has(i.id));
  const done = items.filter(i => completedRequirements.has(i.id));
  const haikoItems = missing.filter(i => i.haikoCanHelp);
  const selfItems = missing.filter(i => !i.haikoCanHelp);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[22px] font-bold text-sora-text font-display mb-1">Din handlingsplan</h2>
        <p className="text-sora-text-dim text-[14px] font-sora">
          Basert på <span className="haiko-badge text-[11px]">{scenario}</span> SAIL {sailRoman} – her er hva som gjenstår før du kan sende inn søknaden.
        </p>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-sora-surface border border-sora-border rounded-xl p-4 text-center">
          <span className="text-2xl font-bold text-sora-text font-display">{missing.length}</span>
          <p className="text-sora-text-dim text-xs font-sora mt-1">gjenstår</p>
        </div>
        <div className="bg-sora-surface border border-sora-border rounded-xl p-4 text-center">
          <span className="text-2xl font-bold text-green-400 font-display">{done.length}</span>
          <p className="text-sora-text-dim text-xs font-sora mt-1">fullført</p>
        </div>
      </div>

      {/* Haiko can help section */}
      {haikoItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sora-text text-sm font-semibold font-sora flex items-center gap-2">
            <Phone className="w-4 h-4 text-sora-purple" />
            Haiko kan hjelpe deg med dette
          </h3>
          <div className="bg-gradient-to-br from-sora-purple/5 to-sora-pink/5 border border-sora-purple/20 rounded-xl p-5 space-y-4">
            {haikoItems.map(item => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-sora-purple/10 text-sora-purple flex items-center justify-center shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sora-text text-sm font-semibold font-sora">{item.title}</h4>
                  <p className="text-sora-text-dim text-[12px] font-sora mt-0.5 leading-relaxed">{item.summary}</p>
                </div>
              </div>
            ))}
            <a
              href="mailto:gunhild@haiko.no?subject=Hjelp med SORA-dokumentasjon&body=Hei! Jeg trenger hjelp med operasjonsmanual og/eller ERP for mitt droneprosjekt."
              className="haiko-btn-primary w-full text-sm mt-2"
            >
              <Phone className="w-4 h-4" strokeWidth={1.5} />
              Kontakt Haiko for hjelp med dokumentasjon
            </a>
            <p className="text-sora-text-muted text-[11px] font-sora text-center">
              Vi lager operasjonsmanual og ERP basert på din SORA-analyse – tilpasset ditt scenario og SAIL-nivå.
            </p>
          </div>
        </div>
      )}

      {/* Self-service section */}
      {selfItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sora-text text-sm font-semibold font-sora flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Du må ordne dette selv
          </h3>
          <div className="space-y-2">
            {selfItems.map(item => (
              <div key={item.id} className="bg-sora-surface border border-sora-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-sora-light text-sora-text-dim flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sora-text text-sm font-semibold font-sora">{item.title}</h4>
                    <p className="text-sora-text-dim text-[12px] font-sora mt-0.5 leading-relaxed">{item.summary}</p>
                    {item.selfServiceUrl && (
                      <a
                        href={item.selfServiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sora-purple text-[12px] font-medium font-sora mt-2 hover:underline"
                      >
                        {item.selfServiceLabel} <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed items */}
      {done.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sora-text text-sm font-semibold font-sora flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Allerede på plass
          </h3>
          {done.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-sora-text text-sm font-sora">{item.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* All done */}
      {missing.length === 0 && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sora-text font-semibold font-sora">Alt er på plass!</p>
          <p className="text-sora-text-dim text-sm font-sora mt-1">Du er klar til å sende inn søknaden til Luftfartstilsynet.</p>
        </div>
      )}

      {/* Save analysis CTA */}
      <div className="bg-sora-surface border border-sora-border rounded-xl p-4">
        <p className="text-sora-text text-sm font-semibold font-sora mb-1">💾 Lagre analysen din</p>
        <p className="text-sora-text-dim text-[12px] font-sora leading-relaxed">
          Denne SORA-analysen kan brukes som grunnlag når du er klar til å søke. Haiko tar vare på all informasjonen du har fylt inn.
        </p>
      </div>
    </div>
  );
}
