import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plane, FileText, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { orgId: string; }

export default function OrgResourcesTab({ orgId }: Props) {
  const [pilots, setPilots] = useState<any[]>([]);
  const [drones, setDrones] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [p, d, doc] = await Promise.all([
      supabase.from("pilots").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("org_drones").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("org_documents").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    ]);
    setPilots(p.data || []);
    setDrones(d.data || []);
    setDocs(doc.data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Tabs defaultValue="pilots">
      <TabsList className="mb-4">
        <TabsTrigger value="pilots" className="gap-1.5"><Users className="w-4 h-4" /> Piloter ({pilots.length})</TabsTrigger>
        <TabsTrigger value="drones" className="gap-1.5"><Plane className="w-4 h-4" /> Droner ({drones.length})</TabsTrigger>
        <TabsTrigger value="docs" className="gap-1.5"><FileText className="w-4 h-4" /> Dokumenter ({docs.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pilots"><PilotsList orgId={orgId} pilots={pilots} onRefresh={fetchAll} /></TabsContent>
      <TabsContent value="drones"><DronesList orgId={orgId} drones={drones} onRefresh={fetchAll} /></TabsContent>
      <TabsContent value="docs"><DocsList orgId={orgId} docs={docs} onRefresh={fetchAll} /></TabsContent>
    </Tabs>
  );
}

function PilotsList({ orgId, pilots, onRefresh }: { orgId: string; pilots: any[]; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    const { error } = await supabase.from("pilots").insert([{ ...form, organization_id: orgId }]);
    if (error) toast.error(error.message);
    else { toast.success("Pilot lagt til"); setOpen(false); setForm({ name: "", role: "", phone: "", email: "" }); onRefresh(); }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-display">Piloter</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-3 h-3" /> Ny pilot</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ny pilot</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div><Label>Navn *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Rolle</Label><Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="F.eks. Fjernpilot" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefon</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>E-post</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <Button onClick={handleAdd} disabled={saving || !form.name} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Legg til"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {pilots.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Ingen piloter registrert</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Navn</TableHead><TableHead>Rolle</TableHead><TableHead>Telefon</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {pilots.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.role || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone || "—"}</TableCell>
                  <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status === "active" ? "Aktiv" : "Inaktiv"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DronesList({ orgId, drones, onRefresh }: { orgId: string; drones: any[]; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", model: "", serial_number: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    const { error } = await supabase.from("org_drones").insert([{ ...form, organization_id: orgId }]);
    if (error) toast.error(error.message);
    else { toast.success("Drone lagt til"); setOpen(false); setForm({ name: "", model: "", serial_number: "" }); onRefresh(); }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-display">Droner</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-3 h-3" /> Ny drone</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ny drone</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div><Label>Navn *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="F.eks. Drone Alpha" /></div>
              <div><Label>Modell</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="F.eks. DJI Matrice 350 RTK" /></div>
              <div><Label>Serienummer</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
              <Button onClick={handleAdd} disabled={saving || !form.name} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Legg til"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {drones.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Ingen droner registrert</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Navn</TableHead><TableHead>Modell</TableHead><TableHead>Serienr.</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {drones.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.model || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{d.serial_number || "—"}</TableCell>
                  <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status === "active" ? "Aktiv" : "Inaktiv"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DocsList({ orgId, docs, onRefresh }: { orgId: string; docs: any[]; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", doc_type: "other", file_url: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    const { error } = await supabase.from("org_documents").insert([{ ...form, organization_id: orgId }]);
    if (error) toast.error(error.message);
    else { toast.success("Dokument lagt til"); setOpen(false); setForm({ title: "", doc_type: "other", file_url: "" }); onRefresh(); }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-display">Dokumenter</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-3 h-3" /> Nytt dokument</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nytt dokument</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div><Label>Tittel *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Type</Label><Input value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))} placeholder="ops_manual, sora, tillatelse, annet" /></div>
              <div><Label>URL</Label><Input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} placeholder="https://..." /></div>
              <Button onClick={handleAdd} disabled={saving || !form.title} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Legg til"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Ingen dokumenter</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Tittel</TableHead><TableHead>Type</TableHead><TableHead>Lenke</TableHead></TableRow></TableHeader>
            <TableBody>
              {docs.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{d.doc_type}</Badge></TableCell>
                  <TableCell>{d.file_url ? <a href={d.file_url} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline">Åpne</a> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
