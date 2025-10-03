import { LayoutDashboard, Package, GraduationCap, LogOut, DollarSign, Users, TrendingUp, Wallet, BarChart3 } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r border-border bg-card">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      end={item.path === "/admin"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-blue-500 text-white font-semibold hover:bg-blue-600"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
