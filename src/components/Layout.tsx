import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardCheck, BarChart3, Library, PanelLeft } from "lucide-react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
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
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/vurdering", icon: ClipboardCheck, label: "Vurdering" },
  { to: "/resultater", icon: BarChart3, label: "Resultater" },
  { to: "/bruksomrader", icon: Library, label: "Bruksområder" },
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
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand */}
        <div className={cn("p-4 transition-all", collapsed ? "px-2" : "p-6")}>
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <span className="text-sidebar-primary-foreground font-display font-bold text-lg">H</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-display font-bold text-sidebar-foreground text-lg leading-tight">Haiko DMV</h1>
                <p className="text-xs text-sidebar-foreground/60">Drone Modenhetsvurdering</p>
              </div>
            )}
          </Link>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigasjon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => {
                const active = location.pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-auto p-4 m-3 rounded-lg bg-sidebar-accent">
            <p className="text-xs text-sidebar-foreground/60">Versjon 1.0</p>
            <p className="text-xs text-sidebar-foreground/40 mt-1">© 2026 Haiko</p>
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
