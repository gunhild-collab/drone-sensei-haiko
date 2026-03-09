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

function toOverpassPoly(latlngs: L.LatLng[]): string {
  return latlngs.map(ll => `${ll.lat} ${ll.lng}`).join(' ');
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
 * Classify population density using a single Overpass query with three named sets:
 * urban, gathering, rural — then use `out count` for each.
 */
export async function queryLandUseInPolygon(grbPolygon: L.LatLng[]): Promise<LandUseResult> {
  const polyStr = toOverpassPoly(grbPolygon);
  const startTime = Date.now();

  // Single combined query with three categories
  const query = `
[out:json][timeout:15];
(
  way["landuse"~"^(residential|commercial|retail|industrial)$"](poly:"${polyStr}");
  way["building"~"^(apartments|residential|commercial|retail|office|public|civic)$"](poly:"${polyStr}");
  node["place"~"^(city|town|village|suburb|city_centre|town_centre|neighbourhood)$"](poly:"${polyStr}");
  way["amenity"~"^(school|hospital|university|marketplace)$"](poly:"${polyStr}");
)->.urban;

(
  way["leisure"~"^(stadium|park|recreation_ground)$"](poly:"${polyStr}");
  node["leisure"="stadium"](poly:"${polyStr}");
)->.gathering;

(
  way["landuse"~"^(farmland|forest|meadow|grass|orchard|vineyard)$"](poly:"${polyStr}");
  way["natural"~"^(water|wood|scrub|grassland|beach)$"](poly:"${polyStr}");
)->.rural;

.urban out count;
.gathering out count;
.rural out count;
`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
    });

    if (!res.ok) {
      console.warn('Overpass API error:', res.status);
      return failedResult(Date.now() - startTime);
    }

    const data = await res.json();
    
    // Parse the three count results
    // Overpass returns elements array with count objects
    const counts = data.elements || [];
    const urbanCount = parseInt(counts[0]?.tags?.total || '0', 10);
    const gatheringCount = parseInt(counts[1]?.tags?.total || '0', 10);
    const ruralCount = parseInt(counts[2]?.tags?.total || '0', 10);

    const totalCount = urbanCount + gatheringCount + ruralCount;
    const tags: string[] = [];
    if (urbanCount > 0) tags.push(`urban=${urbanCount}`);
    if (gatheringCount > 0) tags.push(`gathering=${gatheringCount}`);
    if (ruralCount > 0) tags.push(`rural=${ruralCount}`);

    // Classify using priority order (highest risk wins)
    const detectedClass = classifyDensity(urbanCount, gatheringCount, ruralCount);

    return {
      detectedClass,
      urbanCount,
      gatheringCount,
      ruralCount,
      rawTags: tags,
      queryTime: Date.now() - startTime,
      elementCount: totalCount,
      queryFailed: false,
    };
  } catch (err) {
    console.warn('Overpass API fetch failed:', err);
    return failedResult(Date.now() - startTime);
  }
}

function classifyDensity(
  urbanCount: number,
  gatheringCount: number,
  ruralCount: number,
): PopulationDensityClass | null {
  // Check for gathering/stadium first (highest risk)
  if (gatheringCount > 0) return 'gathering';

  // Urban/residential/commercial present
  if (urbanCount > 3) return 'populated';

  // Some features but mostly open
  if (urbanCount > 0) return 'sparsely';

  // Open land, farmland, forest, water
  if (ruralCount > 0) return 'controlled';

  // No data found — return null to trigger manual classification
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
