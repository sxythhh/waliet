import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, CheckCircle2, Circle, ExternalLink, ArrowDownLeft, ArrowUpRight, Gift, Wallet, ChevronLeft, ChevronRight, Users, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Hourglass } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from "recharts";
import { format, subMonths } from "date-fns";
import { Link } from "react-router-dom";
import { EarningsChart, EarningsChartPeriod } from "@/components/dashboard/EarningsChart";
import { TransactionShareDialog } from "@/components/dashboard/TransactionShareDialog";
import { PaymentMethodsSection } from "@/components/dashboard/PaymentMethodsSection";
import { Share2 } from "lucide-react";

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  date: Date;
  status?: string;
  rejection_reason?: string;
  campaign?: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url?: string | null;
  } | null;
  boost?: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url?: string | null;
  } | null;
  metadata?: {
    sender_username?: string;
    recipient_username?: string;
    period_start?: string;
    period_end?: string;
  };
}

interface Milestone {
  id: string;
  milestone_type: string;
  threshold: number;
  reward_amount: number;
  display_name: string;
}

interface MilestoneReward {
  milestone_id: string;
  reward_amount: number;
  awarded_at: string;
}

interface ReferralWithMilestones {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: string;
  reward_earned: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
    total_earnings: number | null;
  } | null;
  milestone_rewards?: MilestoneReward[];
}

interface ReferralChartDataPoint {
  date: string;
  earnings: number;
  referrals: number;
  successful: number;
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

export function ReferralsTab(): JSX.Element {
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<ReferralWithMilestones[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [chartData, setChartData] = useState<ReferralChartDataPoint[]>([]);
  const [brandCommission, setBrandCommission] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [earningsChartPeriod, setEarningsChartPeriod] = useState<EarningsChartPeriod>("3M");
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch wallet for total earned and balance
    const { data: walletData } = await supabase
      .from("wallets")
      .select("total_earned, balance")
      .eq("user_id", user.id)
      .single();

    if (walletData) {
      setTotalEarned(walletData.total_earned || 0);
      setWalletBalance(walletData.balance || 0);
    }

    // Fetch transactions
    const { data: txns } = await supabase
      .from("wallet_transactions")
      .select("id, type, amount, status, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!txns) return;

    // Get campaign and boost IDs
    const campaignIds = txns.map(t => (t.metadata as any)?.campaign_id).filter(Boolean);
    const boostIds = txns.map(t => (t.metadata as any)?.boost_id).filter(Boolean);

    // Fetch campaign details
    let campaignsMap: Record<string, { id: string; title: string; brand_name: string; brand_logo_url: string | null }> = {};
    if (campaignIds.length > 0) {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title, brand_name, brand_logo_url")
        .in("id", campaignIds);
      campaignsMap = (campaigns || []).reduce((acc, c) => {
        acc[c.id] = { id: c.id, title: c.title, brand_name: c.brand_name, brand_logo_url: c.brand_logo_url };
        return acc;
      }, {} as Record<string, { id: string; title: string; brand_name: string; brand_logo_url: string | null }>);
    }

    // Fetch boost details
    let boostsMap: Record<string, { id: string; title: string; brand_name: string; brand_logo_url: string | null }> = {};
    if (boostIds.length > 0) {
      const { data: boosts } = await supabase
        .from("bounty_campaigns")
        .select("id, title, brands(name, logo_url)")
        .in("id", boostIds);
      boostsMap = (boosts || []).reduce((acc, b) => {
        acc[b.id] = { id: b.id, title: b.title, brand_name: (b.brands as any)?.name || '', brand_logo_url: (b.brands as any)?.logo_url || null };
        return acc;
      }, {} as Record<string, { id: string; title: string; brand_name: string; brand_logo_url: string | null }>);
    }

    const formattedTransactions: WalletTransaction[] = txns.map(txn => {
      const metadata = txn.metadata as any;
      const isBoostEarning = txn.type === 'earning' && metadata?.boost_id;

      return {
        id: txn.id,
        type: isBoostEarning ? 'boost_earning' : txn.type,
        amount: Number(txn.amount) || 0,
        date: new Date(txn.created_at),
        status: txn.status,
        campaign: metadata?.campaign_id ? campaignsMap[metadata.campaign_id] || null : null,
        boost: metadata?.boost_id ? boostsMap[metadata.boost_id] || null : null,
        metadata: metadata || undefined,
      };
    });

    setTransactions(formattedTransactions);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchProfile(),
        fetchReferrals(),
        fetchMilestones(),
        fetchAffiliateEarningsData(),
        fetchBrandCommission(),
        fetchTransactions()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchTransactions]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data);
  };

