# Tech Sheet — Drone Sensei Backend Architecture

**Project:** Drone Sensei (Haiko)  
**Date:** 2026-03-16  
**Purpose:** Specification for backend developer to build database & API layer  

---

## 1. System Overview

Drone Sensei is a decision-support platform for Norwegian municipalities evaluating and implementing drone programs. It combines:

1. **DMV (Drone Maturity Assessment)** — 40-question assessment across 5 dimensions → maturity score
2. **DMV Analysis** — AI-powered use case analysis per municipality (fleet, costs, certifications)
3. **SORA Wizard** — Step-by-step EASA SORA 2.5 risk assessment for specific drone operations
4. **EASA Evaluation** — Regulatory compliance evaluation based on maturity level
5. **Platform Recommender** — Drone hardware matching based on use cases

**Core premise:** Nearly all operations are autonomous BVLOS from central drone stations. Two drone archetypes only:
- **Multirotor** (DJI Dock 2 + Matrice 4T): local ops, ≤15km radius, ~450,000 NOK
- **Fixed-wing drone-in-a-box** (Robot Aviation FX10): corridor/area missions, 50km+, ~1,200,000 NOK

---

## 2. Current Database Schema (PostgreSQL / Supabase)

### 2.1 `assessments`
Stores completed maturity assessments.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `municipality_name` | text | NO | — | Free text, should match kommuner list |
| `answers` | jsonb | NO | `'{}'` | Key-value: `"D1.1": 3` (0-4 scale) |
| `assessor_name` | text | YES | — | |
| `total_score` | numeric | YES | — | Calculated weighted score (0-100) |
| `maturity_level` | integer | YES | — | 1-4 (Utforsker → Ledende) |
| `kostra_enrichment` | jsonb | YES | — | SSB KOSTRA data snapshot |
| `easa_evaluation` | jsonb | YES | — | EASA rule evaluation result |
| `platform_recommendations` | jsonb | YES | — | Drone platform recommendations |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Public read/insert/update. No delete. No auth required.

### 2.2 `drone_platforms`
Hardware catalog — 55+ drones (multirotor + fixed-wing).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `manufacturer` | text | NO | — | e.g. "DJI", "Robot Aviation" |
| `model` | text | NO | — | e.g. "Matrice 4T", "FX10" |
| `category` | text | NO | — | "multirotor" or "fixed-wing" |
| `c_class` | text | YES | — | EASA class: C0-C6 or null |
| `easa_category` | text | YES | — | "Open", "Specific", "Certified" |
| `max_takeoff_weight_kg` | numeric | YES | — | MTOM in kg |
| `max_flight_time_min` | integer | YES | — | Minutes |
| `max_range_km` | numeric | YES | — | Operational range km |
| `has_rtk` | boolean | YES | `false` | RTK positioning |
| `sensor_types` | text[] | YES | — | `["RGB","Thermal","LiDAR","Multispectral"]` |
| `suitable_use_cases` | text[] | YES | — | UC-IDs this drone fits |
| `requires_cert` | text | YES | — | "A1/A3", "STS-01", "STS-02", "LUC" |
| `wind_resistance_ms` | numeric | YES | — | Max wind in m/s |
| `ip_rating` | text | YES | — | e.g. "IP55" |
| `camera_specs` | text | YES | — | Free text |
| `price_nok_estimate` | numeric | YES | — | Estimated cost NOK |
| `url` | text | YES | — | Product page URL |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Public read only. No insert/update/delete from client.

