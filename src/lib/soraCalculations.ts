// SORA 2.5 Calculation Engine — Based on ED Decision 2025/018/R, Amendment 3

export type OperationType = 'VLOS' | 'EVLOS' | 'BVLOS';
export type PopulationClass = 'controlled' | 'sparsely' | 'populated' | 'gathering';
export type SizeClass = 'S' | 'M' | 'L' | 'XL';
export type ArcLevel = 'ARC-a' | 'ARC-b' | 'ARC-c' | 'ARC-d';
export type SailRoman = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
export type RobustnessLevel = 'O' | 'L' | 'M' | 'H';
export type MitigationRobustness = 'none' | 'low' | 'medium' | 'high';

export interface SoraInputs {
  droneName: string;
  mtom: number;
  characteristicDimension: number;
  maxSpeed: number;
  operationType: OperationType;
  dayNight: 'day' | 'night' | 'both';
  maxAltitude: number;
  populationDensity: PopulationClass;
  // Ground risk mitigations (SORA 2.5 M1A/M1B/M1C/M2)
  m1a_sheltering: MitigationRobustness;
  m1b_restrictions: MitigationRobustness;
  m1c_ground_observers: boolean;
  m2_impact: MitigationRobustness;
  // Legacy compat
  m1: 0 | -1 | -2;
  m2: 0 | -1;
  // ARC inputs
  nearAirport: boolean;
  ctrDistanceKm: number;
  isUrbanArea: boolean;
  // Strategic air mitigations (MS1-MS5)
  ms1_segregation: MitigationRobustness;
  ms2_time_windows: boolean;
  ms3_visual_observers: MitigationRobustness;
  ms4_airspace_coord: boolean;
  ms5_boundaries: MitigationRobustness;
  // Legacy
  hasTransponder: boolean;
  hasAirspaceObservers: boolean;
  airspaceClass?: 'uncontrolled_low' | 'uncontrolled_high' | 'class_e' | 'controlled';
}

export interface SoraResults {
  sizeClass: SizeClass;
  intrinsicGrc: number;
  finalGrc: number;
  initialArc: ArcLevel;
  residualArc: ArcLevel;
  sail: number;
  sailRoman: SailRoman;
  scenario: string | null;
  airMitigationCount: number;
  groundMitigationTotal: number;
}

// ── Size class ──
export function getSizeClass(dim: number): SizeClass {
  if (dim < 1) return 'S';
  if (dim <= 3) return 'M';
  if (dim <= 8) return 'L';
  return 'XL';
}

// ── Intrinsic GRC (SORA 2.5 Table 1) ──
const GRC_TABLE: Record<SizeClass, Record<PopulationClass, number>> = {
  S:  { controlled: 1, sparsely: 2, populated: 3, gathering: 4 },
  M:  { controlled: 2, sparsely: 3, populated: 4, gathering: 5 },
  L:  { controlled: 3, sparsely: 4, populated: 5, gathering: 6 },
  XL: { controlled: 4, sparsely: 5, populated: 6, gathering: 7 },
};

export function calculateIntrinsicGrc(dim: number, pop: PopulationClass): number {
  const sizeClass = getSizeClass(dim);
  return GRC_TABLE[sizeClass][pop];
}

export function calculateFinalGrc(intrinsicGrc: number, m1: number, m2: number): number {
  return Math.max(1, Math.min(7, intrinsicGrc + m1 + m2));
}

// ── Ground mitigation reduction (SORA 2.5 M1A/M1B/M1C/M2) ──
export function calculateGroundMitigationReduction(
  m1a: MitigationRobustness,
  m1b: MitigationRobustness,
  m1c: boolean,
  m2: MitigationRobustness,
): number {
  const robMap: Record<MitigationRobustness, number> = { none: 0, low: 0, medium: 1, high: 2 };
  const m1aR = robMap[m1a];
  const m1bR = robMap[m1b];
  const m1cR = m1c ? 1 : 0; // Low robustness only
  const m2R = robMap[m2];
  return m1aR + m1bR + m1cR + m2R;
}

// ── Initial ARC (SORA 2.5 AMC S.4.4.2, Annex C) ──
const ARC_ORDER: ArcLevel[] = ['ARC-a', 'ARC-b', 'ARC-c', 'ARC-d'];

