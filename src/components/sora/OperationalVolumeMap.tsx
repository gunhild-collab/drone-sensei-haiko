import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

interface Props {
  onVolumesCalculated: (data: {
    flightGeography: string;
    contingencyBuffer: string;
    grbMeters: string;
  }) => void;
}

type DrawingMode = "fg" | "cv" | "grb" | null;

const LAYER_STYLES: Record<string, { color: string; fillColor: string; label: string }> = {
  fg: { color: "#7c3aed", fillColor: "rgba(124,58,237,0.2)", label: "Flygegeografi (FG)" },
  cv: { color: "#eab308", fillColor: "rgba(234,179,8,0.15)", label: "Beredskapsvolum (CV)" },
  grb: { color: "#ec4899", fillColor: "rgba(236,72,153,0.12)", label: "Bakkerisikobuffer (GRB)" },
};

function formatArea(m2: number): string {
  if (m2 > 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`;
  return `${Math.round(m2)} m²`;
}

function getBoundsDimensions(bounds: L.LatLngBounds): { width: number; height: number } {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const width = sw.distanceTo(L.latLng(sw.lat, ne.lng));
  const height = sw.distanceTo(L.latLng(ne.lat, sw.lng));
  return { width, height };
}

function getLayerArea(layer: L.Layer): number {
  if ((layer as any).getRadius) {
    const r = (layer as any).getRadius();
    return Math.PI * r * r;
  }
  if ((layer as any).getLatLngs) {
    const latlngs = (layer as any).getLatLngs();
    const flat = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
    return L.GeometryUtil?.geodesicArea?.(flat) ?? computeGeodesicArea(flat);
  }
  return 0;
}

function computeGeodesicArea(latlngs: L.LatLng[]): number {
  const d2r = Math.PI / 180;
  let area = 0;
  const len = latlngs.length;
  for (let i = 0; i < len; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % len];
    area += (p2.lng - p1.lng) * d2r * (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
  }
  return Math.abs(area * 6378137 * 6378137 / 2);
}

function getBufferDistance(innerLayer: L.Layer, outerLayer: L.Layer): number {
  const innerBounds = (innerLayer as any).getBounds?.();
  const outerBounds = (outerLayer as any).getBounds?.();
  if (!innerBounds || !outerBounds) return 0;

  const innerDims = getBoundsDimensions(innerBounds);
  const outerDims = getBoundsDimensions(outerBounds);

  const bufferW = (outerDims.width - innerDims.width) / 2;
  const bufferH = (outerDims.height - innerDims.height) / 2;
  return Math.round(Math.max(bufferW, bufferH));
}

export default function OperationalVolumeMap({ onVolumesCalculated }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const drawControlRef = useRef<any>(null);
  const [activeMode, setActiveMode] = useState<DrawingMode>(null);
  const [layers, setLayers] = useState<Record<string, L.Layer | null>>({ fg: null, cv: null, grb: null });
  const [stats, setStats] = useState<Record<string, string>>({});
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [63.43, 10.39], // Trondheim default
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Try to get user location
    navigator.geolocation?.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => {} // keep default
    );

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const startDrawing = useCallback((mode: DrawingMode) => {
    const map = mapInstanceRef.current;
    if (!map || !mode) return;

    setActiveMode(mode);
    const style = LAYER_STYLES[mode];

    // Remove existing layer for this mode
    const existing = layersRef.current[mode];
    if (existing) {
      map.removeLayer(existing);
      setLayers(prev => ({ ...prev, [mode]: null }));
    }

    // Enable drawing
    const drawHandler = new (L.Draw as any).Rectangle(map, {
      shapeOptions: {
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: 0.3,
        weight: 2,
        dashArray: mode === "fg" ? undefined : "8 4",
      },
    });

    drawHandler.enable();

    map.once(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;

      // Add label
      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      const area = getLayerArea(layer);
      const dims = getBoundsDimensions(bounds);
      const label = `${style.label}\n${Math.round(dims.width)} × ${Math.round(dims.height)} m\n${formatArea(area)}`;

      layer.bindTooltip(label, { permanent: true, direction: "center", className: "volume-tooltip" });
      layer.addTo(map);

      const newLayers = { ...layersRef.current, [mode]: layer };
      setLayers(newLayers);
      setActiveMode(null);

      // Update stats
      const newStats: Record<string, string> = {};
      if (newLayers.fg) {
        const fgBounds = (newLayers.fg as any).getBounds();
        const fgDims = getBoundsDimensions(fgBounds);
        const fgArea = getLayerArea(newLayers.fg);
        newStats.fg = `${Math.round(fgDims.width)} × ${Math.round(fgDims.height)} m (${formatArea(fgArea)})`;
      }

      let cvBuffer = "";
      if (newLayers.fg && newLayers.cv) {
        const dist = getBufferDistance(newLayers.fg, newLayers.cv);
        cvBuffer = `${dist}`;
        newStats.cv = `${dist} m buffer`;
      }

      let grbBuffer = "";
      const grbRef = newLayers.cv || newLayers.fg;
      if (grbRef && newLayers.grb) {
        const dist = getBufferDistance(grbRef, newLayers.grb);
        grbBuffer = `${dist}`;
        newStats.grb = `${dist} m buffer`;
      }

      setStats(newStats);

      // Auto-fill form
      onVolumesCalculated({
        flightGeography: newStats.fg || "",
        contingencyBuffer: cvBuffer,
        grbMeters: grbBuffer,
      });
    });
  }, [onVolumesCalculated]);

  const clearAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    Object.values(layersRef.current).forEach(l => { if (l) map.removeLayer(l); });
    setLayers({ fg: null, cv: null, grb: null });
    setStats({});
  }, []);

  return (
    <div className="space-y-3">
      {/* Drawing toolbar */}
      <div className="flex flex-wrap gap-2">
        {(["fg", "cv", "grb"] as const).map(mode => {
          const style = LAYER_STYLES[mode];
          const isActive = activeMode === mode;
          const hasLayer = !!layers[mode];
          return (
            <button
              key={mode}
              onClick={() => startDrawing(mode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                isActive
                  ? "ring-2 ring-offset-1 ring-offset-[#1a1a2e]"
                  : hasLayer
                  ? "opacity-80"
                  : ""
              }`}
              style={{
                borderColor: style.color,
                backgroundColor: isActive ? style.fillColor : "rgba(15,15,23,0.8)",
                color: style.color,
                ringColor: style.color,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm border-2"
                style={{ borderColor: style.color, backgroundColor: hasLayer ? style.fillColor : "transparent" }}
              />
              {isActive ? `Tegn ${style.label}...` : hasLayer ? `✓ ${style.label}` : `Tegn ${style.label}`}
            </button>
          );
        })}
        <button
          onClick={clearAll}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-[#0f0f17] border border-[#2a2a3e] text-gray-400 hover:text-white hover:border-red-500/50 transition-all"
        >
          Nullstill
        </button>
      </div>

      {/* Instructions */}
      {activeMode && (
        <div className="bg-[#0f0f17] border border-[#2a2a3e] rounded-lg p-3 text-xs text-gray-300 animate-pulse">
          📍 Klikk og dra på kartet for å tegne <strong style={{ color: LAYER_STYLES[activeMode].color }}>{LAYER_STYLES[activeMode].label}</strong> som et rektangel. 
          {activeMode === "cv" && " Tegn rundt FG med litt ekstra margin."}
          {activeMode === "grb" && " Tegn det ytterste laget rundt CV/FG."}
        </div>
      )}

      {!activeMode && !layers.fg && (
        <p className="text-gray-500 text-xs">
          Start med å tegne <strong className="text-[#7c3aed]">Flygegeografi (FG)</strong> — klikk knappen over og tegn et rektangel på kartet.
        </p>
      )}

      {/* Map container */}
      <div
        ref={mapRef}
        className="w-full rounded-xl border border-[#2a2a3e] overflow-hidden"
        style={{ height: 400 }}
      />

      {/* Auto-calculated results */}
      {Object.keys(stats).length > 0 && (
        <div className="bg-[#0f0f17] border border-[#2a2a3e] rounded-lg p-3 space-y-1">
          <p className="text-gray-400 text-xs font-semibold mb-2">📐 Beregnede verdier (automatisk overført):</p>
          {stats.fg && <p className="text-xs"><span className="text-[#7c3aed] font-medium">FG:</span> <span className="text-gray-200">{stats.fg}</span></p>}
          {stats.cv && <p className="text-xs"><span className="text-yellow-400 font-medium">CV buffer:</span> <span className="text-gray-200">{stats.cv}</span></p>}
          {stats.grb && <p className="text-xs"><span className="text-[#ec4899] font-medium">GRB buffer:</span> <span className="text-gray-200">{stats.grb}</span></p>}
        </div>
      )}

      {/* Custom tooltip styling */}
      <style>{`
        .volume-tooltip {
          background: rgba(15,15,23,0.9) !important;
          border: 1px solid rgba(42,42,62,0.8) !important;
          color: #e5e7eb !important;
          font-size: 11px !important;
          white-space: pre-line !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .volume-tooltip::before {
          display: none !important;
        }
        .leaflet-draw-toolbar {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