### 2.3 `easa_rules`
EASA/CAA regulatory rule catalog.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `category` | text | NO | — | "Open", "Specific", "Certified" |
| `subcategory` | text | YES | — | "A1", "A2", "A3", "STS-01", etc. |
| `c_class` | text | YES | — | Required drone class |
| `description_no` | text | NO | — | Norwegian description |
| `requirements_no` | text | YES | — | Norwegian requirements text |
| `max_weight_kg` | numeric | YES | — | Max MTOM for this rule |
| `max_height_m` | numeric | YES | `120` | |
| `allows_bvlos` | boolean | YES | `false` | |
| `allows_over_people` | boolean | YES | `false` | |
| `min_distance_people_m` | numeric | YES | — | |
| `requires_operator_reg` | boolean | YES | `true` | |
| `requires_pilot_cert` | text | YES | — | Required pilot certificate |
| `luftfartstilsynet_ref` | text | YES | — | CAA Norway reference |
| `use_case_ids` | text[] | YES | — | Applicable UC-IDs |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Public read only.

### 2.4 `kostra_data`
Cached SSB KOSTRA municipal statistics.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `municipality_code` | text | NO | — | 4-digit SSB code |
| `municipality_name` | text | NO | — | |
| `indicator_id` | text | NO | — | SSB indicator ID |
| `indicator_name` | text | NO | — | Human-readable name |
| `value` | numeric | YES | — | |
| `unit` | text | YES | — | |
| `year` | integer | NO | — | |
| `fetched_at` | timestamptz | NO | `now()` | Cache timestamp |

**RLS:** Public read only.

---

## 3. Domain Data Models (Currently in Frontend Code — Should Migrate to DB)

### 3.1 Use Cases (`USE_CASES` — 30 records)

```typescript
interface UseCaseRecord {
  id: string;               // "UC-001" through "UC-030"
  name: string;             // Norwegian name
  department: string;       // Municipal department
  kostraCode: number;       // SSB KOSTRA function code
  type: 'Respons' | 'Inspeksjon' | 'Kartlegging' | 'Overvåkning' | 'Dokumentasjon' | 'Levering';
  
  // SORA calculation inputs
  soraInputs: {
    operationType: 'VLOS' | 'EVLOS' | 'BVLOS';
    dayNight: 'day' | 'night' | 'both';
    maxAltitude: number;        // meters AGL
    populationDensity: 'controlled' | 'sparsely' | 'populated' | 'gathering';
    characteristicDimension: number; // meters
    mtom: number;                    // kg
    m1: 0 | -1 | -2;               // GRC mitigation
    m2: 0 | -1;                     // GRC mitigation
    airspaceClass: string;
    hasTransponder: boolean;
    hasAirspaceObservers: boolean;
  };
  
  // Risk classification
  intrinsicGrc: number;       // 1-10
  arc: string;                // "ARC-a" to "ARC-d"
  sailRoman: string;          // "I" to "VI"
  easaCategory: string;       // Full text
  droneClass: string;         // Size descriptor
  certRequirement: string;    // Certification path
  
  // Operations metadata
  needsThermal: boolean;
  needsRtk: boolean;
  needsNight: boolean;
  needsPayload: boolean;
  mtom: number;
  charDim: number;
  pilotCount: number;
  flightHoursFormula: string; // e.g. "vei_km × 0.15 timer/år"
  costPerUnit: string;
  priority: 'Høy' | 'Medium' | 'Lav';
  relatedUCs: string[];
  softwarePlatform: string;
  integrationSystem: string;
  notes: string;
}
```

### 3.2 Drone Hardware (`DroneSpec` — 55+ records)

```typescript
interface DroneSpec {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  mtom: number;                  // kg
  characteristicDimension: number; // meters (wingspan for fixed-wing)
  maxSpeed: number;              // m/s
  categoryClass: string;         // EASA C0-C6 or "Uncertified"
  easaCategory: 'Open' | 'Specific';
  supportsBVLOS: boolean;
  maxAltitude: number;           // meters
  maxFlightTime: number;         // minutes
  propulsion: 'elektrisk' | 'hybrid' | 'forbrenning';
  hasRemoteId: boolean;
  hasThermal: boolean;
  hasParachute: boolean;
  hasRTK: boolean;
  payloadKg: number;
  notes: string;
}
```

