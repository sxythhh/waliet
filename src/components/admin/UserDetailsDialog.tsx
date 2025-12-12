import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users as UsersIcon, Clock, CheckCircle2, XCircle, AlertCircle, Wallet, Globe, Mail, Copy, Minus, Trash2, Diamond, ExternalLink, CreditCard, TrendingUp, TrendingDown, DollarSign, Link2, Ban, Shield } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  account_link: string;
  avatar_url?: string | null;
  follower_count?: number | null;
  bio?: string | null;
  social_account_campaigns?: Array<{
    campaigns: {
      id: string;
      title: string;
      brand_name: string;
      brand_logo_url?: string | null;
      brands?: {
        logo_url?: string | null;
      } | null;
    };
  }>;
  demographic_submissions?: Array<{
    status: string;
    tier1_percentage: number;
    submitted_at: string;
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
    campaign_name?: string;
    account_username?: string;
    platform?: string;
    payout_method?: string;
    network?: string;
    balance_before?: number;
    balance_after?: number;
    payoutDetails?: any;
    [key: string]: any;
  };
}
interface PaymentMethod {
  method: string;
  details: any;
}
interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  socialAccounts: SocialAccount[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  loadingSocialAccounts: boolean;
  loadingTransactions: boolean;
  loadingPaymentMethods: boolean;
  socialAccountsOpen: boolean;
  onSocialAccountsOpenChange: (open: boolean) => void;
  transactionsOpen: boolean;
  onTransactionsOpenChange: (open: boolean) => void;
  paymentMethodsOpen: boolean;
  onPaymentMethodsOpenChange: (open: boolean) => void;
  onEditScore?: (account: SocialAccount) => void;
  onBalanceUpdated?: () => void;
}
const getPlatformIcon = (platform: string): string | null => {
  switch (platform.toLowerCase()) {
    case 'tiktok':
      return tiktokLogo;
    case 'instagram':
      return instagramLogo;
    case 'youtube':
      return youtubeLogo;
    default:
      return null;
  }
};
const getPlatformIconElement = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'tiktok':
      return <img src={tiktokLogo} alt="TikTok" className="h-4 w-4" />;
    case 'instagram':
      return <img src={instagramLogo} alt="Instagram" className="h-4 w-4" />;
    case 'youtube':
      return <img src={youtubeLogo} alt="YouTube" className="h-4 w-4" />;
    default:
      return null;
  }
};
export function UserDetailsDialog({
  open,
  onOpenChange,
  user,
  socialAccounts,
  transactions,
  paymentMethods,
  loadingSocialAccounts,
  loadingTransactions,
  loadingPaymentMethods,
  onEditScore,
  onBalanceUpdated
}: UserDetailsDialogProps) {
  const {
    toast
  } = useToast();
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlinkingAccountId, setUnlinkingAccountId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [trustScore, setTrustScore] = useState<number>(user?.trust_score ?? 0);
  const [isUpdatingTrustScore, setIsUpdatingTrustScore] = useState(false);
  const [ipBanReason, setIpBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [existingBan, setExistingBan] = useState<any>(null);
  const [loadingBan, setLoadingBan] = useState(false);

  // Fetch existing IP ban status when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      fetchExistingBan();
    }
  }, [open, user?.id]);

  const fetchExistingBan = async () => {
    if (!user?.id) return;
    setLoadingBan(true);
    const { data, error } = await supabase
      .from("ip_bans")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    
    if (!error && data) {
      setExistingBan(data);
    } else {
      setExistingBan(null);
    }
    setLoadingBan(false);
  };

  const handleIpBan = async () => {
    if (!user?.id) return;
    setIsBanning(true);
    try {
      // Insert IP ban record (IP address will be captured on next login attempt)
      const { error } = await supabase.from("ip_bans").insert({
        user_id: user.id,
        ip_address: "pending", // Will be updated when user tries to access
        reason: ipBanReason || "Banned by admin",
        is_active: true
      });

      if (error) throw error;

      toast({
        title: "User Banned",
        description: "User has been IP banned successfully"
      });
      setIpBanReason("");
      fetchExistingBan();
    } catch (error) {
      console.error("Error banning user:", error);
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive"
      });
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnban = async () => {
    if (!existingBan?.id) return;
    setIsBanning(true);
    try {
      const { error } = await supabase
        .from("ip_bans")
        .update({ is_active: false })
        .eq("id", existingBan.id);

      if (error) throw error;

      toast({
        title: "User Unbanned",
        description: "IP ban has been removed"
      });
      setExistingBan(null);
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast({
        title: "Error",
        description: "Failed to unban user",
        variant: "destructive"
      });
    } finally {
      setIsBanning(false);
    }
  };
  const copyToClipboard = (text: string, label: string) => {
    const sanitizedText = String(text || '').trim();
    if (!sanitizedText) return;
    navigator.clipboard.writeText(sanitizedText);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`
    });
  };
  const handleUnlinkAccount = async (socialAccountId: string, campaignId: string) => {
    setUnlinkingAccountId(socialAccountId);
    try {
      const {
        error
      } = await supabase.from("social_account_campaigns").delete().eq("social_account_id", socialAccountId).eq("campaign_id", campaignId);
      if (error) throw error;
      toast({
        title: "Account Unlinked",
        description: "Social account has been unlinked from the campaign"
      });
      onBalanceUpdated?.();
    } catch (error) {
      console.error("Error unlinking account:", error);
      toast({
        title: "Error",
        description: "Failed to unlink account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUnlinkingAccountId(null);
    }
  };
  const handleDeleteAccount = async (socialAccountId: string) => {
    setDeletingAccountId(socialAccountId);
    try {
      const {
        error,
        count
      } = await supabase.from("social_accounts").delete({
        count: 'exact'
      }).eq("id", socialAccountId);
      if (error) throw error;
      if (count === 0) {
        throw new Error("No account was deleted.");
      }
      toast({
        title: "Account Deleted",
        description: "Social account has been permanently deleted"
      });
      onBalanceUpdated?.();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account.",
        variant: "destructive"
      });
    } finally {
      setDeletingAccountId(null);
    }
  };
  const handleBalanceAdjustment = async () => {
    if (!user?.id) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        data: wallet,
        error: walletError
      } = await supabase.from("wallets").select("balance").eq("user_id", user.id).single();
      if (walletError) throw walletError;
      const currentBalance = wallet.balance || 0;
      const newBalance = currentBalance - amount;
      if (newBalance < 0) {
        toast({
          title: "Insufficient Balance",
          description: "Cannot subtract more than the current balance",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      const {
        error: updateError
      } = await supabase.from("wallets").update({
        balance: newBalance
      }).eq("user_id", user.id);
      if (updateError) throw updateError;
      const {
        error: transactionError
      } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        amount: -amount,
        type: "balance_correction",
        status: "completed",
        description: adjustDescription || "Balance Correction"
      });
      if (transactionError) throw transactionError;
      toast({
        title: "Balance Updated",
        description: `Successfully subtracted $${amount.toFixed(2)} from balance`
      });
      setAdjustDialogOpen(false);
      setAdjustAmount("");
      setAdjustDescription("");
      onBalanceUpdated?.();
    } catch (error) {
      console.error("Error adjusting balance:", error);
      toast({
        title: "Error",
        description: "Failed to adjust balance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleTrustScoreUpdate = async (newScore: number) => {
    if (!user?.id) return;
    setIsUpdatingTrustScore(true);
    try {
      const {
        error
      } = await supabase.from("profiles").update({
        trust_score: newScore
      }).eq("id", user.id);
      if (error) throw error;
      toast({
        title: "Trust Score Updated",
        description: `Trust score set to ${newScore}`
      });
      onBalanceUpdated?.();
    } catch (error) {
      console.error("Error updating trust score:", error);
      toast({
        title: "Error",
        description: "Failed to update trust score.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingTrustScore(false);
    }
  };
  if (!user) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-[#0a0a0a] border-0 overflow-hidden">
        {/* Header Section */}
        <div className="">
          <div className="flex items-center gap-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="h-14 w-14 rounded-full object-cover ring-2 ring-[#2a2a2a]" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-[#1a1a1a] flex items-center justify-center ring-2 ring-[#2a2a2a]">
                <span className="text-xl font-semibold text-muted-foreground uppercase">
                  {user.username?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground truncate" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>
                  {user.username}
                </h2>
                {user.discord_id && (
                  <Badge variant="outline" className="bg-[#5865F2] text-white border-0 px-2 py-0.5">
                    <img src={discordIcon} alt="Discord" className="w-3 h-3 mr-1 brightness-0 invert" />
                    {user.discord_username || "Connected"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {user.full_name && <span>{user.full_name}</span>}
                {user.phone_number && (
                  <>
                    {user.full_name && <span className="text-[#2a2a2a]">•</span>}
                    <span>{user.phone_number}</span>
                  </>
                )}
                {user.created_at && (
                  <>
                    {(user.full_name || user.phone_number) && <span className="text-[#2a2a2a]">•</span>}
                    <span>Joined {format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                  </>
                )}
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-0 px-2 py-1">
              <Diamond className="w-3 h-3 mr-1 fill-emerald-400" />
              {user.trust_score ?? 0}
            </Badge>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-[#111] rounded-lg p-3">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-inter" style={{ letterSpacing: '-0.5px' }}>Balance</span>
              <p className="text-lg font-semibold text-green-400 mt-1" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.5px'
            }}>
                ${(user.wallets?.balance || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-[#111] rounded-lg p-3">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-inter" style={{ letterSpacing: '-0.5px' }}>Earned</span>
              <p className="text-lg font-semibold text-foreground mt-1" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.5px'
            }}>
                ${(user.wallets?.total_earned || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-[#111] rounded-lg p-3">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-inter" style={{ letterSpacing: '-0.5px' }}>Withdrawn</span>
              <p className="text-lg font-semibold text-foreground mt-1" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.5px'
            }}>
                ${(user.wallets?.total_withdrawn || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="h-6" />

        {/* Tabs Section */}
        <Tabs defaultValue="accounts" className="flex-1">
          <div className="border-b border-[#1a1a1a] px-0">
            <TabsList className="bg-transparent h-10 p-0 w-full justify-start gap-6">
              <TabsTrigger value="accounts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground font-inter tracking-[-0.5px]">
                Accounts ({socialAccounts.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground font-inter tracking-[-0.5px]">
                Payments ({paymentMethods?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground font-inter tracking-[-0.5px]">
                Transactions ({transactions.length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground font-inter tracking-[-0.5px]">
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="mt-0 p-6 pt-4">
            <ScrollArea className="h-[280px]">
              {loadingSocialAccounts ? <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading...
                </div> : socialAccounts.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Link2 className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-inter" style={{ letterSpacing: '-0.5px' }}>No connected accounts</p>
                </div> : <div className="space-y-3">
                  {socialAccounts.map(account => {
                const latestDemographic = account.demographic_submissions?.[0];
                const demographicStatus = latestDemographic?.status;
                const linkedCampaign = account.social_account_campaigns?.[0]?.campaigns;
                const formatFollowers = (count: number | null | undefined) => {
                  if (!count) return null;
                  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
                  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
                  return count.toString();
                };
                return <div key={account.id} className="p-4 rounded-lg bg-[#111] group">
                        <div className="flex items-start gap-3">
                          {/* Avatar or Platform Icon */}
                          {account.avatar_url ? (
                            <img src={account.avatar_url} alt={account.username} className="w-10 h-10 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                              {getPlatformIconElement(account.platform)}
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <a href={account.account_link} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline truncate font-inter" style={{ letterSpacing: '-0.5px' }}>
                                @{account.username}
                              </a>
                              {getPlatformIconElement(account.platform) && (
                                <span className="shrink-0">{getPlatformIconElement(account.platform)}</span>
                              )}
                              {demographicStatus === 'approved' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                              {demographicStatus === 'rejected' && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                              {demographicStatus === 'pending' && <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                            </div>
                            
                            {/* Followers and Bio */}
                            <div className="flex items-center gap-3 mt-1">
                              {account.follower_count && (
                                <span className="text-xs text-muted-foreground font-inter" style={{ letterSpacing: '-0.5px' }}>
                                  {formatFollowers(account.follower_count)} followers
                                </span>
                              )}
                              {linkedCampaign && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-[#1a1a1a]">
                                  {linkedCampaign.title}
                                </Badge>
                              )}
                              {latestDemographic?.status === 'approved' && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer" onClick={() => onEditScore?.(account)}>
                                  T1: {latestDemographic.tier1_percentage}%
                                </Badge>
                              )}
                            </div>
                            
                            {/* Bio excerpt */}
                            {account.bio && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 font-inter" style={{ letterSpacing: '-0.5px' }}>
                                {account.bio}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {linkedCampaign && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive font-inter" style={{ letterSpacing: '-0.5px' }} onClick={() => {
                        const campaignId = account.social_account_campaigns?.[0]?.campaigns?.id;
                        if (campaignId) handleUnlinkAccount(account.id, campaignId);
                      }} disabled={unlinkingAccountId === account.id}>
                                Unlink
                              </Button>}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => {
                        if (confirm(`Delete @${account.username}?`)) {
                          handleDeleteAccount(account.id);
                        }
                      }} disabled={deletingAccountId === account.id}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>;
              })}
                </div>}
            </ScrollArea>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-0 p-6 pt-4">
            <ScrollArea className="h-[280px]">
              {loadingPaymentMethods ? <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading...
                </div> : !paymentMethods || paymentMethods.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <CreditCard className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No payment methods</p>
                </div> : <div className="space-y-3">
                  {paymentMethods.map((method, index) => <div key={index} className="p-4 rounded-lg bg-[#111]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                          {method.method === 'crypto' && <Wallet className="h-5 w-5 text-purple-400" />}
                          {method.method === 'paypal' && <Globe className="h-5 w-5 text-blue-400" />}
                          {method.method === 'wise' && <Mail className="h-5 w-5 text-green-400" />}
                        </div>
                        <div>
                          <p className="font-medium capitalize text-sm" style={{
                      fontFamily: 'Inter',
                      letterSpacing: '-0.5px'
                    }}>
                            {method.method}
                          </p>
                          <p className="text-xs text-muted-foreground">Active payment method</p>
                        </div>
                      </div>
                      
                      {/* Crypto Details */}
                      {method.method === 'crypto' && method.details && <div className="space-y-2">
                          {method.details.address && <div className="bg-[#0a0a0a] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Wallet Address</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(method.details.address, "Address")}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs font-mono text-foreground break-all">{method.details.address}</p>
                            </div>}
                          <div className="grid grid-cols-2 gap-2">
                            {method.details.network && <div className="bg-[#0a0a0a] rounded-lg p-2.5">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Network</span>
                                <p className="text-sm font-medium capitalize mt-0.5">{method.details.network}</p>
                              </div>}
                            {(method.details.token || method.details.currency) && <div className="bg-[#0a0a0a] rounded-lg p-2.5">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Token</span>
                                <p className="text-sm font-medium uppercase mt-0.5">{method.details.token || method.details.currency}</p>
                              </div>}
                          </div>
                        </div>}
                      
                      {/* PayPal Details */}
                      {method.method === 'paypal' && method.details?.email && <div className="bg-[#0a0a0a] rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Email</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(method.details.email, "Email")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-foreground">{method.details.email}</p>
                        </div>}
                      
                      {/* Wise Details */}
                      {method.method === 'wise' && method.details?.email && <div className="bg-[#0a0a0a] rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Email</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(method.details.email, "Email")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-foreground">{method.details.email}</p>
                        </div>}
                    </div>)}
                </div>}
            </ScrollArea>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="mt-0 p-6 pt-4">
            <ScrollArea className="h-[280px]">
              {loadingTransactions ? <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading...
                </div> : transactions.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Clock className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-inter" style={{ letterSpacing: '-0.5px' }}>No transactions</p>
                </div> : <div className="space-y-3">
                  {transactions.map(transaction => {
                const metadata = transaction.metadata as any;
                const isWithdrawal = transaction.type === 'withdrawal' || transaction.type === 'deduction';
                const isEarning = transaction.type === 'earning';
                return <div key={transaction.id} className="p-4 rounded-lg bg-[#111]">
                        {/* Header Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-5 border-0 font-inter capitalize ${
                              transaction.type === 'earning' ? 'bg-green-500/10 text-green-400' :
                              transaction.type === 'withdrawal' ? 'bg-orange-500/10 text-orange-400' :
                              transaction.type === 'referral' ? 'bg-purple-500/10 text-purple-400' :
                              transaction.type === 'balance_correction' ? 'bg-red-500/10 text-red-400' :
                              'bg-muted text-muted-foreground'
                            }`} style={{ letterSpacing: '-0.5px' }}>
                              {transaction.type.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-5 border-0 font-inter ${
                              transaction.status === 'completed' ? 'bg-green-500/10 text-green-400' : 
                              transaction.status === 'pending' ? 'bg-orange-500/10 text-orange-400' : 
                              transaction.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 
                              'bg-muted text-muted-foreground'
                            }`} style={{ letterSpacing: '-0.5px' }}>
                              {transaction.status}
                            </Badge>
                          </div>
                          <p className={`text-base font-semibold tabular-nums ${transaction.amount < 0 ? 'text-red-400' : 'text-green-400'}`} style={{
                        fontFamily: 'Inter',
                        letterSpacing: '-0.5px'
                      }}>
                              {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                            </p>
                        </div>
                        
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Transaction ID */}
                          <div className="bg-[#0a0a0a] rounded-lg p-2.5">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-inter" style={{ letterSpacing: '-0.5px' }}>Transaction ID</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-xs font-mono text-foreground truncate">{transaction.id.slice(0, 8)}...</p>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(transaction.id);
                                  toast({ title: "Copied", description: "Transaction ID copied to clipboard" });
                                }}
                                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Date */}
                          <div className="bg-[#0a0a0a] rounded-lg p-2.5">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-inter" style={{ letterSpacing: '-0.5px' }}>Date</span>
                            <p className="text-xs text-foreground mt-0.5 font-inter" style={{ letterSpacing: '-0.5px' }}>
                              {format(new Date(transaction.created_at), "MMM d, yyyy · HH:mm")}
                            </p>
                          </div>
                          
                          {/* Campaign (if applicable) */}
                          {metadata?.campaign_name && (
                            <div className="bg-[#0a0a0a] rounded-lg p-2.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-inter" style={{ letterSpacing: '-0.5px' }}>Campaign</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {metadata.campaign_logo_url && (
                                  <img src={metadata.campaign_logo_url} alt="" className="h-3.5 w-3.5 rounded object-cover" />
                                )}
                                <p className="text-xs text-foreground truncate font-inter" style={{ letterSpacing: '-0.5px' }}>{metadata.campaign_name}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Account (if applicable) */}
                          {metadata?.account_username && (
                            <div className="bg-[#0a0a0a] rounded-lg p-2.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-inter" style={{ letterSpacing: '-0.5px' }}>Account</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {metadata.platform && getPlatformIconElement(metadata.platform)}
                                <p className="text-xs text-foreground truncate font-inter" style={{ letterSpacing: '-0.5px' }}>@{metadata.account_username}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Payout Method (for withdrawals) */}
                          {isWithdrawal && metadata?.payout_method && (
                            <div className="bg-[#0a0a0a] rounded-lg p-2.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-inter" style={{ letterSpacing: '-0.5px' }}>Payout Method</span>
                              <p className="text-xs text-foreground mt-0.5 capitalize font-inter" style={{ letterSpacing: '-0.5px' }}>{metadata.payout_method}</p>
                            </div>
                          )}
                          
                          {/* Network (for crypto withdrawals) */}
                          {isWithdrawal && metadata?.network && (
                            <div className="bg-[#0a0a0a] rounded-lg p-2.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-inter" style={{ letterSpacing: '-0.5px' }}>Network</span>
                              <p className="text-xs text-foreground mt-0.5 capitalize font-inter" style={{ letterSpacing: '-0.5px' }}>{metadata.network}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Description (if exists) */}
                        {transaction.description && (
                          <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                            <p className="text-xs text-muted-foreground font-inter" style={{ letterSpacing: '-0.5px' }}>{transaction.description}</p>
                          </div>
                        )}
                      </div>;
              })}
                </div>}
            </ScrollArea>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0 p-6 pt-4">
            <ScrollArea className="h-[280px]">
              <div className="space-y-4">
                {/* Discord Connection Status */}
                <div className="p-4 rounded-lg bg-[#111]">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={discordIcon} alt="Discord" className="w-4 h-4" />
                    <span className="text-sm font-medium font-inter tracking-[-0.5px]">Discord Connection</span>
                  </div>
                  {user.discord_id ? (
                    <div className="flex items-center gap-3">
                      {user.discord_avatar && (
                        <img 
                          src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`} 
                          alt="Discord Avatar" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium">{user.discord_username || "Connected"}</p>
                        <p className="text-xs text-muted-foreground">ID: {user.discord_id}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>

                {/* Trust Score */}
                <div className="p-4 rounded-lg bg-[#111]">
                  <div className="flex items-center gap-2 mb-3">
                    <Diamond className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    <span className="text-sm font-medium font-inter tracking-[-0.5px]">Trust Score</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input type="number" min={0} max={100} value={trustScore} onChange={e => setTrustScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="flex-1 bg-[#0a0a0a] border-0" disabled={isUpdatingTrustScore} />
                    <Button size="sm" onClick={() => handleTrustScoreUpdate(trustScore)} disabled={isUpdatingTrustScore || trustScore === (user.trust_score ?? 0)} className="h-9 px-4">
                      {isUpdatingTrustScore ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>

                {/* Balance Adjustment */}
                <div className="p-4 rounded-lg bg-[#111]">
                  <div className="flex items-center gap-2 mb-3">
                    <Minus className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium font-inter tracking-[-0.5px]">Balance Adjustment</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-0 bg-[#0a0a0a] hover:bg-[#1a1a1a]" onClick={() => setAdjustDialogOpen(true)}>
                    Subtract from Balance
                  </Button>
                </div>

                {/* IP Ban */}
                <div className="p-4 rounded-lg bg-[#111]">
                  <div className="flex items-center gap-2 mb-3">
                    <Ban className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium font-inter tracking-[-0.5px]">IP Ban</span>
                  </div>
                  {loadingBan ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : existingBan ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="border-0">Banned</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(existingBan.banned_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      {existingBan.reason && (
                        <p className="text-xs text-muted-foreground">Reason: {existingBan.reason}</p>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-0 bg-[#0a0a0a] hover:bg-[#1a1a1a]" 
                        onClick={handleUnban}
                        disabled={isBanning}
                      >
                        {isBanning ? "Removing..." : "Remove Ban"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input 
                        placeholder="Ban reason (optional)" 
                        value={ipBanReason} 
                        onChange={e => setIpBanReason(e.target.value)}
                        className="bg-[#0a0a0a] border-0"
                      />
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full" 
                        onClick={handleIpBan}
                        disabled={isBanning}
                      >
                        {isBanning ? "Banning..." : "Ban User"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Balance Adjustment Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent className="bg-[#0a0a0a] border-0">
            <DialogHeader>
              <DialogTitle className="font-inter tracking-[-0.5px]">Subtract from Balance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" step="0.01" placeholder="0.00" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} className="bg-[#111] border-0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input id="description" placeholder="Balance Correction" value={adjustDescription} onChange={e => setAdjustDescription(e.target.value)} className="bg-[#111] border-0" />
              </div>
              {adjustAmount && !isNaN(parseFloat(adjustAmount)) && <div className="p-3 bg-[#111] rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current</span>
                    <span>${(user.wallets?.balance || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtract</span>
                    <span className="text-red-400">-${parseFloat(adjustAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-[#1a1a1a]">
                    <span className="text-muted-foreground">New Balance</span>
                    <span className="font-semibold">
                      ${((user.wallets?.balance || 0) - parseFloat(adjustAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} disabled={isSubmitting} className="border-0 bg-[#111]">
                Cancel
              </Button>
              <Button onClick={handleBalanceAdjustment} disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Subtract"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>;
}