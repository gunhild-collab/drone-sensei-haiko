import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak } from "docx";
import { saveAs } from "file-saver";
import { SoraResults, OSO_DEFINITIONS, getOsoRobustness } from "./soraCalculations";

interface ManualData {
  applicantName: string;
  applicantEmail: string;
  municipality: string;
  droneName: string;
  mtom: number;
  charDim: number;
  maxSpeed: number;
  operationType: string;
  dayNight: string;
  maxAltitude: number;
  populationDensity: string;
  results: SoraResults;
  osoTexts: Record<number, string>;
  flightAreaDescription: string;
}

const borderThin = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cellBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

function p(text: string, opts?: { bold?: boolean; italic?: boolean; size?: number; color?: string }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts?.bold, italics: opts?.italic, size: opts?.size ?? 22, color: opts?.color })],
    spacing: { after: 100 },
  });
}

function h(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 150 } });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

const popLabels: Record<string, string> = {
  controlled: 'kontrollert bakkeområde',
  sparsely: 'tynt befolket område',
  populated: 'befolket område',
  gathering: 'forsamling av mennesker',
};

function buildShortManual(data: ManualData): Paragraph[] {
  const pop = popLabels[data.populationDensity] || data.populationDensity;
  return [
    h("Operasjonsmanual"),
    p(`${data.applicantName} — ${data.municipality}`, { bold: true, size: 28 }),
    p(`Drone: ${data.droneName} | SAIL ${data.results.sailRoman} | Dato: ${new Date().toLocaleDateString('nb-NO')}`, { italic: true, color: "666666" }),
    p(""),
    p("VIKTIG: Dette dokumentet er generert som et arbeidsverktøy og må gjennomgås og tilpasses din organisasjon før bruk.", { italic: true, color: "FF0000" }),
    p(""),

    h("1. Organisasjon og ansvar", HeadingLevel.HEADING_2),
    p(`Operatør: ${data.applicantName}`),
    p(`Kontakt: ${data.applicantEmail}`),
    p("Ansvarlig leder: [Fyll inn navn]"),
    p("Sikkerhetsansvarlig: [Fyll inn navn]"),
    p(""),

    h("2. Droneystem", HeadingLevel.HEADING_2),
    p(`Fartøy: ${data.droneName}`),
    p(`MTOM: ${data.mtom} kg | Dimensjon: ${data.charDim} m | Maks hastighet: ${data.maxSpeed} m/s`),
    p(`Operasjonstype: ${data.operationType} | ${data.dayNight === 'day' ? 'Dag' : data.dayNight === 'night' ? 'Natt' : 'Dag og natt'}`),
    p(""),

    h("3. Pilotkrav og kompetanse", HeadingLevel.HEADING_2),
    p("Fjernpilot skal inneha gyldig kompetansebevis i henhold til EASA-krav."),
    p("Minimum [X] flytimer på aktuelt system. Currency: minimum [X] timer per kvartal."),
    p(""),

    h("4. Operasjonelle prosedyrer", HeadingLevel.HEADING_2),
    h("4.1 Pre-flight sjekkliste", HeadingLevel.HEADING_3),
    p("☐ Sjekk vær og vindforhold (maks [X] m/s)"),
    p("☐ Kontroller NOTAM og luftromsrestriksjoner"),
    p("☐ Visuell inspeksjon av drone og batteri"),
    p("☐ Kontroller C2-link og failsafe-innstillinger"),
    p("☐ Verifiser at operasjonsområdet er klart"),
    p("☐ Briefing av eventuelt øvrig personell"),
    p(""),
    h("4.2 Under flygning", HeadingLevel.HEADING_3),
    p("Piloten opprettholder visuell kontakt med dronen til enhver tid (VLOS)."),
    p("Kontinuerlig overvåkning av batteristatus og C2-link-kvalitet."),
    p(""),
    h("4.3 Post-flight", HeadingLevel.HEADING_3),
    p("☐ Inspiser drone for skader"),
    p("☐ Loggfør flygetid, eventuelle hendelser"),
    p("☐ Lad batterier iht. produsentens anbefalinger"),
    p(""),

    h("5. Nødprosedyrer", HeadingLevel.HEADING_2),
    p("5.1 Mistet C2-link: Dronen utfører forhåndsprogrammert RTH (Return to Home)."),
    p("5.2 Lavt batteri: Umiddelbar landing eller RTH."),
    p("5.3 Inntrengning i operasjonsvolum: Land umiddelbart."),
    p("5.4 Personskade: Ring 113. Sikre området. Varsle [ansvarlig leder]."),
    p(""),

    h("6. Vedlikehold", HeadingLevel.HEADING_2),
    p("Vedlikehold utføres i henhold til produsentens anbefalinger."),
    p("Vedlikeholdslogg føres for hver drone og batteri."),
    p(""),

    h("7. Rapportering", HeadingLevel.HEADING_2),
    p("Hendelser rapporteres til ansvarlig leder innen 24 timer."),
    p("Alvorlige hendelser meldes til Luftfartstilsynet via altinn.no."),
  ];
}

