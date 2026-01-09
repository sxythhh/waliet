import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Home, DollarSign, Pencil, Plus, Users, ChevronDown, UserCheck, Video, Lock, Link2, FileVideo, Upload, Check } from "lucide-react";
import { CampaignAnalyticsTable } from "@/components/CampaignAnalyticsTable";
import { CampaignWizard } from "@/components/brand/CampaignWizard";
import { CampaignHomeTab } from "@/components/brand/CampaignHomeTab";
import { BoostHomeTab } from "@/components/brand/BoostHomeTab";
import { CampaignApplicationsView } from "@/components/brand/CampaignApplicationsView";
import { VideoSubmissionsTab } from "@/components/brand/VideoSubmissionsTab";
import { CampaignVideosPanel } from "@/components/brand/CampaignVideosPanel";
import { TopUpBalanceDialog } from "@/components/brand/TopUpBalanceDialog";
import { BrandPerformanceDashboard } from "@/components/brand/BrandPerformanceDashboard";
import { AllPayoutsView } from "@/components/brand/AllPayoutsView";
import { PayoutRequestsTable } from "@/components/brand/PayoutRequestsTable";
import { CampaignLinksTab } from "@/components/brand/CampaignLinksTab";
import { ViewBonusesTab } from "@/components/brand/ViewBonusesTab";
import { BrandMessagesTab } from "@/components/brand/BrandMessagesTab";
import { BrandBroadcastsTab } from "@/components/brand/BrandBroadcastsTab";
import { BrandSettingsTab } from "@/components/brand/BrandSettingsTab";
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
  content_distribution?: string | null;
  position_type?: string | null;
  availability_requirement?: string | null;
  work_location?: string | null;
  blueprint_id?: string | null;
  blueprint_embed_url?: string | null;
  tags?: string[] | null;
  application_questions?: any;
  discord_role_id?: string | null;
  shortimize_collection_name?: string | null;
  view_bonuses_enabled?: boolean | null;
}
interface BrandCampaignDetailViewProps {
  brandId?: string;
  campaignId?: string;
  boostId?: string;
  onBack?: () => void;
}
type DetailTab = "home" | "applications" | "videos" | "creators" | "payouts" | "links" | "settings" | "rules" | "management" | "messages" | "broadcasts";
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
  const [hasDubIntegration, setHasDubIntegration] = useState(false);
  useEffect(() => {
    const subtab = searchParams.get("subtab");
    if (subtab === "home" || subtab === "applications" || subtab === "videos" || subtab === "creators" || subtab === "payouts" || subtab === "links" || subtab === "messages" || subtab === "broadcasts" || subtab === "settings" || subtab === "rules") {
      setActiveDetailTab(subtab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
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

  // Check if brand has Dub integration configured
  useEffect(() => {
    const checkDubIntegration = async () => {
      const checkBrandId = entityBrandId || brandId;
      if (!checkBrandId) return;
      const {
        data
      } = await supabase.from("brands").select("dub_api_key").eq("id", checkBrandId).single();
      setHasDubIntegration(!!data?.dub_api_key);
    };
    checkDubIntegration();
  }, [entityBrandId, brandId]);
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
    count?: number;
  }[] = [{
    id: "home",
    label: "Home"
  }];

  // Videos tab (not in all mode)
  if (!isAllMode) {
    detailTabs.push({
      id: "videos",
      label: "Videos"
    });
  }

  // Add applications tab (always available in all mode, or when specific entity allows)
  if (isAllMode || isBoost || campaign?.requires_application !== false) {
    detailTabs.push({
      id: "applications",
      label: "Applications",
      count: pendingApplicationsCount
    });
  }

  // Creators tab (admin only, not in all mode)
  if (isAdmin && !isBoost && !isAllMode) {
    detailTabs.push({
      id: "creators",
      label: "Creators"
    });
  }

  // Payouts tab (for campaigns and boosts only, not in all mode)
  if (!isAllMode) {
    detailTabs.push({
      id: "payouts",
      label: "Payouts"
    });
  }

  // Links tab (not in all mode, only if Dub is configured)
  if (!isAllMode && hasDubIntegration) {
    detailTabs.push({
      id: "links",
      label: "Links"
    });
  }

  // Settings tab (only in all mode - contains Discord, Balance, Milestones, Tiers)
  if (isAllMode && brandId) {
    detailTabs.push({
      id: "settings",
      label: "Settings"
    });
  }

  // Skip showing skeleton when swapping between campaigns - content loads fast enough

  if (!isAllMode && !campaign && !boost && !loading) {
    return <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          {isBoost ? "Boost" : "Campaign"} not found
        </p>
      </div>;
  }
  return <div className="p-0 md:p-[10px] h-full flex flex-col">
      <div className="flex flex-col h-full border md:rounded-[20px] rounded-none overflow-hidden border-border dark:border-[#141414]">
        {/* Header with title and campaign selector */}
        <div className="flex-shrink-0 flex items-center justify-between px-2 bg-background gap-2 sm:px-[15px] py-[8px]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {onBack && <Button variant="ghost" size="icon" aria-label="Go back" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>}
            {/* Campaign/Boost Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group text-lg font-semibold tracking-[-0.5px] flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-150 hover:bg-muted/60 dark:hover:bg-[#0d0d0d]">
                  {entityTitle}
                  {isBoost && boost?.is_private && <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/20">
                      Private
                    </Badge>}
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 z-50 bg-white dark:bg-[#080808] rounded-xl shadow-xl dark:shadow-2xl dark:shadow-black/50 p-1.5">
                {/* All Programs option */}
                <DropdownMenuItem
                  onClick={() => handleSelectEntity("all")}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    isAllMode
                      ? "bg-primary/10 dark:bg-primary/15 text-primary"
                      : "hover:bg-muted/60 dark:hover:bg-[#0d0d0d]"
                  }`}
                >
                  <span className="font-medium flex-1">All Programs</span>
                  {isAllMode && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>

                {(campaigns.length > 0 || boosts.length > 0) && (
                  <div className="h-px bg-white/5 my-1.5 mx-2" />
                )}

                {/* Campaigns & Boosts list */}
                <div className="flex flex-col gap-0.5">
                  {campaigns.map(c => {
                    const isSelected = campaignId === c.id;
                    return (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => handleSelectEntity({ type: "campaign", id: c.id })}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "bg-primary/10 dark:bg-primary/15 text-primary"
                            : "hover:bg-muted/60 dark:hover:bg-[#0d0d0d]"
                        }`}
                      >
                        <span className="truncate flex-1">{c.title}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  {boosts.map(b => {
                    const isSelected = boostId === b.id;
                    return (
                      <DropdownMenuItem
                        key={b.id}
                        onClick={() => handleSelectEntity({ type: "boost", id: b.id })}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "bg-primary/10 dark:bg-primary/15 text-primary"
                            : "hover:bg-muted/60 dark:hover:bg-[#0d0d0d]"
                        }`}
                      >
                        <span className="truncate flex-1">{b.title}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Timeframe selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted/50 hover:text-current px-2 sm:px-3 border border-border dark:border-transparent">
                  <span className="hidden sm:inline">{TIMEFRAME_LABELS[timeframe]}</span>
                  <span className="sm:hidden text-xs">{TIMEFRAME_LABELS[timeframe].split(' ')[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 bg-white dark:bg-[#080808] border-border dark:border-[#1f1f1f]">
                {(Object.keys(TIMEFRAME_LABELS) as TimeframeOption[]).map(option => <DropdownMenuItem key={option} onClick={() => setTimeframe(option)}>
                    {TIMEFRAME_LABELS[option]}
                  </DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit button - only when specific entity selected */}
            {!isAllMode && <Button variant="ghost" size="sm" className="gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted/50 hover:text-current px-2 sm:px-3 border border-border dark:border-transparent" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit {isBoost ? "Boost" : "Campaign"}</span>
              </Button>}

          </div>
        </div>

        {/* Campaign/Boost Edit Dialog */}
        {campaign?.brand_id && <CampaignWizard
          brandId={campaign.brand_id}
          brandName={campaign.brand_name || ""}
          brandLogoUrl={campaign.brand_logo_url || undefined}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          mode="edit"
          campaignId={!isBoost ? campaign.id : undefined}
          boostId={isBoost && boostId ? boostId : undefined}
          initialType={isBoost ? "boost" : "cpm"}
          onSuccess={() => {
            if (isBoost) fetchBoost();
            else fetchCampaign();
            setEditDialogOpen(false);
          }}
        />}

        {/* Boost Top Up Dialog */}
        {isBoost && boost && <TopUpBalanceDialog boostId={boostId!} boostTitle={boost.title} currentBalance={boost.budget || 0} open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen} onSuccess={fetchBoost} />}

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-border bg-background">
          <nav className="flex gap-0 px-0">
            {detailTabs.map(tab => <button key={tab.id} onClick={() => {
            setActiveDetailTab(tab.id);
            const newParams = new URLSearchParams(searchParams);
            newParams.set("subtab", tab.id);
            setSearchParams(newParams);
          }} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium tracking-[-0.5px] transition-colors border-b-2 ${activeDetailTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && <span className="bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {tab.count}
                  </span>}
              </button>)}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeDetailTab === "home" ? isAllMode && brandId ? <AllProgramsHomeContent brandId={brandId} timeframe={timeframe} /> : isBoost && boost ? <BoostHomeTab boost={boost} timeframe={timeframe} onTopUp={() => setTopUpDialogOpen(true)} /> : campaign?.brand_id ? <CampaignHomeTab campaignId={campaignId!} brandId={campaign.brand_id} timeframe={timeframe} /> : null : activeDetailTab === "applications" ? isAllMode && brandId ? <CampaignApplicationsView brandId={brandId} onApplicationReviewed={fetchPendingApplicationsCount} /> : isBoost ? <CampaignApplicationsView boostId={boostId!} onApplicationReviewed={fetchPendingApplicationsCount} /> : <CampaignApplicationsView campaignId={campaignId!} onApplicationReviewed={fetchPendingApplicationsCount} /> : activeDetailTab === "videos" ? isBoost && boost ? <VideoSubmissionsTab boostId={boostId} monthlyRetainer={boost.monthly_retainer} videosPerMonth={boost.videos_per_month} onSubmissionReviewed={fetchPendingApplicationsCount} /> : campaign && campaign.brand_id ? <VideoSubmissionsTab campaign={{
          ...campaign,
          hashtags: campaign.hashtags || []
        }} onSubmissionReviewed={fetchPendingApplicationsCount} /> : null : activeDetailTab === "creators" ? <CampaignAnalyticsTable campaignId={campaignId!} view="analytics" className="px-[10px] py-0 pb-[10px]" /> : activeDetailTab === "payouts" ? isBoost && boostId ? <div className="px-[10px] py-0"><PayoutRequestsTable boostId={boostId} /></div> : campaignId ? <CampaignAnalyticsTable campaignId={campaignId} view="transactions" className="px-[10px] py-0" /> : null : activeDetailTab === "links" ? entityBrandId ? <CampaignLinksTab brandId={entityBrandId} campaignId={campaignId} boostId={boostId} /> : null : activeDetailTab === "settings" ? isAllMode && brandId ? <BrandSettingsTab brandId={brandId} /> : null : null}
        </div>
      </div>
    </div>;
}

// All Programs Home Content - shows aggregated analytics
function AllProgramsHomeContent({
  brandId,
  timeframe
}: {
  brandId: string;
  timeframe: TimeframeOption;
}) {
  return <BrandPerformanceDashboard brandId={brandId} timeframe={timeframe} />;
}