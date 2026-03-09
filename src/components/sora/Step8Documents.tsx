import { ExternalLink, Download, FileText, Mail, Globe } from "lucide-react";

interface Props {
  scenario: string | null;
}

interface SubmissionPath {
  title: string;
  description: string;
  links: { label: string; url: string }[];
}

interface DocTemplate {
  title: string;
  description?: string;
  format: string;
  url: string;
}

function getSubmissionPath(scenario: string | null): SubmissionPath {
  if (!scenario) return getSubmissionPath('SORA-III-IV');

  if (scenario === 'STS-01' || scenario === 'STS-02') {
    return {
      title: 'Deklarasjon NF-1172 — Deklarasjon av standardscenario',
      description: 'Ingen søknad nødvendig. Du sender inn en deklarasjon via Luftfartstilsynets skjemaside.',
      links: [
        { label: 'Gå til NF-1172 →', url: 'https://www.luftfartstilsynet.no/skjema/droner/nf-1172-deklarasjon-av-standardscenario-sts/' },
        { label: 'Engelsk versjon →', url: 'https://www.luftfartstilsynet.no/en/forms/dronerpas/nf-1172-declaration-of-a-standard-scenario-sts/' },
      ],
    };
  }

  if (scenario === 'A1' || scenario === 'A2' || scenario === 'A3') {
    return {
      title: 'Ingen søknad nødvendig for åpen kategori',
      description: 'Sørg for at dronen er registrert på flydrone.no og at piloten har riktig kompetansebevis.',
      links: [
        { label: 'Gå til flydrone.no →', url: 'https://www.flydrone.no' },
      ],
    };
  }

  // PDRA and SORA
  return {
    title: 'Søknad NF-1145 — Søknad om operasjonstillatelse i spesifikk kategori',
    description: 'Sendes inn digitalt via Altinn. Krev innlogging med BankID som daglig leder.',
    links: [
      { label: 'Start søknad i Altinn →', url: 'https://lt.apps.altinn.no/lt/operating-permit/' },
      { label: 'Les mer om søknadsprosessen →', url: 'https://www.luftfartstilsynet.no/skjema/droner/nf-1145-soknad-om-operasjonstillatelse-i-spesifikk-kategori/' },
    ],
  };
}

const CHECKLIST: DocTemplate = {
  title: 'Sjekkliste for operasjonsmanual og SORA',
  format: 'PDF',
  url: 'https://www.luftfartstilsynet.no/globalassets/dokumenter/dronedokumenter/sjekklister/spesifikk-sjekkliste-operatorer-oktober2022.pdf',
};
const OPS_MANUAL_AMC: DocTemplate = {
  title: 'Operasjonsmanual mal (AMC)',
  format: 'PDF',
  url: 'https://www.luftfartstilsynet.no/globalassets/dokumenter/dronedokumenter/nytt-eu-regelverk/operations-manual-template---amc.pdf',
};
const CONOPS: DocTemplate = {
  title: 'ConOps mal',
  format: 'PDF',
  url: 'https://www.luftfartstilsynet.no/globalassets/dokumenter/dronedokumenter/nytt-eu-regelverk/conops-amc.pdf',
};

