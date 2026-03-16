const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// SSB municipality codes
const MUNICIPALITY_CODES: Record<string, string> = {
  'Oslo': '0301', 'Bergen': '4601', 'Trondheim': '5001', 'Stavanger': '1103',
  'Bærum': '3024', 'Kristiansand': '4204', 'Drammen': '3005', 'Asker': '3025',
  'Lillestrøm': '3030', 'Fredrikstad': '3004', 'Sandnes': '1108', 'Tromsø': '5401',
  'Ålesund': '1507', 'Bodø': '1804', 'Verdal': '5038', 'Steinkjer': '5006',
  'Stjørdal': '5035', 'Levanger': '5037', 'Namsos': '5007', 'Rana': '1833',
  'Narvik': '1806', 'Harstad': '5402', 'Alta': '5403', 'Hammerfest': '5404',
  'Haugesund': '1106', 'Molde': '1506', 'Kristiansund': '1505', 'Gjøvik': '3407',
  'Hamar': '3403', 'Lillehammer': '3405', 'Kongsvinger': '3401',
  'Ullensaker': '3033', 'Sola': '1124', 'Ringebu': '3431',
  'Arendal': '4203', 'Larvik': '3805', 'Sandefjord': '3804', 'Tønsberg': '3803',
  'Skien': '3807', 'Porsgrunn': '3806', 'Moss': '3002', 'Halden': '3001',
  'Sarpsborg': '3003', 'Lørenskog': '3029', 'Karmøy': '1149',
};

// Known population data (fallback)
const POPULATION_DATA: Record<string, number> = {
  'Oslo': 710000, 'Bergen': 290000, 'Trondheim': 210000, 'Stavanger': 145000,
  'Bærum': 130000, 'Kristiansand': 112000, 'Drammen': 101000, 'Asker': 100000,
  'Lillestrøm': 88000, 'Fredrikstad': 84000, 'Sandnes': 80000, 'Tromsø': 78000,
  'Ålesund': 67000, 'Bodø': 53000, 'Verdal': 15000, 'Steinkjer': 22000,
  'Stjørdal': 24000, 'Levanger': 20000, 'Namsos': 13000, 'Rana': 27000,
  'Narvik': 22000, 'Harstad': 25000, 'Alta': 22000, 'Hammerfest': 11000,
  'Haugesund': 37000, 'Molde': 32000, 'Kristiansund': 24000, 'Gjøvik': 30000,
  'Hamar': 32000, 'Lillehammer': 29000, 'Kongsvinger': 17000, 'Ullensaker': 40000,
  'Sola': 27000, 'Ringebu': 4700, 'Arendal': 46000, 'Larvik': 48000,
  'Sandefjord': 65000, 'Tønsberg': 55000, 'Skien': 57000, 'Porsgrunn': 35000,
  'Moss': 33000, 'Halden': 32000, 'Sarpsborg': 61000, 'Lørenskog': 44000,
  'Karmøy': 43000,
};

// Municipal area in km² (approximate)
const AREA_DATA: Record<string, number> = {
  'Oslo': 454, 'Bergen': 465, 'Trondheim': 342, 'Stavanger': 71,
  'Bærum': 191, 'Kristiansand': 560, 'Drammen': 138, 'Asker': 101,
  'Lillestrøm': 78, 'Fredrikstad': 290, 'Sandnes': 304, 'Tromsø': 2566,
  'Ålesund': 99, 'Bodø': 1395, 'Verdal': 1548, 'Steinkjer': 1564,
  'Stjørdal': 541, 'Levanger': 655, 'Namsos': 780, 'Rana': 4460,
  'Narvik': 2023, 'Harstad': 447, 'Alta': 3849, 'Hammerfest': 2653,
  'Haugesund': 73, 'Molde': 1501, 'Kristiansund': 88, 'Gjøvik': 673,
  'Hamar': 351, 'Lillehammer': 477, 'Kongsvinger': 1036, 'Ullensaker': 253,
  'Sola': 70, 'Ringebu': 1291, 'Arendal': 271, 'Larvik': 534,
  'Sandefjord': 416, 'Tønsberg': 329, 'Skien': 779, 'Porsgrunn': 163,
  'Moss': 64, 'Halden': 642, 'Sarpsborg': 407, 'Lørenskog': 71,
  'Karmøy': 233,
};

