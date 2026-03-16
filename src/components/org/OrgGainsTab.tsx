import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Clock, Banknote, Plane } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from "recharts";

const HOURLY_RATE = 700; // NOK/time default

interface Props { org: any; }

export default function OrgGainsTab({ org }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const hourlyRate = org?.config?.hourly_rate_nok || HOURLY_RATE;

  useEffect(() => {
    supabase.from("flight_logs").select("*").eq("organization_id", org.id).order("flight_date")
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, [org.id]);

  const filteredLogs = useMemo(() => {
    if (period === "all") return logs;
    const now = new Date();
    const cutoff = new Date();
    if (period === "30d") cutoff.setDate(now.getDate() - 30);
    else if (period === "ytd") { cutoff.setMonth(0); cutoff.setDate(1); }
    return logs.filter(l => new Date(l.flight_date) >= cutoff);
  }, [logs, period]);

  const totals = useMemo(() => {
    let droneMin = 0, savedMin = 0, count = 0;
    filteredLogs.forEach(l => {
      count++;
      if (l.drone_time_minutes) droneMin += l.drone_time_minutes;
      if (l.manual_reference_time_minutes != null && l.drone_time_minutes != null)
        savedMin += l.manual_reference_time_minutes - l.drone_time_minutes;
    });
    const savedHours = savedMin / 60;
    return {
      count,
      droneHours: (droneMin / 60).toFixed(1),
      savedHours: savedHours.toFixed(1),
      savedCost: Math.round(savedHours * hourlyRate),
    };
  }, [filteredLogs, hourlyRate]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; oppdrag: number; spart_nok: number }> = {};
    filteredLogs.forEach(l => {
      const d = new Date(l.flight_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, oppdrag: 0, spart_nok: 0 };
      map[key].oppdrag++;
      if (l.manual_reference_time_minutes != null && l.drone_time_minutes != null) {
        const savedH = (l.manual_reference_time_minutes - l.drone_time_minutes) / 60;
        map[key].spart_nok += Math.round(savedH * hourlyRate);
      }
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredLogs, hourlyRate]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Period picker */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">Gevinster</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Siste 30 dager</SelectItem>
            <SelectItem value="ytd">År til dato</SelectItem>
            <SelectItem value="all">Totalt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Plane} label="Oppdrag" value={totals.count.toString()} />
        <KpiCard icon={Clock} label="Dronetimer" value={`${totals.droneHours} t`} />
        <KpiCard icon={TrendingUp} label="Spart tid" value={`${totals.savedHours} t`} />
        <KpiCard icon={Banknote} label="Spart kostnad" value={`${totals.savedCost.toLocaleString("nb-NO")} kr`} accent />
      </div>

      {/* Charts */}
      {monthlyData.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Oppdrag per måned</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="oppdrag" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Spart kostnad per måned (NOK)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString("nb-NO")} kr`, "Spart"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="spart_nok" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--accent))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {monthlyData.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Registrer flylogger for å se gevinster</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">Timesats: {hourlyRate} NOK/time (kostmodell v1)</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? "bg-accent/10" : "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${accent ? "text-accent" : "text-primary"}`} />
        </div>
        <div>
          <div className="text-xl font-display font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
