
## Drone Uptime Calculator — Implementation Plan

### Phase 1: Database & Seed Data
1. **Migration**: Create `weather_observations` table (station_id, timestamp, wind_speed, gust, temp, precip, humidity, visibility, source)
2. **Migration**: Add columns to existing `municipalities` or create a lightweight lookup: `latitude`, `longitude`, `nearest_frost_station_id`, `frost_station_name`
3. **Note**: We already have `drone_platforms` in the external DMA Library — we'll add weather limits (max_wind, min_temp, etc.) as a local config map or extend the external DB

### Phase 2: Frost API Integration (Edge Function)
1. **Secret**: Add `FROST_CLIENT_ID` 
2. **Edge Function** `frost-sync`: Fetches hourly weather data for a given station from Frost API, stores in `weather_observations`
3. Handles pagination (100k row limit), throttling, and caching (skip if data already exists for station/timerange)

### Phase 3: Uptime Calculation (Edge Function)
1. **Edge Function** `uptime-calculate`: Takes station_id + platform specs + night_flight flag
2. Fetches cached weather data from `weather_observations`
3. Applies platform thresholds (wind, gust, temp, visibility, precip, icing)
4. Filters by daylight hours using MET Sunrise API (if night_flight=false)
5. Returns monthly aggregated percentiles (p10, p50, p90) + primary constraint per month

### Phase 4: UI Component
1. Inputs: Kommune dropdown, Platform dropdown (pre-filled), Night flight toggle
2. Big number: Annual median uptime with range
3. Recharts bar chart: 12 months with confidence band
4. Table: Month | Conservative | Expected | Optimistic | Primary constraint
5. Data source footer with station info

### Phase 5 (Later): ERA5 Fallback
- Only if Frost stations lack visibility/humidity data
- Requires CDS API key and async job pattern
- Deferred to avoid scope creep

### Key decisions:
- **Frost API key required** — user must provide `FROST_CLIENT_ID` (free from MET Norway)
- **ERA5 deferred** to Phase 5 — Frost covers most Norwegian stations well
- **Sunrise calculation** done server-side in the uptime edge function (no separate API needed — we can compute astronomically)
- **Platform weather limits** stored as a local config map in the edge function (not in external DB)
