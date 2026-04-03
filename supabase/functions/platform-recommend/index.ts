import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================
// STEG 1: HARD FILTER
// ============================================================

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

  if (useCase.requires_bvlos === true) {
    if (!drone.supports_bvlos) return [false, 'Krever BVLOS, drone støtter ikke'];
  }

  if (useCase.requires_thermal === true) {
    if (!drone.has_thermal) return [false, 'Krever termisk, drone har ikke'];
  }

  if (useCase.requires_lidar === true) {
    const sensors = ((drone.sensor_types || []) as string[]).join(' ').toLowerCase();
    if (!sensors.includes('lidar')) return [false, 'Krever LiDAR, drone har ikke'];
  }

  if (useCase.requires_rtk === true) {
    if (!drone.has_rtk) return [false, 'Krever RTK, drone har ikke'];
  }

  if (useCase.requires_dock === true) {
    const cat = (drone.category || '').toLowerCase();
    const launch = (drone.launch_method || '').toLowerCase();
    if (!cat.includes('dock') && !launch.includes('dock')) return [false, 'Krever dock-system, drone har ikke'];
  }

  return [true, ''];
}

// ============================================================
// STEG 2: SOFT SCORING (0–100)
// ============================================================

const WEIGHTS: Record<string, number> = {
  drone_type_match: 0.20,
  sensor_match: 0.15,
  price_fit: 0.15,
  easa_certification: 0.12,
  deployment_ease: 0.10,
  eu_availability: 0.08,
  weather_rating: 0.05,
  overshoot_penalty: 0.10,
  market_maturity: 0.05,
};

function scoreDroneTypeMatch(drone: Record<string, any>, useCase: Record<string, any>): number {
  const dType = (drone.drone_type || '').toLowerCase();
  const preferredRaw = useCase.preferred_drone_type;
  if (!preferredRaw || (Array.isArray(preferredRaw) && preferredRaw.length === 0)) return 70;

  const preferredTypes: string[] = Array.isArray(preferredRaw)
    ? preferredRaw.map((t: string) => t.toLowerCase().trim())
    : String(preferredRaw).toLowerCase().split(';').map((t: string) => t.trim());

  if (preferredTypes.length > 0 && preferredTypes.slice(0, 1).some(t => dType.includes(t))) return 100;
  if (preferredTypes.slice(1).some(t => dType.includes(t))) return 75;
  if (dType.includes('dock') && preferredTypes.some(t => t.includes('multirotor'))) return 90;

  const ucRange = Number(useCase.min_range_km) || 0;
  if (dType.includes('fixed-wing') && ucRange <= 3) return 15;
  if (dType.includes('multirotor') && ucRange >= 15) return 50;
  if (dType.includes('helikopter')) return 30;

  if (dType.includes('tethered')) {
    const ucName = (useCase.use_case_name || '').toLowerCase();
    if (['overvåkning', 'trafikk', 'massehendelse'].some(kw => ucName.includes(kw))) return 95;
    return 10;
  }

  return 50;
}

function scoreSensorMatch(drone: Record<string, any>, useCase: Record<string, any>): number {
  const sensors = ((drone.sensor_types || []) as string[]).join(' ').toLowerCase();
  const cam = (drone.camera_specs || '').toLowerCase();
  let score = 60;

  const reqSensors = Array.isArray(useCase.required_sensors)
    ? useCase.required_sensors.join(' ').toLowerCase()
    : '';

  if (reqSensors.includes('zoom') && (sensors.includes('zoom') || cam.includes('zoom'))) score += 15;
  if (reqSensors.includes('zoom') && !sensors.includes('zoom') && !cam.includes('zoom')) score -= 20;

  const minRes = Number(useCase.min_resolution_mp) || 0;
  if (minRes >= 20) {
    if (/48mp|45mp|61mp|100mp/.test(cam)) score += 15;
    else if (/20mp|21mp|24mp/.test(cam)) score += 5;
  }

  const sensorKws = ['rgb', 'termisk', 'thermal', 'lidar', 'zoom', 'multispektral', 'eo/ir'];
  const sensorCount = sensorKws.filter(s => sensors.includes(s)).length;
  score += Math.min(sensorCount * 5, 20);

  return Math.min(score, 100);
}

