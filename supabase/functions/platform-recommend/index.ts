import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Use cases that require thermal sensors
const THERMAL_USE_CASES = ['UC05', 'UC10', 'UC13', 'UC18', 'UC26'];
// Use cases that require AED-capable drone (Matrice 350 or similar heavy-lift)
const AED_USE_CASES = ['UC22'];
// Use cases best served by fixed-wing for large area mapping
const MAPPING_USE_CASES = ['UC03', 'UC09', 'UC15', 'UC23', 'UC24', 'UC25'];

// Flight hours estimation per use case based on municipal data
function estimateFlightHours(ucId: string, municipalData: {
  road_km?: number | null;
  buildings?: number | null;
  va_km?: number | null;
  area_km2?: number | null;
}): { hours: number; basis: string } {
  const { road_km, buildings, va_km, area_km2 } = municipalData;
  switch (ucId) {
    case 'UC06': case 'UC08': return { hours: (road_km || 200) * 0.15, basis: `${road_km || 200} km vei × 0.15t/km` };
    case 'UC01': case 'UC17': return { hours: (buildings || 5000) * 0.05, basis: `${buildings || 5000} bygg × 0.05t` };
    case 'UC04': case 'UC05': return { hours: (va_km || 100) * 0.2, basis: `${va_km || 100} km VA × 0.2t/km` };
    case 'UC12': return { hours: 50, basis: 'Fast 50t/år (SAR beredskap)' };
    case 'UC13': case 'UC14': return { hours: 30, basis: 'Fast 30t/år (brannberedskap)' };
    case 'UC09': case 'UC11': case 'UC15': case 'UC25': case 'UC26':
      return { hours: (area_km2 || 500) * 0.002, basis: `${area_km2 || 500} km² × 0.002t/km²` };
    case 'UC02': case 'UC03': case 'UC23': case 'UC24':
      return { hours: Math.max(20, (area_km2 || 200) * 0.005), basis: `Kartlegging: ${area_km2 || 200} km²` };
    case 'UC18': return { hours: (buildings || 3000) * 0.03, basis: `${buildings || 3000} bygg × 0.03t termisk` };
    case 'UC07': case 'UC29': return { hours: 40, basis: 'Fast 40t/år (trafikk)' };
    case 'UC19': case 'UC20': return { hours: 15, basis: 'Fast 15t/år (kultur/markedsføring)' };
    case 'UC21': case 'UC22': return { hours: 100, basis: 'Fast 100t/år (levering/beredskap)' };
    default: return { hours: 10, basis: 'Estimat 10t/år' };
  }
}

// Map use cases to departments
const UC_DEPARTMENT: Record<string, string> = {
  'UC01': 'plan', 'UC02': 'plan', 'UC03': 'plan',
  'UC04': 'va', 'UC05': 'va',
  'UC06': 'teknisk', 'UC07': 'teknisk', 'UC08': 'teknisk',
  'UC09': 'miljo', 'UC10': 'miljo', 'UC11': 'miljo',
  'UC12': 'brann', 'UC13': 'brann', 'UC14': 'brann',
  'UC15': 'landbruk', 'UC16': 'landbruk',
  'UC17': 'eiendom', 'UC18': 'eiendom',
  'UC19': 'kultur', 'UC20': 'kultur',
  'UC21': 'helse', 'UC22': 'helse',
  'UC23': 'geodata', 'UC24': 'geodata',
  'UC25': 'skog', 'UC26': 'skog',
  'UC27': 'havbruk', 'UC28': 'havbruk',
  'UC29': 'smart_by', 'UC30': 'smart_by',
};

