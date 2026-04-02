import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardCheck, BarChart3, Library, PanelLeft } from "lucide-react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", badge: null },
  { to: "/vurdering", icon: ClipboardCheck, label: "Analyser", badge: null },
  { to: "/resultater", icon: BarChart3, label: "Resultater", badge: null },
  { to: "/bruksomrader", icon: Library, label: "Bruksområder", badge: "37" },
];

/* ─── Context so children can request collapse ─── */
type LayoutSidebarContextType = {
  requestCollapse: () => void;
  requestExpand: () => void;
};

const LayoutSidebarContext = createContext<LayoutSidebarContextType>({
  requestCollapse: () => {},
  requestExpand: () => {},
});

export const useLayoutSidebar = () => useContext(LayoutSidebarContext);

/* ─── Inner sidebar content ─── */
function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-none">
      <SidebarContent
        className="!bg-transparent"
        style={{ background: 'linear-gradient(180deg, #e91e8c 0%, #7c3aed 100%)' }}
      >
        {/* Brand */}
        <div className={cn("p-4 transition-all", collapsed ? "px-2" : "p-6")}>
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-display font-bold text-lg">H</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-display font-bold text-white text-lg leading-tight">Haiko Radar</h1>
                <p className="text-xs text-white/60">Kommuneanalyse for droner</p>
              </div>
            )}
          </Link>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50">Navigasjon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => {
                const active = location.pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "text-white/80 hover:text-white hover:bg-white/10 [&>svg]:text-white/80",
                        active && "bg-white/15 text-white [&>svg]:text-white"
                      )}
                    >
                      <Link to={item.to}>
                        <item.icon className="w-5 h-5" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && !collapsed && (
                          <span className="ml-auto text-[10px] font-bold bg-white/20 text-white rounded-full px-2 py-0.5">{item.badge}</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-auto p-4 m-3">
            <p className="text-xs text-white font-bold">Haiko AS</p>
            <a href="https://haiko.no" target="_blank" rel="noopener" className="text-[11px] text-white/60 hover:text-white/80 transition-colors">haiko.no</a>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  const requestCollapse = useCallback(() => setOpen(false), []);
  const requestExpand = useCallback(() => setOpen(true), []);

  return (
    <LayoutSidebarContext.Provider value={{ requestCollapse, requestExpand }}>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <div className="min-h-screen flex w-full">
          <AppSidebar />

          <div className="flex-1 flex flex-col min-w-0">
            {/* Header with always-visible trigger */}
            <header className="h-12 flex items-center border-b border-border bg-card px-2">
              <SidebarTrigger />
            </header>

            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </LayoutSidebarContext.Provider>
  );
}