function buildMediumManual(data: ManualData): Paragraph[] {
  const short = buildShortManual(data);
  return [
    ...short,
    pageBreak(),

    h("8. Risikovurdering", HeadingLevel.HEADING_2),
    p(`Operasjonen er vurdert etter SORA 2.5-metodikken.`),
    p(`Ground Risk Class (GRC): ${data.results.finalGrc}`),
    p(`Air Risk Class (ARC): ${data.results.residualArc}`),
    p(`SAIL-nivå: ${data.results.sailRoman}`),
    p(""),
    p("Detaljert risikovurdering finnes i SORA-søknaden (separat dokument)."),
    p(""),

    h("9. Operasjonsområde", HeadingLevel.HEADING_2),
    p(`Kommune: ${data.municipality}`),
    p(`Område: ${data.flightAreaDescription || '[Beskriv operasjonsområdet]'}`),
    p(`Befolkningstetthet: ${popLabels[data.populationDensity]}`),
    p(`Maks høyde: ${data.maxAltitude} m AGL`),
    p(""),

    h("10. Menneskelige faktorer", HeadingLevel.HEADING_2),
    p("Piloten skal vurdere egen tilstand før operasjon (fatigue, stress, medisiner)."),
    p("Maks sammenhengende operasjonstid: [X] timer."),
    p("Hvileperiode mellom operasjoner: minimum [X] timer."),
    p(""),

    h("11. Sikkerhetsledelsessystem (SMS)", HeadingLevel.HEADING_2),
    p("Organisasjonen har etablert et sikkerhetsledelsessystem som inkluderer:"),
    p("- Sikkerhetskultur og rapporteringsrutiner"),
    p("- Risikovurdering og risikoakseptkriterier"),
    p("- Periodisk gjennomgang av hendelser og near-misses"),
    p("- Kompetanseutvikling og treningsprogram"),
    p(""),

    h("12. Dokumentkontroll", HeadingLevel.HEADING_2),
    p("Versjon: 1.0"),
    p(`Dato: ${new Date().toLocaleDateString('nb-NO')}`),
    p("Godkjent av: [Ansvarlig leder]"),
    p("Neste revisjon: [Dato]"),
  ];
}

function buildFullManual(data: ManualData): Paragraph[] {
  const medium = buildMediumManual(data);
  return [
    ...medium,
    pageBreak(),

    h("13. OSO Compliance — detaljert", HeadingLevel.HEADING_2),
    p("Nedenfor følger detaljert dokumentasjon for hver OSO som er påkrevd for SAIL " + data.results.sailRoman + "."),
    p(""),
    ...OSO_DEFINITIONS.flatMap(oso => {
      const robustness = getOsoRobustness(oso, data.results.sail);
      if (robustness === 'O') return [];
      const text = data.osoTexts[oso.id] || oso.template;
      return [
        h(`OSO #${String(oso.id).padStart(2, '0')} — ${oso.description}`, HeadingLevel.HEADING_3),
        p(`Påkrevd robusthet: ${robustness === 'L' ? 'Lav' : robustness === 'M' ? 'Middels' : 'Høy'}`, { bold: true }),
        p(text),
        p(""),
      ];
    }),

    pageBreak(),
    h("14. Beredskapsplan (ERP) — utvidet", HeadingLevel.HEADING_2),
    p("Varslingskjede:"),
    p("1. Pilot → Operasjonsleder"),
    p("2. Operasjonsleder → Nødetater (113/112/110)"),
    p("3. Operasjonsleder → Luftfartstilsynet (ved alvorlig hendelse)"),
    p(""),
    p("Beredskapsøvelser gjennomføres minimum [X] ganger per år."),
    p("Beredskapsplanen oppdateres etter hver hendelse/øvelse."),
    p(""),

    h("15. Kommunikasjonsprosedyrer", HeadingLevel.HEADING_2),
    p("Intern kommunikasjon: [radio/mobiltelefon] på frekvens/kanal [X]."),
    p("Ekstern kommunikasjon med ATC: [beskriv hvis relevant]."),
    p("Varsling av offentligheten: [beskriv prosedyre]."),
    p(""),

    h("16. Teknisk dokumentasjon", HeadingLevel.HEADING_2),
    p(`Drone: ${data.droneName}`),
    p("Firmware-versjon: [Fyll inn]"),
    p("Kalibreringsdato: [Fyll inn]"),
    p("Siste vedlikehold: [Fyll inn]"),
    p("Neste planlagte vedlikehold: [Fyll inn]"),
    p(""),

    h("17. Treningsprogram", HeadingLevel.HEADING_2),
    p("Grunnutdanning: [beskriv krav]"),
    p("Typekonvertering: [beskriv krav for aktuell drone]"),
    p("Periodisk trening: [beskriv hyppighet og innhold]"),
    p("Simulatortrening: [beskriv hvis relevant]"),
    p(""),

    h("18. Vedlegg", HeadingLevel.HEADING_2),
    p("A. Sjekklister (pre-flight, in-flight, post-flight)"),
    p("B. Skjema for flightlog"),
    p("C. Skjema for hendelsesrapportering"),
    p("D. Kart over operasjonsområder"),
    p("E. Tekniske datablad for drone"),
  ];
}

export async function generateOperationsManual(data: ManualData) {
  const sail = data.results.sail;
  let sections: Paragraph[];

  if (sail <= 2) {
    sections = buildShortManual(data);
  } else if (sail <= 4) {
    sections = buildMediumManual(data);
  } else {
    sections = buildFullManual(data);
  }

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  const sailLabel = data.results.sailRoman;
  saveAs(blob, `Operasjonsmanual_SAIL_${sailLabel}_${data.droneName || 'drone'}.docx`);
}
