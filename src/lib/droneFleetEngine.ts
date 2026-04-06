/**
 * Drone Fleet Engine — Role-based scoring & NOK formatting
 * Replaces the AI-generated fleet recommendations with deterministic logic.
 */

import { createClient } from "@supabase/supabase-js";

const dmaClient = createClient(
  "https://mlrvjprgiookaiiohhkg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1scnZqcHJnaW9va2FpaW9oaGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzE5NDEsImV4cCI6MjA5MDgwNzk0MX0.etqIrK9By1lJAV7Ypz-3uNokNp2XiD11HTbOalO3xYk"
);

/* ═══════════════════════════════════════════════════
   A. Price formatting — ALL prices in NOK only
   ═══════════════════════════════════════════════════ */

export const EUR_TO_NOK = 11.5;

export function formatNOK(amountEur: number | null, quoteRequired?: boolean): string {
  if (quoteRequired || amountEur === null || amountEur === undefined) return "Tilbud";
  const nok = amountEur * EUR_TO_NOK;
  if (nok >= 1_000_000) return `${(nok / 1_000_000).toFixed(1)} MNOK`;
  if (nok >= 1_000) return `${Math.round(nok / 1_000)} KNOK`;
  return `${Math.round(nok)} kr`;
}

export function formatNOKRaw(amountNok: number): string {
  if (amountNok >= 1_000_000) return `${(amountNok / 1_000_000).toFixed(1)} MNOK`;
  if (amountNok >= 1_000) return `${Math.round(amountNok / 1_000)} KNOK`;
  return `${Math.round(amountNok)} kr`;
}

/* ═══════════════════════════════════════════════════
   B1. Use-case to tag mapping
   ═══════════════════════════════════════════════════ */

export const USE_CASE_TO_TAGS: Record<string, string[]> = {
  "Brann og redning":          ["brann_sar", "beredskap"],
  "Søk og redning":            ["brann_sar", "beredskap"],
  "Beredskap":                 ["beredskap", "brann_sar"],
  "Bygningsinspeksjon":        ["inspeksjon_bygg", "digital_tvilling"],
  "Broinspeksjon":             ["inspeksjon_bro"],
  "Veiinspeksjon":             ["inspeksjon_vei"],
  "VA-inspeksjon":             ["inspeksjon_va"],
  "Kartlegging":               ["kartlegging"],
  "Arealplanlegging":          ["kartlegging", "digital_tvilling"],
  "Digital tvilling":          ["digital_tvilling", "inspeksjon_bygg"],
  "Jordbruk":                  ["jordbruk"],
  "Miljøovervåking":           ["miljo"],
  "Helsetransport":            ["helse_transport"],
  "Overvåking og sikkerhet":   ["overvaking"],
  // Fallbacks from department names
  "Situasjonsvurdering ved utrykning": ["brann_sar"],
  "Etterslukking og skadedokumentasjon": ["brann_sar"],
  "Fasadeinspeksjon kommunale bygg": ["inspeksjon_bygg", "digital_tvilling"],
  "Kartoppdatering / ortofoto": ["kartlegging"],
  "3D-modell av sentrumsområder": ["digital_tvilling"],
  "Lekkasjesøk i VA-nett (termisk)": ["inspeksjon_va"],
  "Inspeksjon av vannverk/renseanlegg": ["inspeksjon_va"],
  "Tilskuddskontroll jordbruksareal": ["jordbruk"],
  "Forurensningsovervåking vassdrag": ["miljo"],
  "Transport av biologiske prøver": ["helse_transport"],
  "Medisinsk transport": ["helse_transport"],
  "Hjertestarter-levering": ["helse_transport"],
  "Beredskapsøvelse og trening": ["beredskap"],
  "Massehendelse og publikumssikkerhet": ["overvaking"],
};

/* ═══════════════════════════════════════════════════
   B2. Types
   ═══════════════════════════════════════════════════ */

export interface DMAProduct {
  id: string;
  product_name: string;
  category: string;
  aircraft_type: string | null;
  bvlos_ready: boolean | null;
  endurance_minutes: number | null;
  range_km: number | null;
  max_speed_kmh: number | null;
  mtow_kg: number | null;
  price_eur: number | null;
  quote_required: boolean | null;
  ip_rating: string | null;
  launch_method: string | null;
  recovery_method: string | null;
  use_case_tags: string[] | null;
  sensor_1: string | null;
  sensor_2: string | null;
  payload_kg: number | null;
  wingspan_m: number | null;
  status: string | null;
  manufacturers: { name: string; country: string } | null;
}

export type DroneRole = 'inspection' | 'mapping' | 'emergency' | 'monitoring' | 'delivery';

export interface ScoredDrone {
  product: DMAProduct;
  score: number;
  matchedTags: string[];
  role: DroneRole;
  roleLabel: string;
}

