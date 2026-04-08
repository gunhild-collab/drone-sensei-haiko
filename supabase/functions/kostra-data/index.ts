const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface JsonStatDataset {
  id?: string[];
  size?: number[];
  value?: Array<number | null>;
  dimension?: Record<string, { category?: { index?: Record<string, number>; label?: Record<string, string> } }>;
}

interface PropertyData {
  areal_per_innbygger_m2: number | null;
  vedlikehold_per_kvm_kr: number | null;
  drift_per_kvm_kr: number | null;
  energi_per_kvm_kr: number | null;
  netto_drift_per_innb_kr: number | null;
  andel_av_driftsutgifter_pct: number | null;
  year: string;
}

interface SectorData {
  sector: string;
  expenditure_1000nok: number | null;
  year: string;
  source: string;
}

interface BuildingData {
  total: number;
  residential: number;
  holiday_homes: number;
  commercial: number;
  year: string;
}

interface VaNetworkData {
  water_pipe_km: number | null;
  sewage_pipe_km: number | null;
  year: string;
}

interface LandUseData {
  agricultural_dekar: number | null;
  forest_dekar: number | null;
  year: string;
}

interface NvdbData {
  bridges: number;
  tunnels: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON-stat2 helper
// ═══════════════════════════════════════════════════════════════════════════

function getJsonStatValue(dataset: JsonStatDataset, selections: Record<string, string>): number | null {
  const ids = dataset.id || Object.keys(dataset.dimension || {});
  const sizes = dataset.size || ids.map((id) => Object.keys(dataset.dimension?.[id]?.category?.index || {}).length);

  let flatIndex = 0;
  let stride = 1;

  for (let i = ids.length - 1; i >= 0; i--) {
    const dimId = ids[i];
    const catIdx = dataset.dimension?.[dimId]?.category?.index?.[selections[dimId]];
    if (catIdx === undefined) return null;
    flatIndex += catIdx * stride;
    stride *= sizes[i] || 1;
  }

  const value = dataset.value?.[flatIndex];
  return typeof value === "number" ? value : null;
}

// Helper: get latest non-null value from a json-stat2 dataset, trying years newest-first
function getLatestValue(
  dataset: JsonStatDataset,
  baseSelections: Record<string, string>,
  timeDimId: string,
): { value: number; year: string } | null {
  const yearIndex = dataset.dimension?.[timeDimId]?.category?.index || {};
  const years = Object.entries(yearIndex)
    .sort(([, a], [, b]) => b - a) // newest first
    .map(([y]) => y);

  for (const year of years) {
    const v = getJsonStatValue(dataset, { ...baseSelections, [timeDimId]: year });
    if (v !== null) return { value: v, year };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Kartverket: municipality code + area lookup
// ═══════════════════════════════════════════════════════════════════════════

async function lookupMunicipality(
  name: string,
): Promise<{ code: string; areaKm2: number; officialName: string } | null> {
  try {
    const url = `https://ws.geonorge.no/kommuneinfo/v1/sok?knavn=${encodeURIComponent(name)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const results = data?.kommuner || [];
    if (results.length === 0) return null;

    const exact = results.find(
      (m: any) =>
        m.kommunenavnNorsk?.toLowerCase() === name.toLowerCase() || m.kommunenavn?.toLowerCase() === name.toLowerCase(),
    );
    const match = exact || results[0];
    const code = match.kommunenummer;
    const officialName = match.kommunenavnNorsk || match.kommunenavn || name;

    let areaKm2 = 0;
    if (match.avgrensningsboks?.coordinates?.[0]) {
      const coords = match.avgrensningsboks.coordinates[0];
      const west = coords[0][0],
        south = coords[0][1];
      const east = coords[2][0],
        north = coords[2][1];
      const latMid = (south + north) / 2;
      const kmPerDegLat = 111.32;
      const kmPerDegLng = 111.32 * Math.cos((latMid * Math.PI) / 180);
      areaKm2 = Math.round((north - south) * kmPerDegLat * (east - west) * kmPerDegLng * 0.65);
    }

    return { code, areaKm2, officialName };
  } catch (e) {
    console.log("Kartverket lookup failed:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SSB: Population (table 07459, v0 API)
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSSBPopulation(code: string): Promise<{ population: number; year: string } | null> {
  try {
    const resp = await fetch("https://data.ssb.no/api/v0/en/table/07459", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: [
          { code: "Region", selection: { filter: "item", values: [code] } },
          { code: "Kjonn", selection: { filter: "all", values: ["*"] } },
          { code: "Alder", selection: { filter: "all", values: ["*"] } },
          { code: "Tid", selection: { filter: "top", values: ["1"] } },
        ],
        response: { format: "json-stat2" },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.value?.length) return null;

    const pop = data.value.reduce((sum: number, v: number | null) => sum + (v || 0), 0);
    const timeDim = data.dimension?.Tid;
    let year = "2024";
    if (timeDim?.category?.label) {
      const labels = Object.values(timeDim.category.label) as string[];
      year = labels[labels.length - 1] || year;
    }
    return { population: pop, year };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SSB: Municipal road km (table 11814, v2 API)
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSSBRoadKm(code: string): Promise<{ roadKm: number; year: string } | null> {
  try {
    const url = "https://data.ssb.no/api/pxwebapi/v2/tables/11814/data?lang=no&outputFormat=json-stat2";
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const data = await resp.json();

    const regionIdx = data.dimension?.KOKkommuneregion0000?.category?.index;
    const contentIdx = data.dimension?.ContentsCode?.category?.index;
    const timeIdx = data.dimension?.Tid?.category?.index;
    if (!regionIdx || !contentIdx || !timeIdx) return null;

    const r = regionIdx[code];
    const c = contentIdx["KOSkmkommunevei0000"];
    if (r === undefined || c === undefined) return null;

    // Try years newest first
    const years = Object.entries(timeIdx).sort(([, a], [, b]) => (b as number) - (a as number));
    const sizes = data.size as number[];

    for (const [year, tIdx] of years) {
      const flatIdx = r * sizes[1] * sizes[2] + (tIdx as number) * sizes[2] + c;
      const value = data.value?.[flatIdx];
      if (typeof value === "number" && value > 0) {
        return { roadKm: value, year };
      }
    }
    return null;
  } catch (e) {
    console.log("SSB 11814 road km failed:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SSB: Property management (table 12051, v2 API)
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSSBPropertyData(code: string): Promise<PropertyData | null> {
  try {
    const url = "https://data.ssb.no/api/pxwebapi/v2/tables/12051/data?lang=no&outputFormat=json-stat2";
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const data = await resp.json();

    const regionIdx = data.dimension?.KOKkommuneregion0000?.category?.index;
    const contentIdx = data.dimension?.ContentsCode?.category?.index;
    const timeIdx = data.dimension?.Tid?.category?.index;
    if (!regionIdx || !contentIdx || !timeIdx) return null;

    const r = regionIdx[code];
    if (r === undefined) return null;

    const t = Object.keys(timeIdx).sort().reverse()[0];
    const tIdx = timeIdx[t];
    const sizes = data.size as number[];

    const getValue = (contentCode: string): number | null => {
      const c = contentIdx[contentCode];
      if (c === undefined) return null;
      const flatIdx = r * sizes[1] * sizes[2] + tIdx * sizes[2] + c;
      const v = data.value?.[flatIdx];
      return typeof v === "number" ? v : null;
    };

    return {
      areal_per_innbygger_m2: getValue("KOSarealperinnb0000"),
      vedlikehold_per_kvm_kr: getValue("KOSvedlikeholdpe0000"),
      drift_per_kvm_kr: getValue("KOSdriftperkvm0000"),
      energi_per_kvm_kr: getValue("KOSenergiperkvm0000"),
      netto_drift_per_innb_kr: getValue("KOSndu421perinnb0000"),
      andel_av_driftsutgifter_pct: getValue("KOSndueieforvtot0000"),
      year: t,
    };
  } catch (e) {
    console.log("SSB 12051 property data failed:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SSB: Buildings (table 03174, v0 API)
//
// Table 03174: "Bygninger, etter bygningstype"
// Dimensions: Region, Bygningstype, ContentsCode, Tid
//
// VERIFY field codes by hitting: GET https://data.ssb.no/api/v0/no/table/03174
// The building type codes below are based on standard SSB/Matrikkelen groupings.
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSSBBuildings(code: string): Promise<BuildingData | null> {
  try {
    const resp = await fetch("https://data.ssb.no/api/v0/no/table/03174", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: [
          { code: "Region", selection: { filter: "item", values: [code] } },
          // Fetch all building types — we'll pick out the ones we need
          { code: "Bygningstype", selection: { filter: "all", values: ["*"] } },
          { code: "ContentsCode", selection: { filter: "all", values: ["*"] } },
          { code: "Tid", selection: { filter: "top", values: ["1"] } },
        ],
        response: { format: "json-stat2" },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      console.log(`SSB 03174 failed: ${resp.status}`);
      return null;
    }

    const data = (await resp.json()) as JsonStatDataset;
    const typeIdx = data.dimension?.Bygningstype?.category?.index || {};
    const typeLabels = data.dimension?.Bygningstype?.category?.label || {};
    const contentIdx = data.dimension?.ContentsCode?.category?.index || {};
    const timeIdx = data.dimension?.Tid?.category?.index || {};

    if (!data.value?.length) return null;

    const year = Object.keys(timeIdx).sort().reverse()[0] || "2024";

    // Find the content code for "number of buildings" (antall bygninger)
    // Common codes: 'Bygninger' or 'AntallBygninger' — check metadata
    const contentCode = Object.keys(contentIdx)[0]; // Use first available
    if (!contentCode) return null;

    let total = 0;
    let residential = 0;
    let holidayHomes = 0;
    let commercial = 0;

    for (const [typeCode, idx] of Object.entries(typeIdx)) {
      const label = (typeLabels[typeCode] || "").toLowerCase();
      const v = getJsonStatValue(data, {
        Region: code,
        Bygningstype: typeCode,
        ContentsCode: contentCode,
        Tid: year,
      });
      if (v === null || v <= 0) continue;

      total += v;

      // Classify by label text — resilient to code changes
      if (label.includes("bolig") && !label.includes("fritid")) {
        residential += v;
      } else if (label.includes("fritid") || label.includes("hytte")) {
        holidayHomes += v;
      } else if (
        label.includes("industri") ||
        label.includes("kontor") ||
        label.includes("forretning") ||
        label.includes("lager")
      ) {
        commercial += v;
      }
    }

    if (total === 0) return null;

    console.log(
      `SSB 03174: ${code} → ${total} bygninger (${residential} bolig, ${holidayHomes} fritid, ${commercial} næring) (${year})`,
    );
    return { total, residential, holiday_homes: holidayHomes, commercial, year };
  } catch (e) {
    console.log("SSB 03174 buildings failed:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SSB: VA network (KOSTRA tables)
//
// Water supply: table 11790 "Kommunal vannforsyning — ledningsnett"
// Sewage: table 11789 "Kommunalt avløp — ledningsnett"
//
// Both are KOSTRA tables with dimensions:
//   KOKkommuneregion0000, ContentsCode, Tid
//
// VERIFY content codes by checking table metadata endpoints.
// Expected content codes:
//   Water pipe km: 'KOSkmvannledn0000' (or similar)
//   Sewage pipe km: 'KOSkmavlopsledn0000' (or similar)
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSSBVaNetwork(code: string): Promise<VaNetworkData | null> {
  const fetchVaTable = async (tableId: string, apiVersion: "v0" | "v2"): Promise<JsonStatDataset | null> => {
    try {
      let resp: Response;
      if (apiVersion === "v2") {
        resp = await fetch(
          `https://data.ssb.no/api/pxwebapi/v2/tables/${tableId}/data?lang=no&outputFormat=json-stat2`,
          { signal: AbortSignal.timeout(10000) },
        );
      } else {
        resp = await fetch(`https://data.ssb.no/api/v0/no/table/${tableId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: [
              { code: "KOKkommuneregion0000", selection: { filter: "item", values: [code] } },
              { code: "ContentsCode", selection: { filter: "all", values: ["*"] } },
              { code: "Tid", selection: { filter: "top", values: ["3"] } },
            ],
            response: { format: "json-stat2" },
          }),
          signal: AbortSignal.timeout(10000),
        });
      }
      if (!resp.ok) return null;
      return (await resp.json()) as JsonStatDataset;
    } catch {
      return null;
    }
  };

  try {
    // Try fetching both tables in parallel
    const [waterData, sewageData] = await Promise.all([fetchVaTable("11790", "v0"), fetchVaTable("11789", "v0")]);

    let waterKm: number | null = null;
    let sewageKm: number | null = null;
    let year = "2024";

    // Extract water pipe km — look for content code containing "km" and "vann"/"ledn"
    if (waterData?.value?.length) {
      const contentIdx = waterData.dimension?.ContentsCode?.category?.index || {};
      const contentLabels = waterData.dimension?.ContentsCode?.category?.label || {};

      // Find the right content code for pipe length in km
      const kmCode = Object.entries(contentLabels).find(
        ([, label]) =>
          (label as string).toLowerCase().includes("km") && (label as string).toLowerCase().includes("ledn"),
      )?.[0];

      if (kmCode) {
        const result = getLatestValue(waterData, { KOKkommuneregion0000: code, ContentsCode: kmCode }, "Tid");
        if (result) {
          waterKm = result.value;
          year = result.year;
        }
      }
    }

    // Extract sewage pipe km — same approach
    if (sewageData?.value?.length) {
      const contentLabels = sewageData.dimension?.ContentsCode?.category?.label || {};
      const kmCode = Object.entries(contentLabels).find(
        ([, label]) =>
          (label as string).toLowerCase().includes("km") && (label as string).toLowerCase().includes("ledn"),
      )?.[0];

      if (kmCode) {
        const result = getLatestValue(sewageData, { KOKkommuneregion0000: code, ContentsCode: kmCode }, "Tid");
        if (result) {
          sewageKm = result.value;
          year = result.year;
        }
      }
    }

    if (waterKm === null && sewageKm === null) return null;

    console.log(`SSB VA: ${code} → vann ${waterKm} km, avløp ${sewageKm} km (${year})`);
    return { water_pipe_km: waterKm, sewage_pipe_km: sewageKm, year };
  } catch (e) {
    console.log("SSB VA network failed:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SSB: Land use — agriculture + forest (table 09594, v0 API)
//
// Table 09594: "Areal av land og ferskvatn"
// Dimensions: Region, ArealType, ContentsCode, Tid
//
// VERIFY codes at: GET https://data.ssb.no/api/v0/no/table/09594
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSSBLandUse(code: string): Promise<LandUseData | null> {
  try {
    const resp = await fetch("https://data.ssb.no/api/v0/no/table/09594", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: [
          { code: "Region", selection: { filter: "item", values: [code] } },
          { code: "ArealType", selection: { filter: "all", values: ["*"] } },
          { code: "ContentsCode", selection: { filter: "all", values: ["*"] } },
          { code: "Tid", selection: { filter: "top", values: ["1"] } },
        ],
        response: { format: "json-stat2" },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) return null;
    const data = (await resp.json()) as JsonStatDataset;
    if (!data.value?.length) return null;

    const typeIdx = data.dimension?.ArealType?.category?.index || {};
    const typeLabels = data.dimension?.ArealType?.category?.label || {};
    const year =
      Object.keys(data.dimension?.Tid?.category?.index || {})
        .sort()
        .reverse()[0] || "2024";

    let agriDekar: number | null = null;
    let forestDekar: number | null = null;

    // Find codes by label text
    for (const [typeCode] of Object.entries(typeIdx)) {
      const label = ((typeLabels[typeCode] as string) || "").toLowerCase();

      if (label.includes("jordbruk") || label.includes("dyrka") || label.includes("fulldyrka")) {
        const v = getJsonStatValue(data, {
          Region: code,
          ArealType: typeCode,
          ContentsCode: Object.keys(data.dimension?.ContentsCode?.category?.index || {})[0],
          Tid: year,
        });
        if (v !== null) agriDekar = (agriDekar || 0) + v;
      }

      if (label.includes("skog") && !label.includes("myr")) {
        const v = getJsonStatValue(data, {
          Region: code,
          ArealType: typeCode,
          ContentsCode: Object.keys(data.dimension?.ContentsCode?.category?.index || {})[0],
          Tid: year,
        });
        if (v !== null) forestDekar = (forestDekar || 0) + v;
      }
    }

    if (agriDekar === null && forestDekar === null) return null;

    console.log(`SSB 09594: ${code} → jordbruk ${agriDekar} dekar, skog ${forestDekar} dekar (${year})`);
    return { agricultural_dekar: agriDekar, forest_dekar: forestDekar, year };
  } catch (e) {
    console.log("SSB 09594 land use failed:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SSB: Sector expenditure (table 12362, v0 API)
// Trimmed to drone-relevant sectors only: Brann, Drift/vei, VA, Plan, Eiendom
// No FTE estimation — just raw expenditure.
// ═══════════════════════════════════════════════════════════════════════════

const KOSTRA_FGK: Record<string, { code: string; label: string }> = {
  Brann: { code: "FGK17", label: "Brann og ulykkesvern" },
  "Drift/vei": { code: "FGK5", label: "Samferdsel" },
  VA: { code: "FGK14", label: "Vann, avløp og renovasjon" },
  Plan: { code: "FGK3", label: "Plan, byggesak og miljø" },
  Eiendom: { code: "FGK6a", label: "Eiendomsforvaltning" },
};

async function fetchSectorData(code: string): Promise<SectorData[]> {
  const fgkCodes = Object.values(KOSTRA_FGK).map((s) => s.code);

  try {
    const resp = await fetch("https://data.ssb.no/api/v0/no/table/12362", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: [
          { code: "KOKart0000", selection: { filter: "item", values: ["AGD10"] } },
          { code: "Tid", selection: { filter: "top", values: ["3"] } },
          { code: "KOKkommuneregion0000", selection: { filter: "item", values: [code] } },
          { code: "ContentsCode", selection: { filter: "item", values: ["KOSbelop0000"] } },
          { code: "KOKfunksjon0000", selection: { filter: "item", values: fgkCodes } },
        ],
        response: { format: "json-stat2" },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) return [];
    const data = (await resp.json()) as JsonStatDataset;
    if (!data.value?.length) return [];

    const yearIndex = data.dimension?.Tid?.category?.index || {};
    const years = Object.entries(yearIndex)
      .sort(([, a], [, b]) => (a as number) - (b as number))
      .map(([y]) => y);

    const sectors: SectorData[] = [];

    for (const [sector, cfg] of Object.entries(KOSTRA_FGK)) {
      for (const year of [...years].reverse()) {
        const value = getJsonStatValue(data, {
          KOKart0000: "AGD10",
          Tid: year,
          KOKkommuneregion0000: code,
          ContentsCode: "KOSbelop0000",
          KOKfunksjon0000: cfg.code,
        });

        if (value !== null) {
          sectors.push({
            sector,
            expenditure_1000nok: Math.round(value),
            year,
            source: "ssb_12362",
          });
          break;
        }
      }
    }

    return sectors;
  } catch (e) {
    console.log("SSB 12362 sector data failed:", e);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NVDB: Bridges and tunnels (Statens vegvesen API v3)
//
// Object type 60 = bridges, 67 = tunnels
// Filters by municipality code (4-digit)
// ═══════════════════════════════════════════════════════════════════════════

async function fetchNVDBInfrastructure(code: string): Promise<NvdbData> {
  const fetchCount = async (objectType: number): Promise<number> => {
    try {
      const url = `https://nvdbapiles-v3.atlas.vegvesen.no/vegobjekter/${objectType}/statistikk?kommune=${code}`;
      const resp = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) return 0;
      const data = await resp.json();
      return data?.antall || 0;
    } catch {
      return 0;
    }
  };

  const [bridges, tunnels] = await Promise.all([fetchCount(60), fetchCount(67)]);

  console.log(`NVDB: ${code} → ${bridges} broer, ${tunnels} tunneler`);
  return { bridges, tunnels };
}

// ═══════════════════════════════════════════════════════════════════════════
// Fire stats (estimate — DSB BRIS has no public API)
// ═══════════════════════════════════════════════════════════════════════════

function estimateFireStats(population: number | null, areaKm2: number | null) {
  if (!population) return null;

  let rates;
  if (population < 5000) {
    rates = { building_fires_per1k: 0.55, chimney_fires_per1k: 0.5, callouts_per1k: 3.2 };
  } else if (population < 20000) {
    rates = { building_fires_per1k: 0.45, chimney_fires_per1k: 0.35, callouts_per1k: 4.0 };
  } else if (population < 50000) {
    rates = { building_fires_per1k: 0.42, chimney_fires_per1k: 0.25, callouts_per1k: 5.0 };
  } else {
    rates = { building_fires_per1k: 0.38, chimney_fires_per1k: 0.15, callouts_per1k: 6.5 };
  }

  const areaFactor = areaKm2 && areaKm2 > 1000 ? 1.15 : 1.0;
  const buildingFires = Math.round((population / 1000) * rates.building_fires_per1k);
  const chimneyFires = Math.round((population / 1000) * rates.chimney_fires_per1k);

  return {
    total_fires: buildingFires + chimneyFires,
    building_fires: buildingFires,
    chimney_fires: chimneyFires,
    total_callouts: Math.round((population / 1000) * rates.callouts_per1k * areaFactor),
    source: "estimate_population_bracket",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hardcoded reference data
// ═══════════════════════════════════════════════════════════════════════════

const FALLBACK_CODES: Record<string, string> = {
  Oslo: "0301",
  Bergen: "4601",
  Trondheim: "5001",
  Stavanger: "1103",
  Bærum: "3024",
  Kristiansand: "4204",
  Drammen: "3005",
  Asker: "3025",
  Lillestrøm: "3030",
  Fredrikstad: "3004",
  Sandnes: "1108",
  Tromsø: "5401",
  Ålesund: "1507",
  Bodø: "1804",
  Verdal: "5038",
  Steinkjer: "5006",
  Stjørdal: "5035",
  Levanger: "5037",
  Namsos: "5007",
  Rana: "1833",
  Narvik: "1806",
  Harstad: "5402",
  Alta: "5403",
  Hammerfest: "5404",
  Haugesund: "1106",
  Molde: "1506",
  Kristiansund: "1505",
  Gjøvik: "3407",
  Hamar: "3403",
  Lillehammer: "3405",
  Kongsvinger: "3401",
  Ullensaker: "3033",
  Sola: "1124",
  Ringebu: "3431",
  Arendal: "4203",
  Larvik: "3805",
  Sandefjord: "3804",
  Tønsberg: "3803",
  Skien: "3807",
  Porsgrunn: "3806",
  Moss: "3002",
  Halden: "3001",
  Sarpsborg: "3003",
  Lørenskog: "3029",
  Karmøy: "1149",
};

const CENTRALITY: Record<string, number> = {
  Oslo: 1,
  Bergen: 1,
  Trondheim: 1,
  Stavanger: 1,
  Bærum: 1,
  Kristiansand: 2,
  Drammen: 1,
  Tromsø: 2,
  Bodø: 3,
  Ringebu: 5,
};

const CONTROLLED_AIRSPACE: Record<string, { type: string; airport: string; radius_km: number }> = {
  Oslo: { type: "TMA", airport: "ENGM Gardermoen", radius_km: 30 },
  Ullensaker: { type: "CTR", airport: "ENGM Gardermoen", radius_km: 15 },
  Bergen: { type: "CTR", airport: "ENBR Flesland", radius_km: 15 },
  Stavanger: { type: "CTR", airport: "ENZV Sola", radius_km: 15 },
  Trondheim: { type: "CTR", airport: "ENVA Værnes", radius_km: 15 },
  Tromsø: { type: "CTR", airport: "ENTC Langnes", radius_km: 10 },
  Bodø: { type: "CTR", airport: "ENBO Bodø", radius_km: 12 },
  Kristiansand: { type: "CTR", airport: "ENCN Kjevik", radius_km: 10 },
};

const PROTECTED_AREAS: Record<string, string[]> = {
  Ringebu: ["Rondane nasjonalpark"],
  Narvik: ["Ofoten landskapsvernområde"],
  Rana: ["Saltfjellet–Svartisen nasjonalpark"],
  Bodø: ["Sjunkhatten nasjonalpark"],
};

// ═══════════════════════════════════════════════════════════════════════════
// Helpers: population bracket, service inference, centrality fallback
// ═══════════════════════════════════════════════════════════════════════════

function getPopulationBracket(pop: number | null): string {
  if (!pop || pop < 5000) return "small_rural";
  if (pop < 20000) return "mid_tier";
  return "urban";
}

function inferCentrality(name: string, population: number | null): number | null {
  if (CENTRALITY[name]) return CENTRALITY[name];
  if (!population) return null;
  if (population > 50000) return 2;
  if (population > 15000) return 3;
  if (population > 5000) return 4;
  return 5;
}

function inferServices(population: number | null) {
  const pop = population || 5000;
  const base = [
    { id: "teknisk", name: "Teknisk drift", relevant_use_cases: ["UC06", "UC04", "UC17"] },
    { id: "plan", name: "Plan og bygg", relevant_use_cases: ["UC01", "UC02", "UC03"] },
    { id: "brann", name: "Brann og redning", relevant_use_cases: ["UC12", "UC13", "UC14"] },
    { id: "miljo", name: "Miljø og klima", relevant_use_cases: ["UC09", "UC10", "UC11"] },
  ];

  if (pop < 5000)
    return {
      departments: [...base, { id: "landbruk", name: "Landbruk", relevant_use_cases: ["UC15", "UC16"] }],
    };
  if (pop < 20000)
    return {
      departments: [
        ...base,
        { id: "va", name: "Vann og avløp", relevant_use_cases: ["UC04", "UC05"] },
        { id: "eiendom", name: "Eiendom", relevant_use_cases: ["UC17", "UC18"] },
        { id: "landbruk", name: "Landbruk", relevant_use_cases: ["UC15", "UC16"] },
      ],
    };
  return {
    departments: [
      ...base,
      { id: "va", name: "Vann og avløp", relevant_use_cases: ["UC04", "UC05"] },
      { id: "eiendom", name: "Eiendom", relevant_use_cases: ["UC17", "UC18"] },
      { id: "geodata", name: "Geodata", relevant_use_cases: ["UC23", "UC24"] },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { municipality_name } = await req.json();
    if (!municipality_name) {
      return new Response(JSON.stringify({ success: false, error: "Municipality name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchName = municipality_name.replace(/\s*\(.*?\)\s*$/, "").trim();

    // ── Step 1: Resolve municipality code ────────────────────────────────
    let municipalityCode: string | null = FALLBACK_CODES[municipality_name] || null;
    let areaKm2: number | null = null;
    let officialName = municipality_name;

    let kartverket = await lookupMunicipality(searchName);
    if (!kartverket && searchName !== municipality_name) {
      kartverket = await lookupMunicipality(municipality_name);
    }
    if (kartverket) {
      municipalityCode = kartverket.code;
      officialName = kartverket.officialName;
      if (kartverket.areaKm2 > 0) areaKm2 = kartverket.areaKm2;
    }

    if (!municipalityCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Could not resolve municipality code for "${municipality_name}"`,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Step 2: Fetch all data in parallel ───────────────────────────────
    const [
      populationResult,
      roadResult,
      propertyResult,
      buildingResult,
      vaResult,
      landUseResult,
      sectorResult,
      nvdbResult,
    ] = await Promise.all([
      fetchSSBPopulation(municipalityCode),
      fetchSSBRoadKm(municipalityCode),
      fetchSSBPropertyData(municipalityCode),
      fetchSSBBuildings(municipalityCode),
      fetchSSBVaNetwork(municipalityCode),
      fetchSSBLandUse(municipalityCode),
      fetchSectorData(municipalityCode),
      fetchNVDBInfrastructure(municipalityCode),
    ]);

    // ── Step 3: Assemble indicators ──────────────────────────────────────
    const population = populationResult?.population || null;
    const bracket = getPopulationBracket(population);
    const centrality = inferCentrality(municipality_name, population);
    const popDensity = population && areaKm2 ? Math.round(population / areaKm2) : null;

    const indicators: Array<{
      id: string;
      name: string;
      value: number;
      unit: string;
      year?: string;
      source: string;
    }> = [];

    if (populationResult) {
      indicators.push({
        id: "population",
        name: "Folkemengde",
        value: populationResult.population,
        unit: "personer",
        year: populationResult.year,
        source: "ssb_07459",
      });
    }

    if (areaKm2) {
      indicators.push({
        id: "area_km2",
        name: "Areal",
        value: areaKm2,
        unit: "km²",
        source: "kartverket",
      });
    }

    if (popDensity) {
      indicators.push({
        id: "pop_density",
        name: "Befolkningstetthet",
        value: popDensity,
        unit: "innb./km²",
        source: "derived",
      });
    }

    if (roadResult) {
      indicators.push({
        id: "road_km",
        name: "Kommunale veier",
        value: roadResult.roadKm,
        unit: "km",
        year: roadResult.year,
        source: "ssb_11814",
      });
    }

    // ── Step 4: Assemble drone relevance profile ─────────────────────────
    const totalBuildingAreaM2 =
      propertyResult?.areal_per_innbygger_m2 && population
        ? Math.round(population * propertyResult.areal_per_innbygger_m2)
        : null;

    const droneRelevance = {
      population_bracket: bracket,
      population_density: popDensity,
      centrality_index: centrality,
      urban_rural: centrality ? (centrality <= 2 ? "Urban" : centrality <= 4 ? "Halvsentral" : "Rural") : null,
      infrastructure_complexity:
        population && population > 50000 ? "Høy" : population && population > 10000 ? "Middels" : "Lav",
      controlled_airspace: CONTROLLED_AIRSPACE[municipality_name] || null,
      protected_areas: PROTECTED_AREAS[municipality_name] || [],
    };

    // ── Step 5: Fire stats ───────────────────────────────────────────────
    const fireEstimate = estimateFireStats(population, areaKm2);
    const fireSector = sectorResult.find((s) => s.sector === "Brann");
    const fireStats = fireEstimate
      ? {
          ...fireEstimate,
          fire_expenditure_1000nok: fireSector?.expenditure_1000nok ?? null,
          expenditure_year: fireSector?.year ?? null,
          expenditure_source: fireSector?.source ?? null,
        }
      : null;

    // ── Step 6: Build response ───────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        municipality: officialName,
        municipality_code: municipalityCode,
        area_km2: areaKm2,

        indicators,

        // Real SSB data — buildings
        buildings: buildingResult ? { ...buildingResult, source: "ssb_03174" } : null,

        // Real SSB data — VA network
        va_network: vaResult ? { ...vaResult, source: "ssb_va" } : null,

        // Real SSB data — land use
        land_use: landUseResult
          ? {
              agricultural_km2: landUseResult.agricultural_dekar
                ? Math.round(landUseResult.agricultural_dekar / 10)
                : null,
              forest_km2: landUseResult.forest_dekar ? Math.round(landUseResult.forest_dekar / 10) : null,
              year: landUseResult.year,
              source: "ssb_09594",
            }
          : null,

        // NVDB infrastructure
        infrastructure: {
          bridges: nvdbResult.bridges,
          tunnels: nvdbResult.tunnels,
          source: "nvdb_v3",
        },

        // KOSTRA property management
        property_data: propertyResult
          ? {
              ...propertyResult,
              total_building_area_m2: totalBuildingAreaM2,
              source: "ssb_12051",
            }
          : null,

        // KOSTRA sector expenditure (drone-relevant only)
        sector_data: sectorResult,

        // Fire stats (estimate + actual expenditure where available)
        fire_stats: fireStats,

        // Drone relevance classification
        drone_relevance: droneRelevance,

        // Inferred municipal departments
        services: inferServices(population),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch municipal data",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
