const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Kartverket API: dynamic municipality code + area lookup ──────────────
async function lookupMunicipality(name: string): Promise<{ code: string; areaKm2: number; officialName: string } | null> {
  try {
    const url = `https://ws.geonorge.no/kommuneinfo/v1/sok?knavn=${encodeURIComponent(name)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) { await resp.text(); return null; }
    const data = await resp.json();
    const results = data?.kommuner || [];
    if (results.length === 0) return null;
    const exact = results.find((m: any) =>
      m.kommunenavnNorsk?.toLowerCase() === name.toLowerCase() ||
      m.kommunenavn?.toLowerCase() === name.toLowerCase()
    );
    const match = exact || results[0];
    const code = match.kommunenummer;
    const officialName = match.kommunenavnNorsk || match.kommunenavn || name;
    let areaKm2 = 0;
    if (match.avgrensningsboks?.coordinates?.[0]) {
      const coords = match.avgrensningsboks.coordinates[0];
      const west = coords[0][0], south = coords[0][1];
      const east = coords[2][0], north = coords[2][1];
      const latMid = (south + north) / 2;
      const kmPerDegLat = 111.32;
      const kmPerDegLng = 111.32 * Math.cos(latMid * Math.PI / 180);
      areaKm2 = Math.round((north - south) * kmPerDegLat * (east - west) * kmPerDegLng * 0.65);
    }
    console.log(`Kartverket: "${name}" → ${code} (${officialName}, ~${areaKm2} km²)`);
    return { code, areaKm2, officialName };
  } catch (e) {
    console.log('Kartverket lookup failed:', e);
    return null;
  }
}

// ── SSB API: fetch population ────────────────────────────────────────────
async function fetchSSBPopulation(code: string, name: string): Promise<{ population: number; year: string } | null> {
  try {
    const resp = await fetch('https://data.ssb.no/api/v0/en/table/07459', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: [
          { code: 'Region', selection: { filter: 'item', values: [code] } },
          { code: 'Kjonn', selection: { filter: 'all', values: ['*'] } },
          { code: 'Alder', selection: { filter: 'all', values: ['*'] } },
          { code: 'Tid', selection: { filter: 'top', values: ['1'] } },
        ],
        response: { format: 'json-stat2' },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.value?.length > 0) {
      const pop = data.value.reduce((sum: number, v: number | null) => sum + (v || 0), 0);
      const timeDim = data.dimension?.Tid;
      let year = '2024';
      if (timeDim?.category?.label) {
        const labels = Object.values(timeDim.category.label) as string[];
        year = labels[labels.length - 1] || year;
      }
      return { population: pop, year };
    }
    return null;
  } catch { return null; }
}

// ── SSB Table 12362: Sector-level KOSTRA expenditure & staffing ─────────
// ContentsCode mapping for sector-level data:
// Brann: KS1.Brutto driftsutgifter i 1000 kr, funksjon 338 → use KS1.BrDrUtg338
// Plan/bygg: funksjon 301,302,303,304 → KS1.BrDrUtg301 etc.
// BUT 12362 only has aggregate. We need table 12367 for function-level detail.
//
// SSB Table 12367: "Brutto driftsutgifter" by function, per municipality.
// Functions: 338 (brann), 332 (vei), 345 (VA avløp), 340 (VA vann),
//            301 (plansak), 302 (byggesak), 329 (samferdsel), 360 (naturforv),
//            385 (land/skog), 242 (helse), 234 (aktivisering), 265 (omsorg).

interface SectorData {
  sector: string;
  expenditure_1000nok: number | null;
  employees_fte: number | null;
  year: string;
  source: string;
}

// KOSTRA function codes mapped to our department sectors
const KOSTRA_FUNCTIONS: Record<string, { functions: string[]; label: string }> = {
  'Brann': { functions: ['338', '339'], label: 'Brann og ulykkesvern' },
  'Drift/vei': { functions: ['332', '333', '334'], label: 'Kommunale veier og samferdsel' },
  'VA': { functions: ['340', '345', '350', '353'], label: 'Vann, avløp og renovasjon' },
  'Plan': { functions: ['301', '302', '303', '304'], label: 'Plansak og byggesak' },
  'Miljø': { functions: ['360', '365'], label: 'Naturforvaltning og friluftsliv' },
  'Landbruk': { functions: ['329'], label: 'Landbruk og skogbruk' },
  'Helse': { functions: ['232', '233', '234', '241', '242'], label: 'Helse og omsorg' },
  'Eiendom': { functions: ['221', '222', '261'], label: 'Kommunal eiendom' },
};

async function fetchSectorExpenditure(code: string, name: string): Promise<SectorData[]> {
  // Collect all function codes we need
  const allFunctions = Object.values(KOSTRA_FUNCTIONS).flatMap(s => s.functions);
  
  try {
    // SSB table 12367: Gross operating expenditure by function per municipality
    const resp = await fetch('https://data.ssb.no/api/v0/no/table/12367', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: [
          { code: 'Region', selection: { filter: 'item', values: [code] } },
          { code: 'Funksjon', selection: { filter: 'item', values: allFunctions } },
          { code: 'ContentsCode', selection: { filter: 'item', values: ['KOSbdr1000'] } },
          { code: 'Tid', selection: { filter: 'top', values: ['1'] } },
        ],
        response: { format: 'json-stat2' },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      console.log(`SSB 12367 failed ${resp.status} for ${name}`);
      return [];
    }

    const data = await resp.json();
    if (!data.value || !data.dimension) return [];

    // Parse the json-stat2 response
    const funDim = data.dimension.Funksjon;
    const timeDim = data.dimension.Tid;
    const funCodes = funDim?.category?.index ? Object.keys(funDim.category.index) : [];
    const funLabels = funDim?.category?.label || {};
    const timeLabels = timeDim?.category?.label || {};
    const year = Object.values(timeLabels)[0] as string || '2024';

    // Map values back: data.value is flat array indexed by [function][time]
    const valueByFunction: Record<string, number> = {};
    funCodes.forEach((fc: string, i: number) => {
      const val = data.value[i];
      if (val !== null && val !== undefined) {
        valueByFunction[fc] = val;
      }
    });

    console.log(`SSB 12367 for ${name}: got ${Object.keys(valueByFunction).length} function values, year=${year}`);

    // Aggregate per sector
    const results: SectorData[] = [];
    for (const [sector, cfg] of Object.entries(KOSTRA_FUNCTIONS)) {
      let total = 0;
      let hasData = false;
      for (const fn of cfg.functions) {
        if (valueByFunction[fn] !== undefined) {
          total += valueByFunction[fn];
          hasData = true;
        }
      }
      if (hasData) {
        results.push({
          sector,
          expenditure_1000nok: Math.round(total),
          employees_fte: null, // filled separately
          year,
          source: 'ssb_12367',
        });
      }
    }
    return results;
  } catch (e) {
    console.log('SSB 12367 fetch failed:', e);
    return [];
  }
}

// ── SSB Table 11567: Municipal employees by service area ─────────────────
// Uses "avtalte årsverk" (agreed FTEs) by function group
async function fetchSectorStaffing(code: string, name: string): Promise<Record<string, number>> {
  try {
    // Table 11567: Sysselsatte i kommuneforvaltningen
    // Function groups that map to our sectors
    const staffFunctions = [
      'F338a339', // Brann
      'F332a334', // Vei
      'F340a345a350a353', // VA
      'F300a304', // Plan/bygg
      'F360a365', // Miljø
      'F232a242', // Helse
    ];
    
    const resp = await fetch('https://data.ssb.no/api/v0/no/table/11567', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: [
          { code: 'Region', selection: { filter: 'item', values: [code] } },
          { code: 'Funksjon', selection: { filter: 'item', values: staffFunctions } },
          { code: 'ContentsCode', selection: { filter: 'item', values: ['Avtal1'] } },
          { code: 'Tid', selection: { filter: 'top', values: ['1'] } },
        ],
        response: { format: 'json-stat2' },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      console.log(`SSB 11567 failed ${resp.status} for ${name}`);
      return {};
    }

    const data = await resp.json();
    if (!data.value || !data.dimension) return {};

    const funDim = data.dimension.Funksjon;
    const funCodes = funDim?.category?.index ? Object.keys(funDim.category.index) : [];
    
    const result: Record<string, number> = {};
    const sectorMap: Record<string, string> = {
      'F338a339': 'Brann',
      'F332a334': 'Drift/vei',
      'F340a345a350a353': 'VA',
      'F300a304': 'Plan',
      'F360a365': 'Miljø',
      'F232a242': 'Helse',
    };
    
    funCodes.forEach((fc: string, i: number) => {
      const val = data.value[i];
      const sector = sectorMap[fc];
      if (val !== null && val !== undefined && sector) {
        result[sector] = Math.round(val * 10) / 10;
      }
    });

    console.log(`SSB 11567 staffing for ${name}: ${JSON.stringify(result)}`);
    return result;
  } catch (e) {
    console.log('SSB 11567 fetch failed:', e);
    return {};
  }
}

// ── Fire stats estimates (fallback) ──────────────────────────────────────
function estimateFireStats(population: number | null, name: string, areaKm2: number | null) {
  if (!population) return null;
  let rates;
  if (population < 5000) rates = { building_fires_per1k: 0.55, chimney_fires_per1k: 0.50, callouts_per1k: 3.2, expenditure_per_cap: 3500, ftes_per_10k: 12.0 };
  else if (population < 20000) rates = { building_fires_per1k: 0.45, chimney_fires_per1k: 0.35, callouts_per1k: 4.0, expenditure_per_cap: 2800, ftes_per_10k: 8.5 };
  else if (population < 50000) rates = { building_fires_per1k: 0.42, chimney_fires_per1k: 0.25, callouts_per1k: 5.0, expenditure_per_cap: 2400, ftes_per_10k: 7.0 };
  else rates = { building_fires_per1k: 0.38, chimney_fires_per1k: 0.15, callouts_per1k: 6.5, expenditure_per_cap: 2200, ftes_per_10k: 6.0 };
  const areaFactor = areaKm2 && areaKm2 > 1000 ? 1.15 : 1.0;
  const building_fires = Math.round(population / 1000 * rates.building_fires_per1k);
  const chimney_fires = Math.round(population / 1000 * rates.chimney_fires_per1k);
  return {
    total_fires: building_fires + chimney_fires, building_fires, chimney_fires,
    total_callouts: Math.round(population / 1000 * rates.callouts_per1k * areaFactor),
    fire_expenditure_1000nok: Math.round(population * rates.expenditure_per_cap / 1000),
    fire_ftes: Math.round(population / 10000 * rates.ftes_per_10k * areaFactor * 10) / 10,
    year: '2024', source: 'differentiated_estimate',
  };
}

// ── Hardcoded fallbacks ──────────────────────────────────────────────────
const FALLBACK_CODES: Record<string, string> = {
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

const FALLBACK_POP: Record<string, number> = {
  'Oslo': 710000, 'Bergen': 290000, 'Trondheim': 210000, 'Stavanger': 145000,
  'Bærum': 130000, 'Kristiansand': 112000, 'Drammen': 101000, 'Asker': 100000,
  'Lillestrøm': 88000, 'Fredrikstad': 84000, 'Sandnes': 80000, 'Tromsø': 78000,
  'Ålesund': 67000, 'Bodø': 53000, 'Rana': 27000, 'Ringebu': 4700,
};

const FALLBACK_AREA: Record<string, number> = {
  'Oslo': 454, 'Bergen': 465, 'Trondheim': 342, 'Tromsø': 2566,
  'Bodø': 1395, 'Rana': 4460, 'Ringebu': 1291,
};

const CENTRALITY: Record<string, number> = {
  'Oslo': 1, 'Bergen': 1, 'Trondheim': 1, 'Stavanger': 1,
  'Bærum': 1, 'Kristiansand': 2, 'Drammen': 1, 'Tromsø': 2,
  'Bodø': 3, 'Ringebu': 5,
};

const CONTROLLED_AIRSPACE: Record<string, { type: string; airport: string; radius_km: number }> = {
  'Oslo': { type: 'TMA', airport: 'ENGM Gardermoen', radius_km: 30 },
  'Ullensaker': { type: 'CTR', airport: 'ENGM Gardermoen', radius_km: 15 },
  'Bergen': { type: 'CTR', airport: 'ENBR Flesland', radius_km: 15 },
  'Stavanger': { type: 'CTR', airport: 'ENZV Sola', radius_km: 15 },
  'Trondheim': { type: 'CTR', airport: 'ENVA Værnes', radius_km: 15 },
  'Tromsø': { type: 'CTR', airport: 'ENTC Langnes', radius_km: 10 },
  'Bodø': { type: 'CTR', airport: 'ENBO Bodø', radius_km: 12 },
  'Kristiansand': { type: 'CTR', airport: 'ENCN Kjevik', radius_km: 10 },
};

const PROTECTED_AREAS: Record<string, string[]> = {
  'Ringebu': ['Rondane nasjonalpark'],
  'Narvik': ['Ofoten landskapsvernområde'],
  'Rana': ['Saltfjellet–Svartisen nasjonalpark'],
  'Bodø': ['Sjunkhatten nasjonalpark'],
};

function inferServices(population: number | null) {
  const pop = population || 5000;
  const baseDepts = [
    { id: 'teknisk', name: 'Teknisk drift', relevant_use_cases: ['UC06', 'UC04', 'UC17'] },
    { id: 'plan', name: 'Plan og bygg', relevant_use_cases: ['UC01', 'UC02', 'UC03'] },
    { id: 'brann', name: 'Brann og redning', relevant_use_cases: ['UC12', 'UC13', 'UC14'] },
    { id: 'miljo', name: 'Miljø og klima', relevant_use_cases: ['UC09', 'UC10', 'UC11'] },
  ];
  if (pop < 5000) return { active_services: ['Teknisk drift', 'Plan og bygg', 'Brann (IKS)', 'Landbruk'], departments: [...baseDepts, { id: 'landbruk', name: 'Landbruk', relevant_use_cases: ['UC15', 'UC16'] }] };
  if (pop < 20000) return { active_services: ['Teknisk drift', 'Plan og bygg', 'Brann og redning', 'VA', 'Miljø', 'Eiendom', 'Landbruk'], departments: [...baseDepts, { id: 'va', name: 'Vann og avløp', relevant_use_cases: ['UC04', 'UC05'] }, { id: 'eiendom', name: 'Eiendom', relevant_use_cases: ['UC17', 'UC18'] }, { id: 'landbruk', name: 'Landbruk', relevant_use_cases: ['UC15', 'UC16'] }] };
  return { active_services: ['Teknisk drift', 'Plan og bygg', 'Brann og redning', 'VA', 'Miljø', 'Eiendom', 'Geodata', 'Kultur', 'Helse'], departments: [...baseDepts, { id: 'va', name: 'Vann og avløp', relevant_use_cases: ['UC04', 'UC05'] }, { id: 'eiendom', name: 'Eiendom', relevant_use_cases: ['UC17', 'UC18'] }, { id: 'geodata', name: 'Geodata', relevant_use_cases: ['UC23', 'UC24'] }, { id: 'kultur', name: 'Kultur og turisme', relevant_use_cases: ['UC19', 'UC20'] }, { id: 'helse', name: 'Helse og omsorg', relevant_use_cases: ['UC21', 'UC22'] }] };
}

function getPopulationBracket(pop: number | null): string {
  if (!pop || pop < 5000) return 'small_rural';
  if (pop < 20000) return 'mid_tier';
  return 'urban';
}

// ── Main handler ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { municipality_name } = await req.json();
    if (!municipality_name) {
      return new Response(JSON.stringify({ success: false, error: 'Municipality name is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const indicators: Array<{ id: string; name: string; value: number; unit: string; year?: string }> = [];
    let municipalityCode: string | null = null;
    let areaKm2: number | null = null;
    let source = 'estimated';

    const searchName = municipality_name.replace(/\s*\(.*?\)\s*$/, '').trim();

    // Step 1: Resolve municipality code
    if (FALLBACK_CODES[municipality_name]) {
      municipalityCode = FALLBACK_CODES[municipality_name];
      areaKm2 = FALLBACK_AREA[municipality_name] || null;
    }
    let kartverket = await lookupMunicipality(searchName);
    if (!kartverket && searchName !== municipality_name) kartverket = await lookupMunicipality(municipality_name);
    if (kartverket) {
      municipalityCode = kartverket.code;
      if (kartverket.areaKm2 > 0) areaKm2 = kartverket.areaKm2;
    }

    // Step 2: Fetch population
    let ssbSuccess = false;
    if (municipalityCode) {
      const ssb = await fetchSSBPopulation(municipalityCode, municipality_name);
      if (ssb) {
        indicators.push({ id: 'population', name: 'Folkemengde', value: ssb.population, unit: 'personer', year: ssb.year });
        ssbSuccess = true;
        source = 'ssb';
      }
    }
    if (!ssbSuccess && FALLBACK_POP[municipality_name]) {
      indicators.push({ id: 'population', name: 'Folkemengde', value: FALLBACK_POP[municipality_name], unit: 'personer', year: '2024' });
      source = 'fallback';
    }

    const population = indicators.find(i => i.id === 'population')?.value || null;
    const bracket = getPopulationBracket(population);
    const centrality = CENTRALITY[municipality_name] || null;

    if (areaKm2) indicators.push({ id: 'area_km2', name: 'Areal', value: areaKm2, unit: 'km²', year: '2024' });

    // Step 3: Derived metrics
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

    const services = inferServices(population);
    const airspace = CONTROLLED_AIRSPACE[municipality_name] || null;
    const protectedAreas = PROTECTED_AREAS[municipality_name] || [];

    let effectiveCentrality = centrality;
    if (!effectiveCentrality && population) {
      if (population > 50000) effectiveCentrality = 2;
      else if (population > 15000) effectiveCentrality = 3;
      else if (population > 5000) effectiveCentrality = 4;
      else effectiveCentrality = 5;
    }

    const droneRelevance = {
      population_density: popDensity,
      population_bracket: bracket,
      estimated_road_km: estimatedRoadKm,
      estimated_buildings: estimatedBuildings,
      estimated_va_km: estimatedVaKm,
      estimated_agri_km2: estimatedAgriLand,
      infrastructure_complexity: population && population > 50000 ? 'Høy' : population && population > 10000 ? 'Middels' : 'Lav',
      centrality_index: effectiveCentrality,
      urban_rural: effectiveCentrality ? (effectiveCentrality <= 2 ? 'Urban' : effectiveCentrality <= 4 ? 'Halvsentral' : 'Rural') : null,
      controlled_airspace: airspace,
      protected_areas: protectedAreas,
    };

    // Step 4: Fetch KOSTRA sector-level expenditure + staffing in parallel
    const [sectorExpenditure, sectorStaffing] = municipalityCode
      ? await Promise.all([
          fetchSectorExpenditure(municipalityCode, municipality_name),
          fetchSectorStaffing(municipalityCode, municipality_name),
        ])
      : [[], {}];

    // Merge staffing into expenditure data
    const sectorData = sectorExpenditure.map(s => ({
      ...s,
      employees_fte: sectorStaffing[s.sector] ?? null,
    }));

    // Add sectors that have staffing but no expenditure
    for (const [sector, fte] of Object.entries(sectorStaffing)) {
      if (!sectorData.find(s => s.sector === sector)) {
        sectorData.push({ sector, expenditure_1000nok: null, employees_fte: fte, year: '2024', source: 'ssb_11567' });
      }
    }

    // Fallback: estimate sector budgets from population if SSB returned nothing
    const ssbSectorSuccess = sectorData.length > 0;
    let fallbackSectors: SectorData[] = [];
    if (!ssbSectorSuccess && population) {
      const pop = population;
      const estSectors: Array<{ sector: string; perCapita: number; ftesPer10k: number }> = [
        { sector: 'Brann', perCapita: pop < 5000 ? 3500 : pop < 20000 ? 2800 : 2400, ftesPer10k: pop < 5000 ? 12 : pop < 20000 ? 8.5 : 7 },
        { sector: 'Drift/vei', perCapita: pop < 5000 ? 4200 : pop < 20000 ? 3500 : 3000, ftesPer10k: pop < 5000 ? 8 : pop < 20000 ? 6 : 5 },
        { sector: 'VA', perCapita: pop < 5000 ? 4500 : pop < 20000 ? 3800 : 3200, ftesPer10k: pop < 5000 ? 5 : pop < 20000 ? 4 : 3.5 },
        { sector: 'Plan', perCapita: pop < 5000 ? 1800 : pop < 20000 ? 1500 : 1200, ftesPer10k: pop < 5000 ? 3 : pop < 20000 ? 2.5 : 2 },
        { sector: 'Miljø', perCapita: pop < 5000 ? 800 : pop < 20000 ? 700 : 600, ftesPer10k: pop < 5000 ? 1.5 : pop < 20000 ? 1.2 : 1 },
        { sector: 'Helse', perCapita: pop < 5000 ? 35000 : pop < 20000 ? 32000 : 28000, ftesPer10k: pop < 5000 ? 60 : pop < 20000 ? 55 : 50 },
      ];
      fallbackSectors = estSectors.map(e => ({
        sector: e.sector,
        expenditure_1000nok: Math.round(pop * e.perCapita / 1000),
        employees_fte: Math.round(pop / 10000 * e.ftesPer10k * 10) / 10,
        year: '2024',
        source: 'estimated',
      }));
    }

    const finalSectors = ssbSectorSuccess ? sectorData : fallbackSectors;

    return new Response(
      JSON.stringify({
        success: true,
        source,
        municipality: municipality_name,
        municipality_code: municipalityCode || null,
        area_km2: areaKm2,
        indicators,
        drone_relevance: droneRelevance,
        services,
        fire_stats: estimateFireStats(population, municipality_name, areaKm2),
        sector_data: finalSectors,
        sector_data_source: ssbSectorSuccess ? 'ssb' : 'estimated',
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
