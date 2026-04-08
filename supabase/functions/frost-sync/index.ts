import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FROST_CLIENT_ID = Deno.env.get("FROST_CLIENT_ID")!;
const FROST_BASE = "https://frost.met.no";

interface FrostObservation {
  elementId: string;
  value: number;
}

interface FrostDataItem {
  referenceTime: string;
  observations: FrostObservation[];
}

/**
 * Find nearest Frost station to given coordinates
 */
async function findNearestStation(lat: number, lon: number) {
  const url = `${FROST_BASE}/sources/v0.jsonld?geometry=nearest(POINT(${lon} ${lat}))&nearestmaxcount=1`;
  const resp = await fetch(url, {
    headers: { Authorization: `Basic ${btoa(FROST_CLIENT_ID + ":")}` },
  });
  if (!resp.ok) throw new Error(`Frost sources API: ${resp.status} ${await resp.text()}`);
  const json = await resp.json();
  const src = json.data?.[0];
  if (!src) throw new Error("No Frost station found");
  return { id: src.id as string, name: src.name as string };
}

/**
 * Fetch hourly observations from Frost API for a station.
 * Splits into yearly chunks to stay under 100k row limit.
 */
async function fetchFrostData(stationId: string, startYear: number, endYear: number) {
  const elements = "wind_speed,wind_speed_of_gust(P1H),air_temperature,sum(precipitation_amount P1H),relative_humidity,visibility";
  const allRows: Array<{ observed_at: string; wind_speed: number | null; wind_speed_of_gust: number | null; air_temperature: number | null; precipitation_amount: number | null; relative_humidity: number | null; visibility: number | null }> = [];

  for (let year = startYear; year <= endYear; year++) {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    console.log(`Fetching ${stationId} for ${year}...`);

    let offset = 0;
    const limit = 50000;
    let hasMore = true;

    while (hasMore) {
      const url = `${FROST_BASE}/observations/v0.jsonld?sources=${stationId}&referencetime=${from}/${to}&elements=${elements}&timeresolutions=PT1H&limit=${limit}&offset=${offset}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Basic ${btoa(FROST_CLIENT_ID + ":")}` },
      });

      if (resp.status === 404) {
        console.log(`No data for ${stationId} in ${year}`);
        break;
      }
      if (resp.status === 412) {
        console.log(`No matching data for ${stationId} in ${year} (412)`);
        break;
      }
      if (!resp.ok) {
        const text = await resp.text();
        console.error(`Frost API error: ${resp.status} ${text}`);
        break;
      }

      const json = await resp.json();
      const items: FrostDataItem[] = json.data || [];

      for (const item of items) {
        const row: any = { observed_at: item.referenceTime };
        for (const obs of item.observations) {
          const key = obs.elementId
            .replace("wind_speed_of_gust(PT1H)", "wind_speed_of_gust")
            .replace("sum(precipitation_amount PT1H)", "precipitation_amount");
          if (["wind_speed", "wind_speed_of_gust", "air_temperature", "precipitation_amount", "relative_humidity", "visibility"].includes(key)) {
            row[key] = obs.value;
          }
        }
        allRows.push(row);
      }

      hasMore = items.length === limit;
      offset += limit;

      // Throttle: ~200ms between calls
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return allRows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { municipality_code, lat, lon, municipality_name } = await req.json();

    if (!municipality_code || !lat || !lon) {
      return new Response(JSON.stringify({ error: "municipality_code, lat, lon required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check if we already have a station mapping
    const { data: existing } = await supabase
      .from("municipality_weather_stations")
      .select("*")
      .eq("municipality_code", municipality_code)
      .single();

    let stationId: string;
    let stationName: string;

    if (existing?.frost_station_id) {
      stationId = existing.frost_station_id;
      stationName = existing.frost_station_name || stationId;
      console.log(`Using cached station: ${stationId}`);
    } else {
      // Find nearest station
      const station = await findNearestStation(lat, lon);
      stationId = station.id;
      stationName = station.name;

      // Upsert station mapping
      await supabase.from("municipality_weather_stations").upsert({
        municipality_code,
        municipality_name: municipality_name || municipality_code,
        latitude: lat,
        longitude: lon,
        frost_station_id: stationId,
        frost_station_name: stationName,
      }, { onConflict: "municipality_code" });
    }

    // 2. Check how much data we already have cached
    const { count } = await supabase
      .from("weather_observations")
      .select("*", { count: "exact", head: true })
      .eq("station_id", stationId);

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 10;

    // If we have >50k rows, assume data is already synced
    if ((count || 0) > 50000) {
      return new Response(JSON.stringify({
        success: true,
        station_id: stationId,
        station_name: stationName,
        cached: true,
        observation_count: count,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch from Frost
    const rows = await fetchFrostData(stationId, startYear, currentYear - 1);
    console.log(`Fetched ${rows.length} observations from Frost`);

    // 4. Insert in batches
    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(r => ({
        station_id: stationId,
        observed_at: r.observed_at,
        wind_speed: r.wind_speed ?? null,
        wind_speed_of_gust: r.wind_speed_of_gust ?? null,
        air_temperature: r.air_temperature ?? null,
        precipitation_amount: r.precipitation_amount ?? null,
        relative_humidity: r.relative_humidity ?? null,
        visibility: r.visibility ?? null,
        source: "frost",
      }));

      const { error } = await supabase
        .from("weather_observations")
        .upsert(batch, { onConflict: "station_id,observed_at,source", ignoreDuplicates: true });

      if (error) {
        console.error(`Batch insert error at ${i}:`, error.message);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      station_id: stationId,
      station_name: stationName,
      cached: false,
      observation_count: inserted,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("frost-sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
