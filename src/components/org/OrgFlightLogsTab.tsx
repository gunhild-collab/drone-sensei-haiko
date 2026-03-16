import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Clock, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const MISSION_TYPES = [
  "Bruinspeksjon", "Veikontroll", "Bygginspeksjon", "Flomovervåking",
  "SAR", "Kartlegging", "Vann/avløp", "Landbruk", "Brann", "Annet"
];

interface Props { orgId: string; }

export default function OrgFlightLogsTab({ orgId }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [pilots, setPilots] = useState<any[]>([]);
  const [drones, setDrones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    flight_date: new Date().toISOString().split("T")[0],
    mission_type: "Annet",
    location_description: "",
    pilot_id: "",
    drone_id: "",
    drone_time_minutes: "",
    manual_reference_time_minutes: "",
    notes: "",
  });

  const fetchLogs = useCallback(async () => {
    const [l, p, d] = await Promise.all([
      supabase.from("flight_logs").select("*").eq("organization_id", orgId).order("flight_date", { ascending: false }),
      supabase.from("pilots").select("id, name").eq("organization_id", orgId).eq("status", "active" as any),
      supabase.from("org_drones").select("id, name").eq("organization_id", orgId).eq("status", "active" as any),
    ]);
    setLogs(l.data || []);
    setPilots(p.data || []);
    setDrones(d.data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleAdd = async () => {
    setSaving(true);
    const payload: any = {
      organization_id: orgId,
      flight_date: form.flight_date,
      mission_type: form.mission_type,
      location_description: form.location_description || null,
      drone_time_minutes: form.drone_time_minutes ? parseInt(form.drone_time_minutes) : null,
      manual_reference_time_minutes: form.manual_reference_time_minutes ? parseInt(form.manual_reference_time_minutes) : null,
      notes: form.notes || null,
      pilot_id: form.pilot_id || null,
      drone_id: form.drone_id || null,
    };
    const { error } = await supabase.from("flight_logs").insert([payload]);
    if (error) toast.error(error.message);
    else {
      toast.success("Flylogg registrert");
      setOpen(false);
      setForm({ flight_date: new Date().toISOString().split("T")[0], mission_type: "Annet", location_description: "", pilot_id: "", drone_id: "", drone_time_minutes: "", manual_reference_time_minutes: "", notes: "" });
      fetchLogs();
    }
    setSaving(false);
  };

  const savedMin = (log: any) => {
    if (log.manual_reference_time_minutes != null && log.drone_time_minutes != null)
      return log.manual_reference_time_minutes - log.drone_time_minutes;
    return null;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-foreground">Flylogger</h3>
          <p className="text-sm text-muted-foreground">{logs.length} logger registrert</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-1.5"><Plus className="w-4 h-4" /> Ny flylogg</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Ny flylogg</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Dato *</Label><Input type="date" value={form.flight_date} onChange={e => setForm(f => ({ ...f, flight_date: e.target.value }))} /></div>
                <div>
                  <Label>Oppdragstype *</Label>
                  <Select value={form.mission_type} onValueChange={v => setForm(f => ({ ...f, mission_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MISSION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Lokasjon</Label><Input value={form.location_description} onChange={e => setForm(f => ({ ...f, location_description: e.target.value }))} placeholder="F.eks. Rv83 bru ved Harstad" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pilot</Label>
                  <Select value={form.pilot_id || "none"} onValueChange={v => setForm(f => ({ ...f, pilot_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Velg pilot" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen</SelectItem>
                      {pilots.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Drone</Label>
                  <Select value={form.drone_id || "none"} onValueChange={v => setForm(f => ({ ...f, drone_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Velg drone" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen</SelectItem>
                      {drones.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Dronetid (min) *</Label>
                  <Input type="number" value={form.drone_time_minutes} onChange={e => setForm(f => ({ ...f, drone_time_minutes: e.target.value }))} placeholder="F.eks. 30" />
                </div>
                <div>
                  <Label>Manuell referansetid (min)</Label>
                  <Input type="number" value={form.manual_reference_time_minutes} onChange={e => setForm(f => ({ ...f, manual_reference_time_minutes: e.target.value }))} placeholder="F.eks. 240" />
                </div>
              </div>
              {form.drone_time_minutes && form.manual_reference_time_minutes && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Spart tid: {parseInt(form.manual_reference_time_minutes) - parseInt(form.drone_time_minutes)} min
                    ({((parseInt(form.manual_reference_time_minutes) - parseInt(form.drone_time_minutes)) / 60).toFixed(1)} timer)
                  </span>
                </div>
              )}
              <div><Label>Notater</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              <Button onClick={handleAdd} disabled={saving || !form.flight_date || !form.mission_type} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrer flylogg"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Ingen flylogger registrert enda</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lokasjon</TableHead>
                  <TableHead>Pilot</TableHead>
                  <TableHead className="text-right">Dronetid</TableHead>
                  <TableHead className="text-right">Manuell tid</TableHead>
                  <TableHead className="text-right">Spart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => {
                  const saved = savedMin(log);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{log.flight_date}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{log.mission_type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{log.location_description || "—"}</TableCell>
                      <TableCell className="text-sm">{pilots.find(p => p.id === log.pilot_id)?.name || "—"}</TableCell>
                      <TableCell className="text-right">{log.drone_time_minutes != null ? `${log.drone_time_minutes} min` : "—"}</TableCell>
                      <TableCell className="text-right">{log.manual_reference_time_minutes != null ? `${log.manual_reference_time_minutes} min` : "—"}</TableCell>
                      <TableCell className="text-right">
                        {saved != null ? (
                          <span className={saved > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                            {saved > 0 ? `+${saved} min` : `${saved} min`}
                          </span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
