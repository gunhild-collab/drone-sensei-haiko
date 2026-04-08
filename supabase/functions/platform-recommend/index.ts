import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════════════════
// STEG 1: HARD FILTER — binary pass/fail per drone×use-case
// ═══════════════════════════════════════════════════════════════════════════

function hardFilter(drone: Record<string, any>, useCase: Record<string, any>): [boolean, string] {
  const dRange = Number(drone.max_range_km) || 0;
  const ucRange = Number(useCase.min_range_km) || 0;
  if (dRange < ucRange) return [false, `Rekkevidde ${dRange} km < krav ${ucRange} km`];

  const dFt = Number(drone.max_flight_time_min) || 0;
  const ucFt = Number(useCase.min_flight_time_min) || 0;
  if (dFt < ucFt) return [false, `Flygetid ${dFt} min < krav ${ucFt} min`];

  const dMtow = Number(drone.max_takeoff_weight_kg) || 999;
  const ucMtow = Number(useCase.max_mtow_kg) || 999;
  if (dMtow > ucMtow) return [false, `MTOW ${dMtow} kg > maks ${ucMtow} kg`];

  if (useCase.requires_bvlos && !drone.supports_bvlos) return [false, "Krever BVLOS, drone støtter ikke"];

  if (useCase.requires_thermal && !drone.has_thermal) return [false, "Krever termisk, drone har ikke"];

  if (useCase.requires_lidar) {
    const sensors = ((drone.sensor_types || []) as string[]).join(" ").toLowerCase();
    if (!sensors.includes("lidar")) return [false, "Krever LiDAR, drone har ikke"];
  }

  if (useCase.requires_rtk && !drone.has_rtk) return [false, "Krever RTK, drone har ikke"];

  if (useCase.requires_dock) {
    const cat = (drone.category || "").toLowerCase();
    const launch = (drone.launch_method || "").toLowerCase();
    if (!cat.includes("dock") && !launch.includes("dock")) return [false, "Krever dock-system, drone har ikke"];
  }

  const minPayload = Number(useCase.min_payload_kg) || 0;
  if (minPayload > 0) {
    const dronePayload = Number(drone.payload_kg) || 0;
    if (dronePayload < minPayload) return [false, `Payload ${dronePayload} kg < krav ${minPayload} kg`];
  }

  return [true, ""];
}

// ═══════════════════════════════════════════════════════════════════════════
// STEG 2: SOFT SCORING — 9 vektede faktorer (0–100 hver)
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: Record<string, number> = {
  drone_type_match: 0.22,
  sensor_match: 0.13,
  price_fit: 0.12,
  easa_certification: 0.1,
  deployment_ease: 0.1,
  eu_availability: 0.08,
  overshoot_penalty: 0.08,
  weather_robustness: 0.1,
  market_maturity: 0.07,
};

const EU_PREFERRED_WEIGHTS: Record<string, number> = {
  drone_type_match: 0.18,
  sensor_match: 0.11,
  price_fit: 0.1,
  easa_certification: 0.08,
  deployment_ease: 0.09,
  eu_availability: 0.2,
  overshoot_penalty: 0.07,
  weather_robustness: 0.1,
  market_maturity: 0.07,
};

// ── Individual scoring functions ───────────────────────────────────────

function scoreDroneTypeMatch(drone: Record<string, any>, useCase: Record<string, any>): number {
  const dType = (drone.drone_type || "").toLowerCase();
  const preferredRaw = useCase.preferred_drone_type;
  if (!preferredRaw || (Array.isArray(preferredRaw) && preferredRaw.length === 0)) return 70;

  const preferredTypes: string[] = Array.isArray(preferredRaw)
    ? preferredRaw.map((t: string) => t.toLowerCase().trim())
    : String(preferredRaw)
        .toLowerCase()
        .split(";")
        .map((t: string) => t.trim());

  // Primary preference match
  if (preferredTypes.length > 0 && preferredTypes.slice(0, 1).some((t) => dType.includes(t))) return 100;
  // Secondary preference match
  if (preferredTypes.slice(1).some((t) => dType.includes(t))) return 75;
  // Dock-based multirotor matches multirotor preference
  if (dType.includes("dock") && preferredTypes.some((t) => t.includes("multirotor"))) return 90;

  // Penalize mismatches
  const ucRange = Number(useCase.min_range_km) || 0;
  if (dType.includes("fixed-wing") && ucRange <= 3) return 15;
  if (dType.includes("multirotor") && ucRange >= 15) return 50;
  if (dType.includes("helikopter")) return 30;

  if (dType.includes("tethered")) {
    const ucName = (useCase.use_case_name || "").toLowerCase();
    if (["overvåkning", "trafikk", "massehendelse"].some((kw) => ucName.includes(kw))) return 95;
    return 10;
  }

  return 50;
}

