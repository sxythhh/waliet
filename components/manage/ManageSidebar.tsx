import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  Video, 
  Users, 
  DollarSign, 
  Building2,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface ManageSidebarProps {
  campaigns: Array<{ id: string; title: string; slug: string }>;
  currentCampaign?: { id: string; title: string; slug?: string };
  brandName?: string;
  brandLogo?: string | null;
}

const navItems = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "videos", label: "Videos", icon: Video },
  { id: "users", label: "Users", icon: Users },
  { id: "payouts", label: "Payouts", icon: DollarSign },
];

function SidebarContent({ 
  campaigns, 
  currentCampaign, 
  brandName,
  brandLogo,
  activeTab,
  onTabChange,
  onCampaignChange
}: ManageSidebarProps & { 
  activeTab: string; 
  onTabChange: (id: string) => void;
  onCampaignChange: (slug: string) => void;
}) {
  const { campaignSlug } = useParams();

  return (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-5">
          {brandLogo ? (
            <img 
              src={brandLogo} 
              alt={brandName || "Brand"} 
              className="w-11 h-11 rounded-xl object-cover ring-2 ring-primary/10"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {brandName || "Brand"}
            </p>
            <p className="text-[11px] text-muted-foreground/70">Manager</p>
          </div>
        </div>

        {/* Campaign Selector */}
        {campaigns.length > 0 && (
          <Select value={campaignSlug} onValueChange={onCampaignChange}>
            <SelectTrigger className="w-full bg-muted/40 border-0 h-10 rounded-xl text-sm font-medium hover:bg-muted/60 transition-colors">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-0 shadow-xl rounded-xl">
              {campaigns.map((campaign) => (
                <SelectItem 
                  key={campaign.id} 
                  value={campaign.slug}
                  className="cursor-pointer rounded-lg"
                >
                  {campaign.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 mt-auto">
        <div className="px-3 py-3 rounded-xl bg-muted/30">
          <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide mb-1">
            Current Campaign
          </p>
          <p className="text-xs font-medium text-foreground truncate">
            {currentCampaign?.title}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ManageSidebar({ 
  campaigns, 
  currentCampaign, 
  brandName,
  brandLogo 
}: ManageSidebarProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("analytics");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleCampaignChange = (newSlug: string) => {
    navigate(`/manage/${newSlug}`);
    setMobileOpen(false);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    window.dispatchEvent(new CustomEvent('manage-tab-change', { detail: tabId }));
    setMobileOpen(false);
  };

  // Mobile: Sheet sidebar
  if (isMobile) {
    return (
      <>
        {/* Mobile trigger button */}
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-xl bg-card/80 backdrop-blur-sm shadow-lg"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-card border-0">
              <SidebarContent
                campaigns={campaigns}
                currentCampaign={currentCampaign}
                brandName={brandName}
                brandLogo={brandLogo}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onCampaignChange={handleCampaignChange}
              />
            </SheetContent>
          </Sheet>
        </div>
      </>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside className="w-64 h-screen bg-card/30 backdrop-blur-sm flex flex-col sticky top-0 shrink-0">
      <SidebarContent
        campaigns={campaigns}
        currentCampaign={currentCampaign}
        brandName={brandName}
        brandLogo={brandLogo}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCampaignChange={handleCampaignChange}
      />
    </aside>
  );
}
