// ============================================================
// HAIKO — SORA 2.5 RISK CALCULATOR
// Ren logikkfunksjon, ingen UI-avhengigheter
// Input → Output, deterministisk og testbar
// ============================================================

/**
 * INPUTS:
 * @param {number}  mtom_kg                  - Maks takeoff-vekt i kg
 * @param {number}  characteristic_dimension  - Karakteristisk dimensjon i meter
 * @param {number}  max_speed_ms             - Maks hastighet i m/s
 * @param {string}  operationType            - "VLOS" | "EVLOS" | "BVLOS"
 * @param {string}  populationDensity        - "controlled" | "sparse" | "populated" | "gathering"
 * @param {number}  altitude_m               - Maks flygehøyde i meter AGL
 * @param {boolean} nearControlledAirspace   - Innenfor 5km fra kontrollert luftrom/flyplass
 * @param {number}  m1Reduction              - M1 strategisk mitigering: 0, 1 eller 2
 * @param {boolean} m2Parachute              - Har godkjent fallskjerm/termination system
 * @param {string}  c_class                  - "C0"|"C1"|"C2"|"C3"|"C4"|"C5"|"C6"|"none"
 *
 * OUTPUTS:
 * @returns {object} {
 *   droneClass,        // "S" | "M" | "L" | "XL"
 *   speedClass,        // "slow" | "fast"
 *   intrinsicGRC,      // 1–10
 *   m2Reduction,       // 0 | 1
 *   finalGRC,          // 1–10
 *   arc,               // "a" | "b" | "c" | "d"
 *   sail,              // "I" | "II" | "III" | "IV" | "V" | "VI"
 *   scenario,          // "A1" | "A2" | "A3" | "STS-01" | "STS-02" | "PDRA-G01" | ...
 *   requiresAuth,      // boolean
 *   warnings[]         // Array av advarsler til bruker
 * }
 */

