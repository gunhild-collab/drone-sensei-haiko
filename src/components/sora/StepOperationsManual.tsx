import { useState, useRef, useEffect } from "react";
import { Upload, CheckCircle, ChevronDown, ChevronUp, Info, Printer, Loader2, ArrowRight, ArrowLeft, ImageIcon, AlertTriangle } from "lucide-react";
import { DroneSpec } from "@/data/droneDatabase";
import { SoraResults } from "@/lib/soraCalculations";
import { FlightAreaData } from "@/components/sora/Step2FlightArea";
import { OperationsManualState } from "@/pages/SoraWizard";

interface Props {
  applicantName: string;
  applicantEmail: string;
  flightDate: string;
  municipality: string;
  selectedDrone: DroneSpec | null;
  results: SoraResults;
  flightAreaData: FlightAreaData | null;
  derivedInputs: {
    operationType: string;
    maxAltitude: number;
    populationDensity: string;
    dayNight: string;
    m1: number;
    m2: number;
    mtom: number;
    characteristicDimension: number;
    droneName: string;
  };
  scenario: string | null;
  manualTexts: Record<string, string>;
  onManualTextChange: (key: string, value: string) => void;
  operationsManual: OperationsManualState;
  onUpdateOM: (updates: Partial<OperationsManualState>) => void;
  onUpdateOMData: (key: string, value: string) => void;
}

const SECTION_NAMES = [
  "1. Organisasjon og ledelse",
  "2. Luftfartøy og utstyr",
  "3. Operasjonskonsept",
  "4. Operasjonelle prosedyrer",
  "5. Nød og unormale rutiner",
  "6. Piltkompetanse og opplæring",
  "7. Vedlikehold og teknisk styring",
  "8. Forsikring og ansvar",
  "9. Datahåndtering",
  "10. Journalføring og etterlevelse",
  "11.Værgrenser og driftsrammer",
  "12. Nødkontaktinformasjon",
];

const ERP_DEFAULTS: Record<string, string> = {
  s5_1: "Ved tap av kontrollkobling iverksetter dronen automatisk RTH til forhåndsinnstilt hjempunkt og klatrer til RTH-høyde. Crew-respons: pilot kunngjør \"Link tapt\", observatør opprettholder visuell kontakt og melder retningsoppdateringer. Begge forblir ved klar stasjon til dronen har landet. Ikke forsøk å gjenopprette manuell kontroll med mindre nødvendig. Etter hendelse: undersøk årsak før neste flyging.",
  s5_2: "Hvis batteri synker til < 15%: akustisk alarm aktiveres. Umiddelbar handling: iverksett retur og nedstigng. Forebygging: planlegg alle flyginger for å lande med minimum 15% igjen; bruk 20% som intern trigger for nedstigng.",
  s5_3: "Vurder telemetri for motorfeilmeldinger. Hvis gjenopprettbart: forsøk å vinne høyde. Hvis ikke gjenopprettbart: kunngjør NØDSITUASJON, full nedstigng til landing. Observatør sporer dronen, varsler om hindringer i nedstignbanen. Ikke nærm deg til propellene er helt stoppet. Ikke fly inntil motorproblemet er diagnostisert og utbedret.",
  s5_4: "Umiddelbar kunngjøring: \"Trafikk! Stiger ned nå!\" Pilot iverksetter rask nedstigng til < 30 m AGL eller lander umiddelbart. Observatør opprettholder visuell kontakt med bemannet luftfartøy og melder posisjon. Etter hendelse: land og vent til området er klart. Dokumenter tid, type, kurs og avstand. Ikke gjenoppta BVLOS i minst 10 minutter.",
  s5_5: "Tegn: skadet/løs propell, fastlåst gimbal, røyk eller lukt, uvanlig vibrasjon. Handling: kunngjør unormal tilstand, iverksett nedstigng, land trygt, slå av og fjern batteri. Ikke fly inntil feilen er inspisert og utbedret.",
  s5_6: "Umiddelbar kunngjøring: \"Visuell tapt!\" Pilot svarer: \"Roger, starter nedstigng til landing.\" Reduser høyde til < 30 m og iverksett RTH eller manuell landing. Observatør lytter etter motordlyd for å lokalisere dronen. Forebygging: oppretthold strengt skannemønster og kommuniser tidlig hvis visuell kontakt er i ferd med å bli marginal.",
};

const S7_DEFAULTS = {
  s7_routine: "Før hver flyging: visuell inspeksjon (ramme, propeller, gimbal, antenner), kontrollkobling-test, batteri visuell sjekk. Ukentlig (ved 3+ flyginger/uke): rengjør gimbal-linse, sjekk propelltilstand, sjekk batterikontakter. Månedlig: inspiser landingsgir, test gimbal-rekkevidde, gjennomgå flylogger.",
  s7_scheduled: "Per produsentens veiledning. Batteri: bytt ut hvis syklustall > 200 eller oppbøying observeres. Motorer: bytt ut ved uvanlig vibrasjon eller lyd. Firmware: oppdater til nyeste stabile versjon kvartalsvis. Gimbal-kalibrering: auto-kalibrer ved start av hver dag.",
  s7_records: "Vedlikeholdslogg: registrer alle handlinger. Out-of-service logg: noter årsak og retur-til-tjeneste dato. Journaler oppbevares i 3 år.",
};

const S9_DEFAULTS = {
  s9_flightdata: "Rå telemetri logges automatisk. Oppbevares 12 måneder. Tilgang begrenset til pilot og ledelse. Brukes kun til opplæring, hendelsesundersøkelse eller regulatorisk etterlevelse.",
  s9_imagery: "Opptak er eiendom til Haiko AS eller kunde. Opplæringsbilder oppbevares 6 måneder med mindre annet er forespurt.",
  s9_gdpr: "Ingen intensjonell innsamling av personopplysninger under opplæringsflyging. Hvis personopplysninger utilsiktet fanges opp: ikke behandlet, oppbevart eller delt uten eksplisitt samtykke.",
};

const S10_DEFAULTS = {
  s10_records: "Obligatoriske journaler (oppbevares min. 3 år): flygelogg, pilotgodkjenninger, vedlikeholdslogger, forsikringsbevis, hendelsesrapporter, OM-oppdateringer og revisjoner.",
  s10_audit: "Journaler lagres i papir- og digitalt format. Masterkopier ved operatørens lokaler; sikkerhetskopiering på sekundær lokasjon. Tilgjengelig for LT på forespørsel med 48 timers varsel.",
  s10_review: "Gjennomgås årlig eller etter enhver hendelse. Endringer i operasjoner, personell, luftfartøy eller prosedyrer utløser OM-oppdatering. Oppdatert versjon innsendt til LT innen 30 dager etter godkjenning.",
};

