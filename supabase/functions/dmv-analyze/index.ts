import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const DRONE_ARCHETYPES = {
  multirotor: {
    type: "Multirotor (autonom BVLOS fra dronestasjon)",
    example: "DJI Dock 3 + Matrice 4TD / tilsvarende",
    costNok: 450_000,
  },
  fixedWing: {
    type: "Fixed-wing drone-in-a-box",
    example: "Robot Aviation FX10",
    costNok: 1_200_000,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Department matching — drone-relevant departments only
// ═══════════════════════════════════════════════════════════════════════════

const DEPT_MATCH_MAP: Record<string, string[]> = {
  "Brann og redning": ["Brann og redning", "Beredskap"],
  "Tekniske tjenester - Vei": ["Teknisk drift", "Vei", "Tekniske tjenester"],
  "Vann og avløp": ["Vann og avløp", "VA"],
  "Byggesak / Eiendom": ["Plan og bygg", "Byggesak", "Eiendom"],
  Naturforvaltning: ["Miljø og klima", "Naturforvaltning"],
  "Naturforvaltning / Landbruk": ["Landbruk", "Miljø og klima", "Naturforvaltning"],
  Beredskap: ["Brann og redning", "Beredskap"],
  Geodata: ["Geodata", "Plan og bygg"],
  "Teknisk drift": ["Teknisk drift", "Tekniske tjenester"],
};

function matchDepartments(ucDepartment: string, activeDepts: string[]): boolean {
  const activeLower = activeDepts.map((d) => d.toLowerCase());
  if (activeLower.some((d) => d === ucDepartment.toLowerCase())) return true;
  const mappedNames = DEPT_MATCH_MAP[ucDepartment];
  if (mappedNames) {
    return mappedNames.some((mapped) =>
      activeLower.some((d) => d.includes(mapped.toLowerCase()) || mapped.toLowerCase().includes(d)),
    );
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Flight hour estimation — transparent formulas based on inspection rates
//
// Basis: drone inspection speed × coverage frequency per year
//   Road/pipe corridor: ~15 km/h inspection speed, 1 pass/year = km / 15
//   Area survey: ~40 ha/h for multirotor, ~200 ha/h fixed-wing
//   Point inspections (bridges, buildings): ~20 min per object
// ═══════════════════════════════════════════════════════════════════════════

interface InfraData {
  road_km: number | null;
  water_pipe_km: number | null;
  sewage_pipe_km: number | null;
  bridges: number | null;
  tunnels: number | null;
  buildings_total: number | null;
  holiday_homes: number | null;
  agricultural_km2: number | null;
  forest_km2: number | null;
  area_km2: number | null;
  population: number | null;
}

function estimateFlightHours(formula: string, infra: InfraData): { hours: number; basis: string } {
  // Corridor inspection: 15 km/h, 1 pass/year
  if (formula.includes("vei_km") && infra.road_km) {
    const h = Math.round(infra.road_km / 15);
    return { hours: h, basis: `${infra.road_km} km ÷ 15 km/t = ${h} timer` };
  }
  // VA: separate water and sewage, 15 km/h
  if (formula.includes("rør_km")) {
    const totalKm = (infra.water_pipe_km || 0) + (infra.sewage_pipe_km || 0);
    if (totalKm > 0) {
      const h = Math.round(totalKm / 15);
      return { hours: h, basis: `${totalKm} km ledning ÷ 15 km/t = ${h} timer` };
    }
  }
  // Area survey: 40 ha/h multirotor
  if (formula.includes("areal_km2") && infra.area_km2) {
    const ha = infra.area_km2 * 100; // km² to ha
    // Only survey a fraction — not the entire municipality
    const surveyFraction = 0.02; // 2% per year
    const h = Math.round((ha * surveyFraction) / 40);
    return { hours: h, basis: `${infra.area_km2} km² × 2% ÷ 40 ha/t = ${h} timer` };
  }
  // Bridge inspection: ~20 min per bridge, 1 pass/year
  if (formula.includes("broer") && infra.bridges) {
    const h = Math.round((infra.bridges * 20) / 60);
    return { hours: h, basis: `${infra.bridges} broer × 20 min = ${h} timer` };
  }
  // Forest monitoring: 200 ha/h fixed-wing, 5% coverage/year
  if (formula.includes("skog_km2") && infra.forest_km2) {
    const ha = infra.forest_km2 * 100;
    const h = Math.round((ha * 0.05) / 200);
    return { hours: h, basis: `${infra.forest_km2} km² skog × 5% ÷ 200 ha/t = ${h} timer` };
  }
  // Flat rate from formula text
  const flatMatch = formula.match(/(\d+)\s*timer/);
  if (flatMatch) {
    const h = parseInt(flatMatch[1]);
    return { hours: h, basis: `${h} timer/år (fast estimat)` };
  }
  return { hours: 10, basis: "10 timer/år (standardanslag)" };
}

// ═══════════════════════════════════════════════════════════════════════════
// Fallback analysis (when AI credits are depleted)
// ═══════════════════════════════════════════════════════════════════════════

function buildFallbackAnalysis(
  municipalityName: string,
  relevantUCs: any[],
  algorithmicFleet: any[],
  deptNames: string[],
  infra: InfraData,
  iksPartners: string[] | null,
  fireDeptName: string | null,
  fireDeptType: string | null,
) {
  const deptMap: Record<string, any[]> = {};

  for (const uc of relevantUCs) {
    if (!deptMap[uc.department]) deptMap[uc.department] = [];
    const est = estimateFlightHours(uc.flightHoursFormula || "", infra);

    deptMap[uc.department].push({
      id: uc.id,
      name: uc.name,
      description: uc.notes || uc.name,
      operation_type: uc.operationType,
      easa_category: uc.easaCategory,
      required_permit: uc.certRequirement,
      pilot_certification: uc.certRequirement,
      drone_type: DRONE_ARCHETYPES[uc.droneArchetype as keyof typeof DRONE_ARCHETYPES]?.type || uc.droneArchetype,
      priority: uc.priority,
      annual_flight_hours: est.hours,
      calculation_basis: est.basis,
      needs_thermal: uc.needsThermal,
      needs_rtk: uc.needsRtk,
    });
  }

  const departmentAnalyses = Object.entries(deptMap).map(([dept, ucs]) => ({
    department: dept,
    use_cases: ucs,
    total_annual_hours: ucs.reduce((s: number, uc: any) => s + uc.annual_flight_hours, 0),
  }));

  const totalHours = departmentAnalyses.reduce((s, d) => s + d.total_annual_hours, 0);

  const droneFleet = algorithmicFleet.map((af: any) => ({
    drone_id: af.drone_id || "",
    drone_type: af.drone_type || "multirotor",
    recommended_model: af.drone || af.model || "Ukjent",
    quantity: 1,
    shared_between: af.departments || [],
    estimated_cost_nok: af.price_nok || 0,
    key_features: [],
    why_chosen: `Algoritmisk anbefalt basert på ${af.covers_n_use_cases || 0} bruksområder.`,
    covers_use_cases: (af.covered || []).map((c: any) => c.use_case_id || c.use_case),
  }));

  const totalCost = droneFleet.reduce((s: number, d: any) => s + (d.estimated_cost_nok || 0), 0);

  // All dock operations require specific category — never reference open category here
  const hasBvlos = relevantUCs.some((uc: any) => uc.operationType === "BVLOS");

  return {
    summary: `Algoritmisk droneanalyse for ${municipalityName}. ${relevantUCs.length} bruksområder identifisert på tvers av ${Object.keys(deptMap).length} avdelinger. AI-oppsummering er midlertidig utilgjengelig.`,
    department_analyses: departmentAnalyses,
    drone_fleet: droneFleet,
    certification_plan: {
      pilot_groups: [
        {
          group_name: "BVLOS-operatører",
          certification_path: hasBvlos
            ? "Spesifikk kategori — SORA/OpAuth"
            : "STS-01 (standardscenario, spesifikk kategori)",
          covers_use_cases: relevantUCs.map((uc: any) => uc.name),
          training_description:
            "Opplæring for autonom BVLOS-drift fra dronestasjon. Varighet og innhold kan tilpasses leverandør og kommunens behov.",
          estimated_training_days: hasBvlos ? 15 : 5,
          practical_outcome: hasBvlos
            ? "Piloten kan planlegge og overvåke autonome droneoppdrag utenfor synsrekkevidde."
            : "Piloten kan gjennomføre planlagte droneoperasjoner innenfor STS-01-rammen.",
        },
      ],
    },
    iks_recommendation: {
      can_share: (iksPartners || []).length > 0,
      shared_resources: (iksPartners || []).length > 0 ? ["Dronestasjon", "Opplæring", "SORA-søknad"] : [],
      recommendation:
        (iksPartners || []).length > 0
          ? `${fireDeptName || "IKS-et"} kan dele droneressurser med partnerkommuner. Delt kostnad foreslås.`
          : `${municipalityName} bør vurdere eget opplegg for droneavdeling.`,
      partner_municipalities: iksPartners || [],
    },
    total_drones_needed: droneFleet.length,
    total_annual_cost_nok: totalCost,
    total_annual_flight_hours: totalHours,
    implementation_priority: [
      {
        phase: 1,
        title: "Oppstart",
        departments: deptNames.slice(0, 2),
        description: "Start med kjernebruksområder — foreslås igangsatt først.",
      },
      {
        phase: 2,
        title: "Utvidelse",
        departments: deptNames.slice(2),
        description: "Utvid til flere avdelinger etter evaluering av fase 1.",
      },
    ],
    _ai_fallback: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Certification rules (kept concise — details in schema descriptions)
// ═══════════════════════════════════════════════════════════════════════════

const CERT_RULES = `SERTIFISERINGSREGLER:
1. Alle dock-operasjoner er spesifikk kategori. ALDRI referer til åpen kategori (A1/A2/A3) for autonome operasjoner.
2. BVLOS krever ALLTID spesifikk kategori med SORA-vurdering og operasjonsautorisasjon (OpAuth) fra Luftfartstilsynet.
3. Én sertifiseringsvei per operasjonstype — ALDRI bland åpen og spesifikk kategori.
4. Antall SORA-søknader = antall distinkte operasjonstyper, IKKE antall droner.
5. Kursvarighet er FORSLAG, ikke regulatoriske minstekrav. Presiser dette alltid.
6. Opplæring er grunnlag for å søke OpAuth — det er godkjenningen som gir rett til å fly, ikke kurset.`;

// ═══════════════════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // ── Parse input — matches new data fetcher output ──────────────────
    const {
      municipality_name,
      // Core indicators
      population,
      area_km2,
      // Infrastructure (from SSB / NVDB)
      road_km,
      va_network, // { water_pipe_km, sewage_pipe_km, year }
      buildings, // { total, residential, holiday_homes, commercial, year }
      infrastructure, // { bridges, tunnels }
      land_use, // { agricultural_km2, forest_km2, year }
      // KOSTRA
      density_per_km2,
      sector_data,
      property_data,
      fire_stats,
      // Drone relevance
      drone_relevance,
      // IKS / fire dept
      departments,
      iks_partners,
      fire_dept_name,
      fire_dept_type,
      alarm_sentral_name,
      region_municipalities,
      // BRIS
      bris_mission_data,
      // Preferences
      prefer_european,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ── Fetch drone catalog and use cases from DB ──────────────────────
    const [droneRes, ucRes] = await Promise.all([
      db
        .from("drone_platforms")
        .select(
          "id,name,manufacturer,model,drone_type,category,max_takeoff_weight_kg,max_flight_time_min,max_range_km,has_thermal,has_rtk,sensor_types,payload_kg,ip_rating,wind_resistance_ms,price_nok_estimate,price_eur_estimate,launch_method,supports_bvlos,c_class,easa_category,notes",
        ),
      db.from("use_case_requirements").select("*"),
    ]);

    const DRONE_CATALOG = (droneRes.data || []).map((d: any) => ({
      id: d.id,
      name: d.name || `${d.manufacturer} ${d.model}`,
      type: d.drone_type,
      manufacturer: d.manufacturer,
      model: d.model,
      mtom_kg: d.max_takeoff_weight_kg,
      max_flight_time_min: d.max_flight_time_min,
      has_thermal: d.has_thermal || false,
      has_rtk: d.has_rtk || false,
      has_lidar: ((d.sensor_types || []) as string[]).some((s: string) => s.toLowerCase().includes("lidar")),
      payload_kg: d.payload_kg || 0,
      ip_rating: d.ip_rating,
      max_wind_ms: d.wind_resistance_ms,
      price_nok: d.price_nok_estimate,
      autonomous_dock:
        (d.category || "").toLowerCase().includes("dock") || (d.launch_method || "").toLowerCase().includes("dock"),
      description_no: d.notes || "",
    }));

    const VERIFIED_USE_CASES = (ucRes.data || []).map((uc: any) => ({
      id: uc.use_case_id,
      name: uc.use_case_name,
      department: uc.department,
      operationType: uc.requires_bvlos ? "BVLOS" : "VLOS",
      easaCategory: uc.easa_min_category || "Spesifikk kategori",
      certRequirement: uc.easa_min_category || "Spesifikk kategori — SORA/OpAuth",
      droneArchetype: (uc.preferred_drone_type || []).some((t: string) => t.toLowerCase().includes("fixed"))
        ? "fixedWing"
        : "multirotor",
      priority: uc.priority_score >= 8 ? "Høy" : uc.priority_score >= 5 ? "Medium" : "Lav",
      flightHoursFormula: uc.cost_driver_notes || "10 timer/år flat",
      needsThermal: uc.requires_thermal || false,
      needsRtk: uc.requires_rtk || false,
      notes: uc.description || "",
    }));

    // ── Filter use cases to active departments ─────────────────────────
    const deptNames = (departments || []) as string[];
    const relevantUCs = VERIFIED_USE_CASES.filter((uc: any) => matchDepartments(uc.department, deptNames));

    console.log(
      `[${municipality_name}] Matched ${relevantUCs.length}/${VERIFIED_USE_CASES.length} use cases for depts: ${JSON.stringify(deptNames)}`,
    );

    // ── Build infrastructure data object for flight hour estimation ────
    const infra: InfraData = {
      road_km: road_km || null,
      water_pipe_km: va_network?.water_pipe_km || null,
      sewage_pipe_km: va_network?.sewage_pipe_km || null,
      bridges: infrastructure?.bridges || null,
      tunnels: infrastructure?.tunnels || null,
      buildings_total: buildings?.total || null,
      holiday_homes: buildings?.holiday_homes || null,
      agricultural_km2: land_use?.agricultural_km2 || null,
      forest_km2: land_use?.forest_km2 || null,
      area_km2: area_km2 || null,
      population: population || null,
    };

    // ── Call platform-recommend algorithm ───────────────────────────────
    const relevantUcIds = relevantUCs.map((uc: any) => uc.id);
    let algorithmicFleet: any[] = [];
    let algorithmicPerUseCase: Record<string, any[]> = {};
    try {
      const prResponse = await fetch(`${supabaseUrl}/functions/v1/platform-recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          municipality_name,
          use_case_ids: relevantUcIds,
          max_platforms: 5,
          prefer_european: prefer_european || false,
        }),
      });
      if (prResponse.ok) {
        const prData = await prResponse.json();
        algorithmicFleet = prData.fleet || [];
        algorithmicPerUseCase = prData.per_use_case_top || {};
        console.log(`[${municipality_name}] Fleet: ${algorithmicFleet.map((f: any) => f.drone).join(", ")}`);
      }
    } catch (prErr) {
      console.warn(`[${municipality_name}] platform-recommend error:`, prErr);
    }

    // ── Build prompt data sections ─────────────────────────────────────

    const infraLines = [
      `- Innbyggere: ${population || "ukjent"}`,
      `- Areal: ${area_km2 || "ukjent"} km²`,
      `- Befolkningstetthet: ${density_per_km2 || "ukjent"} innb/km²`,
      `- Kommunale veier: ${road_km || "ukjent"} km (SSB 11814)`,
      `- Vannledning: ${va_network?.water_pipe_km ?? "ukjent"} km (SSB)`,
      `- Avløpsledning: ${va_network?.sewage_pipe_km ?? "ukjent"} km (SSB)`,
      `- Broer: ${infrastructure?.bridges ?? "ukjent"} (NVDB)`,
      `- Tunneler: ${infrastructure?.tunnels ?? "ukjent"} (NVDB)`,
      `- Bygninger totalt: ${buildings?.total ?? "ukjent"} (SSB 03174)`,
      `  - Boliger: ${buildings?.residential ?? "ukjent"}`,
      `  - Fritidsboliger: ${buildings?.holiday_homes ?? "ukjent"}`,
      `  - Næringsbygg: ${buildings?.commercial ?? "ukjent"}`,
      `- Jordbruksareal: ${land_use?.agricultural_km2 ?? "ukjent"} km² (SSB 09594)`,
      `- Skogareal: ${land_use?.forest_km2 ?? "ukjent"} km² (SSB 09594)`,
    ].join("\n");

    const sectorLines =
      Array.isArray(sector_data) && sector_data.length > 0
        ? sector_data
            .filter((s: any) => s?.expenditure_1000nok != null)
            .map(
              (s: any) =>
                `- ${s.sector}: ${s.expenditure_1000nok.toLocaleString("nb-NO")} (1000 kr, ${s.year || "ukjent"}, ${s.source || "ukjent"})`,
            )
            .join("\n")
        : "- Ingen sektorkostnader tilgjengelig.";

    const iksContext = fire_dept_name
      ? `BRANNVESEN: ${fire_dept_name} (${fire_dept_type || "ukjent type"})
${iks_partners?.length ? `Partnerkommuner: ${iks_partners.join(", ")}. Dronestasjon kan stasjoneres sentralt for hele ${fire_dept_type === "IKS" ? "IKS-et" : "distriktet"}.` : "Enkeltkommunalt brannvesen."}
${alarm_sentral_name ? `110-sentral: ${alarm_sentral_name}` : ""}
${region_municipalities?.length ? `${region_municipalities.length} kommuner i 110-regionen.` : ""}`
      : "Ingen brannvesendata.";

    const airspaceInfo = drone_relevance?.controlled_airspace
      ? `LUFTROM: ${drone_relevance.controlled_airspace.type} rundt ${drone_relevance.controlled_airspace.airport} (radius ~${drone_relevance.controlled_airspace.radius_km} km). Krever koordinering med tårnkontroll.`
      : "Ingen kontrollert luftrom i kommunen.";

    const protectedInfo =
      drone_relevance?.protected_areas?.length > 0
        ? `VERNEOMRÅDER: ${drone_relevance.protected_areas.join(", ")}. Krever dispensasjon fra Miljødirektoratet for droneflyvning.`
        : "";

    // BRIS section — kept but cleaned up
    let brisSection = "";
    if (bris_mission_data) {
      const entries = Object.entries(bris_mission_data as Record<string, any>);
      brisSection = `\nBRIS OPPDRAGSDATA:\n${entries
        .map(([year, data]: [string, any]) => {
          const missions = (data.missions || []) as Array<{
            t: string;
            n: number;
            rt: string;
            dt: string;
          }>;
          return `${year} (${data.total} oppdrag):\n${missions.map((m) => `  ${m.t}: ${m.n} (respons ${m.rt}, utrykning ${m.dt})`).join("\n")}`;
        })
        .join("\n\n")}

Identifiser oppdrag der drone kan: A) erstatte bilutrykning (ABA-verifisering, unødige alarmer), B) gi raskere situasjonsbilde (brann, trafikk), C) redusere antall biler (verifiser omfang først).`;
    }

    // ── System prompt — concise, rules-focused ─────────────────────────

    const systemPrompt = `Du er en norsk kommunal droneekspert som skriver mulighetsanalyser.

MÅLGRUPPE: Kommunedirektør uten dronefaglig bakgrunn. Selvforklarende, talldrevet, handlingsrettet.

OPERATIV MODELL: Alle operasjoner er autonome BVLOS fra drone-in-a-box stasjon.
- Multirotor: lokale inspeksjoner, termisk, beredskap. ~${DRONE_ARCHETYPES.multirotor.costNok.toLocaleString("nb-NO")} NOK.
- Fixed-wing: lange korridorer (vei/rør), stor arealdekning. ~${DRONE_ARCHETYPES.fixedWing.costNok.toLocaleString("nb-NO")} NOK.
- Skalering: <5000 innb → 1 multirotor. 5000–20000 → 1–2 multirotor. >20000 → 2+ multirotor + 1 fixed-wing.

${CERT_RULES}

PLATTFORMVALG:
- BRUK droneflåten fra ALGORITMISK ANBEFALING. Ikke velg andre med mindre algoritmen ikke returnerte resultater.
- Ikke anbefal kinesiske plattformer (DJI, Autel) som primærvalg for offentlig sektor uten eksplisitt forespørsel.
- Forklar HVORFOR for hver modell — utstyr, dekningskapasitet, sambruk.
${prefer_european ? "- Kommunen foretrekker europeiske/nordiske produsenter." : ""}

BRUK AV KOMMUNEDATA:
- Beregn flytimer fra formler og REELLE infrastrukturtall. Vis beregningen.
- Korridorinspeksjon: ~15 km/t. Arealkartlegging multirotor: ~40 ha/t. Fixed-wing: ~200 ha/t.
- Broinspeksjon: ~20 min/bro. 
- Hvis data mangler, si det eksplisitt — ALDRI finn på tall.
- Bruk "foreslås", "anbefales", "konseptuelt opplegg" for strategiske anbefalinger.

TEKST: Kort. Direkte. Ingen fyllord. Skriv "droneavdeling", aldri "droneprogram".

Du har ${relevantUCs.length} verifiserte bruksområder. Velg KUN fra disse. Ekskluder irrelevante.`;

    // ── User prompt — structured data, no catalog dump ─────────────────

    const userPrompt = `Analyser dronemulighetene for ${municipality_name} kommune.

INFRASTRUKTUR OG KOMMUNEDATA:
${infraLines}

${airspaceInfo}
${protectedInfo}

KOSTRA SEKTORKOSTNADER (SSB 12362):
${sectorLines}

${fire_stats?.fire_expenditure_1000nok != null ? `BRANNBUDSJETT: ${fire_stats.fire_expenditure_1000nok.toLocaleString("nb-NO")} (1000 kr, ${fire_stats.year || "ukjent"}, ${fire_stats.source || "ukjent"})` : ""}
${fire_stats?.total_callouts ? `UTRYKNINGER (estimat): ~${fire_stats.total_callouts}/år` : ""}

AKTIVE AVDELINGER: ${JSON.stringify(deptNames)}

${iksContext}
${brisSection}

ALGORITMISK ANBEFALT DRONEFLÅTE:
${
  algorithmicFleet.length > 0
    ? algorithmicFleet
        .map(
          (f: any, i: number) =>
            `${i + 1}. ${f.drone} (${f.drone_type}, ${f.price_nok ? f.price_nok.toLocaleString("nb-NO") + " NOK" : f.price_eur + " EUR"})
   Score: ${f.avg_score}/100 | Dekker ${f.covers_n_use_cases} bruksområder: ${f.covered.map((c: any) => c.use_case).join(", ")}
   Avdelinger: ${f.departments.join(", ")}${f.advisories?.length ? "\n   OBS: " + f.advisories.join("; ") : ""}`,
        )
        .join("\n\n")
    : "Ingen algoritmisk anbefaling — velg basert på bruksområder."
}

VERIFISERTE BRUKSOMRÅDER:
${JSON.stringify(
  relevantUCs.map((uc) => ({
    id: uc.id,
    name: uc.name,
    dept: uc.department,
    type: uc.operationType,
    easa: uc.easaCategory,
    cert: uc.certRequirement,
    archetype: uc.droneArchetype,
    priority: uc.priority,
    formula: uc.flightHoursFormula,
    thermal: uc.needsThermal,
    rtk: uc.needsRtk,
  })),
  null,
  1,
)}

BEREGNINGSINSTRUKSJONER:
- vei_km = ${road_km || "?"}, vann_km = ${va_network?.water_pipe_km ?? "?"}, avløp_km = ${va_network?.sewage_pipe_km ?? "?"}
- broer = ${infrastructure?.bridges ?? "?"}, skog = ${land_use?.forest_km2 ?? "?"} km²
- Vis beregning for hvert bruksområde, f.eks. "${road_km || "?"} km ÷ 15 km/t = ${road_km ? Math.round(road_km / 15) : "?"} timer"

${fire_dept_type === "IKS" ? `IKS-VURDERING: ${fire_dept_name} dekker ${(iks_partners || []).join(", ")}. Vurder delt dronestasjon.` : ""}`;

    // ── Tool schema ────────────────────────────────────────────────────

    const toolSchema = {
      type: "function" as const,
      function: {
        name: "drone_analysis",
        description: "Komplett droneanalyse for kommunen",
        parameters: {
          type: "object",
          properties: {
            executive_summary: {
              type: "object",
              properties: {
                headline: { type: "string", description: "Maks 120 tegn. Hva analysen viser." },
                recommendation: { type: "string", description: "Maks 200 tegn. Hva kommunen bør gjøre." },
                total_investment_year1_nok: { type: "number" },
                estimated_annual_savings_nok: { type: "number" },
                estimated_annual_hours_saved: { type: "number" },
                next_steps: { type: "array", items: { type: "string" }, description: "Maks 3 konkrete handlinger" },
              },
              required: ["headline", "recommendation", "total_investment_year1_nok", "next_steps"],
            },
            summary: {
              type: "string",
              description: 'Kort oppsummering (2-3 setninger). Bruk "anbefales", "foreslås".',
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
                        id: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string", description: "Maks 80 tegn, tilpasset kommunen" },
                        operation_type: { type: "string", enum: ["VLOS", "BVLOS"] },
                        easa_category: { type: "string" },
                        required_permit: { type: "string" },
                        pilot_certification: { type: "string" },
                        drone_type: { type: "string" },
                        priority: { type: "string", enum: ["Høy", "Medium", "Lav"] },
                        annual_flight_hours: { type: "number" },
                        calculation_basis: { type: "string", description: "Vis beregningen" },
                        needs_thermal: { type: "boolean" },
                        needs_rtk: { type: "boolean" },
                      },
                      required: [
                        "id",
                        "name",
                        "description",
                        "operation_type",
                        "easa_category",
                        "required_permit",
                        "pilot_certification",
                        "drone_type",
                        "priority",
                        "annual_flight_hours",
                        "calculation_basis",
                      ],
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
                  drone_id: { type: "string" },
                  drone_type: { type: "string" },
                  recommended_model: { type: "string" },
                  quantity: { type: "number" },
                  shared_between: { type: "array", items: { type: "string" } },
                  estimated_cost_nok: { type: "number" },
                  key_features: { type: "array", items: { type: "string" } },
                  why_chosen: { type: "string", description: "Maks 200 tegn" },
                  covers_use_cases: { type: "array", items: { type: "string" } },
                  max_flight_time_min: { type: "number" },
                  needs_thermal: { type: "boolean" },
                  needs_rtk: { type: "boolean" },
                  autonomous: { type: "boolean" },
                },
                required: [
                  "drone_id",
                  "drone_type",
                  "recommended_model",
                  "quantity",
                  "shared_between",
                  "estimated_cost_nok",
                  "why_chosen",
                  "covers_use_cases",
                ],
              },
            },
            coverage_matrix: {
              type: "object",
              description: "Avdelinger (rader) × Droner (kolonner) → bruksområder",
              properties: {
                platforms: { type: "array", items: { type: "string" } },
                departments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      department: { type: "string" },
                      coverage: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
                    },
                  },
                },
              },
            },
            certification_plan: {
              type: "object",
              properties: {
                pilot_groups: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      group_name: { type: "string" },
                      certification_path: {
                        type: "string",
                        description: "Nøyaktig ÉN vei. ALDRI bland åpen og spesifikk.",
                      },
                      covers_use_cases: { type: "array", items: { type: "string" } },
                      training_description: {
                        type: "string",
                        description:
                          'Avslutt med: "Varighet kan tilpasses; ingen fastsatt kurslengde i EASA-regelverket."',
                      },
                      estimated_training_days: { type: "number", description: "Forslag, ikke regulatorisk krav" },
                      practical_outcome: { type: "string" },
                    },
                    required: [
                      "group_name",
                      "certification_path",
                      "covers_use_cases",
                      "training_description",
                      "estimated_training_days",
                      "practical_outcome",
                    ],
                  },
                },
              },
              required: ["pilot_groups"],
            },
            cost_breakdown: {
              type: "object",
              properties: {
                hardware_knok: { type: "number" },
                software_annual_knok: { type: "number" },
                regulatory_knok: { type: "number", description: "SORA-søknader, forsikring" },
                training_knok: { type: "number" },
                total_year1_knok: { type: "number" },
              },
              required: ["hardware_knok", "total_year1_knok"],
            },
            iks_recommendation: {
              type: "object",
              properties: {
                can_share: { type: "boolean" },
                shared_resources: { type: "array", items: { type: "string" } },
                recommendation: { type: "string" },
                partner_municipalities: { type: "array", items: { type: "string" } },
                cost_per_municipality_nok: { type: "number", description: "Totalkost ÷ antall kommuner" },
                cost_alone_nok: { type: "number", description: "Kost hvis kommunen gjør det alene" },
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
            drone_mission_savings: {
              type: "object",
              description: "Kun hvis BRIS-data er tilgjengelig",
              properties: {
                total_annual_missions: { type: "number" },
                drone_replaceable_missions: { type: "number" },
                categories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      mission_types: { type: "array", items: { type: "string" } },
                      annual_missions: { type: "number" },
                      drone_role: {
                        type: "string",
                        enum: ["erstatter_utrykning", "raskere_situasjonsbilde", "reduserer_biler"],
                      },
                      description: { type: "string" },
                      estimated_truck_reduction_pct: { type: "number" },
                      estimated_time_saved_min: { type: "number" },
                      annual_savings_nok: { type: "number" },
                    },
                    required: ["category", "annual_missions", "drone_role", "description"],
                  },
                },
                total_annual_savings_nok: { type: "number" },
                summary: { type: "string" },
              },
            },
          },
          required: [
            "executive_summary",
            "summary",
            "department_analyses",
            "drone_fleet",
            "certification_plan",
            "cost_breakdown",
            "iks_recommendation",
            "total_drones_needed",
            "total_annual_cost_nok",
            "total_annual_flight_hours",
            "implementation_priority",
          ],
        },
      },
    };

    // ── LLM call with retry ────────────────────────────────────────────

    let response: Response | null = null;
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [toolSchema],
          tool_choice: { type: "function", function: { name: "drone_analysis" } },
        }),
      });

      if (response.ok || (response.status !== 502 && response.status !== 503)) break;
      console.warn(`AI gateway attempt ${attempt} failed with ${response.status}`);
      await response.text();
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }

    // ── Handle error responses ─────────────────────────────────────────

    if (!response || !response.ok) {
      if (response?.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit — prøv igjen om litt" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response?.status === 402) {
        console.warn(`[${municipality_name}] AI credits depleted — fallback`);
        const fallback = buildFallbackAnalysis(
          municipality_name,
          relevantUCs,
          algorithmicFleet,
          deptNames,
          infra,
          iks_partners,
          fire_dept_name,
          fire_dept_type,
        );
        return new Response(
          JSON.stringify({ success: true, analysis: { ...fallback, _algorithmic_fleet: algorithmicFleet } }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const text = response ? await response.text() : "no response";
      console.error("AI gateway error:", response?.status, text);
      return new Response(JSON.stringify({ success: false, error: "AI-analyse feilet — prøv igjen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse response ─────────────────────────────────────────────────

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ success: false, error: "Ingen analyse returnert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analysis: any;
    try {
      analysis = JSON.parse(toolCall.function.arguments);
    } catch {
      const cleaned = toolCall.function.arguments
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      try {
        analysis = JSON.parse(cleaned);
      } catch (finalErr) {
        console.error("JSON repair failed:", finalErr);
        return new Response(JSON.stringify({ success: false, error: "Analysen ble avbrutt — prøv igjen" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Post-processing: enforce verified data ─────────────────────────

    // 1. Fix regulatory fields from verified database
    if (analysis.department_analyses) {
      for (const dept of analysis.department_analyses) {
        for (const uc of dept.use_cases) {
          const source = VERIFIED_USE_CASES.find((v: any) => v.id === uc.id);
          if (source) {
            uc.operation_type = source.operationType;
            uc.easa_category = source.easaCategory;
            uc.pilot_certification = source.certRequirement;
            uc.drone_type =
              DRONE_ARCHETYPES[source.droneArchetype as keyof typeof DRONE_ARCHETYPES]?.type || source.droneArchetype;
            uc.needs_thermal = source.needsThermal;
            uc.needs_rtk = source.needsRtk;
          }
        }
      }
    }

    // 2. Enrich fleet with algorithmic pricing
    if (algorithmicFleet.length > 0 && analysis.drone_fleet) {
      for (const aiDrone of analysis.drone_fleet) {
        const match = algorithmicFleet.find(
          (af: any) =>
            af.drone_id === aiDrone.drone_id ||
            af.drone?.toLowerCase().includes(aiDrone.recommended_model?.toLowerCase()) ||
            aiDrone.recommended_model?.toLowerCase().includes(af.model?.toLowerCase()),
        );
        if (match) {
          if (
            match.price_nok &&
            (!aiDrone.estimated_cost_nok ||
              aiDrone.estimated_cost_nok === 450000 ||
              aiDrone.estimated_cost_nok === 1200000)
          ) {
            aiDrone.estimated_cost_nok = match.price_nok;
          }
          if (!aiDrone.drone_id) aiDrone.drone_id = match.drone_id;
          if (!aiDrone.covers_use_cases?.length) {
            aiDrone.covers_use_cases = match.covered.map((c: any) => c.use_case_id);
          }
        }
      }
    }

    // 3. Validate fleet models exist in catalog
    if (analysis.drone_fleet) {
      for (const drone of analysis.drone_fleet) {
        const catalogMatch = DRONE_CATALOG.find(
          (d: any) =>
            d.id === drone.drone_id ||
            d.name?.toLowerCase() === drone.recommended_model?.toLowerCase() ||
            drone.recommended_model?.toLowerCase().includes(d.model?.toLowerCase()),
        );
        if (!catalogMatch) {
          const original = drone.recommended_model;
          drone.recommended_model = "UKJENT MODELL — manuell vurdering";
          drone.why_chosen = `AI foreslo '${original}' som ikke finnes i katalog.`;
          console.warn(`[${municipality_name}] Unknown model: '${original}'`);
        }
      }
    }

    // 4. Validate coverage_matrix references fleet
    if (analysis.coverage_matrix?.platforms && analysis.drone_fleet) {
      const fleetModels = new Set(analysis.drone_fleet.map((d: any) => d.recommended_model));
      analysis.coverage_matrix.platforms = analysis.coverage_matrix.platforms.filter((p: string) => fleetModels.has(p));
    }

    // 5. Fix cost breakdown sum
    if (analysis.cost_breakdown) {
      const cb = analysis.cost_breakdown;
      const calc =
        (cb.hardware_knok || 0) + (cb.software_annual_knok || 0) + (cb.regulatory_knok || 0) + (cb.training_knok || 0);
      if (calc > 0 && Math.abs(calc - (cb.total_year1_knok || 0)) > 1) {
        cb.total_year1_knok = calc;
      }
    }

    // 6. Truncate text fields
    const truncate = (s: string | undefined, max: number) =>
      !s ? "" : s.length > max ? s.substring(0, max - 1) + "…" : s;

    if (analysis.executive_summary) {
      analysis.executive_summary.headline = truncate(analysis.executive_summary.headline, 120);
      analysis.executive_summary.recommendation = truncate(analysis.executive_summary.recommendation, 200);
    }
    if (analysis.summary) analysis.summary = truncate(analysis.summary, 500);
    if (analysis.department_analyses) {
      for (const dept of analysis.department_analyses) {
        for (const uc of dept.use_cases) uc.description = truncate(uc.description, 80);
      }
    }
    if (analysis.drone_fleet) {
      for (const drone of analysis.drone_fleet) drone.why_chosen = truncate(drone.why_chosen, 200);
    }

    // Attach metadata
    analysis._algorithmic_fleet = algorithmicFleet;

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dmv-analyze error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "Ukjent feil",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