export interface FleetResult {
  fleet: ScoredDrone[];
  allScored: ScoredDrone[];
  coverageMatrix: { tag: string; label: string; drones: boolean[] }[];
  totalCoveredTags: number;
  totalRequiredTags: number;
}

/* ═══════════════════════════════════════════════════
   B3. Constants
   ═══════════════════════════════════════════════════ */

const ALWAYS_MULTIROTOR_TAGS = [
  'inspeksjon_bygg', 'inspeksjon_bro', 'inspeksjon_va', 'digital_tvilling'
];
const ALWAYS_FIXED_WING_TAGS = [
  'kartlegging', 'jordbruk', 'miljo', 'helse_transport'
];
const AREA_DEPENDENT_TAGS = [
  'brann_sar', 'beredskap', 'overvaking', 'inspeksjon_vei'
];

const EUROPEAN_COUNTRIES = [
  'Germany', 'France', 'Netherlands', 'Switzerland',
  'Norway', 'Denmark', 'Sweden', 'Finland', 'Italy',
  'Portugal', 'Belgium', 'Latvia', 'United Kingdom',
];

export const COUNTRY_FLAGS: Record<string, string> = {
  'Germany': '🇩🇪', 'France': '🇫🇷', 'Netherlands': '🇳🇱',
  'Switzerland': '🇨🇭', 'Norway': '🇳🇴', 'United States': '🇺🇸',
  'Israel': '🇮🇱', 'Denmark': '🇩🇰', 'Portugal': '🇵🇹',
  'Belgium': '🇧🇪', 'United Kingdom': '🇬🇧', 'Sweden': '🇸🇪',
  'Finland': '🇫🇮', 'Italy': '🇮🇹', 'Latvia': '🇱🇻',
};

const TAG_LABELS: Record<string, string> = {
  kartlegging: "Kartlegging",
  jordbruk: "Jordbruk",
  miljo: "Miljøovervåking",
  helse_transport: "Helsetransport",
  inspeksjon_bygg: "Bygningsinspeksjon",
  inspeksjon_bro: "Broinspeksjon",
  inspeksjon_va: "VA-inspeksjon",
  inspeksjon_vei: "Veiinspeksjon",
  digital_tvilling: "Digital tvilling",
  brann_sar: "Brann/SAR",
  beredskap: "Beredskap",
  overvaking: "Overvåking",
};

const ROLE_LABELS: Record<DroneRole, string> = {
  mapping: "Kartlegging og storskala inspeksjon",
  inspection: "Nær-inspeksjon og digital tvilling",
  emergency: "Beredskap og situasjonsvurdering",
  monitoring: "Overvåking og sikkerhet",
  delivery: "Medisinsk transport",
};

/* ═══════════════════════════════════════════════════
   B3. Scoring
   ═══════════════════════════════════════════════════ */

function isFixedWing(d: DMAProduct): boolean {
  const t = (d.aircraft_type || '').toLowerCase();
  return t.includes('fixed-wing') || t.includes('fixed wing') || t.includes('vtol') || t.includes('evtol');
}

function isMultirotor(d: DMAProduct): boolean {
  const t = (d.aircraft_type || '').toLowerCase();
  return t.includes('multirotor') || t.includes('multicopter');
}

function scoreDrones(
  drones: DMAProduct[],
  selectedUseCases: string[],
  kommuneAreaKm2: number,
): ScoredDrone[] {
  const requiredTags = new Set<string>();
  selectedUseCases.forEach(uc => {
    (USE_CASE_TO_TAGS[uc] || []).forEach(tag => requiredTags.add(tag));
  });

  const emergencyNeedsFixedWing = kommuneAreaKm2 > 150;

  return drones.map(drone => {
    const droneTags: string[] = drone.use_case_tags || [];
    let score = 0;
    const matchedTags: string[] = [];
    const fw = isFixedWing(drone);
    const mr = isMultirotor(drone);

    requiredTags.forEach(tag => {
      if (!droneTags.includes(tag)) return;

      if (ALWAYS_MULTIROTOR_TAGS.includes(tag)) {
        if (mr) { score += 10; matchedTags.push(tag); }
        return;
      }

      if (ALWAYS_FIXED_WING_TAGS.includes(tag)) {
        if (fw) { score += 10; matchedTags.push(tag); }
        return;
      }

      if (AREA_DEPENDENT_TAGS.includes(tag)) {
        if (emergencyNeedsFixedWing) {
          if (fw) { score += 10; matchedTags.push(tag); }
          else if (mr) { score += 4; matchedTags.push(tag); }
        } else {
          if (mr) { score += 10; matchedTags.push(tag); }
          else if (fw) { score += 3; matchedTags.push(tag); }
        }
        return;
      }

      score += 8;
      matchedTags.push(tag);
    });

    // BONUS: Autonomous dock
    if (drone.launch_method?.toLowerCase().includes('autonomous') ||
        drone.launch_method?.toLowerCase().includes('dock')) {
      score += 5;
    }

    // BONUS: European
    if (drone.manufacturers?.country && EUROPEAN_COUNTRIES.includes(drone.manufacturers.country)) {
      score += 3;
    }
    if (drone.manufacturers?.country === 'Norway') {
      score += 2;
    }

    // Determine role
    let role: DroneRole;
    if (matchedTags.some(t => ALWAYS_FIXED_WING_TAGS.includes(t))) role = 'mapping';
    else if (matchedTags.some(t => t === 'helse_transport')) role = 'delivery';
    else if (matchedTags.some(t => ['brann_sar', 'beredskap'].includes(t))) role = 'emergency';
    else if (matchedTags.some(t => t === 'overvaking')) role = 'monitoring';
    else role = 'inspection';

    return { product: drone, score, matchedTags, role, roleLabel: ROLE_LABELS[role] };
  })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score);
}

