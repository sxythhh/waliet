import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
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
  email?: string | null;
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
  metadata?: {
    campaign_id?: string;
    platform?: string;
    reversed?: boolean;
    [key: string]: any;
  };
  campaign_name?: string;
  campaign_logo_url?: string;
}

interface UserContextSheetProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
  onPayUser?: (user: UserProfile) => void;
}

export function UserContextSheet({ user, open, onOpenChange, onUserUpdated, onPayUser }: UserContextSheetProps) {
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "settings">("overview");

  // Balance adjustment state
  const [showBalanceAdjust, setShowBalanceAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjustAction, setAdjustAction] = useState<"add" | "remove">("add");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Trust score state
  const [trustScore, setTrustScore] = useState<number>(0);
  const [isUpdatingTrust, setIsUpdatingTrust] = useState(false);

  // Link account state
  const [showLinkAccount, setShowLinkAccount] = useState(false);
  const [linkPlatform, setLinkPlatform] = useState<"tiktok" | "instagram" | "youtube">("tiktok");
  const [linkUsername, setLinkUsername] = useState("");
  const [linkAccountUrl, setLinkAccountUrl] = useState("");
  const [isLinkingAccount, setIsLinkingAccount] = useState(false);

  // Transaction context state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionContextOpen, setTransactionContextOpen] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchUserData(user.id);
      setTrustScore(user.trust_score ?? 0);
      setActiveTab("overview");
      setShowBalanceAdjust(false);
      setShowLinkAccount(false);
      setLinkUsername("");
      setLinkAccountUrl("");
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

      // Fetch campaign info for transactions
      const txData = transactionsRes.data || [];
      const campaignIds = txData
        .filter(tx => tx.metadata?.campaign_id)
        .map(tx => tx.metadata.campaign_id);

      let campaignsMap: Record<string, any> = {};
      if (campaignIds.length > 0) {
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, title, brand_logo_url")
          .in("id", campaignIds);
        campaignsMap = campaigns?.reduce((acc, c) => ({ ...acc, [c.id]: c }), {}) || {};
      }

      const formattedTx = txData.map(tx => ({
        ...tx,
        campaign_name: tx.metadata?.campaign_id ? campaignsMap[tx.metadata.campaign_id]?.title : null,
        campaign_logo_url: tx.metadata?.campaign_id ? campaignsMap[tx.metadata.campaign_id]?.brand_logo_url : null,
      }));

      setTransactions(formattedTx);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformLogo = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return <img src={tiktokLogo} alt="TikTok" className="h-3.5 w-3.5 opacity-60" />;
      case 'instagram':
        return <img src={instagramLogo} alt="Instagram" className="h-3.5 w-3.5 opacity-60" />;
      case 'youtube':
        return <img src={youtubeLogo} alt="YouTube" className="h-3.5 w-3.5 opacity-60" />;
      default:
        return null;
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

  const handleLinkAccount = async () => {
    if (!user || !linkUsername.trim()) return;

    setIsLinkingAccount(true);
    try {
      // Generate account link if not provided
      let accountLink = linkAccountUrl.trim();
      if (!accountLink) {
        const cleanUsername = linkUsername.replace(/^@/, '');
        switch (linkPlatform) {
          case 'tiktok':
            accountLink = `https://tiktok.com/@${cleanUsername}`;
            break;
          case 'instagram':
            accountLink = `https://instagram.com/${cleanUsername}`;
            break;
          case 'youtube':
            accountLink = `https://youtube.com/@${cleanUsername}`;
            break;
        }
      }

      // Check if account already exists for this user
      const { data: existing } = await supabase
        .from("social_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("platform", linkPlatform)
        .eq("username", linkUsername.replace(/^@/, ''))
        .maybeSingle();

      if (existing) {
        toast.error("This account is already linked");
        return;
      }

      const { error } = await supabase
        .from("social_accounts")
        .insert({
          user_id: user.id,
          platform: linkPlatform,
          username: linkUsername.replace(/^@/, ''),
          account_link: accountLink,
          is_verified: false,
        });

      if (error) throw error;

      toast.success(`${linkPlatform} account linked successfully`);
      setLinkUsername("");
      setLinkAccountUrl("");
      setShowLinkAccount(false);
      fetchUserData(user.id);
      onUserUpdated?.();
    } catch (error) {
      console.error("Error linking account:", error);
      toast.error("Failed to link account");
    } finally {
      setIsLinkingAccount(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      earning: 'Earning',
      withdrawal: 'Withdrawal',
      balance_correction: 'Correction',
      transfer_sent: 'Transfer Out',
      transfer_received: 'Transfer In',
      referral_bonus: 'Referral',
      admin_credit: 'Admin Credit',
      admin_debit: 'Admin Debit',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      earning: 'text-emerald-500',
      withdrawal: 'text-orange-500',
      balance_correction: 'text-blue-500',
      transfer_sent: 'text-red-500',
      transfer_received: 'text-emerald-500',
      referral_bonus: 'text-purple-500',
      admin_credit: 'text-emerald-500',
      admin_debit: 'text-red-500',
    };
    return colors[type] || 'text-muted-foreground';
  };

  const openTransactionContext = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setTransactionContextOpen(true);
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
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[420px] p-0 border-l border-border/50 bg-background">
        <ScrollArea className="h-full">
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-border/50">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 rounded-full border border-border/50">
                <AvatarImage src={user.avatar_url || ''} alt={user.username} />
                <AvatarFallback className="rounded-full bg-muted text-muted-foreground font-inter tracking-[-0.5px] text-lg">
                  {(user.full_name || user.username || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] truncate">
                  @{user.username}
                </h2>
                {user.full_name && (
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] truncate">
                    {user.full_name}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  <span>{memberAge}</span>
                  <span className="text-border">·</span>
                  <span>Trust {user.trust_score || 0}</span>
                  {approvedAccounts > 0 && (
                    <>
                      <span className="text-border">·</span>
                      <span>{approvedAccounts} verified</span>
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
              onClick={() => setShowBalanceAdjust(!showBalanceAdjust)}
            >
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">
                Balance
              </p>
              <p className="text-3xl font-semibold font-inter tracking-[-0.5px]">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {showBalanceAdjust && (
              <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustAction("add")}
                    className={cn(
                      "flex-1 py-2 text-sm font-inter tracking-[-0.5px] rounded-lg transition-colors",
                      adjustAction === "add"
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAdjustAction("remove")}
                    className={cn(
                      "flex-1 py-2 text-sm font-inter tracking-[-0.5px] rounded-lg transition-colors",
                      adjustAction === "remove"
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
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 h-10 font-inter tracking-[-0.5px] bg-muted border-0"
                  />
                </div>
                <Input
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="Note (optional)"
                  className="h-10 font-inter tracking-[-0.5px] bg-muted border-0"
                />
                {adjustAmount && parseFloat(adjustAmount) > 0 && (
                  <div className="flex items-center justify-between text-sm font-inter tracking-[-0.5px]">
                    <span className="text-muted-foreground">New balance</span>
                    <span className="font-medium">
                      ${(balance + (adjustAction === "add" ? 1 : -1) * parseFloat(adjustAmount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <Button
                  onClick={handleBalanceAdjust}
                  disabled={isAdjusting || !adjustAmount}
                  className="w-full h-10 font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90"
                >
                  {isAdjusting ? "Processing..." : `${adjustAction === "add" ? "Add" : "Remove"} Funds`}
                </Button>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-6 mt-5 pt-5 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Total Earned</p>
                <p className="text-lg font-semibold font-inter tracking-[-0.5px]">
                  ${totalEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-0.5">Withdrawn</p>
                <p className="text-lg font-semibold font-inter tracking-[-0.5px]">
                  ${totalWithdrawn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                {/* Account Info */}
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                    Account Info
                  </h3>
                  <div className="space-y-0">
                    {user.email && (
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Email</span>
                        <span className="text-sm font-inter tracking-[-0.5px] truncate max-w-[180px]">{user.email}</span>
                      </div>
                    )}
                    {user.phone_number && (
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Phone</span>
                        <span className="text-sm font-inter tracking-[-0.5px]">{user.phone_number}</span>
                      </div>
                    )}
                    {user.discord_username && (
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <div className="flex items-center gap-2">
                          <img src={discordIcon} alt="Discord" className="w-4 h-4 opacity-60" />
                          <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Discord</span>
                        </div>
                        <span className="text-sm font-inter tracking-[-0.5px]">{user.discord_username}</span>
                      </div>
                    )}
                    {user.created_at && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Member since</span>
                        <span className="text-sm font-inter tracking-[-0.5px]">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Social Accounts */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">
                      Social Accounts
                    </h3>
                    <button
                      onClick={() => setShowLinkAccount(!showLinkAccount)}
                      className="text-xs text-primary hover:text-primary/80 font-inter tracking-[-0.5px] font-medium"
                    >
                      {showLinkAccount ? "Cancel" : "+ Link Account"}
                    </button>
                  </div>

                  {/* Link Account Form */}
                  {showLinkAccount && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex gap-2">
                        {(["tiktok", "instagram", "youtube"] as const).map((platform) => (
                          <button
                            key={platform}
                            onClick={() => setLinkPlatform(platform)}
                            className={cn(
                              "flex-1 py-2 text-xs font-inter tracking-[-0.5px] rounded-md transition-colors capitalize",
                              linkPlatform === platform
                                ? "bg-foreground text-background"
                                : "bg-background text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                      <Input
                        value={linkUsername}
                        onChange={(e) => setLinkUsername(e.target.value)}
                        placeholder="@username"
                        className="h-9 text-sm font-inter tracking-[-0.5px] bg-background border-0"
                      />
                      <Input
                        value={linkAccountUrl}
                        onChange={(e) => setLinkAccountUrl(e.target.value)}
                        placeholder="Profile URL (optional)"
                        className="h-9 text-sm font-inter tracking-[-0.5px] bg-background border-0"
                      />
                      <Button
                        onClick={handleLinkAccount}
                        disabled={isLinkingAccount || !linkUsername.trim()}
                        className="w-full h-9 text-sm font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90"
                      >
                        {isLinkingAccount ? "Linking..." : "Link Account"}
                      </Button>
                    </div>
                  )}

                  {loading ? (
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-4 text-center">
                      Loading...
                    </p>
                  ) : socialAccounts.length > 0 ? (
                    <div className="space-y-1">
                      {socialAccounts.map((account) => {
                        const demo = account.demographic_submissions?.[0];
                        return (
                          <div
                            key={account.id}
                            className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              {getPlatformLogo(account.platform)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">
                                  @{account.username}
                                </p>
                                {demo?.status === "approved" && (
                                  <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                                {account.follower_count?.toLocaleString() || 0} followers
                                {demo?.tier1_percentage ? ` · ${demo.tier1_percentage}% T1` : ''}
                              </p>
                            </div>
                            {account.account_link && (
                              <a
                                href={account.account_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px]"
                              >
                                View
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-4 text-center">
                      No accounts linked
                    </p>
                  )}
                </section>

                {/* Actions */}
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                    Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => onPayUser?.(user)}
                      className="h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                    >
                      Pay User
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => copyToClipboard(user.id)}
                      className="h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                    >
                      Copy ID
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (user.email) {
                          copyToClipboard(user.email);
                        }
                      }}
                      disabled={!user.email}
                      className="h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                    >
                      Copy Email
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        window.open(`/creator/${user.username}`, '_blank');
                      }}
                      className="h-9 text-sm font-inter tracking-[-0.5px] bg-muted/50 hover:bg-muted"
                    >
                      View Profile
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
                ) : transactions.length > 0 ? (
                  <div className="space-y-0">
                    {transactions.map((tx) => {
                      const isCredit = ["earning", "campaign_payout", "bonus", "admin_credit", "refund", "transfer_received", "referral_bonus"].includes(tx.type);
                      return (
                        <div
                          key={tx.id}
                          onClick={() => openTransactionContext(tx)}
                          className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 cursor-pointer group hover:bg-muted/30 -mx-3 px-3 rounded-lg transition-colors"
                        >
                          <div>
                            <p className="text-sm font-inter tracking-[-0.5px] capitalize group-hover:underline">
                              {getTypeLabel(tx.type)}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                                {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                              </p>
                              {tx.campaign_name && (
                                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate max-w-[120px]">
                                  · {tx.campaign_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={cn(
                            "text-sm font-medium font-inter tracking-[-0.5px] tabular-nums",
                            isCredit ? "text-emerald-500" : "text-red-500"
                          )}>
                            {isCredit ? "+" : "-"}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-8 text-center">
                    No transactions
                  </p>
                )}
              </section>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Trust Score */}
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                    Trust Score
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={trustScore}
                        onChange={(e) => setTrustScore(Number(e.target.value))}
                        className="w-20 h-10 font-inter tracking-[-0.5px] bg-muted border-0 text-center"
                      />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground/60 transition-all"
                          style={{ width: `${trustScore}%` }}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleUpdateTrustScore}
                      disabled={isUpdatingTrust}
                      className="w-full h-10 font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90"
                    >
                      {isUpdatingTrust ? "Saving..." : "Update Score"}
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
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">User ID</span>
                      <span className="text-sm font-mono text-muted-foreground">
                        {user.id.slice(0, 8)}...
                      </span>
                    </div>
                    {user.created_at && (
                      <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Joined</span>
                        <span className="text-sm font-inter tracking-[-0.5px]">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Accounts</span>
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        {socialAccounts.length} linked
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>

          <div className="h-6" />
        </ScrollArea>
      </SheetContent>
    </Sheet>

    {/* Transaction Context Sheet */}
    <Sheet open={transactionContextOpen} onOpenChange={setTransactionContextOpen}>
      <SheetContent className="w-full sm:max-w-md p-0 border-l border-border/50">
        <ScrollArea className="h-full">
          {selectedTransaction && (
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user?.avatar_url || ''} alt={user?.username} />
                    <AvatarFallback className="text-sm font-medium">
                      {(user?.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold font-inter tracking-[-0.5px]">
                      {user?.username || 'Unknown'}
                    </h3>
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full",
                  getTypeColor(selectedTransaction.type),
                  selectedTransaction.amount >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
                )}>
                  {getTypeLabel(selectedTransaction.type)}
                </span>
              </div>

              {/* Amount */}
              <div className="py-2">
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">Amount</p>
                <p className={cn(
                  "text-3xl font-bold font-inter tracking-[-0.5px]",
                  selectedTransaction.amount >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {selectedTransaction.amount >= 0 ? '+' : ''}${Math.abs(selectedTransaction.amount).toFixed(2)}
                </p>
                {/* Amount after fees for withdrawals */}
                {selectedTransaction.type === 'withdrawal' && (() => {
                  const amount = Math.abs(selectedTransaction.amount);
                  const payoutMethod = selectedTransaction.metadata?.payout_method;
                  // PayPal and UPI don't have processing fees
                  if (payoutMethod === 'paypal' || payoutMethod === 'upi') return null;
                  // Calculate fee: $1 + 0.75%
                  const percentageFee = amount * 0.0075;
                  const totalFee = percentageFee + 1;
                  const netAmount = amount - totalFee;
                  if (netAmount <= 0) return null;
                  return (
                    <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mt-1">
                      After fees: <span className="text-foreground font-medium">${netAmount.toFixed(2)}</span>
                      <span className="text-xs ml-1">(-${totalFee.toFixed(2)})</span>
                    </p>
                  );
                })()}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.5px]">Details</h4>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Status</span>
                    <span className="text-sm font-inter tracking-[-0.5px] capitalize px-2 py-0.5 bg-muted rounded-md">
                      {selectedTransaction.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Date</span>
                    <span className="text-sm font-inter tracking-[-0.5px]">
                      {format(new Date(selectedTransaction.created_at), "MMM dd, yyyy HH:mm")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Time ago</span>
                    <span className="text-sm font-inter tracking-[-0.5px]">
                      {formatDistanceToNow(new Date(selectedTransaction.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {selectedTransaction.campaign_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Campaign</span>
                      <div className="flex items-center gap-2">
                        {selectedTransaction.campaign_logo_url && (
                          <img
                            src={selectedTransaction.campaign_logo_url}
                            alt=""
                            className="h-4 w-4 rounded object-cover"
                          />
                        )}
                        <span className="text-sm font-inter tracking-[-0.5px] truncate max-w-[150px]">
                          {selectedTransaction.campaign_name}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedTransaction.metadata?.platform && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Platform</span>
                      <div className="flex items-center gap-2">
                        {getPlatformLogo(selectedTransaction.metadata.platform)}
                        <span className="text-sm font-inter tracking-[-0.5px] capitalize">
                          {selectedTransaction.metadata.platform}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Crypto network for withdrawals */}
                  {selectedTransaction.type === 'withdrawal' && selectedTransaction.metadata?.network && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Network</span>
                      <span className="text-sm font-inter tracking-[-0.5px] capitalize">
                        {selectedTransaction.metadata.network}
                      </span>
                    </div>
                  )}

                  {/* Payout method for withdrawals */}
                  {selectedTransaction.type === 'withdrawal' && selectedTransaction.metadata?.payout_method && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Method</span>
                      <span className="text-sm font-inter tracking-[-0.5px] capitalize">
                        {selectedTransaction.metadata.payout_method === 'paypal' ? 'PayPal' : selectedTransaction.metadata.payout_method}
                      </span>
                    </div>
                  )}

                  {/* Payout destination address/email for withdrawals */}
                  {selectedTransaction.type === 'withdrawal' && selectedTransaction.metadata?.payout_details && (() => {
                    const details = selectedTransaction.metadata.payout_details;
                    const method = selectedTransaction.metadata.payout_method;

                    let label = 'Destination';
                    let value = '';

                    if (method === 'crypto' && details.address) {
                      label = 'Wallet Address';
                      value = details.address;
                    } else if (method === 'paypal' && details.email) {
                      label = 'PayPal Email';
                      value = details.email;
                    } else if (method === 'bank' && details.accountNumber) {
                      label = 'Account';
                      value = `${details.bankName || 'Bank'} ****${details.accountNumber.slice(-4)}`;
                    } else if (method === 'wise' && details.email) {
                      label = 'Wise Email';
                      value = details.email;
                    } else if (method === 'revolut' && details.email) {
                      label = 'Revolut Email';
                      value = details.email;
                    } else if (method === 'upi' && details.upi_id) {
                      label = 'UPI ID';
                      value = details.upi_id;
                    } else if (method === 'tips' && details.username) {
                      label = 'TIPS Username';
                      value = details.username;
                    }

                    if (!value) return null;

                    return (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">{label}</span>
                        <button
                          onClick={() => copyToClipboard(value)}
                          className="text-sm font-mono text-foreground bg-muted/50 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left break-all"
                        >
                          {value}
                        </button>
                      </div>
                    );
                  })()}

                  {selectedTransaction.metadata?.views && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Views</span>
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        {selectedTransaction.metadata.views.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {selectedTransaction.metadata?.rpm_rate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">RPM Rate</span>
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        ${selectedTransaction.metadata.rpm_rate}/1K
                      </span>
                    </div>
                  )}

                  {selectedTransaction.description && (
                    <div>
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Description</span>
                      <p className="text-sm font-inter tracking-[-0.5px] mt-1">
                        {selectedTransaction.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Budget Impact - if campaign related */}
                {selectedTransaction.metadata?.campaign_id && selectedTransaction.metadata?.budget_before !== undefined && (
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.5px]">Campaign Budget Impact</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Before</span>
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        ${selectedTransaction.metadata.budget_before?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">After</span>
                      <span className="text-sm font-inter tracking-[-0.5px]">
                        ${selectedTransaction.metadata.budget_after?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Submission Link */}
                {selectedTransaction.metadata?.submission_id && (
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Submission</span>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.metadata?.submission_id)}
                        className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {selectedTransaction.metadata.submission_id.slice(0, 8)}...
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction ID */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Transaction ID</span>
                    <button
                      onClick={() => copyToClipboard(selectedTransaction.id)}
                      className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selectedTransaction.id.slice(0, 8)}...
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Reversed indicator */}
                {selectedTransaction.metadata?.reversed && (
                  <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-500">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-medium font-inter tracking-[-0.5px]">This transaction has been reversed</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  </>
  );
}