**Categories in DB:**
- **Multirotor:** 16 models (DJI Mini 4 Pro → DJI Agras T40, Skydio X10, Parrot, Autel)
- **Fixed-wing C6/STS-02 certified:** 10 models (DELAIR UX11 variants, Vector Robotics)
- **Fixed-wing commercial:** 29 models (Robot Aviation FX10/FX20/FX450, Quantum-Systems, Wingcopter, etc.)

### 3.3 SORA Calculation Engine

**Inputs:**
```typescript
interface SoraInputs {
  droneName: string;
  mtom: number;                    // kg
  characteristicDimension: number; // meters
  operationType: 'VLOS' | 'EVLOS' | 'BVLOS';
  dayNight: 'day' | 'night' | 'both';
  maxAltitude: number;             // meters AGL
  populationDensity: 'controlled' | 'sparsely' | 'populated' | 'gathering';
  m1: 0 | -1 | -2;               // Strategic mitigation (shelters, containment)
  m2: 0 | -1;                     // Emergency response plan
  nearAirport: boolean;
  hasTransponder: boolean;
  hasAirspaceObservers: boolean;
}
```

**Calculation pipeline (SORA 2.5 Appendix F):**

1. **Size class** from characteristic dimension: S (<1m), M (1-3m), L (3-8m), XL (>8m)
2. **Intrinsic GRC** from [sizeClass × populationDensity] lookup table (values 1-7)
3. **Final GRC** = max(1, intrinsicGRC + m1 + m2)
4. **Initial ARC** from altitude + operation type + near airport
5. **Residual ARC** = initial - transponder bonus - observer bonus
6. **SAIL** from [finalGRC × residualARC] matrix (I-VI)
7. **Scenario match**: A1/A2/A3, STS-01/STS-02, PDRA-G01/G02/S01/S02, or full SORA

**GRC Table:**
```
         controlled  sparsely  populated  gathering
S(< 1m)       1         2         3          4
M(1-3m)       2         3         4          5
L(3-8m)       3         4         5          6
XL(>8m)       4         5         6          7
```

**SAIL Matrix (finalGRC × residualARC):**
```
GRC  ARC-a  ARC-b  ARC-c  ARC-d
 1     I      II     III     IV
 2     I      II     III     IV
 3     II     III     IV      V
 4     II     III     IV      V
 5    III      IV      V     VI
 6    III      IV      V     VI
 7     IV      V     VI     VI
```

**OSO (Operational Safety Objectives):** 24 objectives, each with robustness level per SAIL (O/L/M/H).

### 3.4 PDRA/STS Scenarios

```typescript
interface PdraScenario {
  id: string;         // "STS-01", "STS-02", "PDRA-G01", etc.
  name: string;
  description: string;
  conditions: {
    maxMtom?: number;
    operationType: ('VLOS' | 'BVLOS')[];
    maxAltitude?: number;
    populationDensity: string[];
    maxCharDim?: number;
  };
  sailLevel: string;  // Roman numeral
}
```

6 predefined scenarios: STS-01, STS-02, PDRA-G01, PDRA-G02, PDRA-S01, PDRA-S02.

### 3.5 Department Templates

8 standard municipal departments with minimum population thresholds and mapped use case IDs:
- Brann og redning (pop ≥ 0)
- Tekniske tjenester - Vei (pop ≥ 0)
- Vann og avløp (pop ≥ 0)
- Byggesak / Eiendom (pop ≥ 2000)
- Naturforvaltning (pop ≥ 0)
- Helse og omsorg (pop ≥ 5000)
- Plan og utvikling (pop ≥ 5000)
- Miljø og klima (pop ≥ 10000)

### 3.6 IKS Partnerships (Fire Service Cooperations)

52 inter-municipal fire service partnerships covering all Norwegian regions. Used to identify shared drone station opportunities.

```typescript
interface IKSPartnership {
  id: string;
  name: string;
  municipalities: string[];
  type: 'brann' | 'beredskap' | 'brann_beredskap';
  region: string;
}
```

### 3.7 Maturity Assessment Dimensions

5 dimensions, 40 questions total (8 per dimension), each scored 0-4:

