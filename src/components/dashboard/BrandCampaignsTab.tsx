import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateBountyDialog } from "@/components/brand/CreateBountyDialog";
import { CreateCampaignTypeDialog } from "@/components/brand/CreateCampaignTypeDialog";
import { CampaignCreationWizard, CampaignTemplate } from "@/components/brand/CampaignCreationWizard";
import { EditBountyDialog } from "@/components/brand/EditBountyDialog";
import { BountyCampaignsView } from "@/components/brand/BountyCampaignsView";
import { BrandCampaignDetailView } from "@/components/dashboard/BrandCampaignDetailView";
import { SubscriptionGateDialog } from "@/components/brand/SubscriptionGateDialog";
import { CampaignRowCard } from "@/components/brand/CampaignRowCard";
import { AllocateBudgetDialog } from "@/components/brand/AllocateBudgetDialog";
import { CreateJobPostDialog } from "@/components/brand/CreateJobPostDialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { GlobalBrandSearch } from "@/components/brand/GlobalBrandSearch";
import { BrandOnboardingSteps } from "@/components/brand/BrandOnboardingSteps";
import schoolIcon from "@/assets/school-icon-grey.svg";
import webStoriesIcon from "@/assets/web-stories-card-icon.svg";
import scopeIcon from "@/assets/scope-inactive.svg";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
type CampaignStatusFilter = "all" | "active" | "draft" | "ended";
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
  created_at: string;
  guidelines: string | null;
  allowed_platforms: string[] | null;
  application_questions: any[];
}
interface CampaignMember {
  id: string;
  avatar_url?: string | null;
  display_name?: string;
  full_name?: string | null;
  username?: string | null;
}
interface BountyCampaign {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  status: string;
  created_at: string;
  budget: number | null;
  budget_used: number | null;
  slug: string | null;
}
interface BrandCampaignsTabProps {
  brandId: string;
  brandName: string;
}
export function BrandCampaignsTab({
  brandId,
  brandName
}: BrandCampaignsTabProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [bounties, setBounties] = useState<BountyCampaign[]>([]);
  const [campaignMembers, setCampaignMembers] = useState<Record<string, CampaignMember[]>>({});
  const [bountyMembers, setBountyMembers] = useState<Record<string, CampaignMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [bountyToDelete, setBountyToDelete] = useState<BountyCampaign | null>(null);
  const [createBountyOpen, setCreateBountyOpen] = useState(false);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | undefined>(undefined);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | undefined>(undefined);
  const [brandColor, setBrandColor] = useState<string | undefined>(undefined);
  const [selectedBoostId, setSelectedBoostId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionGateOpen, setSubscriptionGateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>("all");
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [campaignTypeDialogOpen, setCampaignTypeDialogOpen] = useState(false);
  const [createJobPostOpen, setCreateJobPostOpen] = useState(false);
  const [allocateBudgetOpen, setAllocateBudgetOpen] = useState(false);
  const [selectedCampaignForFunding, setSelectedCampaignForFunding] = useState<{
    id: string;
    type: 'campaign' | 'boost';
  } | null>(null);
  const [editCampaignOpen, setEditCampaignOpen] = useState(false);
  const [editBoostOpen, setEditBoostOpen] = useState(false);
  const [selectedCampaignForEdit, setSelectedCampaignForEdit] = useState<Campaign | null>(null);
  const [selectedBoostForEdit, setSelectedBoostForEdit] = useState<string | null>(null);
  const {
    isAdmin,
    loading: adminLoading
  } = useAdminCheck();
  const {
    resolvedTheme
  } = useTheme();

  // Removed beta gate - brands without subscription can create drafts
  const showBetaGate = false;
  const handleBackToCreator = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("workspace", "creator");
    newParams.delete("tab");
    setSearchParams(newParams);
  };
  useEffect(() => {
    fetchBrandData();
  }, [brandId]);
  const fetchBrandData = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      // Fetch brand info for logo, color and subscription status
      const {
        data: brandData
      } = await supabase.from("brands").select("logo_url, brand_color, subscription_status, subscription_plan").eq("id", brandId).single();
      if (brandData?.logo_url) {
        setBrandLogoUrl(brandData.logo_url);
      }
      if (brandData?.brand_color) {
        setBrandColor(brandData.brand_color);
      }
      setSubscriptionStatus(brandData?.subscription_status || null);
      setSubscriptionPlan(brandData?.subscription_plan || null);

      // Fetch campaigns
      const {
        data: campaignsData,
        error: campaignsError
      } = await supabase.from("campaigns").select("*").eq("brand_id", brandId).order("created_at", {
        ascending: false
      });
      if (campaignsError) throw campaignsError;

      // Fetch bounties
      const {
        data: bountiesData,
        error: bountiesError
      } = await supabase.from("bounty_campaigns").select("*").eq("brand_id", brandId).order("created_at", {
        ascending: false
      });
      if (bountiesError) throw bountiesError;
      console.log("Fetched bounties:", bountiesData);

      // Fetch actual payouts from submission_payout_items
      const campaignIds = (campaignsData || []).map(c => c.id);
      const bountyIds = (bountiesData || []).map(b => b.id);
      const allSourceIds = [...campaignIds, ...bountyIds];
      let payoutsBySource: Record<string, number> = {};
      if (allSourceIds.length > 0) {
        const {
          data: payoutItems
        } = await supabase.from("submission_payout_items").select("source_id, amount, status").in("source_id", allSourceIds).in("status", ["approved", "completed", "clearing", "pending"]);

        // Aggregate payouts by source_id
        (payoutItems || []).forEach((item: any) => {
          if (!payoutsBySource[item.source_id]) {
            payoutsBySource[item.source_id] = 0;
          }
          payoutsBySource[item.source_id] += item.amount;
        });
      }

      // Parse application_questions from JSON to array and add actual budget_used
      const parsedCampaigns = (campaignsData || []).map(campaign => ({
        ...campaign,
        application_questions: Array.isArray(campaign.application_questions) ? campaign.application_questions : [],
        budget_used: payoutsBySource[campaign.id] || campaign.budget_used || 0
      })) as Campaign[];
      setCampaigns(parsedCampaigns);

      // Update bounties with actual payouts
      const parsedBounties = (bountiesData || []).map(bounty => ({
        ...bounty,
        budget_used: payoutsBySource[bounty.id] || bounty.budget_used || 0
      })) as BountyCampaign[];
      setBounties(parsedBounties);

      // Fetch pending applications count for campaigns
      let totalPending = 0;

      // Fetch campaign members (approved submissions with profile data)
      if (campaignIds.length > 0) {
        const {
          data: campaignSubmissions
        } = await supabase.from("campaign_submissions").select("campaign_id, creator_id, profiles:creator_id(id, avatar_url, full_name, username)").in("campaign_id", campaignIds).eq("status", "approved");

        // Group members by campaign_id
        const membersByCampaign: Record<string, CampaignMember[]> = {};
        (campaignSubmissions || []).forEach((sub: any) => {
          if (!membersByCampaign[sub.campaign_id]) {
            membersByCampaign[sub.campaign_id] = [];
          }
          if (sub.profiles) {
            membersByCampaign[sub.campaign_id].push({
              id: sub.profiles.id,
              avatar_url: sub.profiles.avatar_url,
              display_name: sub.profiles.full_name || sub.profiles.username || ''
            });
          }
        });
        setCampaignMembers(membersByCampaign);
      }

      // Fetch bounty members (approved applications with profile data)
      if (bountyIds.length > 0) {
        const {
          data: bountyApps
        } = await supabase.from("bounty_applications").select("bounty_campaign_id, user_id, profiles:user_id(id, avatar_url, full_name, username)").in("bounty_campaign_id", bountyIds).eq("status", "approved");

        // Group members by bounty_campaign_id
        const membersByBounty: Record<string, CampaignMember[]> = {};
        (bountyApps || []).forEach((app: any) => {
          if (!membersByBounty[app.bounty_campaign_id]) {
            membersByBounty[app.bounty_campaign_id] = [];
          }
          if (app.profiles) {
            membersByBounty[app.bounty_campaign_id].push({
              id: app.profiles.id,
              avatar_url: app.profiles.avatar_url,
              display_name: app.profiles.full_name || app.profiles.username || ''
            });
          }
        });
        setBountyMembers(membersByBounty);
      }

      // Count pending campaign submissions
      if (campaignIds.length > 0) {
        const {
          count: campaignPending
        } = await supabase.from("campaign_submissions").select("*", {
          count: "exact",
          head: true
        }).in("campaign_id", campaignIds).eq("status", "pending");
        totalPending += campaignPending || 0;
      }

      // Count pending bounty applications
      if (bountyIds.length > 0) {
        const {
          count: bountyPending
        } = await supabase.from("bounty_applications").select("*", {
          count: "exact",
          head: true
        }).in("bounty_campaign_id", bountyIds).eq("status", "pending");
        totalPending += bountyPending || 0;
      }
      setPendingApplicationsCount(totalPending);
    } catch (error) {
      console.error("Error fetching brand data:", error);
      toast.error("Failed to load brand data");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };
  const handleDeleteBountyClick = (bounty: BountyCampaign) => {
    setBountyToDelete(bounty);
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (campaignToDelete) {
      try {
        const {
          error
        } = await supabase.from("campaigns").delete().eq("id", campaignToDelete.id);
        if (error) throw error;
        toast.success("Campaign deleted");
        fetchBrandData();
      } catch (error) {
        toast.error("Failed to delete campaign");
      } finally {
        setDeleteDialogOpen(false);
        setCampaignToDelete(null);
      }
    } else if (bountyToDelete) {
      try {
        const {
          error
        } = await supabase.from("bounty_campaigns").delete().eq("id", bountyToDelete.id);
        if (error) throw error;
        toast.success("Bounty deleted");
        fetchBrandData();
      } catch (error) {
        toast.error("Failed to delete bounty");
      } finally {
        setDeleteDialogOpen(false);
        setBountyToDelete(null);
      }
    }
  };
  const handleCampaignClick = (campaign: Campaign) => {
    // Navigate to analytics tab for this campaign
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "analytics");
    newParams.set("campaign", campaign.id);
    setSearchParams(newParams);
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      const { data: clonedCampaign, error } = await supabase
        .from('campaigns')
        .insert({
          title: `${campaign.title} (Copy)`,
          description: campaign.description,
          brand_id: brandId,
          rpm_rate: campaign.rpm_rate,
          banner_url: campaign.banner_url,
          allowed_platforms: campaign.allowed_platforms,
          status: 'draft',
          budget: 0,
          budget_used: 0
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Campaign duplicated as draft');
      fetchBrandData();
    } catch (error) {
      toast.error('Failed to duplicate campaign');
    }
  };

  const handleDuplicateBounty = async (bounty: BountyCampaign) => {
    try {
      const { data: clonedBoost, error: cloneError } = await supabase
        .from('bounty_campaigns')
        .insert({
          title: `${bounty.title} (Copy)`,
          description: bounty.description,
          brand_id: brandId,
          monthly_retainer: bounty.monthly_retainer,
          videos_per_month: bounty.videos_per_month,
          content_style_requirements: bounty.content_style_requirements,
          max_accepted_creators: bounty.max_accepted_creators,
          content_distribution: bounty.content_distribution,
          position_type: bounty.position_type,
          availability_requirement: bounty.availability_requirement,
          work_location: bounty.work_location,
          banner_url: bounty.banner_url,
          blueprint_id: bounty.blueprint_id,
          blueprint_embed_url: bounty.blueprint_embed_url,
          is_private: bounty.is_private,
          tags: bounty.tags,
          application_questions: bounty.application_questions,
          discord_guild_id: bounty.discord_guild_id,
          discord_role_id: bounty.discord_role_id,
          shortimize_collection_name: bounty.shortimize_collection_name,
          view_bonuses_enabled: bounty.view_bonuses_enabled,
          status: 'draft',
          budget: 0,
          budget_used: 0,
          accepted_creators_count: 0
        })
        .select()
        .single();

      if (cloneError) throw cloneError;

      // Copy view bonuses if enabled
      if (bounty.view_bonuses_enabled && clonedBoost) {
        const { data: bonuses } = await supabase
          .from('boost_view_bonuses')
          .select('*')
          .eq('bounty_campaign_id', bounty.id);

        if (bonuses && bonuses.length > 0) {
          await supabase
            .from('boost_view_bonuses')
            .insert(
              bonuses.map(b => ({
                bounty_campaign_id: clonedBoost.id,
                bonus_type: b.bonus_type,
                view_threshold: b.view_threshold,
                bonus_amount: b.bonus_amount,
                min_views: b.min_views,
                cpm_rate: b.cpm_rate,
                is_active: b.is_active
              }))
            );
        }
      }

      toast.success('Boost duplicated as draft');
      fetchBrandData();
    } catch (error) {
      toast.error('Failed to duplicate boost');
    }
  };

  const handlePauseBounty = async (bounty: BountyCampaign) => {
    const newStatus = bounty.status === 'paused' ? 'active' : 'paused';

    try {
      // Handle pausing - auto-waitlist pending applications
      if (newStatus === 'paused') {
        await supabase
          .from('bounty_applications')
          .update({
            status: 'waitlisted',
            auto_waitlisted_from_pause: true
          })
          .eq('bounty_campaign_id', bounty.id)
          .eq('status', 'pending');
      }

      // Handle resuming - restore auto-waitlisted applications
      if (newStatus === 'active') {
        await supabase
          .from('bounty_applications')
          .update({
            status: 'pending',
            auto_waitlisted_from_pause: false
          })
          .eq('bounty_campaign_id', bounty.id)
          .eq('auto_waitlisted_from_pause', true);
      }

      const { error } = await supabase
        .from('bounty_campaigns')
        .update({ status: newStatus })
        .eq('id', bounty.id);

      if (error) throw error;
      toast.success(newStatus === 'paused' ? 'Boost paused' : 'Boost resumed');
      fetchBrandData();
    } catch (error) {
      toast.error('Failed to update boost status');
    }
  };
  if (loading) {
    return (
      <div className="space-y-8 px-4 sm:px-6 md:px-8 py-6 animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="h-10 w-full max-w-md bg-muted/30 rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-muted/30 rounded-lg animate-pulse shrink-0 ml-4" />
        </div>

        {/* Section Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-muted/30 rounded-md animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-7 w-16 bg-muted/30 rounded-full animate-pulse" />)}
          </div>
        </div>

        {/* Campaign Cards Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col sm:flex-row rounded-xl overflow-hidden bg-card">
              <div className="w-full sm:w-40 md:w-48 h-28 sm:h-auto bg-muted/30 flex-shrink-0 animate-pulse" />
              <div className="flex-1 p-3 sm:p-4 space-y-2">
                <div className="h-3 w-16 bg-muted/30 rounded animate-pulse" />
                <div className="h-5 w-48 bg-muted/30 rounded animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="h-3 w-24 bg-muted/30 rounded animate-pulse" />
                  <div className="h-1.5 w-32 bg-muted/30 rounded-full animate-pulse" />
                  <div className="h-3 w-8 bg-muted/30 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-muted/30 rounded-full animate-pulse" />
                  <div className="h-3 w-24 bg-muted/30 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget), 0) + bounties.reduce((sum, b) => sum + Number(b.budget || 0), 0);
  const totalUsed = campaigns.reduce((sum, c) => sum + Number(c.budget_used || 0), 0) + bounties.reduce((sum, b) => sum + Number(b.budget_used || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  return <div className={`relative ${selectedBoostId ? "h-full flex flex-col" : "space-y-6 px-4 sm:px-6 md:px-8 py-6"}`}>
      {/* Beta Gate Overlay for non-admin users with inactive subscription */}
      {showBetaGate && <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-background/80">
          <div className="text-center space-y-6 max-w-md mx-auto px-6">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <img src="/beta-shield-icon.svg" alt="Beta" className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-inter tracking-[-0.5px] text-foreground">
                This Feature is still in BETA
              </h2>
              <p className="text-muted-foreground font-inter tracking-[-0.5px]">
                Come back soon.
              </p>
            </div>
            <Button onClick={handleBackToCreator} className="px-6">
              Back to Creator Dashboard
            </Button>
          </div>
        </div>}

      {selectedBoostId ? <BrandCampaignDetailView boostId={selectedBoostId} onBack={() => setSelectedBoostId(null)} /> : <>
          {/* Header */}
          <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <GlobalBrandSearch brandId={brandId} />
            </div>
            <Button onClick={() => setCampaignTypeDialogOpen(true)} size="sm" className="gap-2 text-white border-t border-t-[#4b85f7] font-inter font-medium text-sm tracking-[-0.5px] rounded-[10px] bg-[#2060df] py-1.5 hover:bg-[#1a50c8] shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Launch Opportunity</span>
              <span className="sm:hidden">Launch</span>
            </Button>
            <CreateCampaignTypeDialog brandId={brandId} subscriptionPlan={subscriptionPlan} open={campaignTypeDialogOpen} onOpenChange={setCampaignTypeDialogOpen} onSelectClipping={(blueprintId, template) => {
          setSelectedTemplate(template);
          setCreateCampaignOpen(true);
        }} onSelectManaged={() => {
          setCreateBountyOpen(true);
        }} onSelectBoost={() => {
          setCreateBountyOpen(true);
        }} onSelectJobPost={() => {
          setCreateJobPostOpen(true);
        }} />
          </div>

          {/* Subscription CTA Embed - Only show in dark mode */}
          <div className="hidden dark:block w-full h-[440px] sm:h-[250px] rounded-xl overflow-hidden mt-4">
            <iframe src="https://join.virality.gg/pickplan-4" className="w-full h-full border-0" title="Pick Plan" />
          </div>

          {/* Combined Campaigns & Boosts Grid */}
          {(campaigns.length > 0 || bounties.length > 0) && <div className="space-y-3 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-lg font-semibold font-['Inter'] tracking-[-0.5px]">Programs</h2>
                <div className="flex items-center gap-0 border-b border-border">
                  {(["all", "active", "draft", "ended"] as CampaignStatusFilter[]).map(filter => <button key={filter} onClick={() => setStatusFilter(filter)} className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium font-['Inter'] tracking-[-0.5px] capitalize transition-all border-b-2 -mb-[1px] ${statusFilter === filter ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                      {filter}
                    </button>)}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {/* Combined and sorted list */}
                {[...campaigns.filter(c => statusFilter === "all" || c.status === statusFilter).map(c => ({
            ...c,
            type: "campaign" as const
          })), ...bounties.filter(b => statusFilter === "all" || b.status === statusFilter).map(b => ({
            ...b,
            type: "boost" as const
          }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(item => {
            if (item.type === "campaign") {
              const campaign = item as Campaign & {
                type: "campaign";
              };
              return <CampaignRowCard key={`campaign-${campaign.id}`} id={campaign.id} title={campaign.title} type="campaign" bannerUrl={campaign.banner_url} brandColor={brandColor || null} budget={Number(campaign.budget)} budgetUsed={Number(campaign.budget_used || 0)} rpmRate={Number(campaign.rpm_rate)} status={campaign.status} allowedPlatforms={campaign.allowed_platforms} members={campaignMembers[campaign.id] || []} slug={campaign.slug} onClick={() => handleCampaignClick(campaign)} onEdit={() => {
                setSelectedCampaignForEdit(campaign);
                setEditCampaignOpen(true);
              }} onDuplicate={() => handleDuplicateCampaign(campaign)} onDelete={() => handleDeleteClick(campaign)} onTopUp={() => {
                setSelectedCampaignForFunding({
                  id: campaign.id,
                  type: 'campaign'
                });
                setAllocateBudgetOpen(true);
              }} />;
            } else {
              const bounty = item as BountyCampaign & {
                type: "boost";
              };
              const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;
              return <CampaignRowCard key={`boost-${bounty.id}`} id={bounty.id} title={bounty.title} type="boost" bannerUrl={bounty.banner_url} brandColor={brandColor || null} budget={Number(bounty.budget || 0)} budgetUsed={Number(bounty.budget_used || 0)} videosPerMonth={bounty.videos_per_month} spotsRemaining={spotsRemaining} maxCreators={bounty.max_accepted_creators} status={bounty.status} endDate={bounty.end_date} members={bountyMembers[bounty.id] || []} slug={bounty.slug || undefined} onClick={() => navigate(`/dashboard?workspace=${searchParams.get('workspace')}&tab=analytics&boost=${bounty.id}`)} onEdit={() => {
                setSelectedBoostForEdit(bounty.id);
                setEditBoostOpen(true);
              }} onDuplicate={() => handleDuplicateBounty(bounty)} onPause={bounty.status !== 'ended' && bounty.status !== 'draft' ? () => handlePauseBounty(bounty) : undefined} onDelete={() => handleDeleteBountyClick(bounty)} onTopUp={() => {
                setSelectedCampaignForFunding({
                  id: bounty.id,
                  type: 'boost'
                });
                setAllocateBudgetOpen(true);
              }} />;
            }
          })}
              </div>
            </div>}

          {/* Empty State - Onboarding */}
          {campaigns.length === 0 && bounties.length === 0 && (
            <BrandOnboardingSteps
              onLaunchOpportunity={() => setCampaignTypeDialogOpen(true)}
              className="mt-4"
            />
          )}
        </>}


      {/* Create Campaign Wizard (Clipping) */}
      <CampaignCreationWizard brandId={brandId} brandName={brandName} brandLogoUrl={brandLogoUrl} subscriptionPlan={subscriptionPlan} onSuccess={fetchBrandData} open={createCampaignOpen} onOpenChange={(open) => {
        setCreateCampaignOpen(open);
        if (!open) setSelectedTemplate(undefined);
      }} template={selectedTemplate} />

      {/* Edit Campaign Dialog */}
      {selectedCampaignForEdit && (
        <CampaignCreationWizard
          brandId={brandId}
          brandName={brandName}
          brandLogoUrl={brandLogoUrl}
          campaign={selectedCampaignForEdit}
          open={editCampaignOpen}
          onOpenChange={(open) => {
            setEditCampaignOpen(open);
            if (!open) setSelectedCampaignForEdit(null);
          }}
          onSuccess={fetchBrandData}
        />
      )}

      {/* Edit Boost Dialog */}
      {selectedBoostForEdit && (
        <EditBountyDialog
          bountyId={selectedBoostForEdit}
          open={editBoostOpen}
          onOpenChange={(open) => {
            setEditBoostOpen(open);
            if (!open) setSelectedBoostForEdit(null);
          }}
          onSuccess={fetchBrandData}
        />
      )}

      {/* Create Bounty Dialog (Managed) */}
      <CreateBountyDialog open={createBountyOpen} onOpenChange={setCreateBountyOpen} brandId={brandId} subscriptionPlan={subscriptionPlan} onSuccess={fetchBrandData} />

      {/* Create Job Post Dialog */}
      <CreateJobPostDialog open={createJobPostOpen} onOpenChange={setCreateJobPostOpen} brandId={brandId} brandName={brandName} brandLogoUrl={brandLogoUrl} onSuccess={fetchBrandData} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {campaignToDelete ? 'campaign' : 'bounty'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subscription Gate Dialog */}
      <SubscriptionGateDialog brandId={brandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />

      {/* Allocate Budget Dialog */}
      <AllocateBudgetDialog open={allocateBudgetOpen} onOpenChange={open => {
      setAllocateBudgetOpen(open);
      if (!open) setSelectedCampaignForFunding(null);
    }} brandId={brandId} onSuccess={fetchBrandData} preselectedCampaignId={selectedCampaignForFunding?.id} preselectedType={selectedCampaignForFunding?.type} />
    </div>;
}