  const fetchMilestones = async () => {
    const { data } = await supabase
      .from("referral_milestones")
      .select("*")
      .order("threshold", { ascending: true });
    setMilestones(data || []);
  };

  const fetchReferrals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: referralsData } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (referralsData && referralsData.length > 0) {
      const referredIds = referralsData.map(r => r.referred_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name, total_earnings")
        .in("id", referredIds);

      const referralIds = referralsData.map(r => r.id);
      const { data: rewards } = await supabase
        .from("referral_milestone_rewards")
        .select("*")
        .in("referral_id", referralIds);

      const referralsWithMilestones: ReferralWithMilestones[] = referralsData.map(referral => ({
        ...referral,
        profiles: profilesData?.find(p => p.id === referral.referred_id) || null,
        milestone_rewards: rewards?.filter(r => r.referral_id === referral.id) || []
      }));
      setReferrals(referralsWithMilestones);
    } else {
      setReferrals([]);
    }
  };

  const fetchAffiliateEarningsData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const now = new Date();
    const start = subMonths(now, 1);
    const days = 30;

    const { data: affiliateTransactions } = await supabase
      .from("wallet_transactions")
      .select("amount, created_at, type")
      .eq("user_id", session.user.id)
      .eq("type", "referral")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: true });

    const { data: referralsData } = await supabase
      .from("referrals")
      .select("created_at, status")
      .eq("referrer_id", session.user.id)
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: true });

    const dataPoints: ReferralChartDataPoint[] = [];
    let cumulativeEarnings = 0;
    let cumulativeReferrals = 0;
    let cumulativeSuccessful = 0;
    const pointCount = Math.min(days, 30);
    const interval = Math.max(1, Math.floor(days / pointCount));

    for (let i = 0; i <= pointCount; i++) {
      const currentDate = new Date(start.getTime() + i * interval * 24 * 60 * 60 * 1000);
      if (currentDate > now) break;
      const dateStr = format(currentDate, 'MMM dd');
      const prevDate = new Date(start.getTime() + (i - 1) * interval * 24 * 60 * 60 * 1000);

      if (affiliateTransactions) {
        affiliateTransactions.forEach(txn => {
          const txnDate = new Date(txn.created_at);
          if (txnDate <= currentDate && txnDate > prevDate) {
            cumulativeEarnings += Number(txn.amount) || 0;
          }
        });
      }
      if (referralsData) {
        referralsData.forEach(ref => {
          const refDate = new Date(ref.created_at);
          if (refDate <= currentDate && refDate > prevDate) {
            cumulativeReferrals += 1;
            if (ref.status === 'completed') {
              cumulativeSuccessful += 1;
            }
          }
        });
      }
      dataPoints.push({
        date: dateStr,
        earnings: Number(cumulativeEarnings.toFixed(2)),
        referrals: cumulativeReferrals,
        successful: cumulativeSuccessful
      });
    }
    setChartData(dataPoints);
  };

  const fetchBrandCommission = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("brand_referrals")
      .select("reward_earned")
      .eq("referrer_id", user.id)
      .eq("status", "completed");

    const totalCommission = data?.reduce((sum, r) => sum + (Number(r.reward_earned) || 0), 0) || 0;
    setBrandCommission(totalCommission);
  };

  const referralLink = profile?.referral_code
    ? `${window.location.origin}/?ref=${profile.referral_code}`
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Your referral link has been copied to clipboard."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getMilestoneStatus = (referral: ReferralWithMilestones, milestone: Milestone) => {
    return referral.milestone_rewards?.some(r => r.milestone_id === milestone.id) || false;
  };

  const clicks = profile?.referral_clicks || 0;
  const signedUp = referrals.length;
  const converted = referrals.filter(r => r.status === 'completed').length;
  const totalRewards = profile?.referral_earnings || 0;
  const creatorEarnings = referrals.reduce((sum, r) => sum + (Number(r.reward_earned) || 0), 0);

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-2 sm:pt-3 md:pt-4 w-full space-y-4">
      {/* Earnings Chart & Payment Methods - 2 Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Earnings Chart */}
        <Card className="bg-card border border-border rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold text-foreground tracking-[-0.5px]">
                Earnings Over Time
              </CardTitle>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground tracking-[-0.5px]">
                  ${totalEarned.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground tracking-[-0.3px]">Total Earned</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EarningsChart
              transactions={transactions}
              totalEarned={totalEarned}
              period={earningsChartPeriod}
              onPeriodChange={setEarningsChartPeriod}
              showPeriodSelector={true}
            />
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-card border border-border rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground tracking-[-0.5px]">
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PaymentMethodsSection />
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table - Full Width */}
      {(() => {
        const totalPages = Math.ceil(transactions.length / transactionsPerPage);
        const startIndex = (currentPage - 1) * transactionsPerPage;
        const paginatedTransactions = transactions.slice(startIndex, startIndex + transactionsPerPage);

        const getTransactionIcon = (type: string, isOutgoing: boolean) => {
          if (type === 'withdrawal') return <ArrowUpRight className="h-4 w-4" />;
          if (type === 'transfer_sent' || type === 'transfer_out') return <Users className="h-4 w-4" />;
          if (type === 'transfer_received' || type === 'transfer_in') return <Users className="h-4 w-4" />;
          if (type === 'referral') return <Gift className="h-4 w-4" />;
          if (type === 'balance_correction') return <Minus className="h-4 w-4" />;
          return <ArrowDownLeft className="h-4 w-4" />;
        };

        const getIconBgColor = (type: string, isOutgoing: boolean) => {
          if (type === 'withdrawal') return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
          if (type === 'transfer_sent' || type === 'transfer_out') return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
          if (type === 'transfer_received' || type === 'transfer_in') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
          if (type === 'referral') return 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400';
          if (type === 'balance_correction') return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
          return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
        };

        return (
          <Card className="bg-card border border-border rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-5">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Wallet className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1 tracking-[-0.3px]">
                    No transactions yet
                  </p>
                  <p className="text-sm text-muted-foreground tracking-[-0.2px]">
                    Your earnings and payouts will appear here
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 tracking-[-0.3px]">Transaction</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 tracking-[-0.3px] hidden md:table-cell">Type</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 tracking-[-0.3px] hidden sm:table-cell">Date</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3 tracking-[-0.3px]">Amount</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3 tracking-[-0.3px] hidden sm:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTransactions.map((transaction, index) => {
                          const brandName = transaction.boost?.brand_name || transaction.campaign?.brand_name;
                          const brandLogo = transaction.boost?.brand_logo_url || transaction.campaign?.brand_logo_url;
                          const isOutgoing = transaction.type === 'withdrawal' || transaction.type === 'transfer_sent' || transaction.type === 'transfer_out' || (transaction.type === 'balance_correction' && transaction.amount < 0);
                          const isIncomingTransfer = transaction.type === 'transfer_received' || transaction.type === 'transfer_in';
                          const isOutgoingTransfer = transaction.type === 'transfer_sent' || transaction.type === 'transfer_out';

                          const displayName = brandName ||
                            (isIncomingTransfer ? `From @${transaction.metadata?.sender_username || 'user'}` :
                            isOutgoingTransfer ? `To @${transaction.metadata?.recipient_username || 'user'}` :
                            transaction.type === 'withdrawal' ? 'Withdrawal' :
                            transaction.type === 'referral' ? 'Referral Bonus' :
                            transaction.type === 'balance_correction' ? 'Balance Adjustment' :
                            'Transaction');

                          const typeLabel = transaction.type === 'earning' || transaction.type === 'boost_earning'
                            ? 'Campaign Payout'
                            : transaction.type === 'withdrawal'
                            ? 'Withdrawal'
                            : isOutgoingTransfer
                            ? 'Transfer Sent'
                            : isIncomingTransfer
                            ? 'Transfer Received'
                            : transaction.type === 'referral'
                            ? 'Referral Bonus'
                            : transaction.type === 'balance_correction'
                            ? 'Adjustment'
                            : 'Transaction';

                          return (
                            <tr
                              key={transaction.id}
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setTransactionSheetOpen(true);
                              }}
                              className={`cursor-pointer transition-colors duration-150 hover:bg-muted/40 ${
                                index !== paginatedTransactions.length - 1 ? 'border-b border-border/50' : ''
                              }`}
                            >
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  {brandLogo ? (
                                    <img src={brandLogo} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                                  ) : (
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconBgColor(transaction.type, isOutgoing)}`}>
                                      {getTransactionIcon(transaction.type, isOutgoing)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-foreground truncate block tracking-[-0.3px]">
                                      {displayName}
                                    </span>
                                    {(transaction.campaign?.title || transaction.boost?.title) && (
                                      <span className="text-xs text-muted-foreground truncate block tracking-[-0.2px]">
                                        {transaction.campaign?.title || transaction.boost?.title}
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground md:hidden tracking-[-0.2px]">
                                      {typeLabel}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 hidden md:table-cell">
                                <span className="text-sm text-muted-foreground tracking-[-0.3px]">
                                  {typeLabel}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 hidden sm:table-cell">
                                <span className="text-sm text-muted-foreground tracking-[-0.3px]">
                                  {format(transaction.date, 'MMM d, yyyy')}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <span className={`text-sm font-semibold tabular-nums tracking-[-0.3px] ${
                                  isOutgoing
                                    ? 'text-foreground'
                                    : 'text-emerald-600 dark:text-emerald-500'
                                }`}>
                                  {isOutgoing ? '−' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-[-0.2px] ${
                                  transaction.status === 'completed'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : transaction.status === 'pending'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    : transaction.status === 'in_transit'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    : transaction.status === 'rejected'
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {transaction.status === 'completed' ? 'Completed' :
                                   transaction.status === 'pending' ? 'Pending' :
                                   transaction.status === 'in_transit' ? 'In Transit' :
                                   transaction.status === 'rejected' ? 'Rejected' : '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                      <span className="text-sm text-muted-foreground tracking-[-0.3px]">
                        Showing {startIndex + 1}-{Math.min(startIndex + transactionsPerPage, transactions.length)} of {transactions.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            if (totalPages <= 5) return true;
                            if (page === 1 || page === totalPages) return true;
                            if (Math.abs(page - currentPage) <= 1) return true;
                            return false;
                          })
                          .map((page, index, arr) => (
                            <React.Fragment key={page}>
                              {index > 0 && arr[index - 1] !== page - 1 && (
                                <span className="px-1 text-muted-foreground">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="h-8 w-8 p-0 text-xs"
                              >
                                {page}
                              </Button>
                            </React.Fragment>
                          ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Referrals Section */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="p-4 space-y-5">
          {/* Stats Cards - Funnel Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <Card className={`p-4 bg-muted/20 border-0 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">Clicks</p>
              <p className="text-2xl font-bold font-geist tracking-[-0.5px]">{formatNumber(clicks)}</p>
            </Card>

            <Card className={`p-4 bg-muted/20 border-0 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">Signed Up</p>
              <p className="text-2xl font-bold font-geist tracking-[-0.5px]">{formatNumber(signedUp)}</p>
            </Card>

            <Card className={`p-4 bg-muted/20 border-0 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">Converted</p>
              <p className="text-2xl font-bold font-geist tracking-[-0.5px]">{formatNumber(converted)}</p>
            </Card>
          </div>

          {/* Stats Cards - Earnings Split Card */}
          <Card className={`p-4 bg-muted/20 border-0 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="pr-4">
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">Total Rewards</p>
                <p className="text-2xl font-bold font-geist tracking-[-0.5px]">${totalRewards.toFixed(2)}</p>
              </div>
              <div className="px-4">
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">Creator Earnings</p>
                <p className="text-2xl font-bold font-geist tracking-[-0.5px]">${creatorEarnings.toFixed(2)}</p>
              </div>
              <div className="pl-4">
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-1">Brand Commission</p>
                <p className="text-2xl font-bold font-geist tracking-[-0.5px]">${brandCommission.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          {/* Referral Link Section */}
          <Card className="p-4 bg-muted/20 border-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center justify-between flex-1 gap-4">
                <div>
                  <h3 className="font-semibold text-sm font-inter tracking-[-0.5px]">Your Referral Link</h3>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Share to earn rewards on signups & brand subscriptions</p>
                </div>
                <Link
                  to="/affiliate"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-inter tracking-[-0.5px] shrink-0"
                >
                  How it works
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-2 items-stretch">
                <Input
                  value={referralLink}
                  readOnly
                  className="font-geist text-sm bg-background/50 border-0 h-10 tracking-[-0.5px]"
                />
                <Button
                  onClick={copyReferralLink}
                  className="gap-2 shrink-0 h-10 bg-foreground text-background hover:bg-foreground/90 font-inter tracking-[-0.5px]"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Activity Chart */}
          <Card className="p-4 bg-muted/20 border-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm font-inter tracking-[-0.5px]">Referral Activity</h3>
              <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Last 30 days</span>
            </div>

            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="referralsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="successfulGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover text-popover-foreground border border-border rounded-xl shadow-xl px-4 py-2.5 font-inter tracking-[-0.3px]">
                            <p className="text-[10px] text-muted-foreground mb-1">{data.date}</p>
                            <div className="space-y-0.5">
                              <p className="text-xs"><span className="text-blue-500">●</span> {data.referrals} referrals</p>
                              <p className="text-xs"><span className="text-emerald-500">●</span> {data.successful} successful</p>
                              <p className="text-xs"><span className="text-violet-500">●</span> ${data.earnings.toFixed(2)} earned</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="referrals"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#referralsGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#3b82f6', stroke: 'none' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="successful"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#successfulGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#10b981', stroke: 'none' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Total Referrals</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Successful</span>
              </div>
            </div>
          </Card>

          {/* Referrals List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm font-inter tracking-[-0.5px]">Your Referrals</h3>
              <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">{referrals.length} total</span>
            </div>

            {referrals.length === 0 ? (
              <Card className="p-8 bg-muted/20 border-0 text-center">
                <h4 className="font-semibold text-sm font-inter tracking-[-0.5px] mb-1">No referrals yet</h4>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] max-w-xs mx-auto">
                  Share your referral link to invite creators and brands, and earn rewards
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {referrals.map(referral => {
                  const achievedMilestones = referral.milestone_rewards?.length || 0;
                  const totalMilestones = milestones.length;
                  const totalEarned = referral.reward_earned || 0;

                  return (
                    <Card key={referral.id} className="p-4 bg-muted/20 border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={referral.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-sm font-medium">
                              {referral.profiles?.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm font-inter tracking-[-0.5px]">
                              {referral.profiles?.full_name || referral.profiles?.username}
                            </p>
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                              @{referral.profiles?.username}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-500 font-inter tracking-[-0.5px]">
                            +${totalEarned.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                            {achievedMilestones}/{totalMilestones} milestones
                          </p>
                        </div>
                      </div>

                      {/* Milestone Progress */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-border/30">
                        {milestones.map(milestone => {
                          const achieved = getMilestoneStatus(referral, milestone);
                          return (
                            <div
                              key={milestone.id}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium font-inter tracking-[-0.5px] ${
                                achieved
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-muted/50 text-muted-foreground'
                              }`}
                            >
                              {achieved ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                              <span>
                                {milestone.milestone_type === 'signup' ? 'Signup' : `$${milestone.threshold}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Receipt Sheet */}
      <Sheet open={transactionSheetOpen} onOpenChange={setTransactionSheetOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto border-l-0 font-inter tracking-[-0.3px]">
          {selectedTransaction && (
            <div className="flex flex-col h-full">
              {/* Status Badge */}
              {selectedTransaction.status && selectedTransaction.status !== 'completed' && (
                <div className="px-6 pt-4 pb-2 text-center relative">
                  <button
                    onClick={() => setTransactionSheetOpen(false)}
                    className="absolute top-4 right-4 md:hidden p-2 rounded-full bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <Badge
                    variant={selectedTransaction.status === 'rejected' ? 'destructive' : selectedTransaction.status === 'in_transit' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {selectedTransaction.status === 'in_transit' && <Hourglass className="h-3 w-3 mr-1" />}
                    {selectedTransaction.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {selectedTransaction.status === 'in_transit' ? 'In Transit' : selectedTransaction.status}
                  </Badge>
                </div>
              )}

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Source */}
                <div>
                  <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium">Source</span>
                  <div className="flex items-center gap-3 mt-2">
                    {(selectedTransaction.campaign?.brand_logo_url || selectedTransaction.boost?.brand_logo_url) ? (
                      <img
                        src={selectedTransaction.campaign?.brand_logo_url || selectedTransaction.boost?.brand_logo_url || ''}
                        alt={selectedTransaction.campaign?.brand_name || selectedTransaction.boost?.brand_name || "Brand"}
                        className="w-10 h-10 rounded-[7px] object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-[7px] bg-muted flex items-center justify-center">
                        <span className="text-base font-semibold text-muted-foreground">
                          {(selectedTransaction.campaign?.brand_name || selectedTransaction.boost?.brand_name || selectedTransaction.type === 'referral' ? 'R' : selectedTransaction.type === 'withdrawal' ? 'W' : 'T')?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-base font-semibold tracking-[-0.5px] block">
                        {selectedTransaction.campaign?.brand_name || selectedTransaction.boost?.brand_name ||
                          (selectedTransaction.type === 'referral' ? 'Referral Bonus' :
                           selectedTransaction.type === 'withdrawal' ? 'Withdrawal' : 'Transaction')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedTransaction.campaign?.title || selectedTransaction.boost?.title || ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium">Date</span>
                    <div className="mt-1.5">
                      <span className="text-sm font-medium tracking-[-0.5px] block">
                        {format(selectedTransaction.date, 'MMM d, yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(selectedTransaction.date, 'h:mm a')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium">Paid</span>
                    <div className="mt-1.5">
                      {selectedTransaction.status === 'completed' ? (
                        <>
                          <span className="text-sm font-medium tracking-[-0.5px] block">
                            {format(selectedTransaction.date, 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(selectedTransaction.date, 'h:mm a')}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium">Amount</span>
                  <span className="text-lg font-bold tracking-[-0.5px] block mt-1">
                    ${Math.abs(selectedTransaction.amount).toFixed(2)}
                  </span>
                </div>

                {/* Transaction ID */}
                <div>
                  <span className="text-[11px] tracking-[-0.5px] text-muted-foreground/60 font-medium">Transaction ID</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-mono text-muted-foreground break-all">
                      {selectedTransaction.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-muted hover:text-foreground flex-shrink-0"
                      aria-label="Copy transaction ID"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTransaction.id);
                        toast({ title: "Copied!", description: "Transaction ID copied to clipboard" });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedTransaction.status === 'rejected' && selectedTransaction.rejection_reason && (
                  <div className="p-3 bg-destructive/10 rounded-xl">
                    <div className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium tracking-[-0.5px] text-destructive mb-1">Rejection Reason</div>
                        <p className="text-sm text-muted-foreground">{selectedTransaction.rejection_reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Share Button */}
                {selectedTransaction.status === 'completed' && (selectedTransaction.type === 'earning' || selectedTransaction.type === 'boost_earning') && (
                  <Button
                    onClick={() => {
                      setTransactionSheetOpen(false);
                      setShareDialogOpen(true);
                    }}
                    className="w-full gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share Transaction
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Share Transaction Dialog */}
      <TransactionShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        transaction={selectedTransaction as any}
        userProfile={profile}
      />
    </div>
  );
}
