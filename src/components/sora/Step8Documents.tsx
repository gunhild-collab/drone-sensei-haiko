import { useState } from "react";
import { X, Printer, FileText, FileCheck, ClipboardList, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";
import { SoraResults } from "@/lib/soraCalculations";
import { DroneSpec } from "@/data/droneDatabase";
import { OperationsManualState } from "@/pages/SoraWizard";

interface Props {
  scenario: string | null;
  results: SoraResults;
  derivedInputs: {
    operationType: string;
    maxAltitude: number;
    droneName: string;
    mtom: number;
    characteristicDimension: number;
    populationDensity: string;
  };
  applicantName: string;
  applicantEmail: string;
  municipality: string;
  selectedDrone: DroneSpec | null;
  operationsManual: OperationsManualState;
}

// --- Compliance matrix requirements per scenario ---
const PDRA_G01_REQS = [
  "Operatøren har gyldig operasjonstillatelse fra Luftfartstilsynet",
  "Operasjonen utføres innenfor PDRA-G01 geografiske og tekniske grenser",
  "Operasjonsmanual er utarbeidet og tilgjengelig under operasjon",
  "Pilot har A1/A3-sertifikat og fullført STC/BVLOS-kurs",
  "Luftromsobservatør er briefet og i posisjon under BVLOS-operasjon",
  "Pre-flight sjekkliste gjennomføres før hver flyging",
  "Drone er registrert på flydrone.no",
  "MTOM og karakteristisk dimensjon er innenfor PDRA-G01 krav",
  "Maks flygehøyde 120 m AGL overholdes",
  "Befolkningstetthet er kontrollert eller sparsomt befolket",
  "Nødprosedyrer (ERP seksjon 5.1–5.6) er etablert og øvd",
  "Vedlikeholdsrutiner følges per seksjon 7",
  "Ansvarsforsikring er tegnet og dokumentert",
  "Hendelser rapporteres til Luftfartstilsynet etter gjeldende krav",
];

const PDRA_G02_REQS = [...PDRA_G01_REQS.map(r => r.replace("PDRA-G01", "PDRA-G02"))];

const PDRA_G03_REQS = [
  ...PDRA_G01_REQS,
  "MTOM ≤ 1 kg overholdes",
  "Operasjonen begrenses til sparsomt befolket område ≤ 50 m AGL",
];

const PDRA_S01_REQS = [
  ...PDRA_G01_REQS,
  "Horisontal buffer til ubeskyttede personer overholdes",
  "Sikker nødlandingslokasjon er identifisert og dokumentert",
  "Operasjon utføres ikke direkte over folkemengder",
];

const OSO_DESCRIPTIONS: Record<number, string> = {
  1: "OSO-01: Operatøren er kompetent og/eller godkjent",
  2: "OSO-02: UAS vedlikeholdes forsvarlig",
  3: "OSO-03: UAS har operasjonell autorisasjon/godkjenning",
  4: "OSO-04: Sannsynlighet for UAS-feil er redusert gjennom design",
  5: "OSO-05: UAS er utviklet i henhold til anerkjente industristandarder",
  6: "OSO-06: C2-lenke er tilstrekkelig for operasjonen",
  7: "OSO-07: Intrinsisk ytelse til UAS er tilstrekkelig for operasjonen",
  8: "OSO-08: Operasjonsvolum er definert med tilstrekkelig buffere",
  9: "OSO-09: Fjernpilotens kompetanse er tilstrekkelig for operasjonen",
  10: "OSO-10: Fjernpiloten har inngående kunnskap om UAS",
  11: "OSO-11: Fjernpiloten er i stand til å oppdage og unngå farer",
  12: "OSO-12: Crew er koordinert og kommunikasjonsprosedyrer er etablert",
  13: "OSO-13: Ekstern ondsinnet handling er ikke et problem",
  14: "OSO-14: Geofencing brukes",
  15: "OSO-15: Støttende infrastruktur er pålitelig og tilgjengelig",
  16: "OSO-16: Lys-/navigasjonshjelpemidler er tilstrekkelige",
  17: "OSO-17: Operasjonen er planlagt korrekt",
  18: "OSO-18: Pre-flight sjekklister er brukt",
  19: "OSO-19: Nødprosedyrer er definert, validert og brukt",
  20: "OSO-20: Hensiktsmessig plan for beredskaps situasjoner er etablert",
  21: "OSO-21: Operatøren overvåker og administrerer sikkerheten",
  22: "OSO-22: Operatøren er klar over regulatoriske krav",
  23: "OSO-23: Ekstern tjeneste støtter operatørens plikter",
  24: "OSO-24: Kontroll av luftrommet under operasjonen er sikret",
};

const OM_REF_MAP: Record<string, string> = {
  "Pre-flight sjekkliste": "OM seksjon 4.1",
  "pre-flight": "OM seksjon 4.1",
  "ERP": "OM seksjon 5",
  "Nødprosedyrer": "OM seksjon 5",
  "Pilot": "OM seksjon 6",
  "kompetanse": "OM seksjon 6",
  "Vedlikehold": "OM seksjon 7",
  "forsikring": "OM seksjon 8",
  "Ansvarsforsikring": "OM seksjon 8",
  "Data": "OM seksjon 9–10",
  "journal": "OM seksjon 9–10",
  "Hendelser": "OM seksjon 9–10",
  "Vær": "OM seksjon 11",
};

function getOMRef(req: string, omDone: boolean): string {
  if (!omDone) {
    const match = Object.entries(OM_REF_MAP).find(([k]) => req.toLowerCase().includes(k.toLowerCase()));
    return match ? `Se ${match[1]}` : "Se operasjonsmanual";
  }
  const match = Object.entries(OM_REF_MAP).find(([k]) => req.toLowerCase().includes(k.toLowerCase()));
  return match ? match[1] : "Se operasjonsmanual";
}

function getReqs(scenario: string | null): string[] {
  if (!scenario) return PDRA_G01_REQS;
  if (scenario === "PDRA-G01") return PDRA_G01_REQS;
  if (scenario === "PDRA-G02") return PDRA_G02_REQS;
  if (scenario === "PDRA-G03") return PDRA_G03_REQS;
  if (scenario === "PDRA-S01") return PDRA_S01_REQS;
  // SORA scenarios: use OSO list
  return Array.from({length: 24}, (_, i) => OSO_DESCRIPTIONS[i + 1] || `OSO-${String(i+1).padStart(2,"0")}: Se SORA-vurdering`);
}

// --- Print modal component ---
function PrintModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 print:hidden" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e5f8]">
          <h3 className="font-display font-bold text-[#1c0059]">{title}</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="haiko-btn-primary text-sm flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Skriv ut / Lagre som PDF
            </button>
            <button onClick={onClose} className="text-sora-text-dim hover:text-sora-text">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// --- Compliance matrix document ---
function ComplianceMatrix({ scenario, results, derivedInputs, applicantName, municipality, operationsManual }: Props) {
  const today = new Date().toLocaleDateString("nb-NO");
  const omDone = operationsManual.completed || operationsManual.uploaded;
  const reqs = getReqs(scenario);
  const selskapsnavn = operationsManual.data["s1_selskapsnavn"] || applicantName || "[Selskapsnavn]";
  const orgnr = operationsManual.data["s1_orgnr"] || "";
  const adresse = operationsManual.data["s1_adresse"] || "";
  const isSora = !scenario || (!scenario.startsWith("PDRA") && !["A1","A2","A3","STS-01","STS-02"].includes(scenario));

  return (
    <div style={{fontFamily:"Montserrat, sans-serif", color:"#1c0059", fontSize:"11pt", minHeight:"100%"}}>
      {/* Haiko gradient header */}
      <div style={{background:"linear-gradient(135deg,#ff66c4,#6858f8)", borderRadius:8, padding:"16px 24px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"Poppins", fontWeight:700, fontSize:"18pt", color:"white"}}>Samsvarsmatrise — {scenario || "SORA"}</div>
          <div style={{color:"rgba(255,255,255,0.85)", fontSize:"10pt", marginTop:4}}>Generert {today}</div>
        </div>
        <div style={{textAlign:"right", color:"white", fontSize:"10pt"}}>
          <div style={{fontWeight:700}}>{selskapsnavn}</div>
          {orgnr && <div>Orgnr: {orgnr}</div>}
          {adresse && <div>{adresse}</div>}
          {municipality && <div>Kommune: {municipality}</div>}
        </div>
      </div>

      {/* SAIL/GRC info */}
      <div style={{display:"flex", gap:16, marginBottom:16}}>
        {[
          {label:"SAIL", value: results.sailRoman},
          {label:"GRC", value: String(results.finalGrc)},
          {label:"ARC", value: results.residualArc},
          {label:"Scenario", value: scenario || "—"},
        ].map(({label, value}) => (
          <div key={label} style={{background:"#f5f4ff", border:"1px solid #e8e5f8", borderRadius:8, padding:"8px 14px", textAlign:"center"}}>
            <div style={{fontSize:"9pt", color:"#6858f8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em"}}>{label}</div>
            <div style={{fontFamily:"Poppins", fontWeight:700, fontSize:"13pt", color:"#1c0059"}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <table style={{width:"100%", borderCollapse:"collapse", fontSize:"10pt"}}>
        <thead>
          <tr style={{background:"#f5f4ff"}}>
            <th style={{padding:"8px 10px", textAlign:"left", borderBottom:"2px solid #6858f8", width:"4%"}}>Nr</th>
            <th style={{padding:"8px 10px", textAlign:"left", borderBottom:"2px solid #6858f8", width:"42%"}}>Krav</th>
            <th style={{padding:"8px 10px", textAlign:"left", borderBottom:"2px solid #6858f8", width:"22%"}}>Referanse i OM</th>
            <th style={{padding:"8px 10px", textAlign:"left", borderBottom:"2px solid #6858f8", width:"18%"}}>Status</th>
            <th style={{padding:"8px 10px", textAlign:"left", borderBottom:"2px solid #6858f8", width:"14%"}}>Kommentar</th>
          </tr>
        </thead>
        <tbody>
          {reqs.map((req, i) => (
            <tr key={i} style={{borderBottom:"1px solid #e8e5f8", background: i % 2 === 0 ? "white" : "#fafafa"}}>
              <td style={{padding:"7px 10px", color:"#6858f8", fontWeight:700}}>{i + 1}</td>
              <td style={{padding:"7px 10px"}}>{req}</td>
              <td style={{padding:"7px 10px", color:"#6858f8", fontStyle: omDone ? "normal" : "italic"}}>{getOMRef(req, omDone)}</td>
              <td style={{padding:"7px 10px"}}>
                <span style={{
                  background: omDone ? "#e8fdf0" : "#fff8e1",
                  color: omDone ? "#1a7a40" : "#9a6200",
                  padding:"2px 8px", borderRadius:4, fontSize:"9pt", fontWeight:600
                }}>
                  {omDone ? "Oppfylt" : "Under arbeid"}
                </span>
              </td>
              <td style={{padding:"7px 10px", color:"#9993c4", fontSize:"9pt"}}>—</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{marginTop:24, paddingTop:12, borderTop:"1px solid #e8e5f8", textAlign:"center", fontSize:"9pt", color:"#9993c4"}}>
        Samsvarsmatrise generert med Haiko AS — haiko.no — {today}
      </div>
    </div>
  );
}

// --- ERP document ---
function ERPDocument({ operationsManual, applicantName }: { operationsManual: OperationsManualState; applicantName: string }) {
  const today = new Date().toLocaleDateString("nb-NO");
  const om = operationsManual.data;
  const selskapsnavn = om["s1_selskapsnavn"] || applicantName || "[Selskapsnavn]";
  const hasData = Object.keys(om).some(k => k.startsWith("s5_"));

  const erpSections = [
    { id: "5.1", title: "Tap av kontrollkobling / RTH", key: "s5_1", trigger: "Tap av kontrollforbindelse med luftfartøyet" },
    { id: "5.2", title: "Lavt batteri / Strøm", key: "s5_2", trigger: "Batterinivå under 15% eller strømalarm" },
    { id: "5.3", title: "Ukontrollert nedstigng / Motorstopp", key: "s5_3", trigger: "Telemetrialarm for motorfeil eller ukontrollert nedstigng" },
    { id: "5.4", title: "Konfliktende bemannet lufttrafikk", key: "s5_4", trigger: "Uventet bemannet luftfartøy i operasjonsområdet" },
    { id: "5.5", title: "Utstyrsfeil", key: "s5_5", trigger: "Synlig skade, røyk, lukt eller uvanlig vibrasjon" },
    { id: "5.6", title: "Tapt visuell kontakt", key: "s5_6", trigger: "Observatør mister sikt på luftfartøyet" },
  ];

  return (
    <div style={{fontFamily:"Montserrat, sans-serif", color:"#1c0059", fontSize:"11pt"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#ff66c4,#6858f8)", borderRadius:8, padding:"16px 24px", marginBottom:20}}>
        <div style={{fontFamily:"Poppins", fontWeight:700, fontSize:"18pt", color:"white"}}>Beredskapsplan (ERP)</div>
        <div style={{color:"rgba(255,255,255,0.85)", fontSize:"10pt", marginTop:4}}>{selskapsnavn} | Versjon 1.0 | {today}</div>
      </div>

      {!hasData && (
        <div style={{background:"#fff8e1", border:"1px solid #ffc107", borderRadius:8, padding:"12px 16px", marginBottom:20, display:"flex", gap:12}}>
          <span style={{color:"#f59e0b", fontSize:"14pt"}}>⚠</span>
          <div>
            <div style={{fontWeight:700, color:"#9a6200"}}>Nødprosedyrene er ikke fylt ut.</div>
            <div style={{fontSize:"10pt", color:"#9a6200", marginTop:4}}>Gå tilbake til operasjonsmanualen, seksjon 5 og fyll inn ERP-tekst for alle scenarier.</div>
          </div>
        </div>
      )}

      {erpSections.map(sec => (
        <div key={sec.id} style={{marginBottom:20, border:"1px solid #e8e5f8", borderRadius:8, overflow:"hidden"}}>
          <div style={{background:"#f5f4ff", padding:"10px 16px", borderBottom:"1px solid #e8e5f8"}}>
            <div style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", fontSize:"12pt"}}>{sec.id} {sec.title}</div>
            <div style={{fontSize:"9pt", color:"#6858f8", marginTop:2}}>Utløser: {sec.trigger}</div>
          </div>
          <div style={{padding:"12px 16px"}}>
            {om[sec.key] ? (
              <p style={{whiteSpace:"pre-wrap", lineHeight:1.7, fontSize:"10pt"}}>{om[sec.key]}</p>
            ) : (
              <p style={{color:"#9993c4", fontStyle:"italic", fontSize:"10pt"}}>[Ikke utfylt — gå til operasjonsmanualen seksjon {sec.id}]</p>
            )}
          </div>
          <div style={{padding:"6px 16px", background:"#fafafa", borderTop:"1px solid #e8e5f8", fontSize:"9pt", color:"#9993c4"}}>
            Ansvarlig: Fjernpilot / {om["s1_pilot1Navn"] || om["s6_pilotNavn"] || "[Pilot]"}
          </div>
        </div>
      ))}

      {om["s5_noodlandingslokasjon"] && (
        <div style={{background:"#e8fdf0", border:"1px solid #6ee7b7", borderRadius:8, padding:"12px 16px", marginBottom:20}}>
          <div style={{fontWeight:700, color:"#1a7a40", marginBottom:4}}>Sikker nødlandingslokasjon:</div>
          <div style={{color:"#1a7a40"}}>{om["s5_noodlandingslokasjon"]}</div>
        </div>
      )}

      {/* Emergency contacts */}
      <div style={{border:"2px solid #6858f8", borderRadius:8, padding:"16px", marginBottom:20}}>
        <div style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", marginBottom:12}}>Nødkontakter</div>
        <table style={{width:"100%", fontSize:"10pt"}}>
          <tbody>
            {[
              ["Brann / Politi", "112"],
              ["Ambulanse", "113"],
              ["Luftfartstilsynet", "post@caa.no | +47 75 58 50 00"],
              ["LT hendelsesrapportering", "https://www.luftfartstilsynet.no/hendelsesrapportering"],
              ["Operatørens kontakt", `${om["s12_kontaktperson"] || om["s1_ansvarligLederNavn"] || applicantName} | ${om["s12_kontakttelefon"] || om["s1_ansvarligLederTlf"] || "—"}`],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{padding:"4px 0", fontWeight:700, width:"40%"}}>{label}:</td>
                <td style={{padding:"4px 0"}}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{textAlign:"center", fontSize:"9pt", color:"#9993c4", borderTop:"1px solid #e8e5f8", paddingTop:12}}>
        ERP — {selskapsnavn} — v1.0 — {today}
      </div>
    </div>
  );
}

// --- Application summary document ---
function SoknadsSammendrag({ scenario, results, derivedInputs, applicantName, applicantEmail, municipality, selectedDrone, operationsManual }: Props) {
  const today = new Date().toLocaleDateString("nb-NO");
  const om = operationsManual.data;
  const selskapsnavn = om["s1_selskapsnavn"] || applicantName || "[Selskapsnavn]";
  const omDone = operationsManual.completed || operationsManual.uploaded;

  const isPDRASora = scenario && !["A1","A2","A3","STS-01","STS-02"].includes(scenario);
  const isSTS = scenario === "STS-01" || scenario === "STS-02";

  return (
    <div style={{fontFamily:"Montserrat, sans-serif", color:"#1c0059", fontSize:"11pt", maxWidth:700, margin:"0 auto"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#ff66c4,#6858f8)", borderRadius:8, padding:"16px 24px", marginBottom:24}}>
        <div style={{fontFamily:"Poppins", fontWeight:700, fontSize:"18pt", color:"white"}}>Søknadssammendrag</div>
        <div style={{color:"rgba(255,255,255,0.85)", fontSize:"10pt", marginTop:4}}>Utarbeidet med Haiko AS — {today}</div>
      </div>

      {/* 1. Operator info */}
      <Section title="1. Operatørinformasjon">
        <Row label="Selskapsnavn" value={selskapsnavn} />
        <Row label="Adresse" value={om["s1_adresse"] || "—"} />
        <Row label="Organisasjonsnummer" value={om["s1_orgnr"] || "—"} />
        <Row label="Ansvarlig leder" value={om["s1_ansvarligLederNavn"] || applicantName || "—"} />
        <Row label="E-post" value={om["s1_ansvarligLederEpost"] || applicantEmail || "—"} />
        <Row label="Telefon" value={om["s1_ansvarligLederTlf"] || "—"} />
      </Section>

      {/* 2. Aircraft */}
      <Section title="2. Luftfartøy">
        <Row label="Modell" value={selectedDrone?.name || derivedInputs.droneName || "—"} />
        <Row label="MTOM" value={`${derivedInputs.mtom} kg`} />
        <Row label="C-klasse" value={selectedDrone?.categoryClass || "—"} />
        <Row label="Registreringsnr" value={om["s2_regNr"] || "—"} />
        <Row label="Serienummer" value={om["s2_serienummer"] || "—"} />
      </Section>

      {/* 3. Flight area */}
      <Section title="3. Operasjonsområde">
        <Row label="Lokasjon" value={om["s3_operasjonsomraade"] || municipality || "—"} />
        <Row label="Kommune" value={municipality || "—"} />
        <Row label="Maks høyde" value={`${derivedInputs.maxAltitude} m AGL`} />
        <Row label="Type" value={derivedInputs.operationType} />
        <Row label="Befolkningstetthet" value={derivedInputs.populationDensity} />
      </Section>

      {/* 4. Risk assessment */}
      <Section title="4. Risikovurdering">
        <Row label="GRC" value={String(results.finalGrc)} />
        <Row label="ARC" value={results.residualArc} />
        <Row label="SAIL" value={results.sailRoman} />
        <Row label="Scenario" value={scenario || "—"} />
      </Section>

      {/* 5. Mitigations */}
      <Section title="5. Mitigeringer">
        <Row label="M1 (bakke)" value={results.finalGrc < results.intrinsicGrc ? "Benyttet" : "Ikke benyttet"} />
        <Row label="M2 (fallskjerm)" value="Se risikovurdering" />
        <Row label="Taktisk ARC-reduksjon" value="Per OSO-vurdering" />
      </Section>

      {/* 6. Documents */}
      <Section title="6. Vedlagte dokumenter">
        <Row label="Operasjonsmanual" value={omDone ? "JA" : "NEI — ikke fullført"} highlight={!omDone} />
        <Row label="Samsvarsmatrise" value="JA — generert" />
        <Row label="ERP" value={omDone ? "JA — inkludert i OM" : "NEI — ikke fullført"} highlight={!omDone} />
      </Section>

      {/* 7. Application form */}
      <Section title="7. Relevant søknadsskjema">
        {isPDRASora ? (
          <>
            <Row label="Skjema" value="NF-1145 — Søknad om operasjonstillatelse i spesifikk kategori" />
            <Row label="Lenke" value="https://lt.apps.altinn.no/lt/operating-permit/" />
          </>
        ) : isSTS ? (
          <>
            <Row label="Skjema" value="NF-1172 — Deklarasjon av standardscenario (STS)" />
            <Row label="Lenke" value="https://www.luftfartstilsynet.no/skjema/droner/nf-1172-deklarasjon-av-standardscenario-sts/" />
          </>
        ) : (
          <Row label="Merknad" value="Åpen kategori — ingen søknad nødvendig" />
        )}
      </Section>

      {/* Signature */}
      <div style={{marginTop:32, borderTop:"2px solid #6858f8", paddingTop:16}}>
        <div style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", marginBottom:12}}>Underskrift</div>
        <table style={{width:"100%", fontSize:"10pt"}}>
          <tbody>
            {[
              ["Navn", om["s1_ansvarligLederNavn"] || applicantName || "___________________________"],
              ["Stilling", om["s1_ansvarligLederTittel"] || "___________________________"],
              ["Dato", today],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{padding:"4px 0", fontWeight:700, width:"35%"}}>{label}:</td>
                <td style={{padding:"4px 0"}}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{marginTop:20}}>
          <span style={{fontWeight:700}}>Signatur:</span>
          <div style={{borderBottom:"1px solid #1c0059", marginTop:20, width:240}} />
        </div>
      </div>

      <div style={{textAlign:"center", fontSize:"9pt", color:"#9993c4", marginTop:24, borderTop:"1px solid #e8e5f8", paddingTop:12}}>
        Utarbeidet med Haiko AS — haiko.no — {today}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{marginBottom:20, border:"1px solid #e8e5f8", borderRadius:8, overflow:"hidden"}}>
      <div style={{background:"#f5f4ff", padding:"8px 14px", borderBottom:"1px solid #e8e5f8"}}>
        <div style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", fontSize:"11pt"}}>{title}</div>
      </div>
      <div style={{padding:"10px 14px"}}>
        <table style={{width:"100%", fontSize:"10pt", borderCollapse:"collapse"}}>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr>
      <td style={{padding:"3px 0", fontWeight:600, color:highlight ? "#e53e3e" : "#666", width:"40%"}}>{label}:</td>
      <td style={{padding:"3px 0", color: highlight ? "#e53e3e" : "#1c0059"}}>{value}</td>
    </tr>
  );
}

// --- Main Step8Documents component ---
export default function Step8Documents(props: Props) {
  const { scenario, operationsManual } = props;
  const [openModal, setOpenModal] = useState<"compliance" | "erp" | "summary" | null>(null);

  const omDone = operationsManual.completed || operationsManual.uploaded;

  const docs = [
    {
      id: "compliance" as const,
      title: "Samsvarsmatrise",
      subtitle: `PDRA / SORA — ${scenario || "—"} krav`,
      description: "Haiko-merket samsvarsmatrise med alle regulatoriske krav for ditt scenario. Status per krav basert på operasjonsmanual.",
      icon: <FileCheck className="w-6 h-6" />,
      required: true,
    },
    {
      id: "erp" as const,
      title: "ERP — Beredskapsplan",
      subtitle: "Nødprosedyrer 5.1–5.6",
      description: "Komplett beredskapsplan med alle ERP-scenarier, handlingstrinn og nødkontakter. Hentes fra operasjonsmanual seksjon 5.",
      icon: <ClipboardList className="w-6 h-6" />,
      required: true,
    },
    {
      id: "summary" as const,
      title: "Søknadssammendrag",
      subtitle: "En-sides oversikt",
      description: "Automatisk utfylt sammendrag med operatørinfo, luftfartøy, risikovurdering, mitigeringer og vedlagte dokumenter.",
      icon: <FileText className="w-6 h-6" />,
      required: false,
    },
  ];

  const isPdraOrSora = scenario && !["A1","A2","A3"].includes(scenario);

  if (!isPdraOrSora) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-[28px] font-display font-bold text-sora-text mb-2">Søknadsdokumenter</h2>
          <p className="text-sora-text-muted text-[14px] font-sora">
            Du opererer i åpen kategori ({scenario}). Disse Haiko-dokumentene er kun tilgjengelige for PDRA- og SORA-scenarier.
          </p>
        </div>
        <div className="haiko-card p-5 border-sora-border">
          <p className="text-sora-text-muted text-sm font-sora">
            Ingen søknad er påkrevd for åpen kategori. Sørg for at dronen er registrert på{" "}
            <a href="https://www.flydrone.no" className="text-[#6858f8] hover:underline" target="_blank" rel="noopener noreferrer">flydrone.no</a>{" "}
            og at piloten har riktig kompetansebevis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[28px] font-display font-bold text-sora-text mb-2">Søknadsdokumenter</h2>
        <p className="text-sora-text-muted text-[14px] font-sora">
          Haiko-merkede dokumenter for scenario{" "}
          <span className="haiko-badge text-[11px] ml-1">{scenario}</span>.
          Generer og åpne hvert dokument for gjennomgang og utskrift.
        </p>
      </div>

      {!omDone && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 text-sm">Operasjonsmanual ikke fullført</p>
            <p className="text-yellow-700 text-xs mt-1 font-sora">Dokumentene genereres, men referanser til operasjonsmanualen vil ikke være utfylt. Gå tilbake og fullfør operasjonsmanualen for best resultat.</p>
          </div>
        </div>
      )}

      {omDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm font-sora">Operasjonsmanual er{" "}{operationsManual.completed ? "generert" : "lastet opp"}. OM-referanser fylles ut automatisk i samsvarsmatrisen.</p>
        </div>
      )}

      <div className="space-y-3">
        {docs.map(doc => (
          <div key={doc.id} className="haiko-card p-5 hover:border-[#6858f8]/40 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-purple-50 text-[#6858f8] shrink-0">
                  {doc.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-sora-text text-sm">{doc.title}</h3>
                    {doc.required && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#6858f8]/10 text-[#6858f8]">Påkrevd</span>
                    )}
                  </div>
                  <p className="text-sora-text-dim text-xs mt-0.5 font-sora">{doc.subtitle}</p>
                  <p className="text-sora-text-muted text-xs mt-2 leading-relaxed font-sora">{doc.description}</p>
                </div>
              </div>
              <button
                onClick={() => setOpenModal(doc.id)}
                className="haiko-btn-primary text-sm whitespace-nowrap flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Generer og åpne
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Submission info */}
      <div className="haiko-card p-5 border-dashed">
        <h3 className="font-display font-bold text-sora-text text-sm mb-2">Innsending til Luftfartstilsynet</h3>
        <div className="space-y-2">
          {scenario?.startsWith("PDRA") || (scenario && !["A1","A2","A3","STS-01","STS-02"].includes(scenario)) ? (
            <a
              href="https://lt.apps.altinn.no/lt/operating-permit/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff66c4] to-[#6858f8] text-white text-sm font-medium hover:opacity-90 transition-all"
            >
              <ExternalLink className="w-4 h-4" /> NF-1145 — Start søknad i Altinn
            </a>
          ) : (
            <a
              href="https://www.luftfartstilsynet.no/skjema/droner/nf-1172-deklarasjon-av-standardscenario-sts/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff66c4] to-[#6858f8] text-white text-sm font-medium hover:opacity-90 transition-all"
            >
              <ExternalLink className="w-4 h-4" /> NF-1172 — Deklarasjon (STS)
            </a>
          )}
          <p className="text-sora-text-dim text-xs font-sora mt-2">
            Send søknad + samsvarsmatrise + ERP + operasjonsmanual. Saksbehandlingstid: normalt 2–6 uker.
          </p>
        </div>
      </div>

      {/* Print modals */}
      {openModal === "compliance" && (
        <PrintModal title="Samsvarsmatrise" onClose={() => setOpenModal(null)}>
          <ComplianceMatrix {...props} />
        </PrintModal>
      )}
      {openModal === "erp" && (
        <PrintModal title="ERP — Beredskapsplan" onClose={() => setOpenModal(null)}>
          <ERPDocument operationsManual={operationsManual} applicantName={props.applicantName} />
        </PrintModal>
      )}
      {openModal === "summary" && (
        <PrintModal title="Søknadssammendrag" onClose={() => setOpenModal(null)}>
          <SoknadsSammendrag {...props} />
        </PrintModal>
      )}

      {/* Print styles - hide modal chrome during print */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .fixed.inset-0 { display: block !important; position: static !important; background: none !important; }
          .fixed.inset-0 > div { max-height: none !important; box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
          .fixed.inset-0 > div > div:first-child { display: none !important; }
        }
      `}</style>
    </div>
  );
}
