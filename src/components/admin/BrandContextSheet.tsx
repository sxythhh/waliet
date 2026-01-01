import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Globe,
  Calendar,
  ExternalLink,
  Wallet,
  CreditCard,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  Sparkles,
  BarChart3,
  ChevronRight,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  X,
  Activity,
  Zap,
  Target,
  Eye,
  Video,
  CircleDollarSign,
  ArrowRight,
  Play,
  Pause,
  RefreshCw,
  Loader2
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

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
  } | null;
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
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "activity" | "settings">("overview");

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

  useEffect(() => {
    if (brand && open) {
      fetchAllBrandData(brand.id);
      setSubscriptionStatus(brand.subscription_status || "inactive");
      setSubscriptionPlan(brand.subscription_plan || "");
      setActiveSection("overview");
      setShowWalletAdjust(false);
    }
  }, [brand, open]);

  const fetchAllBrandData = async (brandId: string) => {
    setLoading(true);
    try {
      // Fetch all data in parallel
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
          .select(`
            id,
            role,
            user:profiles!brand_members_user_id_fkey (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq("brand_id", brandId)
          .limit(5)
      ]);

      const transactions = transactionsRes.data || [];
      const campaignsData = campaignsRes.data || [];
      const members = membersRes.data || [];

      // Calculate stats
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
      setTeamMembers(members as unknown as TeamMember[]);

      // Format recent activity from transactions
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "topup":
      case "admin_credit":
        return <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />;
      case "payout":
      case "admin_debit":
      case "campaign_spend":
        return <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />;
      case "refund":
        return <RefreshCw className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
    }
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

  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case "active":
        return {
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-500/10",
          border: "border-emerald-200 dark:border-emerald-500/20",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: "Active"
        };
      case "past_due":
        return {
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-500/10",
          border: "border-amber-200 dark:border-amber-500/20",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          label: "Past Due"
        };
      case "cancelled":
        return {
          color: "text-rose-600 dark:text-rose-400",
          bg: "bg-rose-50 dark:bg-rose-500/10",
          border: "border-rose-200 dark:border-rose-500/20",
          icon: <XCircle className="w-3.5 h-3.5" />,
          label: "Cancelled"
        };
      default:
        return {
          color: "text-slate-600 dark:text-slate-400",
          bg: "bg-slate-50 dark:bg-slate-500/10",
          border: "border-slate-200 dark:border-slate-500/20",
          icon: <Clock className="w-3.5 h-3.5" />,
          label: "Inactive"
        };
    }
  };

  const statusConfig = getStatusConfig(brand.subscription_status);
  const memberAge = formatDistanceToNow(new Date(brand.created_at), { addSuffix: false });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "w-full sm:max-w-[480px] p-0 gap-0",
          "border-l border-border/40",
          "bg-gradient-to-b from-background via-background to-muted/20",
          "shadow-2xl shadow-black/10"
        )}
      >
        <ScrollArea className="h-full">
          {/* Hero Header */}
          <div className="relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative px-6 pt-6 pb-5">
              {/* Close Button */}
              <button
                onClick={() => onOpenChange(false)}
                className={cn(
                  "absolute top-4 right-4 p-2 rounded-full",
                  "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10",
                  "transition-all duration-200 active:scale-95"
                )}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Brand Identity */}
              <div className="flex items-start gap-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-primary/0 rounded-[20px] blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Avatar className="relative h-[72px] w-[72px] rounded-[18px] border-2 border-white/80 dark:border-white/10 shadow-xl">
                    <AvatarImage src={brand.logo_url || ''} alt={brand.name} className="object-cover" />
                    <AvatarFallback className="rounded-[18px] bg-gradient-to-br from-primary via-primary to-primary/80 text-xl font-semibold text-white">
                      {brand.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {brand.is_verified && (
                    <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full shadow-lg border border-border/50">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="text-xl font-semibold tracking-tight truncate mb-1.5">
                    {brand.name}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                      statusConfig.bg, statusConfig.color, statusConfig.border
                    )}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                    {brand.subscription_plan && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground capitalize">
                        {brand.subscription_plan}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Info Pills */}
              <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {memberAge} old
                </span>
                {brand.home_url && (
                  <a
                    href={brand.home_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Stats Grid - Apple Card Style */}
            <div className="px-6 pb-5">
              <div className="grid grid-cols-2 gap-3">
                {/* Balance Card - Featured */}
                <div
                  onClick={() => !loading && setShowWalletAdjust(!showWalletAdjust)}
                  className={cn(
                    "col-span-2 p-4 rounded-2xl cursor-pointer group",
                    "bg-gradient-to-br from-emerald-500 to-emerald-600",
                    "shadow-lg shadow-emerald-500/20",
                    "transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02]",
                    "active:scale-[0.98]"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-emerald-100 text-xs font-medium mb-1">Wallet Balance</p>
                      <p className="text-white text-3xl font-bold tracking-tight">
                        {loading ? (
                          <Loader2 className="h-7 w-7 animate-spin text-white/60" />
                        ) : (
                          `$${stats?.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`
                        )}
                      </p>
                    </div>
                    <div className={cn(
                      "p-2.5 rounded-xl bg-white/20 backdrop-blur-sm",
                      "group-hover:bg-white/30 transition-colors"
                    )}>
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-emerald-100 text-xs">
                    <span>Tap to adjust</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Stat Cards */}
                <StatCard
                  label="Campaigns"
                  value={loading ? null : stats?.activeCampaigns || 0}
                  subValue={`${stats?.totalCampaigns || 0} total`}
                  icon={<Target className="w-4 h-4" />}
                  color="blue"
                />
                <StatCard
                  label="Total Spend"
                  value={loading ? null : `$${stats?.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}`}
                  subValue={`$${stats?.totalDeposits.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"} deposited`}
                  icon={<TrendingUp className="w-4 h-4" />}
                  color="violet"
                />
              </div>
            </div>
          </div>

          {/* Wallet Adjustment Panel */}
          {showWalletAdjust && (
            <div className="px-6 pb-5 animate-in slide-in-from-top-2 duration-300">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Adjust Balance</h3>
                  <button
                    onClick={() => setShowWalletAdjust(false)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Action Toggle */}
                <div className="flex gap-2 p-1 bg-muted/60 rounded-xl">
                  <button
                    onClick={() => setWalletAction("add")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                      walletAction === "add"
                        ? "bg-emerald-500 text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                  <button
                    onClick={() => setWalletAction("remove")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                      walletAction === "remove"
                        ? "bg-rose-500 text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Minus className="w-4 h-4" />
                    Remove
                  </button>
                </div>

                {/* Amount */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 h-12 text-lg font-medium rounded-xl border-border/50 bg-background"
                  />
                </div>

                {/* Note */}
                <Input
                  value={walletDescription}
                  onChange={(e) => setWalletDescription(e.target.value)}
                  placeholder="Add a note (optional)"
                  className="h-11 rounded-xl border-border/50 bg-background"
                />

                {/* Preview & Submit */}
                {walletAmount && parseFloat(walletAmount) > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 text-sm">
                    <span className="text-muted-foreground">New balance</span>
                    <span className={cn(
                      "font-semibold",
                      walletAction === "add" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      ${((stats?.walletBalance || 0) + (walletAction === "add" ? 1 : -1) * parseFloat(walletAmount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleWalletAdjustment}
                  disabled={isAdjustingWallet || !walletAmount}
                  className={cn(
                    "w-full h-11 rounded-xl font-medium",
                    walletAction === "add"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-rose-500 hover:bg-rose-600"
                  )}
                >
                  {isAdjustingWallet ? "Processing..." : `${walletAction === "add" ? "Add" : "Remove"} Funds`}
                </Button>
              </div>
            </div>
          )}

          {/* Section Tabs */}
          <div className="px-6 pb-2 sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/0 pt-1">
            <div className="flex gap-1 p-1 bg-muted/50 backdrop-blur-xl rounded-xl border border-border/30">
              {[
                { id: "overview", label: "Overview", icon: Building2 },
                { id: "activity", label: "Activity", icon: Activity },
                { id: "settings", label: "Settings", icon: CreditCard },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                    activeSection === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Sections */}
          <div className="px-6 py-4 space-y-6">
            {activeSection === "overview" && (
              <>
                {/* Team Members */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">Team</h3>
                    <span className="text-xs text-muted-foreground">{teamMembers.length} members</span>
                  </div>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : teamMembers.length > 0 ? (
                      teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-10 w-10 border border-border/50">
                            <AvatarImage src={member.user?.avatar_url || ''} />
                            <AvatarFallback className="text-xs font-medium">
                              {member.user?.username?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.user?.full_name || member.user?.username || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No team members</p>
                    )}
                  </div>
                </section>

                {/* Campaigns */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">Recent Campaigns</h3>
                    <button
                      onClick={() => navigate(`/brand/${brand.slug}/campaigns`)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View all
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : campaigns.length > 0 ? (
                      campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/brand/${brand.slug}/campaigns`)}
                        >
                          <div className={cn(
                            "p-2 rounded-lg",
                            campaign.status === "active" ? "bg-emerald-500/10" : "bg-muted"
                          )}>
                            {campaign.status === "active" ? (
                              <Play className="w-4 h-4 text-emerald-500" />
                            ) : campaign.status === "paused" ? (
                              <Pause className="w-4 h-4 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{campaign.title}</p>
                            <p className="text-xs text-muted-foreground">
                              ${campaign.budget?.toLocaleString() || 0} budget
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] capitalize",
                              campaign.status === "active" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {campaign.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No campaigns yet</p>
                    )}
                  </div>
                </section>

                {/* Quick Actions */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton
                      icon={<Building2 className="w-5 h-5" />}
                      label="Dashboard"
                      onClick={() => navigate(`/brand/${brand.slug}`)}
                    />
                    <ActionButton
                      icon={<BarChart3 className="w-5 h-5" />}
                      label="Analytics"
                      onClick={() => navigate(`/brand/${brand.slug}/analytics`)}
                    />
                  </div>
                </section>
              </>
            )}

            {activeSection === "activity" && (
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent Transactions</h3>
                <div className="space-y-1">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div
                        key={activity.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors",
                          index === 0 && "bg-muted/20"
                        )}
                      >
                        <div className="p-2 rounded-lg bg-muted/50">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {activity.amount && (
                          <span className={cn(
                            "text-sm font-semibold tabular-nums",
                            ["deposit", "topup", "admin_credit", "refund"].includes(activity.type)
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}>
                            {["deposit", "topup", "admin_credit", "refund"].includes(activity.type) ? "+" : "-"}
                            ${activity.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No activity yet</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeSection === "settings" && (
              <div className="space-y-6">
                {/* Subscription Settings */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Subscription</h3>
                  <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem value="past_due">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              Past Due
                            </div>
                          </SelectItem>
                          <SelectItem value="cancelled">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-rose-500" />
                              Cancelled
                            </div>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-slate-400" />
                              Inactive
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Plan</Label>
                      <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="growth">Growth</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleUpdateSubscription}
                      disabled={isUpdatingSubscription}
                      className="w-full h-11 rounded-xl"
                    >
                      {isUpdatingSubscription ? "Saving..." : "Update Subscription"}
                    </Button>
                  </div>
                </section>

                {/* Brand Info */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Details</h3>
                  <div className="rounded-2xl bg-muted/30 border border-border/30 divide-y divide-border/30">
                    <InfoRow label="Created" value={format(new Date(brand.created_at), 'MMMM d, yyyy')} />
                    <InfoRow label="Slug" value={brand.slug} mono />
                    {brand.brand_type && <InfoRow label="Type" value={brand.brand_type} />}
                    {brand.renewal_date && (
                      <InfoRow label="Renews" value={format(new Date(brand.renewal_date), 'MMM d, yyyy')} />
                    )}
                  </div>
                </section>

                {/* Description */}
                {brand.description && (
                  <section>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">About</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed p-4 rounded-2xl bg-muted/30 border border-border/30">
                      {brand.description}
                    </p>
                  </section>
                )}
              </div>
            )}
          </div>

          {/* Bottom Safe Area */}
          <div className="h-6" />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Helper Components
function StatCard({
  label,
  value,
  subValue,
  icon,
  color
}: {
  label: string;
  value: string | number | null;
  subValue?: string;
  icon: React.ReactNode;
  color: "blue" | "violet" | "amber" | "rose";
}) {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    rose: "from-rose-500/10 to-rose-500/5 border-rose-500/20",
  };

  const iconColorClasses = {
    blue: "text-blue-500",
    violet: "text-violet-500",
    amber: "text-amber-500",
    rose: "text-rose-500",
  };

  return (
    <div className={cn(
      "p-4 rounded-2xl border",
      "bg-gradient-to-br",
      colorClasses[color]
    )}>
      <div className="flex items-start justify-between mb-2">
        <span className={iconColorClasses[color]}>{icon}</span>
      </div>
      <p className="text-xl font-bold tracking-tight">
        {value === null ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {subValue && <p className="text-[10px] text-muted-foreground/70 mt-1">{subValue}</p>}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl",
        "bg-muted/30 hover:bg-muted/50 border border-border/30",
        "transition-all duration-200 active:scale-[0.98]"
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function InfoRow({
  label,
  value,
  mono
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        "text-sm font-medium capitalize",
        mono && "font-mono text-xs bg-muted/50 px-2 py-0.5 rounded"
      )}>
        {value}
      </span>
    </div>
  );
}