const S11_DEFAULTS = {
  s11_vind: "Maks vedvarende vind: 8 m/s, kast maks 10 m/s. Målt på stedet med anemometer.",
  s11_synbarhet: "Minimum 5 km. Ingen kraftig regn, tåke eller snø.",
  s11_temperatur: "Fly ikke under 0°C uten å verifisere batterikapasitet per produsentens veiledning.",
  s11_dagslys: "Alle flyginger i dagslys (sivil tusmørke). Ingen nattoperasjoner. Flyginger må begynne minimum 30 min etter soloppgang og avsluttes 30 min før solnedgang.",
  s11_saesonger: "Vinter: redusert batteriytelse, isingsrisiko, begrenset dagslysvindu. Vår/høst: variable vinder — vær ekstra oppmerksom. Sommer: utvidet dagslys — kontroller tidspunkter.",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="haiko-label block mb-1">{label}{required && <span className="text-pink-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function AutoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="haiko-label block mb-1">{label}</label>
      <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5">
        <span className="text-sm text-[#1c0059] flex-1 font-sora">{value || "—"}</span>
        <span className="text-[10px] bg-purple-100 text-[#6858f8] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">Hentet automatisk</span>
      </div>
    </div>
  );
}

export default function StepOperationsManual({
  applicantName, municipality, selectedDrone, derivedInputs, scenario, results,
  operationsManual, onUpdateOM, onUpdateOMData,
}: Props) {
  const [currentSection, setCurrentSection] = useState(0);
  const [brreg, setBrreg] = useState<{ fetching: boolean; fetched: boolean; error: boolean }>({ fetching: false, fetched: false, error: false });
  const [generating, setGenerating] = useState(false);
  const [showKeyInfo, setShowKeyInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const om = operationsManual;
  const get = (k: string) => om.data[k] || "";
  const set = (k: string, v: string) => onUpdateOMData(k, v);

  // Pre-fill defaults when entering sections with default text
  useEffect(() => {
    const defaults: Record<string, string> = {
      s5_1: ERP_DEFAULTS.s5_1, s5_2: ERP_DEFAULTS.s5_2,
      s5_3: ERP_DEFAULTS.s5_3, s5_4: ERP_DEFAULTS.s5_4,
      s5_5: ERP_DEFAULTS.s5_5, s5_6: ERP_DEFAULTS.s5_6,
      s7_routine: S7_DEFAULTS.s7_routine, s7_scheduled: S7_DEFAULTS.s7_scheduled, s7_records: S7_DEFAULTS.s7_records,
      s9_flightdata: S9_DEFAULTS.s9_flightdata, s9_imagery: S9_DEFAULTS.s9_imagery, s9_gdpr: S9_DEFAULTS.s9_gdpr,
      s10_records: S10_DEFAULTS.s10_records, s10_audit: S10_DEFAULTS.s10_audit, s10_review: S10_DEFAULTS.s10_review,
      s11_vind: S11_DEFAULTS.s11_vind, s11_synbarhet: S11_DEFAULTS.s11_synbarhet,
      s11_temperatur: S11_DEFAULTS.s11_temperatur, s11_dagslys: S11_DEFAULTS.s11_dagslys, s11_saesonger: S11_DEFAULTS.s11_saesonger,
    };
    Object.entries(defaults).forEach(([k, v]) => {
      if (!om.data[k]) onUpdateOMData(k, v);
    });
  }, []);

  // BRREG lookup
  const fetchBrreg = async (orgnr: string) => {
    if (orgnr.length !== 9) return;
    setBrreg({ fetching: true, fetched: false, error: false });
    try {
      const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}`);
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      const adr = data.forretningsadresse;
      const adresseStr = adr ? `${(adr.adresse || []).join(", ")}, ${adr.postnummer} ${adr.poststed}` : "";
      set("s1_selskapsnavn", data.navn || "");
      set("s1_adresse", adresseStr);
      set("s1_organisasjonsform", data.organisasjonsform?.beskrivelse || "");
      setBrreg({ fetching: false, fetched: true, error: false });
    } catch {
      setBrreg({ fetching: false, fetched: false, error: true });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Filen er for stor. Maks 10MB."); return; }
    onUpdateOM({ uploaded: true, filename: file.name });
    setShowKeyInfo(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpdateOM({ logo: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const today = new Date().toLocaleDateString("nb-NO");
  const selskapsnavn = get("s1_selskapsnavn") || applicantName || "[Selskapsnavn]";

  // Validation for PDF generation
  const requiredFilled = [
    get("s1_selskapsnavn"),
    get("s1_ansvarligLederNavn"),
    get("s6_pilotNavn"),
    get("s6_pilotSertifikattype"),
    get("s6_pilotSertifikatnummer"),
    get("s5_noodlandingslokasjon"),
    get("s8_forsikringsselskap"),
    get("s8_polisenummer"),
  ].every(v => v.trim().length > 0);

  const handleGenerate = () => {
    if (!requiredFilled) return;
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      onUpdateOM({ completed: true });
      setTimeout(() => window.print(), 300);
    }, 1000);
  };

  const inp = "haiko-input w-full";
  const ta = "haiko-input w-full resize-y min-h-[90px]";

  // ---- OPTION CHOICE ----
  if (!om.option) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold text-sora-text mb-2">Operasjonsmanual</h1>
          <p className="text-sora-text-muted text-[14px] font-sora">Velg hvordan du vil gå frem for operasjonsmanualen:</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onUpdateOM({ option: "A" })}
            className="haiko-card p-6 text-left hover:border-[#6858f8] hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:bg-[#6858f8] transition-colors">
              <Upload className="w-6 h-6 text-[#6858f8] group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-display font-bold text-[16px] text-sora-text mb-2">Jeg har en operasjonsmanual</h3>
            <p className="text-sora-text-muted text-[13px] font-sora">Last opp eksisterende manual (PDF eller DOCX, maks 10MB). Nøkkeldata hentes og brukes i samsvarsmatrisen.</p>
          </button>
          <button
            onClick={() => onUpdateOM({ option: "B" })}
            className="haiko-card p-6 text-left hover:border-[#6858f8] hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-4 group-hover:bg-gradient-to-br group-hover:from-pink-400 group-hover:to-[#6858f8] transition-colors">
              <Printer className="w-6 h-6 text-pink-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-display font-bold text-[16px] text-sora-text mb-2">Jeg vil lage en ny operasjonsmanual</h3>
            <p className="text-sora-text-muted text-[13px] font-sora">Fyll inn 12 seksjoner etter PDRA-G01-malen. Genererer en komplett, Haiko-merket PDF klar for innsending.</p>
          </button>
        </div>
      </div>
    );
  }

  // ---- OPTION A: UPLOAD ----
  if (om.option === "A") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => onUpdateOM({ option: null })} className="text-sora-text-dim hover:text-sora-text"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-[28px] font-display font-bold text-sora-text">Last opp operasjonsmanual</h1>
        </div>

        {!om.uploaded ? (
          <div
            className="haiko-card border-dashed border-2 p-12 text-center cursor-pointer hover:border-[#6858f8] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} />
            <Upload className="w-10 h-10 text-sora-text-dim mx-auto mb-3" />
            <p className="font-display font-bold text-sora-text mb-1">Klikk for å laste opp</p>
            <p className="text-sora-text-muted text-sm font-sora">PDF eller DOCX — maks 10MB</p>
          </div>
        ) : (
          <div className="haiko-card p-4 flex items-center gap-3 border-green-200 bg-green-50">
            <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-display font-bold text-green-800 text-sm">Lastet opp: {om.filename}</p>
              <p className="text-green-600 text-xs font-sora">Manualen vil bli referert automatisk i samsvarsmatrisen.</p>
            </div>
            <button onClick={() => onUpdateOM({ uploaded: false, filename: undefined })} className="ml-auto text-green-600 hover:text-green-800 text-xs font-sora">Endre</button>
          </div>
        )}

        {om.uploaded && (
          <div className="haiko-card overflow-hidden">
            <button
              onClick={() => setShowKeyInfo(!showKeyInfo)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-[#6858f8]" />
                <span className="font-display font-bold text-sora-text">Fyll inn nøkkelinformasjon fra manualen</span>
                <span className="text-xs text-sora-text-dim font-sora">(brukes i samsvarsmatrise og søknadsdokumenter)</span>
              </div>
              {showKeyInfo ? <ChevronUp className="w-5 h-5 text-sora-text-dim" /> : <ChevronDown className="w-5 h-5 text-sora-text-dim" />}
            </button>
            {showKeyInfo && (
              <div className="px-5 pb-5 border-t border-sora-border space-y-4 pt-4">
                <p className="text-sora-text-muted text-xs font-sora">Seksjon 1 — Operatørinformasjon</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Selskapsnavn" required><input className={inp} placeholder="Haiko AS" value={get("s1_selskapsnavn")} onChange={e => set("s1_selskapsnavn", e.target.value)} /></Field>
                  <Field label="Ansvarlig leder" required><input className={inp} placeholder="Fullt navn" value={get("s1_ansvarligLederNavn")} onChange={e => set("s1_ansvarligLederNavn", e.target.value)} /></Field>
                  <Field label="Pilot navn" required><input className={inp} placeholder="Fullt navn" value={get("s6_pilotNavn")} onChange={e => set("s6_pilotNavn", e.target.value)} /></Field>
                  <Field label="Sertifikattype" required>
                    <select className={inp} value={get("s6_pilotSertifikattype")} onChange={e => set("s6_pilotSertifikattype", e.target.value)}>
                      <option value="">Velg...</option>
                      <option>A1/A3</option><option>A2</option><option>STS</option><option>Spesifikk</option>
                    </select>
                  </Field>
                  <Field label="Sertifikatnummer" required><input className={inp} placeholder="NO-CERT-2024-XXXXX" value={get("s6_pilotSertifikatnummer")} onChange={e => set("s6_pilotSertifikatnummer", e.target.value)} /></Field>
                </div>
                <p className="text-sora-text-muted text-xs font-sora pt-2">Seksjon 5 — Nødprosedyrer</p>
                <Field label="Nødlandingslokasjon" required>
                  <input className={inp} placeholder="Parkeringsplass sør for operasjonsområdet, koordinater: ..." value={get("s5_noodlandingslokasjon")} onChange={e => set("s5_noodlandingslokasjon", e.target.value)} />
                </Field>
                <Field label="Forsikringsselskap" required><input className={inp} placeholder="Gjensidige / AIG / Tryg" value={get("s8_forsikringsselskap")} onChange={e => set("s8_forsikringsselskap", e.target.value)} /></Field>
                <Field label="Polisenummer" required><input className={inp} placeholder="POL-2024-XXXXX" value={get("s8_polisenummer")} onChange={e => set("s8_polisenummer", e.target.value)} /></Field>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- OPTION B: FULL BUILDER ----
  const totalSections = SECTION_NAMES.length;
  const sectionName = SECTION_NAMES[currentSection] || "";
  const isLast = currentSection === totalSections - 1;

  const renderSection = () => {
    switch (currentSection) {
      case 0: return (
        <div className="space-y-4">
          <Field label="Organisasjonsnummer">
            <div className="flex gap-2">
              <input
                className={inp}
                placeholder="9 siffer"
                maxLength={9}
                value={get("s1_orgnr")}
                onChange={e => set("s1_orgnr", e.target.value)}
                onBlur={e => fetchBrreg(e.target.value.trim())}
              />
              {brreg.fetching && <div className="flex items-center gap-1 text-xs text-sora-text-dim font-sora"><Loader2 className="w-4 h-4 animate-spin" /> Henter...</div>}
              {brreg.fetched && <div className="flex items-center gap-1 text-xs text-green-600 font-sora"><CheckCircle className="w-4 h-4" /> Hentet fra Brønnøysundregistrene</div>}
              {brreg.error && <div className="flex items-center gap-1 text-xs text-yellow-600 font-sora"><AlertTriangle className="w-4 h-4" /> Fant ikke selskapet — fyll inn manuelt</div>}
            </div>
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Selskapsnavn" required><input className={inp + (brreg.fetched && get("s1_selskapsnavn") ? " border-purple-300 bg-purple-50" : "")} placeholder="Haiko AS" value={get("s1_selskapsnavn")} onChange={e => set("s1_selskapsnavn", e.target.value)} /></Field>
            <Field label="Adresse"><input className={inp + (brreg.fetched && get("s1_adresse") ? " border-purple-300 bg-purple-50" : "")} placeholder="Gateadresse, postnummer sted" value={get("s1_adresse")} onChange={e => set("s1_adresse", e.target.value)} /></Field>
            <Field label="Organisasjonsform"><input className={inp + (brreg.fetched && get("s1_organisasjonsform") ? " border-purple-300 bg-purple-50" : "")} placeholder="Aksjeselskap" value={get("s1_organisasjonsform")} onChange={e => set("s1_organisasjonsform", e.target.value)} /></Field>
          </div>
          <div className="border-t border-sora-border pt-4">
            <p className="haiko-label mb-3">1.2 Ansvarlig leder</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Navn" required><input className={inp} placeholder="Fullt navn" value={get("s1_ansvarligLederNavn")} onChange={e => set("s1_ansvarligLederNavn", e.target.value)} /></Field>
              <Field label="Tittel"><input className={inp} placeholder="Daglig leder" value={get("s1_ansvarligLederTittel")} onChange={e => set("s1_ansvarligLederTittel", e.target.value)} /></Field>
              <Field label="E-post"><input className={inp} type="email" placeholder="leder@selskap.no" value={get("s1_ansvarligLederEpost")} onChange={e => set("s1_ansvarligLederEpost", e.target.value)} /></Field>
              <Field label="Telefon"><input className={inp} placeholder="+47 000 00 000" value={get("s1_ansvarligLederTlf")} onChange={e => set("s1_ansvarligLederTlf", e.target.value)} /></Field>
            </div>
          </div>
          <div className="border-t border-sora-border pt-4">
            <p className="haiko-label mb-3">1.3 Operativt personell</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Fjernpilot — navn"><input className={inp} placeholder="Fullt navn" value={get("s1_pilot1Navn")} onChange={e => set("s1_pilot1Navn", e.target.value)} /></Field>
              <Field label="Fjernpilot — sertifikattype">
                <select className={inp} value={get("s1_pilot1Sertifikat")} onChange={e => set("s1_pilot1Sertifikat", e.target.value)}>
                  <option value="">Velg...</option>
                  <option>A1/A3</option><option>A2</option><option>STS</option><option>Spesifikk</option>
                </select>
              </Field>
              <Field label="Luftromsobservatør — navn"><input className={inp} placeholder="Fullt navn" value={get("s1_observator1Navn")} onChange={e => set("s1_observator1Navn", e.target.value)} /></Field>
            </div>
          </div>
          <div className="border-t border-sora-border pt-4">
            <p className="haiko-label mb-3">Logo (valgfritt)</p>
            <div className="flex items-center gap-4">
              {om.logo && <img src={om.logo} alt="Logo" className="h-12 object-contain border rounded p-1" />}
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="haiko-btn-secondary text-sm flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                {om.logo ? "Endre logo" : "Last opp logo (PNG/SVG)"}
              </button>
              <input ref={logoInputRef} type="file" accept="image/png,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
        </div>
      );

      case 1: return (
        <div className="space-y-4">
          <div className="haiko-info flex gap-3">
            <Info className="w-4 h-4 text-[#6858f8] mt-0.5 shrink-0" />
            <p className="text-[13px] font-sora">Feltene under er hentet automatisk fra dronevalget ditt. Du kan redigere dem ved behov.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AutoField label="Dronemodell" value={selectedDrone?.name || derivedInputs.droneName} />
            <AutoField label="Produsent" value={selectedDrone?.manufacturer || "—"} />
            <AutoField label="MTOM" value={`${derivedInputs.mtom} kg`} />
            <AutoField label="Karakteristisk dimensjon" value={`${derivedInputs.characteristicDimension} m`} />
            <AutoField label="Klasse" value={selectedDrone?.categoryClass || "—"} />
            <AutoField label="Maks hastighet" value={selectedDrone ? `${selectedDrone.maxSpeed} m/s` : "—"} />
          </div>
          <Field label="Registreringsnummer (flydrone.no)"><input className={inp} placeholder="NOR-DJI-M30T-00123" value={get("s2_regNr")} onChange={e => set("s2_regNr", e.target.value)} /></Field>
          <Field label="Serienummer"><input className={inp} placeholder="DJI-XXXXXX" value={get("s2_serienummer")} onChange={e => set("s2_serienummer", e.target.value)} /></Field>
          <Field label="Tilleggsutstyr"><input className={inp} placeholder="Termisk kamera, RTK, fallskjerm..." value={get("s2_utstyr")} onChange={e => set("s2_utstyr", e.target.value)} /></Field>
        </div>
      );

      case 2: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AutoField label="Operasjonstype" value={derivedInputs.operationType} />
            <AutoField label="Maks flygehøyde" value={`${derivedInputs.maxAltitude} m AGL`} />
            <AutoField label="Scenario" value={scenario || "—"} />
            <AutoField label="Befolkningstetthet" value={derivedInputs.populationDensity} />
          </div>
          <Field label="Operasjonsområde (lokasjon/beskrivelse)">
            <textarea className={ta} placeholder={`${municipality} kommune — fyll inn mer detaljert beskrivelse`} value={get("s3_operasjonsomraade")} onChange={e => set("s3_operasjonsomraade", e.target.value)} />
          </Field>
          <Field label="Oppdragstype og formål">
            <textarea className={ta} placeholder="Inspeksjon av infrastruktur / opplæring / kartlegging..." value={get("s3_oppdragstype")} onChange={e => set("s3_oppdragstype", e.target.value)} />
          </Field>
          <Field label="Operasjonsfrekvens og tidsrom">
            <input className={inp} placeholder="Hverdager 08:00–16:00, maks 3 flyginger per dag" value={get("s3_frekvens")} onChange={e => set("s3_frekvens", e.target.value)} />
          </Field>
          <Field label="Horisontal avstand maks (m)">
            <input className={inp} type="number" placeholder="1000" value={get("s3_horisontalAvstand")} onChange={e => set("s3_horisontalAvstand", e.target.value)} />
          </Field>
          <Field label="Sikkerhetskonsept — DAA">
            <textarea className={ta} placeholder="Observatørbasert Detect-and-Avoid. Luftromsobservatør i posisjon til enhver tid under BVLOS. Observatør skanner 360° kontinuerlig og kommuniserer via radio..." value={get("s3_sikkerhetskonsept")} onChange={e => set("s3_sikkerhetskonsept", e.target.value)} />
          </Field>
        </div>
      );

      case 3: return (
        <div className="space-y-4">
          <p className="haiko-label">4.1 Pre-flight prosedyrer</p>
          <Field label="4.1.1 Misjonsplanlegging (24–48 timer før)">
            <textarea className={ta} placeholder="Værvarselssjekk, luftromsverifisering via notam.no/EUROCONTROL, personelltilgjengelighet, gjennomgang av mål og flygeplan, utstyrsstatus." value={get("s4_planlegging")} onChange={e => set("s4_planlegging", e.target.value)} />
          </Field>
          <Field label="4.1.2 On-site preflight (30–45 min før)">
            <textarea className={ta} placeholder="Stedsinspeksjon, vær on-site (anemometer), luftfartøyinspeksjon, flysystemkonfigurasjon, crew-briefing." value={get("s4_preflight")} onChange={e => set("s4_preflight", e.target.value)} />
          </Field>
          <p className="haiko-label pt-2">4.2 Under flyging</p>
          <Field label="4.2.1 Take-off og initial stigning">
            <textarea className={ta} placeholder="Pilot bekrefter klart, starter motorer, starter opptak. Observer bekrefter klar stasjon. Stiger til operasjonshøyde..." value={get("s4_takeoff")} onChange={e => set("s4_takeoff", e.target.value)} />
          </Field>
          <Field label="4.2.2 Operasjonell flygefase — avbrytelseskriterier">
            <textarea className={ta} placeholder="Avbryt ved: vind over grense, tap av GNSS, batterialarm, observatør mister sikt, uventet lufttrafikk." value={get("s4_abort")} onChange={e => set("s4_abort", e.target.value)} />
          </Field>
          <Field label="4.2.3 Retur og landing">
            <textarea className={ta} placeholder="RTH eller manuell retur. Observer bekrefter klart landingsområde. Post-landing: propeller stoppet, batteristatus sjekket." value={get("s4_landing")} onChange={e => set("s4_landing", e.target.value)} />
          </Field>
          <p className="haiko-label pt-2">4.3 Post-flight</p>
          <Field label="4.3.1–4.3.3 Post-flight inspeksjon og logging">
            <textarea className={ta} placeholder="Inspiser luftfartøy for skader. Logg flygedata. Lad batteri til lagringskapasitet. Oppdater vedlikeholdslogg ved behov." value={get("s4_postflight")} onChange={e => set("s4_postflight", e.target.value)} />
          </Field>
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <div className="haiko-info flex gap-3">
            <Info className="w-4 h-4 text-[#6858f8] mt-0.5 shrink-0" />
            <p className="text-[13px] font-sora">Feltene er forhåndsutfylt med standard PDRA-G01 ERP-tekst. Tilpass etter eget behov.</p>
          </div>
          {[
            { k: "s5_1", label: "5.1 Tap av kontrollkobling / RTH" },
            { k: "s5_2", label: "5.2 Lavt batteri / Strøm" },
            { k: "s5_3", label: "5.3 Ukontrollert nedstigng / Motorstopp" },
            { k: "s5_4", label: "5.4 Konfliktende bemannet luftfartøy / Trafikkvarsel" },
            { k: "s5_5", label: "5.5 Utstyrsfeil" },
            { k: "s5_6", label: "5.6 Tapt visuell kontakt" },
          ].map(({ k, label }) => (
            <Field key={k} label={label}>
              <textarea className={ta + " min-h-[110px]"} value={get(k)} onChange={e => set(k, e.target.value)} />
            </Field>
          ))}
          <Field label="Sikker nødlandingslokasjon" required>
            <input className={inp} placeholder="Parkeringsplass sør for operasjonsområdet, koordinater: ..." value={get("s5_noodlandingslokasjon")} onChange={e => set("s5_noodlandingslokasjon", e.target.value)} />
          </Field>
        </div>
      );

      case 5: return (
        <div className="space-y-4">
          <Field label="Påkrevde kvalifikasjoner — fjernpilot">
            <textarea className={ta} placeholder="A1/A3-sertifikat, STC, BVLOS-opplæringskurs, praktisk kompetansesjekk (min. 5 overvåkede VLOS-flyginger, OM-briefing, observatørgodkjenning)." value={get("s6_kvalifikasjoner")} onChange={e => set("s6_kvalifikasjoner", e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Pilot — fullt navn" required>
              <input className={inp} placeholder="Ola Nordmann" value={get("s6_pilotNavn")} onChange={e => set("s6_pilotNavn", e.target.value)} />
            </Field>
            <Field label="Sertifikattype" required>
              <select className={inp} value={get("s6_pilotSertifikattype")} onChange={e => set("s6_pilotSertifikattype", e.target.value)}>
                <option value="">Velg...</option>
                <option>A1/A3</option><option>A2</option><option>STS</option><option>Spesifikk</option>
              </select>
            </Field>
            <Field label="Sertifikatnummer" required>
              <input className={inp} placeholder="NO-CERT-2024-XXXXX" value={get("s6_pilotSertifikatnummer")} onChange={e => set("s6_pilotSertifikatnummer", e.target.value)} />
            </Field>
            <Field label="Dato siste kurs">
              <input className={inp} type="date" value={get("s6_siste_kurs")} onChange={e => set("s6_siste_kurs", e.target.value)} />
            </Field>
          </div>
          <Field label="6.2 Gjentakende opplæring / valuta">
            <textarea className={ta} placeholder="Minimum én familiæriseringsflying hver 90 dag hvis ikke aktivt flygende. Årlig gjennomgang av godkjenninger og prosedyrer." value={get("s6_gjentakende")} onChange={e => set("s6_gjentakende", e.target.value)} />
          </Field>
          <Field label="6.3 Opplæringslogger">
            <textarea className={ta} placeholder="Pilotgodkjenning oppbevares på fil. Flygelogger oppbevares min. 12 måneder. Kompetansevurderinger oppbevares 3 år." value={get("s6_treningslogg")} onChange={e => set("s6_treningslogg", e.target.value)} />
          </Field>
        </div>
      );

      case 6: return (
        <div className="space-y-4">
          <div className="haiko-info flex gap-3">
            <Info className="w-4 h-4 text-[#6858f8] mt-0.5 shrink-0" />
            <p className="text-[13px] font-sora">Forhåndsutfylt med standard PDRA-G01 vedlikeholdsrutiner. Tilpass etter dronetype og drift.</p>
          </div>
          <Field label="7.1 Rutineinspeksjoner">
            <textarea className={ta + " min-h-[100px]"} value={get("s7_routine")} onChange={e => set("s7_routine", e.target.value)} />
          </Field>
          <Field label="7.2 Planlagt vedlikehold">
            <textarea className={ta + " min-h-[100px]"} value={get("s7_scheduled")} onChange={e => set("s7_scheduled", e.target.value)} />
          </Field>
          <Field label="7.3 Servicelogg">
            <textarea className={ta} value={get("s7_records")} onChange={e => set("s7_records", e.target.value)} />
          </Field>
        </div>
      );

      case 7: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Forsikringsselskap" required>
              <input className={inp} placeholder="Gjensidige / AIG / Tryg" value={get("s8_forsikringsselskap")} onChange={e => set("s8_forsikringsselskap", e.target.value)} />
            </Field>
            <Field label="Polisenummer" required>
              <input className={inp} placeholder="POL-2024-XXXXX" value={get("s8_polisenummer")} onChange={e => set("s8_polisenummer", e.target.value)} />
            </Field>
            <Field label="Dekningsbeløp">
              <input className={inp} placeholder="5 000 000 NOK" value={get("s8_dekningsbeloep")} onChange={e => set("s8_dekningsbeloep", e.target.value)} />
            </Field>
            <Field label="Forsikringstaker (policyholder)">
              <input className={inp} placeholder={selskapsnavn} value={get("s8_policyholder")} onChange={e => set("s8_policyholder", e.target.value)} />
            </Field>
          </div>
          <Field label="8.2 Hendelsesrapportering">
            <textarea className={ta} placeholder="Ulykker/hendelser rapporteres til forsikringsleverandør innen 48 timer. Intern undersøkelse innen 7 dager. Korrigerende tiltak implementeres før gjenopptakelse." value={get("s8_hendelsesrapportering")} onChange={e => set("s8_hendelsesrapportering", e.target.value)} />
          </Field>
        </div>
      );

      case 8: return (
        <div className="space-y-4">
          <div className="haiko-info flex gap-3">
            <Info className="w-4 h-4 text-[#6858f8] mt-0.5 shrink-0" />
            <p className="text-[13px] font-sora">Forhåndsutfylt med standard PDRA-G01 datahåndteringsrutiner.</p>
          </div>
          <Field label="9.1 Flygedata-logging"><textarea className={ta} value={get("s9_flightdata")} onChange={e => set("s9_flightdata", e.target.value)} /></Field>
          <Field label="9.2 Bildemateriale"><textarea className={ta} value={get("s9_imagery")} onChange={e => set("s9_imagery", e.target.value)} /></Field>
          <Field label="9.3 GDPR-etterlevelse"><textarea className={ta} value={get("s9_gdpr")} onChange={e => set("s9_gdpr", e.target.value)} /></Field>
        </div>
      );

      case 9: return (
        <div className="space-y-4">
          <Field label="10.1 Obligatoriske journaler"><textarea className={ta} value={get("s10_records")} onChange={e => set("s10_records", e.target.value)} /></Field>
          <Field label="10.2 Revisjons-spor"><textarea className={ta} value={get("s10_audit")} onChange={e => set("s10_audit", e.target.value)} /></Field>
          <Field label="10.3 OM-gjennomgang og oppdatering"><textarea className={ta} value={get("s10_review")} onChange={e => set("s10_review", e.target.value)} /></Field>
        </div>
      );

      case 10: return (
        <div className="space-y-4">
          <div className="haiko-info flex gap-3">
            <Info className="w-4 h-4 text-[#6858f8] mt-0.5 shrink-0" />
            <p className="text-[13px] font-sora">Forhåndsutfylt med standard PDRA-G01 grenser. Tilpass per spesifikk drone og operasjon.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="11.1 Vindgrenser"><textarea className="haiko-input w-full resize-y min-h-[60px]" value={get("s11_vind")} onChange={e => set("s11_vind", e.target.value)} /></Field>
            <Field label="11.2 Siktbarhet"><textarea className="haiko-input w-full resize-y min-h-[60px]" value={get("s11_synbarhet")} onChange={e => set("s11_synbarhet", e.target.value)} /></Field>
            <Field label="11.3 Temperaturgrenser"><textarea className="haiko-input w-full resize-y min-h-[60px]" value={get("s11_temperatur")} onChange={e => set("s11_temperatur", e.target.value)} /></Field>
            <Field label="11.4 Dagslys"><textarea className="haiko-input w-full resize-y min-h-[60px]" value={get("s11_dagslys")} onChange={e => set("s11_dagslys", e.target.value)} /></Field>
          </div>
          <Field label="11.5 Sesongbetraktninger (nordisk)"><textarea className={ta} value={get("s11_saesonger")} onChange={e => set("s11_saesonger", e.target.value)} /></Field>
        </div>
      );

      case 11: return (
        <div className="space-y-4">
          <div className="haiko-info flex gap-3">
            <Info className="w-4 h-4 text-[#6858f8] mt-0.5 shrink-0" />
            <p className="text-[13px] font-sora">Nødnummer er forhåndsutfylt. Operatørens kontaktperson hentes automatisk fra seksjon 1.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Brann/Politi"><input className={inp} value="112" readOnly /></Field>
            <Field label="Ambulanse"><input className={inp} value="113" readOnly /></Field>
            <Field label="Luftfartstilsynet"><input className={inp} value="post@caa.no | +47 75 58 50 00" readOnly /></Field>
            <Field label="LT hendelsesrapportering"><input className={inp} value="https://www.luftfartstilsynet.no/hendelsesrapportering" readOnly /></Field>
          </div>
          <Field label="Operatørens kontaktperson">
            <input className={inp} placeholder={get("s1_ansvarligLederNavn") || "Navn"} value={get("s12_kontaktperson")} onChange={e => set("s12_kontaktperson", e.target.value)} />
          </Field>
          <Field label="Operatørens kontakttelefon">
            <input className={inp} placeholder="+47 000 00 000" value={get("s12_kontakttelefon")} onChange={e => set("s12_kontakttelefon", e.target.value)} />
          </Field>

          <div className="border-t border-sora-border pt-4">
            <p className="font-display font-bold text-sora-text mb-3">Generere operasjonsmanual (PDF)</p>
            {!requiredFilled && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-yellow-700 text-xs font-sora">Obligatoriske felt mangler: selskapsnavn (seksjon 1), ansvarlig leder (seksjon 1), pilotinfo (seksjon 6), nødlandingslokasjon (seksjon 5), forsikringsinfo (seksjon 8).</p>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={!requiredFilled || generating}
              className="haiko-btn-primary w-full py-4 text-base"
            >
              {generating
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Genererer dokument...</>
                : <><Printer className="w-5 h-5" /> Generer operasjonsmanual (PDF)</>}
            </button>
            {om.completed && (
              <p className="text-center text-green-600 text-sm mt-2 font-sora">Operasjonsmanualen er generert. Du kan nå gå videre til søknadsdokumenter.</p>
            )}
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + back */}
      <div className="flex items-center gap-3">
        <button onClick={() => onUpdateOM({ option: null })} className="text-sora-text-dim hover:text-sora-text"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-[28px] font-display font-bold text-sora-text">Operasjonsmanual</h1>
          <p className="text-sora-text-muted text-sm font-sora">Seksjon {currentSection + 1} av {totalSections} — {sectionName}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[#e8e5f8] rounded-full h-2">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[#ff66c4] to-[#6858f8] transition-all"
          style={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
        />
      </div>

      {/* Section tabs (compact) */}
      <div className="flex flex-wrap gap-1">
        {SECTION_NAMES.map((name, i) => (
          <button
            key={i}
            onClick={() => setCurrentSection(i)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${i === currentSection ? "bg-[#6858f8] text-white" : "bg-[#f5f4ff] text-sora-text-dim hover:bg-[#e8e5f8]"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="haiko-card p-6">
        <h2 className="font-display font-bold text-[16px] text-[#6858f8] mb-4">{sectionName}</h2>
        {renderSection()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
          disabled={currentSection === 0}
          className="haiko-btn-secondary text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Forrige seksjon
        </button>
        {!isLast && (
          <button
            onClick={() => setCurrentSection(Math.min(totalSections - 1, currentSection + 1))}
            className="haiko-btn-primary text-sm flex items-center gap-2"
          >
            Neste seksjon <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* PRINT TEMPLATE */}
      <div id="operations-manual-print" className="hidden print:block">
        <div className="print-gradient-line" />
        {/* Cover */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 style={{fontFamily:"Poppins", fontWeight:700, fontSize:"24pt", color:"#6858f8"}}>OPERASJONSMANUAL</h1>
            <p style={{fontFamily:"Montserrat", fontSize:"12pt", marginTop:4}}>{selskapsnavn}</p>
            <p style={{fontFamily:"Montserrat", fontSize:"10pt", color:"#666", marginTop:2}}>Scenario: {scenario || "—"} | Versjon 1.0 | {today}</p>
          </div>
          {om.logo && <img src={om.logo} alt="Logo" style={{height:60, objectFit:"contain"}} />}
        </div>

        {/* TOC */}
        <div style={{marginBottom:32}}>
          <h2 style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", fontSize:"14pt"}}>Innholdsfortegnelse</h2>
          {SECTION_NAMES.map((name, i) => (
            <div key={i} style={{fontFamily:"Montserrat", fontSize:"10pt", padding:"2px 0", display:"flex", justifyContent:"space-between"}}>
              <span>{name}</span><span style={{color:"#999"}}>s. {i + 3}</span>
            </div>
          ))}
        </div>

        {/* Sections */}
        {([
          { title: "1. Organisasjon og ledelse", keys: ["s1_selskapsnavn","s1_adresse","s1_orgnr","s1_organisasjonsform","s1_ansvarligLederNavn","s1_ansvarligLederTittel","s1_ansvarligLederEpost","s1_ansvarligLederTlf","s1_pilot1Navn","s1_pilot1Sertifikat","s1_observator1Navn"] },
          { title: "2. Luftfartøy og utstyr", keys: ["s2_regNr","s2_serienummer","s2_utstyr"] },
          { title: "3. Operasjonskonsept", keys: ["s3_operasjonsomraade","s3_oppdragstype","s3_frekvens","s3_horisontalAvstand","s3_sikkerhetskonsept"] },
          { title: "4. Operasjonelle prosedyrer", keys: ["s4_planlegging","s4_preflight","s4_takeoff","s4_abort","s4_landing","s4_postflight"] },
          { title: "5. Nød og unormale rutiner (ERP)", keys: ["s5_1","s5_2","s5_3","s5_4","s5_5","s5_6","s5_noodlandingslokasjon"] },
          { title: "6. Piltkompetanse og opplæring", keys: ["s6_pilotNavn","s6_pilotSertifikattype","s6_pilotSertifikatnummer","s6_siste_kurs","s6_kvalifikasjoner","s6_gjentakende","s6_treningslogg"] },
          { title: "7. Vedlikehold og teknisk styring", keys: ["s7_routine","s7_scheduled","s7_records"] },
          { title: "8. Forsikring og ansvar", keys: ["s8_forsikringsselskap","s8_polisenummer","s8_dekningsbeloep","s8_policyholder","s8_hendelsesrapportering"] },
          { title: "9. Datahåndtering", keys: ["s9_flightdata","s9_imagery","s9_gdpr"] },
          { title: "10. Journalføring og etterlevelse", keys: ["s10_records","s10_audit","s10_review"] },
          { title: "11. Værgrenser og driftsrammer", keys: ["s11_vind","s11_synbarhet","s11_temperatur","s11_dagslys","s11_saesonger"] },
          { title: "12. Nødkontaktinformasjon", keys: ["s12_kontaktperson","s12_kontakttelefon"] },
        ] as {title:string;keys:string[]}[]).map((sec) => (
          <div key={sec.title} className="manual-section" style={{marginBottom:24, pageBreakInside:"avoid"}}>
            <h2 style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", fontSize:"13pt", borderBottom:"2px solid #6858f8", paddingBottom:4, marginBottom:8}}>{sec.title}</h2>
            <p style={{fontFamily:"Montserrat", fontSize:"11pt", whiteSpace:"pre-wrap", lineHeight:1.6}}>{sec.keys.map(k => get(k)).filter(Boolean).join("\n")}</p>
          </div>
        ))}

        {/* Appendix A: Pre-flight checklist */}
        <div className="manual-section" style={{marginBottom:24, pageBreakBefore:"always"}}>
          <h2 style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", fontSize:"13pt", marginBottom:12}}>Vedlegg A: Pre-flight sjekkliste</h2>
          {[
            { group: "VÆR", items: ["Vindhastighet < 8 m/s", "Kast < 10 m/s", "Sikt > 5 km", "Ingen kraftig regn/tåke/snø", "Temperatur innenfor grenser", "Ingen isingsrisiko"] },
            { group: "STEDSSIKKERHET", items: ["Perimeter ryddet (100 m radius)", "Ingen uautoriserte tilskuere", "Take-off/landing-område klart", "Sikkerhetsflagg plassert", "Ingen dyreliv i fare"] },
            { group: "LUFTFARTØY", items: ["Ramme OK", "Alle 4 propeller OK", "Gimbal/kamera OK", "Antenner OK", "Batteri OK", "Landingsgir OK"] },
            { group: "FLYSYSTEM", items: ["RC-batteri > 50%", "3D GNSS-lås", "Kontrollkobling etablert", "Hjempunkt satt", "RTH-høyde satt", "Høydebegrensning satt", "Geofence aktivert", "Kompass kalibrert"] },
            { group: "CREW-BRIEFING", items: ["Oppdragsmål bekreftet", "Høyde og tid bekreftet", "Observatørposisjon og skannemønster", "Kommunikasjonsprotokoll", "Nødprosedyrer gjennomgått", "Pilot og observatør bekrefter klar"] },
            { group: "SLUTT KLARERING", items: ["Alle punkter sjekket", "Pilot bekrefter 'Klar for takeoff'", "Observatør bekrefter 'Roger, klar'"] },
          ].map(({ group, items }) => (
            <div key={group} style={{marginBottom:12}}>
              <p style={{fontFamily:"Poppins", fontWeight:700, fontSize:"10pt", color:"#6858f8", marginBottom:4}}>{group}</p>
              {items.map(item => (
                <div key={item} style={{display:"flex", gap:8, alignItems:"center", marginBottom:3}}>
                  <span style={{width:14, height:14, border:"1.5px solid #6858f8", borderRadius:2, display:"inline-block", flexShrink:0}} />
                  <span style={{fontFamily:"Montserrat", fontSize:"10pt"}}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Appendix B: Communication protocol */}
        <div className="manual-section" style={{marginBottom:24}}>
          <h2 style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", fontSize:"13pt", marginBottom:12}}>Vedlegg B: Kommunikasjonsprotokoll pilot–observatør</h2>
          {[
            ["Hvert 1–2 min (observatør)", "'Visuell på luftfartøy, ingen trafikk'"],
            ["Status (observatør)", "'Luftfartøy stabilt' / 'Luftfartøy drifter [retning]'"],
            ["Nødsituasjon (observatør)", "'Visuell tapt!'"],
            ["Trafikkvarsel (observatør)", "'Trafikk observert, [retning og høyde]'"],
            ["Avbryt (pilot eller observatør)", "'AVBRYT — lander NÅ'"],
            ["Respons (pilot)", "'Roger, starter nedstigng'"],
          ].map(([kontekst, frase]) => (
            <div key={kontekst} style={{display:"flex", gap:16, marginBottom:6, fontFamily:"Montserrat", fontSize:"10pt"}}>
              <span style={{minWidth:220, color:"#666"}}>{kontekst}:</span>
              <span style={{fontWeight:600}}>{frase}</span>
            </div>
          ))}
        </div>

        {/* Appendix C: Incident form */}
        <div className="manual-section" style={{pageBreakBefore:"always"}}>
          <h2 style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", fontSize:"13pt", marginBottom:12}}>Vedlegg C: Hendelsesrapportskjema</h2>
          {["Dato:", "Tid:", "Lokasjon:", "Luftfartøy (modell + serienr):", "Pilot:", "Observatør:"].map(label => (
            <div key={label} style={{marginBottom:10, fontFamily:"Montserrat", fontSize:"10pt"}}>
              <span style={{fontWeight:600}}>{label}</span>
              <div style={{borderBottom:"1px solid #ccc", marginTop:3, height:20}} />
            </div>
          ))}
          <div style={{marginBottom:10, fontFamily:"Montserrat", fontSize:"10pt"}}>
            <span style={{fontWeight:600}}>Type:</span>
            <div style={{display:"flex", gap:24, marginTop:6}}>
              {["Ulykke", "Hendelse", "Nesten-ulykke", "Mekanisk problem"].map(t => (
                <div key={t} style={{display:"flex", gap:6, alignItems:"center"}}>
                  <span style={{width:12, height:12, border:"1.5px solid #6858f8", borderRadius:2, display:"inline-block"}} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          {["Beskrivelse:", "Medvirkende faktorer:", "Umiddelbare tiltak:", "Korrigerende tiltak:"].map(label => (
            <div key={label} style={{marginBottom:16, fontFamily:"Montserrat", fontSize:"10pt"}}>
              <span style={{fontWeight:600}}>{label}</span>
              <div style={{borderBottom:"1px solid #ccc", marginTop:3, height:20}} />
              <div style={{borderBottom:"1px solid #ccc", marginTop:8, height:20}} />
              <div style={{borderBottom:"1px solid #ccc", marginTop:8, height:20}} />
            </div>
          ))}
          <div style={{display:"flex", gap:32, marginBottom:12, fontFamily:"Montserrat", fontSize:"10pt"}}>
            <span style={{fontWeight:600}}>Skader/skader:</span>
            {["Ingen", "Mindre", "Alvorlig"].map(t => (
              <div key={t} style={{display:"flex", gap:6, alignItems:"center"}}>
                <span style={{width:12, height:12, border:"1.5px solid #6858f8", borderRadius:2, display:"inline-block"}} />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex", gap:48, marginTop:24, fontFamily:"Montserrat", fontSize:"10pt"}}>
            <div style={{flex:1}}>
              <p style={{fontWeight:600}}>Rapporterende pilot:</p>
              <div style={{borderBottom:"1px solid #333", marginTop:20}} />
              <p style={{fontSize:"8pt", color:"#888", marginTop:2}}>Navn og signatur</p>
            </div>
            <div style={{flex:1}}>
              <p style={{fontWeight:600}}>Ansvarlig leder:</p>
              <div style={{borderBottom:"1px solid #333", marginTop:20}} />
              <p style={{fontSize:"8pt", color:"#888", marginTop:2}}>Navn og signatur</p>
            </div>
          </div>
        </div>

        {/* Sign-off */}
        <div style={{marginTop:32, borderTop:"2px solid #6858f8", paddingTop:16}}>
          <h2 style={{fontFamily:"Poppins", fontWeight:700, color:"#6858f8", fontSize:"12pt", marginBottom:12}}>Dokumentgodkjenning</h2>
          <div style={{fontFamily:"Montserrat", fontSize:"10pt", lineHeight:2}}>
            <p>Ansvarlig leder: {get("s1_ansvarligLederNavn") || "___________________________"}</p>
            <p>Stilling: {get("s1_ansvarligLederTittel") || "___________________________"}</p>
            <p>Dato: {today}</p>
            <p style={{marginTop:16}}>Signatur: ___________________________</p>
            <p style={{marginTop:8, fontSize:"9pt", color:"#666"}}>Autorisert av Luftfartstilsynet ved innsending og godkjenning.</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{textAlign:"center", fontSize:"8pt", color:"#9993c4", marginTop:32, fontFamily:"Montserrat", borderTop:"1px solid #e8e5f8", paddingTop:8}}>
          {selskapsnavn} | Operasjonsmanual v1.0 | {today} | Utarbeidet med Haiko AS — haiko.no
        </div>
      </div>
    </div>
  );
}
