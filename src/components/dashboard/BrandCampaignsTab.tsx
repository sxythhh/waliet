import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateBountyDialog } from "@/components/brand/CreateBountyDialog";
import { CreateCampaignTypeDialog } from "@/components/brand/CreateCampaignTypeDialog";
import { CampaignCreationWizard } from "@/components/brand/CampaignCreationWizard";
import { BountyCampaignsView } from "@/components/brand/BountyCampaignsView";
import { BoostDetailView } from "@/components/brand/BoostDetailView";
import { SubscriptionGateDialog } from "@/components/brand/SubscriptionGateDialog";
import { OptimizedImage } from "@/components/OptimizedImage";
import { toast } from "sonner";
import { Pencil, Plus, BarChart3, Lock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
type CampaignStatusFilter = "all" | "active" | "draft" | "ended";
type CampaignTypeFilter = "all" | "campaigns" | "boosts";
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
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [bountyToDelete, setBountyToDelete] = useState<BountyCampaign | null>(null);
  const [createBountyOpen, setCreateBountyOpen] = useState(false);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | undefined>(undefined);
  const [selectedBoostId, setSelectedBoostId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionGateOpen, setSubscriptionGateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<CampaignTypeFilter>("all");
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  // Show beta gate for non-admin users with inactive subscription
  const showBetaGate = !adminLoading && !isAdmin && subscriptionStatus !== "active";

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
      // Fetch brand info for logo and subscription status
      const {
        data: brandData
      } = await supabase.from("brands").select("logo_url, subscription_status").eq("id", brandId).single();
      if (brandData?.logo_url) {
        setBrandLogoUrl(brandData.logo_url);
      }
      setSubscriptionStatus(brandData?.subscription_status || null);

      // Fetch campaigns
      const {
        data: campaignsData,
        error: campaignsError
      } = await supabase.from("campaigns").select("*").eq("brand_id", brandId).order("created_at", {
        ascending: false
      });
      if (campaignsError) throw campaignsError;

      // Parse application_questions from JSON to array
      const parsedCampaigns = (campaignsData || []).map(campaign => ({
        ...campaign,
        application_questions: Array.isArray(campaign.application_questions) ? campaign.application_questions : []
      })) as Campaign[];
      setCampaigns(parsedCampaigns);

      // Fetch bounties
      const {
        data: bountiesData,
        error: bountiesError
      } = await supabase.from("bounty_campaigns").select("*").eq("brand_id", brandId).order("created_at", {
        ascending: false
      });
      if (bountiesError) throw bountiesError;
      setBounties((bountiesData || []) as BountyCampaign[]);
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
  if (loading) {
    return <div className="space-y-8 px-4 sm:px-6 md:px-8 py-6 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="p-4 rounded-xl bg-muted/30 space-y-3">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-6 w-20 rounded" />
            </div>)}
        </div>

        {/* Section Header Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24 rounded-md" />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-7 w-16 rounded-full" />)}
          </div>
        </div>

        {/* Campaign Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="rounded-xl overflow-hidden bg-card">
              {/* Banner */}
              <Skeleton className="h-32 w-full rounded-none" />
              {/* Content */}
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4 rounded" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20 rounded" />
                    <Skeleton className="h-3 w-12 rounded" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-14 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
            </div>)}
        </div>

        {/* Boosts Section Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-20 rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map(i => <div key={i} className="p-4 rounded-xl bg-muted/20 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>)}
          </div>
        </div>
      </div>;
  }
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget), 0);
  const totalUsed = campaigns.reduce((sum, c) => sum + Number(c.budget_used || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  return <div className={`relative ${selectedBoostId ? "h-full flex flex-col" : "space-y-6 px-4 sm:px-6 md:px-8 py-6"}`}>
      {/* Beta Gate Overlay for non-admin users with inactive subscription */}
      {showBetaGate && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-background/80">
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
            <Button 
              onClick={handleBackToCreator}
              className="px-6"
            >
              Back to Creator Dashboard
            </Button>
          </div>
        </div>
      )}

      {selectedBoostId ? <BoostDetailView boostId={selectedBoostId} onBack={() => setSelectedBoostId(null)} /> : <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{brandName}</h1>
            </div>
            <CreateCampaignTypeDialog brandId={brandId} onSelectClipping={() => {
          if (subscriptionStatus === "active") {
            setCreateCampaignOpen(true);
          } else {
            setSubscriptionGateOpen(true);
          }
        }} onSelectManaged={() => {
          if (subscriptionStatus === "active") {
            setCreateBountyOpen(true);
          } else {
            setSubscriptionGateOpen(true);
          }
        }} onSelectBoost={() => {
          if (subscriptionStatus === "active") {
            setCreateBountyOpen(true);
          } else {
            setSubscriptionGateOpen(true);
          }
        }} />
          </div>

          {/* Subscription Gate Dialog */}
          <SubscriptionGateDialog brandId={brandId} open={subscriptionGateOpen} onOpenChange={setSubscriptionGateOpen} />

          {/* Subscription Required CTA and Embed - Only show if not subscribed */}
          {subscriptionStatus !== "active" && <>
              
              <div className="w-full h-[440px] sm:h-[250px] rounded-xl overflow-hidden">
                <iframe src="https://joinvirality.com/pickplan-4" className="w-full h-full border-0" title="Pick Plan" />
              </div>
            </>}

          {/* Combined Campaigns & Boosts Grid */}
          {(campaigns.length > 0 || bounties.length > 0) && <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-lg font-semibold font-['Inter'] tracking-[-0.5px]">Programs</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  {/* Type Filter */}
                  <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-muted/40">
                    {(["all", "campaigns", "boosts"] as CampaignTypeFilter[]).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setTypeFilter(filter)}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium font-['Inter'] tracking-[-0.5px] capitalize rounded-md transition-all ${
                          typeFilter === filter
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  {/* Status Filter */}
                  <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-muted/40">
                    {(["all", "active", "draft", "ended"] as CampaignStatusFilter[]).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium font-['Inter'] tracking-[-0.5px] capitalize rounded-md transition-all ${
                          statusFilter === filter
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Combined and sorted list */}
                {[
                  ...campaigns
                    .filter(c => typeFilter === "all" || typeFilter === "campaigns")
                    .filter(c => statusFilter === "all" || c.status === statusFilter)
                    .map(c => ({ ...c, type: "campaign" as const })),
                  ...bounties
                    .filter(b => typeFilter === "all" || typeFilter === "boosts")
                    .filter(b => statusFilter === "all" || b.status === statusFilter)
                    .map(b => ({ ...b, type: "boost" as const }))
                ]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(item => {
                    if (item.type === "campaign") {
                      const campaign = item as Campaign & { type: "campaign" };
                      const usedBudget = Number(campaign.budget_used || 0);
                      const budgetPercentage = Number(campaign.budget) > 0 ? usedBudget / Number(campaign.budget) * 100 : 0;
                      return (
                        <Card key={`campaign-${campaign.id}`} className="group bg-card transition-all duration-300 flex flex-col overflow-hidden cursor-pointer" onClick={() => handleCampaignClick(campaign)}>
                          <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                            {campaign.banner_url ? (
                              <OptimizedImage src={campaign.banner_url} alt={campaign.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                                <span className="text-muted-foreground/50 text-xs font-medium font-['Inter'] tracking-[-0.5px]">
                                  No Banner
                                </span>
                              </div>
                            )}
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium font-['Inter'] tracking-[-0.5px] rounded-full bg-background/80 backdrop-blur-sm text-foreground">
                              Campaign
                            </span>
                          </div>
                          <CardContent className="p-3 flex-1 flex flex-col font-['Inter'] tracking-[-0.5px] bg-[#f8f8f8] dark:bg-[#0e0e0e] group-hover:bg-[#f0f0f0] dark:group-hover:bg-[#141414] transition-colors gap-0 px-[10px]">
                            <div className="flex items-start justify-between">
                              <h3 className="text-sm font-semibold line-clamp-2 leading-snug flex-1 group-hover:underline">
                                {campaign.title}
                              </h3>
                            </div>
                            <div className="rounded-lg p-2.5 space-y-1.5 px-0 py-0 bg-[#080808]/0">
                              <div className="flex items-baseline justify-between">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-base font-bold tabular-nums">
                                    ${Math.ceil(usedBudget).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-semibold">
                                    / ${Math.ceil(Number(campaign.budget)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                              </div>
                              <div className="relative h-1.5 rounded-full overflow-hidden bg-muted border-t border-[#e0e0e0] dark:border-[#262626]">
                                <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{ width: `${budgetPercentage}%` }} />
                              </div>
                              <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                <span>{budgetPercentage.toFixed(0)}% used</span>
                                <span>${Number(campaign.rpm_rate).toFixed(2)} RPM</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    } else {
                      const bounty = item as BountyCampaign & { type: "boost" };
                      const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;
                      return (
                        <Card key={`boost-${bounty.id}`} className="group bg-card transition-all duration-300 flex flex-col overflow-hidden cursor-pointer" onClick={() => setSelectedBoostId(bounty.id)}>
                          <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                            {bounty.banner_url ? (
                              <OptimizedImage src={bounty.banner_url} alt={bounty.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <span className="text-muted-foreground/50 text-xs font-medium font-['Inter'] tracking-[-0.5px]">
                                  No Banner
                                </span>
                              </div>
                            )}
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium font-['Inter'] tracking-[-0.5px] rounded-full bg-primary/80 backdrop-blur-sm text-primary-foreground">
                              Boost
                            </span>
                          </div>
                          <CardContent className="p-3 flex-1 flex flex-col font-['Inter'] tracking-[-0.5px] bg-[#f8f8f8] dark:bg-[#0e0e0e] group-hover:bg-[#f0f0f0] dark:group-hover:bg-[#141414] transition-colors gap-0 px-[10px]">
                            <div className="flex items-start justify-between">
                              <h3 className="text-sm font-semibold line-clamp-2 leading-snug flex-1 group-hover:underline">
                                {bounty.title}
                              </h3>
                            </div>
                            <div className="rounded-lg space-y-1.5 py-1">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-base font-bold tabular-nums">
                                  ${bounty.monthly_retainer.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">
                                  /month
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                <span>{bounty.videos_per_month} videos/month</span>
                                <span>{spotsRemaining > 0 ? `${spotsRemaining} spots left` : "Full"}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                  })}
              </div>
            </div>}

          {/* Empty State */}
          {campaigns.length === 0 && bounties.length === 0}
        </>}


      {/* Create Campaign Wizard (Clipping) */}
      <CampaignCreationWizard brandId={brandId} brandName={brandName} brandLogoUrl={brandLogoUrl} onSuccess={fetchBrandData} open={createCampaignOpen} onOpenChange={setCreateCampaignOpen} />

      {/* Create Bounty Dialog (Managed) */}
      <CreateBountyDialog open={createBountyOpen} onOpenChange={setCreateBountyOpen} brandId={brandId} onSuccess={fetchBrandData} />

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
    </div>;
}