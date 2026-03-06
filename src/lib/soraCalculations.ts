// SORA 2.5 Calculation Engine

export interface SoraInputs {
  droneName: string;
  mtom: number;
  characteristicDimension: number;
  operationType: 'VLOS' | 'EVLOS' | 'BVLOS';
  dayNight: 'day' | 'night' | 'both';
  maxAltitude: number;
  populationDensity: 'controlled' | 'sparsely' | 'populated' | 'gathering';
  // GRC mitigations
  m1: 0 | -1 | -2;
  m2: 0 | -1;
  // ARC
  airspaceClass: 'uncontrolled_low' | 'uncontrolled_high' | 'class_e' | 'controlled';
  hasTransponder: boolean;
  hasAirspaceObservers: boolean;
}

export interface SoraResults {
  intrinsicGrc: number;
  finalGrc: number;
  initialArc: string;
  residualArc: string;
  sail: number;
  sailRoman: string;
}

// GRC matrix: [controlled, sparsely, populated, gathering]
// Rows by characteristic dimension
const GRC_MATRIX: Record<string, number[]> = {
  'lt1': [1, 2, 3, 4],
  '1to3': [2, 3, 4, 5],
  '3to8': [3, 4, 5, 6],
  'gt8': [4, 5, 6, 7],
};

function getDimensionClass(dim: number): string {
  if (dim < 1) return 'lt1';
  if (dim <= 3) return '1to3';
  if (dim <= 8) return '3to8';
  return 'gt8';
}

const POP_INDEX: Record<string, number> = {
  controlled: 0,
  sparsely: 1,
  populated: 2,
  gathering: 3,
};

const ARC_MAP: Record<string, string> = {
  uncontrolled_low: 'ARC-a',
  uncontrolled_high: 'ARC-b',
  class_e: 'ARC-c',
  controlled: 'ARC-d',
};

const ARC_ORDER = ['ARC-a', 'ARC-b', 'ARC-c', 'ARC-d'];

// SAIL matrix: finalGrc rows × ARC cols
// ARC-a, ARC-b, ARC-c, ARC-d
const SAIL_MATRIX: Record<string, number[]> = {
  'lte2': [1, 1, 2, 4],
  '3to4': [2, 2, 4, 5],
  '5to6': [3, 4, 5, 6],
  'gte7': [4, 5, 6, 6],
};

