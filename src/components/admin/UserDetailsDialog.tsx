import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users as UsersIcon, ChevronUp, ChevronDown, Clock, CheckCircle2, XCircle, AlertCircle, Wallet, Globe, Mail, Copy, Minus, Trash2, Diamond } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
interface UserProfile {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  trust_score?: number | null;
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
      return <img src={tiktokLogo} alt="TikTok" className="h-5 w-5" />;
    case 'instagram':
      return <img src={instagramLogo} alt="Instagram" className="h-5 w-5" />;
    case 'youtube':
      return <img src={youtubeLogo} alt="YouTube" className="h-5 w-5" />;
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
  socialAccountsOpen,
  onSocialAccountsOpenChange,
  transactionsOpen,
  onTransactionsOpenChange,
  paymentMethodsOpen,
  onPaymentMethodsOpenChange,
  onEditScore,
  onBalanceUpdated
}: UserDetailsDialogProps) {
  const { toast } = useToast();
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlinkingAccountId, setUnlinkingAccountId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [trustScore, setTrustScore] = useState<number>(user?.trust_score ?? 0);
  const [isUpdatingTrustScore, setIsUpdatingTrustScore] = useState(false);
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleUnlinkAccount = async (socialAccountId: string, campaignId: string) => {
    setUnlinkingAccountId(socialAccountId);
    try {
      const { error } = await supabase
        .from("social_account_campaigns")
        .delete()
        .eq("social_account_id", socialAccountId)
        .eq("campaign_id", campaignId);

      if (error) throw error;

      toast({
        title: "Account Unlinked",
        description: "Social account has been unlinked from the campaign",
      });

      // Refresh the social accounts
      onBalanceUpdated?.();
    } catch (error) {
      console.error("Error unlinking account:", error);
      toast({
        title: "Error",
        description: "Failed to unlink account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUnlinkingAccountId(null);
    }
  };

  const handleDeleteAccount = async (socialAccountId: string) => {
    setDeletingAccountId(socialAccountId);
    try {
      const { error, count } = await supabase
        .from("social_accounts")
        .delete({ count: 'exact' })
        .eq("id", socialAccountId);

      if (error) {
        console.error("Delete error details:", error);
        throw error;
      }

      console.log("Delete result - rows affected:", count);

      if (count === 0) {
        throw new Error("No account was deleted. It may have already been removed.");
      }

      toast({
        title: "Account Deleted",
        description: "Social account has been permanently deleted",
      });

      // Refresh the data by calling the parent's refresh function
      onBalanceUpdated?.();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (walletError) throw walletError;

      const currentBalance = wallet.balance || 0;
      const newBalance = currentBalance - amount;

      if (newBalance < 0) {
        toast({
          title: "Insufficient Balance",
          description: "Cannot subtract more than the current balance",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Update wallet balance
      const { error: updateError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: -amount,
          type: "balance_correction",
          status: "completed",
          description: adjustDescription || "Balance Correction",
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Balance Updated",
        description: `Successfully subtracted $${amount.toFixed(2)} from balance`,
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
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrustScoreUpdate = async (newScore: number) => {
    if (!user?.id) return;
    
    setIsUpdatingTrustScore(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ trust_score: newScore })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Trust Score Updated",
        description: `Trust score set to ${newScore}`,
      });

      onBalanceUpdated?.();
    } catch (error) {
      console.error("Error updating trust score:", error);
      toast({
        title: "Error",
        description: "Failed to update trust score. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTrustScore(false);
    }
  };
  
  if (!user) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#0b0b0b]">
        {/* User Header */}
        <div className="flex items-start gap-4 pb-3 border-b py-0 my-0">
          {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UsersIcon className="h-8 w-8 text-primary" />
            </div>}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold mb-1">
              {user.username}
            </h2>
            {user.full_name && <p className="text-sm text-muted-foreground mb-3">
                {user.full_name}
              </p>}
            
            {/* Wallet Stats */}
            <div className="space-y-2 mt-2">
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-card/50 px-3 py-2 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Balance</p>
                  <p className="text-lg font-semibold text-success">
                    ${(user.wallets?.balance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-card/50 px-3 py-2 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                  <p className="text-lg font-semibold">
                    ${(user.wallets?.total_earned || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-card/50 px-3 py-2 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Withdrawn</p>
                  <p className="text-lg font-semibold">
                    ${(user.wallets?.total_withdrawn || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-card/50 px-3 py-2 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Trust Score</p>
                  <p className="text-lg font-semibold">
                    {user.trust_score ?? 0}/100
                  </p>
                </div>
              </div>
              
              {/* Trust Score Input */}
              <div className="bg-card/50 px-3 py-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Diamond className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                  <Label className="text-xs text-muted-foreground">Set Trust Score</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={trustScore}
                    onChange={(e) => setTrustScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="flex-1"
                    disabled={isUpdatingTrustScore}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleTrustScoreUpdate(trustScore)}
                    disabled={isUpdatingTrustScore || trustScore === (user.trust_score ?? 0)}
                    className="h-8 px-3"
                  >
                    {isUpdatingTrustScore ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setAdjustDialogOpen(true)}
              >
                <Minus className="h-4 w-4 mr-2" />
                Subtract from Balance
              </Button>
            </div>
          </div>
        </div>

        {/* Social Accounts Section - Collapsible */}
        <Collapsible open={socialAccountsOpen} onOpenChange={onSocialAccountsOpenChange} className="pt-3 border-t py-0">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between hover:bg-card/30 p-3 rounded-lg transition-colors">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Connected Accounts ({socialAccounts.length})
              </h3>
              {socialAccountsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            {loadingSocialAccounts ? <div className="text-center py-8 text-muted-foreground">
                Loading social accounts...
              </div> : socialAccounts.length === 0 ? <div className="text-center py-8 text-muted-foreground bg-card/30 rounded-lg mt-2">
                No social accounts connected
              </div> : <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 mt-2">
                {socialAccounts.map(account => {
              const latestDemographic = account.demographic_submissions?.[0];
              const demographicStatus = latestDemographic?.status;
              const linkedCampaign = account.social_account_campaigns?.[0]?.campaigns;
              return <div key={account.id} className="p-4 rounded-lg bg-card/50 hover:bg-[#1D1D1D] transition-colors group">
                      <div className="flex items-center justify-between gap-4">
                        {/* Account Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">

                          <div className="shrink-0">
                            {getPlatformIconElement(account.platform)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <a href={account.account_link} target="_blank" rel="noopener noreferrer" className="font-medium block truncate group-hover:underline" onClick={e => e.stopPropagation()}>
                                @{account.username}
                              </a>
                              
                              {/* Demographic Status Icon */}
                              {demographicStatus === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                              {demographicStatus === 'rejected' && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                              {demographicStatus === 'pending' && <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />}
                            </div>
                            
                            {/* Tier 1% and Last Submitted Date */}
                            {latestDemographic && <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {latestDemographic.status === 'approved' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-secondary/80 transition-colors" onClick={e => {
                          e.stopPropagation();
                          onEditScore?.(account);
                        }}>
                                    Tier 1: {latestDemographic.tier1_percentage}%
                                  </Badge>}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(latestDemographic.submitted_at), 'MMM dd, yyyy')}
                                </span>
                              </div>}
                          </div>
                        </div>
                        
                        {/* Campaign Link and Unlink Button */}
                        <div className="shrink-0 flex items-center gap-2">
                          {linkedCampaign ? <>
                              <div className="flex items-center gap-2">
                                {(linkedCampaign.brands?.logo_url || linkedCampaign.brand_logo_url) && <img src={linkedCampaign.brands?.logo_url || linkedCampaign.brand_logo_url} alt={linkedCampaign.brand_name} className="h-6 w-6 rounded object-cover" />}
                                <span className="font-medium text-sm">
                                  {linkedCampaign.title}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const campaignId = account.social_account_campaigns?.[0]?.campaigns?.id;
                                  if (campaignId) handleUnlinkAccount(account.id, campaignId);
                                }}
                                disabled={unlinkingAccountId === account.id}
                              >
                                {unlinkingAccountId === account.id ? "Unlinking..." : "Unlink"}
                              </Button>
                            </> : <span className="text-xs text-muted-foreground italic">
                              Not linked
                            </span>}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to permanently delete @${account.username}?`)) {
                                handleDeleteAccount(account.id);
                              }
                            }}
                            disabled={deletingAccountId === account.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>;
            })}
              </div>}
          </CollapsibleContent>
        </Collapsible>

        {/* Payment Methods Section - Collapsible */}
        <Collapsible open={paymentMethodsOpen} onOpenChange={onPaymentMethodsOpenChange} className="pt-3 border-t py-0">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between hover:bg-card/30 p-3 rounded-lg transition-colors">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Payment Methods ({paymentMethods?.length || 0})
              </h3>
              {paymentMethodsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            {loadingPaymentMethods ? <div className="text-center py-8 text-muted-foreground">
                Loading payment methods...
              </div> : !paymentMethods || paymentMethods.length === 0 ? <div className="text-center py-8 text-muted-foreground bg-card/30 rounded-lg mt-2">
                No payment methods configured
              </div> : <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 mt-2">
                {paymentMethods.map((method, index) => <div key={index} className="p-4 rounded-lg bg-card/50 hover:bg-[#1D1D1D] transition-colors">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {method.method === 'crypto' && <Wallet className="h-4 w-4 text-primary" />}
                            {method.method === 'paypal' && <Globe className="h-4 w-4 text-primary" />}
                            {method.method === 'wise' && <Mail className="h-4 w-4 text-primary" />}
                            <span className="font-semibold capitalize text-sm">{method.method}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">Active</Badge>
                        </div>
                        
                        {/* Display method details based on type */}
                        {method.method === 'crypto' && <div className="space-y-2">
                            {method.details?.address && <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Wallet Address</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-mono break-all flex-1">
                                    {method.details.address}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 shrink-0"
                                    onClick={() => copyToClipboard(method.details.address, "Wallet address")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>}
                            
                            {method.details?.network && <div className="grid grid-cols-2 gap-2">
                                <div className="bg-muted/20 p-2 rounded">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Network</p>
                                  <p className="text-xs font-medium capitalize">{method.details.network}</p>
                                </div>
                                {method.details?.token && <div className="bg-muted/20 p-2 rounded">
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Token</p>
                                    <p className="text-xs font-medium uppercase">{method.details.token}</p>
                                  </div>}
                              </div>}
                          </div>}
                        
                        {method.method === 'paypal' && method.details?.email && <div className="space-y-2">
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Email Address</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs flex items-center gap-2 flex-1">
                                  <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                  {method.details.email}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={() => copyToClipboard(method.details.email, "Email")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>}
                        
                        {method.method === 'wise' && <div className="space-y-2">
                            {method.details?.email && <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Email Address</p>
                                <div className="flex items-center gap-2 bg-muted/30 p-2.5 rounded border border-border/50">
                                  <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <p className="text-xs break-all flex-1">
                                    {method.details.email}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 shrink-0"
                                    onClick={() => copyToClipboard(method.details.email, "Email")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>}
                            
                            {(method.details?.account_number || method.details?.routing_number) && <div className="grid grid-cols-2 gap-2">
                                {method.details?.account_number && <div className="bg-muted/20 p-2 rounded">
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Account</p>
                                    <p className="text-xs font-medium font-mono">••••{method.details.account_number.slice(-4)}</p>
                                  </div>}
                                {method.details?.routing_number && <div className="bg-muted/20 p-2 rounded">
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Routing</p>
                                    <p className="text-xs font-medium font-mono">••••{method.details.routing_number.slice(-4)}</p>
                                  </div>}
                              </div>}
                          </div>}
                      </div>
                    </div>)}
              </div>}
          </CollapsibleContent>
        </Collapsible>

        {/* Recent Transactions Section - Collapsible */}
        <Collapsible open={transactionsOpen} onOpenChange={onTransactionsOpenChange} className="pt-3 border-t">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between hover:bg-card/30 p-3 rounded-lg transition-colors">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Recent Transactions ({transactions.length})
              </h3>
              {transactionsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            {loadingTransactions ? <div className="text-center py-8 text-muted-foreground">
                Loading transactions...
              </div> : transactions.length === 0 ? <div className="text-center py-8 text-muted-foreground bg-card/30 rounded-lg mt-2">
                No transactions yet
              </div> : <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 mt-2">
                {transactions.map(transaction => {
              const metadata = transaction.metadata as any;
              const isWithdrawal = transaction.type === 'withdrawal' || transaction.type === 'deduction';
              const isBalanceCorrection = transaction.type === 'balance_correction';
              const isEarning = transaction.type === 'earning';
              
              console.log('Displaying transaction:', transaction.id, 'isEarning:', isEarning, 'metadata:', metadata);
              
              return <div key={transaction.id} className="p-4 rounded-lg bg-card/50 hover:bg-[#1D1D1D] transition-colors">
                      <div className="space-y-3">
                        {/* Header: Type, Status, Amount */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium capitalize text-sm">{transaction.type.replace('_', ' ')}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${transaction.status === 'completed' ? 'bg-green-500/10 text-green-500' : transaction.status === 'pending' ? 'bg-orange-500/10 text-orange-500' : transaction.status === 'in_transit' ? 'bg-blue-500/10 text-blue-500' : transaction.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'}`}>
                                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatDistanceToNow(new Date(transaction.created_at), {
                          addSuffix: true
                        })}
                            </p>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <p className={`text-lg font-semibold ${transaction.amount < 0 ? 'text-red-500' : 'text-green-500'}`} style={{
                        fontFamily: 'Chakra Petch, sans-serif'
                      }}>
                              {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Campaign & Account Info (for earnings) */}
                        {isEarning && metadata && (metadata.campaign_name || metadata.account_username) && <div className="p-2 bg-muted/20 rounded-md">
                            <div className="space-y-2">
                              {metadata.campaign_name && <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-muted-foreground">Campaign:</p>
                                  <p className="text-xs font-medium">{metadata.campaign_name}</p>
                                </div>}
                              {metadata.account_username && metadata.platform && <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-muted-foreground">Account:</p>
                                  <div className="flex items-center gap-1">
                                    {getPlatformIcon(metadata.platform) && <img src={getPlatformIcon(metadata.platform)} alt={metadata.platform} className="h-3 w-3" />}
                                    <p className="text-xs font-medium">@{metadata.account_username}</p>
                                  </div>
                                </div>}
                            </div>
                          </div>}

                        {/* Payment Method & Network (for withdrawals) */}
                        {isWithdrawal && metadata && <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-3 p-2 bg-muted/20 rounded-md">
                              {metadata.payout_method && <div>
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Payment Method</p>
                                  <p className="text-xs font-medium capitalize">{metadata.payout_method}</p>
                                </div>}
                              {metadata.network && <div>
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Network</p>
                                  <p className="text-xs font-medium capitalize">{metadata.network}</p>
                                </div>}
                            </div>
                            
                            {/* Method Details */}
                            {(metadata.payoutDetails?.address || metadata.payoutDetails?.email || metadata.payoutDetails?.account_number) && <div className="p-2 bg-muted/20 rounded-md">
                                <p className="text-[10px] text-muted-foreground mb-0.5">Method Details</p>
                                <p className="text-xs font-medium font-mono break-all">
                                  {metadata.payoutDetails?.address || metadata.payoutDetails?.email || metadata.payoutDetails?.account_number && `•••• ${metadata.payoutDetails.account_number.slice(-4)}`}
                                </p>
                              </div>}
                          </div>}

                        {/* Balance Change */}
                        {metadata?.balance_before !== undefined && metadata?.balance_after !== undefined && <div className="p-2 bg-muted/20 rounded-md">
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Balance Before</p>
                                <p className="font-medium">${Number(metadata.balance_before).toFixed(2)}</p>
                              </div>
                              <div className="text-muted-foreground">→</div>
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground">Balance After</p>
                                <p className="font-medium">${Number(metadata.balance_after).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>}

                        {/* Description */}
                        {!isEarning && transaction.description && <p className="text-xs text-muted-foreground truncate pt-1 border-t">
                            {transaction.description}
                          </p>}
                      </div>
                    </div>;
            })}
              </div>}
          </CollapsibleContent>
        </Collapsible>

        {/* Balance Adjustment Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent className="bg-[#0b0b0b]">
            <DialogHeader>
              <DialogTitle>Subtract from Balance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Subtract</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Balance Correction"
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                />
              </div>
              {adjustAmount && !isNaN(parseFloat(adjustAmount)) && (
                <div className="p-3 bg-card/50 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Balance:</span>
                    <span className="font-medium">${(user.wallets?.balance || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtract:</span>
                    <span className="font-medium text-destructive">-${parseFloat(adjustAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">New Balance:</span>
                    <span className="font-semibold">
                      ${((user.wallets?.balance || 0) - parseFloat(adjustAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleBalanceAdjustment} disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Subtract Amount"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>;
}