// SSB centrality index (1=most central, 6=least central)
const CENTRALITY: Record<string, number> = {
  'Oslo': 1, 'Bergen': 1, 'Trondheim': 1, 'Stavanger': 1,
  'Bærum': 1, 'Kristiansand': 2, 'Drammen': 1, 'Asker': 1,
  'Lillestrøm': 1, 'Fredrikstad': 2, 'Sandnes': 1, 'Tromsø': 2,
  'Ålesund': 2, 'Bodø': 3, 'Verdal': 4, 'Steinkjer': 3,
  'Stjørdal': 2, 'Levanger': 3, 'Namsos': 4, 'Rana': 4,
  'Narvik': 4, 'Harstad': 3, 'Alta': 4, 'Hammerfest': 5,
  'Haugesund': 2, 'Molde': 3, 'Kristiansund': 3, 'Gjøvik': 3,
  'Hamar': 2, 'Lillehammer': 3, 'Kongsvinger': 4, 'Ullensaker': 1,
  'Sola': 1, 'Ringebu': 5, 'Arendal': 2, 'Larvik': 2,
  'Sandefjord': 2, 'Tønsberg': 2, 'Skien': 2, 'Porsgrunn': 2,
  'Moss': 2, 'Halden': 3, 'Sarpsborg': 2, 'Lørenskog': 1,
  'Karmøy': 2,
};

// Municipalities with controlled airspace (CTR/ATZ) near airports
const CONTROLLED_AIRSPACE: Record<string, { type: string; airport: string; radius_km: number }> = {
  'Oslo': { type: 'TMA', airport: 'ENGM Gardermoen', radius_km: 30 },
  'Ullensaker': { type: 'CTR', airport: 'ENGM Gardermoen', radius_km: 15 },
  'Lørenskog': { type: 'TMA', airport: 'ENGM Gardermoen', radius_km: 25 },
  'Bærum': { type: 'TMA', airport: 'ENGM/ENRY', radius_km: 20 },
  'Bergen': { type: 'CTR', airport: 'ENBR Flesland', radius_km: 15 },
  'Stavanger': { type: 'CTR', airport: 'ENZV Sola', radius_km: 15 },
  'Sola': { type: 'CTR', airport: 'ENZV Sola', radius_km: 10 },
  'Sandnes': { type: 'TMA', airport: 'ENZV Sola', radius_km: 20 },
  'Trondheim': { type: 'CTR', airport: 'ENVA Værnes', radius_km: 15 },
  'Stjørdal': { type: 'CTR', airport: 'ENVA Værnes', radius_km: 10 },
  'Tromsø': { type: 'CTR', airport: 'ENTC Langnes', radius_km: 10 },
  'Bodø': { type: 'CTR', airport: 'ENBO Bodø', radius_km: 12 },
  'Kristiansand': { type: 'CTR', airport: 'ENCN Kjevik', radius_km: 10 },
  'Ålesund': { type: 'CTR', airport: 'ENAL Vigra', radius_km: 10 },
  'Haugesund': { type: 'CTR', airport: 'ENHD Karmøy', radius_km: 10 },
  'Karmøy': { type: 'CTR', airport: 'ENHD Karmøy', radius_km: 8 },
  'Molde': { type: 'ATZ', airport: 'ENML Årø', radius_km: 8 },
  'Kristiansund': { type: 'ATZ', airport: 'ENKB Kvernberget', radius_km: 8 },
};

// Proximity to national parks / protected areas (Miljødirektoratet)
const PROTECTED_AREAS: Record<string, string[]> = {
  'Ringebu': ['Rondane nasjonalpark'],
  'Lillehammer': ['Langsua nasjonalpark (nærområde)'],
  'Narvik': ['Ofoten landskapsvernområde'],
  'Alta': ['Stabbursdalen nasjonalpark (nærområde)'],
  'Tromsø': ['Lyngen landskapsvernområde'],
  'Rana': ['Saltfjellet–Svartisen nasjonalpark'],
  'Bodø': ['Sjunkhatten nasjonalpark'],
  'Kongsvinger': ['Finnskogen'],
  'Hammerfest': ['Seiland nasjonalpark'],
};

