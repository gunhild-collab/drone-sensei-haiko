import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Maximize2, AlertTriangle } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { DroneSpec } from "@/data/droneDatabase";

export interface FlightAreaData {
  polygon: L.LatLng[] | null;
  takeoffPoint: L.LatLng | null;
  landingPoint: L.LatLng | null;
  areaKm2: number;
  diagonalM: number;
  operationType: 'VLOS' | 'BVLOS';
  grbMeters: number;
  cvMeters: number;
  populationDensityClass: 'controlled' | 'sparsely' | 'populated' | 'gathering';
  airspaceClass: 'uncontrolled_low' | 'uncontrolled_high' | 'class_e' | 'controlled';
  flightDescription: string;
}

interface Props {
  municipality: string;
  municipalityDensity: number;
  drone: DroneSpec | null;
  flightAreaData: FlightAreaData | null;
  maxAltitude: number;
  onUpdate: (data: FlightAreaData) => void;
}

function classifyDensityFromValue(d: number): FlightAreaData['populationDensityClass'] {
  if (d < 20) return 'controlled';
  if (d < 100) return 'sparsely';
  if (d < 500) return 'populated';
  return 'gathering';
}

const MUNICIPALITY_COORDS: Record<string, [number, number]> = {
  'Oslo': [59.9139, 10.7522],
  'Bergen': [60.3913, 5.3221],
  'Trondheim': [63.4305, 10.3951],
  'Stavanger': [58.9700, 5.7331],
  'Kristiansand': [58.1467, 7.9956],
  'Tromsø': [69.6492, 18.9553],
  'Drammen': [59.7441, 10.2045],
  'Bodø': [67.2804, 14.4049],
  'Fredrikstad': [59.2181, 10.9298],
  'Sandnes': [58.8527, 5.7352],
};