const DEPT_NAMES: Record<string, string> = {
  'plan': 'Plan og bygg', 'va': 'Vann og avløp', 'teknisk': 'Teknisk drift',
  'miljo': 'Miljø og klima', 'brann': 'Brann og redning', 'landbruk': 'Landbruk',
  'eiendom': 'Eiendom', 'kultur': 'Kultur og turisme', 'helse': 'Helse og omsorg',
  'geodata': 'Geodata', 'skog': 'Skogbruk', 'havbruk': 'Havbruk',
  'smart_by': 'Smart by',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      maturity_level,
      use_case_ids = [],
      budget_range,
      sensor_needs,
      municipal_data = {},
      area_km2,
    } = await req.json();

    // Build query
    let query = supabase.from('drone_platforms').select('*');
    if (maturity_level && maturity_level <= 2) {
      query = query.in('easa_category', ['Open']);
    }
    const { data: platforms, error } = await query.order('price_nok_estimate');
    if (error) throw error;

    // Check special requirements
    const needsThermal = use_case_ids.some((id: string) => THERMAL_USE_CASES.includes(id));
    const needsAED = use_case_ids.some((id: string) => AED_USE_CASES.includes(id));
    const needsMapping = use_case_ids.some((id: string) => MAPPING_USE_CASES.includes(id));
    const largeArea = (area_km2 || 0) > 500;

    // Score and rank platforms
    const scored = (platforms || []).map(platform => {
      let score = 0;
      const reasons: string[] = [];

      // Use case match
      if (use_case_ids.length > 0) {
        const matchCount = (platform.suitable_use_cases || []).filter(
          (uc: string) => use_case_ids.includes(uc)
        ).length;
        const matchPercent = matchCount / use_case_ids.length;
        score += matchPercent * 40;
        if (matchPercent > 0.5) reasons.push(`Dekker ${matchCount}/${use_case_ids.length} bruksområder`);
      }

      // Sensor match
      if (sensor_needs && sensor_needs.length > 0) {
        const sensorMatch = (platform.sensor_types || []).filter(
          (s: string) => sensor_needs.includes(s)
        ).length;
        score += (sensorMatch / sensor_needs.length) * 25;
        if (sensorMatch > 0) reasons.push(`Har ${sensorMatch}/${sensor_needs.length} ønskede sensorer`);
      }

      // Thermal requirement
      if (needsThermal) {
        const hasThermal = (platform.sensor_types || []).includes('Thermal');
        if (hasThermal) { score += 15; reasons.push('Termisk kamera (påkrevd)'); }
        else { score -= 10; }
      }

      // Budget match
      if (budget_range) {
        const price = platform.price_nok_estimate || 0;
        if (price <= budget_range.max) { score += 15; reasons.push('Innenfor budsjett'); }
        else { reasons.push('Over budsjett'); }
      }

      // Operational robustness
      if (platform.has_rtk) { score += 5; reasons.push('RTK-støtte'); }
      if (platform.ip_rating) { score += 5; reasons.push(`${platform.ip_rating} værbestandig`); }
      if (platform.max_flight_time_min && platform.max_flight_time_min >= 40) {
        score += 5; reasons.push(`${platform.max_flight_time_min} min flytid`);
      }

      // Prefer lowest MTOM that covers use case (minimises permit burden)
      const weight = platform.max_takeoff_weight_kg || 0;
      if (weight < 0.25) score += 8;
      else if (weight < 0.9) score += 5;
      else if (weight < 4) score += 3;

      // Maturity alignment
      if (maturity_level) {
        if (maturity_level <= 1 && platform.category === 'consumer') score += 5;
        if (maturity_level === 2 && platform.category === 'prosumer') score += 5;
        if (maturity_level >= 3 && (platform.category === 'enterprise' || platform.category === 'industrial')) score += 5;
      }

      return { ...platform, match_score: Math.round(score), match_reasons: reasons };
    });

    scored.sort((a: any, b: any) => b.match_score - a.match_score);

    // Calculate flight hours per use case and department
    const flightHoursByUc = use_case_ids.map((ucId: string) => {
      const est = estimateFlightHours(ucId, municipal_data);
      return { use_case_id: ucId, department: UC_DEPARTMENT[ucId] || 'annet', ...est };
    });

    // Aggregate flight hours per department
    const deptHours: Record<string, { total_hours: number; use_cases: string[] }> = {};
    for (const fh of flightHoursByUc) {
      if (!deptHours[fh.department]) deptHours[fh.department] = { total_hours: 0, use_cases: [] };
      deptHours[fh.department].total_hours += fh.hours;
      deptHours[fh.department].use_cases.push(fh.use_case_id);
    }

    // Determine drones needed per department (200 productive hours/year baseline)
    const HOURS_PER_DRONE_YEAR = 200;
    const departmentNeeds = Object.entries(deptHours).map(([deptId, data]) => ({
      department_id: deptId,
      department_name: DEPT_NAMES[deptId] || deptId,
      annual_flight_hours: Math.round(data.total_hours),
      use_cases: data.use_cases,
      drones_needed: Math.max(1, Math.ceil(data.total_hours / HOURS_PER_DRONE_YEAR)),
    }));

    // Consolidation logic
    const consolidation = calculateConsolidation(departmentNeeds, scored.slice(0, 10));

    // Total program cost
    const topPlatforms = scored.slice(0, 5);
    const totalDronesNeeded = departmentNeeds.reduce((sum: number, d: any) => sum + d.drones_needed, 0);
    const avgPrice = topPlatforms.length > 0
      ? topPlatforms.reduce((s: number, p: any) => s + (p.price_nok_estimate || 0), 0) / topPlatforms.length
      : 25000;
    const permitCostPerAuth = 45000;
    const totalFlightHours = departmentNeeds.reduce((s: number, d: any) => s + d.annual_flight_hours, 0);

    const programCost = {
      hardware_total: Math.round(totalDronesNeeded * avgPrice),
      permit_setup_cost: consolidation.shared_groups.length * permitCostPerAuth,
      drones_needed: totalDronesNeeded,
      consolidated_drones_needed: consolidation.consolidated_drone_count,
      consolidated_hardware_total: Math.round(consolidation.consolidated_drone_count * avgPrice),
      consolidated_permit_cost: consolidation.consolidated_permit_count * permitCostPerAuth,
      savings_nok: Math.round((totalDronesNeeded - consolidation.consolidated_drone_count) * avgPrice),
      total_annual_flight_hours: Math.round(totalFlightHours),
    };

    return new Response(
      JSON.stringify({
        success: true,
        platforms: scored.slice(0, 10),
        total_available: scored.length,
        flight_hours: flightHoursByUc,
        department_needs: departmentNeeds,
        consolidation,
        program_cost: programCost,
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

function calculateConsolidation(
  departmentNeeds: Array<{ department_id: string; department_name: string; annual_flight_hours: number; use_cases: string[]; drones_needed: number }>,
  platforms: any[]
): {
  shared_groups: Array<{ departments: string[]; shared_drone_type: string; combined_hours: number; can_share: boolean; reason: string }>;
  consolidated_drone_count: number;
  consolidated_permit_count: number;
  recommendations: string[];
} {
  const groups: Array<{ departments: string[]; shared_drone_type: string; combined_hours: number; can_share: boolean; reason: string }> = [];
  const recommendations: string[] = [];
  const processed = new Set<string>();
  const MAX_SHARED_HOURS = 400;

  // Emergency services can't share easily with scheduled inspections
  const emergencyDepts = new Set(['brann', 'helse']);
  const scheduledDepts = new Set(['teknisk', 'plan', 'va', 'eiendom', 'geodata', 'miljo', 'kultur']);

  for (let i = 0; i < departmentNeeds.length; i++) {
    if (processed.has(departmentNeeds[i].department_id)) continue;

    const dept1 = departmentNeeds[i];
    let bestPartner = null;
    let bestCombinedHours = 0;

    for (let j = i + 1; j < departmentNeeds.length; j++) {
      if (processed.has(departmentNeeds[j].department_id)) continue;
      const dept2 = departmentNeeds[j];

      // Check overlap in use cases
      const overlap = dept1.use_cases.some(uc => dept2.use_cases.includes(uc));
      const combinedHours = dept1.annual_flight_hours + dept2.annual_flight_hours;

      // Don't share if emergency + scheduled
      const isEmergency1 = emergencyDepts.has(dept1.department_id);
      const isEmergency2 = emergencyDepts.has(dept2.department_id);
      if ((isEmergency1 && !isEmergency2) || (!isEmergency1 && isEmergency2)) continue;

      if (overlap && combinedHours <= MAX_SHARED_HOURS) {
        if (!bestPartner || combinedHours > bestCombinedHours) {
          bestPartner = dept2;
          bestCombinedHours = combinedHours;
        }
      }
    }

    if (bestPartner) {
      processed.add(dept1.department_id);
      processed.add(bestPartner.department_id);
      groups.push({
        departments: [dept1.department_name, bestPartner.department_name],
        shared_drone_type: platforms[0] ? `${platforms[0].manufacturer} ${platforms[0].model}` : 'TBD',
        combined_hours: Math.round(dept1.annual_flight_hours + bestPartner.annual_flight_hours),
        can_share: true,
        reason: 'Overlappende bruksområder, samlet flytid under 400t/år',
      });
      recommendations.push(`${dept1.department_name} og ${bestPartner.department_name} kan dele drone (${Math.round(dept1.annual_flight_hours + bestPartner.annual_flight_hours)}t/år samlet)`);
    } else {
      processed.add(dept1.department_id);
      groups.push({
        departments: [dept1.department_name],
        shared_drone_type: platforms[0] ? `${platforms[0].manufacturer} ${platforms[0].model}` : 'TBD',
        combined_hours: Math.round(dept1.annual_flight_hours),
        can_share: false,
        reason: emergencyDepts.has(dept1.department_id) ? 'Beredskap krever dedikert tilgang' : 'Ikke overlappende bruksområder eller for høy samlet utnyttelse',
      });
    }
  }

  const consolidatedDrones = groups.reduce((sum, g) => sum + Math.max(1, Math.ceil(g.combined_hours / 200)), 0);
  const consolidatedPermits = groups.length;

  return {
    shared_groups: groups,
    consolidated_drone_count: consolidatedDrones,
    consolidated_permit_count: consolidatedPermits,
    recommendations,
  };
}
