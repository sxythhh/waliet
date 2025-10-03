import { LayoutDashboard, Package, GraduationCap, LogOut, DollarSign, Users, TrendingUp, BarChart3, LineChart } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    path: "/admin",
  },
  {
    title: "Analytics",
    icon: LineChart,
    path: "/admin/analytics",
  },
  {
    title: "Brands",
    icon: Package,
    path: "/admin/brands",
  },
  {
    title: "Campaigns",
    icon: TrendingUp,
    path: "/admin/campaigns",
  },
  {
    title: "Users",
    icon: Users,
    path: "/admin/users",
  },
  {
    title: "Payouts",
    icon: DollarSign,
    path: "/admin/payouts",
  },
  {
    title: "Training Courses",
    icon: GraduationCap,
    path: "/admin/courses",
  },
  {
    title: "Demographics",
    icon: BarChart3,
    path: "/admin/demographics",
  },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 h-screen border-r border-border bg-card flex flex-col sticky top-0">
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.title}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md transition-colors font-medium",
                active
                  ? "bg-blue-500 text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "text-white")} />
              <span className={cn("text-sm font-sans tracking-tight", active && "font-semibold")}>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