export default function Step2FlightArea({ municipality, municipalityDensity, drone, flightAreaData, maxAltitude, onUpdate }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const grbLayerRef = useRef<L.Layer | null>(null);
  const cvLayerRef = useRef<L.Layer | null>(null);
  const [placingPin, setPlacingPin] = useState<'takeoff' | 'landing' | null>(null);
  const takeoffMarkerRef = useRef<L.Marker | null>(null);
  const landingMarkerRef = useRef<L.Marker | null>(null);
  const [localData, setLocalData] = useState<FlightAreaData | null>(flightAreaData);

  const charDim = drone?.characteristicDimension ?? 1;
  const grbDistance = charDim * 2;
  const cvDistance = Math.max((maxAltitude || 120) * 0.1, 30);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const coords = MUNICIPALITY_COORDS[municipality] || [63.4305, 10.3951];
    const map = L.map(mapContainerRef.current).setView(coords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    map.addLayer(drawnItemsRef.current);

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { allowIntersection: false, shapeOptions: { color: '#7c3aed', weight: 2, fillOpacity: 0.15 } },
        polyline: false, rectangle: false, circle: false, circlemarker: false, marker: false,
      },
      edit: { featureGroup: drawnItemsRef.current },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e: any) => {
      drawnItemsRef.current.clearLayers();
      if (grbLayerRef.current) map.removeLayer(grbLayerRef.current);
      if (cvLayerRef.current) map.removeLayer(cvLayerRef.current);

      const layer = e.layer;
      drawnItemsRef.current.addLayer(layer);

      if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        processPolygon(latlngs, map);
      }
    });

    // Click handler for pins
    map.on('click', (e: L.LeafletMouseEvent) => {
      // Handled via state
    });

    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, [municipality]);

  // Handle pin placement clicks
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handler = (e: L.LeafletMouseEvent) => {
      if (placingPin === 'takeoff') {
        if (takeoffMarkerRef.current) map.removeLayer(takeoffMarkerRef.current);
        const marker = L.marker(e.latlng, {
          icon: L.divIcon({ className: '', html: '<div style="background:#7c3aed;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })
        }).addTo(map);
        takeoffMarkerRef.current = marker;
        setPlacingPin(null);
        updateFlightData();
      } else if (placingPin === 'landing') {
        if (landingMarkerRef.current) map.removeLayer(landingMarkerRef.current);
        const marker = L.marker(e.latlng, {
          icon: L.divIcon({ className: '', html: '<div style="background:#ec4899;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })
        }).addTo(map);
        landingMarkerRef.current = marker;
        setPlacingPin(null);
        updateFlightData();
      }
    };

    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [placingPin]);

  // Redraw buffers when drone changes
  useEffect(() => {
    if (!mapRef.current || !localData?.polygon) return;
    const map = mapRef.current;
    if (grbLayerRef.current) map.removeLayer(grbLayerRef.current);
    if (cvLayerRef.current) map.removeLayer(cvLayerRef.current);
    drawBuffers(localData.polygon, map);
  }, [drone, maxAltitude]);

  const processPolygon = useCallback((latlngs: L.LatLng[], map: L.Map) => {
    const polygon = L.polygon(latlngs);
    const bounds = polygon.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const diagonal = ne.distanceTo(sw);

    // Calculate area using spherical excess approximation
    let area = 0;
    for (let i = 0; i < latlngs.length; i++) {
      const j = (i + 1) % latlngs.length;
      area += (latlngs[j].lng - latlngs[i].lng) * (2 + Math.sin(latlngs[i].lat * Math.PI / 180) + Math.sin(latlngs[j].lat * Math.PI / 180));
    }
    area = Math.abs(area) * 6378137 * 6378137 / 2 * Math.PI / 180 / 1e6;

    const opType = (diagonal > 1000 && (drone?.supportsBVLOS ?? false)) ? 'BVLOS' : 'VLOS';
    const densClass = classifyDensityFromValue(municipalityDensity);

    drawBuffers(latlngs, map);

    const data: FlightAreaData = {
      polygon: latlngs,
      takeoffPoint: takeoffMarkerRef.current?.getLatLng() || null,
      landingPoint: landingMarkerRef.current?.getLatLng() || null,
      areaKm2: Math.round(area * 1000) / 1000,
      diagonalM: Math.round(diagonal),
      operationType: opType,
      grbMeters: Math.round(grbDistance * 10) / 10,
      cvMeters: Math.round(cvDistance),
      populationDensityClass: densClass,
      airspaceClass: 'uncontrolled_low',
      flightDescription: `Flygeområde i ${municipality}, ${area.toFixed(3)} km², ${opType}`,
    };
    setLocalData(data);
    onUpdate(data);
  }, [municipality, municipalityDensity, drone, grbDistance, cvDistance, onUpdate]);

  const drawBuffers = (latlngs: L.LatLng[], map: L.Map) => {
    // GRB buffer (inner)
    try {
      const grbCoords = offsetPolygon(latlngs, grbDistance);
      const grbPoly = L.polygon(grbCoords, { color: '#ec4899', weight: 1, dashArray: '5,5', fillOpacity: 0.05, fillColor: '#ec4899' });
      grbPoly.bindTooltip(`GRB: ${grbDistance.toFixed(1)}m`, { permanent: false });
      grbPoly.addTo(map);
      grbLayerRef.current = grbPoly;
    } catch {}

    // CV buffer (outer)
    try {
      const cvCoords = offsetPolygon(latlngs, grbDistance + cvDistance);
      const cvPoly = L.polygon(cvCoords, { color: '#f59e0b', weight: 1, dashArray: '10,5', fillOpacity: 0.03, fillColor: '#f59e0b' });
      cvPoly.bindTooltip(`CV: ${cvDistance}m`, { permanent: false });
      cvPoly.addTo(map);
      cvLayerRef.current = cvPoly;
    } catch {}
  };

  const updateFlightData = () => {
    if (localData) {
      const updated = {
        ...localData,
        takeoffPoint: takeoffMarkerRef.current?.getLatLng() || null,
        landingPoint: landingMarkerRef.current?.getLatLng() || null,
      };
      setLocalData(updated);
      onUpdate(updated);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Tegn flygeområde</h2>
        <p className="text-sora-text-muted text-sm">Tegn et polygon over ditt flygeområde. Plasser avgangs- og landingspunkt.</p>
      </div>

      {/* Pin buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setPlacingPin('takeoff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${placingPin === 'takeoff' ? 'bg-sora-purple text-sora-text' : 'bg-sora-surface border border-sora-border text-sora-text-muted hover:bg-sora-surface-hover'}`}
        >
          <MapPin className="w-4 h-4" /> Avgang
        </button>
        <button
          onClick={() => setPlacingPin('landing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${placingPin === 'landing' ? 'bg-sora-pink text-sora-text' : 'bg-sora-surface border border-sora-border text-sora-text-muted hover:bg-sora-surface-hover'}`}
        >
          <MapPin className="w-4 h-4" /> Landing
        </button>
      </div>

      {placingPin && (
        <div className="bg-sora-purple/10 border border-sora-purple/30 rounded-lg px-4 py-2 text-sm text-sora-purple flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Klikk på kartet for å plassere {placingPin === 'takeoff' ? 'avgangspunkt' : 'landingspunkt'}
        </div>
      )}

      {/* Map */}
      <div ref={mapContainerRef} className="w-full h-[450px] rounded-xl border border-sora-border overflow-hidden" />

      {/* Info panel */}
      {localData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Areal" value={`${localData.areaKm2} km²`} />
          <MetricCard label="Diagonal" value={`${localData.diagonalM} m`} />
          <MetricCard label="Type" value={localData.operationType} highlight />
          <MetricCard label="GRB" value={`${localData.grbMeters} m`} sub={drone ? `(${charDim}m × 2)` : 'Velg drone først'} />
          <MetricCard label="CV" value={`${localData.cvMeters} m`} sub={`max(${maxAltitude}×0.1, 30)`} />
          <MetricCard label="Tetthetsklasse" value={densityLabel(localData.populationDensityClass)} />
          <MetricCard label="Luftrom" value="Ukontrollert G" />
          <MetricCard label="Maks høyde" value={`${maxAltitude} m AGL`} />
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="bg-sora-surface border border-sora-border rounded-lg p-3">
      <p className="text-sora-text-dim text-xs">{label}</p>
      <p className={`font-semibold text-sm ${highlight ? 'text-sora-purple' : 'text-sora-text'}`}>{value}</p>
      {sub && <p className="text-sora-text-dim text-xs">{sub}</p>}
    </div>
  );
}

function densityLabel(d: string): string {
  return { controlled: 'Kontrollert', sparsely: 'Spredt', populated: 'Befolket', gathering: 'Folkemengde' }[d] || d;
}

// Simple polygon offset (approximate buffer using bearing expansion)
function offsetPolygon(latlngs: L.LatLng[], meters: number): L.LatLng[] {
  const center = L.polygon(latlngs).getBounds().getCenter();
  return latlngs.map(ll => {
    const bearing = Math.atan2(ll.lng - center.lng, ll.lat - center.lat);
    const dLat = (meters / 111320) * Math.cos(bearing);
    const dLng = (meters / (111320 * Math.cos(ll.lat * Math.PI / 180))) * Math.sin(bearing);
    return L.latLng(ll.lat + dLat, ll.lng + dLng);
  });
}
