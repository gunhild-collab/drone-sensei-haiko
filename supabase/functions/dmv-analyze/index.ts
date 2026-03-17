import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
// Used for specific hardware recommendations based on mission requirements
const DRONE_CATALOG = [
  { id: 'dji-dock-2-m4t', name: 'DJI Dock 2 + Matrice 3D/3TD', type: 'Multirotor med dronestasjon', manufacturer: 'DJI', mtom_kg: 3.7, max_flight_time_min: 50, has_thermal: true, has_rtk: true, has_lidar: false, payload_kg: 0, ip_rating: 'IP55', max_wind_ms: 12, price_nok: 450000, autonomous_dock: true, best_for: ['Beredskap/brann', 'Termisk inspeksjon', 'SAR', 'Bygningsinspeksjon', 'Situasjonsbevissthet'], not_for: ['Lang rekkevidde', 'Stor arealdekning'], description_no: 'Kompakt dronestasjon med Matrice 3D/3TD. Automatisk start, oppdrag og landing. Termisk + visuelt kamera. Opptil ca. 50 minutter maksimal flytid under ideelle forhold ifølge produsent — reell operativ flytid er ofte lavere pga. vind, temperatur og payload.' },
  { id: 'dji-dock-2-m4e', name: 'DJI Dock 2 + Matrice 3E', type: 'Multirotor med dronestasjon', manufacturer: 'DJI', mtom_kg: 3.7, max_flight_time_min: 50, has_thermal: false, has_rtk: true, has_lidar: false, payload_kg: 0, ip_rating: 'IP55', max_wind_ms: 12, price_nok: 380000, autonomous_dock: true, best_for: ['Kartlegging', 'Bygningsdokumentasjon', 'Plan og regulering', 'Fremdriftskontroll'], not_for: ['Termisk inspeksjon', 'SAR', 'Beredskap'], description_no: 'Samme dock-plattform uten termisk kamera. Lavere pris. Opptil ca. 50 minutter maksimal flytid under ideelle forhold ifølge produsent. Egnet for planlagt kartlegging og dokumentasjon.' },
  { id: 'dji-m350-rtk-l2', name: 'DJI Matrice 350 RTK + Zenmuse L2', type: 'Multirotor (manuell/planlagt)', manufacturer: 'DJI', mtom_kg: 6.47, max_flight_time_min: 50, has_thermal: true, has_rtk: true, has_lidar: true, payload_kg: 2.7, ip_rating: 'IP55', max_wind_ms: 15, price_nok: 350000, autonomous_dock: false, best_for: ['LiDAR-kartlegging', 'Detaljert 3D-modellering', 'Broinspeksjon', 'Kulturminnedokumentasjon'], not_for: ['Autonom beredskap', 'Lang rekkevidde'], description_no: 'Kraftig multirotor med LiDAR og termisk. Opptil ca. 50 minutter flytid ifølge produsent. Brukes manuelt av pilot for detaljerte oppdrag som bro- og bygningsinspeksjon, 3D-punktsky.' },
  { id: 'dji-m30t', name: 'DJI Matrice 30T', type: 'Multirotor (feltdrone)', manufacturer: 'DJI', mtom_kg: 3.77, max_flight_time_min: 48, has_thermal: true, has_rtk: false, has_lidar: false, payload_kg: 0, ip_rating: 'IP55', max_wind_ms: 15, price_nok: 180000, autonomous_dock: false, best_for: ['Feltberedskap', 'SAR', 'Termisk lekkasjedeteksjon', 'Rask innsats'], not_for: ['Autonom drift', 'Kartlegging'], description_no: 'Robust feltdrone med zoom + termisk + laser-rangefinder. Opptil ca. 48 minutter flytid ifølge produsent. Enkel å transportere. Backup for beredskap.' },
  { id: 'robot-aviation-fx10', name: 'Robot Aviation FX10', type: 'Fixed-wing drone-in-a-box', manufacturer: 'Robot Aviation', mtom_kg: 12, max_flight_time_min: 120, has_thermal: true, has_rtk: true, has_lidar: false, payload_kg: 2, ip_rating: 'IP54', max_wind_ms: 18, price_nok: 1200000, autonomous_dock: true, best_for: ['Veiinspeksjon', 'Rørtrasé', 'Skogbrannpatrulje', 'Arealdekkende kartlegging', 'Vilttelling', 'Kystsonekartlegging'], not_for: ['Lokal inspeksjon', 'Bygningsinspeksjon'], description_no: 'Autonom fixed-wing. Opptil ca. 2 timer flytid per oppdrag ifølge produsent — faktisk operativ varighet avhenger av payload, vær og flyprofil. Tar av og lander fra kompakt stasjon. Perfekt for lange korridorer og stor arealdekning.' },
  { id: 'wingtra-one-gen-ii', name: 'WingtraOne GEN II', type: 'VTOL fixed-wing (manuell)', manufacturer: 'Wingtra', mtom_kg: 3.7, max_flight_time_min: 42, has_thermal: false, has_rtk: true, has_lidar: false, payload_kg: 0, ip_rating: 'IP43', max_wind_ms: 12, price_nok: 280000, autonomous_dock: false, best_for: ['Fotogrammetri', 'Ortofoto', 'Storskala kartlegging', 'Landbruk'], not_for: ['Beredskap', 'Termisk'], description_no: 'VTOL fixed-wing for presis kartlegging. Opptil ca. 42 minutter flytid ifølge produsent. Vertikal start/landing. Brukes manuelt av pilot.' },
  { id: 'sensefly-ebee-x', name: 'senseFly eBee X', type: 'Fixed-wing (manuell)', manufacturer: 'senseFly', mtom_kg: 1.6, max_flight_time_min: 24, has_thermal: false, has_rtk: true, has_lidar: false, payload_kg: 0, ip_rating: 'IP43', max_wind_ms: 12, price_nok: 220000, autonomous_dock: false, best_for: ['Kartlegging', 'Jordbruk', 'Ortofoto'], not_for: ['Beredskap', 'Termisk', 'Tung payload'], description_no: 'Lett fixed-wing for mellomstore kartleggingsområder. Opptil ca. 24 minutter flytid ifølge produsent. Enkel håndkast-start.' },
  { id: 'skydio-x10', name: 'Skydio X10', type: 'Multirotor (autonom)', manufacturer: 'Skydio', mtom_kg: 1.5, max_flight_time_min: 50, has_thermal: true, has_rtk: false, has_lidar: false, payload_kg: 0, ip_rating: 'IP55', max_wind_ms: 12, price_nok: 150000, autonomous_dock: true, best_for: ['Autonom inspeksjon', 'Byggeinspeksjon', 'Hindernavigasjon'], not_for: ['Lang rekkevidde', 'Kartlegging'], description_no: 'Selvflyvende drone med AI-hindernavigasjon. Opptil ca. 50 minutter flytid ifølge produsent. Kan fly rundt strukturer autonomt.' },
  { id: 'dji-mini-4-pro', name: 'DJI Mini 4 Pro', type: 'Mikrodrone (åpen kategori)', manufacturer: 'DJI', mtom_kg: 0.249, max_flight_time_min: 34, has_thermal: false, has_rtk: false, has_lidar: false, payload_kg: 0, ip_rating: null, max_wind_ms: 10, price_nok: 12000, autonomous_dock: false, best_for: ['Enkel dokumentasjon', 'Opplæring', 'Kultur/turisme'], not_for: ['Beredskap', 'Profesjonell inspeksjon', 'BVLOS'], description_no: 'Under 250g — krever kun A1-sertifikat (nettkurs). Opptil 34 minutter maksimal flytid med standard batteri ifølge produsent. Perfekt som opplæringsdrone og for enkel dokumentasjon.' },
];

