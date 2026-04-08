import { corsHeaders } from "@supabase/supabase-js/cors";

const CATEGORY_IDS = ["brann", "teknisk_vei", "va", "byggesak", "naturforvaltning", "kultur"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { municipality_name } = await req.json();
    if (!municipality_name) {
      return new Response(JSON.stringify({ success: false, error: "municipality_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize municipality name for URL lookup
    const normalizedName = municipality_name
      .replace(/\s*\(.*?\)\s*/g, "") // Remove parenthetical like "(Akershus)"
      .toLowerCase()
      .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
      .replace(/\s+/g, "-");

    // Step 1: Search for the municipality's organization page using Firecrawl search
    console.log(`Searching for org structure of: ${municipality_name}`);
    
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${municipality_name} kommune organisasjon organisasjonskart avdelinger tjenesteområder`,
        limit: 5,
        lang: "no",
        country: "no",
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const searchData = await searchResponse.json();
    if (!searchResponse.ok) {
      console.error("Firecrawl search error:", searchData);
      return new Response(JSON.stringify({ success: false, error: "Search failed", details: searchData }), {
        status: searchResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect scraped content from search results
    const scrapedContent: string[] = [];
    const sourceUrls: string[] = [];

    for (const result of searchData?.data || []) {
      if (result.markdown) {
        scrapedContent.push(`## ${result.title || result.url}\n${result.markdown.slice(0, 3000)}`);
        sourceUrls.push(result.url);
      }
    }

    if (scrapedContent.length === 0) {
      // Fallback: try direct scrape of likely URL
      const fallbackUrl = `https://www.${normalizedName}.kommune.no`;
      console.log(`No search results, trying fallback: ${fallbackUrl}`);
      
      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: fallbackUrl,
          formats: ["markdown", "links"],
          onlyMainContent: true,
        }),
      });

      const scrapeData = await scrapeResponse.json();
      if (scrapeResponse.ok && scrapeData?.data?.markdown) {
        scrapedContent.push(scrapeData.data.markdown.slice(0, 5000));
        sourceUrls.push(fallbackUrl);

        // Look for org-related links and scrape them too
        const orgLinks = (scrapeData.data?.links || [])
          .filter((link: string) =>
            /organisas|om-kommunen|tjenesteomr|avdeling|sektor/i.test(link)
          )
          .slice(0, 2);

        for (const link of orgLinks) {
          try {
            const subResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ url: link, formats: ["markdown"], onlyMainContent: true }),
            });
            const subData = await subResp.json();
            if (subResp.ok && subData?.data?.markdown) {
              scrapedContent.push(subData.data.markdown.slice(0, 3000));
              sourceUrls.push(link);
            }
          } catch (e) {
            console.warn(`Failed to scrape sub-link ${link}:`, e);
          }
        }
      }
    }

    if (scrapedContent.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        confidence: "not_found",
        source_url: null,
        raw_departments: [],
        mapped: [],
        notes: `Fant ingen organisasjonsdata for ${municipality_name}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Use AI to extract and map departments
    const systemPrompt = `Du er en dataekstraheringsassistent. Oppgaven din er å finne den faktiske organisasjonsstrukturen til en norsk kommune basert på innholdet fra kommunens nettside.

MAPPING: Map hver avdeling du finner til én eller flere av disse kategoriene:

Kategori-ID | Matcher hvis avdelingen inneholder
brann | brann, redning, beredskap, 110
teknisk_vei | teknisk, drift, vei, infrastruktur, kommunalteknikk
va | vann, avløp, VA, ledningsnett
byggesak | plan, bygg, byggesak, eiendom, arealplan, kart, oppmåling, geodata
naturforvaltning | miljø, klima, landbruk, skog, natur, friluft
kultur | kultur, idrett, fritid, turisme

REGLER:
- Bruk KUN avdelinger du faktisk finner i teksten. Aldri gjett.
- Hvis kommunen bruker samlekategorier (f.eks. "Samfunnsutvikling" som dekker plan + miljø), map den til ALLE relevante kategori-IDer.
- Hvis brannvesenet er et IKS (interkommunalt selskap), noter navnet og partnerkommunene.
- Ikke inkluder helse, omsorg, oppvekst, skole, barnehage, NAV eller HR/økonomi/admin.

Returner BARE gyldig JSON, ingen forklaring.`;

    const userPrompt = `Kommune: ${municipality_name}

Innhold fra kommunens nettside:
${scrapedContent.join("\n\n---\n\n")}

Returner JSON med dette formatet:
{
  "raw_departments": ["liste av avdelinger funnet på nettsiden"],
  "mapped": [
    { "id": "kategori_id", "name": "Faktisk avdelingsnavn fra nettsiden", "iks": false }
  ],
  "confidence": "high|medium|low",
  "notes": "Eventuelle merknader"
}

Hvis brann er et IKS, legg til "iks": true og "partners": ["kommune1", "kommune2"].`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [{
          type: "function",
          function: {
            name: "extract_departments",
            description: "Extract municipality departments and map to categories",
            parameters: {
              type: "object",
              properties: {
                raw_departments: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of department names found on the website",
                },
                mapped: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", enum: [...CATEGORY_IDS] },
                      name: { type: "string", description: "Actual department name from the website" },
                      iks: { type: "boolean", description: "Whether this is an inter-municipal cooperation (IKS)" },
                      partners: {
                        type: "array",
                        items: { type: "string" },
                        description: "Partner municipalities if IKS",
                      },
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
      const body = await aiResponse.text();
      console.error(`AI gateway error [${status}]:`, body);
      
      if (status === 429) {
        return new Response(JSON.stringify({ success: false, error: "AI rate limit, prøv igjen om litt" }), {
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
    
    // Extract tool call result
    let extractedData: any;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extractedData = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      }
    }

    // Fallback: try parsing content directly
    if (!extractedData) {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch {
          console.error("Failed to parse AI content as JSON");
        }
      }
    }

    if (!extractedData) {
      return new Response(JSON.stringify({
        success: true,
        confidence: "low",
        source_url: sourceUrls[0] || null,
        raw_departments: [],
        mapped: [],
        notes: "AI klarte ikke å ekstrahere avdelingsdata fra nettsiden",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate mapped categories
    const validMapped = (extractedData.mapped || []).filter(
      (m: any) => CATEGORY_IDS.includes(m.id) && m.name
    );

    const result = {
      success: true,
      source_url: sourceUrls[0] || null,
      source_urls: sourceUrls,
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
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
