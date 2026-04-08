import React, { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CloudSun, Wind, Thermometer, Eye, Droplets, Snowflake, AlertTriangle, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { MUNICIPALITY_GEO } from "@/data/municipalityCoordinates";

/* ─── Types ─── */
interface MonthlyResult {
  month: number;
  monthName: string;
  conservative: number;
  expected: number;
  optimistic: number;
  primaryConstraint: string;
}

interface UptimeResult {
  station_id: string;
  platform: string;
  night_flight: boolean;
  annual: { conservative: number; expected: number; optimistic: number };
  monthly: MonthlyResult[];
  data_range: { start: number; end: number };
  observation_count: number;
  warnings: string[];
}

interface SyncResult {
  station_id: string;
  station_name: string;
  cached: boolean;
  observation_count: number;
}

const PLATFORMS = [
  { value: "default", label: "Standard droneplattform" },
  { value: "DJI Matrice 350 RTK", label: "DJI Matrice 350 RTK" },
  { value: "DJI Mavic 4 Pro", label: "DJI Mavic 4 Pro" },
  { value: "Aviant Notus", label: "Aviant Notus (VTOL)" },
];

const CONSTRAINT_ICONS: Record<string, React.ReactNode> = {
  "Vind": <Wind className="w-4 h-4" />,
  "Vindkast": <Wind className="w-4 h-4" />,
  "Temperatur": <Thermometer className="w-4 h-4" />,
  "Sikt": <Eye className="w-4 h-4" />,
  "Nedbør": <Droplets className="w-4 h-4" />,
  "Ising": <Snowflake className="w-4 h-4" />,
};

interface Props {
  municipalityName: string;
  areaKm2: number;
  population: number;
}

export default function UptimeCalculator({ municipalityName, areaKm2, population }: Props) {
  const [platform, setPlatform] = useState("default");
  const [nightFlight, setNightFlight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<UptimeResult | null>(null);
  const [stationName, setStationName] = useState("");
  const [error, setError] = useState("");

  const geo = MUNICIPALITY_GEO[municipalityName];

  const runCalculation = useCallback(async () => {
    if (!geo) {
      setError("Koordinater ikke tilgjengelig for denne kommunen.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Sync weather data
      setSyncing(true);
      const syncResp = await supabase.functions.invoke("frost-sync", {
        body: {
          municipality_code: municipalityName,
          lat: geo.lat,
          lon: geo.lng,
          municipality_name: municipalityName,
        },
      });

      if (syncResp.error) throw new Error(syncResp.error.message);
      const syncData = syncResp.data as SyncResult;
      setStationName(syncData.station_name);
      setSyncing(false);

      // Step 2: Calculate uptime
      const calcResp = await supabase.functions.invoke("uptime-calculate", {
        body: {
          station_id: syncData.station_id,
          platform_name: platform,
          night_flight: nightFlight,
          lat: geo.lat,
          lon: geo.lng,
        },
      });

      if (calcResp.error) throw new Error(calcResp.error.message);
      setResult(calcResp.data as UptimeResult);
    } catch (err: any) {
      console.error("Uptime calculation failed:", err);
      setError(err.message || "Beregning feilet");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [municipalityName, geo, platform, nightFlight]);

  // Re-calculate (no re-sync needed) when platform or nightFlight changes and we have a result
  const recalculate = useCallback(async () => {
    if (!result) return;
    setLoading(true);
    setError("");
    try {
      const calcResp = await supabase.functions.invoke("uptime-calculate", {
        body: {
          station_id: result.station_id,
          platform_name: platform,
          night_flight: nightFlight,
          lat: geo?.lat || 60,
          lon: geo?.lng || 10,
        },
      });
      if (calcResp.error) throw new Error(calcResp.error.message);
      setResult(calcResp.data as UptimeResult);
    } catch (err: any) {
      setError(err.message || "Reberegning feilet");
    } finally {
      setLoading(false);
    }
  }, [result, platform, nightFlight, geo]);

  const uptimeColor = (pct: number) => {
    if (pct >= 80) return "text-green-600";
    if (pct >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const chartData = result?.monthly.map(m => ({
    name: m.monthName.slice(0, 3),
    conservative: m.conservative,
    expected: m.expected,
    optimistic: m.optimistic,
    range: [m.conservative, m.optimistic],
  })) || [];

  return (
    <div className="space-y-6">
      {/* ─── Controls ─── */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Plattform</label>
            <Select value={platform} onValueChange={(v) => { setPlatform(v); if (result) recalculate(); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Nattflyvning</label>
            <Switch checked={nightFlight} onCheckedChange={(v) => { setNightFlight(v); if (result) recalculate(); }} />
          </div>

          <Button
            onClick={runCalculation}
            disabled={loading || !geo}
            className="bg-gradient-to-r from-[#685BF8] to-[#FF66C4] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {syncing ? "Henter værdata..." : "Beregner..."}
              </>
            ) : (
              <>
                <CloudSun className="w-4 h-4 mr-2" />
                Beregn oppetid
              </>
            )}
          </Button>
        </div>

        {!geo && (
          <p className="text-sm text-red-500 mt-2">
            Koordinater for {municipalityName} er ikke tilgjengelig i databasen.
          </p>
        )}
      </Card>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {/* ─── Results ─── */}
      {result && (
        <>
          {/* Annual summary */}
          <Card className="p-8 bg-gradient-to-br from-[#1C0059] to-[#685BF8] text-white">
            <div className="text-center">
              <p className="text-sm font-medium text-purple-200 mb-2">Forventet årlig droneoppetid</p>
              <p className={`text-6xl font-bold mb-2`}>{result.annual.expected}%</p>
              <p className="text-purple-200 text-sm">
                {result.annual.conservative}% – {result.annual.optimistic}% (konservativt – optimistisk)
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-purple-300">
                <span>📍 {stationName}</span>
                <span>🛩️ {PLATFORMS.find(p => p.value === platform)?.label}</span>
                <span>{nightFlight ? "🌙 Nattflyvning" : "☀️ Kun dagslys"}</span>
              </div>
            </div>
          </Card>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              {result.warnings.map((w, i) => (
                <Card key={i} className="p-3 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-2 text-amber-700">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="text-sm">{w}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Monthly chart */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Månedlig oppetid</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        conservative: "Konservativt",
                        expected: "Forventet",
                        optimistic: "Optimistisk",
                      };
                      return [`${value}%`, labels[name] || name];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="optimistic"
                    stroke="none"
                    fill="#685BF8"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="conservative"
                    stroke="none"
                    fill="#ffffff"
                    fillOpacity={1}
                  />
                  <Bar dataKey="expected" fill="#685BF8" radius={[4, 4, 0, 0]} barSize={30} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Monthly table */}
          <Card className="p-6 bg-white border border-gray-200 overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detaljert månedsoversikt</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-700">Måned</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Konservativt</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Forventet</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Optimistisk</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Primær begrensning</th>
                </tr>
              </thead>
              <tbody>
                {result.monthly.map((m, i) => (
                  <tr key={m.month} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 font-medium">{m.monthName}</td>
                    <td className={`px-4 py-3 text-center font-mono ${uptimeColor(m.conservative)}`}>
                      {m.conservative}%
                    </td>
                    <td className={`px-4 py-3 text-center font-mono font-bold ${uptimeColor(m.expected)}`}>
                      {m.expected}%
                    </td>
                    <td className={`px-4 py-3 text-center font-mono ${uptimeColor(m.optimistic)}`}>
                      {m.optimistic}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {CONSTRAINT_ICONS[m.primaryConstraint] || null}
                        <span className="text-gray-600">{m.primaryConstraint}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Footer */}
          <p className="text-xs text-gray-400 text-center">
            Datakilde: MET Norge (frost.met.no), {stationName}, {result.data_range.start}–{result.data_range.end}.
            {result.warnings.length > 0 && " Enkelte parametere kan mangle — se varsler ovenfor."}
            {" "}Basert på {result.observation_count.toLocaleString("nb-NO")} observasjoner.
          </p>
        </>
      )}
    </div>
  );
}