export default function soraCalculate(inputs) {
  const {
    mtom_kg,
    characteristic_dimension,
    max_speed_ms,
    operationType,
    populationDensity,
    altitude_m,
    nearControlledAirspace,
    m1Reduction,
    m2Parachute,
    c_class
  } = inputs;

  const warnings = [];

  // ─────────────────────────────────────────────
  // STEG 1 — Drone-klassifisering
  // ─────────────────────────────────────────────

  let droneClass;
  if (characteristic_dimension < 1) droneClass = "S";
  else if (characteristic_dimension < 3) droneClass = "M";
  else if (characteristic_dimension < 8) droneClass = "L";
  else droneClass = "XL";

  const speedClass = max_speed_ms <= 25 ? "slow" : "fast";

  // ─────────────────────────────────────────────
  // STEG 2 — Intrinsic GRC (SORA 2.5 Table 1)
  // Rows: droneClass + speedClass
  // Cols: populationDensity
  // ─────────────────────────────────────────────

  // Drone-kategori for GRC-tabellen
  // Rad 1: S + slow
  // Rad 2: S + fast ELLER M + slow
  // Rad 3: M + fast ELLER L (uavhengig av hastighet)
  // Rad 4: XL

  let grcRow;
  if (droneClass === "S" && speedClass === "slow") grcRow = 0;
  else if ((droneClass === "S" && speedClass === "fast") || (droneClass === "M" && speedClass === "slow")) grcRow = 1;
  else if ((droneClass === "M" && speedClass === "fast") || droneClass === "L") grcRow = 2;
  else grcRow = 3; // XL

  // Kolonner: controlled=0, sparse=1, populated=2, gathering=3
  const densityIndex = {
    controlled: 0,
    sparse: 1,
    populated: 2,
    gathering: 3
  }[populationDensity];

  if (densityIndex === undefined) {
    warnings.push("Ugyldig populationDensity — forventet: controlled | sparse | populated | gathering");
  }

  // GRC-tabell for VLOS (SORA 2.5 Appendix A, Table 1)
  const grcTableVLOS = [
    [1, 2, 3, 4],  // S slow
    [2, 3, 4, 5],  // S fast / M slow
    [3, 4, 5, 6],  // M fast / L
    [4, 5, 6, 7],  // XL
  ];

  let intrinsicGRC = grcTableVLOS[grcRow][densityIndex ?? 1];

  // BVLOS-korreksjon: +2 (EVLOS: +1)
  if (operationType === "BVLOS") intrinsicGRC = Math.min(10, intrinsicGRC + 2);
  else if (operationType === "EVLOS") intrinsicGRC = Math.min(10, intrinsicGRC + 1);

  // ─────────────────────────────────────────────
  // STEG 3 — Mitigering (M1 + M2)
  // M1: strategisk (0–2), M2: teknisk (0–1)
  // ─────────────────────────────────────────────

  const m2Reduction = m2Parachute ? 1 : 0;
  const finalGRC = Math.max(1, intrinsicGRC - (m1Reduction ?? 0) - m2Reduction);

  // ─────────────────────────────────────────────
  // STEG 4 — ARC (Air Risk Class)
  // Forenklet norsk lookup — bruker alltid Ninox/HmSWX for endelig verifikasjon
  // ─────────────────────────────────────────────

  let arc;

  if (nearControlledAirspace) {
    // Nær kontrollert luftrom: minimum ARC-c
    if (altitude_m <= 30) arc = "c";
    else arc = "d";
    warnings.push("Nær kontrollert luftrom — verifiser ARC via Ninox (ninox.avinor.no) og HmSWX.");
  } else if (operationType === "BVLOS") {
    arc = altitude_m > 120 ? "d" : "c";
    warnings.push("BVLOS-operasjoner krever alltid verifisering av ARC med Luftfartstilsynet.");
  } else {
    // VLOS / EVLOS, ikke nær kontrollert luftrom
    if (altitude_m <= 30) arc = "a";
    else if (altitude_m <= 60) arc = "b";
    else if (altitude_m <= 120) arc = "b";
    else arc = "c";
  }

  if (altitude_m > 120) {
    warnings.push("Flygehøyde over 120m AGL krever særskilt tillatelse fra Luftfartstilsynet.");
  }

  // ─────────────────────────────────────────────
  // STEG 5 — SAIL (SORA 2.5 Step 6, Table 2)
  // ─────────────────────────────────────────────

  const arcIndex = { a: 0, b: 1, c: 2, d: 3 }[arc];

  const sailTable = [
    // ARC:  a      b      c      d
    ["I",  "II",  "III", "IV"],   // GRC ≤ 2
    ["II", "III", "IV",  "V"],    // GRC 3–4
    ["III","IV",  "V",   "VI"],   // GRC 5–6
    ["IV", "V",   "VI",  "VI"],   // GRC ≥ 7
  ];

  let grcBand;
  if (finalGRC <= 2) grcBand = 0;
  else if (finalGRC <= 4) grcBand = 1;
  else if (finalGRC <= 6) grcBand = 2;
  else grcBand = 3;

  const sail = sailTable[grcBand][arcIndex];

  // ─────────────────────────────────────────────
  // STEG 6 — Scenario-matching
  // Rekkefølge er viktig — mest restriktive/spesifikke sjekkes sist
  // ─────────────────────────────────────────────

  let scenario;
  let requiresAuth = true;

  // ÅPEN KATEGORI — ingen tillatelse nødvendig
  if (mtom_kg < 0.25 && altitude_m <= 120) {
    scenario = "A1";
    requiresAuth = false;
  } else if (
    mtom_kg <= 4 &&
    operationType === "VLOS" &&
    altitude_m <= 120 &&
    (populationDensity === "sparse" || populationDensity === "controlled")
  ) {
    scenario = "A2";
    requiresAuth = false;
    warnings.push("A2 krever min. avstand til ubeskyttede personer. Verifiser 30m horisontal buffersone.");
  } else if (
    mtom_kg <= 25 &&
    operationType === "VLOS" &&
    populationDensity === "controlled" &&
    altitude_m <= 120
  ) {
    scenario = "A3";
    requiresAuth = false;
  }

  // SPESIFIKK KATEGORI — STS (standardscenario, krever deklarasjon)
  else if (
    (c_class === "C5") &&
    operationType === "VLOS" &&
    altitude_m <= 120
  ) {
    scenario = "STS-01";
  } else if (
    (c_class === "C6") &&
    operationType === "BVLOS" &&
    altitude_m <= 120 &&
    populationDensity !== "gathering"
  ) {
    scenario = "STS-02";
  }

  // SPESIFIKK KATEGORI — PDRA (forhåndsdefinerte risikovurderinger)
  else if (
    mtom_kg <= 1 &&
    operationType === "VLOS" &&
    populationDensity === "populated" &&
    altitude_m <= 30
  ) {
    scenario = "PDRA-G03";
    warnings.push("PDRA-G03: MTOM ≤ 1kg, VLOS, befolket område. Gjelder kun inspeksjon/overvåking.");
  } else if (
    mtom_kg <= 4 &&
    operationType === "VLOS" &&
    populationDensity === "populated" &&
    altitude_m <= 30
  ) {
    scenario = "PDRA-S01";
    warnings.push("PDRA-S01: Befolket område. Krever ERP og operasjonsmanual.");
  } else if (
    mtom_kg <= 10 &&
    operationType === "VLOS" &&
    (populationDensity === "sparse" || populationDensity === "controlled") &&
    altitude_m <= 50
  ) {
    scenario = "PDRA-G01";
  } else if (
    mtom_kg <= 25 &&
    operationType === "VLOS" &&
    (populationDensity === "sparse" || populationDensity === "controlled") &&
    altitude_m <= 50
  ) {
    scenario = "PDRA-G02";
  } else if (
    mtom_kg <= 25 &&
    operationType === "BVLOS" &&
    (populationDensity === "controlled" || populationDensity === "sparse")
  ) {
    scenario = "PDRA-S02";
    warnings.push("PDRA-S02: Ingen norsk samsvarsmatrise tilgjengelig — bruk EASA-versjon.");
  }

  // SORA — full risikovurdering
  else if (["III", "IV"].includes(sail)) {
    scenario = "SORA-III-IV";
  } else if (["V", "VI"].includes(sail)) {
    scenario = "SORA-V-VI";
    warnings.push("SAIL V–VI: Krever sannsynligvis LUC eller spesiell behandling av Luftfartstilsynet.");
  } else {
    // Fallback — bør ikke skje med korrekt input
    scenario = "SORA-III-IV";
    warnings.push("Scenario kunne ikke bestemmes entydig. Kontakt Luftfartstilsynet.");
  }

  return {
    droneClass,
    speedClass,
    intrinsicGRC,
    m1Reduction: m1Reduction ?? 0,
    m2Reduction,
    finalGRC,
    arc,
    sail,
    scenario,
    requiresAuth,
    warnings
  };
}