export function getInitialARC(
  altitudeAGL: number,
  operationType: OperationType,
  nearAirport: boolean,
  ctrDistanceKm: number = 10,
  isUrbanArea: boolean = false,
): ArcLevel {
  const effectiveDist = nearAirport ? Math.min(ctrDistanceKm, 5) : ctrDistanceKm;

  if (effectiveDist < 1) return 'ARC-d';
  if (effectiveDist < 3 || isUrbanArea || altitudeAGL > 300) return 'ARC-c';
  if (effectiveDist < 5 || altitudeAGL > 120) return 'ARC-b';

  // BVLOS minimum ARC-b
  if (operationType === 'BVLOS' || operationType === 'EVLOS') return 'ARC-b';

  return 'ARC-a';
}

// ── Strategic Air Mitigations (MS1-MS5, SORA 2.5 AMC S.4.4.3) ──
export function calculateStrategicAirMitigations(
  ms1: MitigationRobustness,
  ms2: boolean,
  ms3: MitigationRobustness,
  ms4: boolean,
  ms5: MitigationRobustness,
): number {
  let count = 0;
  if (ms1 === 'medium' || ms1 === 'high') count++;
  if (ms2) count++;
  if (ms3 === 'high') count++;
  if (ms4) count++;
  if (ms5 === 'medium' || ms5 === 'high') count++;
  return count;
}

export function calculateResidualArc(initialArc: ArcLevel, hasTransponder: boolean, hasObservers: boolean, isBvlos: boolean): ArcLevel {
  let idx = ARC_ORDER.indexOf(initialArc);
  if (hasTransponder && idx > 0) idx--;
  if (hasObservers && isBvlos && idx > 0) idx--;
  return ARC_ORDER[idx];
}

export function applyStrategicAirMitigations(initialArc: ArcLevel, mitigationCount: number): ArcLevel {
  let idx = ARC_ORDER.indexOf(initialArc);
  idx = Math.max(0, idx - mitigationCount);
  return ARC_ORDER[idx];
}

// ── SAIL matrix (SORA 2.5 Step 7, per-GRC-row, AMC Annex E) ──
const SAIL_MATRIX: Record<number, Record<ArcLevel, SailRoman>> = {
  1: { 'ARC-a': 'I',   'ARC-b': 'I',   'ARC-c': 'I',   'ARC-d': 'II' },
  2: { 'ARC-a': 'I',   'ARC-b': 'I',   'ARC-c': 'II',  'ARC-d': 'II' },
  3: { 'ARC-a': 'I',   'ARC-b': 'II',  'ARC-c': 'II',  'ARC-d': 'III' },
  4: { 'ARC-a': 'II',  'ARC-b': 'II',  'ARC-c': 'III', 'ARC-d': 'IV' },
  5: { 'ARC-a': 'II',  'ARC-b': 'III', 'ARC-c': 'III', 'ARC-d': 'V' },
  6: { 'ARC-a': 'III', 'ARC-b': 'IV',  'ARC-c': 'V',   'ARC-d': 'VI' },
  7: { 'ARC-a': 'IV',  'ARC-b': 'V',   'ARC-c': 'VI',  'ARC-d': 'VI' },
};

const ROMAN_TO_NUM: Record<SailRoman, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

export function calculateSail(finalGrc: number, residualArc: ArcLevel): SailRoman {
  const clampedGrc = Math.min(Math.max(finalGrc, 1), 7);
  return SAIL_MATRIX[clampedGrc][residualArc];
}

export function sailToNumber(roman: SailRoman): number {
  return ROMAN_TO_NUM[roman];
}

// ── Scenario matching ──
export function matchScenario(
  sailRoman: SailRoman,
  operationType: OperationType,
  mtom: number,
  cClass: string,
  populationClass: PopulationClass,
): string | null {
  const sail = sailToNumber(sailRoman);
  const hasCLabel = cClass.startsWith('C');

  if (mtom < 0.25 && sail === 1) return 'A1';
  if (mtom <= 4 && sail === 1 && operationType === 'VLOS') return 'A2';
  if (mtom <= 25 && sail <= 2 && operationType === 'VLOS' && populationClass === 'sparsely') return 'A3';

  if (hasCLabel && cClass === 'C5' && operationType === 'VLOS' && sail <= 3) return 'STS-01';
  if (hasCLabel && cClass === 'C6' && operationType === 'BVLOS' && sail <= 3) return 'STS-02';

  if (mtom <= 10 && operationType === 'VLOS' && populationClass === 'sparsely') return 'PDRA-G01';
  if (mtom <= 25 && operationType === 'VLOS' && populationClass === 'sparsely') return 'PDRA-G02';
  if (mtom <= 25 && operationType === 'BVLOS' && populationClass === 'controlled') return 'PDRA-G05';
  if (mtom <= 10 && operationType === 'VLOS' && populationClass === 'populated') return 'PDRA-S01';
  if (mtom <= 25 && operationType === 'BVLOS') return 'PDRA-S02';

  if (sail <= 4) return 'SORA-III-IV';
  return 'SORA-V-VI';
}

