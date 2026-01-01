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
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  User,
  CheckCircle2,
  XCircle,
  Calendar,
  ExternalLink,
  Wallet,
  Clock,
  AlertTriangle,
  ChevronRight,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  X,
  Activity,
  Target,
  Mail,
  Phone,
  Shield,
  TrendingUp,
  Users,
  Copy,
  BadgeCheck,
  Globe,
  CreditCard,
  Sparkles,
  ArrowRight,
  Ban,
  LogIn
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import discordIcon from "@/assets/discord-white-icon.webp";

interface UserProfile {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  trust_score?: number | null;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_avatar?: string | null;
  phone_number?: string | null;
  created_at?: string | null;
  total_earnings?: number;
  wallets?: {
    balance: number;
    total_earned: number;
    total_withdrawn: number;
  } | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  account_link?: string;
  avatar_url?: string | null;
  follower_count?: number | null;
  demographic_submissions?: Array<{
    status: string;
    tier1_percentage: number;
  }>;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  description?: string;
}

interface UserContextSheetProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
  onPayUser?: (user: UserProfile) => void;
}

export function UserContextSheet({ user, open, onOpenChange, onUserUpdated, onPayUser }: UserContextSheetProps) {
  const navigate = useNavigate();
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "activity" | "settings">("overview");

  // Balance adjustment state
  const [showBalanceAdjust, setShowBalanceAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjustAction, setAdjustAction] = useState<"add" | "remove">("add");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Trust score state
  const [trustScore, setTrustScore] = useState<number>(0);
  const [isUpdatingTrust, setIsUpdatingTrust] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchUserData(user.id);
      setTrustScore(user.trust_score ?? 0);
      setActiveSection("overview");
      setShowBalanceAdjust(false);
    }
  }, [user, open]);

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        supabase
          .from("social_accounts")
          .select(`
            id, platform, username, account_link, avatar_url, follower_count,
            demographic_submissions(status, tier1_percentage)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(15)
      ]);

      setSocialAccounts(accountsRes.data || []);
      setTransactions(transactionsRes.data || []);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return <img src={tiktokLogo} alt="TikTok" className="h-4 w-4" />;
      case 'instagram':
        return <img src={instagramLogo} alt="Instagram" className="h-4 w-4" />;
      case 'youtube':
        return <img src={youtubeLogo} alt="YouTube" className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earning":
      case "campaign_payout":
      case "bonus":
      case "admin_credit":
        return <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />;
      case "withdrawal":
      case "admin_debit":
        return <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const handleBalanceAdjust = async () => {
    if (!user || !adjustAmount) return;

    const numAmount = parseFloat(adjustAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const currentBalance = user.wallets?.balance || 0;
    if (adjustAction === "remove" && numAmount > currentBalance) {
      toast.error("Cannot remove more than current balance");
      return;
    }

    setIsAdjusting(true);
    try {
      const { data: adminUser } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          type: adjustAction === "add" ? "admin_credit" : "admin_debit",
          amount: numAmount,
          status: "completed",
          description: adjustDescription || `Admin ${adjustAction === "add" ? "credit" : "debit"}`
        });

      if (error) throw error;

      // Update wallet balance
      const newBalance = adjustAction === "add"
        ? currentBalance + numAmount
        : currentBalance - numAmount;

      await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      toast.success(`$${numAmount.toFixed(2)} ${adjustAction === "add" ? "added" : "removed"}`);
      setAdjustAmount("");
      setAdjustDescription("");
      setShowBalanceAdjust(false);
      fetchUserData(user.id);
      onUserUpdated?.();
    } catch (error) {
      console.error("Error adjusting balance:", error);
      toast.error("Failed to adjust balance");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleUpdateTrustScore = async () => {
    if (!user) return;
    setIsUpdatingTrust(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ trust_score: trustScore })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Trust score updated");
      onUserUpdated?.();
    } catch (error) {
      console.error("Error updating trust score:", error);
      toast.error("Failed to update trust score");
    } finally {
      setIsUpdatingTrust(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!user) return null;

  const balance = user.wallets?.balance || 0;
  const totalEarned = user.wallets?.total_earned || user.total_earnings || 0;
  const totalWithdrawn = user.wallets?.total_withdrawn || 0;
  const memberAge = user.created_at
    ? formatDistanceToNow(new Date(user.created_at), { addSuffix: false })
    : "Unknown";

  const approvedAccounts = socialAccounts.filter(
    a => a.demographic_submissions?.some(d => d.status === "approved")
  ).length;

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
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-blue-500/4 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

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

              {/* User Identity */}
              <div className="flex items-start gap-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-blue-500/0 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Avatar className="relative h-[72px] w-[72px] rounded-full border-2 border-white/80 dark:border-white/10 shadow-xl">
                    <AvatarImage src={user.avatar_url || ''} alt={user.username} className="object-cover" />
                    <AvatarFallback className="rounded-full bg-gradient-to-br from-blue-500 via-blue-500 to-blue-600 text-xl font-semibold text-white">
                      {(user.full_name || user.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {(user.trust_score || 0) >= 80 && (
                    <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full shadow-lg border border-border/50">
                      <BadgeCheck className="w-4 h-4 text-blue-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold tracking-tight truncate">
                      @{user.username}
                    </h2>
                  </div>
                  {user.full_name && (
                    <p className="text-sm text-muted-foreground truncate mb-1.5">{user.full_name}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                      (user.trust_score || 0) >= 70
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                        : (user.trust_score || 0) >= 40
                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                        : "bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20"
                    )}>
                      <Shield className="w-3.5 h-3.5" />
                      Trust: {user.trust_score || 0}
                    </span>
                    {approvedAccounts > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground">
                        {approvedAccounts} verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Info Pills */}
              <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {memberAge} member
                </span>
                {user.discord_username && (
                  <span className="flex items-center gap-1.5">
                    <img src={discordIcon} alt="Discord" className="w-3.5 h-3.5" />
                    {user.discord_username}
                  </span>
                )}
                {user.phone_number && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="px-6 pb-5">
              <div className="grid grid-cols-2 gap-3">
                {/* Balance Card - Featured */}
                <div
                  onClick={() => !loading && setShowBalanceAdjust(!showBalanceAdjust)}
                  className={cn(
                    "col-span-2 p-4 rounded-2xl cursor-pointer group",
                    "bg-gradient-to-br from-blue-500 to-blue-600",
                    "shadow-lg shadow-blue-500/20",
                    "transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02]",
                    "active:scale-[0.98]"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-blue-100 text-xs font-medium mb-1">Wallet Balance</p>
                      <p className="text-white text-3xl font-bold tracking-tight">
                        ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className={cn(
                      "p-2.5 rounded-xl bg-white/20 backdrop-blur-sm",
                      "group-hover:bg-white/30 transition-colors"
                    )}>
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-blue-100 text-xs">
                    <span>Tap to adjust</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Stat Cards */}
                <StatCard
                  label="Total Earned"
                  value={`$${totalEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  icon={<TrendingUp className="w-4 h-4" />}
                  color="emerald"
                />
                <StatCard
                  label="Accounts"
                  value={socialAccounts.length}
                  subValue={`${approvedAccounts} approved`}
                  icon={<Users className="w-4 h-4" />}
                  color="violet"
                />
              </div>
            </div>
          </div>

          {/* Balance Adjustment Panel */}
          {showBalanceAdjust && (
            <div className="px-6 pb-5 animate-in slide-in-from-top-2 duration-300">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Adjust Balance</h3>
                  <button
                    onClick={() => setShowBalanceAdjust(false)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Action Toggle */}
                <div className="flex gap-2 p-1 bg-muted/60 rounded-xl">
                  <button
                    onClick={() => setAdjustAction("add")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                      adjustAction === "add"
                        ? "bg-emerald-500 text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                  <button
                    onClick={() => setAdjustAction("remove")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                      adjustAction === "remove"
                        ? "bg-rose-500 text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Minus className="w-4 h-4" />
                    Remove
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 h-12 text-lg font-medium rounded-xl border-border/50 bg-background"
                  />
                </div>

                <Input
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="Add a note (optional)"
                  className="h-11 rounded-xl border-border/50 bg-background"
                />

                {adjustAmount && parseFloat(adjustAmount) > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 text-sm">
                    <span className="text-muted-foreground">New balance</span>
                    <span className={cn(
                      "font-semibold",
                      adjustAction === "add" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      ${(balance + (adjustAction === "add" ? 1 : -1) * parseFloat(adjustAmount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleBalanceAdjust}
                  disabled={isAdjusting || !adjustAmount}
                  className={cn(
                    "w-full h-11 rounded-xl font-medium",
                    adjustAction === "add"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-rose-500 hover:bg-rose-600"
                  )}
                >
                  {isAdjusting ? "Processing..." : `${adjustAction === "add" ? "Add" : "Remove"} Funds`}
                </Button>
              </div>
            </div>
          )}

          {/* Section Tabs */}
          <div className="px-6 pb-2 sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/0 pt-1">
            <div className="flex gap-1 p-1 bg-muted/50 backdrop-blur-xl rounded-xl border border-border/30">
              {[
                { id: "overview", label: "Overview", icon: User },
                { id: "activity", label: "Activity", icon: Activity },
                { id: "settings", label: "Settings", icon: Shield },
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
                {/* Social Accounts */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">Social Accounts</h3>
                    <span className="text-xs text-muted-foreground">{socialAccounts.length} linked</span>
                  </div>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="space-y-2">
                        {[1, 2].map(i => (
                          <Skeleton key={i} className="h-16 w-full rounded-xl" />
                        ))}
                      </div>
                    ) : socialAccounts.length > 0 ? (
                      socialAccounts.map((account) => {
                        const demo = account.demographic_submissions?.[0];
                        return (
                          <div
                            key={account.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="p-2 rounded-lg bg-muted/50">
                              {getPlatformIcon(account.platform)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">@{account.username}</p>
                                {demo?.status === "approved" && (
                                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                )}
                                {demo?.status === "pending" && (
                                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                )}
                                {demo?.status === "rejected" && (
                                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {account.follower_count?.toLocaleString() || 0} followers
                                {demo?.tier1_percentage && ` • ${demo.tier1_percentage}% T1`}
                              </p>
                            </div>
                            {account.account_link && (
                              <a
                                href={account.account_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                              >
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No social accounts linked</p>
                    )}
                  </div>
                </section>

                {/* Quick Actions */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton
                      icon={<DollarSign className="w-5 h-5" />}
                      label="Send Payment"
                      onClick={() => onPayUser?.(user)}
                    />
                    <ActionButton
                      icon={<Copy className="w-5 h-5" />}
                      label="Copy ID"
                      onClick={() => copyToClipboard(user.id)}
                    />
                  </div>
                </section>

                {/* Contact Info */}
                {(user.discord_username || user.phone_number) && (
                  <section>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Contact</h3>
                    <div className="rounded-2xl bg-muted/30 border border-border/30 divide-y divide-border/30">
                      {user.discord_username && (
                        <div className="flex items-center justify-between p-3.5">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <img src={discordIcon} alt="Discord" className="w-4 h-4" />
                            Discord
                          </div>
                          <span className="text-sm font-medium">{user.discord_username}</span>
                        </div>
                      )}
                      {user.phone_number && (
                        <div className="flex items-center justify-between p-3.5">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            Phone
                          </div>
                          <span className="text-sm font-medium">{user.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}

            {activeSection === "activity" && (
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent Transactions</h3>
                <div className="space-y-1">
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : transactions.length > 0 ? (
                    transactions.map((tx, index) => (
                      <div
                        key={tx.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors",
                          index === 0 && "bg-muted/20"
                        )}
                      >
                        <div className="p-2 rounded-lg bg-muted/50">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">
                            {tx.type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          ["earning", "campaign_payout", "bonus", "admin_credit", "refund"].includes(tx.type)
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}>
                          {["earning", "campaign_payout", "bonus", "admin_credit", "refund"].includes(tx.type) ? "+" : "-"}
                          ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No transactions yet</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeSection === "settings" && (
              <div className="space-y-6">
                {/* Trust Score */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Trust Score</h3>
                  <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={trustScore}
                        onChange={(e) => setTrustScore(Number(e.target.value))}
                        className="h-11 rounded-xl border-border/50 w-24"
                      />
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300",
                              trustScore >= 70 ? "bg-emerald-500" :
                              trustScore >= 40 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${trustScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleUpdateTrustScore}
                      disabled={isUpdatingTrust}
                      className="w-full h-11 rounded-xl"
                    >
                      {isUpdatingTrust ? "Saving..." : "Update Trust Score"}
                    </Button>
                  </div>
                </section>

                {/* User Info */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Details</h3>
                  <div className="rounded-2xl bg-muted/30 border border-border/30 divide-y divide-border/30">
                    <InfoRow label="User ID" value={user.id.slice(0, 8) + "..."} mono />
                    {user.created_at && (
                      <InfoRow label="Joined" value={format(new Date(user.created_at), 'MMMM d, yyyy')} />
                    )}
                    <InfoRow label="Total Withdrawn" value={`$${totalWithdrawn.toLocaleString()}`} />
                  </div>
                </section>
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
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: "emerald" | "violet" | "blue" | "amber";
}) {
  const colorClasses = {
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
  };

  const iconColorClasses = {
    emerald: "text-emerald-500",
    violet: "text-violet-500",
    blue: "text-blue-500",
    amber: "text-amber-500",
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
      <p className="text-xl font-bold tracking-tight">{value}</p>
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
        "text-sm font-medium",
        mono && "font-mono text-xs bg-muted/50 px-2 py-0.5 rounded"
      )}>
        {value}
      </span>
    </div>
  );
}
