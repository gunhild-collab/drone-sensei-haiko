import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Package, Plane, TrendingUp, Loader2 } from "lucide-react";
import OrgReportTab from "@/components/org/OrgReportTab";
import OrgResourcesTab from "@/components/org/OrgResourcesTab";
import OrgFlightLogsTab from "@/components/org/OrgFlightLogsTab";
import OrgGainsTab from "@/components/org/OrgGainsTab";

export default function OrgDashboard() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("organizations").select("*").eq("id", orgId).single()
      .then(({ data }) => { setOrg(data); setLoading(false); });
  }, [orgId]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!org) return <div className="p-8 text-center text-muted-foreground">Organisasjon ikke funnet</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/orgs">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-foreground">{org.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">{org.org_type === "iks" ? "IKS" : "Kommune"}</p>
          </div>
        </div>
      </div>

      {/* Dashboard tabs */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="report">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="report" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="w-4 h-4 hidden sm:inline" /> Rapport
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-1.5 text-xs sm:text-sm">
              <Package className="w-4 h-4 hidden sm:inline" /> Ressurser
            </TabsTrigger>
            <TabsTrigger value="flightlogs" className="gap-1.5 text-xs sm:text-sm">
              <Plane className="w-4 h-4 hidden sm:inline" /> Flylogger
            </TabsTrigger>
            <TabsTrigger value="gains" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4 hidden sm:inline" /> Økonomi
            </TabsTrigger>
          </TabsList>
          <TabsContent value="report"><OrgReportTab org={org} /></TabsContent>
          <TabsContent value="resources"><OrgResourcesTab orgId={org.id} /></TabsContent>
          <TabsContent value="flightlogs"><OrgFlightLogsTab orgId={org.id} /></TabsContent>
          <TabsContent value="gains"><OrgGainsTab org={org} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
