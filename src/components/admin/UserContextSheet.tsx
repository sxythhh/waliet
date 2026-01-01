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

  useEffect(() => {
    if (user && open) {
      fetchUserData(user.id);
      setTrustScore(user.trust_score ?? 0);
      setActiveTab("overview");
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
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
                {/* Social Accounts */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">
                      Social Accounts
                    </h3>
                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                      {socialAccounts.length}
                    </span>
                  </div>
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

                {/* Contact */}
                {(user.discord_username || user.phone_number) && (
                  <section>
                    <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                      Contact
                    </h3>
                    <div className="space-y-2">
                      {user.discord_username && (
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <img src={discordIcon} alt="Discord" className="w-4 h-4 opacity-60" />
                            <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Discord</span>
                          </div>
                          <span className="text-sm font-inter tracking-[-0.5px]">{user.discord_username}</span>
                        </div>
                      )}
                      {user.phone_number && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Phone</span>
                          <span className="text-sm font-inter tracking-[-0.5px]">{user.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Actions */}
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
                    Actions
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onPayUser?.(user)}
                      className="flex-1 h-9 text-sm font-inter tracking-[-0.5px]"
                    >
                      Pay User
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(user.id)}
                      className="flex-1 h-9 text-sm font-inter tracking-[-0.5px]"
                    >
                      Copy ID
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
                      const isCredit = ["earning", "campaign_payout", "bonus", "admin_credit", "refund"].includes(tx.type);
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-inter tracking-[-0.5px] capitalize">
                              {tx.type.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                              {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <span className={cn(
                            "text-sm font-medium font-inter tracking-[-0.5px] tabular-nums",
                            isCredit ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {isCredit ? "+" : "-"}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
  );
}
