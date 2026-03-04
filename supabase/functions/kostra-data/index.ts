const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// SSB municipality codes (K-prefixed for v0 API)
const MUNICIPALITY_CODES: Record<string, string> = {
  'Oslo': 'K-0301', 'Bergen': 'K-4601', 'Trondheim': 'K-5001', 'Stavanger': 'K-1103',
  'Bærum': 'K-3024', 'Kristiansand': 'K-4204', 'Drammen': 'K-3005', 'Asker': 'K-3025',
  'Lillestrøm': 'K-3030', 'Fredrikstad': 'K-3004', 'Sandnes': 'K-1108', 'Tromsø': 'K-5401',
  'Ålesund': 'K-1507', 'Bodø': 'K-1804', 'Verdal': 'K-5038', 'Steinkjer': 'K-5006',
  'Stjørdal': 'K-5035', 'Levanger': 'K-5037', 'Namsos': 'K-5007', 'Rana': 'K-1833',
  'Narvik': 'K-1806', 'Harstad': 'K-5402', 'Alta': 'K-5403', 'Hammerfest': 'K-5404',
  'Haugesund': 'K-1106', 'Molde': 'K-1506', 'Kristiansund': 'K-1505', 'Gjøvik': 'K-3407',
  'Hamar': 'K-3403', 'Lillehammer': 'K-3405', 'Kongsvinger': 'K-3401',
  'Ullensaker': 'K-3033', 'Sola': 'K-1124', 'Ringebu': 'K-3431',
  'Arendal': 'K-4203', 'Larvik': 'K-3805', 'Sandefjord': 'K-3804', 'Tønsberg': 'K-3803',
  'Skien': 'K-3807', 'Porsgrunn': 'K-3806', 'Moss': 'K-3002', 'Halden': 'K-3001',
  'Sarpsborg': 'K-3003', 'Lørenskog': 'K-3029', 'Karmøy': 'K-1149',
};

// Known population data from the CSV (as fallback)
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
    const indicators: Array<{ id: string; name: string; value: number; unit: string; year?: string }> = [];
    let ssbSuccess = false;

    // Try SSB API for population data
    if (municipalityCode) {
      try {
        const ssbUrl = 'https://data.ssb.no/api/v0/no/table/07459';
        const regionCode = municipalityCode.replace('K-', '');
        const query = {
          query: [
            { code: 'Region', selection: { filter: 'item', values: [regionCode] } },
            { code: 'Alder', selection: { filter: 'vs', values: ['999'] } }, // Total all ages
            { code: 'ContentsCode', selection: { filter: 'item', values: ['Folkemengde'] } },
            { code: 'Tid', selection: { filter: 'top', values: ['1'] } },
          ],
          response: { format: 'json-stat2' },
        };

        console.log(`Fetching SSB data for ${municipality_name} (${regionCode})`);

        const resp = await fetch(ssbUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query),
        });

        if (resp.ok) {
          const data = await resp.json();
          console.log('SSB response keys:', Object.keys(data));
          if (data.value && data.value.length > 0 && data.value[0] !== null) {
            const pop = data.value[0];
            const timeDim = data.dimension?.Tid;
            let year = '2024';
            if (timeDim?.category?.label) {
              const labels = Object.values(timeDim.category.label) as string[];
              year = labels[labels.length - 1] || year;
            }
            indicators.push({ id: 'population', name: 'Folkemengde', value: pop, unit: 'personer', year });
            ssbSuccess = true;
          }
        } else {
          console.log('SSB API returned status:', resp.status);
        }
      } catch (e) {
        console.log('SSB API error:', e);
      }
    }

    // Fall back to known data if SSB failed
    if (!ssbSuccess && knownPopulation) {
      indicators.push({ id: 'population', name: 'Folkemengde', value: knownPopulation, unit: 'personer', year: '2024' });
    }

    const population = indicators.find(i => i.id === 'population')?.value;

    // Derive drone-relevant metrics
    const droneRelevance = {
      population_density: null as number | null,
      estimated_road_km: population ? Math.round(population * 0.015) : null,
      estimated_buildings: population ? Math.round(population * 0.4) : null,
      infrastructure_complexity: population && population > 50000 ? 'Høy' : population && population > 10000 ? 'Middels' : 'Lav',
      estimated_va_km: population ? Math.round(population * 0.01) : null,
    };

    return new Response(
      JSON.stringify({
        success: true,
        source: ssbSuccess ? 'ssb' : knownPopulation ? 'fallback' : 'estimated',
        municipality: municipality_name,
        municipality_code: municipalityCode || null,
        indicators,
        drone_relevance: droneRelevance,
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
