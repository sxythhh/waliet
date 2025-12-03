import { useState } from "react";
import { LayoutDashboard, Package, LogOut, DollarSign, Users, TrendingUp, Receipt, Menu, X } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const menuItems = [
  { title: "Overview", icon: LayoutDashboard, path: "/admin" },
  { title: "Brands", icon: Package, path: "/admin/brands" },
  { title: "Campaigns", icon: TrendingUp, path: "/admin/campaigns" },
  { title: "Users", icon: Users, path: "/admin/users" },
  { title: "Payouts", icon: DollarSign, path: "/admin/payouts" },
  { title: "Transactions", icon: Receipt, path: "/admin/transactions" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold tracking-tight">Admin</h2>
      </div>
      
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.title}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
          <SheetContent side="left" className="w-64 p-0 bg-card">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="hidden md:flex h-screen w-56 flex-col bg-card sticky top-0">
      <SidebarContent />
    </aside>
  );
}
