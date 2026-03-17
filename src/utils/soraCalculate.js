// ============================================================
// HAIKO — SORA 2.5 RISK CALCULATOR
// Based on SORA 2.5 (ED Decision 2025/018/R, Amendment 3)
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
 * @param {number}  ctr_distance_km          - Avstand til nærmeste CTR/ATZ i km (default 10)
 * @param {boolean} isUrbanArea              - Er operasjonsområdet urbant? (default false)
 *
 * Ground mitigations (M1A, M1B, M1C, M2):
 * @param {string}  m1a_robustness           - "none" | "medium" | "high" (sheltering)
 * @param {string}  m1b_robustness           - "none" | "medium" | "high" (operational restrictions)
 * @param {boolean} m1c_ground_observers     - Dedicated ground observer (low robustness only)
 * @param {string}  m2_robustness            - "none" | "medium" | "high" (impact dynamics)
 *
 * Air mitigations (strategic MS1-MS5):
 * @param {string}  ms1_segregation          - "none" | "medium" | "high"
 * @param {boolean} ms2_time_windows         - Operate in low-traffic windows
 * @param {string}  ms3_visual_observers     - "none" | "high" (visual see-and-avoid)
 * @param {boolean} ms4_airspace_coord       - ANSP agreement
 * @param {string}  ms5_boundaries           - "none" | "medium" | "high" (geofence)
 *
 * Legacy compat:
 * @param {number}  m1Reduction              - Legacy: 0, 1 or 2 (mapped from m1a/m1b)
 * @param {boolean} m2Parachute              - Legacy: has parachute (mapped to m2_robustness=medium)
 * @param {string}  c_class                  - "C0"|"C1"|"C2"|"C3"|"C4"|"C5"|"C6"|"none"
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
    ctr_distance_km = 10,
    isUrbanArea = false,
    // Granular mitigations (SORA 2.5)
    m1a_robustness = 'none',
    m1b_robustness = 'none',
    m1c_ground_observers = false,
    m2_robustness = 'none',
    // Strategic air mitigations
    ms1_segregation = 'none',
    ms2_time_windows = false,
    ms3_visual_observers = 'none',
    ms4_airspace_coord = false,
    ms5_boundaries = 'none',
    // Legacy compat
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
  // STEG 2 — Intrinsic GRC (SORA 2.5 Table 1, AMC S.4.2.3)
  // Rows: dimension × speed combinations
  // Cols: population density (5 bands in spec, 4 used here)
  // ─────────────────────────────────────────────
  let grcRow;
  if (droneClass === "S" && speedClass === "slow") grcRow = 0;
  else if ((droneClass === "S" && speedClass === "fast") || (droneClass === "M" && speedClass === "slow")) grcRow = 1;
  else if ((droneClass === "M" && speedClass === "fast") || droneClass === "L") grcRow = 2;
  else grcRow = 3; // XL

  const densityIndex = {
    controlled: 0,
    sparse: 1,
    populated: 2,
    gathering: 3
  }[populationDensity];

  if (densityIndex === undefined) {
    warnings.push("Ugyldig populationDensity — forventet: controlled | sparse | populated | gathering");
  }

  const grcTableVLOS = [
    [1, 2, 3, 4],  // S slow (dim<1m, speed≤25m/s)
    [2, 3, 4, 5],  // S fast / M slow (dim<1m fast OR 1-3m slow)
    [3, 4, 5, 6],  // M fast / L (1-3m fast OR 3-8m)
    [4, 5, 6, 7],  // XL (>8m)
  ];

  let intrinsicGRC = grcTableVLOS[grcRow][densityIndex ?? 1];

  // BVLOS/EVLOS correction
  if (operationType === "BVLOS") intrinsicGRC = Math.min(10, intrinsicGRC + 2);
  else if (operationType === "EVLOS") intrinsicGRC = Math.min(10, intrinsicGRC + 1);

  // ─────────────────────────────────────────────
  // STEG 3 — Ground Risk Mitigations (M1A, M1B, M1C, M2)
  // Per SORA 2.5 AMC S.4.3.2
  // ─────────────────────────────────────────────
  let grcReduction = 0;

  // Check if using legacy or granular inputs
  const useLegacy = m1Reduction !== undefined && m1a_robustness === 'none' && m1b_robustness === 'none';

  if (useLegacy) {
    // Legacy mode: simple M1 + M2
    grcReduction = (m1Reduction ?? 0) + (m2Parachute ? 1 : 0);
  } else {
    // SORA 2.5 granular mode
    // M1A — Sheltering (people under permanent structures)
    const m1aReduction = { none: 0, medium: 1, high: 2 }[m1a_robustness] ?? 0;
    // M1B — Operational restrictions (boundary/time limits)
    const m1bReduction = { none: 0, medium: 1, high: 2 }[m1b_robustness] ?? 0;
    // M1C — Ground observer (low robustness only, -1)
    const m1cReduction = m1c_ground_observers ? 1 : 0;
    // M2 — Impact dynamics (parachute/termination)
    const m2Reduction = { none: 0, medium: 1, high: 2 }[m2_robustness] ?? 0;

    grcReduction = m1aReduction + m1bReduction + m1cReduction + m2Reduction;
  }

  const m2Reduction = useLegacy ? (m2Parachute ? 1 : 0) : ({ none: 0, medium: 1, high: 2 }[m2_robustness] ?? 0);
  const finalGRC = Math.max(1, Math.min(7, intrinsicGRC - grcReduction));

  if (finalGRC >= 7) {
    warnings.push("GRC ≥ 7: Operasjonen kan kreve sertifisert kategori (AMC S.4.3.2).");
  }

  // ─────────────────────────────────────────────
  // STEG 4 — Initial Air Risk Class (iARC)
  // Per SORA 2.5 AMC S.4.4.2 & Annex C
  // Norwegian simplified lookup
  // ─────────────────────────────────────────────
  let arc;
  const effectiveCtrdist = nearControlledAirspace ? Math.min(ctr_distance_km, 5) : ctr_distance_km;

  if (effectiveCtrdist < 1) {
    arc = "d";
    warnings.push("Under 1 km fra CTR/ATZ — kontrollert luftrom, ARC-d. Krever ATC-tillatelse.");
  } else if (effectiveCtrdist < 3 || isUrbanArea || altitude_m > 300) {
    arc = "c";
    if (isUrbanArea) warnings.push("Urbant område gir ARC-c. Verifiser med Ninox.");
    if (altitude_m > 300) warnings.push("Flygehøyde over 300m AGL gir ARC-c eller høyere.");
  } else if (effectiveCtrdist < 5 || altitude_m > 120) {
    arc = "b";
  } else {
    // Uncontrolled, rural, >5km from CTR
    arc = "a";
  }

  // BVLOS always bumps minimum ARC
  if (operationType === "BVLOS" || operationType === "EVLOS") {
    if (arc === "a") arc = "b"; // BVLOS minimum ARC-b
    if (altitude_m > 120 && arc < "c") arc = "c";
    warnings.push("BVLOS-operasjoner: Verifiser ARC med Luftfartstilsynet.");
  }

  if (altitude_m > 120) {
    warnings.push("Flygehøyde over 120m AGL krever særskilt tillatelse fra Luftfartstilsynet.");
  }

  const iARC = arc; // Save initial before mitigations

  // ─────────────────────────────────────────────
  // STEG 5 — Strategic Air Mitigations (MS1–MS5)
  // Per SORA 2.5 AMC S.4.4.3
  // ─────────────────────────────────────────────
  const arcOrder = ["a", "b", "c", "d"];
  let arcNumeric = arcOrder.indexOf(arc);
  let airMitigationCount = 0;

  // MS1 — Segregated airspace (medium or high robustness)
  if (ms1_segregation === 'medium' || ms1_segregation === 'high') airMitigationCount++;
  // MS2 — Time windows (low traffic periods)
  if (ms2_time_windows) airMitigationCount++;
  // MS3 — Visual observers (high robustness only)
  if (ms3_visual_observers === 'high') airMitigationCount++;
  // MS4 — Airspace coordination (ANSP agreement)
  if (ms4_airspace_coord) airMitigationCount++;
  // MS5 — Location boundaries / geofence (medium or high)
  if (ms5_boundaries === 'medium' || ms5_boundaries === 'high') airMitigationCount++;

  arcNumeric = Math.max(0, arcNumeric - airMitigationCount);
  arc = arcOrder[arcNumeric];

  // ─────────────────────────────────────────────
  // STEG 6 — SAIL (SORA 2.5 Step 7, per-GRC-row matrix)
  // Per AMC Annex E
  // ─────────────────────────────────────────────
  const arcIndex = { a: 0, b: 1, c: 2, d: 3 }[arc];

  // SORA 2.5 exact per-GRC-row matrix
  const sailMatrix = [
    //  ARC-a  ARC-b  ARC-c  ARC-d
    ["I",   "I",   "I",   "II"],    // GRC = 1
    ["I",   "I",   "II",  "II"],    // GRC = 2
    ["I",   "II",  "II",  "III"],   // GRC = 3
    ["II",  "II",  "III", "IV"],    // GRC = 4
    ["II",  "III", "III", "V"],     // GRC = 5
    ["III", "IV",  "V",   "VI"],    // GRC = 6
    ["IV",  "V",   "VI",  "VI"],    // GRC = 7
  ];

  const grcIdx = Math.min(Math.max(finalGRC, 1), 7) - 1;
  const sail = sailMatrix[grcIdx][arcIndex];

  const sailNumeric = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }[sail];
  if (sailNumeric > 3) {
    warnings.push(`SAIL ${sail}: Utenfor MVP-scope (SAIL I–III). Anbefaler redesign av operasjonen.`);
  }

  // ─────────────────────────────────────────────
  // STEG 7 — Scenario-matching
  // Prioritert beslutningstabell, første match vinner
  // ─────────────────────────────────────────────
  let scenario;
  let requiresAuth = true;

  const isVLOS = operationType === "VLOS";
  const isBVLOS = operationType === "BVLOS" || operationType === "EVLOS";
  const isSparseOrControlled = populationDensity === "sparse" || populationDensity === "controlled";
  const isGathering = populationDensity === "gathering";

  const canBeOpen = isVLOS && altitude_m <= 120;

  // ── ÅPEN KATEGORI (A1 → A2 → A3) ──
  if (canBeOpen && !isGathering) {
    if (mtom_kg < 0.25 && (c_class === "C0" || c_class === "C1" || c_class === "none")) {
      scenario = "A1";
      requiresAuth = false;
    } else if (mtom_kg <= 4 && isSparseOrControlled && (c_class === "C2" || c_class === "none")) {
      scenario = "A2";
      requiresAuth = false;
      warnings.push("A2 krever min. 30m horisontal buffer til ubeskyttede personer.");
    } else if (mtom_kg <= 25 && populationDensity === "controlled") {
      scenario = "A3";
      requiresAuth = false;
      warnings.push("A3 krever kontrollert område uten ubeskyttede personer i nærheten.");
    }
  }

  // ── STS-01 ──
  if (!scenario && isVLOS && altitude_m <= 120 && c_class === "C5" && !isGathering) {
    scenario = "STS-01";
  }

  // ── STS-02 ──
  if (!scenario && isBVLOS && altitude_m <= 120 && c_class === "C6" && isSparseOrControlled) {
    scenario = "STS-02";
  }

  // ── PDRA-G03 ──
  if (!scenario && isVLOS && mtom_kg <= 1 && populationDensity === "populated" && altitude_m <= 30) {
    scenario = "PDRA-G03";
    warnings.push("PDRA-G03: MTOM ≤ 1kg, VLOS, befolket område, maks 30m AGL.");
  }

  // ── PDRA-S01 ──
  if (!scenario && isVLOS && mtom_kg <= 4 && populationDensity === "populated" && altitude_m <= 30) {
    scenario = "PDRA-S01";
    warnings.push("PDRA-S01: Befolket område. Krever ERP og operasjonsmanual.");
  }

  // ── PDRA-G01 ──
  if (!scenario && isVLOS && mtom_kg <= 10 && isSparseOrControlled && altitude_m <= 50) {
    scenario = "PDRA-G01";
  }

  // ── PDRA-G02 ──
  if (!scenario && isVLOS && mtom_kg <= 25 && isSparseOrControlled && altitude_m <= 50) {
    scenario = "PDRA-G02";
  }

  // ── PDRA-S02 ──
  if (!scenario && isBVLOS && mtom_kg <= 25 && isSparseOrControlled) {
    scenario = "PDRA-S02";
    warnings.push("PDRA-S02: Ingen norsk samsvarsmatrise tilgjengelig — bruk EASA-versjon.");
  }

  // ── SORA — fallback ──
  if (!scenario) {
    if (["V", "VI"].includes(sail)) {
      scenario = "SORA-V-VI";
      warnings.push("SAIL V–VI: Krever sannsynligvis LUC eller spesiell behandling av Luftfartstilsynet.");
    } else {
      scenario = "SORA-III-IV";
    }
  }

  return {
    droneClass,
    speedClass,
    intrinsicGRC,
    m1Reduction: useLegacy ? (m1Reduction ?? 0) : grcReduction,
    m2Reduction,
    finalGRC,
    iARC,
    arc, // residual ARC after strategic mitigations
    airMitigationCount,
    sail,
    scenario,
    requiresAuth,
    warnings
  };
}
