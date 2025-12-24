import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Home, DollarSign, Pencil, Plus, Users, ChevronDown, UserCheck, Video, Copy, Lock } from "lucide-react";
import { CampaignAnalyticsTable } from "@/components/CampaignAnalyticsTable";
import { CampaignCreationWizard } from "@/components/brand/CampaignCreationWizard";
import { CampaignHomeTab } from "@/components/brand/CampaignHomeTab";
import { BoostHomeTab } from "@/components/brand/BoostHomeTab";
import { CampaignApplicationsView } from "@/components/brand/CampaignApplicationsView";
import { VideoSubmissionsTab } from "@/components/brand/VideoSubmissionsTab";
import { EditBountyDialog } from "@/components/brand/EditBountyDialog";
import { TopUpBalanceDialog } from "@/components/brand/TopUpBalanceDialog";
import { AllProgramsAnalytics } from "@/components/brand/AllProgramsAnalytics";
import { AllPayoutsView } from "@/components/brand/AllPayoutsView";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
export type TimeframeOption = "all_time" | "today" | "this_week" | "last_week" | "this_month" | "last_month";
const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  all_time: "All time",
  today: "Today",
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month"
};

// Campaign interface for CPM campaigns
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
  payment_model?: string | null;
  post_rate?: number | null;
}

