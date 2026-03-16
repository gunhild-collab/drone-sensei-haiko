import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Verified use case database — the AI MUST only select from these, never invent new ones
const VERIFIED_USE_CASES = [
  { id: "UC-001", name: "Situasjonsbevissthet ved bygningsbrann", department: "Brann og redning", operationType: "VLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 eller A2 + operasjonsmanual", droneClass: "Medium (termisk)", priority: "Høy", flightHoursFormula: "30 timer/år flat", mtom: 0.5, needsThermal: true, needsRtk: false, notes: "Termisk kamera kritisk. To piloter anbefalt." },
  { id: "UC-002", name: "Søk og redning i terreng", department: "Brann og redning", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS-tillatelse", droneClass: "Medium (termisk)", priority: "Høy", flightHoursFormula: "50 timer/år flat", mtom: 0.5, needsThermal: true, needsRtk: false, notes: "BVLOS-tillatelse er separat prosess." },
  { id: "UC-003", name: "Søk og redning ved flom og vann", department: "Brann og redning", operationType: "BVLOS", easaCategory: "STS-01 eller A2 (VLOS)", certRequirement: "A2 (VLOS) / STS-01 (BVLOS)", droneClass: "Medium (termisk)", priority: "Høy", flightHoursFormula: "20 timer/år flat", mtom: 0.5, needsThermal: true, needsRtk: false, notes: "Over vann reduserer GRC." },
  { id: "UC-004", name: "Skogbrann - tidlig varsling", department: "Brann og redning", operationType: "BVLOS", easaCategory: "STS-01 / Spesifikk + OpAuth", certRequirement: "STS-01 / A2 for VLOS", droneClass: "Medium (termisk) eller fixed-wing", priority: "Medium", flightHoursFormula: "15 timer/år flat", mtom: 0.9, needsThermal: true, needsRtk: false, notes: "Kun relevant for kommuner med skog >30%." },
  { id: "UC-005", name: "Skadedokumentasjon etter hendelse", department: "Brann og redning", operationType: "VLOS", easaCategory: "Åpen kategori A1/A2", certRequirement: "A1/A3 (under 250g) eller A2", droneClass: "Lett", priority: "Lav", flightHoursFormula: "10 timer/år flat", mtom: 0.249, needsThermal: false, needsRtk: false, notes: "Mini-klasse holder." },
  { id: "UC-006", name: "Veibane- og dekkeinspeksjon", department: "Tekniske tjenester - Vei", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + eventuelt BVLOS-tillatelse", droneClass: "Medium (RTK)", priority: "Høy", flightHoursFormula: "vei_km × 0.15 timer/år", mtom: 0.5, needsThermal: false, needsRtk: true, notes: "BVLOS nødvendig for effektiv inspeksjon langs vei." },
  { id: "UC-007", name: "Broinspeksjon - dekke og underside", department: "Tekniske tjenester - Vei", operationType: "VLOS", easaCategory: "Åpen A2 eller STS-01", certRequirement: "A2 eller STS-01", droneClass: "Medium", priority: "Høy", flightHoursFormula: "antall_broer × 1.5 timer/år", mtom: 0.5, needsThermal: false, needsRtk: false, notes: "VLOS — drone er nær bro." },
  { id: "UC-008", name: "Veimerkingsdokumentasjon", department: "Tekniske tjenester - Vei", operationType: "VLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01", droneClass: "Medium (RTK)", priority: "Lav", flightHoursFormula: "vei_km × 0.05 timer/år", mtom: 0.5, needsThermal: false, needsRtk: true, notes: "Kan samkjøres med UC-006." },
  { id: "UC-009", name: "Vei- og føreforhold vinter", department: "Tekniske tjenester - Vei", operationType: "VLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01", droneClass: "Medium (termisk)", priority: "Medium", flightHoursFormula: "10 timer/år sesongbasert", mtom: 0.9, needsThermal: true, needsRtk: false, notes: "Sesongbasert." },
  { id: "UC-010", name: "Tunnelinngang og portalinspeksjon", department: "Tekniske tjenester - Vei", operationType: "VLOS", easaCategory: "Åpen A1/A2", certRequirement: "A1/A3 eller A2", droneClass: "Lett", priority: "Medium", flightHoursFormula: "antall_tunneler × 0.5 timer/år", mtom: 0.249, needsThermal: false, needsRtk: false, notes: "Mini-klasse holder for portal." },
  { id: "UC-011", name: "Rørtrasé inspeksjon", department: "Vann og avløp", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01 + BVLOS ved lange strekk", droneClass: "Medium (termisk)", priority: "Høy", flightHoursFormula: "rør_km × 0.2 timer/år", mtom: 0.5, needsThermal: true, needsRtk: false, notes: "Termisk for lekkasjedeteksjon." },
  { id: "UC-012", name: "Reservoar og damovervåkning", department: "Vann og avløp", operationType: "VLOS", easaCategory: "Åpen A2", certRequirement: "A2", droneClass: "Lett eller medium", priority: "Medium", flightHoursFormula: "antall_reservoar × 3 timer/år", mtom: 0.249, needsThermal: false, needsRtk: false, notes: "Over ubebodd vann." },
  { id: "UC-013", name: "Flom og overvannkartlegging", department: "Vann og avløp", operationType: "BVLOS", easaCategory: "STS-01 / Spesifikk", certRequirement: "STS-01", droneClass: "Medium (RTK)", priority: "Høy", flightHoursFormula: "10 timer/år flat", mtom: 0.5, needsThermal: false, needsRtk: true, notes: "Digital høydemodell." },
  { id: "UC-014", name: "Termisk lekkasjedeteksjon nedgravd rør", department: "Vann og avløp", operationType: "VLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01", droneClass: "Medium (termisk)", priority: "Høy", flightHoursFormula: "rør_km × 0.1 timer/år", mtom: 0.9, needsThermal: true, needsRtk: false, notes: "Kun effektivt for varmtvannsrør/fjernvarme." },
  { id: "UC-015", name: "Tak- og fasadedokumentasjon kommunale bygg", department: "Byggesak / Eiendom", operationType: "VLOS", easaCategory: "Åpen A2 / STS-01", certRequirement: "A2", droneClass: "Lett eller medium", priority: "Høy", flightHoursFormula: "antall_kommunale_bygg × 0.5 timer/år", mtom: 0.249, needsThermal: false, needsRtk: false, notes: "Erstatter lift/klatrer." },
  { id: "UC-016", name: "Byggesakskontroll og fremdrift", department: "Byggesak / Eiendom", operationType: "VLOS", easaCategory: "Åpen A1/A2", certRequirement: "A1/A3 eller A2", droneClass: "Lett", priority: "Medium", flightHoursFormula: "antall_aktive_byggeprosjekter × 2 timer/år", mtom: 0.249, needsThermal: false, needsRtk: false, notes: "Månedlig flyging over byggetomt." },
  { id: "UC-017", name: "Plan og regulering - dokumentasjon", department: "Byggesak / Eiendom", operationType: "VLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01", droneClass: "Medium (RTK)", priority: "Medium", flightHoursFormula: "antall_planprosesser × 3 timer/år", mtom: 0.5, needsThermal: false, needsRtk: true, notes: "Ortofoto/3D-punktsky til planprosess." },
  { id: "UC-018", name: "Kulturminne og vernebygning dokumentasjon", department: "Byggesak / Eiendom", operationType: "VLOS", easaCategory: "Åpen A2", certRequirement: "A2", droneClass: "Lett", priority: "Lav", flightHoursFormula: "antall_verneobjekter × 1 timer/år", mtom: 0.249, needsThermal: false, needsRtk: false, notes: "3D-dokumentasjon til Riksantikvaren." },
  { id: "UC-019", name: "Vegetasjonskartlegging og habitat", department: "Naturforvaltning", operationType: "BVLOS", easaCategory: "STS-01 / Spesifikk + OpAuth", certRequirement: "STS-01 + BVLOS ved stort areal", droneClass: "Medium eller fixed-wing", priority: "Medium", flightHoursFormula: "areal_km2 × 0.002 timer/år", mtom: 0.9, needsThermal: false, needsRtk: false, notes: "Fixed-wing for >10km²." },
  { id: "UC-020", name: "Kystsonekartlegging og erosjon", department: "Naturforvaltning", operationType: "BVLOS", easaCategory: "STS-01 / Spesifikk", certRequirement: "STS-01", droneClass: "Medium (RTK) eller fixed-wing", priority: "Lav", flightHoursFormula: "5 timer/år flat", mtom: 0.9, needsThermal: false, needsRtk: true, notes: "Kun kystkommuner." },
  { id: "UC-021", name: "Skogovervåkning og skogbrannrisiko", department: "Naturforvaltning", operationType: "BVLOS", easaCategory: "STS-01 / Spesifikk + BVLOS", certRequirement: "STS-01 + BVLOS", droneClass: "Medium (termisk) eller fixed-wing", priority: "Medium", flightHoursFormula: "areal_skog_km2 × 0.003 timer/år", mtom: 0.9, needsThermal: true, needsRtk: false, notes: "Aktiveres om skogandel >20%." },
  { id: "UC-022", name: "Ras og skredrisiko overvåkning", department: "Naturforvaltning", operationType: "VLOS", easaCategory: "Åpen A2", certRequirement: "A2", droneClass: "Medium (RTK)", priority: "Høy", flightHoursFormula: "10 timer/år flat", mtom: 0.5, needsThermal: false, needsRtk: true, notes: "Høy verdi i fjellkommuner." },
  { id: "UC-023", name: "Vilttelling og dyrelivskartlegging", department: "Naturforvaltning", operationType: "BVLOS", easaCategory: "A2 / STS-01 ved BVLOS", certRequirement: "A2 eller STS-01", droneClass: "Medium (termisk) eller fixed-wing", priority: "Lav", flightHoursFormula: "10 timer/år flat", mtom: 0.9, needsThermal: true, needsRtk: false, notes: "Termisk for hjortevilt." },
  { id: "UC-024", name: "Jordbruksareal og tilstandskontroll", department: "Naturforvaltning / Landbruk", operationType: "BVLOS", easaCategory: "STS-01 / Spesifikk", certRequirement: "STS-01", droneClass: "Medium eller fixed-wing", priority: "Lav", flightHoursFormula: "jordbruk_areal_km2 × 0.01 timer/år", mtom: 0.9, needsThermal: false, needsRtk: false, notes: "Kun kommuner med landbruksforvaltning." },
  { id: "UC-025", name: "AED-levering ved hjertestans", department: "Helse og omsorg", operationType: "BVLOS", easaCategory: "Spesifikk - SORA SAIL IV", certRequirement: "Full SORA-opplæring + BVLOS + payload-tillatelse", droneClass: "Tung med payload", priority: "Høy", flightHoursFormula: "20 timer/år flat", mtom: 3.0, needsThermal: false, needsRtk: false, notes: "SAIL IV — krevende tillatelse. Krever AMK-integrasjon." },
  { id: "UC-026", name: "Medisinlevering til avsidesliggende", department: "Helse og omsorg", operationType: "BVLOS", easaCategory: "Spesifikk + BVLOS", certRequirement: "BVLOS + payload-tillatelse", droneClass: "Tung med payload", priority: "Medium", flightHoursFormula: "10 timer/år flat", mtom: 3.0, needsThermal: false, needsRtk: false, notes: "Relevant for øykommuner og spredt bebyggelse." },
  { id: "UC-027", name: "Skadevurdering etter ekstremvær", department: "Tverrfaglig beredskap", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01", droneClass: "Medium (RTK)", priority: "Høy", flightHoursFormula: "10 timer/år flat", mtom: 0.5, needsThermal: false, needsRtk: true, notes: "Krever rask mobilisering." },
  { id: "UC-028", name: "Storskala ortofoto og 3D-kartlegging", department: "Tverrfaglig", operationType: "BVLOS", easaCategory: "STS-01 / Spesifikk + BVLOS", certRequirement: "STS-01 + BVLOS", droneClass: "Medium (RTK) eller fixed-wing", priority: "Medium", flightHoursFormula: "areal_km2 × 0.004 timer/år", mtom: 0.9, needsThermal: false, needsRtk: true, notes: "Fixed-wing for >200km²." },
  { id: "UC-029", name: "Kommuneteknisk infrastrukturkartlegging", department: "Tverrfaglig teknisk", operationType: "BVLOS", easaCategory: "Spesifikk kategori", certRequirement: "STS-01", droneClass: "Medium (RTK) eller fixed-wing", priority: "Medium", flightHoursFormula: "5 timer/år flat", mtom: 0.9, needsThermal: false, needsRtk: true, notes: "Grunnkartlegging for alle tekniske tjenester." },
  { id: "UC-030", name: "Sikkerhetsovervåkning offentlige arrangementer", department: "Tverrfaglig beredskap", operationType: "VLOS", easaCategory: "Spesifikk - SORA SAIL IV", certRequirement: "Full SORA-opplæring", droneClass: "Medium", priority: "Lav", flightHoursFormula: "5 timer/år flat", mtom: 0.9, needsThermal: false, needsRtk: false, notes: "SAIL IV pga. folkemasse. Ta dette sist." },
];

// Certification hierarchy — CRITICAL: These are mutually exclusive paths
const CERT_RULES = `
KRITISKE SERTIFISERINGSREGLER — bryt disse ALDRI:

1. SERTIFISERINGSHIERARKIET (gjensidig utelukkende stier):
   - Åpen kategori (A1/A2/A3): Nettkurs + evt. prøve. INGEN operasjonstillatelse. Kun VLOS, ≤120m, begrenset vekt.
   - STS-01/STS-02: Standardscenario under spesifikk kategori. Krever erklæring, opplæring og operasjonsmanual.
   - Spesifikk kategori med operasjonstillatelse (OpAuth): Krever full SORA-vurdering og godkjenning fra Luftfartstilsynet.
   - LUC (Light UAS operator Certificate): Organisasjonssertifisering — erstatter behovet for individuell OpAuth. Kun for store operatører.

2. KOMBINASJONER SOM ALDRI ER GYLDIGE:
   - LUC + A1/A2/A3 sammen — LUC er spesifikk kategori, A1-A3 er åpen kategori
   - A2 + STS-01 for SAMME operasjon — velg én
   - BVLOS + åpen kategori (A1/A2/A3) — BVLOS er ALLTID spesifikk eller sertifisert kategori
   
3. FOR HVER OPERASJON, VELG NØYAKTIG ÉN sertifiseringsvei basert på:
   - Operasjonstype (VLOS/BVLOS)
   - MTOM og dronedeimensjon
   - Befolkningstetthet i operasjonsområdet
   - Flygehøyde
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { municipality_name, population, area_km2, road_km, va_km, buildings, terrain_type, density_per_km2, departments, iks_partners } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Filter use cases to only those matching active departments
    const deptNames = (departments || []) as string[];
    const deptNameLower = deptNames.map((d: string) => d.toLowerCase());
    
    // Match use cases to departments (fuzzy matching on department name)
    const relevantUCs = VERIFIED_USE_CASES.filter(uc => {
      const ucDeptLower = uc.department.toLowerCase();
      return deptNameLower.some((d: string) => 
        ucDeptLower.includes(d.split(' - ')[0].split(' / ')[0]) || 
        d.includes(ucDeptLower.split(' - ')[0].split(' / ')[0]) ||
        // Tverrfaglig matches any
        ucDeptLower.includes('tverrfaglig')
      );
    });

    const systemPrompt = `Du er en ekspert på kommunal dronebruk i Norge med dyp kunnskap om EASA-regelverk, SORA-metodikk og norsk luftfartslovgivning (Luftfartstilsynet).

${CERT_RULES}

Du har tilgang til en VERIFISERT database med ${relevantUCs.length} bruksområder. Du skal KUN velge fra disse — ALDRI finne opp nye.
Du skal beregne flytimer basert på formlene i databasen og kommunens nøkkeltall.
`;

    const userPrompt = `Analyser dronemulighetene for ${municipality_name} kommune.

KOMMUNEDATA:
- Innbyggere: ${population || 'ukjent'}
- Areal: ${area_km2 || 'ukjent'} km²
- Veinett: ${road_km || 'ukjent'} km
- VA-ledningsnett: ${va_km || 'ukjent'} km
- Bygninger: ${buildings || 'ukjent'}
- Terreng: ${terrain_type || 'ukjent'}
- Befolkningstetthet: ${density_per_km2 || 'ukjent'} innb/km²

AKTIVE AVDELINGER: ${JSON.stringify(deptNames)}

IKS-SAMARBEID (brannvesen): ${JSON.stringify(iks_partners || [])}
${(iks_partners || []).length > 0 ? `Brannvesenet deles mellom disse kommunene. Vurder om droner og piloter kan deles.` : 'Kommunen har ikke identifisert IKS-samarbeid for brannvesen.'}

VERIFISERT USE CASE-DATABASE (velg KUN fra disse):
${JSON.stringify(relevantUCs, null, 1)}

INSTRUKSJONER:
1. Velg relevante use cases fra databasen basert på kommunens profil
2. Beregn flytimer ved å bruke formlene og kommunedata (f.eks. vei_km × 0.15)
3. For HVER operasjon: bruk NØYAKTIG operationType, easaCategory og certRequirement fra databasen
4. Konsolider droner mellom avdelinger der det er mulig (samme dronetype kan deles)
5. For IKS-brannvesen: vurder om SAR-drone og termisk drone kan stasjoneres sentralt
6. Gi én sertifiseringsvei per pilot — ALDRI bland åpen og spesifikk kategori`;

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
              description: "Returnerer en komplett droneanalyse for kommunen basert på verifiserte use cases",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Kort oppsummering (2-3 setninger)" },
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
                              id: { type: "string", description: "UC-ID fra databasen" },
                              name: { type: "string" },
                              description: { type: "string", description: "Kort beskrivelse tilpasset kommunen" },
                              operation_type: { type: "string", enum: ["VLOS", "BVLOS"] },
                              easa_category: { type: "string" },
                              required_permit: { type: "string" },
                              pilot_certification: { type: "string", description: "Nøyaktig ÉN sertifiseringsvei" },
                              drone_type: { type: "string" },
                              priority: { type: "string", enum: ["Høy", "Medium", "Lav"] },
                              annual_flight_hours: { type: "number", description: "Beregnet fra formel + kommunedata" },
                              calculation_basis: { type: "string", description: "Vis beregningen, f.eks. '380km × 0.15 = 57 timer'" },
                              needs_thermal: { type: "boolean" },
                              needs_rtk: { type: "boolean" },
                            },
                            required: ["id", "name", "description", "operation_type", "easa_category", "required_permit", "pilot_certification", "drone_type", "priority", "annual_flight_hours", "calculation_basis"],
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
                  certification_plan: {
                    type: "object",
                    description: "Samlet sertifiseringsplan — én vei per pilotgruppe",
                    properties: {
                      pilot_groups: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            group_name: { type: "string" },
                            certification_path: { type: "string", description: "Nøyaktig ÉN sertifiseringsvei" },
                            covers_use_cases: { type: "array", items: { type: "string" } },
                            training_description: { type: "string" },
                            estimated_training_days: { type: "number" },
                          },
                          required: ["group_name", "certification_path", "covers_use_cases", "training_description", "estimated_training_days"],
                        },
                      },
                    },
                    required: ["pilot_groups"],
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
                required: ["summary", "department_analyses", "drone_fleet", "certification_plan", "iks_recommendation", "total_drones_needed", "total_annual_cost_nok", "total_annual_flight_hours", "implementation_priority"],
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Kreditt oppbrukt" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ success: false, error: "AI-analyse feilet" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ success: false, error: "Ingen analyse returnert" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // POST-PROCESSING VALIDATION: Catch any AI mistakes
    if (analysis.department_analyses) {
      for (const dept of analysis.department_analyses) {
        for (const uc of dept.use_cases) {
          // Verify against source database
          const sourceUC = VERIFIED_USE_CASES.find(v => v.id === uc.id);
          if (sourceUC) {
            // Force correct operation_type from verified data
            uc.operation_type = sourceUC.operationType;
            // Force correct EASA category
            uc.easa_category = sourceUC.easaCategory;
            // Force correct cert requirement
            uc.pilot_certification = sourceUC.certRequirement;
            // Force correct drone class
            uc.drone_type = sourceUC.droneClass;
            uc.needs_thermal = sourceUC.needsThermal;
            uc.needs_rtk = sourceUC.needsRtk;
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dmv-analyze error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Ukjent feil" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