| ID | Name | Weight |
|----|------|--------|
| D1 | Strategi og ledelse | 0.20 |
| D2 | Regulatorisk modenhet | 0.25 |
| D3 | Operasjonell kapasitet | 0.20 |
| D4 | Organisatorisk integrasjon | 0.20 |
| D5 | Innovasjon og samarbeid | 0.15 |

**Maturity levels:** 1 Utforsker (0-25), 2 Utvikler (26-50), 3 Etablert (51-75), 4 Ledende (76-100).

---

## 4. Edge Functions (Deno / Supabase)

### 4.1 `dmv-analyze` — AI-Powered Municipality Analysis
- **Method:** POST
- **Auth:** None (public)
- **AI Model:** `google/gemini-2.5-flash` via Lovable AI Gateway
- **Input:**
  ```json
  {
    "municipality_name": "Verdal",
    "population": 14900,
    "area_km2": 1550,
    "road_km": 380,
    "va_km": 220,
    "buildings": 6500,
    "terrain_type": "fjord_dal",
    "density_per_km2": 9.6,
    "departments": ["Brann og redning", "Tekniske tjenester - Vei", ...],
    "iks_partners": ["Levanger", "Inderøy", "Snåsa"]
  }
  ```
- **Output:** Structured analysis with department_analyses, drone_fleet, certification_plan, iks_recommendation, costs, implementation phases
- **Key logic:** AI constrained to 30 verified use cases only. Post-processing validates operation_type, easa_category, and certification against source database. Fleet sizing: 1 unit per archetype unless >400 flight-hours/year.

### 4.2 `sora-calculate` — SORA 2.5 Risk Assessment
- **Method:** POST
- **Auth:** None
- **Input:** SoraInputs + municipality data + drone platform selection
- **Output:** GRC, ARC, SAIL, scenario match, OSO requirements, TMPR level, population density analysis
- **Key logic:** Duplicates client-side SORA engine on server for validation. Uses WorldPop ArcGIS for population density verification.

### 4.3 `easa-evaluate` — Regulatory Evaluation
- **Method:** POST
- **Input:** Assessment answers + municipality_name + maturity_level + use_case_ids
- **Output:** Allowed EASA categories, required certifications, recommendations, regulatory gaps
- **Key logic:** Maps D2 dimension scores to regulatory readiness. Queries `easa_rules` table.

### 4.4 `kostra-data` — SSB Municipal Statistics
- **Method:** POST
- **Input:** `{ municipality_name: string }`
- **Output:** KOSTRA indicators (road km, VA km, buildings, population, area, etc.)
- **External APIs:**
  - Kartverket Geonorge: `ws.geonorge.no/kommuneinfo/v1/sok` — municipality code + area lookup
  - SSB Open API: `data.ssb.no/api/v0/no/table/{tableId}` — statistical indicators
- **Caching:** Results stored in `kostra_data` table

### 4.5 `platform-recommend` — Drone Hardware Matching
- **Method:** POST
- **Input:** Use case IDs + municipal data (road_km, buildings, va_km, area_km2)
- **Output:** Recommended drones per department, fleet composition, flight hour estimates
- **Key logic:** Matches drone_platforms from DB against use case requirements (thermal, RTK, BVLOS, payload, range).

---

## 5. External API Integrations

| Service | Endpoint | Purpose | Auth |
|---------|----------|---------|------|
| SSB Open API | `data.ssb.no/api/v0/no/table/*` | KOSTRA municipal statistics | None (public) |
| Kartverket Geonorge | `ws.geonorge.no/kommuneinfo/v1/sok` | Municipality code/area lookup | None (public) |
| WorldPop ArcGIS | `tiles.arcgis.com/.../ImageServer` | Population density raster | None (public) |
| Lovable AI Gateway | `ai.gateway.lovable.dev/v1/chat/completions` | AI analysis (Gemini 2.5 Flash) | `LOVABLE_API_KEY` |

---

