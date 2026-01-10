import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminSearchCommand } from "@/components/admin/AdminSearchCommand";
import { useAdminPermissions, type AdminResource } from "@/hooks/useAdminPermissions";
import {
  Dashboard,
  TrendingUp,
  Storefront,
  People,
  Payments,
  SupportAgent,
  Security,
  Settings,
  Search,
  Logout,
  Menu,
} from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";

interface MenuItem {
  title: string;
  icon: SvgIconComponent;
  path: string;
  resource?: AdminResource;
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", icon: Dashboard, path: "/admin", resource: "dashboard" },
  { title: "Analytics", icon: TrendingUp, path: "/admin/analytics", resource: "dashboard" },
  { title: "Brands", icon: Storefront, path: "/admin/brands", resource: "brands" },
  { title: "Users", icon: People, path: "/admin/users", resource: "users" },
  { title: "Finance", icon: Payments, path: "/admin/finance", resource: "payouts" },
  { title: "Support", icon: SupportAgent, path: "/admin/support", resource: "dashboard" },
  { title: "Security", icon: Security, path: "/admin/security", resource: "security" },
  { title: "Settings", icon: Settings, path: "/admin/settings", resource: "resources" },
];

function SidebarContent({
  onNavigate,
  onSearchOpen,
  hasPermission,
}: {
  onNavigate?: () => void;
  onSearchOpen: () => void;
  hasPermission: (resource: AdminResource, action?: "view" | "edit" | "delete") => boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter((item) => {
    // If no resource is specified, show the item
    if (!item.resource) return true;
    // Check if user has view permission for this resource
    return hasPermission(item.resource, "view");
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Search Bar */}
      <div className="px-3 py-4">
        <button
          onClick={onSearchOpen}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors text-left"
        >
          <Search sx={{ fontSize: 16 }} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px] flex-1">Search...</span>
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {visibleMenuItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.title}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm font-inter tracking-[-0.5px] transition-colors rounded-lg",
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon sx={{ fontSize: 18 }} />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-2 mt-auto">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3 h-9 text-sm font-inter tracking-[-0.5px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Logout sx={{ fontSize: 16 }} />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { hasPermission } = useAdminPermissions();

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm"
            >
              <Menu sx={{ fontSize: 20 }} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-[#0a0a0a] border-r border-[#141414]">
            <SidebarContent
              onNavigate={() => setOpen(false)}
              onSearchOpen={() => setSearchOpen(true)}
              hasPermission={hasPermission}
            />
          </SheetContent>
        </Sheet>
        <AdminSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      </>
    );
  }

  return (
    <>
      <aside className="hidden md:flex h-screen w-60 flex-col bg-[#0a0a0a] border-r border-[#141414] sticky top-0">
        <SidebarContent
          onSearchOpen={() => setSearchOpen(true)}
          hasPermission={hasPermission}
        />
      </aside>
      <AdminSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
