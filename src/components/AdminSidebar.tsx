import { useState } from "react";
import { LayoutDashboard, Package, GraduationCap, LogOut, DollarSign, Users, TrendingUp, ChevronLeft, ChevronRight, PieChart, Receipt } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
const menuItems = [{
  title: "Overview",
  icon: LayoutDashboard,
  path: "/admin"
}, {
  title: "Brands",
  icon: Package,
  path: "/admin/brands"
}, {
  title: "Campaigns",
  icon: TrendingUp,
  path: "/admin/campaigns"
}, {
  title: "Users",
  icon: Users,
  path: "/admin/users"
}, {
  title: "Payouts",
  icon: DollarSign,
  path: "/admin/payouts"
}, {
  title: "Transactions",
  icon: Receipt,
  path: "/admin/transactions"
}, {
  title: "Training Courses",
  icon: GraduationCap,
  path: "/admin/courses"
}];
export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
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
  return <aside className={cn("h-screen border-r border-border bg-card flex flex-col sticky top-0 transition-all duration-300", isCollapsed ? "w-16" : "w-64")}>
      <nav className="flex-1 p-4 space-y-1 px-[10px]">
        {menuItems.map(item => {
        const active = isActive(item.path);
        return <NavLink key={item.title} to={item.path} className={cn("flex items-center rounded-md transition-colors font-medium hover:bg-muted/50", active ? "text-white" : "text-muted-foreground", isCollapsed ? "justify-center py-3 px-4" : "gap-2 px-3 py-2")} title={isCollapsed ? item.title : undefined}>
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className={cn("text-sm font-sans tracking-tight", active && "font-semibold")}>
                  {item.title}
                </span>}
            </NavLink>;
      })}
      </nav>

      <div className={cn("p-[10px] border-t border-border", isCollapsed ? "flex justify-center" : "flex gap-2")}>
        {!isCollapsed && <Button onClick={handleSignOut} variant="ghost" className="flex-1 justify-start hover:bg-destructive/10 hover:text-destructive" title="Sign Out">
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="ml-3">Sign Out</span>
          </Button>}
        
        <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className={cn("bg-muted/50 hover:bg-muted", isCollapsed ? "h-10 w-10 p-0" : "h-10 w-10 p-0")} title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>;
}