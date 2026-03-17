import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MapPin, AlertTriangle, Loader2, ChevronDown, Info, Search, Route, Hexagon, Navigation } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { DroneSpec } from "@/data/droneDatabase";
import { queryWorldPopDensity, PopulationDensityClass, WorldPopResult } from "@/lib/worldPopDensity";

// ── Types ──
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: { city?: string; town?: string; municipality?: string; village?: string; county?: string };
}

function extractMunicipality(addr?: NominatimResult['address']): string {
  if (!addr) return '';
  return addr.municipality || addr.city || addr.town || addr.village || addr.county || '';
}

export type FlightMode = 'route' | 'area';

export interface FlightAreaData {
  polygon: L.LatLng[] | null;
  takeoffPoint: L.LatLng | null;
  landingPoint: L.LatLng | null;
  areaKm2: number;
  diagonalM: number;
  operationType: 'VLOS' | 'EVLOS' | 'BVLOS' | null;
  grbMeters: number;
  cvMeters: number;
  populationDensityClass: PopulationDensityClass;
  airspaceClass: 'uncontrolled_low' | 'uncontrolled_high' | 'class_e' | 'controlled';
  flightDescription: string;
  worldPopResult: WorldPopResult | null;
  densityOverridden: boolean;
  flightMode: FlightMode;
  routeDistanceM: number;
}

interface Props {
  municipality: string;
  municipalityDensity: number;
  drone: DroneSpec | null;
  flightAreaData: FlightAreaData | null;
  maxAltitude: number;
  onUpdate: (data: FlightAreaData) => void;
  onMunicipalitySelect?: (name: string, data: { name: string; address: string; lat: number; lon: number }) => void;
  initialCoords?: { lat: number; lon: number } | null;
}

const DENSITY_COLORS: Record<PopulationDensityClass, string> = {
  controlled: '#22c55e', sparsely: '#eab308', populated: '#f97316', gathering: '#ef4444',
};
const DENSITY_LABELS: Record<PopulationDensityClass, string> = {
  controlled: 'Kontrollert/ubebodd', sparsely: 'Spredt befolket', populated: 'Befolket', gathering: 'Folkemengde',
};

const MUNICIPALITY_COORDS: Record<string, [number, number]> = {
  'Oslo': [59.9139, 10.7522], 'Bergen': [60.3913, 5.3221], 'Trondheim': [63.4305, 10.3951],
  'Stavanger': [58.9700, 5.7331], 'Kristiansand': [58.1467, 7.9956], 'Tromsø': [69.6492, 18.9553],
  'Drammen': [59.7441, 10.2045], 'Bodø': [67.2804, 14.4049], 'Fredrikstad': [59.2181, 10.9298],
  'Sandnes': [58.8527, 5.7352],
};

function offsetPolygon(latlngs: L.LatLng[], meters: number): L.LatLng[] {
  if (latlngs.length < 3 || meters <= 0) return latlngs;
  const center = L.polygon(latlngs).getBounds().getCenter();
  return latlngs.map(ll => {
    const dLat = ll.lat - center.lat;
    const dLng = ll.lng - center.lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist === 0) return ll;
    const currentDistMeters = center.distanceTo(ll);
    const scale = (currentDistMeters + meters) / currentDistMeters;
    return L.latLng(center.lat + dLat * scale, center.lng + dLng * scale);
  });
}

/** Build a corridor polygon from a polyline with a given width in meters */
function corridorFromRoute(points: L.LatLng[], widthMeters: number): L.LatLng[] {
  if (points.length < 2) return [];
  const left: L.LatLng[] = [];
  const right: L.LatLng[] = [];
  const halfW = widthMeters / 2;

  for (let i = 0; i < points.length; i++) {
    let bearing: number;
    if (i === 0) {
      bearing = bearingBetween(points[0], points[1]);
    } else if (i === points.length - 1) {
      bearing = bearingBetween(points[i - 1], points[i]);
    } else {
      const b1 = bearingBetween(points[i - 1], points[i]);
      const b2 = bearingBetween(points[i], points[i + 1]);
      bearing = (b1 + b2) / 2;
    }
    const perpLeft = bearing - 90;
    const perpRight = bearing + 90;
    left.push(offsetPoint(points[i], perpLeft, halfW));
    right.push(offsetPoint(points[i], perpRight, halfW));
  }
  return [...left, ...right.reverse()];
}