## 6. Recommended Schema Migrations (Tables to Create/Extend)

### 6.1 `use_cases` (NEW — migrate from frontend)
```sql
CREATE TABLE public.use_cases (
  id text PRIMARY KEY,                    -- "UC-001"
  name text NOT NULL,
  department text NOT NULL,
  kostra_code integer,
  type text NOT NULL,                     -- enum: Respons/Inspeksjon/Kartlegging/etc.
  operation_type text NOT NULL DEFAULT 'BVLOS',  -- VLOS/EVLOS/BVLOS
  easa_category text NOT NULL,
  cert_requirement text,
  drone_archetype text NOT NULL DEFAULT 'multirotor', -- multirotor/fixedWing
  priority text DEFAULT 'Medium',         -- Høy/Medium/Lav
  flight_hours_formula text,              -- "vei_km × 0.15 timer/år"
  needs_thermal boolean DEFAULT false,
  needs_rtk boolean DEFAULT false,
  needs_night boolean DEFAULT false,
  needs_payload boolean DEFAULT false,
  default_mtom numeric,
  default_char_dim numeric,
  pilot_count integer DEFAULT 1,
  sora_inputs jsonb,                      -- Default SORA parameters
  intrinsic_grc integer,
  arc text,
  sail_roman text,
  related_uc_ids text[],
  software_platform text,
  integration_system text,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### 6.2 `iks_partnerships` (NEW — migrate from frontend)
```sql
CREATE TABLE public.iks_partnerships (
  id text PRIMARY KEY,
  name text NOT NULL,
  municipalities text[] NOT NULL,
  type text NOT NULL,                     -- brann/beredskap/brann_beredskap
  region text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### 6.3 `department_templates` (NEW — migrate from frontend)
```sql
CREATE TABLE public.department_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text,
  min_population integer DEFAULT 0,
  relevant_use_case_ids text[],
  description text,
  created_at timestamptz DEFAULT now()
);
```

### 6.4 `sora_assessments` (NEW — persist SORA wizard results)
```sql
CREATE TABLE public.sora_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id),  -- optional link to DMV
  municipality_name text,
  drone_id text,                           -- references drone_platforms or local drone spec
  drone_name text,
  sora_inputs jsonb NOT NULL,
  sora_results jsonb NOT NULL,             -- GRC, ARC, SAIL, scenario, OSO
  oso_responses jsonb,                     -- user-filled OSO templates
  documents_generated text[],              -- list of generated doc types
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 6.5 `dmv_analyses` (NEW — persist AI analysis results)
```sql
CREATE TABLE public.dmv_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id),
  municipality_name text NOT NULL,
  input_params jsonb NOT NULL,            -- population, area, departments, etc.
  analysis_result jsonb NOT NULL,         -- full AI response
  total_drones integer,
  total_annual_cost_nok numeric,
  total_annual_flight_hours numeric,
  created_at timestamptz DEFAULT now()
);
```

### 6.6 `pdra_scenarios` (NEW — migrate from frontend)
```sql
CREATE TABLE public.pdra_scenarios (
  id text PRIMARY KEY,                    -- "STS-01", "PDRA-G01"
  name text NOT NULL,
  description text,
  conditions jsonb NOT NULL,              -- maxMtom, operationType[], maxAltitude, etc.
  sail_level text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

---

## 7. Environment Variables / Secrets

| Secret | Location | Purpose |
|--------|----------|---------|
| `LOVABLE_API_KEY` | Edge Function env | AI Gateway access |
| `SUPABASE_URL` | Edge Function env | DB access from functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function env | Admin DB access |
| `SUPABASE_ANON_KEY` | Edge Function env | Public DB access |
| `VITE_SUPABASE_URL` | Frontend .env | Client-side DB URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend .env | Client anon key |

---

## 8. Key Business Rules

### 8.1 Certification Hierarchy (MUTUALLY EXCLUSIVE)
1. **Open category** (A1/A2/A3): Online course. VLOS only. ≤120m. Limited weight.
2. **STS-01/STS-02**: Standard scenario under Specific. Declaration + training + operations manual.
3. **Specific with OpAuth**: Full SORA assessment + Luftfartstilsynet approval.
4. **LUC**: Organization certification — replaces individual OpAuth.

**Invalid combinations:**
- LUC + A1/A2/A3 (different categories)
- A2 + STS-01 for same operation
- BVLOS + Open category (BVLOS is ALWAYS Specific or Certified)

### 8.2 Fleet Sizing Rules
- 1 multirotor station per municipality (unless >400 flight-hours/year → 2)
- 1 fixed-wing unit per municipality (unless >400 flight-hours/year → 2)
- IKS partnerships can share drone stations across member municipalities

### 8.3 VLOS Exceptions (Manual Operations)
Only 3 use cases remain VLOS:
- UC-007: Bridge inspection (close-range underside)
- UC-010: Tunnel portal inspection
- UC-018: Heritage building documentation
- UC-030: Public event security (SAIL IV due to crowd)

### 8.4 Population Density Thresholds (SORA Ground Risk)
- < 50/km²: sparsely populated
- 50-500/km²: populated
- > 500/km²: densely populated

---

## 9. File Map (Current Implementation)

```
src/
├── data/
│   ├── droneDatabase.ts          # DroneSpec interface + 16 multirotors
│   ├── fixedWingDatabase.ts      # 39 fixed-wing drones
│   ├── useCaseData.ts            # 30 use cases with SORA inputs (1258 lines)
│   ├── dmvData.ts                # DMV assessment dimensions + questions
│   ├── departmentTemplates.ts    # 8 department templates
│   ├── iksData.ts                # 52 IKS fire partnerships
│   ├── pdraScenarios.ts          # 6 PDRA/STS scenarios
│   └── kommuner.ts               # ~350 Norwegian municipalities
├── lib/
│   ├── soraCalculations.ts       # SORA 2.5 engine (GRC, ARC, SAIL, OSO)
│   ├── soraDocumentGenerators.ts # Document generation (ConOps, OM, etc.)
│   ├── operationsManualGenerator.ts
│   ├── evaluationApi.ts          # API calls to edge functions
│   └── worldPopDensity.ts        # WorldPop ArcGIS integration
├── pages/
│   ├── Assessment.tsx            # DMV maturity assessment
│   ├── Results.tsx               # Assessment results + AI analysis
│   ├── SoraWizard.tsx            # SORA step-by-step wizard
│   ├── Dashboard.tsx             # Main dashboard
│   └── UseCases.tsx              # Use case browser
└── hooks/
    └── useAssessment.ts          # Assessment state management

supabase/functions/
├── dmv-analyze/index.ts          # AI-powered municipal analysis (348 lines)
├── sora-calculate/index.ts       # Server-side SORA engine (290 lines)
├── easa-evaluate/index.ts        # EASA regulatory evaluation (111 lines)
├── kostra-data/index.ts          # SSB KOSTRA data fetcher (376 lines)
└── platform-recommend/index.ts   # Drone hardware matching (308 lines)
```

---

## 10. Priority Actions for Backend Developer

1. **Create missing tables** (§6.1–6.6) — migrate hardcoded data from frontend to DB
2. **Add proper indexes** on `drone_platforms(category, easa_category)`, `use_cases(department, drone_archetype)`, `kostra_data(municipality_code, indicator_id)`
3. **Implement `updated_at` triggers** on all new tables (reuse existing `update_updated_at_column()` function)
4. **Add authentication** — current system has no auth. Consider adding for assessment persistence and multi-user support.
5. **Normalize drone_platforms** — merge TypeScript DroneSpec fields into DB (characteristic_dimension, propulsion, has_thermal, has_parachute, supports_bvlos are missing from DB schema)
6. **Add API versioning** to edge functions
7. **Implement rate limiting** on AI-powered endpoints (dmv-analyze)
8. **Add data validation** — input sanitization on all edge function endpoints
