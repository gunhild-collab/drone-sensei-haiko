import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/* ─── Platform weather limits ─── */
interface PlatformLimits {
  max_wind_speed: number;
  max_gust_speed: number;
  min_temperature: number;
  min_visibility: number;
  max_precipitation: number;
  icing_capable: boolean;
}

const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  default: { max_wind_speed: 12, max_gust_speed: 15, min_temperature: -15, min_visibility: 1000, max_precipitation: 5, icing_capable: false },
  "DJI Matrice 350 RTK": { max_wind_speed: 12, max_gust_speed: 15, min_temperature: -20, min_visibility: 1000, max_precipitation: 5, icing_capable: false },
  "DJI Mavic 4 Pro": { max_wind_speed: 12, max_gust_speed: 15, min_temperature: -10, min_visibility: 1000, max_precipitation: 3, icing_capable: false },
  "Aviant Notus": { max_wind_speed: 15, max_gust_speed: 18, min_temperature: -15, min_visibility: 800, max_precipitation: 5, icing_capable: false },
};

/* ─── Solar calculations (no API needed) ─── */
function getSunTimes(lat: number, lon: number, date: Date): { rise: number; set: number } {
  // Simplified sunrise/sunset using solar declination
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;

  const cosHourAngle = (-Math.sin(0) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));

  // Polar night / midnight sun
  if (cosHourAngle > 1) return { rise: 24, set: 0 }; // No sunrise
  if (cosHourAngle < -1) return { rise: 0, set: 24 }; // No sunset

  const hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI;
  const solarNoon = 12 - lon / 15; // approximate
  const rise = solarNoon - hourAngle / 15;
  const set = solarNoon + hourAngle / 15;

  return { rise: Math.max(0, rise), set: Math.min(24, set) };
}

function isDaylight(lat: number, lon: number, timestamp: Date): boolean {
  const hour = timestamp.getUTCHours() + 1; // Norway is UTC+1 (simplified)
  const sun = getSunTimes(lat, lon, timestamp);
  return hour >= sun.rise && hour < sun.set;
}

/* ─── Uptime calculation ─── */
interface MonthlyResult {
  month: number;
  monthName: string;
  conservative: number; // p10
  expected: number;     // p50
  optimistic: number;   // p90
  primaryConstraint: string;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const MONTH_NAMES = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { station_id, platform_name, night_flight, lat, lon } = await req.json();