function scoreSensorMatch(drone: Record<string, any>, useCase: Record<string, any>): number {
  const sensors = ((drone.sensor_types || []) as string[]).join(" ").toLowerCase();
  const cam = (drone.camera_specs || "").toLowerCase();
  let score = 60;

  const reqSensors = Array.isArray(useCase.required_sensors) ? useCase.required_sensors.join(" ").toLowerCase() : "";

  // Reward matching required sensors, penalize missing them
  if (reqSensors.includes("zoom") && (sensors.includes("zoom") || cam.includes("zoom"))) score += 15;
  if (reqSensors.includes("zoom") && !sensors.includes("zoom") && !cam.includes("zoom")) score -= 20;

  const minRes = Number(useCase.min_resolution_mp) || 0;
  if (minRes >= 20) {
    if (/48mp|45mp|61mp|100mp/.test(cam)) score += 15;
    else if (/20mp|21mp|24mp/.test(cam)) score += 5;
  }

  // Count matching sensor capabilities (max +20)
  const sensorKws = ["rgb", "termisk", "thermal", "lidar", "zoom", "multispektral", "eo/ir"];
  const sensorCount = sensorKws.filter((s) => sensors.includes(s)).length;
  score += Math.min(sensorCount * 5, 20);

  return Math.min(Math.max(score, 0), 100);
}

// ── Price scoring — relative to use case complexity ────────────────────
//
// The key insight: a €50k dock system is cheap for autonomous BVLOS,
// but a €50k handheld drone is expensive for simple VLOS.
// We define price tiers per use case category.

function scorePriceFit(drone: Record<string, any>, useCase: Record<string, any>): number {
  const priceStr = drone.price_eur_estimate || "";
  if (!priceStr || priceStr === "Fetch quote") return 70;

  const numbers = priceStr.replace(/\s/g, "").match(/\d+/g);
  if (!numbers) return 70;
  const price = Number(numbers[0]);

  // Determine expected price range based on use case requirements
  const requiresDock = useCase.requires_dock === true;
  const requiresBvlos = useCase.requires_bvlos === true;
  const minRange = Number(useCase.min_range_km) || 0;

  let idealMax: number;
  let acceptableMax: number;

  if (requiresDock || (requiresBvlos && minRange >= 10)) {
    // Autonomous dock / long-range BVLOS: €20k–€100k is normal
    idealMax = 60_000;
    acceptableMax = 150_000;
  } else if (requiresBvlos || minRange >= 5) {
    // BVLOS or medium range: €10k–€50k
    idealMax = 30_000;
    acceptableMax = 80_000;
  } else {
    // Simple VLOS / short range: €1k–€15k
    idealMax = 10_000;
    acceptableMax = 30_000;
  }

  if (price <= idealMax) return 95;
  if (price <= idealMax * 1.5) return 85;
  if (price <= acceptableMax) return 70;
  if (price <= acceptableMax * 1.5) return 50;
  if (price <= acceptableMax * 3) return 30;
  return 10;
}

function scoreEasaCertification(drone: Record<string, any>): number {
  const cClass = (drone.c_class || "").toUpperCase();
  if (!cClass || cClass === "NONE" || cClass === "N/A") return 65;
  if (cClass.includes("C6")) return 100;
  if (cClass.includes("C5")) return 95;
  if (cClass.includes("C2")) return 90;
  if (cClass.includes("C1")) return 90;
  if (cClass.includes("C3")) return 85;
  if (cClass.includes("C0")) return 85;
  return 65;
}

