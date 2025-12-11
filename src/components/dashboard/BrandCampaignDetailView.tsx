import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Home, Video, DollarSign, Pencil, Plus, Users, ChevronDown } from "lucide-react";
import { CampaignAnalyticsTable } from "@/components/CampaignAnalyticsTable";
import { CampaignCreationWizard } from "@/components/brand/CampaignCreationWizard";
import { VideosTab } from "@/components/brand/VideosTab";
import { CampaignHomeTab } from "@/components/brand/CampaignHomeTab";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TimeframeOption = "today" | "this_week" | "last_week" | "this_month" | "last_month";

const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  today: "Today",
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month",
};
interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  slug: string;
  brand_id: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  guidelines: string | null;
  allowed_platforms: string[];
  application_questions: any;
  embed_url?: string | null;
  preview_url?: string | null;
  analytics_url?: string | null;
  is_private?: boolean;
  access_code?: string | null;
  requires_application?: boolean;
  is_infinite_budget?: boolean;
  is_featured?: boolean;
  campaign_type?: string | null;
  category?: string | null;
  hashtags?: string[] | null;
}
interface BrandCampaignDetailViewProps {
  campaignId: string;
}
type DetailTab = "home" | "videos" | "creators" | "payouts";
export function BrandCampaignDetailView({
  campaignId
}: BrandCampaignDetailViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("home");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("this_month");
  const {
    isAdmin
  } = useAdminCheck();
  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);
  const fetchCampaign = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    if (error) {
      console.error("Error fetching campaign:", error);
    } else {
      setCampaign(data);
    }
    setLoading(false);
  };
  const handleBack = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("campaign");
    setSearchParams(newParams);
  };
  const detailTabs = [{
    id: "home" as DetailTab,
    label: "Home",
    icon: Home
  }, {
    id: "videos" as DetailTab,
    label: "Videos",
    icon: Video
  }, ...(isAdmin ? [{
    id: "creators" as DetailTab,
    label: "Creators",
    icon: Users
  }] : []), {
    id: "payouts" as DetailTab,
    label: "Payouts",
    icon: DollarSign
  }];
  if (loading) {
    return <div className="flex flex-col h-full">
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>;
  }
  if (!campaign) {
    return <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Campaign not found</p>
      </div>;
  }
  return <div className="p-[10px] h-full">
      <div className="flex flex-col h-full border rounded-[20px] overflow-hidden border-[#141414]">
        {/* Header with back button and campaign title */}
        <div className="flex items-center justify-between px-4 border-b border-border sm:px-[5px] py-[10px]">
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 hover:bg-transparent">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <button onClick={handleBack} className="text-lg font-semibold tracking-[-0.5px] hover:underline">
              {campaign.title}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted">
                  {TIMEFRAME_LABELS[timeframe]}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                {(Object.keys(TIMEFRAME_LABELS) as TimeframeOption[]).map((option) => (
                  <DropdownMenuItem
                    key={option}
                    className="focus:bg-muted focus:text-foreground"
                    onClick={() => setTimeframe(option)}
                  >
                    {TIMEFRAME_LABELS[option]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" className="gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit Campaign
            </Button>
            <Button size="sm" className="gap-2 font-sans tracking-[-0.5px]">
              <Plus className="h-3.5 w-3.5" />
              Top Up Budget
            </Button>
          </div>
        </div>

        {campaign.brand_id && <CampaignCreationWizard brandId={campaign.brand_id} brandName={campaign.brand_name || ""} brandLogoUrl={campaign.brand_logo_url || undefined} campaign={campaign} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={() => {
        fetchCampaign();
        setEditDialogOpen(false);
      }} />}

        {/* Tab Navigation - Horizontal bottom style */}
        <div className="border-b border-border">
          <nav className="flex gap-0">
            {detailTabs.map(tab => <button key={tab.id} onClick={() => setActiveDetailTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium tracking-[-0.5px] transition-colors border-b-2 ${activeDetailTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {tab.label}
              </button>)}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeDetailTab === "home" && campaign.brand_id ? <CampaignHomeTab campaignId={campaignId} brandId={campaign.brand_id} timeframe={timeframe} /> : activeDetailTab === "videos" && campaign.brand_id ? <div className="p-4 py-0">
              <VideosTab campaignId={campaignId} brandId={campaign.brand_id} isAdmin={true} approvedCreators={[]} />
            </div> : activeDetailTab === "creators" ? <CampaignAnalyticsTable campaignId={campaignId} view="analytics" className="px-[10px] py-0" /> : <CampaignAnalyticsTable campaignId={campaignId} view="transactions" className="px-[10px] py-0" />}
        </div>
      </div>
    </div>;
}