// ── Master calculation ──
export function calculateAll(inputs: SoraInputs): SoraResults {
  const sizeClass = getSizeClass(inputs.characteristicDimension);
  const intrinsicGrc = calculateIntrinsicGrc(inputs.characteristicDimension, inputs.populationDensity);

  // Ground mitigations
  const groundReduction = calculateGroundMitigationReduction(
    inputs.m1a_sheltering, inputs.m1b_restrictions,
    inputs.m1c_ground_observers, inputs.m2_impact,
  );
  const finalGrc = Math.max(1, Math.min(7, intrinsicGrc - groundReduction));

  // Air risk
  const initialArc = getInitialARC(inputs.maxAltitude, inputs.operationType, inputs.nearAirport, inputs.ctrDistanceKm, inputs.isUrbanArea);
  const airMitigationCount = calculateStrategicAirMitigations(
    inputs.ms1_segregation, inputs.ms2_time_windows,
    inputs.ms3_visual_observers, inputs.ms4_airspace_coord, inputs.ms5_boundaries,
  );
  const residualArc = applyStrategicAirMitigations(initialArc, airMitigationCount);

  const sailRoman = calculateSail(finalGrc, residualArc);
  const sail = sailToNumber(sailRoman);

  return {
    sizeClass,
    intrinsicGrc,
    finalGrc,
    initialArc,
    residualArc,
    sail,
    sailRoman,
    scenario: null,
    airMitigationCount,
    groundMitigationTotal: groundReduction,
  };
}

// ── OSO definitions (24 OSOs per SORA 2.5 AMC Annex E) ──
export interface OsoDefinition {
  id: number;
  description: string;
  robustness: RobustnessLevel[];
  template: string;
}