    if (!station_id) {
      return new Response(JSON.stringify({ error: "station_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limits = PLATFORM_LIMITS[platform_name] || PLATFORM_LIMITS.default;
    const nightFlight = night_flight ?? false;
    const stationLat = lat || 60.0;
    const stationLon = lon || 10.0;

    // Fetch all weather observations for this station
    // Use pagination to handle >1000 rows
    let allObs: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("weather_observations")
        .select("observed_at, wind_speed, wind_speed_of_gust, air_temperature, precipitation_amount, relative_humidity, visibility")
        .eq("station_id", station_id)
        .order("observed_at", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw new Error(`DB error: ${error.message}`);
      if (data) allObs = allObs.concat(data);
      hasMore = (data?.length || 0) === pageSize;
      from += pageSize;
    }

    if (allObs.length === 0) {
      return new Response(JSON.stringify({ error: "No weather data for station", station_id }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by year-month, check each hour
    // Structure: { year: { month: { flyable: number, total: number, constraints: Record<string,number> } } }
    const yearMonthData: Record<number, Record<number, { flyable: number; total: number; constraints: Record<string, number> }>> = {};

    let missingVisibility = 0;
    let missingHumidity = 0;
    let totalObs = 0;

    for (const obs of allObs) {
      const ts = new Date(obs.observed_at);
      const year = ts.getUTCFullYear();
      const month = ts.getUTCMonth(); // 0-indexed
      totalObs++;

      if (!yearMonthData[year]) yearMonthData[year] = {};
      if (!yearMonthData[year][month]) yearMonthData[year][month] = { flyable: 0, total: 0, constraints: {} };

      const ym = yearMonthData[year][month];

      // Check daylight
      if (!nightFlight && !isDaylight(stationLat, stationLon, ts)) {
        continue; // Skip night hours
      }

      ym.total++;

      // Check each constraint
      let flyable = true;
      let constraint = "";

      if (obs.wind_speed !== null && obs.wind_speed >= limits.max_wind_speed) {
        flyable = false;
        constraint = "Vind";
      }
      if (obs.wind_speed_of_gust !== null && obs.wind_speed_of_gust >= limits.max_gust_speed) {
        flyable = false;
        constraint = constraint || "Vindkast";
      }
      if (obs.air_temperature !== null && obs.air_temperature < limits.min_temperature) {
        flyable = false;
        constraint = constraint || "Temperatur";
      }
      if (obs.visibility !== null && obs.visibility < limits.min_visibility) {
        flyable = false;
        constraint = constraint || "Sikt";
      } else if (obs.visibility === null) {
        missingVisibility++;
      }
      if (obs.precipitation_amount !== null && obs.precipitation_amount >= limits.max_precipitation) {
        flyable = false;
        constraint = constraint || "Nedbør";
      }
      // Icing check
      if (!limits.icing_capable && obs.air_temperature !== null && obs.air_temperature <= 0) {
        if (obs.relative_humidity !== null && obs.relative_humidity > 90) {
          flyable = false;
          constraint = constraint || "Ising";
        } else if (obs.relative_humidity === null) {
          missingHumidity++;
        }
      }

      if (flyable) {
        ym.flyable++;
      } else if (constraint) {
        ym.constraints[constraint] = (ym.constraints[constraint] || 0) + 1;
      }
    }

    // Aggregate per calendar month across years
    const monthlyResults: MonthlyResult[] = [];
    for (let m = 0; m < 12; m++) {
      const yearUptimes: number[] = [];
      const allConstraints: Record<string, number> = {};

      for (const year of Object.keys(yearMonthData).map(Number)) {
        const ym = yearMonthData[year]?.[m];
        if (!ym || ym.total === 0) continue;
        yearUptimes.push((ym.flyable / ym.total) * 100);
        for (const [c, n] of Object.entries(ym.constraints)) {
          allConstraints[c] = (allConstraints[c] || 0) + n;
        }
      }

      const primaryConstraint = Object.entries(allConstraints)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

      monthlyResults.push({
        month: m + 1,
        monthName: MONTH_NAMES[m],
        conservative: Math.round(percentile(yearUptimes, 10)),
        expected: Math.round(percentile(yearUptimes, 50)),
        optimistic: Math.round(percentile(yearUptimes, 90)),
        primaryConstraint,
      });
    }

    // Annual summary
    const annualExpected = monthlyResults.length > 0
      ? Math.round(monthlyResults.reduce((s, m) => s + m.expected, 0) / monthlyResults.length)
      : 0;
    const annualConservative = monthlyResults.length > 0
      ? Math.round(monthlyResults.reduce((s, m) => s + m.conservative, 0) / monthlyResults.length)
      : 0;
    const annualOptimistic = monthlyResults.length > 0
      ? Math.round(monthlyResults.reduce((s, m) => s + m.optimistic, 0) / monthlyResults.length)
      : 0;

    const years = Object.keys(yearMonthData).map(Number).sort();
    const warnings: string[] = [];
    if (missingVisibility / totalObs > 0.2) {
      warnings.push("Siktdata ikke tilgjengelig fra nærmeste stasjon. Oppetid kan avvike noe.");
    }
    if (missingHumidity / totalObs > 0.2) {
      warnings.push("Ingen relativ fuktighet tilgjengelig — isingsvurdering utelatt. Oppetid kan være overestimert vinterstid.");
    }

    return new Response(JSON.stringify({
      station_id,
      platform: platform_name || "default",
      night_flight: nightFlight,
      annual: { conservative: annualConservative, expected: annualExpected, optimistic: annualOptimistic },
      monthly: monthlyResults,
      data_range: { start: years[0], end: years[years.length - 1] },
      observation_count: totalObs,
      warnings,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("uptime-calculate error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
