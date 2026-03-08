import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DroneSpec } from "@/data/droneDatabase";

interface FlightAreaData {
  areaKm2: number;
  polygonCoords: [number, number][];
  takeoffPoint: [number, number] | null;
  landingPoint: [number, number] | null;
  populationDensityClass: 'controlled' | 'sparsely' | 'populated' | 'gathering';
  airspaceClass: 'uncontrolled_low' | 'uncontrolled_high' | 'class_e' | 'controlled';
  operationType: 'VLOS' | 'BVLOS';
  flightDescription: string;
}

interface Props {
  municipality: string;
  municipalityDensity: number;
  drone: DroneSpec | null;
  flightAreaData: FlightAreaData | null;
  onUpdate: (data: FlightAreaData) => void;
}

// Simplified Norwegian airspace zones (indicative)
const CONTROLLED_AIRSPACE_CENTERS: { name: string; lat: number; lng: number; radiusKm: number }[] = [
  { name: 'Oslo/Gardermoen', lat: 60.197, lng: 11.100, radiusKm: 15 },
  { name: 'Bergen/Flesland', lat: 60.293, lng: 5.218, radiusKm: 12 },
  { name: 'Trondheim/Værnes', lat: 63.458, lng: 10.924, radiusKm: 12 },
  { name: 'Stavanger/Sola', lat: 58.877, lng: 5.638, radiusKm: 12 },
  { name: 'Tromsø/Langnes', lat: 69.683, lng: 18.919, radiusKm: 10 },
  { name: 'Bodø', lat: 67.269, lng: 14.365, radiusKm: 10 },
];

function checkAirspace(lat: number, lng: number): 'uncontrolled_low' | 'controlled' {
  for (const zone of CONTROLLED_AIRSPACE_CENTERS) {
    const dist = Math.sqrt(Math.pow(lat - zone.lat, 2) + Math.pow(lng - zone.lng, 2)) * 111;
    if (dist < zone.radiusKm) return 'controlled';
  }
  return 'uncontrolled_low';
}

// Municipality center coordinates (simplified)
const MUNICIPALITY_COORDS: Record<string, [number, number]> = {
  "Oslo": [59.91, 10.75], "Bergen": [60.39, 5.32], "Trondheim": [63.43, 10.39],
  "Stavanger": [58.97, 5.73], "Tromsø": [69.65, 18.96], "Bodø": [67.28, 14.40],
  "Verdal": [63.79, 11.48], "Kristiansand": [58.15, 8.00], "Drammen": [59.74, 10.20],
  "Fredrikstad": [59.22, 10.93], "Ålesund": [62.47, 6.15], "Hamar": [60.79, 11.07],
  "Molde": [62.74, 7.16], "Alta": [69.97, 23.27], "Lillehammer": [61.12, 10.47],
  "Narvik": [68.43, 17.43], "Hammerfest": [70.66, 23.68],
};

function getMunicipalityCenter(name: string): [number, number] {
  return MUNICIPALITY_COORDS[name] || [63.43, 10.39]; // Default Trondheim
}

