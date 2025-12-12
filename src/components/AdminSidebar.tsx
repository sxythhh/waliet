import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminSearchCommand } from "@/components/admin/AdminSearchCommand";

const menuItems = [
  { title: "Overview", icon: "dashboard", path: "/admin" },
  { title: "Brands", icon: "inventory_2", path: "/admin/brands" },
  { title: "Campaigns", icon: "trending_up", path: "/admin/campaigns" },
  { title: "Users", icon: "group", path: "/admin/users" },
  { title: "Payouts", icon: "payments", path: "/admin/payouts" },
  { title: "Transactions", icon: "receipt_long", path: "/admin/transactions" },
];

function MaterialIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span 
      className={cn("material-symbols-rounded", className)}
      style={{ fontSize: 'inherit' }}
    >
      {name}
    </span>
  );
}

function SidebarContent({ onNavigate, onSearchOpen }: { onNavigate?: () => void; onSearchOpen: () => void }) {
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
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="p-4 pb-4">
        <h2 className="text-base font-semibold font-inter tracking-[-0.5px] text-foreground">Dashboard</h2>
      </div>

      {/* Search Bar */}
      <div className="px-3 pb-4">
        <button
          onClick={onSearchOpen}
          className="w-full flex items-center gap-2.5 px-3 py-2 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors text-left"
        >
          <MaterialIcon name="search" className="text-xl text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px] flex-1">Search...</span>
        </button>
      </div>
      
      <nav className="flex-1 px-2">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.title}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-inter tracking-[-0.5px] transition-colors",
                active
                  ? "text-[#2060df] font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-2 mt-auto">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-sm font-inter tracking-[-0.5px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <MaterialIcon name="logout" className="text-xl" />
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
            <SidebarContent onNavigate={() => setOpen(false)} onSearchOpen={() => setSearchOpen(true)} />
          </SheetContent>
        </Sheet>
        <AdminSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      </>
    );
  }

  return (
    <>
      <aside className="hidden md:flex h-screen w-56 flex-col bg-[#0a0a0a] border-r border-[#141414] sticky top-0">
        <SidebarContent onSearchOpen={() => setSearchOpen(true)} />
      </aside>
      <AdminSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