function scoreDeploymentEase(drone: Record<string, any>, useCase: Record<string, any>): number {
  const launch = (drone.launch_method || "").toLowerCase();
  const ucName = (useCase.use_case_name || "").toLowerCase();
  const timeCriticalKws = [
    "førsteinnsats",
    "sar",
    "brann",
    "flom",
    "skred",
    "cbrne",
    "hjertestarter",
    "søk og redning",
  ];
  const timeCritical = timeCriticalKws.some((kw) => ucName.includes(kw));

  if (launch.includes("dock")) return timeCritical ? 100 : 80;
  if (launch.includes("vtol") || launch.includes("håndkast")) return timeCritical ? 90 : 85;
  if (launch.includes("katapult")) return timeCritical ? 40 : 70;
  if (launch.includes("rullebane")) return timeCritical ? 10 : 30;
  if (launch.includes("tethered") || launch.includes("kabel")) return timeCritical ? 30 : 60;
  return 60;
}

function scoreEuAvailability(drone: Record<string, any>, preferEuropean: boolean): number {
  const country = (drone.country_of_manufacturer || "").toLowerCase();
  const mfr = (drone.manufacturer || "").toLowerCase();

  const nordicCountries = ["norge", "sverige", "danmark", "finland", "island"];
  const euCountries = [
    "tyskland",
    "frankrike",
    "nederland",
    "belgia",
    "sveits",
    "østerrike",
    "slovenia",
    "estland",
    "latvia",
    "tsjekkia",
    "italia",
    "spania",
    "portugal",
    "polen",
  ];
  const chineseMfrs = ["dji", "autel", "fimi", "hubsan"];

  const isNordic = nordicCountries.some((c) => country.includes(c));
  const isEu = euCountries.some((c) => country.includes(c));
  const isChinese = chineseMfrs.some((m) => mfr.includes(m)) || country.includes("kina");

  if (isNordic) return 100;
  if (isEu) return 90;
  if (country.includes("usa")) return preferEuropean ? 55 : 65;
  if (isChinese) return preferEuropean ? 30 : 60;
  if (country.includes("israel")) return preferEuropean ? 45 : 55;
  return 50;
}

// ── Weather robustness — critical for Norwegian operations ─────────────

function scoreWeatherRobustness(drone: Record<string, any>): number {
  const ip = (drone.ip_rating || "").toUpperCase();
  const wind = Number(drone.wind_resistance_ms) || 0;

  let ipScore = 30;
  if (ip.includes("IP56") || ip.includes("IP67")) ipScore = 100;
  else if (ip.includes("IP55")) ipScore = 90;
  else if (ip.includes("IP54")) ipScore = 80;
  else if (ip.includes("IP53")) ipScore = 70;
  else if (ip.includes("IP44") || ip.includes("IP43")) ipScore = 55;
  else if (ip) ipScore = 50;

  let windScore = 30;
  if (wind >= 15) windScore = 100;
  else if (wind >= 12) windScore = 85;
  else if (wind >= 10) windScore = 70;
  else if (wind >= 8) windScore = 55;
  else if (wind > 0) windScore = 40;

  // Weighted average: IP matters more for dock operations (exposed)
  return Math.round(ipScore * 0.55 + windScore * 0.45);
}

// ── Overshoot penalty — tighter threshold ──────────────────────────────
// A drone with 3x the specs costs more without adding value.
// Start penalizing at 2x overshoot.

function scoreOvershootPenalty(drone: Record<string, any>, useCase: Record<string, any>): number {
  const dRange = Number(drone.max_range_km) || 0;
  const dFt = Number(drone.max_flight_time_min) || 0;
  const ucRange = Math.max(Number(useCase.min_range_km) || 1, 0.1);
  const ucFt = Math.max(Number(useCase.min_flight_time_min) || 1, 1);

  const rangeRatio = dRange / ucRange;
  const ftRatio = dFt / ucFt;
  const overshoot = Math.max(rangeRatio, ftRatio);

  if (overshoot <= 2) return 100;
  if (overshoot <= 3) return 90;
  if (overshoot <= 5) return 70;
  if (overshoot <= 10) return 45;
  if (overshoot <= 20) return 25;
  return 10;
}

// ── Market maturity — consistent with EU preference ────────────────────
// When prefer_european is set, Chinese manufacturers get penalized here too,
// not just in eu_availability. This prevents the algorithm from fighting
// the analysis prompt.