// Municipal services based on population bracket (fallback inference)
function inferServices(population: number | null): {
  active_services: string[];
  departments: Array<{ id: string; name: string; relevant_use_cases: string[] }>;
} {
  const pop = population || 5000;

  const baseDepts = [
    { id: 'teknisk', name: 'Teknisk drift', relevant_use_cases: ['UC06', 'UC04', 'UC17'] },
    { id: 'plan', name: 'Plan og bygg', relevant_use_cases: ['UC01', 'UC02', 'UC03'] },
    { id: 'brann', name: 'Brann og redning', relevant_use_cases: ['UC12', 'UC13', 'UC14'] },
    { id: 'miljo', name: 'Miljø og klima', relevant_use_cases: ['UC09', 'UC10', 'UC11'] },
  ];

  if (pop < 5000) {
    return {
      active_services: ['Teknisk drift', 'Plan og bygg', 'Brann (IKS)', 'Landbruk'],
      departments: [
        ...baseDepts,
        { id: 'landbruk', name: 'Landbruk', relevant_use_cases: ['UC15', 'UC16'] },
      ],
    };
  }

  if (pop < 20000) {
    return {
      active_services: ['Teknisk drift', 'Plan og bygg', 'Brann og redning', 'VA', 'Miljø', 'Eiendom', 'Landbruk'],
      departments: [
        ...baseDepts,
        { id: 'va', name: 'Vann og avløp', relevant_use_cases: ['UC04', 'UC05'] },
        { id: 'eiendom', name: 'Eiendom', relevant_use_cases: ['UC17', 'UC18'] },
        { id: 'landbruk', name: 'Landbruk', relevant_use_cases: ['UC15', 'UC16'] },
      ],
    };
  }

  // Urban (>20k)
  return {
    active_services: ['Teknisk drift', 'Plan og bygg', 'Brann og redning', 'VA', 'Miljø', 'Eiendom', 'Geodata', 'Kultur', 'Helse'],
    departments: [
      ...baseDepts,
      { id: 'va', name: 'Vann og avløp', relevant_use_cases: ['UC04', 'UC05'] },
      { id: 'eiendom', name: 'Eiendom', relevant_use_cases: ['UC17', 'UC18'] },
      { id: 'geodata', name: 'Geodata', relevant_use_cases: ['UC23', 'UC24'] },
      { id: 'kultur', name: 'Kultur og turisme', relevant_use_cases: ['UC19', 'UC20'] },
      { id: 'helse', name: 'Helse og omsorg', relevant_use_cases: ['UC21', 'UC22'] },
    ],
  };
}

