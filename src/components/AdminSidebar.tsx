import { LayoutDashboard, Package, GraduationCap, LogOut, DollarSign, Users, TrendingUp, Wallet, BarChart3 } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
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
    title: "Wallets",
    icon: Wallet,
    path: "/admin/wallets",
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
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.title}>
                    <NavLink
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium w-full",
                        active
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5", active && "text-white")} />
                      <span className={cn(active && "font-semibold")}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
