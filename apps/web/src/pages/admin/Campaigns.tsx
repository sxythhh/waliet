import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { CampaignBudgetAdjustmentDialog } from "@/components/admin/CampaignBudgetAdjustmentDialog";
import {
  AdminSearchInput,
  AdminFilterTabs,
  AdminEmptyState,
  TYPOGRAPHY,
  PADDING,
  BORDERS,
  BACKGROUNDS,
  TRANSITIONS,
  TABLE,
} from "@/components/admin/design-system";
import { Search, Megaphone } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: string;
  slug: string;
  budget: number | null;
  budget_used: number | null;
  rpm_rate: number | null;
  is_infinite_budget: boolean;
  is_private: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  brand_id: string;
  brand_name: string;
  brand_logo_url: string | null;
  allowed_platforms: string[] | null;
  type: "campaign";
}

interface BoostCampaign {
  id: string;
  title: string;
  description: string | null;
  status: string;
  budget: number | null;
  budget_used: number | null;
  monthly_retainer: number | null;
  videos_per_month: number | null;
  max_accepted_creators: number;
  accepted_creators_count: number;
  review_status: string | null;
  review_notes: string | null;
  is_private: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  brand_id: string;
  brand: {
    id: string;
    name: string;
    logo_url: string | null;
    slug: string;
  };
  type: "boost";
}

type CombinedCampaign = Campaign | BoostCampaign;

interface CampaignStats {
  total: number;
  active: number;
  paused: number;
  draft: number;
  pendingReview: number;
}

