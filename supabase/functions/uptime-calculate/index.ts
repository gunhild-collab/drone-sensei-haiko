import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/* ─── Generic conservative limits (safe for all platforms) ─── */
const GENERIC_LIMITS = {
  max_wind_speed: 11,      // m/s — most multirotors max out at 12
  max_gust_speed: 14,      // m/s
  min_temperature: -15,    // °C
  min_visibility: 1000,    // meters (VLOS regulatory minimum)
  max_precipitation: 3,    // mm/h
  icing_capable: false,    // assume no icing protection
};

/* ─── Solar calculations ─── */
function getSunTimes(lat: number, lon: number, date: Date): { rise: number; set: number } {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const cosHA = (-Math.sin(0) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
  if (cosHA > 1) return { rise: 24, set: 0 };
  if (cosHA < -1) return { rise: 0, set: 24 };
  const ha = Math.acos(cosHA) * 180 / Math.PI;
  const noon = 12 - lon / 15;
  return { rise: Math.max(0, noon - ha / 15), set: Math.min(24, noon + ha / 15) };
}

function isDaylight(lat: number, lon: number, ts: Date): boolean {
  const hour = ts.getUTCHours() + 1; // Norway UTC+1 simplified
  const sun = getSunTimes(lat, lon, ts);
  return hour >= sun.rise && hour < sun.set;
}

/* ─── Helpers ─── */
function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const i = (p / 100) * (s.length - 1);
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}

const MONTH_NAMES = ["Januar","Februar","Mars","April","Mai","Juni","Juli","August","September","Oktober","November","Desember"];

/* ─── Main ─── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { station_id, night_flight, lat, lon } = await req.json();
    if (!station_id) {
      return new Response(JSON.stringify({ error: "station_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limits = GENERIC_LIMITS;
    const nightFlight = night_flight ?? false;
    const sLat = lat || 60.0;
    const sLon = lon || 10.0;

    // Fetch all weather observations (paginated)
    let allObs: any[] = [];
    let from = 0;
    const ps = 1000;
    let more = true;
    while (more) {
      const { data, error } = await supabase
        .from("weather_observations")
        .select("observed_at, wind_speed, wind_speed_of_gust, air_temperature, precipitation_amount, relative_humidity, visibility")
        .eq("station_id", station_id)
        .order("observed_at", { ascending: true })
        .range(from, from + ps - 1);
      if (error) throw new Error(`DB: ${error.message}`);
      if (data) allObs = allObs.concat(data);
      more = (data?.length || 0) === ps;
      from += ps;
    }

    if (!allObs.length) {
      return new Response(JSON.stringify({ error: "No weather data", station_id }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by year-month
    const ym: Record<number, Record<number, { flyable: number; total: number; constraints: Record<string, number> }>> = {};
    let missingVis = 0, missingHum = 0, totalObs = 0;

    for (const obs of allObs) {
      const ts = new Date(obs.observed_at);
      const y = ts.getUTCFullYear(), m = ts.getUTCMonth();
      totalObs++;
      if (!ym[y]) ym[y] = {};
      if (!ym[y][m]) ym[y][m] = { flyable: 0, total: 0, constraints: {} };
      const bucket = ym[y][m];

      if (!nightFlight && !isDaylight(sLat, sLon, ts)) continue;
      bucket.total++;

      let flyable = true, constraint = "";
      if (obs.wind_speed != null && obs.wind_speed >= limits.max_wind_speed) { flyable = false; constraint = "Vind"; }
      if (obs.wind_speed_of_gust != null && obs.wind_speed_of_gust >= limits.max_gust_speed) { flyable = false; constraint = constraint || "Vindkast"; }
      if (obs.air_temperature != null && obs.air_temperature < limits.min_temperature) { flyable = false; constraint = constraint || "Temperatur"; }
      if (obs.visibility != null && obs.visibility < limits.min_visibility) { flyable = false; constraint = constraint || "Sikt"; }
      else if (obs.visibility == null) missingVis++;
      if (obs.precipitation_amount != null && obs.precipitation_amount >= limits.max_precipitation) { flyable = false; constraint = constraint || "Nedbør"; }
      if (!limits.icing_capable && obs.air_temperature != null && obs.air_temperature <= 0) {
        if (obs.relative_humidity != null && obs.relative_humidity > 90) { flyable = false; constraint = constraint || "Ising"; }
        else if (obs.relative_humidity == null) missingHum++;
      }

      if (flyable) bucket.flyable++;
      else if (constraint) bucket.constraints[constraint] = (bucket.constraints[constraint] || 0) + 1;
    }

    // Aggregate per calendar month
    const monthly = [];
    for (let m = 0; m < 12; m++) {
      const yearUptimes: number[] = [];
      const allC: Record<string, number> = {};
      for (const y of Object.keys(ym).map(Number)) {
        const b = ym[y]?.[m];
        if (!b || !b.total) continue;
        yearUptimes.push((b.flyable / b.total) * 100);
        for (const [c, n] of Object.entries(b.constraints)) allC[c] = (allC[c] || 0) + n;
      }
      const pc = Object.entries(allC).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
      monthly.push({
        month: m + 1,
        monthName: MONTH_NAMES[m],
        conservative: Math.round(percentile(yearUptimes, 10)),
        expected: Math.round(percentile(yearUptimes, 50)),
        optimistic: Math.round(percentile(yearUptimes, 90)),
        primaryConstraint: pc,
      });
    }

    const avg = (key: "conservative" | "expected" | "optimistic") =>
      monthly.length ? Math.round(monthly.reduce((s, m) => s + m[key], 0) / monthly.length) : 0;

    const years = Object.keys(ym).map(Number).sort();
    const warnings: string[] = [];
    if (missingVis / totalObs > 0.2) warnings.push("Siktdata ikke tilgjengelig fra nærmeste stasjon. Oppetid kan avvike noe.");
    if (missingHum / totalObs > 0.2) warnings.push("Ingen relativ fuktighet tilgjengelig — isingsvurdering utelatt. Oppetid kan være overestimert vinterstid.");

    return new Response(JSON.stringify({
      station_id,
      platform: "generic-conservative",
      night_flight: nightFlight,
      annual: { conservative: avg("conservative"), expected: avg("expected"), optimistic: avg("optimistic") },
      monthly,
      data_range: { start: years[0], end: years[years.length - 1] },
      observation_count: totalObs,
      limits_used: limits,
      warnings,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("uptime-calculate error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