function getPopulationBracket(pop: number | null): string {
  if (!pop || pop < 5000) return 'small_rural';
  if (pop < 20000) return 'mid_tier';
  return 'urban';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { municipality_name } = await req.json();
    if (!municipality_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Municipality name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const municipalityCode = MUNICIPALITY_CODES[municipality_name];
    const knownPopulation = POPULATION_DATA[municipality_name];
    const areaKm2 = AREA_DATA[municipality_name] || null;
    const centrality = CENTRALITY[municipality_name] || null;
    const indicators: Array<{ id: string; name: string; value: number; unit: string; year?: string }> = [];
    let ssbSuccess = false;

    // Try SSB API for population data (table 07459)
    if (municipalityCode) {
      try {
        // Use v1 POST API for table 07459
        const ssbUrl = 'https://data.ssb.no/api/v0/en/table/07459';
        const query = {
          query: [
            { code: 'Region', selection: { filter: 'item', values: [municipalityCode] } },
            { code: 'Kjonn', selection: { filter: 'all', values: ['*'] } },
            { code: 'Alder', selection: { filter: 'all', values: ['*'] } },
            { code: 'Tid', selection: { filter: 'top', values: ['1'] } },
          ],
          response: { format: 'json-stat2' },
        };

        console.log(`Fetching SSB v1 data for ${municipality_name} (${municipalityCode})`);
        const resp = await fetch(ssbUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query),
          signal: AbortSignal.timeout(8000),
        });

        console.log(`SSB response status: ${resp.status}`);
        if (resp.ok) {
          const data = await resp.json();
          // Sum all values (all ages × both sexes) to get total population
          if (data.value && data.value.length > 0) {
            const pop = data.value.reduce((sum: number, v: number | null) => sum + (v || 0), 0);
            const timeDim = data.dimension?.Tid;
            let year = '2025';
            if (timeDim?.category?.label) {
              const labels = Object.values(timeDim.category.label) as string[];
              year = labels[labels.length - 1] || year;
            }
            console.log(`SSB population for ${municipality_name}: ${pop} (year: ${year}), values count: ${data.value.length}`);
            indicators.push({ id: 'population', name: 'Folkemengde', value: pop, unit: 'personer', year });
            ssbSuccess = true;
          }
        } else {
          const errText = await resp.text();
          console.log(`SSB API error ${resp.status}: ${errText}`);
        }
      } catch (e) {
        console.log('SSB API error:', e);
      }
    }

    // Fall back to known data
    if (!ssbSuccess && knownPopulation) {
      indicators.push({ id: 'population', name: 'Folkemengde', value: knownPopulation, unit: 'personer', year: '2024' });
    }

    const population = indicators.find(i => i.id === 'population')?.value || null;
    const bracket = getPopulationBracket(population);

    // Add area
    if (areaKm2) {
      indicators.push({ id: 'area_km2', name: 'Areal', value: areaKm2, unit: 'km²', year: '2024' });
    }

    // Derive drone-relevant metrics
    const popDensity = population && areaKm2 ? Math.round(population / areaKm2) : null;
    const estimatedRoadKm = population ? Math.round(population * 0.015) : null;
    const estimatedBuildings = population ? Math.round(population * 0.4) : null;
    const estimatedVaKm = population ? Math.round(population * 0.01) : null;
    const estimatedAgriLand = areaKm2 ? Math.round(areaKm2 * (bracket === 'small_rural' ? 0.15 : bracket === 'mid_tier' ? 0.1 : 0.03)) : null;

    if (popDensity) indicators.push({ id: 'pop_density', name: 'Befolkningstetthet', value: popDensity, unit: 'innb./km²' });
    if (estimatedRoadKm) indicators.push({ id: 'road_km', name: 'Kommunale veier (est.)', value: estimatedRoadKm, unit: 'km' });
    if (estimatedBuildings) indicators.push({ id: 'buildings', name: 'Bygninger (est.)', value: estimatedBuildings, unit: 'stk' });
    if (estimatedVaKm) indicators.push({ id: 'va_km', name: 'VA-ledningsnett (est.)', value: estimatedVaKm, unit: 'km' });
    if (estimatedAgriLand) indicators.push({ id: 'agri_km2', name: 'Jordbruksareal (est.)', value: estimatedAgriLand, unit: 'km²' });

    // Services and departments
    const services = inferServices(population);

    // Airspace and protected areas
    const airspace = CONTROLLED_AIRSPACE[municipality_name] || null;
    const protectedAreas = PROTECTED_AREAS[municipality_name] || [];

    const droneRelevance = {
      population_density: popDensity,
      population_bracket: bracket,
      estimated_road_km: estimatedRoadKm,
      estimated_buildings: estimatedBuildings,
      estimated_va_km: estimatedVaKm,
      estimated_agri_km2: estimatedAgriLand,
      infrastructure_complexity: population && population > 50000 ? 'Høy' : population && population > 10000 ? 'Middels' : 'Lav',
      centrality_index: centrality,
      urban_rural: centrality ? (centrality <= 2 ? 'Urban' : centrality <= 4 ? 'Halvsentral' : 'Rural') : null,
      controlled_airspace: airspace,
      protected_areas: protectedAreas,
    };

    return new Response(
      JSON.stringify({
        success: true,
        source: ssbSuccess ? 'ssb' : knownPopulation ? 'fallback' : 'estimated',
        municipality: municipality_name,
        municipality_code: municipalityCode || null,
        area_km2: areaKm2,
        indicators,
        drone_relevance: droneRelevance,
        services,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching KOSTRA data:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch KOSTRA data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
