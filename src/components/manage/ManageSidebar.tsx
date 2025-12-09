import { useState } from "react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  Video, 
  Users, 
  DollarSign, 
  ChevronDown,
  Building2,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Campaign {
  id: string;
  title: string;
  slug: string;
  brand_logo_url?: string | null;
}

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

export function ManageSidebar({ 
  campaigns, 
  currentCampaign, 
  brandName,
  brandLogo 
}: ManageSidebarProps) {
  const { campaignSlug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analytics");

  const handleCampaignChange = (newSlug: string) => {
    navigate(`/manage/${newSlug}`);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Dispatch custom event to notify parent
    window.dispatchEvent(new CustomEvent('manage-tab-change', { detail: tabId }));
  };

  return (
    <aside className="w-64 h-screen bg-card/50 border-r border-border/50 flex flex-col sticky top-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3 mb-4">
          {brandLogo ? (
            <img 
              src={brandLogo} 
              alt={brandName || "Brand"} 
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {brandName || "Brand"}
            </p>
            <p className="text-xs text-muted-foreground">Campaign Manager</p>
          </div>
        </div>

        {/* Campaign Selector */}
        {campaigns.length > 0 && (
          <Select value={campaignSlug} onValueChange={handleCampaignChange}>
            <SelectTrigger className="w-full bg-muted/30 border-0 h-9">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border/50">
              {campaigns.map((campaign) => (
                <SelectItem 
                  key={campaign.id} 
                  value={campaign.slug}
                  className="cursor-pointer"
                >
                  {campaign.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <div className="px-3 py-2 text-xs text-muted-foreground/60">
          {currentCampaign?.title}
        </div>
      </div>
    </aside>
  );
}
