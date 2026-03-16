import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations, type Organization } from "@/hooks/useOrganizations";
import { toast } from "sonner";

export default function OrgPicker() {
  const { user, signOut } = useAuth();
  const { orgs, loading, createOrg, refetch } = useOrganizations(user?.id);
  const navigate = useNavigate();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"municipality" | "iks">("municipality");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const org = await createOrg(newName.trim(), newType);
      toast.success(`Organisasjon "${org.name}" opprettet`);
      setDialogOpen(false);
      setNewName("");
      navigate(`/org/${org.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const selectOrg = (org: Organization) => {
    navigate(`/org/${org.id}`);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Mine organisasjoner</h1>
            <p className="text-sm text-muted-foreground mt-1">Velg organisasjon for å se dashboard</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" /> Logg ut
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {orgs.map(org => (
              <Card key={org.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => selectOrg(org)}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{org.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{org.org_type === "iks" ? "IKS" : "Kommune"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {orgs.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-8 text-center">
                  <Building2 className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Du er ikke medlem av noen organisasjon enda.</p>
                  <p className="text-sm text-muted-foreground">Opprett din første organisasjon for å komme i gang.</p>
                </CardContent>
              </Card>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 mt-4">
                  <Plus className="w-4 h-4" /> Opprett ny organisasjon
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Ny organisasjon</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Navn</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="F.eks. Tromsø kommune" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={v => setNewType(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="municipality">Kommune</SelectItem>
                        <SelectItem value="iks">IKS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full">
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Opprett
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
