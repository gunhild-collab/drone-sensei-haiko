// Official Luftfartstilsynet SORA 2.5 document generators
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { SoraInputs, SoraResults, OSO_DEFINITIONS, getOsoRobustness, RobustnessLevel } from "./soraCalculations";
import { ConOpsFields } from "@/components/sora/SoraStep6";

// ─── Helpers ───────────────────────────────────────────────────────

const borderNone = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const borderThin = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cellBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

function p(text: string, opts?: { bold?: boolean; italic?: boolean; size?: number; color?: string; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts?.bold, italics: opts?.italic, size: opts?.size ?? 22, color: opts?.color })],
    alignment: opts?.alignment,
    spacing: { after: 100 },
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 150 } });
}

function checkbox(checked: boolean, label: string): Paragraph {
  return p(`${checked ? "☒" : "☐"} ${label}`);
}

function fieldRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({ children: [p(label, { bold: true })], width: { size: 40, type: WidthType.PERCENTAGE }, borders: cellBorders }),
      new TableCell({ children: [p(value || "___________")], width: { size: 60, type: WidthType.PERCENTAGE }, borders: cellBorders }),
    ],
  });
}

function fieldTable(rows: [string, string][]): Table {
  return new Table({
    rows: rows.map(([l, v]) => fieldRow(l, v)),
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ─── Population density helpers ────────────────────────────────────

const popLabelNo: Record<string, string> = {
  controlled: "kontrollert bakkeområde",
  sparsely: "spredt befolket område",
  populated: "befolket område",
  gathering: "folkemengder",
};

const popLabelEn: Record<string, string> = {
  controlled: "controlled ground area",
  sparsely: "sparsely populated area",
  populated: "populated area",
  gathering: "assemblies of people",
};

const arcLabels = ["ARC-a", "ARC-b", "ARC-c", "ARC-d"];

function robustnessLabel(r: RobustnessLevel): string {
  return r === "O" ? "NR" : r === "L" ? "Low" : r === "M" ? "Medium" : "High";
}

// ─── 1. Søknadsskjema (Norwegian) ──────────────────────────────────

export async function generateSoknadsskjemaNO(inputs: SoraInputs, results: SoraResults, conops: ConOpsFields, osoTexts: Record<number, string>) {
  const ke = (0.5 * inputs.mtom * (parseFloat(conops.maxSpeed) || 15) ** 2).toFixed(0);

  const doc = new Document({
    sections: [{
      children: [
        // Title
        p("Luftfartstilsynet", { bold: true, size: 28 }),
        p("Send til: postmottak@caa.no", { size: 18, color: "666666" }),
        heading("Søknad om operasjonstillatelse i spesifikk kategori (SORA 2.5)"),
        p(""),

        // Application type
        heading("Søknad", HeadingLevel.HEADING_2),
        checkbox(true, "Ny søknad"),
        checkbox(false, "Revisjon"),
        p(""),

        // 1. Operator information
        heading("1. Operatørinformasjon"),
        fieldTable([
          ["Organisasjonens navn", conops.operatorName],
          ["Organisasjonsnummer", ""],
          ["Adresse", ""],
          ["Postnummer", ""],
          ["Poststed", ""],
          ["Telefonnummer", ""],
          ["E-post", ""],
          ["Web adresse", ""],
          ["UAS-operatørnummer (flydrone.no)", ""],
          ["Ansvarlig leder", ""],
        ]),
        p(""),

        // 2. Operation
        heading("2. Operasjon"),
        fieldTable([
          ["2.1 Forventet oppstart", ""],
          ["2.2 Forventet sluttdato", ""],
          ["2.3 Referanse til risikoanalyse", "SORA 2.5"],
        ]),
        p("2.4 Type operasjon:", { bold: true }),
        checkbox(inputs.operationType === "VLOS", "VLOS"),
        checkbox(inputs.operationType === "BVLOS", "BVLOS"),
        p("2.5 Transport av farlig gods:", { bold: true }),
        checkbox(false, "Ja"), checkbox(true, "Nei"),
        p("2.6 Slipp av last:", { bold: true }),
        checkbox(false, "Ja"), checkbox(true, "Nei"),
        p(""),

        // 3. UAS data
        heading("3. UAS data"),
        fieldTable([
          ["3.1 Produsent", ""],
          ["3.2 Modell", inputs.droneName],
          ["3.4 Maks karakteristisk dimensjon", `${inputs.characteristicDimension} m`],
          ["3.5 Take-off mass", `${inputs.mtom} kg`],
          ["3.6 Maksimal operasjonell hastighet", `${conops.maxSpeed} m/s`],
          ["3.7 Type C2 link", ""],
          ["3.8 Størrelse på nærliggende område", ""],
        ]),
        p("3.3 Type UAS:", { bold: true }),
        checkbox(true, "VTOL capable aircraft (inkludert multirotor)"),
        p("3.9 Er dronen forankret under operasjonen?", { bold: true }),
        checkbox(false, "Ja"), checkbox(true, "Nei"),
        p("3.10 Type system:", { bold: true }),
        checkbox(conops.propulsion === "elektrisk", "Elektrisk"),
        checkbox(conops.propulsion === "forbrenning", "Forbrenning"),
        checkbox(conops.propulsion === "hybrid", "Hybrid"),
        p(""),
        p("3.15 System for elektronisk synlighet:", { bold: true }),
        checkbox(conops.hasRemoteId === "ja", "Direct remote ID"),
        checkbox(inputs.hasTransponder, "ADS-B Out"),
        p(""),

        // 4. SORA
        heading("4. Specific Operation Risk Assessment (SORA)"),

        // Step 1
        heading("Steg #1 — Dokumentasjon av foreslått operasjon", HeadingLevel.HEADING_2),
        p("Steg #1.2 Kort beskrivelse av ønsket operasjon:", { bold: true }),
        p(conops.flightGeography || "[Beskriv operasjonen]"),
        p(""),
        heading("Steg #1.3 Dimensjon av operasjonsvolumet", HeadingLevel.HEADING_2),
        fieldTable([
          ["Høyde på flyvolum", `${inputs.maxAltitude} m`],
          ["Høyde på beredskapsvolum", `${inputs.maxAltitude} m`],
          ["Utstrekning beredskapsvolum", `${conops.contingencyBuffer || "___"} m`],
          ["Utstrekning bakkerisikobuffer", `${conops.grbMeters || "___"} m`],
        ]),
        p(""),

        // Step 2
        heading("Steg #2 — Iboende bakkerisiko (iGRC)", HeadingLevel.HEADING_2),
        p("Steg #2.1 Type operasjonsområde:", { bold: true }),
        ...["controlled", "sparsely", "populated", "gathering"].map(pop =>
          checkbox(inputs.populationDensity === pop, popLabelNo[pop])
        ),
        p(`Steg #2.2 Iboende bakkerisiko (iGRC): ${results.intrinsicGrc}`, { bold: true }),
        p(""),

        // Step 3
        heading("Steg #3 — Endelig bakkerisiko (GRC)", HeadingLevel.HEADING_2),
        p("Steg #3.1 Mitigasjoner:", { bold: true }),
        p(`M1 Strategisk mitigering: ${inputs.m1 === 0 ? "Ingen" : inputs.m1 === -1 ? "Lav" : "Medium"}`),
        p(`M2 Reduksjon av treffenergi: ${inputs.m2 === 0 ? "Ingen" : "Medium"}`),
        p(`Steg #3.2 Endelig bakkerisiko (GRC): ${results.finalGrc}`, { bold: true }),
        p(""),

        // Step 4
        heading("Steg #4 — Initiell luftrisiko (ARC)", HeadingLevel.HEADING_2),
        p("Steg #4.1 Klassifisering av luftrommet:", { bold: true }),
        ...arcLabels.map(arc => checkbox(results.initialArc === arc, arc)),
        p(`Steg #4.2 Initiell ARC: ${results.initialArc}`, { bold: true }),
        p(""),

        // Step 5
        heading("Steg #5 — Gjenværende luftrisiko", HeadingLevel.HEADING_2),
        p("Steg #5.1 Strategiske mitigeringer:", { bold: true }),
        checkbox(inputs.operationType === "VLOS", "VLOS"),
        checkbox(inputs.hasAirspaceObservers, "BVLOS med AO"),
        p(`Steg #5.2 Gjenværende ARC: ${results.residualArc}`, { bold: true }),
        p(""),

        // Step 6 – TMPR
        heading("Steg #6 — Taktiske mitigeringer (TMPR)", HeadingLevel.HEADING_2),
        checkbox(inputs.operationType === "VLOS", "Ingen krav (VLOS)"),
        checkbox(inputs.operationType === "BVLOS", "BVLOS"),
        p(""),

        // Step 7 – SAIL
        heading("Steg #7 — SAIL", HeadingLevel.HEADING_2),
        ...[1, 2, 3, 4, 5, 6].map(s => checkbox(results.sail === s, `SAIL ${["", "I", "II", "III", "IV", "V", "VI"][s]}`)),
        p(""),

        // Step 8 – Containment
        heading("Steg #8 — Krav til containment", HeadingLevel.HEADING_2),
        checkbox(results.sail <= 2, "Lav"),
        checkbox(results.sail >= 3 && results.sail <= 4, "Medium"),
        checkbox(results.sail >= 5, "Høy"),
        p(""),

        // Step 9 – OSO
        heading("Steg #9 — OSO", HeadingLevel.HEADING_2),
        p("Fyll ut compliance matrix (se eget dokument)."),
        p(""),

        // Signature
        heading("5. Merknad", HeadingLevel.HEADING_2),
        p("Dato: ___________     Signatur: ___________"),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Soknadsskjema_SORA_2.5_${inputs.droneName || "drone"}.docx`);
}

// ─── 2. Søknadsskjema (English) ────────────────────────────────────

export async function generateSoknadsskjemaEN(inputs: SoraInputs, results: SoraResults, conops: ConOpsFields, osoTexts: Record<number, string>) {
  const doc = new Document({
    sections: [{
      children: [
        p("Luftfartstilsynet / CAA Norway", { bold: true, size: 28 }),
        p("Send to: postmottak@caa.no", { size: 18, color: "666666" }),
        heading("Application for an operational authorisation in Specific category (SORA 2.5)"),
        p(""),

        heading("Application", HeadingLevel.HEADING_2),
        checkbox(true, "New application"),
        checkbox(false, "Revision"),
        p(""),

        heading("1. Operator information"),
        fieldTable([
          ["Organisation name", conops.operatorName],
          ["Organisation number", ""],
          ["Address", ""],
          ["UAS operator number (flydrone.no)", ""],
          ["Accountable manager", ""],
        ]),
        p(""),

        heading("2. Operation"),
        fieldTable([
          ["2.1 Expected start date", ""],
          ["2.2 Expected end date", ""],
          ["2.3 Risk assessment reference", "SORA 2.5"],
        ]),
        p("2.4 Type of operation:", { bold: true }),
        checkbox(inputs.operationType === "VLOS", "VLOS"),
        checkbox(inputs.operationType === "BVLOS", "BVLOS"),
        p("2.5 Transport of dangerous goods:", { bold: true }),
        checkbox(false, "Yes"), checkbox(true, "No"),
        p(""),

        heading("3. UAS data"),
        fieldTable([
          ["3.1 Design organisation name", ""],
          ["3.2 Model name", inputs.droneName],
          ["3.4 Maximum UA characteristic dimensions", `${inputs.characteristicDimension} m`],
          ["3.5 Take-off mass", `${inputs.mtom} kg`],
          ["3.6 Maximum operational speed", `${conops.maxSpeed} m/s`],
          ["3.7 Type of C2 link", ""],
        ]),
        p("3.3 Type of UAS:", { bold: true }),
        checkbox(true, "VTOL capable aircraft (including multirotors)"),
        p("3.10 Type of propulsion system:", { bold: true }),
        checkbox(conops.propulsion === "elektrisk", "Electric"),
        checkbox(conops.propulsion === "forbrenning", "Combustion"),
        checkbox(conops.propulsion === "hybrid", "Hybrid"),
        p(""),
        p("3.15 E-conspicuity system:", { bold: true }),
        checkbox(conops.hasRemoteId === "ja", "Direct remote ID"),
        checkbox(inputs.hasTransponder, "ADS-B Out"),
        p(""),

        heading("4. Specific Operation Risk Assessment (SORA)"),

        heading("Step #1 — Documentation of the proposed operation", HeadingLevel.HEADING_2),
        p("Step #1.2 Short description:", { bold: true }),
        p(conops.flightGeography || "[Describe operation]"),
        heading("Step #1.3 Dimensions of the operational volume", HeadingLevel.HEADING_2),
        fieldTable([
          ["Maximum height of flight geography", `${inputs.maxAltitude} m`],
          ["Width of contingency volume", `${conops.contingencyBuffer || "___"} m`],
          ["Width of ground risk buffer", `${conops.grbMeters || "___"} m`],
        ]),
        p(""),

        heading("Step #2 — Intrinsic ground risk class (iGRC)", HeadingLevel.HEADING_2),
        ...["controlled", "sparsely", "populated", "gathering"].map(pop =>
          checkbox(inputs.populationDensity === pop, popLabelEn[pop])
        ),
        p(`Step #2.2 iGRC: ${results.intrinsicGrc}`, { bold: true }),
        p(""),

        heading("Step #3 — Final GRC", HeadingLevel.HEADING_2),
        p(`M1 Strategic mitigation: ${inputs.m1 === 0 ? "None" : inputs.m1 === -1 ? "Low" : "Medium"}`),
        p(`M2 Impact reduction: ${inputs.m2 === 0 ? "None" : "Medium"}`),
        p(`Step #3.2 Final GRC: ${results.finalGrc}`, { bold: true }),
        p(""),

        heading("Step #4 — Initial ARC", HeadingLevel.HEADING_2),
        ...arcLabels.map(arc => checkbox(results.initialArc === arc, arc)),
        p(""),

        heading("Step #5 — Residual ARC", HeadingLevel.HEADING_2),
        checkbox(inputs.operationType === "VLOS", "VLOS"),
        checkbox(inputs.hasAirspaceObservers, "BVLOS with AO"),
        p(`Step #5.2 Residual ARC: ${results.residualArc}`, { bold: true }),
        p(""),

        heading("Step #7 — SAIL", HeadingLevel.HEADING_2),
        ...[1, 2, 3, 4, 5, 6].map(s => checkbox(results.sail === s, `SAIL ${["", "I", "II", "III", "IV", "V", "VI"][s]}`)),
        p(""),

        heading("Step #8 — Containment", HeadingLevel.HEADING_2),
        checkbox(results.sail <= 2, "Low"),
        checkbox(results.sail >= 3 && results.sail <= 4, "Medium"),
        checkbox(results.sail >= 5, "High"),
        p(""),

        heading("Step #9 — OSO", HeadingLevel.HEADING_2),
        p("Fill out the compliance matrix (see separate document)."),
        p(""),

        heading("5. Remarks", HeadingLevel.HEADING_2),
        p("Date: ___________     Signature: ___________"),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Application_SORA_2.5_${inputs.droneName || "drone"}.docx`);
}

// ─── 3. Compliance Matrix ──────────────────────────────────────────

export async function generateComplianceMatrix(inputs: SoraInputs, results: SoraResults, conops: ConOpsFields, osoTexts: Record<number, string>) {
  const osoRows = OSO_DEFINITIONS.map(oso => {
    const req = getOsoRobustness(oso, results.sail);
    const text = osoTexts[oso.id] || "";
    const hasDoc = text && text !== oso.template;

    return new TableRow({
      children: [
        new TableCell({ children: [p(`OSO #${String(oso.id).padStart(2, "0")}`, { bold: true, size: 18 })], borders: cellBorders, width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [p(oso.description, { size: 18 })], borders: cellBorders, width: { size: 30, type: WidthType.PERCENTAGE } }),
        new TableCell({
          children: [
            p(`${req === "O" ? "☒" : "☐"} NR   ${req === "L" ? "☒" : "☐"} Low   ${req === "M" ? "☒" : "☐"} Medium   ${req === "H" ? "☒" : "☐"} High`, { size: 16 }),
          ],
          borders: cellBorders, width: { size: 25, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            p(`Document name: ${hasDoc ? "Operations Manual" : ""}`, { size: 16 }),
            p(`Chapter or page number: ${hasDoc ? `OSO #${oso.id}` : ""}`, { size: 16 }),
          ],
          borders: cellBorders, width: { size: 35, type: WidthType.PERCENTAGE },
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [{
      children: [
        heading("Compliance Matrix"),
        p(`Drone: ${inputs.droneName} | SAIL: ${results.sailRoman} | GRC: ${results.finalGrc} | ARC: ${results.residualArc}`, { italic: true, color: "666666" }),
        p(""),

        // Ground risk mitigations
        heading("Ground risk mitigations", HeadingLevel.HEADING_2),
        new Table({
          rows: [
            new TableRow({
              children: ["Provision", "Level of robustness", "Reference to documentation"].map(h =>
                new TableCell({ children: [p(h, { bold: true, size: 18 })], borders: cellBorders })
              ),
            }),
            new TableRow({
              children: [
                new TableCell({ children: [p("M1 (A) Strategic mitigations – Sheltering", { bold: true, size: 18 })], borders: cellBorders }),
                new TableCell({ children: [p(`${inputs.m1 === 0 ? "☒ None" : inputs.m1 === -1 ? "☒ Low" : "☒ Medium"}`, { size: 18 })], borders: cellBorders }),
                new TableCell({ children: [p("Document name:\nChapter or page number:", { size: 16 })], borders: cellBorders }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [p("M1 (B) Strategic mitigations – Operational restrictions", { bold: true, size: 18 })], borders: cellBorders }),
                new TableCell({ children: [p(`${inputs.m1 === 0 ? "☒ None" : inputs.m1 === -1 ? "☐ None  ☒ Medium" : "☐ None  ☐ Medium  ☒ High"}`, { size: 18 })], borders: cellBorders }),
                new TableCell({ children: [p("Document name:\nChapter or page number:", { size: 16 })], borders: cellBorders }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [p("M2 – Effects of UA impact dynamics are reduced", { bold: true, size: 18 })], borders: cellBorders }),
                new TableCell({ children: [p(`${inputs.m2 === 0 ? "☒ None" : "☒ Medium"}`, { size: 18 })], borders: cellBorders }),
                new TableCell({ children: [p("Document name:\nChapter or page number:", { size: 16 })], borders: cellBorders }),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        p(""),

        // Air risk class mitigation
        heading("Strategic air risk mitigations", HeadingLevel.HEADING_2),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [p("Air risk class mitigation", { bold: true, size: 18 })], borders: cellBorders }),
                new TableCell({ children: [
                  p(`Initial ARC: ${results.initialArc}`, { size: 18 }),
                  p(`Residual ARC: ${results.residualArc}`, { size: 18 }),
                ], borders: cellBorders }),
                new TableCell({ children: [p("Document name:\nChapter or page number:", { size: 16 })], borders: cellBorders }),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        p(""),

        // TMPR
        heading("Tactical mitigation performance requirements", HeadingLevel.HEADING_2),
        checkbox(inputs.operationType === "VLOS", "VLOS (deconflict scheme)"),
        checkbox(inputs.operationType === "BVLOS", "BVLOS"),
        checkbox(results.residualArc === "ARC-a", "No requirement (ARC-a)"),
        checkbox(results.residualArc === "ARC-b", "Low requirement (ARC-b)"),
        checkbox(results.residualArc === "ARC-c", "Medium requirement (ARC-c)"),
        checkbox(results.residualArc === "ARC-d", "High requirement (ARC-d)"),
        p(""),

        // Containment
        heading("Containment provisions", HeadingLevel.HEADING_2),
        checkbox(results.sail <= 2, "Low"),
        checkbox(results.sail >= 3 && results.sail <= 4, "Medium"),
        checkbox(results.sail >= 5, "High"),
        p(""),

        // OSO table
        heading("Operational Safety Objectives (OSO)", HeadingLevel.HEADING_2),
        new Table({
          rows: [
            new TableRow({
              children: ["OSO", "Description", "Robustness Level", "Documentation Reference"].map(h =>
                new TableCell({ children: [p(h, { bold: true, size: 18 })], borders: cellBorders })
              ),
            }),
            ...osoRows,
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        // Confirmation
        p(""),
        heading("Confirmation", HeadingLevel.HEADING_2),
        p("Date: ___________     Signature: ___________"),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Compliance_Matrix_${inputs.droneName || "drone"}_SAIL_${results.sailRoman}.docx`);
}
