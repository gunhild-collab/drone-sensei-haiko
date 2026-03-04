import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { maturity_level, use_case_ids, budget_range, sensor_needs } = await req.json();

    // Build query
    let query = supabase.from('drone_platforms').select('*');

    // Filter by EASA category based on maturity
    if (maturity_level && maturity_level <= 2) {
      query = query.in('easa_category', ['Open']);
    }

    const { data: platforms, error } = await query.order('price_nok_estimate');

    if (error) throw error;

    // Score and rank platforms based on needs
    const scored = (platforms || []).map(platform => {
      let score = 0;
      const reasons: string[] = [];

      // Use case match scoring
      if (use_case_ids && use_case_ids.length > 0) {
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

      // Budget match
      if (budget_range) {
        const price = platform.price_nok_estimate || 0;
        if (price <= budget_range.max) {
          score += 15;
          reasons.push('Innenfor budsjett');
        } else {
          reasons.push('Over budsjett');
        }
      }

      // Operational robustness
      if (platform.has_rtk) { score += 5; reasons.push('RTK-støtte'); }
      if (platform.ip_rating) { score += 5; reasons.push(`${platform.ip_rating} værbestandig`); }
      if (platform.max_flight_time_min && platform.max_flight_time_min >= 40) {
        score += 5;
        reasons.push(`${platform.max_flight_time_min} min flytid`);
      }

      // Maturity level alignment
      if (maturity_level) {
        if (maturity_level <= 1 && platform.category === 'consumer') score += 5;
        if (maturity_level === 2 && platform.category === 'prosumer') score += 5;
        if (maturity_level >= 3 && (platform.category === 'enterprise' || platform.category === 'industrial')) score += 5;
      }

      return { ...platform, match_score: Math.round(score), match_reasons: reasons };
    });

    // Sort by match score
    scored.sort((a, b) => b.match_score - a.match_score);

    return new Response(
      JSON.stringify({
        success: true,
        platforms: scored.slice(0, 10), // Top 10 recommendations
        total_available: scored.length,
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
