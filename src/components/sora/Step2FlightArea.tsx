import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, AlertTriangle, Loader2, ChevronDown, Info, Search } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { DroneSpec } from "@/data/droneDatabase";
import { queryLandUseInPolygon, expandPolygonByGrb, PopulationDensityClass, LandUseResult } from "@/lib/overpassLandUse";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    municipality?: string;
    village?: string;
    county?: string;
  };
}

function extractMunicipality(addr?: NominatimResult['address']): string {
  if (!addr) return '';
  return addr.municipality || addr.city || addr.town || addr.village || addr.county || '';
}
import "leaflet-draw/dist/leaflet.draw.css";
import { DroneSpec } from "@/data/droneDatabase";
import { queryLandUseInPolygon, expandPolygonByGrb, PopulationDensityClass, LandUseResult } from "@/lib/overpassLandUse";

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
  landUseResult: LandUseResult | null;
  densityOverridden: boolean;
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
  controlled: '#22c55e',
  sparsely: '#eab308',
  populated: '#f97316',
  gathering: '#ef4444',
};

const DENSITY_LABELS: Record<PopulationDensityClass, string> = {
  controlled: 'Kontrollert/ubebodd',
  sparsely: 'Spredt befolket',
  populated: 'Befolket',
  gathering: 'Folkemengde',
};

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
  'Nes': [60.1225, 11.4645],
  'Årnes': [60.1225, 11.4645],
};

/**
 * Offset polygon outward from centroid. Uses proper per-vertex expansion.
 */
function offsetPolygon(latlngs: L.LatLng[], meters: number): L.LatLng[] {
  if (latlngs.length < 3 || meters <= 0) return latlngs;
  const center = L.polygon(latlngs).getBounds().getCenter();
  return latlngs.map(ll => {
    const dLat = ll.lat - center.lat;
    const dLng = ll.lng - center.lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist === 0) return ll;
    // Scale factor: move each vertex outward by `meters` in real distance
    const currentDistMeters = center.distanceTo(ll);
    const scale = (currentDistMeters + meters) / currentDistMeters;
    return L.latLng(
      center.lat + dLat * scale,
      center.lng + dLng * scale
    );
  });
}

