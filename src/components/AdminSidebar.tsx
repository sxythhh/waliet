import { LayoutDashboard, Package, GraduationCap, LogOut, DollarSign, Users, TrendingUp, Wallet } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
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
];

export function AdminSidebar() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r border-border bg-card">
      <SidebarHeader className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-lg">
            V
          </div>
          <div>
            <span className="text-xl font-bold">VIRALITY</span>
            <div className="text-xs text-muted-foreground">Admin Panel</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
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