// Boost interface for bounty campaigns
interface Boost {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  banner_url: string | null;
  status: string;
  is_private: boolean;
  brand_id: string;
  discord_guild_id: string | null;
  budget: number | null;
  budget_used: number | null;
}
interface BrandCampaignDetailViewProps {
  brandId?: string;
  campaignId?: string;
  boostId?: string;
  onBack?: () => void;
}
type DetailTab = "home" | "applications" | "videos" | "creators" | "payouts" | "management";
type EntitySelection = "all" | {
  type: "campaign";
  id: string;
} | {
  type: "boost";
  id: string;
};
export function BrandCampaignDetailView({
  brandId,
  campaignId: propCampaignId,
  boostId: propBoostId,
  onBack
}: BrandCampaignDetailViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [boost, setBoost] = useState<Boost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("home");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("all_time");
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const {
    isAdmin
  } = useAdminCheck();

  // Determine current selection based on props or URL params
  const urlCampaignId = searchParams.get("campaign");
  const urlBoostId = searchParams.get("boost");
  const campaignId = propCampaignId || urlCampaignId || undefined;
  const boostId = propBoostId || urlBoostId || undefined;

  // If brandId is passed without specific campaign/boost, show "All" mode
  const isAllMode = !!brandId && !campaignId && !boostId;
  const isBoost = !!boostId;
  const entityId = isBoost ? boostId : campaignId;
  const entityTitle = isAllMode ? "All Programs" : isBoost ? boost?.title : campaign?.title;
  const entityBrandId = isAllMode ? brandId : isBoost ? boost?.brand_id : campaign?.brand_id;
  useEffect(() => {
    if (isAllMode && brandId) {
      fetchAllCampaignsAndBoosts();
    } else if (isBoost) {
      fetchBoost();
    } else if (campaignId) {
      fetchCampaign();
    }
    fetchPendingApplicationsCount();
  }, [campaignId, boostId, brandId, isAllMode]);
  const fetchAllCampaignsAndBoosts = async () => {
    if (!brandId) return;
    setLoading(true);
    const [campaignsResult, boostsResult] = await Promise.all([supabase.from("campaigns").select("*").eq("brand_id", brandId).order("created_at", {
      ascending: false
    }), supabase.from("bounty_campaigns").select("*").eq("brand_id", brandId).order("created_at", {
      ascending: false
    })]);
    if (campaignsResult.data) setCampaigns(campaignsResult.data);
    if (boostsResult.data) setBoosts(boostsResult.data);
    setLoading(false);
  };
  const fetchCampaign = async () => {
    if (!campaignId) return;
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    if (error) {
      console.error("Error fetching campaign:", error);
    } else {
      setCampaign(data);
      // Also fetch all campaigns/boosts for the dropdown if brand_id exists
      if (data?.brand_id) {
        const [campaignsResult, boostsResult] = await Promise.all([supabase.from("campaigns").select("*").eq("brand_id", data.brand_id).order("created_at", {
          ascending: false
        }), supabase.from("bounty_campaigns").select("*").eq("brand_id", data.brand_id).order("created_at", {
          ascending: false
        })]);
        if (campaignsResult.data) setCampaigns(campaignsResult.data);
        if (boostsResult.data) setBoosts(boostsResult.data);
      }
    }
    setLoading(false);
  };
  const fetchBoost = async () => {
    if (!boostId) return;
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("bounty_campaigns").select("*").eq("id", boostId).single();
    if (error) {
      console.error("Error fetching boost:", error);
    } else {
      setBoost(data);
      // Also fetch all campaigns/boosts for the dropdown
      if (data?.brand_id) {
        const [campaignsResult, boostsResult] = await Promise.all([supabase.from("campaigns").select("*").eq("brand_id", data.brand_id).order("created_at", {
          ascending: false
        }), supabase.from("bounty_campaigns").select("*").eq("brand_id", data.brand_id).order("created_at", {
          ascending: false
        })]);
        if (campaignsResult.data) setCampaigns(campaignsResult.data);
        if (boostsResult.data) setBoosts(boostsResult.data);
      }
    }
    setLoading(false);
  };
  const fetchPendingApplicationsCount = async () => {
    if (isAllMode && brandId) {
      // Count across all campaigns and boosts
      const [campaignCount, boostCount] = await Promise.all([supabase.from("campaign_submissions").select("id, campaigns!inner(brand_id)", {
        count: 'exact',
        head: true
      }).eq("campaigns.brand_id", brandId).eq("status", "pending"), supabase.from("bounty_applications").select("id, bounty_campaigns!inner(brand_id)", {
        count: 'exact',
        head: true
      }).eq("bounty_campaigns.brand_id", brandId).eq("status", "pending")]);
      setPendingApplicationsCount((campaignCount.count || 0) + (boostCount.count || 0));
    } else if (isBoost && boostId) {
      const {
        count
      } = await supabase.from("bounty_applications").select("id", {
        count: 'exact',
        head: true
      }).eq("bounty_campaign_id", boostId).eq("status", "pending");
      setPendingApplicationsCount(count || 0);
    } else if (campaignId) {
      const {
        count
      } = await supabase.from("campaign_submissions").select("id", {
        count: 'exact',
        head: true
      }).eq("campaign_id", campaignId).eq("status", "pending");
      setPendingApplicationsCount(count || 0);
    }
  };
  const handleSelectEntity = (selection: "all" | {
    type: "campaign" | "boost";
    id: string;
  }) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("campaign");
    newParams.delete("boost");
    if (selection !== "all") {
      if (selection.type === "campaign") {
        newParams.set("campaign", selection.id);
      } else {
        newParams.set("boost", selection.id);
      }
    }
    setSearchParams(newParams);
  };
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("campaign");
      newParams.delete("boost");
      setSearchParams(newParams);
    }
  };
  const handleCopyInviteUrl = () => {
    const url = isBoost ? `${window.location.origin}/boost/${boostId}` : `${window.location.origin}/c/${campaign?.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite URL copied to clipboard");
  };

  // Build tabs based on entity type
  const detailTabs: {
    id: DetailTab;
    label: string;
    icon: any;
    count?: number;
  }[] = [{
    id: "home",
    label: "Home",
    icon: Home
  }];

  // Videos tab (not in all mode)
  if (!isAllMode) {
    detailTabs.push({
      id: "videos",
      label: "Videos",
      icon: Video
    });
  }

  // Add applications tab (always available in all mode, or when specific entity allows)
  if (isAllMode || isBoost || campaign?.requires_application !== false) {
    detailTabs.push({
      id: "applications",
      label: "Applications",
      icon: UserCheck,
      count: pendingApplicationsCount
    });
  }

  // Creators tab (admin only, not in all mode)
  if (isAdmin && !isBoost && !isAllMode) {
    detailTabs.push({
      id: "creators",
      label: "Creators",
      icon: Users
    });
  }

  // Payouts tab (for campaigns and all mode, not boosts)
  if (!isBoost) {
    detailTabs.push({
      id: "payouts",
      label: "Payouts",
      icon: DollarSign
    });
  }

  // Skip showing skeleton when swapping between campaigns - content loads fast enough

  if (!isAllMode && !campaign && !boost) {
    return <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          {isBoost ? "Boost" : "Campaign"} not found
        </p>
      </div>;
  }
  return <div className="p-[10px] h-full flex flex-col">
      <div className="flex flex-col h-full border rounded-[20px] overflow-hidden border-[#141414]">
        {/* Header with title and campaign selector */}
        <div className="flex-shrink-0 flex items-center justify-between px-2 sm:px-[5px] py-[10px] bg-background gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {onBack && <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 hover:bg-transparent shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>}
            
            {/* Campaign/Boost Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-lg font-semibold tracking-[-0.5px] flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors">
                  {entityTitle}
                  {isBoost && boost?.is_private && <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/20">
                      Private
                    </Badge>}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 z-50 bg-[#080808]">
                {/* All Programs option */}
                <DropdownMenuItem onClick={() => handleSelectEntity("all")} className={`focus:bg-white/10 focus:text-foreground ${isAllMode ? "bg-white/10" : ""}`}>
                  <span className="font-medium">All Programs</span>
                </DropdownMenuItem>
                
                {(campaigns.length > 0 || boosts.length > 0) && <DropdownMenuSeparator />}
                
                {/* All Programs (Campaigns + Boosts) */}
                <div className="flex flex-col gap-1 py-1">
                  {campaigns.map(c => <DropdownMenuItem key={c.id} onClick={() => handleSelectEntity({
                  type: "campaign",
                  id: c.id
                })} className={`focus:bg-white/5 focus:text-foreground ${campaignId === c.id ? "bg-white/8" : ""}`}>
                      <span className="truncate">{c.title}</span>
                      
                    </DropdownMenuItem>)}
                  {boosts.map(b => <DropdownMenuItem key={b.id} onClick={() => handleSelectEntity({
                  type: "boost",
                  id: b.id
                })} className={`focus:bg-white/5 focus:text-foreground ${boostId === b.id ? "bg-white/8" : ""}`}>
                      <span className="truncate">{b.title}</span>
                      
                    </DropdownMenuItem>)}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Timeframe selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted px-2 sm:px-3">
                  <span className="hidden sm:inline">{TIMEFRAME_LABELS[timeframe]}</span>
                  <span className="sm:hidden text-xs">{TIMEFRAME_LABELS[timeframe].split(' ')[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                {(Object.keys(TIMEFRAME_LABELS) as TimeframeOption[]).map(option => <DropdownMenuItem key={option} className="focus:bg-muted focus:text-foreground" onClick={() => setTimeframe(option)}>
                    {TIMEFRAME_LABELS[option]}
                  </DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit button - only when specific entity selected */}
            {!isAllMode && <Button variant="ghost" size="sm" className="gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted px-2 sm:px-3" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit {isBoost ? "Boost" : "Campaign"}</span>
              </Button>}
          </div>
        </div>

        {/* Campaign Edit Dialog */}
        {campaign?.brand_id && !isBoost && <CampaignCreationWizard brandId={campaign.brand_id} brandName={campaign.brand_name || ""} brandLogoUrl={campaign.brand_logo_url || undefined} campaign={campaign} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={() => {
        fetchCampaign();
        setEditDialogOpen(false);
      }} />}

      {/* Boost Edit Dialog */}
        {isBoost && boost && <EditBountyDialog bountyId={boostId!} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={() => {
        fetchBoost();
        setEditDialogOpen(false);
      }} />}

        {/* Boost Top Up Dialog */}
        {isBoost && boost && <TopUpBalanceDialog boostId={boostId!} boostTitle={boost.title} currentBalance={boost.budget || 0} open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen} onSuccess={fetchBoost} />}

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-border bg-background">
          <nav className="flex gap-0">
            {detailTabs.map(tab => <button key={tab.id} onClick={() => setActiveDetailTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium tracking-[-0.5px] transition-colors border-b-2 ${activeDetailTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && <span className="bg-primary text-primary-foreground text-xs py-0.5 rounded-full px-[7px]">
                    {tab.count}
                  </span>}
              </button>)}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeDetailTab === "home" ? isAllMode && brandId ? <AllProgramsHomeContent brandId={brandId} campaigns={campaigns} boosts={boosts} timeframe={timeframe} /> : isBoost && boost ? <BoostHomeTab boost={boost} timeframe={timeframe} onTopUp={() => setTopUpDialogOpen(true)} /> : campaign?.brand_id ? <CampaignHomeTab campaignId={campaignId!} brandId={campaign.brand_id} timeframe={timeframe} /> : null : activeDetailTab === "applications" ? isAllMode && brandId ? <CampaignApplicationsView brandId={brandId} onApplicationReviewed={fetchPendingApplicationsCount} /> : isBoost ? <CampaignApplicationsView boostId={boostId!} onApplicationReviewed={fetchPendingApplicationsCount} /> : <CampaignApplicationsView campaignId={campaignId!} onApplicationReviewed={fetchPendingApplicationsCount} /> : activeDetailTab === "videos" ? isBoost && boost ? <VideoSubmissionsTab boostId={boostId} monthlyRetainer={boost.monthly_retainer} videosPerMonth={boost.videos_per_month} onSubmissionReviewed={fetchPendingApplicationsCount} /> : campaign ? <VideoSubmissionsTab campaign={campaign} onSubmissionReviewed={fetchPendingApplicationsCount} /> : null : activeDetailTab === "creators" ? <CampaignAnalyticsTable campaignId={campaignId!} view="analytics" className="px-[10px] py-0 pb-[10px]" /> : activeDetailTab === "payouts" ? isAllMode && brandId ? <AllPayoutsView brandId={brandId} /> : <CampaignAnalyticsTable campaignId={campaignId!} view="transactions" className="px-[10px] py-0" /> : null}
        </div>
      </div>
    </div>;
}

// All Programs Home Content - shows aggregated analytics
function AllProgramsHomeContent({
  brandId,
  campaigns,
  boosts,
  timeframe
}: {
  brandId: string;
  campaigns: Campaign[];
  boosts: Boost[];
  timeframe: TimeframeOption;
}) {
  return <AllProgramsAnalytics brandId={brandId} timeframe={timeframe} />;
}