export default function NewStep3FlightArea({ municipality, municipalityDensity, drone, flightAreaData, onUpdate }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const takeoffMarkerRef = useRef<L.Marker | null>(null);
  const landingMarkerRef = useRef<L.Marker | null>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<L.LatLng[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [mode, setMode] = useState<'polygon' | 'takeoff' | 'landing' | null>(null);
  const [hasPolygon, setHasPolygon] = useState(false);
  const [hasTakeoff, setHasTakeoff] = useState(false);
  const [hasLanding, setHasLanding] = useState(false);
  const [localData, setLocalData] = useState<Partial<FlightAreaData>>({});

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const recalculate = useCallback((polygon: L.Polygon, takeoff: L.LatLng | null, landing: L.LatLng | null) => {
    const latlngs = (polygon.getLatLngs()[0] as L.LatLng[]);
    const coords: [number, number][] = latlngs.map(ll => [ll.lat, ll.lng]);

    // Calculate area
    const d2r = Math.PI / 180;
    let area = 0;
    for (let i = 0; i < latlngs.length; i++) {
      const p1 = latlngs[i];
      const p2 = latlngs[(i + 1) % latlngs.length];
      area += (p2.lng - p1.lng) * d2r * (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
    }
    const areaM2 = Math.abs(area * 6378137 * 6378137 / 2);
    const areaKm2 = areaM2 / 1_000_000;

    // Check if polygon exceeds VLOS threshold (500m across)
    const bounds = polygon.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const diagM = sw.distanceTo(ne);
    const isVLOS = diagM <= 1000 && (!drone || !drone.supportsBVLOS || diagM <= 1000);
    const operationType = diagM > 1000 ? 'BVLOS' as const : 'VLOS' as const;

    // Determine airspace
    const center = bounds.getCenter();
    const airspaceClass = checkAirspace(center.lat, center.lng);

    // Population density from municipality data
    const densityClass = municipalityDensity < 150 ? 'sparsely' as const : 'populated' as const;

    const data: FlightAreaData = {
      areaKm2,
      polygonCoords: coords,
      takeoffPoint: takeoff ? [takeoff.lat, takeoff.lng] : null,
      landingPoint: landing ? [landing.lat, landing.lng] : null,
      populationDensityClass: densityClass,
      airspaceClass,
      operationType,
      flightDescription: `${areaKm2 < 0.01 ? Math.round(areaM2) + ' m²' : areaKm2.toFixed(3) + ' km²'} polygon i ${municipality}`,
    };

    setLocalData(data);
    onUpdate(data);
  }, [municipality, municipalityDensity, drone, onUpdate]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const center = getMunicipalityCenter(municipality);
    const map = L.map(mapRef.current, { center, zoom: 14 });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    const onClick = (e: L.LeafletMouseEvent) => {
      const currentMode = modeRef.current;
      if (!currentMode) return;

      if (currentMode === 'polygon') {
        pointsRef.current.push(e.latlng);
        if (polylineRef.current) map.removeLayer(polylineRef.current);
        polylineRef.current = L.polyline(pointsRef.current, { color: '#7c3aed', weight: 2, dashArray: '6 4' }).addTo(map);
      } else if (currentMode === 'takeoff') {
        if (takeoffMarkerRef.current) map.removeLayer(takeoffMarkerRef.current);
        takeoffMarkerRef.current = L.marker(e.latlng, {
          icon: L.divIcon({ className: '', html: '<div style="width:24px;height:24px;background:#7c3aed;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>' })
        }).addTo(map).bindTooltip('Takeoff', { permanent: true, direction: 'top', className: 'volume-tooltip' });
        setHasTakeoff(true);
        setMode(null);
        map.getContainer().style.cursor = '';
        if (polygonRef.current) {
          recalculate(polygonRef.current, e.latlng, landingMarkerRef.current?.getLatLng() || null);
        }
      } else if (currentMode === 'landing') {
        if (landingMarkerRef.current) map.removeLayer(landingMarkerRef.current);
        landingMarkerRef.current = L.marker(e.latlng, {
          icon: L.divIcon({ className: '', html: '<div style="width:24px;height:24px;background:#ec4899;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>' })
        }).addTo(map).bindTooltip('Landing', { permanent: true, direction: 'top', className: 'volume-tooltip' });
        setHasLanding(true);
        setMode(null);
        map.getContainer().style.cursor = '';
        if (polygonRef.current) {
          recalculate(polygonRef.current, takeoffMarkerRef.current?.getLatLng() || null, e.latlng);
        }
      }
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      const currentMode = modeRef.current;
      if (currentMode !== 'polygon' || pointsRef.current.length < 3) return;
      e.originalEvent.preventDefault();

      if (polylineRef.current) map.removeLayer(polylineRef.current);
      if (polygonRef.current) map.removeLayer(polygonRef.current);

      polygonRef.current = L.polygon(pointsRef.current, {
        color: '#7c3aed',
        fillColor: '#7c3aed',
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map);

      setHasPolygon(true);
      setMode(null);
      map.getContainer().style.cursor = '';
      pointsRef.current = [];

      recalculate(
        polygonRef.current,
        takeoffMarkerRef.current?.getLatLng() || null,
        landingMarkerRef.current?.getLatLng() || null
      );
    };

    map.on('click', onClick);
    map.on('dblclick', onDblClick);

    return () => {
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [municipality, recalculate]);

  const activateMode = (m: typeof mode) => {
    setMode(m);
    if (m === 'polygon') {
      pointsRef.current = [];
      if (polylineRef.current && mapInstanceRef.current) mapInstanceRef.current.removeLayer(polylineRef.current);
      if (polygonRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(polygonRef.current);
        polygonRef.current = null;
        setHasPolygon(false);
      }
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getContainer().style.cursor = m ? 'crosshair' : '';
    }
  };

  const airspaceLabel = localData.airspaceClass === 'controlled' ? '⚠️ Kontrollert luftrom' : '✅ Ukontrollert (Klasse G)';
  const opTypeLabel = localData.operationType === 'BVLOS' ? '🔴 BVLOS' : '🟢 VLOS';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Velg flygeområde</h2>
        <p className="text-gray-400 text-sm">Tegn flygeområdet som polygon, og marker takeoff- og landingspunkt.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => activateMode('polygon')}
          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            mode === 'polygon'
              ? 'border-[#7c3aed] bg-[#7c3aed]/20 text-[#7c3aed] ring-2 ring-[#7c3aed]/30'
              : hasPolygon
              ? 'border-[#7c3aed]/50 bg-[#7c3aed]/10 text-[#7c3aed]'
              : 'border-[#2a2a3e] bg-[#0f0f17] text-gray-400 hover:text-white'
          }`}
        >
          {mode === 'polygon' ? '📍 Klikk for å tegne...' : hasPolygon ? '✓ Flygeområde' : '📐 Tegn flygeområde'}
        </button>
        <button
          onClick={() => activateMode('takeoff')}
          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            mode === 'takeoff'
              ? 'border-[#7c3aed] bg-[#7c3aed]/20 text-[#7c3aed] ring-2 ring-[#7c3aed]/30'
              : hasTakeoff
              ? 'border-[#7c3aed]/50 bg-[#7c3aed]/10 text-[#7c3aed]'
              : 'border-[#2a2a3e] bg-[#0f0f17] text-gray-400 hover:text-white'
          }`}
        >
          {hasTakeoff ? '✓ Takeoff-punkt' : '🛫 Marker takeoff'}
        </button>
        <button
          onClick={() => activateMode('landing')}
          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            mode === 'landing'
              ? 'border-[#ec4899] bg-[#ec4899]/20 text-[#ec4899] ring-2 ring-[#ec4899]/30'
              : hasLanding
              ? 'border-[#ec4899]/50 bg-[#ec4899]/10 text-[#ec4899]'
              : 'border-[#2a2a3e] bg-[#0f0f17] text-gray-400 hover:text-white'
          }`}
        >
          {hasLanding ? '✓ Landingspunkt' : '🛬 Marker landing'}
        </button>
      </div>

      {mode === 'polygon' && (
        <p className="text-gray-400 text-xs">Klikk for å legge til punkter. <strong>Dobbeltklikk</strong> for å fullføre polygon.</p>
      )}

      {/* Map */}
      <div ref={mapRef} className="w-full rounded-xl border border-[#2a2a3e] overflow-hidden" style={{ height: 420 }} />

      {/* Auto-calculated results */}
      {hasPolygon && localData.areaKm2 !== undefined && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a3e] space-y-3">
          <p className="text-gray-400 text-xs font-semibold">📊 Automatisk beregnet:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Areal</p>
              <p className="text-white font-bold">
                {localData.areaKm2! < 0.01 ? `${Math.round(localData.areaKm2! * 1_000_000)} m²` : `${localData.areaKm2!.toFixed(3)} km²`}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Befolkningstetthet</p>
              <p className={`font-bold ${municipalityDensity < 150 ? 'text-blue-400' : 'text-yellow-400'}`}>
                {municipalityDensity < 150 ? 'Tynt befolket' : 'Befolket'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Luftrom</p>
              <p className="text-white font-bold text-xs">{airspaceLabel}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Flytype</p>
              <p className="text-white font-bold text-xs">{opTypeLabel}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .volume-tooltip {
          background: rgba(15,15,23,0.9) !important;
          border: 1px solid rgba(42,42,62,0.8) !important;
          color: #e5e7eb !important;
          font-size: 11px !important;
          padding: 3px 8px !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .volume-tooltip::before { display: none !important; }
      `}</style>
    </div>
  );
}

export type { FlightAreaData };
