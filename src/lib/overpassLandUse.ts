import L from "leaflet";

export type PopulationDensityClass = 'controlled' | 'sparsely' | 'populated' | 'gathering';

export interface LandUseResult {
  detectedClass: PopulationDensityClass | null; // null = query failed, show manual prompt
  hasResidential: boolean;
  hasCommercial: boolean;
  hasIndustrial: boolean;
  hasFarmland: boolean;
  hasForest: boolean;
  hasGathering: boolean;
  rawTags: string[];
  queryTime: number;
  elementCount: number;
  queryFailed: boolean;
}

/**
 * Convert Leaflet LatLng[] to Overpass poly format: "lat1 lon1 lat2 lon2 ..."
 */
function toOverpassPoly(latlngs: L.LatLng[]): string {
  return latlngs.map(ll => `${ll.lat} ${ll.lng}`).join(' ');
}

/**
 * Expand polygon outward by distance in meters (simple radial expansion from centroid)
 */
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
 * Two-phase Overpass query:
 * Phase 1: Count residential/commercial/retail + building + place tags
 * Phase 2: If phase 1 returns 0, check for any residential landuse
 * 
 * Uses `out count` for fast, reliable counting.
 */
export async function queryLandUseInPolygon(grbPolygon: L.LatLng[]): Promise<LandUseResult> {
  const polyStr = toOverpassPoly(grbPolygon);
  const startTime = Date.now();

  // Phase 1: populated indicators (residential, commercial, buildings, place nodes)
  const query1 = `
[out:json][timeout:10];
(
  way["landuse"~"^(residential|commercial|retail)$"](poly:"${polyStr}");
  way["place"~"^(city_centre|town_centre|suburb|neighbourhood)$"](poly:"${polyStr}");
  node["place"~"^(city_centre|town_centre|suburb|neighbourhood|city|town|village)$"](poly:"${polyStr}");
  way["building"~"^(apartments|residential|commercial|retail|office)$"](poly:"${polyStr}");
);
out count;
`;

  try {
    const res1 = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query1),
    });

    if (!res1.ok) {
      console.warn('Overpass API phase 1 error:', res1.status);
      return failedResult(Date.now() - startTime);
    }

    const data1 = await res1.json();
    const count1 = parseInt(data1.elements?.[0]?.tags?.total || '0', 10);

    if (count1 > 5) {
      // Clearly populated area
      return {
        detectedClass: 'populated',
        hasResidential: true,
        hasCommercial: count1 > 20,
        hasIndustrial: false,
        hasFarmland: false,
        hasForest: false,
        hasGathering: false,
        rawTags: [`populated_count=${count1}`],
        queryTime: Date.now() - startTime,
        elementCount: count1,
        queryFailed: false,
      };
    }

    // Phase 2: Check for any residential at all
    const query2 = `[out:json][timeout:10];(way["landuse"="residential"](poly:"${polyStr}"););out count;`;
    const res2 = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query2),
    });

    if (!res2.ok) {
      console.warn('Overpass API phase 2 error:', res2.status);
      return failedResult(Date.now() - startTime);
    }

    const data2 = await res2.json();
    const count2 = parseInt(data2.elements?.[0]?.tags?.total || '0', 10);

    if (count2 > 0) {
      return {
        detectedClass: 'populated',
        hasResidential: true,
        hasCommercial: false,
        hasIndustrial: false,
        hasFarmland: false,
        hasForest: false,
        hasGathering: false,
        rawTags: [`residential_count=${count2}`],
        queryTime: Date.now() - startTime,
        elementCount: count2,
        queryFailed: false,
      };
    }

    // Phase 3: Check for industrial/farmyard (sparsely populated)
    const query3 = `[out:json][timeout:10];(way["landuse"~"^(industrial|farmyard)$"](poly:"${polyStr}"););out count;`;
    const res3 = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query3),
    });

    if (res3.ok) {
      const data3 = await res3.json();
      const count3 = parseInt(data3.elements?.[0]?.tags?.total || '0', 10);
      if (count3 > 0) {
        return {
          detectedClass: 'sparsely',
          hasResidential: false,
          hasCommercial: false,
          hasIndustrial: true,
          hasFarmland: false,
          hasForest: false,
          hasGathering: false,
          rawTags: [`industrial_count=${count3}`],
          queryTime: Date.now() - startTime,
          elementCount: count3,
          queryFailed: false,
        };
      }
    }

    // Phase 4: Check for nature/forest/farmland (controlled)
    const query4 = `[out:json][timeout:10];(way["landuse"~"^(forest|meadow|farmland|grass)$"](poly:"${polyStr}");way["natural"="water"](poly:"${polyStr}"););out count;`;
    const res4 = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query4),
    });

    if (res4.ok) {
      const data4 = await res4.json();
      const count4 = parseInt(data4.elements?.[0]?.tags?.total || '0', 10);
      if (count4 > 0) {
        return {
          detectedClass: 'controlled',
          hasResidential: false,
          hasCommercial: false,
          hasIndustrial: false,
          hasFarmland: true,
          hasForest: true,
          hasGathering: false,
          rawTags: [`nature_count=${count4}`],
          queryTime: Date.now() - startTime,
          elementCount: count4,
          queryFailed: false,
        };
      }
    }

    // No data found at all — return null to trigger manual classification
    return {
      detectedClass: null,
      hasResidential: false,
      hasCommercial: false,
      hasIndustrial: false,
      hasFarmland: false,
      hasForest: false,
      hasGathering: false,
      rawTags: [],
      queryTime: Date.now() - startTime,
      elementCount: 0,
      queryFailed: false,
    };

  } catch (err) {
    console.warn('Overpass API fetch failed:', err);
    return failedResult(Date.now() - startTime);
  }
}

function failedResult(queryTime: number): LandUseResult {
  return {
    detectedClass: null, // null signals manual classification needed
    hasResidential: false,
    hasCommercial: false,
    hasIndustrial: false,
    hasFarmland: false,
    hasForest: false,
    hasGathering: false,
    rawTags: [],
    queryTime,
    elementCount: 0,
    queryFailed: true,
  };
}