export const OSO_DEFINITIONS: OsoDefinition[] = [
  { id: 1, description: 'Operator competence proven', robustness: ['O','L','L','M','H','H'], template: 'Operatøren kan dokumentere kompetanse gjennom [sertifikater, tidligere operasjoner, treningsprogram]. Ansvarlig leder er [navn].' },
  { id: 2, description: 'UAS manufactured to design standards', robustness: ['O','O','L','M','H','H'], template: 'Dronen [dronenavn] er produsert av [produsent] og oppfyller gjeldende produksjonsstandarder. Dokumentasjon foreligger fra produsent.' },
  { id: 3, description: 'UAS maintained to manufacturer requirements', robustness: ['O','L','M','M','H','H'], template: 'Vedlikehold gjennomføres i henhold til [produsentens] vedlikeholdsmanual. Vedlikeholdslogg oppbevares av teknisk ansvarlig [navn] og er tilgjengelig for inspeksjon.' },
  { id: 4, description: 'UAS designed with system safety and reliability', robustness: ['O','O','L','M','H','H'], template: 'Dronen er designet med redundante systemer for [liste relevante systemer, f.eks. propellsikring, failsafe-funksjon, RTH]. Systemsikkerheten er dokumentert i teknisk datablad.' },
  { id: 5, description: 'Human factors — operator manages operational conditions', robustness: ['O','L','L','M','H','H'], template: 'Operatøren har prosedyrer for å identifisere og håndtere kritiske operative forhold, inkludert vind over [X] m/s, nedbør, redusert sikt og forstyrrelser i GPS-signal.' },
  { id: 6, description: 'Remote pilot competent and current', robustness: ['O','L','M','M','H','H'], template: 'Fjernpilot [navn] innehar [sertifikattype] og har gjennomført [X] flytimer på aktuelt system. Currency-krav: minimum [X] timer per [periode]. Dokumentasjon oppbevares av ansvarlig leder.' },
  { id: 7, description: 'Remote pilot uses external support services', robustness: ['O','O','L','L','M','H'], template: 'Piloten innhenter NOTAM, MET-melding og luftromsstatus før hver operasjon via [Nixon/Avinor/annen tjeneste]. Tjenestene er beskrevet i operasjonsmanualen kapittel [X].' },
  { id: 8, description: 'UAS can be operated without prohibited manoeuvres', robustness: ['O','L','L','M','H','H'], template: 'Dronen er konfigurert slik at forbudte manøvrer er sperret i flykontrolleren. Maks hastighet er satt til [X] m/s. Operasjonsvolumet er definert og håndheves via geofencing der mulig.' },
  { id: 9, description: 'Remote pilot is aware and able to manage critical environmental conditions', robustness: ['O','L','L','M','H','H'], template: 'Piloten er opplært til å identifisere og håndtere kritiske miljøforhold. Operasjonen avbrytes ved vind over [X] m/s, sikt under [X] meter eller andre avvik fra forhåndsdefinerte akseptkriterier.' },
  { id: 10, description: 'Procedures in place for non-nominal situations', robustness: ['L','L','M','M','H','H'], template: 'Prosedyrer for ikke-nominelle situasjoner er beskrevet i operasjonsmanualen. Dette inkluderer mistet forbindelse, lav batteri, teknisk feil og inntrengning i operasjonsvolumet av uvedkommende.' },
  { id: 11, description: 'Operational procedures are defined, validated and followed', robustness: ['L','L','M','M','H','H'], template: 'Operasjonelle prosedyrer er dokumentert i operasjonsmanualen, validert gjennom [test/øvelse], og gjennomgås med alle piloter før operasjonsstart. Avvik fra prosedyrer rapporteres til ansvarlig leder.' },
  { id: 12, description: 'The remote crew is fit to operate', robustness: ['O','L','L','M','H','H'], template: 'Alle piloter og involvert personell gjennomgår helsesjekk og er kjent med kravene til egnethet. Piloten vurderer egen tilstand før hver operasjon og rapporterer dersom vedkommende ikke er operativ.' },
  { id: 13, description: 'Operational procedures include actions in case of a deterioration of external support services', robustness: ['O','O','L','M','M','H'], template: 'Dersom [ATC / Nixon / kommunikasjonstjeneste] svikter, avbrytes operasjonen umiddelbart og dronen returnerer til startsted. Prosedyren er beskrevet i operasjonsmanualen kapittel [X].' },
  { id: 14, description: 'An Emergency Response Plan (ERP) is in place', robustness: ['L','L','M','M','H','H'], template: 'Beredskapsplan (ERP) er utarbeidet og dekker: mistet forbindelse, ukontrollert flyving, personskade, brann og nødlanding. Varslingskjede: [navn/tlf]. ERP er kjent av alt operativt personell.' },
  { id: 15, description: 'A ground risk buffer is defined and used', robustness: ['O','L','L','M','H','H'], template: 'Bakkerisikobuffer (GRB) er definert til [X] meter rundt operasjonsvolumet. Bufferen er beregnet basert på dronevekt, hastighet og reaksjonstid. Ingen uvedkommende tillates innenfor bufferen under flygning.' },
  { id: 16, description: 'The UAS avoids flight over uncontrolled ground areas', robustness: ['O','O','L','M','H','H'], template: 'Operasjonen er planlagt over [kontrollert / tynt befolket] bakkeområde. Tiltak for å unngå overflygning av uvedkommende: [beskriv konkrete tiltak, f.eks. sikkerhetsvakter, sperring av område].' },
  { id: 17, description: 'The remote pilot has sufficient information about the UAS performance', robustness: ['O','L','L','M','H','H'], template: 'Piloten er informert om dronesystemets ytelse og begrensninger gjennom [opplæring / produsentdokumentasjon]. Operasjonen er planlagt innenfor systemets dokumenterte ytelsesenveloppe.' },
  { id: 18, description: 'UAS is designed to handle system failures', robustness: ['O','O','L','M','H','H'], template: 'Dronen er utstyrt med [failsafe-funksjon / RTH / redundant strømsystem]. Systemfeil håndteres automatisk ved [beskriv]. Prosedyrer for manuell overtakelse er dokumentert i OM.' },
  { id: 19, description: 'Safe recovery from human error', robustness: ['O','O','L','L','M','H'], template: 'Piloten er opplært i menneskelige faktorer og feilhåndtering. Sjekklister brukes for alle faser av operasjonen. Kritiske handlinger krever bekreftelse fra [second observer / checklist item].' },
  { id: 20, description: 'The UAS is equipped to detect and avoid other aircraft', robustness: ['O','O','O','L','M','H'], template: 'Dronen er utstyrt med [ADS-B / transponder / remote ID] for luftromsovervåkning. Piloten bruker [Nixon / annen tjeneste] for sanntids luftromsbildet under operasjonen.' },
  { id: 21, description: 'Air risk is mitigated through operational measures', robustness: ['O','O','L','L','M','H'], template: 'Luftrisiko er redusert gjennom operasjonelle tiltak: [NOTAM koordinering / flytid begrenset til lawtrafikkperioder / kommunikasjon med ATC på frekvens X].' },
  { id: 22, description: 'Detect and avoid performance', robustness: ['O','O','O','L','M','H'], template: 'Detect-and-avoid er ivaretatt gjennom [visuell observasjon av pilot / luftromsobservatører / teknisk DAA-system]. Observatørplassering og kommunikasjonsprosedyre er beskrevet i OM kapittel [X].' },
  { id: 23, description: 'The remote pilot has sufficient situational awareness', robustness: ['O','L','M','M','H','H'], template: 'Piloten opprettholder situasjonsbevissthet gjennom [GCS-display / video-feed / kommunikasjon med observatør]. Operasjonen avbrytes dersom situasjonsbevisstheten ikke er tilstrekkelig.' },
  { id: 24, description: 'UAS design accounts for safety of third parties', robustness: ['O','O','L','M','H','H'], template: 'Dronen er designet for å minimere skade på tredjepart ved havari gjennom [frangibel konstruksjon / parachute / lav kinetisk energi ved impact]. Dokumentasjon fra produsent foreligger.' },
];