function bearingBetween(a: L.LatLng, b: L.LatLng): number {
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x) * 180 / Math.PI;
}

function offsetPoint(ll: L.LatLng, bearingDeg: number, distMeters: number): L.LatLng {
  const R = 6378137;
  const d = distMeters / R;
  const brng = bearingDeg * Math.PI / 180;
  const lat1 = ll.lat * Math.PI / 180;
  const lon1 = ll.lng * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return L.latLng(lat2 * 180 / Math.PI, lon2 * 180 / Math.PI);
}

// ── Nominatim hook ──
function useNominatimSearch(query: string) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=no&format=json&addressdetails=1&limit=5`,
          { signal: ctrl.signal, headers: { 'Accept-Language': 'no', 'User-Agent': 'SORA-DMA-Haiko/1.0' } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
      } catch (e: any) {
        if (e.name !== 'AbortError') setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  return { results, loading };
}

// ── Address Input ──
function AddressInput({ label, icon, value, onChange, onSelect, placeholder }: {
  label: string; icon: React.ReactNode; value: string;
  onChange: (v: string) => void; onSelect: (r: NominatimResult) => void; placeholder: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(!!value);
  const { results, loading } = useNominatimSearch(selected ? '' : query);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-sora-text-dim text-xs font-medium mb-1 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sora-text-dim">{icon}</span>
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-purple animate-spin" />}
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setSelected(false); setOpen(true); }}
          onFocus={() => !selected && results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-sora-surface border border-sora-border text-sora-text text-sm placeholder:text-sora-text-dim focus:outline-none focus:ring-2 focus:ring-sora-purple transition-colors"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-sora-surface border border-sora-border rounded-lg max-h-60 overflow-y-auto shadow-xl z-[999]">
          {results.map(r => (
            <button
              key={r.place_id}
              onClick={() => { setQuery(r.display_name); setSelected(true); setOpen(false); onSelect(r); }}
              className="w-full text-left px-4 py-2.5 text-sm text-sora-text hover:bg-sora-surface-hover transition-colors border-b border-sora-border last:border-b-0 flex items-start gap-2"
            >
              <MapPin className="w-4 h-4 text-sora-purple shrink-0 mt-0.5" strokeWidth={1.5} />
              <span className="leading-tight text-xs">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Corridor width in meters for route mode ──
const ROUTE_CORRIDOR_WIDTH = 100;

// ══════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════
export default function Step2FlightArea({ municipality, municipalityDensity, drone, flightAreaData, maxAltitude, onUpdate, onMunicipalitySelect, initialCoords }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const grbLayerRef = useRef<L.Layer | null>(null);
  const cvLayerRef = useRef<L.Layer | null>(null);
  const densityOverlayRef = useRef<L.Layer | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const corridorLayerRef = useRef<L.Polygon | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  const [flightMode, setFlightMode] = useState<FlightMode>(flightAreaData?.flightMode || 'area');
  const [localData, setLocalData] = useState<FlightAreaData | null>(flightAreaData);
  const [queryingDensity, setQueryingDensity] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [manualRequired, setManualRequired] = useState(false);
  const [highDensityValue, setHighDensityValue] = useState<number | null>(null);

  // Route mode state
  const [takeoffAddress, setTakeoffAddress] = useState('');
  const [landingAddress, setLandingAddress] = useState('');
  const [takeoffCoords, setTakeoffCoords] = useState<L.LatLng | null>(null);
  const [landingCoords, setLandingCoords] = useState<L.LatLng | null>(null);
  const takeoffMarkerRef = useRef<L.Marker | null>(null);
  const landingMarkerRef = useRef<L.Marker | null>(null);

  const charDim = drone?.characteristicDimension ?? 1;
  const grbDistance = charDim * 2;
  const cvDistance = Math.max((maxAltitude || 120) * 0.1, 30);

  // ── Initialize map ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const coords = initialCoords ? [initialCoords.lat, initialCoords.lon] as [number, number]
      : MUNICIPALITY_COORDS[municipality] || [63.4305, 10.3951];
    const map = L.map(mapContainerRef.current).setView(coords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    map.addLayer(drawnItemsRef.current);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [municipality]);

  // ── Toggle draw control based on mode ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Remove existing draw control
    if (drawControlRef.current) { map.removeControl(drawControlRef.current); drawControlRef.current = null; }
    // Clear everything
    clearAllLayers(map);

    if (flightMode === 'area') {
      const drawControl = new L.Control.Draw({
        draw: {
          polygon: { allowIntersection: false, shapeOptions: { color: '#7c3aed', weight: 2, fillOpacity: 0.15 } },
          polyline: false, rectangle: false, circle: false, circlemarker: false, marker: false,
        },
        edit: { featureGroup: drawnItemsRef.current },
      });
      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      const onCreated = (e: any) => {
        drawnItemsRef.current.clearLayers();
        removeBufferLayers(map);
        const layer = e.layer;
        drawnItemsRef.current.addLayer(layer);
        if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[];
          processPolygon(latlngs, map);
        }
      };
      const onEdited = () => {
        const layers: L.Layer[] = [];
        drawnItemsRef.current.eachLayer(l => layers.push(l));
        if (layers.length > 0 && layers[0] instanceof L.Polygon) {
          const latlngs = (layers[0] as L.Polygon).getLatLngs()[0] as L.LatLng[];
          removeBufferLayers(map);
          processPolygon(latlngs, map);
        }
      };
      map.on(L.Draw.Event.CREATED, onCreated);
      map.on(L.Draw.Event.EDITED, onEdited);
      return () => { map.off(L.Draw.Event.CREATED, onCreated); map.off(L.Draw.Event.EDITED, onEdited); };
    }
  }, [flightMode, municipality]);

  // ── Route mode: draw route when both coords are set ──
  useEffect(() => {
    if (flightMode !== 'route' || !takeoffCoords || !landingCoords || !mapRef.current) return;
    const map = mapRef.current;
    drawRoute(map, takeoffCoords, landingCoords);
  }, [takeoffCoords, landingCoords, flightMode, drone, maxAltitude]);

  function clearAllLayers(map: L.Map) {
    drawnItemsRef.current.clearLayers();
    removeBufferLayers(map);
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
    if (corridorLayerRef.current) { map.removeLayer(corridorLayerRef.current); corridorLayerRef.current = null; }
    if (takeoffMarkerRef.current) { map.removeLayer(takeoffMarkerRef.current); takeoffMarkerRef.current = null; }
    if (landingMarkerRef.current) { map.removeLayer(landingMarkerRef.current); landingMarkerRef.current = null; }
    setLocalData(null);
  }

  function removeBufferLayers(map: L.Map) {
    if (grbLayerRef.current) { map.removeLayer(grbLayerRef.current); grbLayerRef.current = null; }
    if (cvLayerRef.current) { map.removeLayer(cvLayerRef.current); cvLayerRef.current = null; }
    if (densityOverlayRef.current) { map.removeLayer(densityOverlayRef.current); densityOverlayRef.current = null; }
  }

  function drawRoute(map: L.Map, from: L.LatLng, to: L.LatLng) {
    // Clear previous route
    if (routeLineRef.current) map.removeLayer(routeLineRef.current);
    if (corridorLayerRef.current) map.removeLayer(corridorLayerRef.current);
    removeBufferLayers(map);
    if (takeoffMarkerRef.current) map.removeLayer(takeoffMarkerRef.current);
    if (landingMarkerRef.current) map.removeLayer(landingMarkerRef.current);

    // Markers
    const mkIcon = (color: string) => L.divIcon({
      className: '', iconSize: [16, 16], iconAnchor: [8, 8],
      html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px ${color}88;"></div>`
    });
    takeoffMarkerRef.current = L.marker(from, { icon: mkIcon('#7c3aed') }).addTo(map).bindTooltip('Avgang', { permanent: true, direction: 'top', className: 'route-tooltip' });
    landingMarkerRef.current = L.marker(to, { icon: mkIcon('#ec4899') }).addTo(map).bindTooltip('Landing', { permanent: true, direction: 'top', className: 'route-tooltip' });

    // Route line
    const line = L.polyline([from, to], { color: '#7c3aed', weight: 3, dashArray: '8,6', opacity: 0.8 }).addTo(map);
    routeLineRef.current = line;

    // Corridor polygon (flight geography)
    const corridorWidth = ROUTE_CORRIDOR_WIDTH;
    const corridorPoly = corridorFromRoute([from, to], corridorWidth);
    if (corridorPoly.length >= 3) {
      const layer = L.polygon(corridorPoly, { color: '#7c3aed', weight: 2, fillOpacity: 0.12, fillColor: '#7c3aed' }).addTo(map);
      corridorLayerRef.current = layer;

      // Draw GRB + CV buffers
      drawBuffers(corridorPoly, map);

      // Fit map to show entire route with padding
      const routeBounds = L.latLngBounds([from, to]);
      map.fitBounds(routeBounds, { padding: [60, 60] });

      // Calculate metrics
      const routeDistanceM = from.distanceTo(to);
      const areaKm2 = (corridorWidth * routeDistanceM) / 1e6;
      const diagonalM = Math.round(routeDistanceM);

      const data: FlightAreaData = {
        polygon: corridorPoly,
        takeoffPoint: from,
        landingPoint: to,
        areaKm2: Math.round(areaKm2 * 1000) / 1000,
        diagonalM,
        operationType: routeDistanceM > 500 ? 'BVLOS' : null,
        grbMeters: Math.round(grbDistance * 10) / 10,
        cvMeters: Math.round(cvDistance),
        populationDensityClass: 'sparsely',
        airspaceClass: 'uncontrolled_low',
        flightDescription: `Rute ${municipality}, ${(routeDistanceM / 1000).toFixed(1)} km`,
        worldPopResult: null,
        densityOverridden: false,
        flightMode: 'route',
        routeDistanceM: Math.round(routeDistanceM),
      };
      setLocalData(data);
      onUpdate(data);

      // Query density
      runDensityQuery(corridorPoly, data);
    }
  }

  const processPolygon = useCallback(async (latlngs: L.LatLng[], map: L.Map) => {
    const polygon = L.polygon(latlngs);
    const bounds = polygon.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const diagonalMeters = ne.distanceTo(sw);
    let area = 0;
    for (let i = 0; i < latlngs.length; i++) {
      const j = (i + 1) % latlngs.length;
      area += (latlngs[j].lng - latlngs[i].lng) * (2 + Math.sin(latlngs[i].lat * Math.PI / 180) + Math.sin(latlngs[j].lat * Math.PI / 180));
    }
    area = Math.abs(area) * 6378137 * 6378137 / 2 * Math.PI / 180 / 1e6;

    drawBuffers(latlngs, map);

    const data: FlightAreaData = {
      polygon: latlngs, takeoffPoint: null, landingPoint: null,
      areaKm2: Math.round(area * 1000) / 1000, diagonalM: Math.round(diagonalMeters),
      operationType: localData?.operationType || null,
      grbMeters: Math.round(grbDistance * 10) / 10, cvMeters: Math.round(cvDistance),
      populationDensityClass: 'sparsely', airspaceClass: 'uncontrolled_low',
      flightDescription: `Flygeområde i ${municipality}, ${area.toFixed(3)} km²`,
      worldPopResult: null, densityOverridden: false, flightMode: 'area', routeDistanceM: 0,
    };
    setLocalData(data);
    setManualRequired(false);
    setHighDensityValue(null);
    onUpdate(data);
    await runDensityQuery(latlngs, data);
  }, [municipality, drone, grbDistance, cvDistance, onUpdate, localData?.operationType]);

  const runDensityQuery = useCallback(async (latlngs: L.LatLng[], baseData?: FlightAreaData) => {
    setQueryingDensity(true);
    setManualRequired(false);
    setHighDensityValue(null);
    try {
      const result = await queryWorldPopDensity(latlngs);
      const current = baseData || localData;
      if (!current) return;
      if (result.queryFailed || (result.density === null && !result.needsManualGathering)) {
        setManualRequired(true);
        const updated: FlightAreaData = { ...current, polygon: latlngs, worldPopResult: result };
        setLocalData(updated); onUpdate(updated); return;
      }
      if (result.needsManualGathering) {
        setHighDensityValue(result.density);
        setManualRequired(true);
        const updated: FlightAreaData = { ...current, polygon: latlngs, worldPopResult: result };
        setLocalData(updated); onUpdate(updated); return;
      }
      const updated: FlightAreaData = {
        ...current, polygon: latlngs,
        populationDensityClass: current.densityOverridden ? current.populationDensityClass : result.detectedClass!,
        worldPopResult: result,
      };
      setLocalData(updated); onUpdate(updated);
      if (mapRef.current) drawDensityOverlay(latlngs, updated.populationDensityClass, mapRef.current);
    } catch { setManualRequired(true); } finally { setQueryingDensity(false); }
  }, [localData, onUpdate]);

  const drawBuffers = (latlngs: L.LatLng[], map: L.Map) => {
    const grbCoords = offsetPolygon(latlngs, grbDistance);
    if (grbCoords.length >= 3) {
      const grbPoly = L.polygon(grbCoords, { color: '#f97316', weight: 2, dashArray: '6,4', fillOpacity: 0.18, fillColor: '#f97316' });
      grbPoly.bindTooltip(`GRB: ${grbDistance.toFixed(1)}m`, { permanent: true, direction: 'center', className: 'map-buffer-label' });
      grbPoly.addTo(map); grbLayerRef.current = grbPoly;
    }
    const cvCoords = offsetPolygon(latlngs, grbDistance + cvDistance);
    if (cvCoords.length >= 3) {
      const cvPoly = L.polygon(cvCoords, { color: '#ec4899', weight: 2, dashArray: '6,4', fillOpacity: 0.12, fillColor: '#ec4899' });
      cvPoly.bindTooltip(`CV: ${cvDistance}m`, { permanent: true, direction: 'center', className: 'map-buffer-label' });
      cvPoly.addTo(map); cvLayerRef.current = cvPoly;
    }
  };

  const drawDensityOverlay = (latlngs: L.LatLng[], densityClass: PopulationDensityClass, map: L.Map) => {
    if (densityOverlayRef.current) map.removeLayer(densityOverlayRef.current);
    const color = DENSITY_COLORS[densityClass];
    const overlay = L.polygon(latlngs, { color, weight: 2, fillOpacity: 0.25, fillColor: color });
    overlay.bindTooltip(`Befolkningstetthet: ${DENSITY_LABELS[densityClass]}`, { permanent: false, direction: 'center' });
    overlay.addTo(map); densityOverlayRef.current = overlay;
  };

  const handleOperationTypeSelect = (type: 'VLOS' | 'EVLOS' | 'BVLOS') => {
    if (!localData) return;
    const updated: FlightAreaData = { ...localData, operationType: type, flightDescription: `${localData.flightDescription}, ${type}` };
    setLocalData(updated); onUpdate(updated);
  };

  const handleDensityOverride = (newClass: PopulationDensityClass) => {
    if (!localData) return;
    const updated: FlightAreaData = { ...localData, populationDensityClass: newClass, densityOverridden: true };
    setLocalData(updated); onUpdate(updated); setOverrideOpen(false); setManualRequired(false);
    if (mapRef.current && localData.polygon) drawDensityOverlay(localData.polygon, newClass, mapRef.current);
  };

  const handleTakeoffSelect = useCallback((r: NominatimResult) => {
    const ll = L.latLng(parseFloat(r.lat), parseFloat(r.lon));
    setTakeoffCoords(ll);
    const municName = extractMunicipality(r.address);
    if (onMunicipalitySelect) onMunicipalitySelect(municName, { name: municName, address: r.display_name, lat: ll.lat, lon: ll.lng });
    if (mapRef.current && !landingCoords) mapRef.current.setView(ll, 14);
  }, [onMunicipalitySelect, landingCoords]);

  const handleLandingSelect = useCallback((r: NominatimResult) => {
    const ll = L.latLng(parseFloat(r.lat), parseFloat(r.lon));
    setLandingCoords(ll);
    if (mapRef.current && !takeoffCoords) mapRef.current.setView(ll, 14);
  }, [takeoffCoords]);

  const handleModeSwitch = (mode: FlightMode) => {
    setFlightMode(mode);
    setTakeoffCoords(null); setLandingCoords(null);
    setTakeoffAddress(''); setLandingAddress('');
    if (mapRef.current) clearAllLayers(mapRef.current);
  };

  // ── RENDER ──
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Flygeområde</h2>
        <p className="text-sora-text-muted text-sm">Velg om dronen skal fly en rute (A→B) eller innenfor et avgrenset område.</p>
      </div>

      {/* Flight mode selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleModeSwitch('route')}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            flightMode === 'route' ? 'border-sora-purple bg-sora-purple/10' : 'border-sora-border hover:border-sora-text-dim bg-sora-surface'
          }`}
        >
          <Route className={`w-6 h-6 shrink-0 ${flightMode === 'route' ? 'text-sora-purple' : 'text-sora-text-dim'}`} strokeWidth={1.5} />
          <div>
            <p className={`font-semibold text-sm ${flightMode === 'route' ? 'text-sora-purple' : 'text-sora-text'}`}>Rute (A → B)</p>
            <p className="text-xs text-sora-text-dim">Fly fra ett sted til et annet</p>
          </div>
        </button>
        <button
          onClick={() => handleModeSwitch('area')}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            flightMode === 'area' ? 'border-sora-purple bg-sora-purple/10' : 'border-sora-border hover:border-sora-text-dim bg-sora-surface'
          }`}
        >
          <Hexagon className={`w-6 h-6 shrink-0 ${flightMode === 'area' ? 'text-sora-purple' : 'text-sora-text-dim'}`} strokeWidth={1.5} />
          <div>
            <p className={`font-semibold text-sm ${flightMode === 'area' ? 'text-sora-purple' : 'text-sora-text'}`}>Område</p>
            <p className="text-xs text-sora-text-dim">Fly innenfor et polygon</p>
          </div>
        </button>
      </div>

      {/* Route mode: address inputs */}
      {flightMode === 'route' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AddressInput
            label="Avgangsadresse"
            icon={<Navigation className="w-4 h-4" strokeWidth={1.5} />}
            value={takeoffAddress}
            onChange={setTakeoffAddress}
            onSelect={handleTakeoffSelect}
            placeholder="Søk avgangssted..."
          />
          <AddressInput
            label="Landingsadresse"
            icon={<MapPin className="w-4 h-4" strokeWidth={1.5} />}
            value={landingAddress}
            onChange={setLandingAddress}
            onSelect={handleLandingSelect}
            placeholder="Søk landingssted..."
          />
        </div>
      )}

      {/* Area mode: instructions */}
      {flightMode === 'area' && !localData?.polygon && (
        <div className="bg-sora-surface border border-sora-border rounded-lg px-4 py-3 text-sm text-sora-text-muted flex items-center gap-2">
          <Hexagon className="w-4 h-4 text-sora-purple shrink-0" strokeWidth={1.5} />
          Bruk polygon-verktøyet på kartet for å tegne inn flygeområdet.
        </div>
      )}

      {/* Route hint */}
      {flightMode === 'route' && !takeoffCoords && (
        <div className="bg-sora-surface border border-sora-border rounded-lg px-4 py-3 text-sm text-sora-text-muted flex items-center gap-2">
          <Route className="w-4 h-4 text-sora-purple shrink-0" strokeWidth={1.5} />
          Skriv inn avgangs- og landingsadresse over for å tegne ruta automatisk.
        </div>
      )}

      {/* Map */}
      <div ref={mapContainerRef} className="w-full h-[450px] rounded-xl border border-sora-border" style={{ position: 'relative', zIndex: 1 }} />

      {/* Density status bar */}
      {localData?.polygon && (
        <div className="bg-sora-light border-l-[3px] border-sora-purple rounded-lg px-4 py-2.5 text-[13px] font-sora text-sora-text space-y-1">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sora-purple shrink-0" strokeWidth={1.5} />
            {queryingDensity ? (
              <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-sora-purple" /> Henter befolkningstetthet fra WorldPop...</span>
            ) : localData.worldPopResult && !localData.worldPopResult.queryFailed && localData.worldPopResult.detectedClass ? (
              <span>Befolkningstetthet: ca. <strong>{Math.round(localData.worldPopResult.density!)} p/km²</strong> → <strong>{DENSITY_LABELS[localData.populationDensityClass]}</strong> (WorldPop 2020){localData.densityOverridden && ' — manuelt overstyrt'}</span>
            ) : manualRequired ? (
              <span className="text-sora-danger">{highDensityValue ? `Høy tetthet (${Math.round(highDensityValue)} p/km²). Velg kategori nedenfor.` : 'Kunne ikke hente data — velg manuelt nedenfor'}</span>
            ) : (
              <span>Befolkningstetthet: <strong>{DENSITY_LABELS[localData.populationDensityClass]}</strong></span>
            )}
          </div>
          <div className="ml-6">
            <a href="https://experience.arcgis.com/experience/b00a6ce43d1943959d21bc957de265f4" target="_blank" rel="noopener noreferrer" className="text-sora-purple hover:underline text-xs">Verifiser mot EASA-kart ↗</a>
          </div>
        </div>
      )}

      {/* VLOS/BVLOS selector */}
      {localData?.polygon && (
        <div className="bg-sora-surface border border-sora-border rounded-xl p-4 space-y-3">
          <p className="text-sora-text font-semibold text-sm">Kan piloten se dronen med egne øyne under hele flyvningen?</p>
          <div className="flex gap-3">
            {([
              { type: 'VLOS' as const, label: 'Ja, VLOS', desc: 'Visuell kontakt hele tiden' },
              { type: 'BVLOS' as const, label: 'Nei, BVLOS', desc: 'Utenfor synsrekkevidde' },
              { type: 'EVLOS' as const, label: 'Delvis, EVLOS', desc: 'Utvidet visuell kontakt' },
            ]).map(opt => (
              <button
                key={opt.type}
                onClick={() => handleOperationTypeSelect(opt.type)}
                className={`flex-1 rounded-lg p-3 text-left border-2 transition-all ${
                  localData.operationType === opt.type ? 'border-sora-purple bg-sora-purple/10' : 'border-sora-border hover:border-sora-text-dim'
                }`}
              >
                <p className={`text-sm font-bold ${localData.operationType === opt.type ? 'text-sora-purple' : 'text-sora-text'}`}>{opt.label}</p>
                <p className="text-xs text-sora-text-dim mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
          {flightMode === 'route' && localData.routeDistanceM > 500 && !localData.operationType && (
            <p className="text-sora-warning text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Ruten er {(localData.routeDistanceM / 1000).toFixed(1)} km lang — sannsynligvis BVLOS.
            </p>
          )}
          <p className="text-sora-text-dim text-xs">
            VLOS/BVLOS bestemmes av pilotens evne til å opprettholde visuell kontakt — ikke av avstand alene.
          </p>
        </div>
      )}

      {/* Airspace note */}
      {localData?.polygon && (
        <div className="bg-sora-surface/50 border border-sora-border rounded-lg px-4 py-2.5 text-xs text-sora-text-dim flex items-start gap-2">
          <Info className="w-4 h-4 text-sora-purple shrink-0 mt-0.5" />
          <span>Luftrom er basert på forenklet klassifisering. Sjekk alltid <a href="https://operatorportal.ninoxdrone.no/" target="_blank" rel="noopener noreferrer" className="text-sora-purple hover:underline">Ninox</a> for faktisk luftromsklasse.</span>
        </div>
      )}

      {/* Manual density selection */}
      {manualRequired && !localData?.densityOverridden && (
        <div className="bg-sora-surface border border-sora-border rounded-lg px-4 py-3">
          <p className="text-sora-text text-sm font-semibold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-sora-warning" strokeWidth={1.5} />
            {highDensityValue ? `Høy tetthet (${Math.round(highDensityValue)} p/km²). Er dette en bosetting eller folkemasse?` : 'Velg tetthetsklasse manuelt:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {(highDensityValue ? (['populated', 'gathering'] as PopulationDensityClass[]) : (Object.keys(DENSITY_LABELS) as PopulationDensityClass[])).map(cls => (
              <button key={cls} onClick={() => handleDensityOverride(cls)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-sora-surface border border-sora-border text-sora-text hover:bg-sora-surface-hover transition-colors">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DENSITY_COLORS[cls] }} />
                {DENSITY_LABELS[cls]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      {localData && (
        <div className="space-y-3">
          {/* Density banner */}
          <div className="rounded-lg px-4 py-3 border flex items-center justify-between" style={{ borderColor: DENSITY_COLORS[localData.populationDensityClass] + '66', backgroundColor: DENSITY_COLORS[localData.populationDensityClass] + '15' }}>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: DENSITY_COLORS[localData.populationDensityClass] }} />
              <div>
                <p className="text-sora-text font-semibold text-sm">Befolkningstetthet: {DENSITY_LABELS[localData.populationDensityClass]}</p>
                <p className="text-sora-text-dim text-xs">
                  {queryingDensity ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Henter data...</span>
                    : localData.worldPopResult?.density != null ? <>ca. {Math.round(localData.worldPopResult.density)} p/km² · WorldPop 2020</> : 'Tegn område for å analysere'}
                </p>
              </div>
            </div>
            <div className="relative">
              <button onClick={() => setOverrideOpen(!overrideOpen)} className="text-xs text-sora-text-muted border border-sora-border rounded-md px-3 py-1.5 hover:bg-sora-surface-hover transition-colors flex items-center gap-1">
                Overstyr <ChevronDown className="w-3 h-3" />
              </button>
              {overrideOpen && (
                <div className="absolute right-0 top-full mt-1 bg-sora-surface border border-sora-border rounded-lg shadow-lg z-50 w-64">
                  {(Object.keys(DENSITY_LABELS) as PopulationDensityClass[]).map(cls => (
                    <button key={cls} onClick={() => handleDensityOverride(cls)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-sora-surface-hover transition-colors ${localData.populationDensityClass === cls ? 'text-sora-text font-semibold' : 'text-sora-text-muted'}`}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DENSITY_COLORS[cls] }} />{DENSITY_LABELS[cls]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metric grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {flightMode === 'route' && <MetricCard label="Ruteavstand" value={`${(localData.routeDistanceM / 1000).toFixed(1)} km`} />}
            <MetricCard label="Areal" value={`${localData.areaKm2} km²`} />
            <MetricCard label="Type" value={localData.operationType} highlight={localData.operationType === 'BVLOS'} warn={localData.operationType === 'BVLOS'} />
            <MetricCard label="GRB" value={`${localData.grbMeters} m`} sub={drone ? `(${charDim}m × 2)` : undefined} />
            <MetricCard label="CV" value={`${localData.cvMeters} m`} sub={`max(${maxAltitude}×0.1, 30)`} />
            <MetricCard label="Tetthetsklasse" value={DENSITY_LABELS[localData.populationDensityClass]} color={DENSITY_COLORS[localData.populationDensityClass]} />
            <MetricCard label="Luftrom" value="Ukontrollert G" />
            <MetricCard label="Maks høyde" value={`${maxAltitude} m AGL`} />
          </div>
        </div>
      )}

      <style>{`
        .route-tooltip { background: rgba(15,15,23,0.85) !important; border: 1px solid rgba(124,58,237,0.5) !important; color: #e5e7eb !important; font-size: 11px !important; padding: 2px 8px !important; border-radius: 6px !important; }
        .route-tooltip::before { display: none !important; }
        .map-buffer-label { background: rgba(15,15,23,0.8) !important; border: 1px solid rgba(42,42,62,0.8) !important; color: #e5e7eb !important; font-size: 10px !important; padding: 2px 6px !important; border-radius: 4px !important; }
        .map-buffer-label::before { display: none !important; }
      `}</style>
    </div>
  );
}

function MetricCard({ label, value, sub, highlight, warn, color }: { label: string; value: string | null; sub?: string; highlight?: boolean; warn?: boolean; color?: string }) {
  return (
    <div className={`bg-sora-surface border rounded-lg p-3 ${warn ? 'border-red-500/50' : 'border-sora-border'}`}>
      <p className="text-sora-text-dim text-xs">{label}</p>
      <p className={`font-semibold text-sm ${warn ? 'text-red-400' : highlight ? 'text-sora-purple' : 'text-sora-text'}`} style={color ? { color } : undefined}>
        {value || '—'}
      </p>
      {sub && <p className="text-sora-text-dim text-xs">{sub}</p>}
    </div>
  );
}