// ============================================================
// TESTKJØRING — verifiser logikken her
// ============================================================

const testCases = [
  {
    label: "DJI M30T — befolket, VLOS, 60m",
    input: {
      mtom_kg: 3.77,
      characteristic_dimension: 0.668,
      max_speed_ms: 23,
      operationType: "VLOS",
      populationDensity: "populated",
      altitude_m: 60,
      nearControlledAirspace: false,
      m1Reduction: 1,
      m2Parachute: false,
      c_class: "none"
    },
    // Forventet: droneClass=S, speedClass=slow, intrinsicGRC=3, finalGRC=2, ARC-b, SAIL=II, PDRA-S01 eller A2
  },
  {
    label: "DJI Matrice 350 — sparsomt, BVLOS, 100m",
    input: {
      mtom_kg: 9.2,
      characteristic_dimension: 0.895,
      max_speed_ms: 23,
      operationType: "BVLOS",
      populationDensity: "sparse",
      altitude_m: 100,
      nearControlledAirspace: false,
      m1Reduction: 1,
      m2Parachute: false,
      c_class: "none"
    },
    // Forventet: intrinsicGRC=2+2=4, finalGRC=3, ARC-b, SAIL=III, SORA-III-IV
  },
  {
    label: "Liten FPV 180g — kontrollert, VLOS, 30m",
    input: {
      mtom_kg: 0.18,
      characteristic_dimension: 0.2,
      max_speed_ms: 30,
      operationType: "VLOS",
      populationDensity: "controlled",
      altitude_m: 30,
      nearControlledAirspace: false,
      m1Reduction: 0,
      m2Parachute: false,
      c_class: "none"
    },
    // Forventet: A1 (mtom < 250g)
  }
];

testCases.forEach(tc => {
  const result = soraCalculate(tc.input);
  console.log(`\n--- ${tc.label} ---`);
  console.log(`Drone: ${result.droneClass} / ${result.speedClass}`);
  console.log(`GRC: ${result.intrinsicGRC} → ${result.finalGRC} (M1:-${result.m1Reduction} M2:-${result.m2Reduction})`);
  console.log(`ARC: ${result.arc} | SAIL: ${result.sail}`);
  console.log(`Scenario: ${result.scenario} | Krever tillatelse: ${result.requiresAuth}`);
  if (result.warnings.length) console.log(`⚠️  ${result.warnings.join(" | ")}`);
});
