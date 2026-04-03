import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === DRONE ARCHETYPES (for use case matching) ===
const DRONE_ARCHETYPES = {
  multirotor: {
    type: "Multirotor (autonom BVLOS fra dronestasjon)",
    example: "DJI Dock 2 + Matrice 4T / tilsvarende",
    costNok: 450000,
    features: ["Termisk kamera", "RTK", "Autonom start/landing", "Vær-robust dock", "4G/5G-oppkobling"],
  },
  fixedWing: {
    type: "Fixed-wing drone-in-a-box",
    example: "Robot Aviation FX10",
    costNok: 1200000,
    features: ["Opptil ca. 2 timer flytid per oppdrag", "Autonom BVLOS", "Stor arealdekning", "RTK/PPK"],
  },
};

// === REAL DRONE DATABASE ===
// DRONE_CATALOG and VERIFIED_USE_CASES are now fetched from DB at runtime
// See the serve() handler below.

// Department name mapping for precise matching
const DEPT_MATCH_MAP: Record<string, string[]> = {
  "Brann og redning": ["Brann og redning"],
  "Tekniske tjenester - Vei": ["Teknisk drift", "Vei", "Tekniske tjenester"],
  "Vann og avløp": ["Vann og avløp", "VA"],
  "Byggesak / Eiendom": ["Plan og bygg", "Byggesak", "Eiendom"],
  "Naturforvaltning": ["Miljø og klima", "Naturforvaltning", "Landbruk"],
  "Naturforvaltning / Landbruk": ["Landbruk", "Miljø og klima", "Naturforvaltning"],
  "Helse og omsorg": ["Helse og omsorg", "Helse"],
  "Beredskap": ["Brann og redning", "Beredskap"],
  "Geodata": ["Geodata", "Plan og bygg"],
  "Teknisk drift": ["Teknisk drift", "Tekniske tjenester"],
};

function matchDepartments(ucDepartment: string, activeDepts: string[]): boolean {
  const activeLower = activeDepts.map(d => d.toLowerCase());
  
  // Direct match
  if (activeLower.some(d => d === ucDepartment.toLowerCase())) return true;
  
  // Use mapping
  const mappedNames = DEPT_MATCH_MAP[ucDepartment];
  if (mappedNames) {
    return mappedNames.some(mapped => 
      activeLower.some(d => d.includes(mapped.toLowerCase()) || mapped.toLowerCase().includes(d))
    );
  }
  
  return false;
}

