import { useState, useEffect } from "react";
import { Menu, BarChart3, Store, UserCircle, CreditCard, Receipt, LogOut, Search, FileText, MessageSquareText, Shield, FileBarChart, UserCog, ClipboardCheck, TrendingUp, Lightbulb, Activity } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminSearchCommand } from "@/components/admin/AdminSearchCommand";
import { useAdminPermissions, type AdminResource } from "@/hooks/useAdminPermissions";

interface MenuItem {
  title: string;
  icon: typeof BarChart3;
  path: string;
  resource?: AdminResource; // Resource to check permission for
}

const menuItems: MenuItem[] = [
  { title: "Overview", icon: BarChart3, path: "/admin", resource: "dashboard" },
  { title: "Analytics", icon: TrendingUp, path: "/admin/analytics", resource: "dashboard" },
  { title: "Creator Insights", icon: Lightbulb, path: "/admin/creator-insights", resource: "users" },
  { title: "Operations", icon: Activity, path: "/admin/operations", resource: "dashboard" },
  { title: "Brands", icon: Store, path: "/admin/brands", resource: "brands" },
  { title: "Users", icon: UserCircle, path: "/admin/users", resource: "users" },
  { title: "Campaign Review", icon: ClipboardCheck, path: "/admin/campaign-review", resource: "brands" },
  { title: "Security", icon: Shield, path: "/admin/security", resource: "security" },
  { title: "Reports", icon: FileBarChart, path: "/admin/reports", resource: "reports" },
  { title: "Feedback", icon: MessageSquareText, path: "/admin/feedback" }, // No specific permission needed
  { title: "Resources", icon: FileText, path: "/admin/resources", resource: "resources" },
  { title: "Payouts", icon: CreditCard, path: "/admin/payouts", resource: "payouts" },
  { title: "Transactions", icon: Receipt, path: "/admin/transactions", resource: "payouts" }, // Same as payouts
  { title: "Permissions", icon: UserCog, path: "/admin/permissions", resource: "permissions" },
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
          <Search className="h-4 w-4 text-muted-foreground" />
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
                "flex items-center gap-2.5 px-3 py-2 text-sm font-inter tracking-[-0.5px] transition-colors rounded-md",
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4" />
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
          <LogOut className="h-4 w-4" />
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
              <Menu className="h-5 w-5" />
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