function getTemplates(scenario: string | null): DocTemplate[] {
  if (!scenario) return getTemplates('SORA-III-IV');

  if (scenario === 'STS-01' || scenario === 'STS-02') {
    return [
      { title: 'Operasjonsmanual mal (STS)', description: 'Offisiell mal fra EASA Appendix 5. Last ned, fyll inn og legg ved deklarasjonen.', format: 'DOCX', url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-unmanned-aircraft-systems-regulations-eu' },
      CHECKLIST,
    ];
  }

  if (scenario === 'A1' || scenario === 'A2' || scenario === 'A3') return [];

  if (scenario === 'PDRA-G01') {
    return [
      { title: 'Samsvarsmatrise PDRA-G01', description: 'Fyll ut og legg ved NF-1145 søknaden.', format: 'DOCX', url: 'https://www.luftfartstilsynet.no/globalassets/dokumenter/dronedokumenter/nytt-eu-regelverk/pdra/pdra-g01-samsvarsmatrise.docx' },
      OPS_MANUAL_AMC, CONOPS, CHECKLIST,
    ];
  }
  if (scenario === 'PDRA-G02') {
    return [
      { title: 'Samsvarsmatrise PDRA-G02', format: 'DOCX', url: 'https://www.luftfartstilsynet.no/globalassets/dokumenter/dronedokumenter/nytt-eu-regelverk/pdra/pdra-g02-samsvarsmatrise-26.03.2024.docx' },
      OPS_MANUAL_AMC, CONOPS, CHECKLIST,
    ];
  }
  if (scenario === 'PDRA-G03') {
    return [
      { title: 'Samsvarsmatrise PDRA-G03', format: 'DOCX', url: 'https://www.luftfartstilsynet.no/globalassets/dokumenter/dronedokumenter/nytt-eu-regelverk/pdra/pdra-g03-samsvarsmatrise.docx' },
      OPS_MANUAL_AMC, CONOPS, CHECKLIST,
    ];
  }
  if (scenario === 'PDRA-S01') {
    return [
      { title: 'Samsvarsmatrise PDRA-S01 (norsk)', format: 'DOCX', url: 'https://www.luftfartstilsynet.no/globalassets/dokumenter/dronedokumenter/nytt-eu-regelverk/pdra/pdra-s01-samsvarsmatrise.docx' },
      { title: 'Samsvarsmatrise PDRA-S01 (EASA engelsk)', format: 'DOCX', url: 'https://www.easa.europa.eu/en/downloads/138412/en' },
      { title: 'Eksempel operasjonsmanual PDRA-S01', format: 'DOCX', url: 'https://www.easa.europa.eu/en/downloads/139674/en' },
      CONOPS, CHECKLIST,
    ];
  }
  if (scenario === 'PDRA-S02') {
    return [
      { title: 'Samsvarsmatrise PDRA-S02 (EASA engelsk)', description: 'Ingen norsk versjon tilgjengelig.', format: 'DOCX', url: 'https://www.easa.europa.eu/en/downloads/138413/en' },
      OPS_MANUAL_AMC, CONOPS, CHECKLIST,
    ];
  }

  // SORA-III-IV / SORA-V-VI
  return [
    { title: 'SORA Template', description: 'Anbefalt risikovurderingsmal fra Luftfartstilsynet.', format: 'DOCX', url: 'https://www.luftfartstilsynet.no/globalassets/dokumenter/dronedokumenter/operasjonsmanualer/sora-template.docx' },
    CONOPS, OPS_MANUAL_AMC, CHECKLIST,
    { title: 'AltMoC til SORA Step 9', format: 'PDF', url: 'https://www.luftfartstilsynet.no/globalassets/dokumenter/dronedokumenter/caa-norway---altmoc-to-sora-step-9.pdf' },
    { title: 'SORA interaktiv veileder', description: 'Luftfartstilsynets interaktive SORA-guide (nettbasert).', format: 'Link', url: 'https://training.caa.no/SORA-veileder/index.html#/lessons/bFGKtHGa0IwrhP7DeQy_vC5Vf5N_SNq6' },
  ];
}

function isOpenCategory(scenario: string | null) {
  return scenario === 'A1' || scenario === 'A2' || scenario === 'A3';
}

export default function Step8Documents({ scenario }: Props) {
  const submission = getSubmissionPath(scenario);
  const templates = getTemplates(scenario);
  const showContact = !isOpenCategory(scenario);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[28px] font-display font-bold text-sora-text mb-1">Dokumenter og innsending</h2>
        <p className="text-sora-text-muted text-[15px] font-sora">
          Basert på scenario <span className="haiko-badge text-[11px] ml-1">{scenario || 'SORA'}</span> — her er dokumentene du trenger.
        </p>
      </div>

      {/* SECTION 1 — Submission */}
      <section className="space-y-3">
        <h3 className="haiko-label">Søknad og innsending</h3>
        <div className="haiko-card p-5">
          <p className="text-sora-text font-semibold text-sm">{submission.title}</p>
          <p className="text-sora-text-muted text-xs mt-1">{submission.description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {submission.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-sora-pink to-sora-purple text-white text-sm font-medium hover:opacity-90 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — Templates */}
      {templates.length > 0 && (
        <section className="space-y-3">
          <h3 className="haiko-label">Last ned dokumentmaler</h3>
          <div className="space-y-3">
            {templates.map((doc) => (
              <a key={doc.url} href={doc.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between haiko-card p-4 hover:border-sora-purple/40 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-sora-light text-sora-purple flex items-center justify-center shrink-0">
                    {doc.format === 'Link' ? <ExternalLink className="w-5 h-5" strokeWidth={1.5} /> : <FileText className="w-5 h-5" strokeWidth={1.5} />}
                  </div>
                  <div className="min-w-0">
                  <p className="text-sora-text font-display font-bold text-sm truncate">{doc.title}</p>
                    {doc.description && <p className="text-sora-text-dim text-xs mt-0.5 font-sora">{doc.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-sora-surface-hover text-sora-text-dim">
                    {doc.format}
                  </span>
                  <Download className="w-4 h-4 text-sora-text-dim group-hover:text-sora-purple transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 3 — Contact */}
      {showContact && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sora-text-dim">Trenger du hjelp?</h3>
          <div className="bg-sora-surface border-2 border-sora-purple/40 rounded-xl p-5">
            <p className="text-sora-text font-semibold text-sm">Haiko hjelper deg med søknadsprosessen</p>
            <p className="text-sora-text-muted text-xs mt-1">
              Vi har erfaring med SORA, PDRA og operasjonsmanualer for norske kommuner og beredskapstjenester.
            </p>
            <div className="flex flex-col gap-2 mt-4 text-sm">
              <div className="flex items-center gap-2 text-sora-text-muted">
                <Mail className="w-4 h-4 text-sora-purple" />
                <span>gunhild@haiko.no</span>
              </div>
              <div className="flex items-center gap-2 text-sora-text-muted">
                <Mail className="w-4 h-4 text-sora-purple" />
                <span>simen@haiko.no</span>
              </div>
              <div className="flex items-center gap-2 text-sora-text-muted">
                <Globe className="w-4 h-4 text-sora-purple" />
                <span>haiko.no</span>
              </div>
            </div>
            <a
              href="mailto:gunhild@haiko.no"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-sora-pink to-sora-purple text-white text-sm font-medium hover:opacity-90 transition-all"
            >
              Ta kontakt
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
