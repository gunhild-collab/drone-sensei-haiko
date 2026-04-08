const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_IDS = ["brann", "teknisk_vei", "va", "byggesak", "naturforvaltning", "kultur"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { municipality_name } = await req.json();
    if (!municipality_name) {
      return new Response(JSON.stringify({ success: false, error: "municipality_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "AI gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Searching for org structure: ${municipality_name}`);

    // Single Firecrawl search call with scraping — fastest path
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `"${municipality_name}" kommune organisasjon avdelinger tjenesteområder site:kommune.no`,
        limit: 3,
        lang: "no",
        country: "no",
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!searchResponse.ok) {
      const errBody = await searchResponse.text();
      console.error("Firecrawl search error:", searchResponse.status, errBody);
      return new Response(JSON.stringify({ success: false, error: `Firecrawl search failed: ${searchResponse.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchResponse.json();
    const results = searchData?.data || [];
    
    const scrapedContent = results
      .filter((r: any) => r.markdown)
      .map((r: any) => r.markdown.slice(0, 2500))
      .join("\n\n---\n\n");

    const sourceUrl = results[0]?.url || null;

    if (!scrapedContent) {
      return new Response(JSON.stringify({
        success: true, confidence: "not_found", source_url: null,
        raw_departments: [], mapped: [],
        notes: `Fant ingen organisasjonsdata for ${municipality_name}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Got ${results.length} search results, calling AI...`);

    // AI extraction with tool calling
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Du er en dataekstraheringsassistent som finner organisasjonsstrukturen til norske kommuner.

Map avdelinger til disse kategori-IDer:
- brann: brann, redning, beredskap, 110
- teknisk_vei: teknisk, drift, vei, infrastruktur, kommunalteknikk
- va: vann, avløp, VA, ledningsnett
- byggesak: plan, bygg, byggesak, eiendom, arealplan, kart, oppmåling, geodata
- naturforvaltning: miljø, klima, landbruk, skog, natur, friluft
- kultur: kultur, idrett, fritid, turisme

REGLER:
- Bruk KUN avdelinger du faktisk finner i teksten. Aldri gjett.
- Samlekategorier mappes til ALLE relevante kategori-IDer.
- Brannvesen som IKS: noter navn og partnerkommuner.
- IKKE inkluder helse, omsorg, oppvekst, skole, barnehage, NAV, HR/økonomi/admin.`,
          },
          {
            role: "user",
            content: `Kommune: ${municipality_name}\n\nInnhold fra kommunens nettside:\n${scrapedContent}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_departments",
            description: "Extract municipality departments and map to categories",
            parameters: {
              type: "object",
              properties: {
                raw_departments: { type: "array", items: { type: "string" } },
                mapped: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", enum: [...CATEGORY_IDS] },
                      name: { type: "string" },
                      iks: { type: "boolean" },
                      partners: { type: "array", items: { type: "string" } },
                    },
                    required: ["id", "name"],
                  },
                },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                notes: { type: "string" },
              },
              required: ["raw_departments", "mapped", "confidence"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_departments" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      console.error(`AI gateway error [${status}]`);
      if (status === 429) {
        return new Response(JSON.stringify({ success: false, error: "AI rate limit" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Kreditt oppbrukt" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let extractedData: any;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try { extractedData = JSON.parse(toolCall.function.arguments); } catch { /* ignore */ }
    }
    if (!extractedData) {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) { try { extractedData = JSON.parse(jsonMatch[0]); } catch { /* ignore */ } }
    }

    if (!extractedData) {
      return new Response(JSON.stringify({
        success: true, confidence: "low", source_url: sourceUrl,
        raw_departments: [], mapped: [],
        notes: "AI klarte ikke å ekstrahere avdelingsdata",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validMapped = (extractedData.mapped || []).filter(
      (m: any) => CATEGORY_IDS.includes(m.id) && m.name
    );

    const result = {
      success: true,
      source_url: sourceUrl,
      raw_departments: extractedData.raw_departments || [],
      mapped: validMapped,
      confidence: extractedData.confidence || "low",
      notes: extractedData.notes || null,
    };

    console.log(`Extracted ${validMapped.length} departments for ${municipality_name}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("org-lookup error:", error);
    return new Response(JSON.stringify({
      success: false, error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