type StatusFilter = "all" | "active" | "paused" | "draft" | "ended";
type ReviewFilter = "all" | "pending_review" | "approved" | "rejected" | "changes_requested";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<CombinedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "campaign" | "boost">("all");
  const [stats, setStats] = useState<CampaignStats>({ total: 0, active: 0, paused: 0, draft: 0, pendingReview: 0 });

  // Selected campaign for detail view
  const [selectedCampaign, setSelectedCampaign] = useState<CombinedCampaign | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Budget adjustment dialog
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  // Review dialog (only for boosts)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "changes">("approve");
  const [reviewNotes, setReviewNotes] = useState("");

  // Status change dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, reviewFilter, typeFilter]);

  const fetchStats = async () => {
    try {
      // Fetch both campaigns and boosts for stats
      const [campaignsResult, boostsResult] = await Promise.all([
        supabase.from("campaigns").select("id, status"),
        supabase.from("bounty_campaigns").select("id, status, review_status"),
      ]);

      const allCampaigns = campaignsResult.data || [];
      const allBoosts = boostsResult.data || [];
      const combined = [...allCampaigns, ...allBoosts];

      setStats({
        total: combined.length,
        active: combined.filter((c) => c.status === "active").length,
        paused: combined.filter((c) => c.status === "paused").length,
        draft: combined.filter((c) => c.status === "draft").length,
        pendingReview: allBoosts.filter((c) => c.review_status === "pending_review").length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const results: CombinedCampaign[] = [];

      // Fetch regular campaigns if filter allows
      if (typeFilter === "all" || typeFilter === "campaign") {
        let campaignQuery = supabase
          .from("campaigns")
          .select(`
            id, title, description, status, slug, budget, budget_used, rpm_rate,
            is_infinite_budget, is_private, start_date, end_date, created_at,
            brand_id, brand_name, brand_logo_url, allowed_platforms
          `)
          .order("created_at", { ascending: false });

        if (statusFilter !== "all") {
          campaignQuery = campaignQuery.eq("status", statusFilter);
        }

        const { data: campaignData, error: campaignError } = await campaignQuery;
        if (campaignError) throw campaignError;

        const campaignsWithType = (campaignData || []).map((c) => ({
          ...c,
          type: "campaign" as const,
        }));
        results.push(...campaignsWithType);
      }

      // Fetch boosts if filter allows
      if (typeFilter === "all" || typeFilter === "boost") {
        let boostQuery = supabase
          .from("bounty_campaigns")
          .select(`
            id, title, description, status, budget, budget_used,
            monthly_retainer, videos_per_month, max_accepted_creators, accepted_creators_count,
            review_status, review_notes, is_private, start_date, end_date, created_at, brand_id,
            brand:brands!bounty_campaigns_brand_id_fkey (
              id, name, logo_url, slug
            )
          `)
          .order("created_at", { ascending: false });

        if (statusFilter !== "all") {
          boostQuery = boostQuery.eq("status", statusFilter);
        }
        if (reviewFilter !== "all") {
          boostQuery = boostQuery.eq("review_status", reviewFilter);
        }

        const { data: boostData, error: boostError } = await boostQuery;
        if (boostError) throw boostError;

        const boostsWithType = (boostData || []).map((b) => ({
          ...b,
          type: "boost" as const,
        }));
        results.push(...(boostsWithType as unknown as BoostCampaign[]));
      }

      // Sort combined results by created_at
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setCampaigns(results);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const getTableName = (campaign: CombinedCampaign) => {
    return campaign.type === "campaign" ? "campaigns" : "bounty_campaigns";
  };

  const getBrandName = (campaign: CombinedCampaign) => {
    if (campaign.type === "campaign") {
      return campaign.brand_name;
    }
    return campaign.brand?.name || "Unknown";
  };

  const getBrandLogo = (campaign: CombinedCampaign) => {
    if (campaign.type === "campaign") {
      return campaign.brand_logo_url;
    }
    return campaign.brand?.logo_url || null;
  };

  const handleUpdateBudget = async () => {
    if (!selectedCampaign || !newBudget) return;

    const budgetValue = parseFloat(newBudget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      toast.error("Please enter a valid budget");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from(getTableName(selectedCampaign))
        .update({ budget: budgetValue })
        .eq("id", selectedCampaign.id);

      if (error) throw error;

      toast.success("Budget updated");
      setBudgetDialogOpen(false);
      setNewBudget("");
      fetchCampaigns();
      fetchStats();

      // Update selected campaign
      setSelectedCampaign({ ...selectedCampaign, budget: budgetValue });
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReviewAction = async () => {
    if (!selectedCampaign || selectedCampaign.type !== "boost") return;

    setIsUpdating(true);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user?.id) {
        toast.error("Authentication error");
        setIsUpdating(false);
        return;
      }

      const updateData: Record<string, string | null> = {
        review_status: reviewAction === "approve" ? "approved" : reviewAction === "reject" ? "rejected" : "changes_requested",
        review_notes: reviewNotes || null,
        reviewed_by: userData?.user?.id,
        reviewed_at: new Date().toISOString(),
      };

      // If approving, also set status to active
      if (reviewAction === "approve") {
        updateData.status = "active";
      }

      const { error } = await supabase
        .from("bounty_campaigns")
        .update(updateData)
        .eq("id", selectedCampaign.id);

      if (error) throw error;

      toast.success(
        reviewAction === "approve"
          ? "Boost approved and launched"
          : reviewAction === "reject"
          ? "Boost rejected"
          : "Changes requested"
      );
      setReviewDialogOpen(false);
      setReviewNotes("");
      fetchCampaigns();
      fetchStats();
      setSheetOpen(false);
    } catch (error) {
      console.error("Error reviewing boost:", error);
      toast.error("Failed to update boost");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedCampaign || !newStatus) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from(getTableName(selectedCampaign))
        .update({ status: newStatus })
        .eq("id", selectedCampaign.id);

      if (error) throw error;

      toast.success(`Status changed to ${newStatus}`);
      setStatusDialogOpen(false);
      setNewStatus("");
      fetchCampaigns();
      fetchStats();

      setSelectedCampaign({ ...selectedCampaign, status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const quickStatusChange = async (campaign: CombinedCampaign, status: string) => {
    try {
      const { error } = await supabase
        .from(getTableName(campaign))
        .update({ status })
        .eq("id", campaign.id);

      if (error) throw error;

      toast.success(`${campaign.type === "campaign" ? "Campaign" : "Boost"} ${status === "active" ? "activated" : status === "paused" ? "paused" : status}`);
      fetchCampaigns();
      fetchStats();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const brandName = getBrandName(c);
    return (
      c.title.toLowerCase().includes(searchLower) ||
      brandName.toLowerCase().includes(searchLower)
    );
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-foreground text-background";
      case "paused":
        return "bg-muted text-muted-foreground";
      case "draft":
        return "bg-muted/50 text-muted-foreground";
      case "ended":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getReviewStatusStyle = (status: string | null) => {
    switch (status) {
      case "pending_review":
        return "border-amber-500/50 text-amber-600";
      case "approved":
        return "border-foreground/20 text-foreground";
      case "rejected":
        return "border-muted text-muted-foreground";
      case "changes_requested":
        return "border-amber-500/50 text-amber-600";
      default:
        return "border-muted text-muted-foreground";
    }
  };

  return (
    <AdminPermissionGuard resource="brands">
      <div className="h-full flex flex-col">
        {/* Page Header */}
        <div className={cn("border-b flex-shrink-0", BORDERS.default, PADDING.page)}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/40">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className={TYPOGRAPHY.pageTitle}>Campaigns</h1>
              <p className={cn(TYPOGRAPHY.caption, "mt-0.5")}>
                {stats.total} campaigns • {stats.active} active • {stats.pendingReview > 0 && `${stats.pendingReview} pending review`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Filters */}
        <div className="bg-card border border-border/40 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="pl-10 h-9 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>

            <div className="h-6 w-px bg-border/40" />

          {/* Type Filter */}
          <div className="flex items-center gap-1">
            {(["all", "campaign", "boost"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "px-3 py-1.5 text-xs font-inter tracking-[-0.5px] rounded-lg transition-colors capitalize",
                  typeFilter === type
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type === "all" ? "All Types" : type === "campaign" ? "Campaigns" : "Boosts"}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-1">
            {(["all", "active", "paused", "draft", "ended"] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 text-xs font-inter tracking-[-0.5px] rounded-lg transition-colors capitalize",
                  statusFilter === status
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          {(typeFilter === "all" || typeFilter === "boost") && (
            <>
              <div className="h-4 w-px bg-border" />

              <div className="flex items-center gap-1">
                {(["all", "pending_review", "approved", "changes_requested"] as ReviewFilter[]).map((review) => (
                  <button
                    key={review}
                    onClick={() => setReviewFilter(review)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-inter tracking-[-0.5px] rounded-lg transition-colors",
                      reviewFilter === review
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {review === "all" ? "All Reviews" : review.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            onClick={fetchCampaigns}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Refresh
          </button>
          </div>
        </div>

        {/* Campaign List */}
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/30 border-b border-border/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4">Campaign</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Budget</div>
            <div className="col-span-2">Details</div>
            <div className="col-span-2">Actions</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="px-4 py-12 text-center text-muted-foreground font-inter tracking-[-0.5px]">
              Loading campaigns...
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground font-inter tracking-[-0.5px]">
              No campaigns found
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={`${campaign.type}-${campaign.id}`}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedCampaign(campaign);
                    setSheetOpen(true);
                  }}
                >
                  {/* Campaign Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-lg border border-border/50">
                      <AvatarImage src={getBrandLogo(campaign) || ''} className="object-cover" />
                      <AvatarFallback className="rounded-lg text-xs font-inter tracking-[-0.5px]">
                        {getBrandName(campaign).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">
                          {campaign.title}
                        </p>
                        <span className={cn(
                          "px-1.5 py-0.5 text-[9px] font-inter tracking-[-0.5px] rounded",
                          campaign.type === "campaign" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                        )}>
                          {campaign.type === "campaign" ? "Campaign" : "Boost"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                        {getBrandName(campaign)}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-inter tracking-[-0.5px] rounded capitalize",
                      getStatusStyle(campaign.status)
                    )}>
                      {campaign.status}
                    </span>
                    {campaign.type === "boost" && (campaign as BoostCampaign).review_status && (campaign as BoostCampaign).review_status !== "approved" && (
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-inter tracking-[-0.5px] rounded border capitalize",
                        getReviewStatusStyle((campaign as BoostCampaign).review_status)
                      )}>
                        {(campaign as BoostCampaign).review_status?.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>

                  {/* Budget */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm font-inter tracking-[-0.5px]">
                      {campaign.type === "campaign" && (campaign as Campaign).is_infinite_budget ? (
                        "∞"
                      ) : (
                        <>
                          ${campaign.budget?.toLocaleString() || "0"}
                          {campaign.budget_used && campaign.budget && (
                            <span className="text-muted-foreground text-xs ml-1">
                              ({Math.round((campaign.budget_used / campaign.budget) * 100)}% used)
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>

                  {/* Type-specific info */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm font-inter tracking-[-0.5px]">
                      {campaign.type === "boost" ? (
                        <>
                          {(campaign as BoostCampaign).accepted_creators_count} / {(campaign as BoostCampaign).max_accepted_creators}
                        </>
                      ) : campaign.type === "campaign" && (campaign as Campaign).rpm_rate ? (
                        <span className="text-muted-foreground">${(campaign as Campaign).rpm_rate}/RPM</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {campaign.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => quickStatusChange(campaign, "paused")}
                        className="h-7 px-2 text-xs font-inter tracking-[-0.5px]"
                      >
                        Pause
                      </Button>
                    )}
                    {campaign.status === "paused" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => quickStatusChange(campaign, "active")}
                        className="h-7 px-2 text-xs font-inter tracking-[-0.5px]"
                      >
                        Activate
                      </Button>
                    )}
                    {campaign.type === "boost" && (campaign as BoostCampaign).review_status === "pending_review" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setReviewAction("approve");
                          setReviewDialogOpen(true);
                        }}
                        className="h-7 px-2 text-xs font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90"
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[420px] p-0 border-l border-border/50 bg-background">
          {selectedCampaign && (
            <ScrollArea className="h-full">
              {/* Header */}
              <div className="px-6 pt-6 pb-5 border-b border-border/50">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 rounded-xl border border-border/50">
                    <AvatarImage src={getBrandLogo(selectedCampaign) || ''} className="object-cover" />
                    <AvatarFallback className="rounded-xl bg-muted text-muted-foreground font-inter tracking-[-0.5px] text-lg">
                      {getBrandName(selectedCampaign).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] truncate">
                        {selectedCampaign.title}
                      </h2>
                      <span className={cn(
                        "px-1.5 py-0.5 text-[9px] font-inter tracking-[-0.5px] rounded",
                        selectedCampaign.type === "campaign" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                      )}>
                        {selectedCampaign.type === "campaign" ? "Campaign" : "Boost"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                      {getBrandName(selectedCampaign)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-inter tracking-[-0.5px] rounded capitalize",
                        getStatusStyle(selectedCampaign.status)
                      )}>
                        {selectedCampaign.status}
                      </span>
                      {selectedCampaign.type === "boost" && (selectedCampaign as BoostCampaign).review_status && (
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-inter tracking-[-0.5px] rounded border capitalize",
                          getReviewStatusStyle((selectedCampaign as BoostCampaign).review_status)
                        )}>
                          {(selectedCampaign as BoostCampaign).review_status?.replace(/_/g, " ")}
                        </span>
                      )}
                      {selectedCampaign.is_private && (
                        <span className="px-2 py-0.5 text-[10px] font-inter tracking-[-0.5px] rounded bg-muted text-muted-foreground">
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Section */}
              <div className="px-6 py-5 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">
                      Budget
                    </p>
                    <p className="text-3xl font-semibold font-inter tracking-[-0.5px]">
                      {selectedCampaign.type === "campaign" && (selectedCampaign as Campaign).is_infinite_budget ? (
                        "∞"
                      ) : (
                        `$${selectedCampaign.budget?.toLocaleString() || "0"}`
                      )}
                    </p>
                    {selectedCampaign.budget_used && (
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-1">
                        ${selectedCampaign.budget_used.toLocaleString()} used
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBudgetDialogOpen(true)}
                    className="h-8 text-xs font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                  >
                    Adjust
                  </Button>
                </div>

                {/* Stats - different for campaigns vs boosts */}
                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border/50">
                  {selectedCampaign.type === "boost" ? (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Retainer</p>
                        <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                          ${(selectedCampaign as BoostCampaign).monthly_retainer?.toLocaleString() || "0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Creators</p>
                        <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                          {(selectedCampaign as BoostCampaign).accepted_creators_count} / {(selectedCampaign as BoostCampaign).max_accepted_creators}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Videos/mo</p>
                        <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                          {(selectedCampaign as BoostCampaign).videos_per_month || "—"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">RPM Rate</p>
                        <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                          ${(selectedCampaign as Campaign).rpm_rate?.toLocaleString() || "0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Slug</p>
                        <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">
                          {(selectedCampaign as Campaign).slug || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Platforms</p>
                        <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                          {(selectedCampaign as Campaign).allowed_platforms?.length || 0}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="px-6 py-5 space-y-5">
                {/* Description */}
                {selectedCampaign.description && (
                  <section>
                    <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-2">
                      Description
                    </h3>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] leading-relaxed">
                      {selectedCampaign.description}
                    </p>
                  </section>
                )}

                {/* Timeline */}
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-2">
                    Timeline
                  </h3>
                  <div className="space-y-0">
                    <div className="flex items-center justify-between py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Created</span>
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        {format(new Date(selectedCampaign.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {selectedCampaign.start_date && (
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Start</span>
                        <span className="text-sm font-inter tracking-[-0.5px]">
                          {format(new Date(selectedCampaign.start_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {selectedCampaign.end_date && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">End</span>
                        <span className="text-sm font-inter tracking-[-0.5px]">
                          {format(new Date(selectedCampaign.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Review Notes - only for boosts */}
                {selectedCampaign.type === "boost" && (selectedCampaign as BoostCampaign).review_notes && (
                  <section>
                    <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-2">
                      Review Notes
                    </h3>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] p-3 bg-muted/30 rounded-lg">
                      {(selectedCampaign as BoostCampaign).review_notes}
                    </p>
                  </section>
                )}

                {/* Actions */}
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                    Actions
                  </h3>
                  <div className="space-y-2">
                    {/* Status Change */}
                    <div className="flex gap-2">
                      {selectedCampaign.status !== "active" && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setNewStatus("active");
                            setStatusDialogOpen(true);
                          }}
                          className="flex-1 h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                        >
                          Activate
                        </Button>
                      )}
                      {selectedCampaign.status !== "paused" && selectedCampaign.status !== "draft" && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setNewStatus("paused");
                            setStatusDialogOpen(true);
                          }}
                          className="flex-1 h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                        >
                          Pause
                        </Button>
                      )}
                      {selectedCampaign.status !== "ended" && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setNewStatus("ended");
                            setStatusDialogOpen(true);
                          }}
                          className="flex-1 h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                        >
                          End
                        </Button>
                      )}
                    </div>

                    {/* Review Actions - only for boosts */}
                    {selectedCampaign.type === "boost" && (selectedCampaign as BoostCampaign).review_status === "pending_review" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => {
                            setReviewAction("approve");
                            setReviewDialogOpen(true);
                          }}
                          className="flex-1 h-9 text-sm font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setReviewAction("changes");
                            setReviewDialogOpen(true);
                          }}
                          className="flex-1 h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                        >
                          Request Changes
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setReviewAction("reject");
                            setReviewDialogOpen(true);
                          }}
                          className="flex-1 h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted text-muted-foreground"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="h-6" />
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Budget Adjustment Dialog */}
      {selectedCampaign && (
        <CampaignBudgetAdjustmentDialog
          open={budgetDialogOpen}
          onOpenChange={setBudgetDialogOpen}
          preselectedCampaign={{
            id: selectedCampaign.id,
            title: selectedCampaign.title,
            brand_name: getBrandName(selectedCampaign),
            brand_logo_url: getBrandLogo(selectedCampaign),
            budget: selectedCampaign.budget || 0,
            budget_used: selectedCampaign.budget_used,
            status: selectedCampaign.status,
            is_infinite_budget: 'is_infinite_budget' in selectedCampaign ? selectedCampaign.is_infinite_budget : false,
          }}
          onSuccess={() => {
            fetchCampaigns();
            fetchStats();
          }}
        />
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">
              {reviewAction === "approve" ? "Approve Campaign" : reviewAction === "reject" ? "Reject Campaign" : "Request Changes"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              {reviewAction === "approve"
                ? "This will approve the campaign and set it to active."
                : reviewAction === "reject"
                ? "This will reject the campaign."
                : "This will request changes from the brand."}
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Notes {reviewAction !== "approve" && "(required)"}
              </Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes..."
                className="min-h-[100px] font-inter tracking-[-0.5px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReviewDialogOpen(false)}
              className="font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReviewAction}
              disabled={isUpdating || (reviewAction !== "approve" && !reviewNotes)}
              className={cn(
                "font-inter tracking-[-0.5px]",
                reviewAction === "approve"
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : ""
              )}
            >
              {isUpdating ? "Saving..." : reviewAction === "approve" ? "Approve & Launch" : reviewAction === "reject" ? "Reject" : "Request Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">
              Change Status to {newStatus}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-2">
            Are you sure you want to change this campaign's status to "{newStatus}"?
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setStatusDialogOpen(false)}
              className="font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={isUpdating}
              className="font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90"
            >
              {isUpdating ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminPermissionGuard>
  );
}
