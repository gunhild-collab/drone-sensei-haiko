import L from "leaflet";

export type PopulationDensityClass = 'controlled' | 'sparsely' | 'populated' | 'gathering';

export interface WorldPopResult {
  density: number | null;
  detectedClass: PopulationDensityClass | null;
  needsManualGathering: boolean;
  queryTime: number;
  queryFailed: boolean;
}

/**
 * Query WorldPop ArcGIS ImageServer for population density at polygon center.
 */
export async function queryWorldPopDensity(polygon: L.LatLng[]): Promise<WorldPopResult> {
  const startTime = Date.now();
  const bounds = L.polygon(polygon).getBounds();
  const center = bounds.getCenter();
  const lng = center.lng.toFixed(6);
  const lat = center.lat.toFixed(6);

  const url = `https://worldpop.arcgis.com/arcgis/rest/services/WorldPop_Population_Density_1km/ImageServer/identify?geometry=${lng},${lat}&geometryType=esriGeometryPoint&returnGeometry=false&returnCatalogItems=false&f=json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn('WorldPop API error:', res.status);
      return failedResult(Date.now() - startTime);
    }

    const data = await res.json();
    const density = parseFloat(data.value);
    const qt = Date.now() - startTime;

    if (isNaN(density) || data.value === null || data.value === 'NoData') {
      return { density: null, detectedClass: null, needsManualGathering: false, queryTime: qt, queryFailed: false };
    }

    let detectedClass: PopulationDensityClass | null;
    let needsManualGathering = false;

    if (density < 50) {
      detectedClass = 'controlled';
    } else if (density < 400) {
      detectedClass = 'sparsely';
    } else if (density < 3000) {
      detectedClass = 'populated';
    } else {
      // Very high density — can't distinguish permanent vs gathering
      detectedClass = null;
      needsManualGathering = true;
    }

    return { density, detectedClass, needsManualGathering, queryTime: qt, queryFailed: false };
  } catch (err) {
    console.warn('WorldPop fetch failed:', err);
    return failedResult(Date.now() - startTime);
  }
}

function failedResult(queryTime: number): WorldPopResult {
  return { density: null, detectedClass: null, needsManualGathering: false, queryTime, queryFailed: true };
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