function scorePriceFit(drone: Record<string, any>): number {
  const priceStr = drone.price_eur_estimate || '';
  if (!priceStr || priceStr === 'Fetch quote') return 75; // Unknown price = neutral, not penalized

  const numbers = priceStr.replace(/\s/g, '').match(/\d+/g);
  if (!numbers) return 75;
  const price = Number(numbers[0]);

  if (price <= 1000) return 95;
  if (price <= 5000) return 95;
  if (price <= 15000) return 90;
  if (price <= 30000) return 80;
  if (price <= 50000) return 65;
  if (price <= 100000) return 45;
  if (price <= 300000) return 25;
  return 10;
}

function scoreEasaCertification(drone: Record<string, any>): number {
  const cClass = (drone.c_class || '').toUpperCase();
  if (!cClass || cClass === 'NONE' || cClass === 'N/A') return 30;
  if (cClass.includes('C6')) return 100;
  if (cClass.includes('C5')) return 95;
  if (cClass.includes('C2')) return 90;
  if (cClass.includes('C1')) return 90;
  if (cClass.includes('C3')) return 85;
  if (cClass.includes('C0')) return 85;
  return 50;
}

function scoreDeploymentEase(drone: Record<string, any>, useCase: Record<string, any>): number {
  const launch = (drone.launch_method || '').toLowerCase();
  const ucName = (useCase.use_case_name || '').toLowerCase();
  const timeCriticalKws = ['førsteinnsats', 'sar', 'brann', 'flom', 'skred', 'cbrne', 'hjertestarter', 'søk og redning'];
  const timeCritical = timeCriticalKws.some(kw => ucName.includes(kw));

  if (launch.includes('dock')) return timeCritical ? 100 : 80;
  if (launch.includes('vtol') || launch.includes('håndkast')) return timeCritical ? 90 : 85;
  if (launch.includes('katapult')) return timeCritical ? 40 : 70;
  if (launch.includes('rullebane')) return timeCritical ? 10 : 30;
  if (launch.includes('tethered') || launch.includes('kabel')) return timeCritical ? 30 : 60;
  return 60;
}

function scoreEuAvailability(drone: Record<string, any>): number {
  const country = (drone.country_of_manufacturer || '').toLowerCase();
  const euCountries = ['norge', 'sverige', 'danmark', 'finland', 'tyskland', 'frankrike',
    'nederland', 'belgia', 'sveits', 'østerrike', 'slovenia', 'estland',
    'latvia', 'tsjekkia', 'italia', 'spania', 'portugal', 'polen'];

  if (country.includes('norge')) return 100;
  if (euCountries.some(c => country.includes(c))) return 90;
  if (country.includes('kina')) return 60;
  if (country.includes('usa')) return 65;
  if (country.includes('israel')) return 55;
  return 40;
}

function scoreWeatherRating(drone: Record<string, any>): number {
  const ip = (drone.ip_rating || '').toUpperCase();
  const wind = Number(drone.wind_resistance_ms) || 0;
  let score = 40;

  if (ip.includes('IP56')) score = 95;
  else if (ip.includes('IP55')) score = 90;
  else if (ip.includes('IP54')) score = 80;
  else if (ip.includes('IP53')) score = 70;
  else if (ip.includes('IP44')) score = 60;
  else if (ip) score = 65;

  if (wind >= 15) score = Math.min(score + 15, 100);
  else if (wind >= 12) score = Math.min(score + 10, 100);

  return score;
}

function scoreOvershootPenalty(drone: Record<string, any>, useCase: Record<string, any>): number {
  const dRange = Number(drone.max_range_km) || 0;
  const dFt = Number(drone.max_flight_time_min) || 0;
  const ucRange = Math.max(Number(useCase.min_range_km) || 1, 0.1);
  const ucFt = Math.max(Number(useCase.min_flight_time_min) || 1, 1);

  const rangeRatio = dRange / ucRange;
  const ftRatio = dFt / ucFt;
  const overshoot = Math.max(rangeRatio, ftRatio);

  if (overshoot <= 3) return 100;
  if (overshoot <= 5) return 85;
  if (overshoot <= 10) return 60;
  if (overshoot <= 30) return 35;
  return 10;
}