export function getOsoRobustness(oso: OsoDefinition, sail: number): RobustnessLevel {
  const idx = Math.max(0, Math.min(5, sail - 1));
  return oso.robustness[idx];
}

export const OSO_GROUPS = [
  { name: 'Operatørkompetanse (OSO 1–5)', osos: [1, 2, 3, 4, 5] },
  { name: 'Pilotkompetanse (OSO 6–8)', osos: [6, 7, 8] },
  { name: 'UAS luftdyktighet (OSO 9–12)', osos: [9, 10, 11, 12] },
  { name: 'Sikker operasjon (OSO 13–16)', osos: [13, 14, 15, 16] },
];

// ── Containment requirements (SORA 2.5 Annex E criterion 3) ──
export interface ContainmentSpec {
  groundTech: string;
  vertical: string;
  lateral: string;
  evidenceLevel: string;
}

export function getContainmentRequirements(sail: number): ContainmentSpec {
  if (sail <= 2) return {
    groundTech: 'Standardprosedyre',
    vertical: 'Høydebegrensning i flykontroller',
    lateral: 'Bakkerisikobuffer (GRB)',
    evidenceLevel: 'Operatørattest',
  };
  if (sail <= 3) return {
    groundTech: 'Fallskjerm ELLER trent mannskap',
    vertical: 'Dobbel høydebegrensning',
    lateral: '1.5× buffer',
    evidenceLevel: 'Prosedyre + testdata',
  };
  return {
    groundTech: 'Sertifisert fallskjerm',
    vertical: 'Sertifisert dobbel begrensning',
    lateral: '2× buffer + overvåkning',
    evidenceLevel: 'EASA DVR-dokumentasjon',
  };
}

// Legacy aliases
export function sailToRoman(sail: number): string {
  const map: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' };
  return map[sail] || String(sail);
}

export function calculateInitialArc(airspaceClass: string): ArcLevel {
  const map: Record<string, ArcLevel> = {
    uncontrolled_low: 'ARC-a',
    uncontrolled_high: 'ARC-b',
    class_e: 'ARC-c',
    controlled: 'ARC-d',
  };
  return map[airspaceClass] || 'ARC-a';
}

export function getGroupRobustness(sail: number): { name: string; level: string }[] {
  if (sail <= 2) return OSO_GROUPS.map(g => ({ name: g.name, level: 'Lav' }));
  if (sail <= 4) return OSO_GROUPS.map(g => ({ name: g.name, level: 'Middels' }));
  return OSO_GROUPS.map(g => ({ name: g.name, level: 'Høy' }));
}
