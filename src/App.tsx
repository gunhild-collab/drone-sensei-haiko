import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Assessment from "@/pages/Assessment";
import Results from "@/pages/Results";
import UseCases from "@/pages/UseCases";
import SoraWizard from "@/pages/SoraWizard";
import Auth from "@/pages/Auth";
import OrgPicker from "@/pages/OrgPicker";
import OrgDashboard from "@/pages/OrgDashboard";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Multi-tenant org routes */}
          <Route path="/orgs" element={<AuthGuard><OrgPicker /></AuthGuard>} />
          <Route path="/org/:orgId" element={<AuthGuard><OrgDashboard /></AuthGuard>} />
          
          {/* SORA wizard (public) */}
          <Route path="/sora" element={<SoraWizard />} />
          
          {/* Legacy DMV tool routes */}
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/vurdering" element={<Assessment />} />
                <Route path="/resultater" element={<Results />} />
                <Route path="/bruksomrader" element={<UseCases />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
