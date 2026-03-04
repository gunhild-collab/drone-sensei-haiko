import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// SORA 2.5 GRC intrinsic determination table
// Based on Luftfartstilsynet SORA methodology and EASA AMC/GM
// Rows: max characteristic dimension / kinetic energy
// Cols: operational scenario (VLOS over controlled, VLOS over sparsely, VLOS over populated, BVLOS over controlled, BVLOS over sparsely, BVLOS over populated)
const GRC_TABLE: Record<string, number[]> = {
  // [VLOS-ctrl, VLOS-sparse, VLOS-populated, BVLOS-ctrl, BVLOS-sparse, BVLOS-populated]
  '1m_lte700J':  [1, 2, 3, 3, 4, 5],
  '3m_lte34kJ':  [2, 3, 4, 4, 5, 6],
  '8m_lte1084kJ':[3, 4, 5, 5, 6, 8],
  'gt8m':        [4, 5, 6, 6, 8, 10],
};

// ARC initial determination based on airspace type
// a=lowest (segregated), b=atypical, c=below FL600 where ATC not req, d=controlled
const ARC_LEVELS = ['ARC-a', 'ARC-b', 'ARC-c', 'ARC-d'] as const;

// SAIL determination matrix: final GRC (rows) x residual ARC (cols)
// ARC-a, ARC-b, ARC-c, ARC-d
const SAIL_MATRIX: Record<number, number[]> = {
  1: [1, 1, 2, 4],
  2: [1, 1, 2, 4],
  3: [2, 2, 3, 5],
  4: [2, 2, 4, 5],
  5: [3, 3, 4, 6],
  6: [3, 4, 5, 6],
  7: [4, 5, 6, 6],
};

// TMPR levels based on residual ARC
const TMPR_MAP: Record<string, { level: string; description_no: string }> = {
  'ARC-a': { level: 'Ingen', description_no: 'Ingen krav til taktisk mitigering (segregert/uvanlig luftrom)' },
  'ARC-b': { level: 'Lav', description_no: 'Grunnleggende DAA eller prosedyrer for å unngå kollisjon med bemannet luftfart' },
  'ARC-c': { level: 'Middels', description_no: 'DAA-system eller luftromsobservatør påkrevet. Koordinering med ATC anbefales.' },
  'ARC-d': { level: 'Høy', description_no: 'Avansert DAA-system og/eller ATC-koordinering påkrevet. Transponder kan kreves.' },
};

// Population density thresholds for EASA SORA ground risk
// Based on EASA population density map categories
function getPopulationCategory(densityPerSqKm: number | null): string {
  if (!densityPerSqKm || densityPerSqKm < 50) return 'sparsely_populated';
  if (densityPerSqKm < 500) return 'populated';
  return 'densely_populated';
}

function getGrcSizeClass(mtow_kg: number | null, maxDim_m?: number): string {
  // Estimate characteristic dimension from MTOW if not provided
  const weight = mtow_kg || 0.25;
  if (weight <= 0.25) return '1m_lte700J';
  if (weight <= 4) return '1m_lte700J';
  if (weight <= 25) return '3m_lte34kJ';
  if (weight <= 150) return '8m_lte1084kJ';
  return 'gt8m';
}

function getGrcScenarioIndex(isVlos: boolean, popCategory: string): number {
  // Map to column index in GRC table
  if (isVlos) {
    if (popCategory === 'sparsely_populated') return 1;
    if (popCategory === 'populated') return 2;
    return 0; // controlled
  } else {
    if (popCategory === 'sparsely_populated') return 4;
    if (popCategory === 'populated') return 5;
    return 3; // controlled
  }
}

function getInitialArc(altitude_m: number, isControlled: boolean): string {
  if (isControlled) return 'ARC-d';
  if (altitude_m > 120) return 'ARC-c';
  if (altitude_m > 60) return 'ARC-b';
  return 'ARC-a';
}

function getSail(finalGrc: number, arcIndex: number): number {
  const clampedGrc = Math.max(1, Math.min(7, finalGrc));
  return SAIL_MATRIX[clampedGrc][arcIndex];
}