function scoreMarketMaturity(drone: Record<string, any>): number {
  const mfr = (drone.manufacturer || '').toLowerCase();
  if (['dji', 'parrot', 'autel'].some(m => mfr.includes(m))) return 95;
  if (['quantum', 'wingtra', 'delair', 'flyability', 'schiebel', 'elistair', 'skydio', 'percepto'].some(m => mfr.includes(m))) return 85;
  if (['acecore', 'c-astral', 'germandrones', 'avy', 'deltaquad', 'elevonx', 'robot aviation', 'nordic'].some(m => mfr.includes(m))) return 70;
  return 50;
}

function calculateScore(drone: Record<string, any>, useCase: Record<string, any>): { total_score: number; breakdown: Record<string, number> } {
  const scores: Record<string, number> = {
    drone_type_match: scoreDroneTypeMatch(drone, useCase),
    sensor_match: scoreSensorMatch(drone, useCase),
    price_fit: scorePriceFit(drone),
    easa_certification: scoreEasaCertification(drone),
    deployment_ease: scoreDeploymentEase(drone, useCase),
    eu_availability: scoreEuAvailability(drone),
    weather_rating: scoreWeatherRating(drone),
    overshoot_penalty: scoreOvershootPenalty(drone, useCase),
    market_maturity: scoreMarketMaturity(drone),
  };

  const total = Object.keys(WEIGHTS).reduce((sum, k) => sum + scores[k] * WEIGHTS[k], 0);

  return {
    total_score: Math.round(total * 10) / 10,
    breakdown: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  };
}

// ============================================================
// STEG 3: FLÅTEOPTIMERING (Greedy Set Cover)
// ============================================================

interface FleetEntry {
  drone_id: string;
  drone: string;
  manufacturer: string;
  model: string;
  price_eur: string;
  price_nok: number | null;
  drone_type: string;
  covers_n_use_cases: number;
  covered: Array<{ use_case_id: string; use_case: string; department: string; score: number }>;
  departments: string[];
  avg_score: number;
  breakdown_avg: Record<string, number>;
}

function optimizeFleet(
  drones: Record<string, any>[],
  useCases: Record<string, any>[],
  maxPlatforms: number = 5,
): { fleet: FleetEntry[]; uncovered: number } {
  // Pre-filter and score all combinations
  const scored: Record<string, Record<string, { total_score: number; breakdown: Record<string, number> }>> = {};
  for (const d of drones) {
    const dId = d.id;
    scored[dId] = {};
    for (const uc of useCases) {
      const [passed] = hardFilter(d, uc);
      if (passed) {
        const s = calculateScore(d, uc);
        if (s.total_score >= 45) {
          scored[dId][uc.use_case_id] = s;
        }
      }
    }
  }

  // Greedy set cover
  const uncoveredSet = new Set(useCases.map(uc => uc.use_case_id));
  const fleet: FleetEntry[] = [];
  const usedDroneIds = new Set<string>();

  for (let i = 0; i < maxPlatforms; i++) {
    if (uncoveredSet.size === 0) break;

    let bestDroneId: string | null = null;
    let bestValue = 0;

    for (const [dId, ucScores] of Object.entries(scored)) {
      if (usedDroneIds.has(dId)) continue;
      const newCovered = Object.keys(ucScores).filter(uid => uncoveredSet.has(uid));
      if (newCovered.length === 0) continue;

      const avgScore = newCovered.reduce((s, uid) => s + ucScores[uid].total_score, 0) / newCovered.length;
      const value = newCovered.length * avgScore;
      if (value > bestValue) {
        bestValue = value;
        bestDroneId = dId;
      }
    }

    if (!bestDroneId) break;

    const d = drones.find(dr => dr.id === bestDroneId)!;
    const newCoveredIds = Object.keys(scored[bestDroneId]).filter(uid => uncoveredSet.has(uid));
    const ucDetails = newCoveredIds.map(uid => {
      const uc = useCases.find(u => u.use_case_id === uid)!;
      return {
        use_case_id: uid,
        use_case: uc.use_case_name,
        department: uc.department,
        score: scored[bestDroneId!][uid].total_score,
      };
    }).sort((a, b) => b.score - a.score);

    // Aggregate breakdown averages
    const breakdownKeys = Object.keys(WEIGHTS);
    const breakdownAvg: Record<string, number> = {};
    for (const k of breakdownKeys) {
      breakdownAvg[k] = Math.round(
        newCoveredIds.reduce((s, uid) => s + (scored[bestDroneId!][uid].breakdown[k] || 0), 0) / newCoveredIds.length * 10
      ) / 10;
    }

    fleet.push({
      drone_id: d.id,
      drone: `${d.manufacturer} ${d.model}`,
      manufacturer: d.manufacturer,
      model: d.model,
      price_eur: d.price_eur_estimate || 'Fetch quote',
      price_nok: d.price_nok_estimate,
      drone_type: d.drone_type || '',
      covers_n_use_cases: newCoveredIds.length,
      covered: ucDetails,
      departments: [...new Set(ucDetails.map(x => x.department))].sort(),
      avg_score: Math.round(ucDetails.reduce((s, x) => s + x.score, 0) / ucDetails.length * 10) / 10,
      breakdown_avg: breakdownAvg,
    });

    for (const uid of newCoveredIds) uncoveredSet.delete(uid);
    usedDroneIds.add(bestDroneId);
  }

  return { fleet, uncovered: uncoveredSet.size };
}

