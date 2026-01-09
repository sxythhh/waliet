import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { CustomPlanManager } from "./CustomPlanManager";
import { BrandCRMTab } from "./BrandCRMTab";

interface Brand {
  id: string;
  name: string;
  slug: string;
  brand_type: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  renewal_date: string | null;
  logo_url: string | null;
  description: string | null;
  home_url: string | null;
  account_url: string | null;
  assets_url: string | null;
  show_account_tab: boolean;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
}

interface BrandStats {
  walletBalance: number;
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalCreators: number;
  totalSpend: number;
  totalDeposits: number;
  pendingPayouts: number;
}

interface TeamMember {
  id: string;
  role: string;
  user: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    email?: string | null;
  } | null;
}

interface BrandOwner {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  amount?: number;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
  status: string;
  budget: number;
  created_at: string;
}

interface BrandContextSheetProps {
  brand: Brand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBrandUpdated?: () => void;
}

export function BrandContextSheet({ brand, open, onOpenChange, onBrandUpdated }: BrandContextSheetProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BrandStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [brandOwner, setBrandOwner] = useState<BrandOwner | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "crm" | "settings">("overview");

  // Subscription editing state
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("");
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);

  // Wallet adjustment state
  const [showWalletAdjust, setShowWalletAdjust] = useState(false);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletDescription, setWalletDescription] = useState("");
  const [walletAction, setWalletAction] = useState<"add" | "remove">("add");
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);

  // Custom plan dialog state
  const [customPlanDialogOpen, setCustomPlanDialogOpen] = useState(false);
  const [hasCustomPlan, setHasCustomPlan] = useState(false);
  const [customPlanName, setCustomPlanName] = useState<string | null>(null);

  useEffect(() => {
    if (brand && open) {
      fetchAllBrandData(brand.id);
      setSubscriptionStatus(brand.subscription_status || "inactive");
      setSubscriptionPlan(brand.subscription_plan || "");
      setActiveTab("overview");
      setShowWalletAdjust(false);
    }
  }, [brand, open]);

  const fetchAllBrandData = async (brandId: string) => {
    setLoading(true);
    try {
      // Fetch custom plan status
      const { data: customPlan } = await supabase
        .from("custom_brand_plans")
        .select("name, is_active")
        .eq("brand_id", brandId)
        .eq("is_active", true)
        .single();

      setHasCustomPlan(!!customPlan);
      setCustomPlanName(customPlan?.name || null);

      const [transactionsRes, campaignsRes, membersRes] = await Promise.all([
        supabase
          .from("brand_wallet_transactions")
          .select("*")
          .eq("brand_id", brandId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("campaigns")
          .select("id, title, status, budget, created_at")
          .eq("brand_id", brandId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("brand_members")
          .select("id, role, user_id")
          .eq("brand_id", brandId)
          .limit(10),
      ]);

      const transactions = transactionsRes.data || [];
      const campaignsData = campaignsRes.data || [];
      const membersData = membersRes.data || [];

      // Fetch profiles for all members
      const userIds = membersData.map(m => m.user_id).filter(Boolean);
      let profilesMap = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, email")
          .in("id", userIds);

        if (profilesData) {
          profilesMap = new Map(profilesData.map(p => [p.id, p]));
        }
      }

      // Map members with their profiles
      const members: TeamMember[] = membersData.map(m => ({
        id: m.id,
        role: m.role,
        user: profilesMap.get(m.user_id) || null,
      }));

      // Set brand owner (first member with 'owner' role)
      const ownerMember = members.find(m => m.role === "owner");
      if (ownerMember?.user) {
        setBrandOwner(ownerMember.user as BrandOwner);
      } else {
        setBrandOwner(null);
      }

      const walletBalance = transactions.reduce((acc, tx) => {
        if (tx.status !== "completed") return acc;
        const txAmount = Number(tx.amount) || 0;
        if (["deposit", "topup", "refund", "admin_credit"].includes(tx.type)) {
          return acc + txAmount;
        } else {
          return acc - txAmount;
        }
      }, 0);

      const totalDeposits = transactions.reduce((acc, tx) => {
        if (tx.status !== "completed") return acc;
        const txAmount = Number(tx.amount) || 0;
        if (["deposit", "topup", "admin_credit"].includes(tx.type)) {
          return acc + txAmount;
        }
        return acc;
      }, 0);

      const totalSpend = transactions.reduce((acc, tx) => {
        if (tx.status !== "completed") return acc;
        const txAmount = Number(tx.amount) || 0;
        if (!["deposit", "topup", "refund", "admin_credit"].includes(tx.type)) {
          return acc + txAmount;
        }
        return acc;
      }, 0);

      const pendingPayouts = transactions.reduce((acc, tx) => {
        if (tx.status === "pending" && tx.type === "payout") {
          return acc + (Number(tx.amount) || 0);
        }
        return acc;
      }, 0);

      setStats({
        walletBalance,
        totalCampaigns: campaignsData.length,
        activeCampaigns: campaignsData.filter(c => c.status === "active").length,
        completedCampaigns: campaignsData.filter(c => c.status === "completed").length,
        totalCreators: members.length,
        totalSpend,
        totalDeposits,
        pendingPayouts,
      });

      setCampaigns(campaignsData);
      setTeamMembers(members);

      const activity: RecentActivity[] = transactions.slice(0, 8).map(tx => ({
        id: tx.id,
        type: tx.type,
        description: tx.description || getActivityDescription(tx.type),
        amount: Number(tx.amount),
        created_at: tx.created_at,
      }));
      setRecentActivity(activity);

    } catch (error) {
      console.error("Error fetching brand data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      deposit: "Funds deposited",
      topup: "Balance topped up",
      admin_credit: "Admin credit added",
      admin_debit: "Admin debit",
      payout: "Creator payout",
      refund: "Refund processed",
      campaign_spend: "Campaign spend",
    };
    return descriptions[type] || type;
  };

  const handleUpdateSubscription = async () => {
    if (!brand) return;
    setIsUpdatingSubscription(true);

    try {
      const { error } = await supabase
        .from("brands")
        .update({
          subscription_status: subscriptionStatus || null,
          subscription_plan: subscriptionPlan || null,
          is_active: subscriptionStatus === "active",
          subscription_started_at: subscriptionStatus === "active" && brand.subscription_status !== "active"
            ? new Date().toISOString()
            : undefined
        })
        .eq("id", brand.id);

      if (error) throw error;

      toast.success("Subscription updated");
      onBrandUpdated?.();
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Failed to update subscription");
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  const handleWalletAdjustment = async () => {
    if (!brand || !walletAmount) return;

    const numAmount = parseFloat(walletAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (walletAction === "remove" && stats && numAmount > stats.walletBalance) {
      toast.error("Cannot remove more than current balance");
      return;
    }

    setIsAdjustingWallet(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("brand_wallet_transactions")
        .insert({
          brand_id: brand.id,
          type: walletAction === "add" ? "admin_credit" : "admin_debit",
          amount: numAmount,
          status: "completed",
          description: walletDescription || `Admin ${walletAction === "add" ? "credit" : "debit"}`,
          created_by: userData?.user?.id
        });

      if (error) throw error;

      toast.success(`$${numAmount.toFixed(2)} ${walletAction === "add" ? "added" : "removed"}`);
      setWalletAmount("");
      setWalletDescription("");
      setShowWalletAdjust(false);
      fetchAllBrandData(brand.id);
      onBrandUpdated?.();
    } catch (error) {
      console.error("Error adjusting balance:", error);
      toast.error("Failed to adjust balance");
    } finally {
      setIsAdjustingWallet(false);
    }
  };

  if (!brand) return null;

  const memberAge = formatDistanceToNow(new Date(brand.created_at), { addSuffix: false });

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "active": return "Active";
      case "past_due": return "Past Due";
      case "cancelled": return "Cancelled";
      default: return "Inactive";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="md" className="w-full p-0 border-l border-border/50 bg-background">
        <ScrollArea className="h-full">
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-border/50">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 rounded-xl border border-border/50">
                <AvatarImage src={brand.logo_url || ''} alt={brand.name} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-muted text-muted-foreground font-inter tracking-[-0.5px] text-lg">
                  {brand.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] truncate">
                    {brand.name}
                  </h2>
                  {brand.is_verified && (
                    <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  <span>{getStatusLabel(brand.subscription_status)}</span>
                  {brand.subscription_plan && (
                    <>
                      <span className="text-border">·</span>
                      <span className="capitalize">{brand.subscription_plan}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  <span>{memberAge} old</span>
                  {brand.home_url && (
                    <>
                      <span className="text-border">·</span>
                      <a
                        href={brand.home_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                      >
                        Website
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Balance Section */}
          <div className="px-6 py-5 border-b border-border/50">
            <div
              className="cursor-pointer"
              onClick={() => !loading && setShowWalletAdjust(!showWalletAdjust)}
            >
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">
                Balance
              </p>
              <p className="text-3xl font-semibold font-inter tracking-[-0.5px]">
                {loading ? "..." : `$${stats?.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`}
              </p>
            </div>

            {showWalletAdjust && (
              <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setWalletAction("add")}
                    className={cn(
                      "flex-1 py-2 text-sm font-inter tracking-[-0.5px] rounded-lg transition-colors",
                      walletAction === "add"
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setWalletAction("remove")}
                    className={cn(
                      "flex-1 py-2 text-sm font-inter tracking-[-0.5px] rounded-lg transition-colors",
                      walletAction === "remove"
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    Remove
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-inter tracking-[-0.5px]">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 h-10 font-inter tracking-[-0.5px] bg-muted border-0"
                  />
                </div>
                <Input
                  value={walletDescription}
                  onChange={(e) => setWalletDescription(e.target.value)}
                  placeholder="Note (optional)"
                  className="h-10 font-inter tracking-[-0.5px] bg-muted border-0"
                />
                {walletAmount && parseFloat(walletAmount) > 0 && (
                  <div className="flex items-center justify-between text-sm font-inter tracking-[-0.5px]">
                    <span className="text-muted-foreground">New balance</span>
                    <span className="font-medium">
                      ${((stats?.walletBalance || 0) + (walletAction === "add" ? 1 : -1) * parseFloat(walletAmount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <Button
                  onClick={handleWalletAdjustment}
                  disabled={isAdjustingWallet || !walletAmount}
                  className="w-full h-10 font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90"
                >
                  {isAdjustingWallet ? "Processing..." : `${walletAction === "add" ? "Add" : "Remove"} Funds`}
                </Button>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-6 mt-5 pt-5 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Campaigns</p>
                <p className="text-lg font-semibold font-inter tracking-[-0.5px]">
                  {loading ? "..." : stats?.activeCampaigns || 0}
                  <span className="text-sm text-muted-foreground font-normal ml-1">
                    / {stats?.totalCampaigns || 0}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Total Spend</p>
                <p className="text-lg font-semibold font-inter tracking-[-0.5px]">
                  ${loading ? "..." : stats?.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 pb-2 sticky top-0 z-10 bg-background">
            <div className="flex gap-1">
              {[
                { id: "overview", label: "Overview" },
                { id: "activity", label: "Activity" },
                { id: "crm", label: "CRM" },
                { id: "settings", label: "Settings" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 py-2 text-sm font-inter tracking-[-0.5px] rounded-lg transition-colors",
                    activeTab === tab.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Brand Owner */}
                {brandOwner && (
                  <section>
                    <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                      Created By
                    </h3>
                    <div
                      className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/@${brandOwner.username}`)}
                    >
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={brandOwner.avatar_url || ''} />
                        <AvatarFallback className="text-xs font-inter tracking-[-0.5px]">
                          {brandOwner.username?.slice(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">
                          {brandOwner.full_name || brandOwner.username}
                        </p>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                          @{brandOwner.username}
                        </p>
                        {brandOwner.email && (
                          <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate">
                            {brandOwner.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* Team Members */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">
                      Team
                    </h3>
                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                      {teamMembers.length}
                    </span>
                  </div>
                  {loading ? (
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-4 text-center">
                      Loading...
                    </p>
                  ) : teamMembers.length > 0 ? (
                    <div className="space-y-1">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-8 w-8 border border-border/50">
                            <AvatarImage src={member.user?.avatar_url || ''} />
                            <AvatarFallback className="text-xs font-inter tracking-[-0.5px]">
                              {member.user?.username?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">
                              {member.user?.full_name || member.user?.username || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] capitalize">
                              {member.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-4 text-center">
                      No team members
                    </p>
                  )}
                </section>

                {/* Campaigns */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">
                      Campaigns
                    </h3>
                    <button
                      onClick={() => navigate(`/brand/${brand.slug}/campaigns`)}
                      className="text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px]"
                    >
                      View all
                    </button>
                  </div>
                  {loading ? (
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-4 text-center">
                      Loading...
                    </p>
                  ) : campaigns.length > 0 ? (
                    <div className="space-y-0">
                      {campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
                          onClick={() => navigate(`/brand/${brand.slug}/campaigns`)}
                        >
                          <div>
                            <p className="text-sm font-inter tracking-[-0.5px] truncate">
                              {campaign.title}
                            </p>
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                              ${campaign.budget?.toLocaleString() || 0} budget
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px] capitalize">
                            {campaign.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-4 text-center">
                      No campaigns
                    </p>
                  )}
                </section>

                {/* Actions */}
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                    Actions
                  </h3>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => navigate(`/brand/${brand.slug}`)}
                        className="flex-1 h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                      >
                        Dashboard
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => navigate(`/brand/${brand.slug}/analytics`)}
                        className="flex-1 h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                      >
                        Analytics
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setCustomPlanDialogOpen(true)}
                      className="w-full h-9 text-sm font-inter tracking-[-0.5px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Custom Plan
                      </span>
                      {hasCustomPlan && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {customPlanName || "Active"}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "activity" && (
              <section>
                <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                  Recent Transactions
                </h3>
                {loading ? (
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-8 text-center">
                    Loading...
                  </p>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-0">
                    {recentActivity.map((activity) => {
                      const isCredit = ["deposit", "topup", "admin_credit", "refund"].includes(activity.type);
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-inter tracking-[-0.5px]">
                              {activity.description}
                            </p>
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {activity.amount && (
                            <span className={cn(
                              "text-sm font-medium font-inter tracking-[-0.5px] tabular-nums",
                              isCredit ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {isCredit ? "+" : "-"}${activity.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-8 text-center">
                    No activity
                  </p>
                )}
              </section>
            )}

            {activeTab === "crm" && (
              <BrandCRMTab brandId={brand.id} brandName={brand.name} />
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Subscription */}
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                    Subscription
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Status</Label>
                      <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                        <SelectTrigger className="h-10 font-inter tracking-[-0.5px] bg-muted border-0">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="font-inter tracking-[-0.5px]">Active</SelectItem>
                          <SelectItem value="past_due" className="font-inter tracking-[-0.5px]">Past Due</SelectItem>
                          <SelectItem value="cancelled" className="font-inter tracking-[-0.5px]">Cancelled</SelectItem>
                          <SelectItem value="inactive" className="font-inter tracking-[-0.5px]">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Plan</Label>
                      <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
                        <SelectTrigger className="h-10 font-inter tracking-[-0.5px] bg-muted border-0">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter" className="font-inter tracking-[-0.5px]">Starter</SelectItem>
                          <SelectItem value="growth" className="font-inter tracking-[-0.5px]">Growth</SelectItem>
                          <SelectItem value="enterprise" className="font-inter tracking-[-0.5px]">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleUpdateSubscription}
                      disabled={isUpdatingSubscription}
                      className="w-full h-10 font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90"
                    >
                      {isUpdatingSubscription ? "Saving..." : "Update Subscription"}
                    </Button>
                  </div>
                </section>

                {/* Details */}
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                    Details
                  </h3>
                  <div className="space-y-0">
                    <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Created</span>
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        {format(new Date(brand.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Slug</span>
                      <span className="text-sm font-mono text-muted-foreground">
                        {brand.slug}
                      </span>
                    </div>
                    {brand.brand_type && (
                      <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Type</span>
                        <span className="text-sm font-inter tracking-[-0.5px] capitalize">
                          {brand.brand_type}
                        </span>
                      </div>
                    )}
                    {brand.renewal_date && (
                      <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Renews</span>
                        <span className="text-sm font-inter tracking-[-0.5px]">
                          {format(new Date(brand.renewal_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Deposited</span>
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        ${stats?.totalDeposits.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Description */}
                {brand.description && (
                  <section>
                    <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                      About
                    </h3>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] leading-relaxed">
                      {brand.description}
                    </p>
                  </section>
                )}
              </div>
            )}
          </div>

          <div className="h-6" />
        </ScrollArea>
      </SheetContent>

      {/* Custom Plan Manager Dialog */}
      <CustomPlanManager
        open={customPlanDialogOpen}
        onOpenChange={setCustomPlanDialogOpen}
        brand={brand ? { id: brand.id, name: brand.name, logo_url: brand.logo_url } : null}
        onSuccess={() => {
          if (brand) fetchAllBrandData(brand.id);
          onBrandUpdated?.();
        }}
      />
    </Sheet>
  );
}
