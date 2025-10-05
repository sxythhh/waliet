import { Airplay, Dock, Scissors, Compass, Users, ArrowUpRight, BellRing } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
const menuItems = [{
  title: "Campaigns",
  tab: "campaigns",
  icon: Airplay
}, {
  title: "Wallet",
  tab: "wallet",
  icon: Dock
}, {
  title: "Discover",
  tab: "discover",
  icon: Compass
}, {
  title: "Notifications",
  tab: "notifications",
  icon: BellRing
}, {
  title: "Referrals",
  tab: "referrals",
  icon: Users
}, {
  title: "Profile",
  tab: "profile",
  icon: Scissors
}];
export function AppSidebar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "campaigns";
  const handleTabClick = (tab: string) => {
    navigate(`/dashboard?tab=${tab}`);
  };
  return <Sidebar className="border-none">
      <SidebarContent className="pt-0 bg-[#0c0c0c]">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => {
              const isActive = currentTab === item.tab;
              return <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton onClick={() => handleTabClick(item.tab)} isActive={isActive} className="h-10 py-2 text-[14.4px] font-medium font-instrument data-[active=true]:bg-primary data-[active=true]:text-white hover:bg-sidebar-accent text-[#C0C0C0]">
                      <item.icon className={`h-[22px] w-[22px] ${isActive ? 'text-white' : 'text-[#6A6A6A]'}`} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>;
            })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t bg-[#0c0c0c]">
        <Button asChild className="w-full gap-2 bg-primary hover:bg-primary/90 text-white font-medium">
          <a href="https://forms.virality.gg/launch" target="_blank" rel="noopener noreferrer">
            <ArrowUpRight className="h-4 w-4" />
            Launch Campaign
          </a>
        </Button>
        
      </SidebarFooter>
    </Sidebar>;
}