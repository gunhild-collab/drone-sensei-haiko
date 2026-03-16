import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { municipality_name, population, area_km2, road_km, va_km, buildings, terrain_type, density_per_km2, departments, iks_partners } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Du er en ekspert på kommunal dronebruk i Norge. Du analyserer kommuner og anbefaler droneoperasjoner basert på EASA-regelverk, SORA-metodikk og norsk luftfartslovgivning.

Svar ALLTID med gyldig JSON via tool_call. Ikke inkluder noe annet enn tool_call.`;

    const userPrompt = `Analyser dronemulighetene for ${municipality_name} kommune.

Kommunedata:
- Innbyggere: ${population || 'ukjent'}
- Areal: ${area_km2 || 'ukjent'} km²
- Veinett: ${road_km || 'ukjent'} km
- VA-ledningsnett: ${va_km || 'ukjent'} km
- Bygninger: ${buildings || 'ukjent'}
- Terreng: ${terrain_type || 'ukjent'}
- Befolkningstetthet: ${density_per_km2 || 'ukjent'} innb/km²

Aktive avdelinger: ${JSON.stringify(departments || [])}

IKS-samarbeid (brannvesen): ${JSON.stringify(iks_partners || [])}

Basert på kommunens størrelse, terreng, befolkningstetthet og aktive avdelinger:
1. Vurder hvilke droneoperasjoner som er relevante for HVER avdeling
2. Anbefal dronetyper og antall (konsolider der mulig mellom avdelinger)
3. Spesifiser EASA-kategori, tillatelse og pilotsertifisering per operasjon
4. Vurder IKS-samarbeid for brannvesen — kan droner deles mellom kommuner?
5. Estimer årlige flytimer per avdeling
6. Gi en totalvurdering med antall droner, kostnadsestimat og prioritert rekkefølge

Viktige hensyn:
- Brannvesen i IKS-samarbeid kan dele droner og piloter hvis responstid tillater det
- Små kommuner (<10k innbyggere) bør konsolidere mer aggressivt
- Terrengtype påvirker dronevalg (fjell/kyst → robust, flat → effektiv)
- Befolkningstetthet påvirker SORA GRC-klasse direkte`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "drone_analysis",
              description: "Returnerer en komplett droneanalyse for kommunen",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Kort oppsummering av dronemulighetene (2-3 setninger)",
                  },
                  department_analyses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        department: { type: "string" },
                        use_cases: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string" },
                              operation_type: { type: "string", enum: ["VLOS", "BVLOS", "EVLOS"] },
                              easa_category: { type: "string" },
                              required_permit: { type: "string" },
                              pilot_certification: { type: "string" },
                              drone_type: { type: "string" },
                              priority: { type: "string", enum: ["Høy", "Medium", "Lav"] },
                              annual_flight_hours: { type: "number" },
                              needs_thermal: { type: "boolean" },
                              needs_rtk: { type: "boolean" },
                            },
                            required: ["name", "description", "operation_type", "easa_category", "required_permit", "pilot_certification", "drone_type", "priority", "annual_flight_hours"],
                          },
                        },
                        total_annual_hours: { type: "number" },
                      },
                      required: ["department", "use_cases", "total_annual_hours"],
                    },
                  },
                  drone_fleet: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        drone_type: { type: "string" },
                        recommended_model: { type: "string" },
                        quantity: { type: "number" },
                        shared_between: { type: "array", items: { type: "string" } },
                        estimated_cost_nok: { type: "number" },
                        key_features: { type: "array", items: { type: "string" } },
                      },
                      required: ["drone_type", "recommended_model", "quantity", "shared_between", "estimated_cost_nok"],
                    },
                  },
                  iks_recommendation: {
                    type: "object",
                    properties: {
                      can_share: { type: "boolean" },
                      shared_resources: { type: "array", items: { type: "string" } },
                      recommendation: { type: "string" },
                      partner_municipalities: { type: "array", items: { type: "string" } },
                    },
                    required: ["can_share", "recommendation"],
                  },
                  total_drones_needed: { type: "number" },
                  total_annual_cost_nok: { type: "number" },
                  total_annual_flight_hours: { type: "number" },
                  implementation_priority: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        phase: { type: "number" },
                        title: { type: "string" },
                        departments: { type: "array", items: { type: "string" } },
                        description: { type: "string" },
                      },
                      required: ["phase", "title", "departments", "description"],
                    },
                  },
                },
                required: ["summary", "department_analyses", "drone_fleet", "iks_recommendation", "total_drones_needed", "total_annual_cost_nok", "total_annual_flight_hours", "implementation_priority"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "drone_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit — prøv igjen om litt" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Kreditt oppbrukt" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ success: false, error: "AI-analyse feilet" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ success: false, error: "Ingen analyse returnert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dmv-analyze error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Ukjent feil" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
