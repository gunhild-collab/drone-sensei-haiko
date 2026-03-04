const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// SSB KOSTRA table IDs relevant for drone maturity assessment
const KOSTRA_TABLES: Record<string, { tableId: string; indicatorName: string; variableCode: string }> = {
  road_km: { tableId: '11845', indicatorName: 'Kommunale veier (km)', variableCode: 'KOSveg0001' },
  water_pipe_km: { tableId: '12209', indicatorName: 'Vannledningsnett (km)', variableCode: 'KOSvavann0004' },
  sewer_pipe_km: { tableId: '12209', indicatorName: 'Avløpsledningsnett (km)', variableCode: 'KOSvaavl0004' },
  population: { tableId: '07459', indicatorName: 'Folkemengde', variableCode: 'Folkemengde' },
  area_km2: { tableId: '09280', indicatorName: 'Areal (km²)', variableCode: 'Areal' },
  buildings: { tableId: '06265', indicatorName: 'Kommunale bygg (antall)', variableCode: 'KOSeiendom0001' },
};

// Municipality name to SSB code mapping (subset - key municipalities)
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
    
    // If we don't have the code, try SSB search
    if (!municipalityCode) {
      // Return estimated data based on municipality list data
      return new Response(
        JSON.stringify({
          success: true,
          source: 'estimated',
          municipality: municipality_name,
          data: {
            message: `Kommunekode for ${municipality_name} ikke funnet i lokal database. SSB-data kan hentes manuelt.`,
          },
          indicators: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch population data from SSB (table 07459) as primary indicator
    const ssbUrl = `https://data.ssb.no/api/v0/no/table/07459`;
    const query = {
      query: [
        { code: 'Region', selection: { filter: 'item', values: [municipalityCode] } },
        { code: 'ContentsCode', selection: { filter: 'item', values: ['Folkemengde'] } },
        { code: 'Tid', selection: { filter: 'top', values: ['1'] } },
      ],
      response: { format: 'json-stat2' },
    };

    console.log(`Fetching SSB data for ${municipality_name} (${municipalityCode})`);

    const ssbResponse = await fetch(ssbUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    let population = null;
    let year = null;

    if (ssbResponse.ok) {
      const ssbData = await ssbResponse.json();
      if (ssbData.value && ssbData.value.length > 0) {
        population = ssbData.value[0];
        // Extract year from dimension
        const timeDim = ssbData.dimension?.Tid;
        if (timeDim?.category?.label) {
          const labels = Object.values(timeDim.category.label);
          year = labels[labels.length - 1];
        }
      }
    }

    // Also fetch area data (table 09280)
    let area = null;
    try {
      const areaUrl = `https://data.ssb.no/api/v0/no/table/09280`;
      const areaQuery = {
        query: [
          { code: 'Region', selection: { filter: 'item', values: [municipalityCode] } },
          { code: 'ContentsCode', selection: { filter: 'item', values: ['Areal'] } },
          { code: 'Tid', selection: { filter: 'top', values: ['1'] } },
        ],
        response: { format: 'json-stat2' },
      };
      const areaResp = await fetch(areaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(areaQuery),
      });
      if (areaResp.ok) {
        const areaData = await areaResp.json();
        if (areaData.value?.[0]) area = areaData.value[0];
      }
    } catch (e) {
      console.log('Area fetch failed:', e);
    }

    const indicators = [];
    if (population) indicators.push({ id: 'population', name: 'Folkemengde', value: population, unit: 'personer', year });
    if (area) indicators.push({ id: 'area_km2', name: 'Areal', value: area, unit: 'km²', year });

    // Derive drone-relevant metrics
    const droneRelevance = {
      population_density: population && area ? Math.round(population / area) : null,
      estimated_road_km: population ? Math.round(population * 0.015) : null, // rough estimate
      estimated_buildings: population ? Math.round(population * 0.4) : null,
      infrastructure_complexity: population && population > 50000 ? 'Høy' : population && population > 10000 ? 'Middels' : 'Lav',
    };

    return new Response(
      JSON.stringify({
        success: true,
        source: 'ssb',
        municipality: municipality_name,
        municipality_code: municipalityCode,
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