// ============================================================
// EDGE FUNCTION HANDLER
// ============================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      municipality_name,
      use_case_ids,
      department_names,
      max_platforms = 5,
      // Legacy params still supported
      maturity_level,
      budget_range,
      sensor_needs,
      municipal_data = {},
      area_km2,
    } = await req.json();

    // Fetch drones and use cases from DB
    const [dronesRes, ucRes] = await Promise.all([
      supabase.from('drone_platforms').select('*'),
      supabase.from('use_case_requirements').select('*'),
    ]);

    if (dronesRes.error) throw dronesRes.error;
    if (ucRes.error) throw ucRes.error;

    const allDrones = dronesRes.data || [];
    let useCases = ucRes.data || [];

    // Filter use cases by IDs or department names if provided
    if (use_case_ids && use_case_ids.length > 0) {
      useCases = useCases.filter((uc: any) => use_case_ids.includes(uc.use_case_id));
    } else if (department_names && department_names.length > 0) {
      const deptLower = department_names.map((d: string) => d.toLowerCase());
      useCases = useCases.filter((uc: any) => {
        const ucDept = (uc.department || '').toLowerCase();
        const shared = (uc.shared_departments || []).map((s: string) => s.toLowerCase());
        return deptLower.some((d: string) =>
          ucDept.includes(d) || d.includes(ucDept) ||
          shared.some((s: string) => s.includes(d) || d.includes(s))
        );
      });
    }

    // Run the 3-step algorithm
    const { fleet, uncovered } = optimizeFleet(allDrones, useCases, max_platforms);

    // Also compute per-use-case top matches for detailed view
    const perUseCaseTop: Record<string, Array<{ drone: string; drone_id: string; score: number; breakdown: Record<string, number> }>> = {};
    for (const uc of useCases) {
      const matches: Array<{ drone: string; drone_id: string; score: number; breakdown: Record<string, number> }> = [];
      for (const d of allDrones) {
        const [passed] = hardFilter(d, uc);
        if (!passed) continue;
        const s = calculateScore(d, uc);
        if (s.total_score >= 45) {
          matches.push({
            drone: `${d.manufacturer} ${d.model}`,
            drone_id: d.id,
            score: s.total_score,
            breakdown: s.breakdown,
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
        algorithm_version: 'haiko-radar-v1',
        fleet,
        total_use_cases: useCases.length,
        covered_use_cases: totalCoveredUCs,
        uncovered_use_cases: uncovered,
        per_use_case_top: perUseCaseTop,
        scoring_weights: WEIGHTS,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Platform recommendation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Platform recommendation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
