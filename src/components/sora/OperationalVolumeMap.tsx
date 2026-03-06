import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  onVolumesCalculated: (data: {
    flightGeography: string;
    contingencyBuffer: string;
    grbMeters: string;
  }) => void;
}

type DrawingMode = "fg" | "cv" | "grb" | null;

const LAYER_STYLES: Record<string, { color: string; fillColor: string; fillOpacity: number; label: string }> = {
  fg: { color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.2, label: "Flygegeografi (FG)" },
  cv: { color: "#eab308", fillColor: "#eab308", fillOpacity: 0.15, label: "Beredskapsvolum (CV)" },
  grb: { color: "#ec4899", fillColor: "#ec4899", fillOpacity: 0.12, label: "Bakkerisikobuffer (GRB)" },
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

function getBufferDistance(innerBounds: L.LatLngBounds, outerBounds: L.LatLngBounds): number {
  const innerDims = getBoundsDimensions(innerBounds);
  const outerDims = getBoundsDimensions(outerBounds);
  const bufferW = (outerDims.width - innerDims.width) / 2;
  const bufferH = (outerDims.height - innerDims.height) / 2;
  return Math.round(Math.max(bufferW, bufferH));
}

export default function OperationalVolumeMap({ onVolumesCalculated }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [activeMode, setActiveMode] = useState<DrawingMode>(null);
  const activeModeRef = useRef<DrawingMode>(null);
  const [drawnLayers, setDrawnLayers] = useState<Record<string, L.Rectangle | null>>({ fg: null, cv: null, grb: null });
  const drawnLayersRef = useRef(drawnLayers);
  drawnLayersRef.current = drawnLayers;
  const [stats, setStats] = useState<Record<string, string>>({});
  
  // Drawing state refs
  const isDrawingRef = useRef(false);
  const startLatLngRef = useRef<L.LatLng | null>(null);
  const previewRectRef = useRef<L.Rectangle | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [63.43, 10.39],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Mouse drawing handlers
    const onMouseDown = (e: L.LeafletMouseEvent) => {
      const mode = activeModeRef.current;
      if (!mode) return;
      map.dragging.disable();
      isDrawingRef.current = true;
      startLatLngRef.current = e.latlng;

      const style = LAYER_STYLES[mode];
      previewRectRef.current = L.rectangle(
        [e.latlng, e.latlng],
        {
          color: style.color,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity,
          weight: 2,
          dashArray: mode === "fg" ? undefined : "8 4",
        }
      ).addTo(map);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isDrawingRef.current || !startLatLngRef.current || !previewRectRef.current) return;
      previewRectRef.current.setBounds(L.latLngBounds(startLatLngRef.current, e.latlng));
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      map.dragging.enable();
      const mode = activeModeRef.current;
      if (!isDrawingRef.current || !startLatLngRef.current || !mode) return;
      isDrawingRef.current = false;

      const bounds = L.latLngBounds(startLatLngRef.current, e.latlng);
      const dims = getBoundsDimensions(bounds);
      
      // Ignore tiny accidental clicks (< 5m)
      if (dims.width < 5 && dims.height < 5) {
        if (previewRectRef.current) map.removeLayer(previewRectRef.current);
        previewRectRef.current = null;
        startLatLngRef.current = null;
        return;
      }

      // Remove old layer for this mode
      const existing = drawnLayersRef.current[mode];
      if (existing) map.removeLayer(existing);

      // Keep the preview rect as the final layer
      const rect = previewRectRef.current!;
      const style = LAYER_STYLES[mode];
      const area = dims.width * dims.height;
      const label = `${style.label}\n${Math.round(dims.width)} × ${Math.round(dims.height)} m\n${formatArea(area)}`;
      rect.bindTooltip(label, { permanent: true, direction: "center", className: "volume-tooltip" });

      const newLayers = { ...drawnLayersRef.current, [mode]: rect };
      drawnLayersRef.current = newLayers;
      setDrawnLayers(newLayers);

      // Calculate stats & auto-fill
      const newStats: Record<string, string> = {};
      let fgDesc = "";
      let cvBuffer = "";
      let grbBuffer = "";

      if (newLayers.fg) {
        const fgBounds = newLayers.fg.getBounds();
        const fgDims = getBoundsDimensions(fgBounds);
        const fgArea = fgDims.width * fgDims.height;
        fgDesc = `${Math.round(fgDims.width)} × ${Math.round(fgDims.height)} m (${formatArea(fgArea)})`;
        newStats.fg = fgDesc;
      }
      if (newLayers.fg && newLayers.cv) {
        const dist = getBufferDistance(newLayers.fg.getBounds(), newLayers.cv.getBounds());
        cvBuffer = `${dist}`;
        newStats.cv = `${dist} m buffer`;
      }
      const grbRef = newLayers.cv || newLayers.fg;
      if (grbRef && newLayers.grb) {
        const dist = getBufferDistance(grbRef.getBounds(), newLayers.grb.getBounds());
        grbBuffer = `${dist}`;
        newStats.grb = `${dist} m buffer`;
      }

      setStats(newStats);
      onVolumesCalculated({ flightGeography: fgDesc, contingencyBuffer: cvBuffer, grbMeters: grbBuffer });

      // Reset
      previewRectRef.current = null;
      startLatLngRef.current = null;
      activeModeRef.current = null;
      setActiveMode(null);
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    navigator.geolocation?.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => {}
    );

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onVolumesCalculated]);

  const activateMode = useCallback((mode: DrawingMode) => {
    activeModeRef.current = mode;
    setActiveMode(mode);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getContainer().style.cursor = mode ? "crosshair" : "";
    }
  }, []);

  const clearAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    Object.values(drawnLayersRef.current).forEach(l => { if (l) map.removeLayer(l); });
    drawnLayersRef.current = { fg: null, cv: null, grb: null };
    setDrawnLayers({ fg: null, cv: null, grb: null });
    setStats({});
  }, []);

  return (
    <div className="space-y-3">
      {/* Drawing toolbar */}
      <div className="flex flex-wrap gap-2">
        {(["fg", "cv", "grb"] as const).map(mode => {
          const style = LAYER_STYLES[mode];
          const isActive = activeMode === mode;
          const hasLayer = !!drawnLayers[mode];
          return (
            <button
              key={mode}
              onClick={() => activateMode(mode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                isActive ? "ring-2 ring-offset-1 ring-offset-[#1a1a2e]" : ""
              }`}
              style={{
                borderColor: style.color,
                backgroundColor: isActive ? style.fillColor : "rgba(15,15,23,0.8)",
                color: style.color,
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

      {!activeMode && !drawnLayers.fg && (
        <p className="text-gray-500 text-xs">
          Start med å tegne <strong className="text-[#7c3aed]">Flygegeografi (FG)</strong> — klikk knappen over og tegn et rektangel på kartet.
        </p>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full rounded-xl border border-[#2a2a3e] overflow-hidden"
        style={{ height: 400 }}
      />

      {/* Results */}
      {Object.keys(stats).length > 0 && (
        <div className="bg-[#0f0f17] border border-[#2a2a3e] rounded-lg p-3 space-y-1">
          <p className="text-gray-400 text-xs font-semibold mb-2">📐 Beregnede verdier (automatisk overført):</p>
          {stats.fg && <p className="text-xs"><span className="text-[#7c3aed] font-medium">FG:</span> <span className="text-gray-200">{stats.fg}</span></p>}
          {stats.cv && <p className="text-xs"><span className="text-yellow-400 font-medium">CV buffer:</span> <span className="text-gray-200">{stats.cv}</span></p>}
          {stats.grb && <p className="text-xs"><span className="text-[#ec4899] font-medium">GRB buffer:</span> <span className="text-gray-200">{stats.grb}</span></p>}
        </div>
      )}

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
        .volume-tooltip::before { display: none !important; }
      `}</style>
    </div>
  );
}