// Determine allowed EASA/CAA categories based on drone specs
function getAllowedCategories(mtow_kg: number | null, cClass: string | null, hasRtk: boolean): {
  categories: string[];
  sts_eligible: string[];
  certifications_no: string[];
  luftfartstilsynet_refs: string[];
} {
  const weight = mtow_kg || 0;
  const categories: string[] = [];
  const sts_eligible: string[] = [];
  const certs: string[] = [];
  const refs: string[] = [];

  // Open A1
  if (weight < 0.25 || cClass === 'C0' || cClass === 'C1') {
    categories.push('Open A1');
    certs.push('A1/A3 nettbasert opplæring');
    refs.push('EU 2019/947 UAS.OPEN.020');
  }

  // Open A2
  if (cClass === 'C2' || (weight <= 4 && weight > 0.25)) {
    categories.push('Open A2');
    certs.push('A2 tilleggseksamen (trafikkstasjon)');
    refs.push('EU 2019/947 UAS.OPEN.030');
  }

  // Open A3
  if (weight <= 25) {
    categories.push('Open A3');
    certs.push('A1/A3 nettbasert opplæring');
    refs.push('EU 2019/947 UAS.OPEN.040');
  }

  // STS eligibility
  if (cClass === 'C5' || weight <= 25) {
    sts_eligible.push('STS-01 (VLOS over kontrollert bakkeområde)');
    certs.push('STS-eksamen ved trafikkstasjon');
    refs.push('EU 2019/947 UAS.STS-01');
  }

  if (cClass === 'C6' || (weight <= 25 && hasRtk)) {
    sts_eligible.push('STS-02 (BVLOS maks 2km, tynt befolket)');
    refs.push('EU 2019/947 UAS.STS-02');
  }

  return { categories, sts_eligible, certifications_no: [...new Set(certs)], luftfartstilsynet_refs: [...new Set(refs)] };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      platform_ids,
      municipality_name,
      population_density,
      use_case_ids,
      altitude_m = 120,
      is_controlled_airspace = false,
      is_bvlos = false,
    } = await req.json();

    // Fetch platforms
    let query = supabase.from('drone_platforms').select('*');
    if (platform_ids && platform_ids.length > 0) {
      query = query.in('id', platform_ids);
    }
    const { data: platforms, error: platErr } = await query;
    if (platErr) throw platErr;

    // Population density category
    const popCategory = getPopulationCategory(population_density);
    const isVlos = !is_bvlos;

    // Calculate SORA for each platform
    const results = (platforms || []).map(platform => {
      const sizeClass = getGrcSizeClass(platform.max_takeoff_weight_kg);
      const scenarioIdx = getGrcScenarioIndex(isVlos, popCategory);
      const intrinsicGrc = GRC_TABLE[sizeClass][scenarioIdx];

      // GRC mitigations (M1: strategic mitigations for ground risk)
      let grcReduction = 0;
      // M1 - If over controlled ground area (buffer zone established)
      if (popCategory === 'sparsely_populated') grcReduction += 1;
      // M2 - Effects of ground impact reduced (parachute, frangibility)
      if (platform.max_takeoff_weight_kg && platform.max_takeoff_weight_kg < 4) grcReduction += 1;
      // M3 - ERP in place (assumed from maturity)
      // Conservative: don't reduce without evidence

      const finalGrc = Math.max(1, intrinsicGrc - grcReduction);

      // ARC determination
      const initialArc = getInitialArc(altitude_m, is_controlled_airspace);
      const arcIndex = ARC_LEVELS.indexOf(initialArc as any);

      // Residual ARC (strategic mitigations for air risk)
      let residualArcIndex = arcIndex;
      // If operating below 120m in uncontrolled airspace, can potentially reduce ARC
      if (!is_controlled_airspace && altitude_m <= 120) {
        residualArcIndex = Math.max(0, arcIndex - 1);
      }
      const residualArc = ARC_LEVELS[residualArcIndex];

      // SAIL
      const sail = finalGrc > 7 ? 'Sertifisert kategori' : getSail(finalGrc, residualArcIndex);

      // TMPR
      const tmpr = TMPR_MAP[residualArc];

      // Allowed categories from CAA/Luftfartstilsynet
      const catInfo = getAllowedCategories(
        platform.max_takeoff_weight_kg,
        platform.c_class,
        platform.has_rtk || false
      );

      // Determine if SORA application needed
      const needsSora = finalGrc > 3 || arcIndex >= 2;
      const needsSts = !needsSora && finalGrc > 1;

      return {
        platform_id: platform.id,
        platform_name: `${platform.manufacturer} ${platform.model}`,
        max_takeoff_weight_kg: platform.max_takeoff_weight_kg,
        c_class: platform.c_class,
        easa_category: platform.easa_category,

        sora: {
          intrinsic_grc: intrinsicGrc,
          grc_mitigations: grcReduction,
          final_grc: finalGrc,
          grc_size_class: sizeClass,
          population_category: popCategory,
          scenario: isVlos ? 'VLOS' : 'BVLOS',

          initial_arc: initialArc,
          residual_arc: residualArc,
          arc_mitigations: arcIndex !== residualArcIndex ? 'Strategisk mitigering anvendt' : 'Ingen reduksjon',

          sail: sail,
          sail_description: typeof sail === 'number'
            ? `SAIL ${sail} – ${sail <= 2 ? 'Lav kompleksitet' : sail <= 4 ? 'Middels kompleksitet' : 'Høy kompleksitet'}`
            : 'Operasjonen krever sertifisert kategori (GRC > 7)',

          tmpr: tmpr,

          needs_sora_application: needsSora,
          needs_sts: needsSts,
          recommendation_no: needsSora
            ? 'Krever SORA-søknad til Luftfartstilsynet (spesifikk kategori)'
            : needsSts
              ? 'Kan deklareres via STS til Luftfartstilsynet'
              : 'Kan opereres i åpen kategori',
        },

        caa_compliance: catInfo,

        operational_limits: {
          max_altitude_m: is_controlled_airspace ? 'Krever ATC-klarering' : 120,
          vlos_required: isVlos,
          min_distance_people_m: platform.c_class === 'C2' ? 30 : platform.c_class === 'C1' ? 0 : 150,
          requires_operator_registration: true,
          requires_insurance: true,
        },
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        municipality: municipality_name,
        population_density,
        population_category: popCategory,
        scenario: {
          altitude_m,
          is_controlled_airspace,
          is_bvlos,
        },
        assessments: results,
        references: {
          sora: 'JARUS SORA 2.5 / EASA AMC1 to Article 11',
          caa: 'Luftfartstilsynet – EU 2019/947, EU 2019/945',
          population_density: 'EASA Statistical Population Density Map (EC JRC Census 2021)',
          url_caa: 'https://www.luftfartstilsynet.no/droner/droneregler/droneregler/',
          url_easa_map: 'https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/statistical-population-density-easa-member-states',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('SORA calculation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'SORA calculation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