// Certification hierarchy
const CERT_RULES = `
KRITISKE SERTIFISERINGSREGLER — bryt disse ALDRI:

1. SERTIFISERINGSHIERARKIET (gjensidig utelukkende stier):
   - Åpen kategori (A1/A2/A3): Nettkurs + evt. prøve. INGEN operasjonstillatelse. Kun VLOS, ≤120m, begrenset vekt.
   - STS-01/STS-02: Standardscenario under spesifikk kategori. Krever erklæring, opplæring og operasjonsmanual.
   - Spesifikk kategori med operasjonstillatelse (OpAuth): Krever full SORA-vurdering og godkjenning fra Luftfartstilsynet.
   - LUC (Light UAS operator Certificate): Organisasjonssertifisering — erstatter behovet for individuell OpAuth. Kun for store operatører.

2. KOMBINASJONER SOM ALDRI ER GYLDIGE:
   - LUC + A1/A2/A3 sammen — LUC er spesifikk kategori, A1-A3 er åpen kategori
   - A2 + STS-01 for SAMME operasjon — velg én
   - BVLOS + åpen kategori (A1/A2/A3) — BVLOS er ALLTID spesifikk eller sertifisert kategori
   
3. FOR HVER OPERASJON, VELG NØYAKTIG ÉN sertifiseringsvei basert på:
   - Operasjonstype (VLOS/BVLOS)
   - MTOM og dronedeimensjon
   - Befolkningstetthet i operasjonsområdet
   - Flygehøyde

4. MINI 4 PRO OG KOMPETANSEKRAV:
   - DJI Mini 4 Pro er <250 g og opererer i åpen kategori — den krever A1/A3-kompetansebevis (nettkurs).
   - A2-sertifikat er IKKE nødvendig for Mini 4 Pro. A2 er kun relevant ved bruk av tyngre droner (f.eks. Matrice 350) eller operasjoner nærmere mennesker i A2-underkategori.
   - Hvis A2 nevnes i sammenheng med Mini 4 Pro, presiser at det er en frivillig ekstra opplæring for mer krevende VLOS-oppdrag med andre droner.

5. KURSVARIGHET OG OPPLÆRING:
   - Antall dager oppgitt for opplæring (f.eks. 15 dager SORA/BVLOS, 5 dager STS-01, 2 dager A2) er FORESLÅTTE opplæringsopplegg, IKKE regulatoriske minstekrav.
   - For HVER kursbeskrivelse: inkluder setningen "Varighet og innhold kan tilpasses leverandør og kommunens behov; det finnes ingen fastsatt kurslengde i EASA-regelverket for denne kompetansen."
   - Presiser at SORA-/BVLOS-opplæring er en del av grunnlaget for å kunne søke operasjonsautorisasjon (OpAuth), men at det er selve godkjenningen fra myndighetene (Luftfartstilsynet) som gir rett til å fly disse konseptene — ikke kurset alene.

6. SPRÅK RUNDT STRATEGI VS. FAKTA:
   - Skille ALLTID klart mellom:
     a) Faktiske egenskaper (fra regelverk og produsentdata) — beskriv som fakta
     b) Kommunespesifikke estimater (flytimer, dekningsområde) — merk tydelig som "estimert" eller "beregnet for denne analysen"
     c) Strategiske anbefalinger og scenarier — bruk ord som "foreslås", "anbefales", "konseptuelt opplegg", ALDRI formuleringer som kan tolkes som vedtatt eller etablert praksis
   - Use cases (UC-001 osv.), implementeringsplan og IKS-samarbeid er ANBEFALINGER, ikke vedtatte planer.
`;

