import L from "leaflet";

export type PopulationDensityClass = 'controlled' | 'sparsely' | 'populated' | 'gathering';

export interface LandUseResult {
  detectedClass: PopulationDensityClass | null;
  urbanCount: number;
  gatheringCount: number;
  ruralCount: number;
  rawTags: string[];
  queryTime: number;
  elementCount: number;
  queryFailed: boolean;
}

export function expandPolygonByGrb(latlngs: L.LatLng[], grbMeters: number): L.LatLng[] {
  const center = L.polygon(latlngs).getBounds().getCenter();
  return latlngs.map(ll => {
    const bearing = Math.atan2(ll.lng - center.lng, ll.lat - center.lat);
    const dLat = (grbMeters / 111320) * Math.cos(bearing);
    const dLng = (grbMeters / (111320 * Math.cos(ll.lat * Math.PI / 180))) * Math.sin(bearing);
    return L.latLng(ll.lat + dLat, ll.lng + dLng);
  });
}

/**
 * Query Overpass API using bbox from polygon bounds.
 * Uses the exact query format specified in requirements.
 */
export async function queryLandUseInPolygon(grbPolygon: L.LatLng[]): Promise<LandUseResult> {
  const bounds = L.polygon(grbPolygon).getBounds();
  const south = bounds.getSouth().toFixed(6);
  const west = bounds.getWest().toFixed(6);
  const north = bounds.getNorth().toFixed(6);
  const east = bounds.getEast().toFixed(6);
  const bbox = `${south},${west},${north},${east}`;
  const startTime = Date.now();

  const query = `[out:json][timeout:10];
(
  way["landuse"~"residential|commercial|retail|industrial"](${bbox});
  node["place"~"city|town|village|suburb|quarter"](${bbox});
  way["amenity"~"school|hospital|stadium"](${bbox});
  node["leisure"="stadium"](${bbox});
  way["landuse"~"farmland|forest|meadow|nature_reserve"](${bbox});
  way["natural"~"water|wetland|wood"](${bbox});
);
out count;`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn('Overpass API error:', res.status);
      return failedResult(Date.now() - startTime);
    }

    const data = await res.json();
    const totalCount = parseInt(data.elements?.[0]?.tags?.total || '0', 10);
    const qt = Date.now() - startTime;

    // The single `out count` gives total count but no breakdown.
    // We need individual counts — run a second pass to classify.
    // Instead, run separate tagged queries for classification.
    return await classifyWithDetailedQuery(bbox, qt, startTime);
  } catch (err) {
    console.warn('Overpass API fetch failed:', err);
    return failedResult(Date.now() - startTime);
  }
}

async function classifyWithDetailedQuery(bbox: string, _initialTime: number, startTime: number): Promise<LandUseResult> {
  // Detailed query that returns tags we can classify
  const query = `[out:json][timeout:10];
(
  way["landuse"~"residential|commercial|retail|industrial"](${bbox});
  node["place"~"city|town|village|suburb|quarter"](${bbox});
  way["amenity"~"school|hospital|stadium"](${bbox});
  node["leisure"="stadium"](${bbox});
)->.urban;
(
  node["leisure"="stadium"](${bbox});
  way["amenity"="stadium"](${bbox});
)->.gathering;
(
  way["landuse"~"farmland|forest|meadow|nature_reserve"](${bbox});
  way["natural"~"water|wetland|wood"](${bbox});
)->.rural;
.urban out count;
.gathering out count;
.rural out count;`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return failedResult(Date.now() - startTime);

    const data = await res.json();
    const counts = data.elements || [];
    const urbanCount = parseInt(counts[0]?.tags?.total || '0', 10);
    const gatheringCount = parseInt(counts[1]?.tags?.total || '0', 10);
    const ruralCount = parseInt(counts[2]?.tags?.total || '0', 10);

    const tags: string[] = [];
    if (urbanCount > 0) tags.push(`urban=${urbanCount}`);
    if (gatheringCount > 0) tags.push(`gathering=${gatheringCount}`);
    if (ruralCount > 0) tags.push(`rural=${ruralCount}`);

    const detectedClass = classifyDensity(urbanCount, gatheringCount, ruralCount);

    return {
      detectedClass,
      urbanCount,
      gatheringCount,
      ruralCount,
      rawTags: tags,
      queryTime: Date.now() - startTime,
      elementCount: urbanCount + gatheringCount + ruralCount,
      queryFailed: false,
    };
  } catch (err) {
    console.warn('Overpass detailed query failed:', err);
    return failedResult(Date.now() - startTime);
  }
}

function classifyDensity(
  urbanCount: number,
  gatheringCount: number,
  ruralCount: number,
): PopulationDensityClass | null {
  if (gatheringCount > 0) return 'gathering';
  if (urbanCount > 3) return 'populated';
  if (urbanCount > 0) return 'sparsely';
  if (ruralCount > 0) return 'controlled';
  return null;
}

function failedResult(queryTime: number): LandUseResult {
  return {
    detectedClass: null,
    urbanCount: 0,
    gatheringCount: 0,
    ruralCount: 0,
    rawTags: [],
    queryTime,
    elementCount: 0,
    queryFailed: true,
  };
}