function scoreMarketMaturity(drone: Record<string, any>, preferEuropean: boolean): number {
  const mfr = (drone.manufacturer || "").toLowerCase();
  const model = (drone.model || "").toLowerCase();
  const chineseMfrs = ["dji", "autel", "fimi", "hubsan"];
  const isChinese = chineseMfrs.some((m) => mfr.includes(m));

  let base = 50;

  if (isChinese) {
    // Well-established but potentially restricted for public sector
    base = preferEuropean ? 55 : 90;
  } else if (["parrot", "skydio"].some((m) => mfr.includes(m))) {
    base = 85;
  } else if (
    ["quantum", "wingtra", "delair", "flyability", "schiebel", "elistair", "percepto"].some((m) => mfr.includes(m))
  ) {
    base = 80;
  } else if (
    ["acecore", "c-astral", "germandrones", "avy", "deltaquad", "elevonx", "robot aviation", "nordic"].some((m) =>
      mfr.includes(m),
    )
  ) {
    base = 70;
  }

  // Prefer newer generation models
  if (model.includes("dock 3") || model.includes("matrice 4")) base = Math.max(base, 95);
  else if (model.includes("dock 2") || model.includes("matrice 3")) base = Math.min(base, 50);

  return base;
}

// ── Combined scoring ───────────────────────────────────────────────────