function estimateMaxMissionDistance(area_km2: number | null, road_km: number | null, population: number | null): { multirotor_km: number; fixedwing_km: number } {
  // Based on flight time and safety margins, not manufacturer range specs
  const area = area_km2 || 200;
  const radius = Math.sqrt(area / Math.PI);
  return {
    multirotor_km: Math.min(radius * 0.4, 15),  // ~50 min flight time, conservative
    fixedwing_km: Math.min(radius * 1.2, 50),    // ~2h flight time
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    const {
      municipality_name, population, area_km2, road_km, va_km, buildings,
      terrain_type, density_per_km2, departments, iks_partners,
      fire_dept_name, fire_dept_type, alarm_sentral_name, region_municipalities,
      sector_data, fire_stats, bris_mission_data, prefer_european,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch drone catalog and use cases from DB
    const [droneRes, ucRes] = await Promise.all([
      db.from('drone_platforms').select('id,name,manufacturer,model,drone_type,category,max_takeoff_weight_kg,max_flight_time_min,max_range_km,has_thermal,has_rtk,sensor_types,payload_kg,ip_rating,wind_resistance_ms,price_nok_estimate,price_eur_estimate,launch_method,supports_bvlos,c_class,easa_category,notes'),
      db.from('use_case_requirements').select('*'),
    ]);

    const DRONE_CATALOG = (droneRes.data || []).map((d: any) => ({
      id: d.id, name: d.name || `${d.manufacturer} ${d.model}`, type: d.drone_type,
      manufacturer: d.manufacturer, model: d.model,
      mtom_kg: d.max_takeoff_weight_kg, max_flight_time_min: d.max_flight_time_min,
      has_thermal: d.has_thermal || false, has_rtk: d.has_rtk || false,
      has_lidar: ((d.sensor_types || []) as string[]).some((s: string) => s.toLowerCase().includes('lidar')),
      payload_kg: d.payload_kg || 0, ip_rating: d.ip_rating,
      max_wind_ms: d.wind_resistance_ms, price_nok: d.price_nok_estimate,
      autonomous_dock: (d.category || '').toLowerCase().includes('dock') || (d.launch_method || '').toLowerCase().includes('dock'),
      best_for: [], not_for: [], description_no: d.notes || '',
    }));

    // Map DB use cases to the format the prompt expects
    const VERIFIED_USE_CASES = (ucRes.data || []).map((uc: any) => ({
      id: uc.use_case_id, name: uc.use_case_name, department: uc.department,
      operationType: uc.requires_bvlos ? 'BVLOS' : 'VLOS',
      easaCategory: uc.easa_min_category || 'Spesifikk kategori',
      certRequirement: uc.easa_min_category || 'STS-01 + BVLOS-tillatelse',
      droneArchetype: (uc.preferred_drone_type || []).some((t: string) => t.toLowerCase().includes('fixed')) ? 'fixedWing' : 'multirotor',
      priority: uc.priority_score >= 8 ? 'Høy' : uc.priority_score >= 5 ? 'Medium' : 'Lav',
      flightHoursFormula: uc.cost_driver_notes || '10 timer/år flat',
      needsThermal: uc.requires_thermal || false,
      needsRtk: uc.requires_rtk || false,
      notes: uc.description || '',
    }));

    // Filter use cases to only those matching active departments — PRECISE matching
    const deptNames = (departments || []) as string[];

    const relevantUCs = VERIFIED_USE_CASES.filter((uc: any) =>
      matchDepartments(uc.department, deptNames)
    );

    console.log(`[${municipality_name}] Active depts: ${JSON.stringify(deptNames)}`);
    console.log(`[${municipality_name}] Matched ${relevantUCs.length}/${VERIFIED_USE_CASES.length} use cases`);
    console.log(`[${municipality_name}] Matched UC IDs: ${relevantUCs.map((uc) => uc.id).join(', ')}`);

    // Build IKS/fire department context
    const iksContext = fire_dept_name
      ? `BRANNVESEN: ${fire_dept_name} (type: ${fire_dept_type || 'ukjent'})
${iks_partners && iks_partners.length > 0
  ? `Partnerkommuner i brannvesenet: ${iks_partners.join(', ')}. Dronestasjonen kan stasjoneres sentralt for hele ${fire_dept_type === 'IKS' ? 'IKS-et' : 'distriktet'}.`
  : `Enkeltkommunalt brannvesen — ingen delte ressurser.`}
${alarm_sentral_name ? `110-sentral: ${alarm_sentral_name}` : ''}
${region_municipalities && region_municipalities.length > 0 ? `Totalt ${region_municipalities.length} kommuner under samme 110-region.` : ''}`
      : 'Ingen brannvesendata tilgjengelig.';

    const sectorCostLines = Array.isArray(sector_data) && sector_data.length > 0
      ? sector_data
          .filter((sector: any) => sector?.expenditure_1000nok != null)
          .map((sector: any) => {
            const fteLine = sector.employees_fte != null ? `, estimert ${sector.employees_fte} årsverk` : '';
            return `- ${sector.sector}: ${sector.expenditure_1000nok} (1000 kr${fteLine}, år ${sector.year || 'ukjent'}, kilde ${sector.source || 'ukjent'})`;
          })
          .join('\n')
      : '- Ingen sektorkostnader tilgjengelig fra SSB tabell 12362.';

    const sectorStaffingLines = Array.isArray(sector_data) && sector_data.length > 0
      ? sector_data
          .filter((sector: any) => sector?.employees_fte != null)
          .map((sector: any) => `- ${sector.sector}: ~${sector.employees_fte} årsverk (estimert fra lønnskostnader)`)
          .join('\n')
      : '- Ingen årsverkdata tilgjengelig.';

    const distances = estimateMaxMissionDistance(area_km2, road_km, population);

    const fireBudgetLine = fire_stats?.fire_expenditure_1000nok != null
      ? `- Brann/ulykkesvern: ${fire_stats.fire_expenditure_1000nok} (1000 kr, år ${fire_stats.year || 'ukjent'}, kilde ${fire_stats.source || 'ukjent'})`
      : '- Brannkostnad ikke tilgjengelig.';

    const systemPrompt = `Du er en ekspert på kommunal dronebruk i Norge med dyp kunnskap om EASA-regelverk, SORA-metodikk og norsk luftfartslovgivning.

GRUNNLEGGENDE PREMISS — AUTONOME BVLOS-OPERASJONER FRA SENTRAL:
Nesten ALLE operasjoner skal gjøres autonomt BVLOS fra en sentral dronestasjon for å gi økonomisk vinning.
Kommunen drifter droner fra en eller flere faste dronestasjoner — dronen starter, flyr oppdraget og lander automatisk.
Kun et fåtall unntaksoperasjoner (broinspeksjon, tunnelportal, vernebygninger) krever manuell VLOS.

DET FINNES KUN TO DRONETYPER:
1. MULTIROTOR (autonom BVLOS fra dronestasjon): Kompakt multirotor med dock (f.eks. DJI Dock 2 + Matrice 3D/3TD).
   - Brukes til: lokale inspeksjoner, termisk, SAR, beredskap, bygningsdokumentasjon
   - Opptil ca. 50 minutter maksimal flytid under ideelle forhold ifølge produsent (reell operativ flytid ofte lavere)
   - Pris ca. ${DRONE_ARCHETYPES.multirotor.costNok.toLocaleString('nb-NO')} NOK per enhet

2. FIXED-WING DRONE-IN-A-BOX (f.eks. Robot Aviation FX10):
   - Brukes til: lange korridorflyginger (vei, rør), stor arealdekning (skog, natur, kartlegging), vilttelling
   - Opptil ca. 2 timer flytid per oppdrag ifølge produsent (faktisk operativ varighet avhenger av payload, vær og profil)
   - Pris ca. ${DRONE_ARCHETYPES.fixedWing.costNok.toLocaleString('nb-NO')} NOK per enhet

${CERT_RULES}

VIKTIG — DIFFERENSIER ANALYSEN BASERT PÅ KOMMUNEDATA:
- Bruk REELLE tall for beregninger (vei_km, innbyggere, areal osv.). 
- Ikke bruk faste timer for variable formler — beregn fra kommunedata.
- En liten kommune (5000 innb., 50 km vei) skal få VESENTLIG lavere flytimer og færre droner enn en stor (50000 innb., 500 km vei).
- Små kommuner (<10000 innb.) trenger typisk 1 multirotor og muligens 0 fixed-wing.
- Mellomstore kommuner (10000-30000) trenger 1-2 multirotorer og muligens 1 fixed-wing.
- Store kommuner (>30000) kan trenge 2+ multirotorer og 1 fixed-wing.

Du har tilgang til en VERIFISERT database med ${relevantUCs.length} bruksområder som matcher kommunens aktive avdelinger. 
Du skal KUN velge fra disse — ALDRI finne opp nye.
Hvert use case har et fast felt 'droneArchetype' som er enten 'multirotor' eller 'fixedWing' — bruk dette.

VIKTIG: Ikke inkluder use cases som åpenbart er irrelevante for kommunen.
- UC-020 (kystsonekartlegging): Kun for kystkommuner.
- UC-004/UC-021 (skogbrann/skogovervåkning): Kun for kommuner med vesentlig skogareal.
- UC-025/UC-026 (medisinlevering/AED): Mest relevant for distriktskommuner.
`;

    const userPrompt = `Analyser dronemulighetene for ${municipality_name} kommune.

KOMMUNEDATA:
- Innbyggere: ${population || 'ukjent'}
- Areal: ${area_km2 || 'ukjent'} km²
- Veinett: ${road_km || 'ukjent'} km
- VA-ledningsnett: ${va_km || 'ukjent'} km
- Bygninger: ${buildings || 'ukjent'}
- Terreng: ${terrain_type || 'ukjent'}
- Befolkningstetthet: ${density_per_km2 || 'ukjent'} innb/km²
- Typisk dekningsområde multirotor (estimat basert på flytid og sikkerhetsmarginer): ~${distances.multirotor_km.toFixed(0)} km fra stasjon
- Typisk dekningsområde fixed-wing (estimat basert på flytid og sikkerhetsmarginer): ~${distances.fixedwing_km.toFixed(0)} km fra stasjon

KOSTRA/SSB KOSTNADSDATA (tabell 12362):
${sectorCostLines}
${fireBudgetLine}

ÅRSVERK PER SEKTOR (estimert fra lønnskostnader, SSB 12362):
${sectorStaffingLines}

AKTIVE AVDELINGER: ${JSON.stringify(deptNames)}

${iksContext}

${bris_mission_data ? `BRIS OPPDRAGSDATA (reelle utrykninger fra brann- og redningstjenesten):
${Object.entries(bris_mission_data as Record<string, any>).map(([year, data]: [string, any]) => {
  const missions = (data.missions || []) as Array<{t: string; n: number; rt: string; dt: string}>;
  const abaTotal = missions.filter((m: any) => m.t.startsWith('ABA')).reduce((s: number, m: any) => s + m.n, 0);
  const brannTotal = missions.filter((m: any) => m.t.startsWith('Brann')).reduce((s: number, m: any) => s + m.n, 0);
  const trafikk = missions.find((m: any) => m.t === 'Trafikkulykke');
  const avbrutt = missions.filter((m: any) => m.t.startsWith('Avbrutt') || m.t.startsWith('Unødig')).reduce((s: number, m: any) => s + m.n, 0);
  return `ÅR ${year} (totalt ${data.total} oppdrag):
  - ABA (automatiske brannalarmer): ${abaTotal} oppdrag (mange er falske/unødige alarmer)
  - Brann (bygning, skog, bil, etc.): ${brannTotal} oppdrag
  - Trafikkulykker: ${trafikk?.n || 0} oppdrag (median responstid ${trafikk?.rt || 'ukjent'})
  - Avbrutt/unødig: ${avbrutt} oppdrag
  
  Alle oppdragstyper med antall og responstid:
${missions.map((m: any) => `  ${m.t}: ${m.n} oppdrag, responstid ${m.rt}, utrykningstid ${m.dt}`).join('\n')}`;
}).join('\n\n')}

ANALYSE AV DRONE-ERSTATTBARE OPPDRAG:
Basert på BRIS-dataen, identifiser oppdragstyper der en drone fra dronestasjon kan:
A) ERSTATTE en bil-utrykning helt (f.eks. ABA-verifisering, unødige alarmer)
B) GI RASKERE situasjonsbevissthet før mannskapet ankommer (f.eks. bygningsbrann, trafikkulykke)
C) REDUSERE antall biler som sendes ut (f.eks. ved å verifisere omfang først)