function getGrcBracket(grc: number): string {
  if (grc <= 2) return 'lte2';
  if (grc <= 4) return '3to4';
  if (grc <= 6) return '5to6';
  return 'gte7';
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export function calculateIntrinsicGrc(dim: number, pop: string): number {
  const dimClass = getDimensionClass(dim);
  const popIdx = POP_INDEX[pop] ?? 0;
  return GRC_MATRIX[dimClass][popIdx];
}

export function calculateFinalGrc(intrinsicGrc: number, m1: number, m2: number): number {
  return Math.max(1, intrinsicGrc + m1 + m2); // m1, m2 are negative
}

export function calculateInitialArc(airspaceClass: string): string {
  return ARC_MAP[airspaceClass] || 'ARC-a';
}

export function calculateResidualArc(initialArc: string, hasTransponder: boolean, hasObservers: boolean, isBvlos: boolean): string {
  let idx = ARC_ORDER.indexOf(initialArc);
  if (hasTransponder && idx > 0) idx--;
  if (hasObservers && isBvlos && idx > 0) idx--;
  return ARC_ORDER[idx];
}

export function calculateSail(finalGrc: number, residualArc: string): number {
  const bracket = getGrcBracket(finalGrc);
  const arcIdx = ARC_ORDER.indexOf(residualArc);
  return SAIL_MATRIX[bracket][arcIdx];
}

export function sailToRoman(sail: number): string {
  return ROMAN[sail] || String(sail);
}

export function calculateAll(inputs: SoraInputs): SoraResults {
  const intrinsicGrc = calculateIntrinsicGrc(inputs.characteristicDimension, inputs.populationDensity);
  const finalGrc = calculateFinalGrc(intrinsicGrc, inputs.m1, inputs.m2);
  const initialArc = calculateInitialArc(inputs.airspaceClass);
  const residualArc = calculateResidualArc(initialArc, inputs.hasTransponder, inputs.hasAirspaceObservers, inputs.operationType === 'BVLOS');
  const sail = calculateSail(finalGrc, residualArc);
  return {
    intrinsicGrc,
    finalGrc,
    initialArc,
    residualArc,
    sail,
    sailRoman: sailToRoman(sail),
  };
}

// OSO robustness matrix per SAIL level
// O = not applicable, L = low, M = medium, H = high
export type RobustnessLevel = 'O' | 'L' | 'M' | 'H';

export interface OsoDefinition {
  id: number;
  description: string;
  robustness: RobustnessLevel[]; // indexed by SAIL 1-6
  template: string;
}

export const OSO_DEFINITIONS: OsoDefinition[] = [
  { id: 1, description: 'Operator competence proven', robustness: ['O','L','L','M','H','H'], template: 'Operatøren kan dokumentere kompetanse gjennom [sertifikater, tidligere operasjoner, treningsprogram]. Ansvarlig leder er [navn].' },
  { id: 2, description: 'UAS manufactured to design standards', robustness: ['O','O','L','M','H','H'], template: 'Dronen [dronenavn] er produsert av [produsent] og oppfyller gjeldende produksjonsstandarder. Dokumentasjon foreligger fra produsent.' },
  { id: 3, description: 'UAS maintained to manufacturer requirements', robustness: ['O','L','M','M','H','H'], template: 'Vedlikehold gjennomføres i henhold til [produsentens] vedlikeholdsmanual. Vedlikeholdslogg oppbevares av teknisk ansvarlig [navn] og er tilgjengelig for inspeksjon.' },
  { id: 4, description: 'UAS designed with system safety and reliability', robustness: ['O','O','L','M','H','H'], template: 'Dronen er designet med redundante systemer for [liste relevante systemer, f.eks. propellsikring, failsafe-funksjon, RTH]. Systemsikkerheten er dokumentert i teknisk datablad.' },
  { id: 5, description: 'Human factors — operator manages operational conditions', robustness: ['O','L','L','M','H','H'], template: 'Operatøren har prosedyrer for å identifisere og håndtere kritiske operative forhold, inkludert vind over [X] m/s, nedbør, redusert sikt og forstyrrelser i GPS-signal.' },
  { id: 6, description: 'Remote pilot competent and current', robustness: ['O','L','M','M','H','H'], template: 'Fjernpilot [navn] innehar [sertifikattype] og har gjennomført [X] flytimer på aktuelt system. Currency-krav: minimum [X] timer per [periode]. Dokumentasjon oppbevares av ansvarlig leder.' },
  { id: 7, description: 'Remote pilot uses external support services', robustness: ['O','O','L','L','M','H'], template: 'Piloten innhenter NOTAM, MET-melding og luftromsstatus før hver operasjon via [Ninox/Avinor/annen tjeneste]. Tjenestene er beskrevet i operasjonsmanualen kapittel [X].' },
  { id: 8, description: 'UAS can be operated without prohibited manoeuvres', robustness: ['O','L','L','M','H','H'], template: 'Dronen er konfigurert slik at forbudte manøvrer er sperret i flykontrolleren. Maks hastighet er satt til [X] m/s. Operasjonsvolumet er definert og håndheves via geofencing der mulig.' },
  { id: 9, description: 'Remote pilot is aware and able to manage critical environmental conditions', robustness: ['O','L','L','M','H','H'], template: 'Piloten er opplært til å identifisere og håndtere kritiske miljøforhold. Operasjonen avbrytes ved vind over [X] m/s, sikt under [X] meter eller andre avvik fra forhåndsdefinerte akseptkriterier.' },
  { id: 10, description: 'Procedures in place for non-nominal situations', robustness: ['L','L','M','M','H','H'], template: 'Prosedyrer for ikke-nominelle situasjoner er beskrevet i operasjonsmanualen. Dette inkluderer mistet forbindelse, lav batteri, teknisk feil og inntrengning i operasjonsvolumet av uvedkommende.' },
  { id: 11, description: 'Operational procedures are defined, validated and followed', robustness: ['L','L','M','M','H','H'], template: 'Operasjonelle prosedyrer er dokumentert i operasjonsmanualen, validert gjennom [test/øvelse], og gjennomgås med alle piloter før operasjonsstart. Avvik fra prosedyrer rapporteres til ansvarlig leder.' },
  { id: 12, description: 'The remote crew is fit to operate', robustness: ['O','L','L','M','H','H'], template: 'Alle piloter og involvert personell gjennomgår helsesjekk og er kjent med kravene til egnethet. Piloten vurderer egen tilstand før hver operasjon og rapporterer dersom vedkommende ikke er operativ.' },
  { id: 13, description: 'Operational procedures include actions in case of a deterioration of external support services', robustness: ['O','O','L','M','M','H'], template: 'Dersom [ATC / Ninox / kommunikasjonstjeneste] svikter, avbrytes operasjonen umiddelbart og dronen returnerer til startsted. Prosedyren er beskrevet i operasjonsmanualen kapittel [X].' },
  { id: 14, description: 'An Emergency Response Plan (ERP) is in place', robustness: ['L','L','M','M','H','H'], template: 'Beredskapsplan (ERP) er utarbeidet og dekker: mistet forbindelse, ukontrollert flyving, personskade, brann og nødlanding. Varslingskjede: [navn/tlf]. ERP er kjent av alt operativt personell.' },
  { id: 15, description: 'A ground risk buffer is defined and used', robustness: ['O','L','L','M','H','H'], template: 'Bakkerisikobuffer (GRB) er definert til [X] meter rundt operasjonsvolumet. Bufferen er beregnet basert på dronevekt, hastighet og reaksjonstid. Ingen uvedkommende tillates innenfor bufferen under flygning.' },
  { id: 16, description: 'The UAS avoids flight over uncontrolled ground areas', robustness: ['O','O','L','M','H','H'], template: 'Operasjonen er planlagt over [kontrollert / tynt befolket] bakkeområde. Tiltak for å unngå overflygning av uvedkommende: [beskriv konkrete tiltak, f.eks. sikkerhetsvakter, sperring av område].' },
  { id: 17, description: 'The remote pilot has sufficient information about the UAS performance', robustness: ['O','L','L','M','H','H'], template: 'Piloten er informert om dronesystemets ytelse og begrensninger gjennom [opplæring / produsentdokumentasjon]. Operasjonen er planlagt innenfor systemets dokumenterte ytelsesenveloppe.' },
  { id: 18, description: 'UAS is designed to handle system failures', robustness: ['O','O','L','M','H','H'], template: 'Dronen er utstyrt med [failsafe-funksjon / RTH / redundant strømsystem]. Systemfeil håndteres automatisk ved [beskriv]. Prosedyrer for manuell overtakelse er dokumentert i OM.' },
  { id: 19, description: 'Safe recovery from human error', robustness: ['O','O','L','L','M','H'], template: 'Piloten er opplært i menneskelige faktorer og feilhåndtering. Sjekklister brukes for alle faser av operasjonen. Kritiske handlinger krever bekreftelse fra [second observer / checklist item].' },
  { id: 20, description: 'The UAS is equipped to detect and avoid other aircraft', robustness: ['O','O','O','L','M','H'], template: 'Dronen er utstyrt med [ADS-B / transponder / remote ID] for luftromsovervåkning. Piloten bruker [Ninox / annen tjeneste] for sanntids luftromsbildet under operasjonen.' },
  { id: 21, description: 'Air risk is mitigated through operational measures', robustness: ['O','O','L','L','M','H'], template: 'Luftrisiko er redusert gjennom operasjonelle tiltak: [NOTAM koordinering / flytid begrenset til lawtrafikkperioder / kommunikasjon med ATC på frekvens X].' },
  { id: 22, description: 'Detect and avoid performance', robustness: ['O','O','O','L','M','H'], template: 'Detect-and-avoid er ivaretatt gjennom [visuell observasjon av pilot / luftromsobservatører / teknisk DAA-system]. Observatørplassering og kommunikasjonsprosedyre er beskrevet i OM kapittel [X].' },
  { id: 23, description: 'The remote pilot has sufficient situational awareness', robustness: ['O','L','M','M','H','H'], template: 'Piloten opprettholder situasjonsbevissthet gjennom [GCS-display / video-feed / kommunikasjon med observatør]. Operasjonen avbrytes dersom situasjonsbevisstheten ikke er tilstrekkelig.' },
  { id: 24, description: 'UAS design accounts for safety of third parties', robustness: ['O','O','L','M','H','H'], template: 'Dronen er designet for å minimere skade på tredjepart ved havari gjennom [frangibel konstruksjon / parachute / lav kinetisk energi ved impact]. Dokumentasjon fra produsent foreligger.' },
];

export function getOsoRobustness(oso: OsoDefinition, sail: number): RobustnessLevel {
  const idx = Math.max(0, Math.min(5, sail - 1));
  return oso.robustness[idx];
}

// OSO Groups for Step 4 summary
export const OSO_GROUPS = [
  { name: 'Operatørkompetanse (OSO 1–5)', osos: [1, 2, 3, 4, 5] },
  { name: 'Pilotkompetanse (OSO 6–8)', osos: [6, 7, 8] },
  { name: 'UAS luftdyktighet (OSO 9–12)', osos: [9, 10, 11, 12] },
  { name: 'Sikker operasjon (OSO 13–16)', osos: [13, 14, 15, 16] },
];

export function getGroupRobustness(sail: number): { name: string; level: string }[] {
  if (sail <= 2) return OSO_GROUPS.map(g => ({ name: g.name, level: 'Lav' }));
  if (sail <= 4) return OSO_GROUPS.map(g => ({ name: g.name, level: 'Middels' }));
  return OSO_GROUPS.map(g => ({ name: g.name, level: 'Høy' }));
}