// Estimate max required distance (A→B→A) based on municipality data
function estimateMaxMissionDistance(area_km2: number | null, road_km: number | null, population: number | null): { multirotor_km: number; fixedwing_km: number } {
  const area = area_km2 || 100;
  const radius = Math.sqrt(area / Math.PI); // km from center to edge
  return {
    multirotor_km: Math.min(radius * 0.8, 15), // realistic multirotor round-trip
    fixedwing_km: Math.min(radius * 1.5, 80),   // fixed-wing corridor
  };
}

// Verified use case database
const VERIFIED_USE_CASES = [
  { id: "UC-001", name: "Situasjonsbevissthet ved bygningsbrann", department: "Brann og redning", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "30 timer/år flat", needsThermal: true, needsRtk: false, notes: "Autonom utsending fra stasjon ved alarm. Termisk kamera kritisk." },
  { id: "UC-002", name: "Søk og redning i terreng", department: "Brann og redning", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "50 timer/år flat", needsThermal: true, needsRtk: false, notes: "Autonom utsending ved SAR-alarm." },
  { id: "UC-003", name: "Søk og redning ved flom og vann", department: "Brann og redning", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "20 timer/år flat", needsThermal: true, needsRtk: false, notes: "Over vann, redusert GRC." },
  { id: "UC-004", name: "Skogbrann - tidlig varsling og patruljering", department: "Brann og redning", operationType: "BVLOS", easaCategory: "Spesifikk kategori + OpAuth", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "fixedWing", priority: "Medium", flightHoursFormula: "15 timer/år flat", needsThermal: true, needsRtk: false, notes: "Fixed-wing for stor arealdekning i brannsesong. Kun relevant for kommuner med skog >30%." },
  { id: "UC-005", name: "Skadedokumentasjon etter hendelse", department: "Brann og redning", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Lav", flightHoursFormula: "10 timer/år flat", needsThermal: false, needsRtk: false, notes: "Autonom dokumentasjonsflyging over skadeområde." },
  { id: "UC-006", name: "Veibane- og dekkeinspeksjon", department: "Tekniske tjenester - Vei", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "fixedWing", priority: "Høy", flightHoursFormula: "vei_km × 0.15 timer/år", needsThermal: false, needsRtk: true, notes: "Fixed-wing for lange korridorflyginger langs veinett." },
  { id: "UC-007", name: "Broinspeksjon - dekke og underside", department: "Tekniske tjenester - Vei", operationType: "VLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "antall_broer × 1.5 timer/år", needsThermal: false, needsRtk: false, notes: "Unntak: VLOS nødvendig for nær-inspeksjon under bro." },
  { id: "UC-008", name: "Veimerkingsdokumentasjon", department: "Tekniske tjenester - Vei", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "fixedWing", priority: "Lav", flightHoursFormula: "vei_km × 0.05 timer/år", needsThermal: false, needsRtk: true, notes: "Kan samkjøres med UC-006 i samme misjon." },
  { id: "UC-009", name: "Vei- og føreforhold vinter", department: "Tekniske tjenester - Vei", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Medium", flightHoursFormula: "10 timer/år sesongbasert", needsThermal: true, needsRtk: false, notes: "Autonom patruljering av veistrekninger vinterstid." },
  { id: "UC-010", name: "Tunnelinngang og portalinspeksjon", department: "Tekniske tjenester - Vei", operationType: "VLOS", easaCategory: "Åpen A2", certRequirement: "A2", droneArchetype: "multirotor", priority: "Medium", flightHoursFormula: "antall_tunneler × 0.5 timer/år", needsThermal: false, needsRtk: false, notes: "Unntak: VLOS for nær-inspeksjon av portal. Manuell operasjon." },
  { id: "UC-011", name: "Rørtrasé inspeksjon", department: "Vann og avløp", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "rør_km × 0.2 timer/år", needsThermal: true, needsRtk: false, notes: "Termisk for lekkasjedeteksjon. Autonom patruljering langs trasé." },
  { id: "UC-012", name: "Reservoar og damovervåkning", department: "Vann og avløp", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Medium", flightHoursFormula: "antall_reservoar × 3 timer/år", needsThermal: false, needsRtk: false, notes: "Autonom inspeksjon av damkrone og reservoarnivå." },
  { id: "UC-013", name: "Flom og overvannkartlegging", department: "Vann og avløp", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "10 timer/år flat", needsThermal: false, needsRtk: true, notes: "Digital høydemodell for overvannsanalyse." },
  { id: "UC-014", name: "Termisk lekkasjedeteksjon nedgravd rør", department: "Vann og avløp", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "rør_km × 0.1 timer/år", needsThermal: true, needsRtk: false, notes: "Autonom termisk skanning av fjernvarme/varmtvannsrør." },
  { id: "UC-015", name: "Tak- og fasadedokumentasjon kommunale bygg", department: "Byggesak / Eiendom", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "antall_kommunale_bygg × 0.5 timer/år", needsThermal: false, needsRtk: false, notes: "Autonom rute over kommunale bygg for takdokumentasjon." },
  { id: "UC-016", name: "Byggesakskontroll og fremdrift", department: "Byggesak / Eiendom", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Medium", flightHoursFormula: "antall_aktive_byggeprosjekter × 2 timer/år", needsThermal: false, needsRtk: false, notes: "Planlagt autonom flyging over byggetomter." },
  { id: "UC-017", name: "Plan og regulering - dokumentasjon", department: "Byggesak / Eiendom", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Medium", flightHoursFormula: "antall_planprosesser × 3 timer/år", needsThermal: false, needsRtk: true, notes: "Ortofoto/3D-punktsky for planprosesser." },
  { id: "UC-018", name: "Kulturminne og vernebygning dokumentasjon", department: "Byggesak / Eiendom", operationType: "VLOS", easaCategory: "Åpen A2", certRequirement: "A2", droneArchetype: "multirotor", priority: "Lav", flightHoursFormula: "antall_verneobjekter × 1 timer/år", needsThermal: false, needsRtk: false, notes: "Unntak: VLOS for detaljert nær-dokumentasjon av vernebygg." },
  { id: "UC-019", name: "Vegetasjonskartlegging og habitat", department: "Naturforvaltning", operationType: "BVLOS", easaCategory: "Spesifikk kategori + OpAuth", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "fixedWing", priority: "Medium", flightHoursFormula: "areal_km2 × 0.002 timer/år", needsThermal: false, needsRtk: false, notes: "Fixed-wing for stor arealdekning." },
  { id: "UC-020", name: "Kystsonekartlegging og erosjon", department: "Naturforvaltning", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "fixedWing", priority: "Lav", flightHoursFormula: "5 timer/år flat", needsThermal: false, needsRtk: true, notes: "Fixed-wing langs kystlinjen. Kun kystkommuner." },
  { id: "UC-021", name: "Skogovervåkning og skogbrannrisiko", department: "Naturforvaltning", operationType: "BVLOS", easaCategory: "Spesifikk kategori + OpAuth", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "fixedWing", priority: "Medium", flightHoursFormula: "areal_skog_km2 × 0.003 timer/år", needsThermal: true, needsRtk: false, notes: "Fixed-wing for stor arealdekning med termisk. Skogandel >20%." },
  { id: "UC-022", name: "Ras og skredrisiko overvåkning", department: "Naturforvaltning", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "10 timer/år flat", needsThermal: false, needsRtk: true, notes: "Autonom overvåkning av skredutsatte områder." },
  { id: "UC-023", name: "Vilttelling og dyrelivskartlegging", department: "Naturforvaltning", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "fixedWing", priority: "Lav", flightHoursFormula: "10 timer/år flat", needsThermal: true, needsRtk: false, notes: "Fixed-wing med termisk for vilttelling over store arealer." },
  { id: "UC-024", name: "Jordbruksareal og tilstandskontroll", department: "Naturforvaltning / Landbruk", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "fixedWing", priority: "Lav", flightHoursFormula: "jordbruk_areal_km2 × 0.01 timer/år", needsThermal: false, needsRtk: false, notes: "Fixed-wing for landbrukskartlegging." },
  { id: "UC-025", name: "AED-levering ved hjertestans", department: "Helse og omsorg", operationType: "BVLOS", easaCategory: "Spesifikk - SORA SAIL IV", certRequirement: "Full SORA-opplæring + BVLOS + payload-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "20 timer/år flat", needsThermal: false, needsRtk: false, notes: "SAIL IV — krevende tillatelse. Autonom utsending ved AMK-alarm." },
  { id: "UC-026", name: "Medisinlevering til avsidesliggende", department: "Helse og omsorg", operationType: "BVLOS", easaCategory: "Spesifikk + BVLOS", certRequirement: "BVLOS + payload-tillatelse", droneArchetype: "multirotor", priority: "Medium", flightHoursFormula: "10 timer/år flat", needsThermal: false, needsRtk: false, notes: "Autonom levering fra sentralt lager." },
  { id: "UC-027", name: "Skadevurdering etter ekstremvær", department: "Beredskap", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Høy", flightHoursFormula: "10 timer/år flat", needsThermal: false, needsRtk: true, notes: "Autonom utsending for rask skadeoversikt." },
  { id: "UC-028", name: "Storskala ortofoto og 3D-kartlegging", department: "Geodata", operationType: "BVLOS", easaCategory: "Spesifikk kategori + OpAuth", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "fixedWing", priority: "Medium", flightHoursFormula: "areal_km2 × 0.004 timer/år", needsThermal: false, needsRtk: true, notes: "Fixed-wing for kommunedekkende kartlegging." },
  { id: "UC-029", name: "Kommuneteknisk infrastrukturkartlegging", department: "Teknisk drift", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneArchetype: "multirotor", priority: "Medium", flightHoursFormula: "5 timer/år flat", needsThermal: false, needsRtk: true, notes: "Autonom kartlegging av teknisk infrastruktur." },
  { id: "UC-030", name: "Sikkerhetsovervåkning offentlige arrangementer", department: "Beredskap", operationType: "VLOS", easaCategory: "Spesifikk - SORA SAIL IV", certRequirement: "Full SORA-opplæring", droneArchetype: "multirotor", priority: "Lav", flightHoursFormula: "5 timer/år flat", needsThermal: false, needsRtk: false, notes: "Unntak: VLOS pga. folkemasse — SAIL IV." },
];

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      municipality_name, population, area_km2, road_km, va_km, buildings,
      terrain_type, density_per_km2, departments, iks_partners,
      fire_dept_name, fire_dept_type, alarm_sentral_name, region_municipalities,
      sector_data, fire_stats,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Filter use cases to only those matching active departments — PRECISE matching
    const deptNames = (departments || []) as string[];

    const relevantUCs = VERIFIED_USE_CASES.filter((uc) =>
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
8. Gi én sertifiseringsvei per pilot — ALDRI bland åpen og spesifikk kategori
9. Estimer totalkostnad basert på valgte droner`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  summary: { type: "string", description: "Kort oppsummering (2-3 setninger) SPESIFIKT for denne kommunen" },
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
                            training_description: { type: "string" },
                            estimated_training_days: { type: "number" },
                          },
                          required: ["group_name", "certification_path", "covers_use_cases", "training_description", "estimated_training_days"],
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
                      recommendation: { type: "string" },
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
                        description: { type: "string" },
                      },
                      required: ["phase", "title", "departments", "description"],
                    },
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit — prøv igjen om litt" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Kreditt oppbrukt" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ success: false, error: "AI-analyse feilet" }), {
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

    const analysis = JSON.parse(toolCall.function.arguments);

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