/* ═══════════════════════════════════════════════════
   B4. Fleet selection — complementary roles
   ═══════════════════════════════════════════════════ */

function selectFleet(scoredDrones: ScoredDrone[], maxDrones: number = 3): ScoredDrone[] {
  const fleet: ScoredDrone[] = [];
  const coveredRoles = new Set<string>();
  const coveredTags = new Set<string>();

  for (const drone of scoredDrones) {
    if (fleet.length >= maxDrones) break;
    const addsNewRole = !coveredRoles.has(drone.role);
    const addsNewTags = drone.matchedTags.some(t => !coveredTags.has(t));
    if (addsNewRole || addsNewTags) {
      fleet.push(drone);
      coveredRoles.add(drone.role);
      drone.matchedTags.forEach(t => coveredTags.add(t));
    }
  }

  return fleet;
}

/* ═══════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════ */

export async function fetchAndScoreFleet(
  selectedUseCases: string[],
  kommuneAreaKm2: number,
  maxDrones: number = 3,
): Promise<FleetResult> {
  // Fetch drones (excluding docking stations)
  const { data: drones, error } = await dmaClient
    .from("products")
    .select(`
      id, product_name, category, aircraft_type,
      bvlos_ready, endurance_minutes, range_km, max_speed_kmh,
      mtow_kg, price_eur, quote_required, ip_rating,
      launch_method, recovery_method,
      use_case_tags, status, sensor_1, sensor_2, payload_kg, wingspan_m,
      manufacturers (name, country)
    `)
    .in("status", ["active", "pre-release"])
    .neq("category", "Docking Station")
    .order("product_name");

  if (error || !drones) {
    console.error("Fleet engine: failed to fetch drones", error);
    return { fleet: [], allScored: [], coverageMatrix: [], totalCoveredTags: 0, totalRequiredTags: 0 };
  }

  const mapped = (drones as any[]).map(d => ({ ...d, manufacturers: d.manufacturers?.[0] || d.manufacturers || null }));
  const allScored = scoreDrones(mapped as DMAProduct[], selectedUseCases, kommuneAreaKm2);
  const fleet = selectFleet(allScored, maxDrones);

  // Build coverage matrix
  const requiredTags = new Set<string>();
  selectedUseCases.forEach(uc => {
    (USE_CASE_TO_TAGS[uc] || []).forEach(tag => requiredTags.add(tag));
  });

  const coverageMatrix = Array.from(requiredTags).map(tag => ({
    tag,
    label: TAG_LABELS[tag] || tag,
    drones: fleet.map(d => d.matchedTags.includes(tag)),
  }));

  const coveredTags = new Set<string>();
  fleet.forEach(d => d.matchedTags.forEach(t => coveredTags.add(t)));

  return {
    fleet,
    allScored,
    coverageMatrix,
    totalCoveredTags: coveredTags.size,
    totalRequiredTags: requiredTags.size,
  };
}

/* ═══════════════════════════════════════════════════
   Software category mapping per tag
   ═══════════════════════════════════════════════════ */

export const SOFTWARE_CATEGORY_MAP: Record<string, string[]> = {
  'kartlegging':       ['photogrammetry', 'gis_integration'],
  'jordbruk':          ['agriculture'],
  'inspeksjon_bygg':   ['inspection_analytics', 'digital_twin'],
  'inspeksjon_bro':    ['inspection_analytics'],
  'inspeksjon_vei':    ['photogrammetry', 'flight_planning'],
  'inspeksjon_va':     ['inspection_analytics', 'thermal_analysis'],
  'digital_tvilling':  ['digital_twin', 'photogrammetry'],
  'brann_sar':         ['mission_control', 'thermal_analysis'],
  'beredskap':         ['mission_control', 'fleet_management'],
  'miljo':             ['photogrammetry', 'gis_integration'],
  'overvaking':        ['fleet_management'],
  'helse_transport':   ['fleet_management', 'utm_airspace'],
};