function calculateScore(
  drone: Record<string, any>,
  useCase: Record<string, any>,
  weights: Record<string, number>,
  preferEuropean: boolean,
): { total_score: number; breakdown: Record<string, number>; advisories: string[] } {
  const scores: Record<string, number> = {
    drone_type_match: scoreDroneTypeMatch(drone, useCase),
    sensor_match: scoreSensorMatch(drone, useCase),
    price_fit: scorePriceFit(drone, useCase),
    easa_certification: scoreEasaCertification(drone),
    deployment_ease: scoreDeploymentEase(drone, useCase),
    eu_availability: scoreEuAvailability(drone, preferEuropean),
    overshoot_penalty: scoreOvershootPenalty(drone, useCase),
    weather_robustness: scoreWeatherRobustness(drone),
    market_maturity: scoreMarketMaturity(drone, preferEuropean),
  };

  const total = Object.keys(weights).reduce((sum, k) => sum + scores[k] * weights[k], 0);

  // Advisory flags
  const advisories: string[] = [];
  const ip = (drone.ip_rating || "").toUpperCase();
  const wind = Number(drone.wind_resistance_ms) || 0;
  if (!ip) advisories.push("Ingen IP-rating oppgitt — vurder værrobusthet");
  if (wind === 0) advisories.push("Ingen vindtoleranse oppgitt");

  const cClass = (drone.c_class || "").toUpperCase();
  if (!cClass || cClass === "NONE" || cClass === "N/A") {
    advisories.push("Ingen C-klasse — krever SORA-vurdering for operasjonstillatelse");
  }

  if (scores.weather_robustness < 50) {
    advisories.push("Lav værrobusthet — begrenset operativt vindu i norsk klima");
  }

  return {
    total_score: Math.round(total * 10) / 10,
    breakdown: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    advisories,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEG 3: FLEET OPTIMIZATION — greedy set cover with type diversity
// ═══════════════════════════════════════════════════════════════════════════

interface FleetEntry {
  drone_id: string;
  drone: string;
  manufacturer: string;
  model: string;
  price_eur: string;
  price_nok: number | null;
  drone_type: string;
  covers_n_use_cases: number;
  covered: Array<{
    use_case_id: string;
    use_case: string;
    department: string;
    score: number;
  }>;
  departments: string[];
  avg_score: number;
  breakdown_avg: Record<string, number>;
  advisories: string[];
}

// Superseded model pairs: [old, new]
const SUPERSEDED_MODELS: [string, string][] = [
  ["dock 2 + matrice 3d", "dock 3 + matrice 4d"],
  ["dock 2 + matrice 3td", "dock 3 + matrice 4td"],
];

function filterSupersededModels(drones: Record<string, any>[]): Record<string, any>[] {
  const modelSet = new Set(drones.map((d) => (d.model || "").toLowerCase()));
  return drones.filter((d) => {
    const m = (d.model || "").toLowerCase();
    for (const [old, newer] of SUPERSEDED_MODELS) {
      if (m === old && modelSet.has(newer)) return false;
    }
    return true;
  });
}

// Determine which drone archetypes are needed by the use cases
function getRequiredArchetypes(useCases: Record<string, any>[]): Set<string> {
  const archetypes = new Set<string>();
  for (const uc of useCases) {
    const preferred = uc.preferred_drone_type;
    if (Array.isArray(preferred) && preferred.length > 0) {
      const primary = preferred[0].toLowerCase();
      if (primary.includes("fixed")) archetypes.add("fixed-wing");
      else archetypes.add("multirotor");
    } else {
      archetypes.add("multirotor"); // default
    }
  }
  return archetypes;
}

function getDroneArchetype(drone: Record<string, any>): string {
  const t = (drone.drone_type || "").toLowerCase();
  if (t.includes("fixed") || t.includes("wing")) return "fixed-wing";
  return "multirotor";
}

function optimizeFleet(
  drones: Record<string, any>[],
  useCases: Record<string, any>[],
  weights: Record<string, number>,
  preferEuropean: boolean,
  maxPlatforms: number = 5,
): { fleet: FleetEntry[]; uncovered: number } {
  const activeDrones = filterSupersededModels(drones);

  // Pre-compute all scores
  const scored: Record<
    string,
    Record<string, { total_score: number; breakdown: Record<string, number>; advisories: string[] }>
  > = {};
  for (const d of activeDrones) {
    scored[d.id] = {};
    for (const uc of useCases) {
      const [passed] = hardFilter(d, uc);
      if (passed) {
        const s = calculateScore(d, uc, weights, preferEuropean);
        if (s.total_score >= 45) {
          scored[d.id][uc.use_case_id] = s;
        }
      }
    }
  }

  const uncoveredSet = new Set(useCases.map((uc) => uc.use_case_id));
  const fleet: FleetEntry[] = [];
  const usedDroneIds = new Set<string>();

  // Phase 1: Ensure archetype diversity
  // If use cases need both multirotor and fixed-wing, guarantee at least
  // one of each before greedy fill
  const requiredArchetypes = getRequiredArchetypes(useCases);
  const coveredArchetypes = new Set<string>();

  function selectBestDrone(candidates: Record<string, any>[], remaining: Set<string>): string | null {
    let bestId: string | null = null;
    let bestValue = 0;

    for (const d of candidates) {
      if (usedDroneIds.has(d.id)) continue;
      const ucScores = scored[d.id] || {};
      const newCovered = Object.keys(ucScores).filter((uid) => remaining.has(uid));
      if (newCovered.length === 0) continue;

      const avgScore = newCovered.reduce((s, uid) => s + ucScores[uid].total_score, 0) / newCovered.length;
      const value = newCovered.length * avgScore;
      if (value > bestValue) {
        bestValue = value;
        bestId = d.id;
      }
    }
    return bestId;
  }

  function addDroneToFleet(droneId: string): void {
    const d = activeDrones.find((dr) => dr.id === droneId)!;
    const newCoveredIds = Object.keys(scored[droneId]).filter((uid) => uncoveredSet.has(uid));

    const ucDetails = newCoveredIds
      .map((uid) => {
        const uc = useCases.find((u) => u.use_case_id === uid)!;
        return {
          use_case_id: uid,
          use_case: uc.use_case_name,
          department: uc.department,
          score: scored[droneId][uid].total_score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const breakdownKeys = Object.keys(weights);
    const breakdownAvg: Record<string, number> = {};
    for (const k of breakdownKeys) {
      breakdownAvg[k] =
        Math.round(
          (newCoveredIds.reduce((s, uid) => s + (scored[droneId][uid].breakdown[k] || 0), 0) / newCoveredIds.length) *
            10,
        ) / 10;
    }

    const firstAdvisories = scored[droneId][newCoveredIds[0]]?.advisories || [];

    fleet.push({
      drone_id: d.id,
      drone: `${d.manufacturer} ${d.model}`,
      manufacturer: d.manufacturer,
      model: d.model,
      price_eur: d.price_eur_estimate || "Fetch quote",
      price_nok: d.price_nok_estimate,
      drone_type: d.drone_type || "",
      covers_n_use_cases: newCoveredIds.length,
      covered: ucDetails,
      departments: [...new Set(ucDetails.map((x) => x.department))].sort(),
      avg_score: Math.round((ucDetails.reduce((s, x) => s + x.score, 0) / ucDetails.length) * 10) / 10,
      breakdown_avg: breakdownAvg,
      advisories: firstAdvisories,
    });

    for (const uid of newCoveredIds) uncoveredSet.delete(uid);
    usedDroneIds.add(droneId);
    coveredArchetypes.add(getDroneArchetype(d));
  }

  // Phase 1: If multiple archetypes needed, pick best of each first
  if (requiredArchetypes.size > 1) {
    for (const archetype of requiredArchetypes) {
      if (fleet.length >= maxPlatforms) break;
      // Filter to use cases that prefer this archetype
      const archetypeUcIds = new Set(
        useCases
          .filter((uc) => {
            const pref = (uc.preferred_drone_type || [])[0] || "";
            const prefArch = pref.toLowerCase().includes("fixed") ? "fixed-wing" : "multirotor";
            return prefArch === archetype;
          })
          .map((uc) => uc.use_case_id),
      );

      // Find best drone of this archetype for those use cases
      const archetypeDrones = activeDrones.filter((d) => getDroneArchetype(d) === archetype);
      const bestId = selectBestDrone(archetypeDrones, uncoveredSet);
      if (bestId) addDroneToFleet(bestId);
    }
  }

  // Phase 2: Greedy fill for remaining slots
  for (let i = fleet.length; i < maxPlatforms; i++) {
    if (uncoveredSet.size === 0) break;
    const bestId = selectBestDrone(activeDrones, uncoveredSet);
    if (!bestId) break;
    addDroneToFleet(bestId);
  }

  return { fleet, uncovered: uncoveredSet.size };
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION HANDLER
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      municipality_name,
      use_case_ids,
      department_names,
      max_platforms = 5,
      prefer_european = false,
    } = await req.json();

    const weights = prefer_european ? { ...EU_PREFERRED_WEIGHTS } : { ...DEFAULT_WEIGHTS };

    // Fetch from DB
    const [dronesRes, ucRes] = await Promise.all([
      supabase.from("drone_platforms").select("*"),
      supabase.from("use_case_requirements").select("*"),
    ]);

    if (dronesRes.error) throw dronesRes.error;
    if (ucRes.error) throw ucRes.error;

    const allDrones = dronesRes.data || [];
    let useCases = ucRes.data || [];

    // Filter use cases
    if (use_case_ids && use_case_ids.length > 0) {
      useCases = useCases.filter((uc: any) => use_case_ids.includes(uc.use_case_id));
    } else if (department_names && department_names.length > 0) {
      const deptLower = department_names.map((d: string) => d.toLowerCase());
      useCases = useCases.filter((uc: any) => {
        const ucDept = (uc.department || "").toLowerCase();
        const shared = (uc.shared_departments || []).map((s: string) => s.toLowerCase());
        return deptLower.some(
          (d: string) =>
            ucDept.includes(d) || d.includes(ucDept) || shared.some((s: string) => s.includes(d) || d.includes(s)),
        );
      });
    }

    // Run fleet optimization
    const activeDrones = filterSupersededModels(allDrones);
    const { fleet, uncovered } = optimizeFleet(allDrones, useCases, weights, prefer_european, max_platforms);

    // Per-use-case top matches — using filtered drones (no superseded)
    const perUseCaseTop: Record<
      string,
      Array<{
        drone: string;
        drone_id: string;
        score: number;
        breakdown: Record<string, number>;
        advisories: string[];
      }>
    > = {};
    for (const uc of useCases) {
      const matches: (typeof perUseCaseTop)[string] = [];
      for (const d of activeDrones) {
        const [passed] = hardFilter(d, uc);
        if (!passed) continue;
        const s = calculateScore(d, uc, weights, prefer_european);
        if (s.total_score >= 45) {
          matches.push({
            drone: `${d.manufacturer} ${d.model}`,
            drone_id: d.id,
            score: s.total_score,
            breakdown: s.breakdown,
            advisories: s.advisories,
          });
        }
      }
      matches.sort((a, b) => b.score - a.score);
      perUseCaseTop[uc.use_case_id] = matches.slice(0, 5);
    }

    const totalCoveredUCs = fleet.reduce((s, f) => s + f.covers_n_use_cases, 0);

    return new Response(
      JSON.stringify({
        success: true,
        algorithm_version: "haiko-radar-v2",
        fleet,
        total_use_cases: useCases.length,
        covered_use_cases: totalCoveredUCs,
        uncovered_use_cases: uncovered,
        per_use_case_top: perUseCaseTop,
        scoring_weights: weights,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Platform recommendation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Platform recommendation failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
