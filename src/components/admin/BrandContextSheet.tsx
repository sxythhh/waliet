import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  Mail,
  Phone,
  MapPin,
  Sparkles,
  BarChart3,
  Settings,
  ChevronRight,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
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
  totalCreators: number;
  totalSpend: number;
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
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "subscription" | "wallet">("overview");

  // Subscription editing state
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("");
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);

  // Wallet adjustment state
  const [walletAmount, setWalletAmount] = useState("");
  const [walletDescription, setWalletDescription] = useState("");
  const [walletAction, setWalletAction] = useState<"add" | "remove">("add");
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);

  useEffect(() => {
    if (brand && open) {
      fetchBrandStats(brand.id);
      setSubscriptionStatus(brand.subscription_status || "inactive");
      setSubscriptionPlan(brand.subscription_plan || "");
      setActiveSection("overview");
    }
  }, [brand, open]);

  const fetchBrandStats = async (brandId: string) => {
    setLoading(true);
    try {
      // Fetch wallet balance
      const { data: transactions } = await supabase
        .from("brand_wallet_transactions")
        .select("type, amount, status")
        .eq("brand_id", brandId);

      const walletBalance = (transactions || []).reduce((acc, tx) => {
        if (tx.status !== "completed") return acc;
        const txAmount = Number(tx.amount) || 0;
        if (["deposit", "topup", "refund", "admin_credit"].includes(tx.type)) {
          return acc + txAmount;
        } else {
          return acc - txAmount;
        }
      }, 0);

      // Fetch campaign stats
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, status")
        .eq("brand_id", brandId);

      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === "active").length || 0;

      // Calculate total spend from completed transactions
      const totalSpend = (transactions || []).reduce((acc, tx) => {
        if (tx.status !== "completed") return acc;
        const txAmount = Number(tx.amount) || 0;
        if (!["deposit", "topup", "refund", "admin_credit"].includes(tx.type)) {
          return acc + txAmount;
        }
        return acc;
      }, 0);

      setStats({
        walletBalance,
        totalCampaigns,
        activeCampaigns,
        totalCreators: 0, // Would need a proper query
        totalSpend,
      });
    } catch (error) {
      console.error("Error fetching brand stats:", error);
    } finally {
      setLoading(false);
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

      toast.success("Subscription updated successfully");
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

      toast.success(`Successfully ${walletAction === "add" ? "added" : "removed"} $${numAmount.toFixed(2)}`);
      setWalletAmount("");
      setWalletDescription("");
      fetchBrandStats(brand.id);
      onBrandUpdated?.();
    } catch (error) {
      console.error("Error adjusting balance:", error);
      toast.error("Failed to adjust balance");
    } finally {
      setIsAdjustingWallet(false);
    }
  };

  if (!brand) return null;

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active": return "text-emerald-500 bg-emerald-500/10";
      case "past_due": return "text-amber-500 bg-amber-500/10";
      case "cancelled": return "text-rose-500 bg-rose-500/10";
      default: return "text-slate-400 bg-slate-500/10";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "active": return <CheckCircle2 className="w-4 h-4" />;
      case "past_due": return <AlertTriangle className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 border-l border-border/50 bg-background/95 backdrop-blur-xl">
        <ScrollArea className="h-full">
          {/* Header with Brand Info */}
          <div className="relative">
            {/* Background Gradient */}
            <div className="absolute inset-0 h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />

            <div className="relative p-6 pb-4">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-16 w-16 rounded-2xl border-2 border-background shadow-lg">
                  <AvatarImage src={brand.logo_url || ''} alt={brand.name} className="object-cover" />
                  <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-lg font-bold text-white">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold truncate">{brand.name}</h2>
                    {brand.is_verified && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("capitalize gap-1", getStatusColor(brand.subscription_status))}>
                      {getStatusIcon(brand.subscription_status)}
                      {brand.subscription_status || "Inactive"}
                    </Badge>
                    {brand.subscription_plan && (
                      <Badge variant="secondary" className="capitalize">
                        {brand.subscription_plan}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card/50 border border-border/50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold">
                    {loading ? <Skeleton className="h-6 w-16 mx-auto" /> : `$${stats?.walletBalance.toFixed(2) || "0.00"}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Balance</p>
                </div>
                <div className="bg-card/50 border border-border/50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold">
                    {loading ? <Skeleton className="h-6 w-10 mx-auto" /> : stats?.activeCampaigns || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Campaigns</p>
                </div>
                <div className="bg-card/50 border border-border/50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold">
                    {loading ? <Skeleton className="h-6 w-16 mx-auto" /> : `$${stats?.totalSpend.toFixed(0) || "0"}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Spent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="px-6 pb-2">
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
              {[
                { id: "overview", label: "Overview", icon: Building2 },
                { id: "subscription", label: "Plan", icon: CreditCard },
                { id: "wallet", label: "Wallet", icon: Wallet },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all",
                    activeSection === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section Content */}
          <div className="p-6 pt-4 space-y-4">
            {activeSection === "overview" && (
              <>
                {/* Brand Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
                  <div className="bg-card/50 border border-border/50 rounded-xl divide-y divide-border/50">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Created
                      </div>
                      <span className="text-sm font-medium">
                        {format(new Date(brand.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {brand.home_url && (
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Globe className="w-4 h-4" />
                          Website
                        </div>
                        <a
                          href={brand.home_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          Visit
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {brand.brand_type && (
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          Type
                        </div>
                        <span className="text-sm font-medium capitalize">{brand.brand_type}</span>
                      </div>
                    )}
                    {brand.renewal_date && (
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Renewal
                        </div>
                        <span className="text-sm font-medium">
                          {format(new Date(brand.renewal_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {brand.description && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">About</h3>
                    <p className="text-sm text-muted-foreground bg-card/50 border border-border/50 rounded-xl p-4">
                      {brand.description}
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex-col gap-1"
                      onClick={() => navigate(`/brand/${brand.slug}`)}
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="text-xs">Dashboard</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex-col gap-1"
                      onClick={() => navigate(`/brand/${brand.slug}/campaigns`)}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-xs">Campaigns</span>
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeSection === "subscription" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Status</Label>
                  <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Active
                        </div>
                      </SelectItem>
                      <SelectItem value="past_due">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Past Due
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-rose-500" />
                          Cancelled
                        </div>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          Inactive
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Plan</Label>
                  <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
                    <SelectTrigger>
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
                  className="w-full"
                  onClick={handleUpdateSubscription}
                  disabled={isUpdatingSubscription}
                >
                  {isUpdatingSubscription ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}

            {activeSection === "wallet" && (
              <div className="space-y-4">
                {/* Current Balance */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-3xl font-bold">
                    ${stats?.walletBalance.toFixed(2) || "0.00"}
                  </p>
                </div>

                {/* Action Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={walletAction === "add" ? "default" : "outline"}
                    className="flex-1 gap-1.5"
                    onClick={() => setWalletAction("add")}
                  >
                    <Plus className="h-4 w-4" />
                    Add Funds
                  </Button>
                  <Button
                    variant={walletAction === "remove" ? "default" : "outline"}
                    className="flex-1 gap-1.5"
                    onClick={() => setWalletAction("remove")}
                  >
                    <Minus className="h-4 w-4" />
                    Remove
                  </Button>
                </div>

                {/* Amount Input */}
                <div className="space-y-3">
                  <Label>Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={walletDescription}
                    onChange={(e) => setWalletDescription(e.target.value)}
                    placeholder="Reason for adjustment..."
                    rows={2}
                  />
                </div>

                {/* Preview */}
                {walletAmount && parseFloat(walletAmount) > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">New Balance:</span>
                      <span className={cn(
                        "font-medium flex items-center gap-1",
                        walletAction === "add" ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {walletAction === "add" ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        ${((stats?.walletBalance || 0) + (walletAction === "add" ? 1 : -1) * parseFloat(walletAmount)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleWalletAdjustment}
                  disabled={isAdjustingWallet || !walletAmount}
                >
                  {isAdjustingWallet ? "Processing..." : "Confirm Adjustment"}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
