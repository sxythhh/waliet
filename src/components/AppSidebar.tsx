import { Home, DollarSign, User, TrendingUp, Compass } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Campaigns", tab: "campaigns", icon: Home },
  { title: "Discover", tab: "discover", icon: Compass },
  { title: "Wallet", tab: "wallet", icon: DollarSign },
  { title: "Leaderboard", tab: "leaderboard", icon: TrendingUp },
  { title: "Profile", tab: "profile", icon: User },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "campaigns";

  const handleTabClick = (tab: string) => {
    navigate(`/dashboard?tab=${tab}`);
  };

  return (
    <Sidebar className="border-none">
      <SidebarContent className="pt-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = currentTab === item.tab;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleTabClick(item.tab)}
                      isActive={isActive}
                      className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-sidebar-accent"
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
