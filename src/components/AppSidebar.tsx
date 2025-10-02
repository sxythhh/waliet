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
      <SidebarContent className="pt-0">
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
                      className="py-1 text-[14.4px] font-medium font-instrument data-[active=true]:bg-primary data-[active=true]:text-white hover:bg-sidebar-accent text-[#C0C0C0]"
                    >
                      <item.icon className={`h-[22px] w-[22px] ${isActive ? 'text-white' : 'text-[#6A6A6A]'}`} />
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