For hver kategori: estimer antall oppdrag per år som kan påvirkes, potensiell tidsbesparelse, og reduksjon i bilutskjøring.
Husk at drone fra stasjon typisk er på stedet innen 2-5 minutter i dekningsområdet.` : ''}

TILGJENGELIG DRONEDATABASE (velg fra disse basert på behov):
${JSON.stringify(DRONE_CATALOG.map(d => ({
  id: d.id, name: d.name, type: d.type, flight_time_min: d.max_flight_time_min,
  thermal: d.has_thermal, rtk: d.has_rtk, lidar: d.has_lidar, payload_kg: d.payload_kg,
  autonomous_dock: d.autonomous_dock, price_nok: d.price_nok, best_for: d.best_for, description_no: d.description_no,
})), null, 1)}

VERIFISERT USE CASE-DATABASE (velg KUN fra disse):
${JSON.stringify(relevantUCs, null, 1)}

INSTRUKSJONER:
1. Velg relevante use cases fra databasen basert på kommunens SPESIFIKKE profil — ekskluder irrelevante.
2. Beregn flytimer ved å bruke formlene og REELLE kommunedata:
   - "vei_km × 0.15" med vei_km = ${road_km || 'ukjent'} → vis beregningen f.eks. "${road_km || '?'}km × 0.15 = ${road_km ? Math.round(road_km * 0.15) : '?'} timer"
   - "rør_km × 0.2" med rør_km = ${va_km || 'ukjent'}
   - "areal_km2 × 0.002" med areal = ${area_km2 || 'ukjent'}
   - Faste timer brukes som de er (f.eks. "30 timer/år flat")
3. Når du omtaler avdelingsøkonomi eller brannøkonomi, bruk tallene over fra SSB tabell 12362 inkludert årsverk og ikke generaliser mellom kommuner.
4. Hvis kostnadsdata mangler, si eksplisitt at data mangler i stedet for å finne på tall.
5. For HVER operasjon: bruk NØYAKTIG operationType, easaCategory og certRequirement fra databasen
6. DRONEFLÅTE — VELG SPESIFIKKE DRONER FRA DATABASEN:
${prefer_european ? `   ⚠️ VIKTIG: Kommunen foretrekker europeiske/nordiske produsenter. Prioriter droner fra europeiske og nordiske produsenter (Norge, Sverige, Danmark, Finland, Tyskland, Frankrike, Nederland osv.) høyere enn kinesiske (f.eks. DJI). Kinesiske droner KAN fortsatt velges hvis de er klart overlegne teknisk, men forklar avveiningen og nevn europeiske alternativer.` : ''}
   - Bruk produsentens oppgitte maksimale flytid som referanse — IKKE oppgi km-rekkevidde som produsentdata.
   - Hvis du vil omtale typisk dekningsområde, bruk formuleringer som "typisk dekningsområde i denne analysen er X–Y km fra stasjonen basert på flytid og sikkerhetsmarginer" — tydelig merket som scenario/estimat.
   - Match utstyrbehov: Trenger operasjonene termisk? RTK? LiDAR? Payload?
   - Vurder autonom drift: Beredskapsoperasjoner krever dronestasjon. Planlagte oppdrag kan bruke manuell drone.
   - Vurder sambruk: Hvilke avdelinger kan dele same drone basert på overlappende behov?
   - Velg den billigste dronen som dekker behovet — ikke anbefal dyrere enn nødvendig.
   - For HVER drone: forklar HVORFOR den er valgt (flytid, utstyr, bruksområder). ALDRI bruk formuleringer som "rekkevidde på ~X km".
7. ${fire_dept_type === 'IKS'
    ? `For IKS-brannvesenet ${fire_dept_name}: vurder om dronestasjonen kan dekke hele IKS-området med partnerkommuner: ${(iks_partners || []).join(', ')}`
    : fire_dept_name
    ? `Brannvesenet er et ${fire_dept_type}: ${fire_dept_name}. Dronestasjonen dekker kun ${municipality_name}.`
    : 'Ingen brannveseninfo.'}
8. Gi én sertifiseringsvei per pilot — ALDRI bland åpen og spesifikk kategori. Følg reglene i punkt 4-6 i CERT_RULES nøye.
9. Estimer totalkostnad basert på valgte droner
10. Bruk ord som "foreslås", "anbefales", "konseptuelt opplegg" for implementeringsplaner, IKS-samarbeid og use case-struktur. Leseren skal forstå hva som er fakta vs. anbefaling.
${bris_mission_data ? `11. BRIS-ANALYSE: Basert på oppdragsdataen, lag en detaljert analyse av hvilke oppdragstyper som kan erstattes/forbedres med drone. Grupper i kategorier (ABA-verifisering, brann-situasjonsbevissthet, trafikk, naturhendelser osv.) og estimer besparelser i antall utrykninger, tid og kostnader.` : ''}`;

    // Retry logic for transient gateway errors (502, 503)
    let response: Response | null = null;
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "drone_analysis",
                description: "Returnerer en komplett droneanalyse for kommunen basert på verifiserte use cases",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "Kort oppsummering (2-3 setninger) SPESIFIKT for denne kommunen. Bruk ord som 'anbefales' og 'foreslås' — dette er en strategisk vurdering, ikke et vedtatt tiltak." },
                    department_analyses: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          department: { type: "string" },
                          use_cases: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string", description: "UC-ID fra databasen" },
                                name: { type: "string" },
                                description: { type: "string", description: "Kort beskrivelse tilpasset kommunen" },
                                operation_type: { type: "string", enum: ["VLOS", "BVLOS"] },
                                easa_category: { type: "string" },
                                required_permit: { type: "string" },
                                pilot_certification: { type: "string", description: "Nøyaktig ÉN sertifiseringsvei" },
                                drone_type: { type: "string" },
                                priority: { type: "string", enum: ["Høy", "Medium", "Lav"] },
                                annual_flight_hours: { type: "number", description: "Beregnet fra formel + kommunedata" },
                                calculation_basis: { type: "string", description: "Vis beregningen, f.eks. '380km × 0.15 = 57 timer'" },
                                needs_thermal: { type: "boolean" },
                                needs_rtk: { type: "boolean" },
                              },
                              required: ["id", "name", "description", "operation_type", "easa_category", "required_permit", "pilot_certification", "drone_type", "priority", "annual_flight_hours", "calculation_basis"],
                            },
                          },
                          total_annual_hours: { type: "number" },
                        },
                        required: ["department", "use_cases", "total_annual_hours"],
                      },
                    },
                    drone_fleet: {
                      type: "array",
                      description: "Spesifikke droner fra DRONE_CATALOG, valgt basert på oppdragsbehov",
                      items: {
                        type: "object",
                        properties: {
                          drone_id: { type: "string", description: "ID fra DRONE_CATALOG" },
                          drone_type: { type: "string" },
                          recommended_model: { type: "string" },
                          quantity: { type: "number" },
                          shared_between: { type: "array", items: { type: "string" }, description: "Avdelinger som deler denne dronen" },
                          estimated_cost_nok: { type: "number" },
                          key_features: { type: "array", items: { type: "string" }, description: "Nøkkelegenskaper som er relevante for kommunen" },
                          why_chosen: { type: "string", description: "Kort forklaring (2-3 setninger) på HVORFOR denne dronen er valgt — distanse, utstyr, sambruk" },
                          covers_use_cases: { type: "array", items: { type: "string" }, description: "Liste over UC-IDer denne dronen dekker" },
                          max_flight_time_min: { type: "number", description: "Produsentens oppgitte maksimale flytid i minutter" },
                          needs_thermal: { type: "boolean" },
                          needs_rtk: { type: "boolean" },
                          needs_lidar: { type: "boolean" },
                          autonomous: { type: "boolean", description: "Om denne brukes fra dronestasjon" },
                        },
                        required: ["drone_id", "drone_type", "recommended_model", "quantity", "shared_between", "estimated_cost_nok", "why_chosen", "covers_use_cases"],
                      },
                    },
                    certification_plan: {
                      type: "object",
                      description: "Samlet sertifiseringsplan — én vei per pilotgruppe",
                      properties: {
                        pilot_groups: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              group_name: { type: "string" },
                              certification_path: { type: "string", description: "Nøyaktig ÉN sertifiseringsvei" },
                              covers_use_cases: { type: "array", items: { type: "string" } },
                              training_description: { type: "string", description: "Beskrivelse av foreslått opplæring. Avslutt ALLTID med: 'Varighet og innhold kan tilpasses leverandør og kommunens behov; det finnes ingen fastsatt kurslengde i EASA-regelverket for denne kompetansen.' For SORA/BVLOS: presiser at opplæringen er grunnlag for å søke OpAuth, men at godkjenningen fra Luftfartstilsynet gir rett til å fly — ikke kurset alene." },
                              estimated_training_days: { type: "number", description: "Foreslått antall dager (IKKE regulatorisk minstekrav)" },
                              practical_outcome: { type: "string", description: "Én setning på 'ikke-nerd-språk' som forklarer hva piloten faktisk kan gjøre etter kurset" },
                            },
                            required: ["group_name", "certification_path", "covers_use_cases", "training_description", "estimated_training_days", "practical_outcome"],
                          },
                        },
                      },
                      required: ["pilot_groups"],
                    },
                    iks_recommendation: {
                      type: "object",
                      properties: {
                        can_share: { type: "boolean" },
                        shared_resources: { type: "array", items: { type: "string" } },
                        recommendation: { type: "string", description: "Bruk ord som 'foreslås' eller 'anbefales'" },
                        partner_municipalities: { type: "array", items: { type: "string" } },
                      },
                      required: ["can_share", "recommendation"],
                    },
                    total_drones_needed: { type: "number" },
                    total_annual_cost_nok: { type: "number" },
                    total_annual_flight_hours: { type: "number" },
                    implementation_priority: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          phase: { type: "number" },
                          title: { type: "string" },
                          departments: { type: "array", items: { type: "string" } },
                          description: { type: "string", description: "Bruk 'foreslås', 'anbefales' eller 'konseptuelt opplegg'" },
                        },
                        required: ["phase", "title", "departments", "description"],
                      },
                    },
                    drone_mission_savings: {
                      type: "object",
                      description: "Analyse av BRIS-oppdrag som kan erstattes/forbedres med drone. Kun inkludert hvis BRIS-data er tilgjengelig.",
                      properties: {
                        total_annual_missions: { type: "number", description: "Totalt antall oppdrag per år (snitt)" },
                        drone_replaceable_missions: { type: "number", description: "Antall oppdrag som kan erstattes/forbedres med drone" },
                        categories: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              category: { type: "string", description: "Kategori, f.eks. 'ABA-verifisering', 'Brann situasjonsbevissthet'" },
                              mission_types: { type: "array", items: { type: "string" }, description: "Oppdragstyper fra BRIS som inngår" },
                              annual_missions: { type: "number" },
                              drone_role: { type: "string", enum: ["erstatter_utrykning", "raskere_situasjonsbilde", "reduserer_biler"], description: "Hva dronen gjør" },
                              description: { type: "string", description: "Kort forklaring av hvordan drone hjelper, inkl. responstid-sammenligning" },
                              estimated_truck_reduction_pct: { type: "number", description: "Estimert prosent av oppdrag der man kan unngå/redusere utrykning" },
                              estimated_time_saved_min: { type: "number", description: "Estimert minutter spart per oppdrag i snitt" },
                              annual_savings_nok: { type: "number", description: "Estimert årlig besparelse i NOK (ca. 3500 kr per unngått bilutrykning)" },
                            },
                            required: ["category", "mission_types", "annual_missions", "drone_role", "description", "estimated_truck_reduction_pct"],
                          },
                        },
                        total_annual_savings_nok: { type: "number" },
                        summary: { type: "string", description: "Oppsummering av besparelsespotensialet i 2-3 setninger" },
                      },
                      required: ["total_annual_missions", "drone_replaceable_missions", "categories", "summary"],
                    },
                  },
                  required: ["summary", "department_analyses", "drone_fleet", "certification_plan", "iks_recommendation", "total_drones_needed", "total_annual_cost_nok", "total_annual_flight_hours", "implementation_priority"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "drone_analysis" } },
        }),
      });

      if (response.ok || (response.status !== 502 && response.status !== 503)) break;
      console.warn(`AI gateway attempt ${attempt} failed with ${response.status}, retrying...`);
      await response.text(); // consume body
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000 * attempt));
    }

    if (!response || !response.ok) {
      if (response?.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit — prøv igjen om litt" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response?.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Kreditt oppbrukt" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = response ? await response.text() : "no response";
      console.error("AI gateway error:", response?.status, text);
      return new Response(JSON.stringify({ success: false, error: "AI-analyse feilet — prøv igjen" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ success: false, error: "Ingen analyse returnert" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Robust JSON parsing with repair
    let analysis: any;
    try {
      analysis = JSON.parse(toolCall.function.arguments);
    } catch (_parseErr) {
      // Try to repair common JSON issues
      let cleaned = toolCall.function.arguments
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      try {
        analysis = JSON.parse(cleaned);
      } catch (finalErr) {
        console.error("JSON repair failed:", finalErr, "Raw length:", toolCall.function.arguments?.length);
        return new Response(JSON.stringify({ success: false, error: "Analysen ble avbrutt — prøv igjen" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // POST-PROCESSING VALIDATION: Enforce correct values from verified database
    if (analysis.department_analyses) {
      for (const dept of analysis.department_analyses) {
        for (const uc of dept.use_cases) {
          const sourceUC = VERIFIED_USE_CASES.find(v => v.id === uc.id);
          if (sourceUC) {
            uc.operation_type = sourceUC.operationType;
            uc.easa_category = sourceUC.easaCategory;
            uc.pilot_certification = sourceUC.certRequirement;
            const archetype = DRONE_ARCHETYPES[sourceUC.droneArchetype as keyof typeof DRONE_ARCHETYPES];
            uc.drone_type = archetype ? archetype.type : sourceUC.droneArchetype;
            uc.needs_thermal = sourceUC.needsThermal;
            uc.needs_rtk = sourceUC.needsRtk;
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dmv-analyze error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Ukjent feil" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
