import L from "leaflet";

export type PopulationDensityClass = 'controlled' | 'sparsely' | 'populated' | 'gathering';

export interface LandUseResult {
  detectedClass: PopulationDensityClass;
  hasResidential: boolean;
  hasCommercial: boolean;
  hasIndustrial: boolean;
  hasFarmland: boolean;
  hasForest: boolean;
  hasGathering: boolean;
  rawTags: string[];
  queryTime: number;
}

/**
 * Convert Leaflet LatLng[] to Overpass poly format: "lat1 lon1 lat2 lon2 ..."
 */
function toOverpassPoly(latlngs: L.LatLng[]): string {
  return latlngs.map(ll => `${ll.lat} ${ll.lng}`).join(' ');
}

/**
 * Expand polygon by GRB distance to get the "ground risk area"
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
 * Query Overpass API for land use within the given polygon (GRB-expanded).
 * Classifies based on worst-case (highest density) tag found.
 */
export async function queryLandUseInPolygon(grbPolygon: L.LatLng[]): Promise<LandUseResult> {
  const polyStr = toOverpassPoly(grbPolygon);
  const startTime = Date.now();

  // Build Overpass query
  const query = `
[out:json][timeout:15];
(
  way["landuse"~"residential|commercial|retail"](poly:"${polyStr}");
  node["place"~"town|town_centre|suburb|city_centre|city|village"](poly:"${polyStr}");
  way["landuse"~"industrial|farmyard"](poly:"${polyStr}");
  way["landuse"~"forest|meadow|farmland|grass"](poly:"${polyStr}");
  way["natural"="water"](poly:"${polyStr}");
  node["amenity"~"school|hospital|marketplace"](poly:"${polyStr}");
  way["leisure"~"park|stadium"](poly:"${polyStr}");
  node["amenity"="public_gathering"](poly:"${polyStr}");
);
out tags;
`;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.warn('Overpass API error:', response.status);
      return fallbackResult(Date.now() - startTime);
    }

    const data = await response.json();
    return classifyFromElements(data.elements || [], Date.now() - startTime);
  } catch (err) {
    console.warn('Overpass API fetch failed:', err);
    return fallbackResult(Date.now() - startTime);
  }
}

function classifyFromElements(elements: any[], queryTime: number): LandUseResult {
  const rawTags: string[] = [];
  let hasResidential = false;
  let hasCommercial = false;
  let hasIndustrial = false;
  let hasFarmland = false;
  let hasForest = false;
  let hasGathering = false;

  for (const el of elements) {
    const tags = el.tags || {};
    const landuse = tags.landuse || '';
    const natural = tags.natural || '';
    const place = tags.place || '';
    const amenity = tags.amenity || '';
    const leisure = tags.leisure || '';

    if (landuse) rawTags.push(`landuse=${landuse}`);
    if (natural) rawTags.push(`natural=${natural}`);
    if (place) rawTags.push(`place=${place}`);
    if (amenity) rawTags.push(`amenity=${amenity}`);
    if (leisure) rawTags.push(`leisure=${leisure}`);

    // Gatherings
    if (amenity === 'public_gathering' || amenity === 'marketplace' ||
        leisure === 'stadium' || amenity === 'school' || amenity === 'hospital') {
      hasGathering = true;
    }

    // Populated
    if (['residential', 'commercial', 'retail'].includes(landuse) ||
        ['town', 'town_centre', 'suburb', 'city_centre', 'city', 'village'].includes(place)) {
      hasResidential = true;
    }
    if (['commercial', 'retail'].includes(landuse)) {
      hasCommercial = true;
    }

    // Sparsely
    if (['industrial', 'farmyard'].includes(landuse)) {
      hasIndustrial = true;
    }

    // Controlled/uninhabited
    if (['forest', 'meadow', 'farmland', 'grass'].includes(landuse) || natural === 'water') {
      if (!hasResidential && !hasIndustrial) hasFarmland = true;
      hasForest = true;
    }
  }

  // Worst-case classification
  let detectedClass: PopulationDensityClass;
  if (hasGathering) {
    detectedClass = 'gathering';
  } else if (hasResidential || hasCommercial) {
    detectedClass = 'populated';
  } else if (hasIndustrial) {
    detectedClass = 'sparsely';
  } else if (hasForest || hasFarmland) {
    detectedClass = 'controlled';
  } else {
    // No OSM data found — conservative default
    detectedClass = 'sparsely';
  }

  return {
    detectedClass,
    hasResidential,
    hasCommercial,
    hasIndustrial,
    hasFarmland,
    hasForest,
    hasGathering,
    rawTags: [...new Set(rawTags)],
    queryTime,
  };
}

function fallbackResult(queryTime: number): LandUseResult {
  return {
    detectedClass: 'sparsely',
    hasResidential: false,
    hasCommercial: false,
    hasIndustrial: false,
    hasFarmland: false,
    hasForest: false,
    hasGathering: false,
    rawTags: [],
    queryTime,
  };
}