export default function Step2FlightArea({ municipality, municipalityDensity, drone, flightAreaData, maxAltitude, onUpdate }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const grbLayerRef = useRef<L.Layer | null>(null);
  const cvLayerRef = useRef<L.Layer | null>(null);
  const densityOverlayRef = useRef<L.Layer | null>(null);
  const [placingPin, setPlacingPin] = useState<'takeoff' | 'landing' | null>(null);
  const takeoffMarkerRef = useRef<L.Marker | null>(null);
  const landingMarkerRef = useRef<L.Marker | null>(null);
  const [localData, setLocalData] = useState<FlightAreaData | null>(flightAreaData);
  const [queryingLandUse, setQueryingLandUse] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [manualRequired, setManualRequired] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState('');

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
      removeBufferLayers(map);

      const layer = e.layer;
      drawnItemsRef.current.addLayer(layer);

      if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        processPolygon(latlngs, map);
      }
    });

    // Also handle edits
    map.on(L.Draw.Event.EDITED, () => {
      const layers: L.Layer[] = [];
      drawnItemsRef.current.eachLayer(l => layers.push(l));
      if (layers.length > 0 && layers[0] instanceof L.Polygon) {
        const latlngs = (layers[0] as L.Polygon).getLatLngs()[0] as L.LatLng[];
        removeBufferLayers(map);
        processPolygon(latlngs, map);
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [municipality]);

  function removeBufferLayers(map: L.Map) {
    if (grbLayerRef.current) { map.removeLayer(grbLayerRef.current); grbLayerRef.current = null; }
    if (cvLayerRef.current) { map.removeLayer(cvLayerRef.current); cvLayerRef.current = null; }
    if (densityOverlayRef.current) { map.removeLayer(densityOverlayRef.current); densityOverlayRef.current = null; }
  }

  // Handle pin placement
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

  // Redraw buffers when drone changes (GRB depends on drone dimension)
  useEffect(() => {
    if (!mapRef.current || !localData?.polygon) return;
    const map = mapRef.current;
    removeBufferLayers(map);
    drawBuffers(localData.polygon, map);
    // Re-query land use with updated GRB
    runLandUseQuery(localData.polygon);
  }, [drone, maxAltitude]);

  const processPolygon = useCallback(async (latlngs: L.LatLng[], map: L.Map) => {
    const polygon = L.polygon(latlngs);
    const bounds = polygon.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const diagonalMeters = ne.distanceTo(sw);

    // Calculate area
    let area = 0;
    for (let i = 0; i < latlngs.length; i++) {
      const j = (i + 1) % latlngs.length;
      area += (latlngs[j].lng - latlngs[i].lng) * (2 + Math.sin(latlngs[i].lat * Math.PI / 180) + Math.sin(latlngs[j].lat * Math.PI / 180));
    }
    area = Math.abs(area) * 6378137 * 6378137 / 2 * Math.PI / 180 / 1e6;

    // Draw buffers immediately
    drawBuffers(latlngs, map);

    const initialData: FlightAreaData = {
      polygon: latlngs,
      takeoffPoint: takeoffMarkerRef.current?.getLatLng() || null,
      landingPoint: landingMarkerRef.current?.getLatLng() || null,
      areaKm2: Math.round(area * 1000) / 1000,
      diagonalM: Math.round(diagonalMeters),
      operationType: localData?.operationType || null, // User must select manually
      grbMeters: Math.round(grbDistance * 10) / 10,
      cvMeters: Math.round(cvDistance),
      populationDensityClass: 'sparsely',
      airspaceClass: 'uncontrolled_low',
      flightDescription: `Flygeområde i ${municipality}, ${area.toFixed(3)} km²`,
      landUseResult: null,
      densityOverridden: false,
    };
    setLocalData(initialData);
    setManualRequired(false);
    onUpdate(initialData);

    // Query Overpass
    await runLandUseQuery(latlngs, initialData);
  }, [municipality, drone, grbDistance, cvDistance, onUpdate, localData?.operationType]);

  const runLandUseQuery = useCallback(async (latlngs: L.LatLng[], baseData?: FlightAreaData) => {
    setQueryingLandUse(true);
    setManualRequired(false);
    try {
      const grbExpanded = expandPolygonByGrb(latlngs, grbDistance);
      const result = await queryLandUseInPolygon(grbExpanded);

      const current = baseData || localData;
      if (!current) return;

      // If query failed or returned null class → trigger manual classification
      if (result.detectedClass === null) {
        setManualRequired(true);
        const updated: FlightAreaData = {
          ...current,
          polygon: latlngs,
          landUseResult: result,
          // Keep current class but mark as needing manual override
        };
        setLocalData(updated);
        onUpdate(updated);
        return;
      }

      const updated: FlightAreaData = {
        ...current,
        polygon: latlngs,
        populationDensityClass: current.densityOverridden ? current.populationDensityClass : result.detectedClass,
        landUseResult: result,
      };
      setLocalData(updated);
      onUpdate(updated);

      // Draw density overlay on map
      if (mapRef.current) {
        drawDensityOverlay(latlngs, result.detectedClass, mapRef.current);
      }
    } catch (err) {
      console.warn('Land use query failed:', err);
      setManualRequired(true);
    } finally {
      setQueryingLandUse(false);
    }
  }, [grbDistance, localData, onUpdate]);

  const drawBuffers = (latlngs: L.LatLng[], map: L.Map) => {
    // GRB buffer
    const grbCoords = offsetPolygon(latlngs, grbDistance);
    if (grbCoords.length >= 3) {
      const grbPoly = L.polygon(grbCoords, {
        color: '#f97316',
        weight: 2,
        dashArray: '6,4',
        fillOpacity: 0.18,
        fillColor: '#f97316',
      });
      grbPoly.bindTooltip(`GRB: ${grbDistance.toFixed(1)}m`, { permanent: true, direction: 'center', className: 'map-buffer-label' });
      grbPoly.addTo(map);
      grbLayerRef.current = grbPoly;
    }

    // CV buffer (outer, larger)
    const cvCoords = offsetPolygon(latlngs, grbDistance + cvDistance);
    if (cvCoords.length >= 3) {
      const cvPoly = L.polygon(cvCoords, {
        color: '#ec4899',
        weight: 2,
        dashArray: '6,4',
        fillOpacity: 0.12,
        fillColor: '#ec4899',
      });
      cvPoly.bindTooltip(`CV: ${cvDistance}m`, { permanent: true, direction: 'center', className: 'map-buffer-label' });
      cvPoly.addTo(map);
      cvLayerRef.current = cvPoly;
    }
  };

  const drawDensityOverlay = (latlngs: L.LatLng[], densityClass: PopulationDensityClass, map: L.Map) => {
    if (densityOverlayRef.current) map.removeLayer(densityOverlayRef.current);
    const color = DENSITY_COLORS[densityClass];
    const overlay = L.polygon(latlngs, {
      color,
      weight: 2,
      fillOpacity: 0.25,
      fillColor: color,
    });
    overlay.bindTooltip(`Befolkningstetthet: ${DENSITY_LABELS[densityClass]}`, { permanent: false, direction: 'center' });
    overlay.addTo(map);
    densityOverlayRef.current = overlay;
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

  const handleOperationTypeSelect = (type: 'VLOS' | 'EVLOS' | 'BVLOS') => {
    if (!localData) return;
    const updated: FlightAreaData = {
      ...localData,
      operationType: type,
      flightDescription: `Flygeområde i ${municipality}, ${localData.areaKm2} km², ${type}`,
    };
    setLocalData(updated);
    onUpdate(updated);
  };

  const handleDensityOverride = (newClass: PopulationDensityClass) => {
    if (!localData) return;
    const updated: FlightAreaData = {
      ...localData,
      populationDensityClass: newClass,
      densityOverridden: true,
    };
    setLocalData(updated);
    onUpdate(updated);
    setOverrideOpen(false);
    setManualRequired(false);

    if (mapRef.current && localData.polygon) {
      drawDensityOverlay(localData.polygon, newClass, mapRef.current);
    }
  };

  const handleAddressSearch = useCallback(async () => {
    if (!addressQuery.trim() || !mapRef.current) return;
    setAddressLoading(true);
    setAddressError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery + ', Norge')}&limit=1`);
      const data = await res.json();
      if (data.length === 0) {
        setAddressError('Fant ingen resultater. Prøv en annen adresse.');
        return;
      }
      const { lat, lon } = data[0];
      const latlng = L.latLng(parseFloat(lat), parseFloat(lon));
      mapRef.current.setView(latlng, 16);

      // Place takeoff marker at searched address
      if (takeoffMarkerRef.current) mapRef.current.removeLayer(takeoffMarkerRef.current);
      const marker = L.marker(latlng, {
        icon: L.divIcon({ className: '', html: '<div style="background:#7c3aed;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(124,58,237,0.5);"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })
      }).addTo(mapRef.current);
      takeoffMarkerRef.current = marker;
      updateFlightData();
    } catch {
      setAddressError('Kunne ikke søke etter adressen. Prøv igjen.');
    } finally {
      setAddressLoading(false);
    }
  }, [addressQuery]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Tegn flygeområde</h2>
        <p className="text-sora-text-muted text-sm">Skriv inn adressen for takeoff, tegn deretter flygeområdet på kartet.</p>
      </div>

      {/* Address search */}
      <div className="space-y-2">
        <label className="text-sm text-sora-text-muted font-medium">Takeoff-adresse</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sora-text-dim" />
            <input
              type="text"
              value={addressQuery}
              onChange={e => setAddressQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddressSearch()}
              placeholder="F.eks. Kongens gate 1, Trondheim"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-sora-surface border border-sora-border text-sora-text text-sm placeholder:text-sora-text-dim focus:outline-none focus:border-sora-purple transition-colors"
            />
          </div>
          <button
            onClick={handleAddressSearch}
            disabled={addressLoading || !addressQuery.trim()}
            className="px-5 py-2.5 rounded-lg bg-sora-purple text-sora-text text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {addressLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Søk
          </button>
        </div>
        {addressError && <p className="text-red-400 text-xs">{addressError}</p>}
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

      {/* VLOS/BVLOS/EVLOS selector — required after polygon is drawn */}
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
                  localData.operationType === opt.type
                    ? 'border-sora-purple bg-sora-purple/10'
                    : 'border-sora-border hover:border-sora-text-dim'
                }`}
              >
                <p className={`text-sm font-bold ${localData.operationType === opt.type ? 'text-sora-purple' : 'text-sora-text'}`}>{opt.label}</p>
                <p className="text-xs text-sora-text-dim mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
          {!localData.operationType && (
            <p className="text-sora-warning text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Du må velge operasjonstype for å beregne GRC og SAIL.
            </p>
          )}
          <p className="text-sora-text-dim text-xs">
            I henhold til EU 2019/947 og SORA 2.5 er VLOS/BVLOS bestemt av pilotens evne til å opprettholde visuell kontakt — ikke av polygonstørrelse.
          </p>
        </div>
      )}

      {/* Airspace note */}
      {localData?.polygon && (
        <div className="bg-sora-surface/50 border border-sora-border rounded-lg px-4 py-2.5 text-xs text-sora-text-dim flex items-start gap-2">
          <Info className="w-4 h-4 text-sora-purple shrink-0 mt-0.5" />
          <span>Luftrom er basert på forenklet klassifisering. Sjekk alltid <a href="https://operatorportal.ninoxdrone.no/" target="_blank" rel="noopener noreferrer" className="text-sora-purple hover:underline">Ninox</a> eller <a href="https://norskluftambulanse.no/info-hemswx/" target="_blank" rel="noopener noreferrer" className="text-sora-purple hover:underline">HmSWX</a> for faktisk luftromsklasse.</span>
        </div>
      )}

      {manualRequired && !localData?.densityOverridden && (
        <div className="bg-yellow-500/15 border border-yellow-500/40 rounded-lg px-4 py-3">
          <p className="text-yellow-400 text-sm font-semibold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Kunne ikke hente befolkningsdata automatisk. Velg tetthetsklasse manuelt:
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DENSITY_LABELS) as PopulationDensityClass[]).map(cls => (
              <button
                key={cls}
                onClick={() => handleDensityOverride(cls)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-sora-surface border border-sora-border text-sora-text-muted hover:bg-sora-surface-hover transition-colors"
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DENSITY_COLORS[cls] }} />
                {DENSITY_LABELS[cls]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Density classification result */}
      {localData && (
        <div className="space-y-3">
          {/* Population density banner */}
          <div
            className="rounded-lg px-4 py-3 border flex items-center justify-between"
            style={{
              borderColor: DENSITY_COLORS[localData.populationDensityClass] + '66',
              backgroundColor: DENSITY_COLORS[localData.populationDensityClass] + '15',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: DENSITY_COLORS[localData.populationDensityClass] }}
              />
              <div>
                <p className="text-sora-text font-semibold text-sm">
                  Befolkningstetthet i flygeområdet: {DENSITY_LABELS[localData.populationDensityClass]}
                </p>
                <p className="text-sora-text-dim text-xs">
                  {queryingLandUse ? (
                    <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Analyserer arealbruk via Overpass API...</span>
                  ) : localData.landUseResult ? (
                    <>Klassifisert fra OSM-data ({localData.landUseResult.rawTags.slice(0, 4).join(', ')}{localData.landUseResult.rawTags.length > 4 ? '...' : ''}) · {localData.landUseResult.elementCount} elementer · {localData.landUseResult.queryTime}ms</>
                  ) : (
                    'Tegn polygon for å analysere'
                  )}
                </p>
                {localData.densityOverridden && (
                  <p className="text-sora-pink text-xs mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Manuelt overstyrt — du er ansvarlig for at valget er korrekt
                  </p>
                )}
              </div>
            </div>

            {/* Override dropdown */}
            <div className="relative">
              <button
                onClick={() => setOverrideOpen(!overrideOpen)}
                className="text-xs text-sora-text-muted border border-sora-border rounded-md px-3 py-1.5 hover:bg-sora-surface-hover transition-colors flex items-center gap-1"
              >
                Overstyr <ChevronDown className="w-3 h-3" />
              </button>
              {overrideOpen && (
                <div className="absolute right-0 top-full mt-1 bg-sora-surface border border-sora-border rounded-lg shadow-lg z-50 w-64">
                  <div className="px-3 py-2 border-b border-sora-border">
                    <p className="text-xs text-sora-text-dim flex items-center gap-1">
                      <Info className="w-3 h-3" /> Overstyring av automatisk klassifisering. Du er ansvarlig for at valget er korrekt.
                    </p>
                  </div>
                  {(Object.keys(DENSITY_LABELS) as PopulationDensityClass[]).map(cls => (
                    <button
                      key={cls}
                      onClick={() => handleDensityOverride(cls)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-sora-surface-hover transition-colors ${
                        localData.populationDensityClass === cls ? 'text-sora-text font-semibold' : 'text-sora-text-muted'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DENSITY_COLORS[cls] }} />
                      {DENSITY_LABELS[cls]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Areal" value={`${localData.areaKm2} km²`} />
            <MetricCard label="Diagonal" value={`${localData.diagonalM} m`} />
            <MetricCard label="Type" value={localData.operationType} highlight={localData.operationType === 'BVLOS'} warn={localData.operationType === 'BVLOS'} />
            <MetricCard
              label="GRB"
              value={`${localData.grbMeters} m`}
              sub={drone ? `(${charDim}m × 2)` : '(velg drone for nøyaktig GRB)'}
            />
            <MetricCard label="CV" value={`${localData.cvMeters} m`} sub={`max(${maxAltitude}×0.1, 30)`} />
            <MetricCard
              label="Tetthetsklasse"
              value={DENSITY_LABELS[localData.populationDensityClass]}
              color={DENSITY_COLORS[localData.populationDensityClass]}
            />
            <MetricCard label="Luftrom" value="Ukontrollert G" />
            <MetricCard label="Maks høyde" value={`${maxAltitude} m AGL`} />
          </div>

          {/* Detected tags detail */}
          {localData.landUseResult && localData.landUseResult.rawTags.length > 0 && (
            <div className="bg-sora-surface border border-sora-border rounded-lg p-3">
              <p className="text-xs text-sora-text-dim mb-1">Detekterte OSM-data i bakkerisikobufferen:</p>
              <div className="flex flex-wrap gap-1">
                {localData.landUseResult.rawTags.map((tag, i) => (
                  <span key={i} className="text-xs bg-sora-bg px-2 py-0.5 rounded text-sora-text-muted border border-sora-border">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, highlight, warn, color }: { label: string; value: string; sub?: string; highlight?: boolean; warn?: boolean; color?: string }) {
  return (
    <div className={`bg-sora-surface border rounded-lg p-3 ${warn ? 'border-red-500/50' : 'border-sora-border'}`}>
      <p className="text-sora-text-dim text-xs">{label}</p>
      <p
        className={`font-semibold text-sm ${warn ? 'text-red-400' : highlight ? 'text-sora-purple' : 'text-sora-text'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-sora-text-dim text-xs">{sub}</p>}
    </div>
  );
}
