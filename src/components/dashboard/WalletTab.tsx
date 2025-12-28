import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import wordmarkLogo from "@/assets/wordmark.ai.png";
import viralityLogo from "@/assets/virality-logo.webp";
import viralityGhostLogo from "@/assets/virality-ghost-logo.png";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2, CreditCard, ArrowUpRight, ChevronDown, ArrowDownLeft, Clock, X, Copy, Check, Eye, EyeOff, Hourglass, ArrowRightLeft, ChevronLeft, ChevronRight, Share2, Upload, RefreshCw, Gift, Star, Building2, Smartphone, SlidersHorizontal, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PayoutMethodDialog from "@/components/PayoutMethodDialog";
import { Separator } from "@/components/ui/separator";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Bar, BarChart } from "recharts";
import { format, subDays, subMonths, subYears, startOfWeek } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ethereumLogo from "@/assets/ethereum-logo.png";
import optimismLogo from "@/assets/optimism-logo.png";
import solanaLogo from "@/assets/solana-logo.png";
import polygonLogo from "@/assets/polygon-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import paypalLogo from "@/assets/paypal-logo.svg";
import walletActiveIcon from "@/assets/wallet-active.svg";
import checkCircleFilledIcon from "@/assets/check-circle-filled.svg";
import { Skeleton } from "@/components/ui/skeleton";
import { P2PTransferDialog } from "@/components/P2PTransferDialog";
import { usePaymentLedger } from "@/hooks/usePaymentLedger";
import { PayoutStatusCards } from "./PayoutStatusCards";
import { ProfileHeader } from "./ProfileHeader";
import { TransactionShareDialog } from "./TransactionShareDialog";
import { addDays } from "date-fns";
interface UserProfile {
  username?: string;
  avatar_url?: string;
  banner_url?: string;
}
interface WalletData {
  id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  payout_method: string | null;
  payout_details: any;
}
interface PayoutMethod {
  id: string;
  method: string;
  details: any;
}
interface EarningsDataPoint {
  date: string;
  amount: number;
}
interface TeamEarningsDataPoint {
  date: string;
  amount: number;
}
interface AffiliateEarningsDataPoint {
  date: string;
  amount: number;
}
interface WithdrawalDataPoint {
  date: string;
  earnings: number;
  withdrawals: number;
}
interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'referral' | 'balance_correction' | 'transfer_sent' | 'transfer_received' | 'boost_earning';
  amount: number;
  date: Date;
  destination?: string;
  source?: string;
  status?: string;
  rejection_reason?: string;
  metadata?: any;
  campaign?: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string | null;
  } | null;
  boost?: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string | null;
  } | null;
}
type TimePeriod = '3D' | '1W' | '1M' | '3M' | '1Y' | 'TW';
export function WalletTab() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsDataPoint[]>([]);
  const [teamEarningsData, setTeamEarningsData] = useState<TeamEarningsDataPoint[]>([]);
  const [affiliateEarningsData, setAffiliateEarningsData] = useState<AffiliateEarningsDataPoint[]>([]);
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalDataPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('3D');
  const [earningsChartOffset, setEarningsChartOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [pendingBoostEarnings, setPendingBoostEarnings] = useState(0);
  const [clearingPayouts, setClearingPayouts] = useState(0);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [isRequestingEarningsPayout, setIsRequestingEarningsPayout] = useState(false);
  const [p2pTransferDialogOpen, setP2pTransferDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [availableCampaigns, setAvailableCampaigns] = useState<Array<{
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string | null;
    type: 'campaign' | 'boost';
  }>>([]);
  const [earningsChartPeriod, setEarningsChartPeriod] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSubmenu, setFilterSubmenu] = useState<'main' | 'type' | 'status' | 'program'>('main');
  const [filterSearch, setFilterSearch] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
  const {
    toast
  } = useToast();

  // Use payment ledger for unified pending earnings
  const {
    summary: ledgerSummary,
    loading: ledgerLoading,
    requestPayout: ledgerRequestPayout,
    refetch: refetchLedger
  } = usePaymentLedger();

  // Calculate payout pipeline data
  const payoutPipelineData = {
    accruing: {
      amount: ledgerSummary?.totalPending || 0,
      videoCount: ledgerSummary?.accruingCount || 0
    },
    clearing: {
      amount: (ledgerSummary?.totalClearing || 0) + (ledgerSummary?.totalLocked || 0) + clearingPayouts,
      videoCount: ledgerSummary?.clearingCount || 0,
      clearingEndsAt: ledgerSummary?.earliestClearingEndsAt,
      canBeFlagged: ledgerSummary?.hasActiveFlaggableItems || false
    },
    paid: {
      amount: (ledgerSummary?.totalPaid || 0) + (wallet?.total_withdrawn || 0),
      videoCount: ledgerSummary?.paidCount || 0
    }
  };

  // Handle request payout for earnings pipeline
  const handleRequestEarningsPayout = async () => {
    if (payoutPipelineData.accruing.amount < 1) {
      toast({
        title: "Minimum not met",
        description: "Minimum payout is $1.00",
        variant: "destructive"
      });
      return;
    }
    setIsRequestingEarningsPayout(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Request payout via ledger
      if (ledgerSummary && ledgerSummary.totalPending > 0) {
        await ledgerRequestPayout();
        toast({
          title: "Payout requested",
          description: `$${ledgerSummary.totalPending.toFixed(2)} is now in 7-day clearing period.`
        });
        refetchLedger();
        fetchClearingPayouts();
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast({
        title: "Error",
        description: "Failed to request payout",
        variant: "destructive"
      });
    } finally {
      setIsRequestingEarningsPayout(false);
    }
  };
  useEffect(() => {
    fetchWallet();
    fetchPendingBoostEarnings();
    fetchClearingPayouts();

    // Set up real-time listener for payout requests
    const channel = supabase.channel('payout-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'payout_requests'
    }, payload => {
      console.log('Payout request updated:', payload);
      // Refetch wallet and transactions when payout request changes
      fetchWallet();
      fetchTransactions();
      fetchClearingPayouts();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const fetchClearingPayouts = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const {
      data: requests
    } = await supabase.from('submission_payout_requests').select('total_amount').eq('user_id', session.user.id).in('status', ['clearing']);
    if (requests && requests.length > 0) {
      const total = requests.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      setClearingPayouts(total);
    } else {
      setClearingPayouts(0);
    }
  };
  const fetchPendingBoostEarnings = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;

    // Get all pending boost submissions from unified table
    const {
      data: pendingSubmissions
    } = await supabase.from("video_submissions").select("payout_amount, source_id").eq("creator_id", session.user.id).eq("source_type", "boost").eq("status", "pending");
    if (pendingSubmissions && pendingSubmissions.length > 0) {
      let totalPending = 0;
      pendingSubmissions.forEach(sub => {
        if (sub.payout_amount) {
          totalPending += sub.payout_amount;
        }
        // Note: For submissions without payout_amount, we'd need to fetch boost details
        // but since payout_amount is always set on insert, this should be sufficient
      });
      setPendingBoostEarnings(totalPending);
    } else {
      setPendingBoostEarnings(0);
    }
  };
  useEffect(() => {
    if (wallet) {
      fetchEarningsData();
      fetchTeamEarningsData();
      fetchAffiliateEarningsData();
      fetchWithdrawalData();
      fetchTransactions();
    }
  }, [timePeriod, wallet, earningsChartOffset, earningsChartPeriod]);
  const getDateRange = () => {
    const now = new Date();
    switch (timePeriod) {
      case '3D':
        return {
          start: subDays(now, 3),
          end: now
        };
      case '1W':
        return {
          start: subDays(now, 7),
          end: now
        };
      case '1M':
        return {
          start: subMonths(now, 1),
          end: now
        };
      case '3M':
        return {
          start: subMonths(now, 3),
          end: now
        };
      case '1Y':
        return {
          start: subYears(now, 1),
          end: now
        };
      case 'TW':
        return {
          start: startOfWeek(now),
          end: now
        };
      default:
        return {
          start: subMonths(now, 1),
          end: now
        };
    }
  };
  const fetchEarningsData = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const now = new Date();
    let start: Date;
    let days: number;

    // Calculate date range based on selected period
    switch (earningsChartPeriod) {
      case '1D':
        start = subDays(now, 1);
        days = 1;
        break;
      case '1W':
        start = subDays(now, 7);
        days = 7;
        break;
      case '1M':
        start = subMonths(now, 1);
        days = 30;
        break;
      case 'ALL':
      default:
        // Get all transactions to determine the earliest date
        const {
          data: allTxns
        } = await supabase.from("wallet_transactions").select("created_at").eq("user_id", session.user.id).order("created_at", {
          ascending: true
        }).limit(1);
        if (allTxns && allTxns.length > 0) {
          start = new Date(allTxns[0].created_at);
          days = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          start = subMonths(now, 1);
          days = 30;
        }
        break;
    }

    // Get all earning transactions from the beginning
    const {
      data: allTransactions
    } = await supabase.from("wallet_transactions").select("amount, created_at, type").eq("user_id", session.user.id).gte("created_at", start.toISOString()).order("created_at", {
      ascending: true
    });
    const dataPoints: EarningsDataPoint[] = [];

    // Generate data points - show daily earnings (not cumulative) for better visualization
    const pointCount = Math.min(days, 30); // Max 30 points for performance
    const interval = Math.max(1, Math.floor(days / pointCount));

    // Group transactions by date
    const earningsByDate: Record<string, number> = {};
    if (allTransactions) {
      allTransactions.forEach(txn => {
        const txnDate = new Date(txn.created_at);
        const dateKey = format(txnDate, 'yyyy-MM-dd');
        const amount = Number(txn.amount) || 0;
        // Only count earnings (positive amounts)
        if (['earning', 'admin_adjustment', 'bonus', 'refund', 'transfer_received', 'boost'].includes(txn.type) && amount > 0) {
          earningsByDate[dateKey] = (earningsByDate[dateKey] || 0) + amount;
        }
      });
    }
    for (let i = 0; i <= pointCount; i++) {
      const currentDate = new Date(start.getTime() + i * interval * 24 * 60 * 60 * 1000);
      if (currentDate > now) break;
      const dateStr = format(currentDate, earningsChartPeriod === '1D' ? 'HH:mm' : 'MMM dd');
      const dateKey = format(currentDate, 'yyyy-MM-dd');

      // Show daily earnings for that specific day
      const dailyEarnings = earningsByDate[dateKey] || 0;
      dataPoints.push({
        date: dateStr,
        amount: Number(dailyEarnings.toFixed(2))
      });
    }

    // Ensure the last point shows current total earned
    if (dataPoints.length > 0 && wallet && earningsChartPeriod === 'ALL') {
      dataPoints[dataPoints.length - 1].amount = Number(wallet.total_earned.toFixed(2));
    }
    setEarningsData(dataPoints);
  };
  const fetchTeamEarningsData = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const now = new Date();
    let start: Date;
    let days: number;
    switch (earningsChartPeriod) {
      case '1D':
        start = subDays(now, 1);
        days = 1;
        break;
      case '1W':
        start = subDays(now, 7);
        days = 7;
        break;
      case '1M':
        start = subMonths(now, 1);
        days = 30;
        break;
      case 'ALL':
      default:
        start = subMonths(now, 6);
        days = 180;
        break;
    }
    const {
      data: teamTransactions
    } = await supabase.from("wallet_transactions").select("amount, created_at, type").eq("user_id", session.user.id).eq("type", "team_earning").gte("created_at", start.toISOString()).order("created_at", {
      ascending: true
    });
    const dataPoints: TeamEarningsDataPoint[] = [];
    let cumulativeEarnings = 0;
    const pointCount = Math.min(days, 30);
    const interval = Math.max(1, Math.floor(days / pointCount));
    for (let i = 0; i <= pointCount; i++) {
      const currentDate = new Date(start.getTime() + i * interval * 24 * 60 * 60 * 1000);
      if (currentDate > now) break;
      const dateStr = format(currentDate, earningsChartPeriod === '1D' ? 'HH:mm' : 'MMM dd');
      if (teamTransactions) {
        teamTransactions.forEach(txn => {
          const txnDate = new Date(txn.created_at);
          if (txnDate <= currentDate && txnDate > new Date(start.getTime() + (i - 1) * interval * 24 * 60 * 60 * 1000)) {
            cumulativeEarnings += Number(txn.amount) || 0;
          }
        });
      }
      dataPoints.push({
        date: dateStr,
        amount: Number(cumulativeEarnings.toFixed(2))
      });
    }
    setTeamEarningsData(dataPoints);
  };
  const fetchAffiliateEarningsData = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const now = new Date();
    let start: Date;
    let days: number;
    switch (earningsChartPeriod) {
      case '1D':
        start = subDays(now, 1);
        days = 1;
        break;
      case '1W':
        start = subDays(now, 7);
        days = 7;
        break;
      case '1M':
        start = subMonths(now, 1);
        days = 30;
        break;
      case 'ALL':
      default:
        start = subMonths(now, 6);
        days = 180;
        break;
    }
    const {
      data: affiliateTransactions
    } = await supabase.from("wallet_transactions").select("amount, created_at, type").eq("user_id", session.user.id).eq("type", "affiliate_earning").gte("created_at", start.toISOString()).order("created_at", {
      ascending: true
    });
    const dataPoints: AffiliateEarningsDataPoint[] = [];
    let cumulativeEarnings = 0;
    const pointCount = Math.min(days, 30);
    const interval = Math.max(1, Math.floor(days / pointCount));
    for (let i = 0; i <= pointCount; i++) {
      const currentDate = new Date(start.getTime() + i * interval * 24 * 60 * 60 * 1000);
      if (currentDate > now) break;
      const dateStr = format(currentDate, earningsChartPeriod === '1D' ? 'HH:mm' : 'MMM dd');
      if (affiliateTransactions) {
        affiliateTransactions.forEach(txn => {
          const txnDate = new Date(txn.created_at);
          if (txnDate <= currentDate && txnDate > new Date(start.getTime() + (i - 1) * interval * 24 * 60 * 60 * 1000)) {
            cumulativeEarnings += Number(txn.amount) || 0;
          }
        });
      }
      dataPoints.push({
        date: dateStr,
        amount: Number(cumulativeEarnings.toFixed(2))
      });
    }
    setAffiliateEarningsData(dataPoints);
  };
  const fetchWithdrawalData = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;

    // Calculate date range for 7 days with offset
    const now = new Date();
    const end = subDays(now, earningsChartOffset * 7);
    const start = subDays(end, 7);

    // Fetch all wallet transactions
    const {
      data: walletTransactions
    } = await supabase.from("wallet_transactions").select("amount, created_at, type").eq("user_id", session.user.id).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).order("created_at", {
      ascending: true
    });
    const dataPoints: WithdrawalDataPoint[] = [];
    for (let i = 0; i <= 7; i++) {
      const currentDate = subDays(end, 7 - i);
      const dateStr = format(currentDate, 'MMM dd');
      let earningsAmount = 0;
      let withdrawalsAmount = 0;
      if (walletTransactions) {
        walletTransactions.forEach(txn => {
          const txnDate = new Date(txn.created_at);
          if (format(txnDate, 'MMM dd') === dateStr) {
            if (['earning', 'admin_adjustment', 'bonus', 'refund', 'transfer_received'].includes(txn.type)) {
              earningsAmount += Number(txn.amount) || 0;
            } else if (txn.type === 'withdrawal' || txn.type === 'transfer_sent') {
              withdrawalsAmount += Number(txn.amount) || 0;
            }
          }
        });
      }
      dataPoints.push({
        date: dateStr,
        earnings: Number(earningsAmount.toFixed(2)),
        withdrawals: Number(withdrawalsAmount.toFixed(2))
      });
    }
    setWithdrawalData(dataPoints);
  };
  const fetchTransactions = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch wallet transactions
    const {
      data: walletTransactions
    } = await supabase.from("wallet_transactions").select("*").eq("user_id", session.user.id).order("created_at", {
      ascending: false
    });

    // Fetch payout requests to get full payout details
    const {
      data: payoutRequests
    } = await supabase.from("payout_requests").select("*").eq("user_id", session.user.id);

    // Extract unique campaign IDs from earnings transactions
    const campaignIds = walletTransactions?.filter(txn => {
      const metadata = txn.metadata as any;
      return txn.type === 'earning' && metadata?.campaign_id;
    }).map(txn => (txn.metadata as any).campaign_id).filter((id, index, self) => id && self.indexOf(id) === index) || [];

    // Extract unique boost IDs from earnings transactions
    const boostIds = walletTransactions?.filter(txn => {
      const metadata = txn.metadata as any;
      return txn.type === 'earning' && metadata?.boost_id;
    }).map(txn => (txn.metadata as any).boost_id).filter((id, index, self) => id && self.indexOf(id) === index) || [];

    // Fetch campaign details if we have campaign IDs
    let campaignsMap = new Map();
    if (campaignIds.length > 0) {
      const {
        data: campaigns
      } = await supabase.from("campaigns").select("id, title, brand_name, brand_logo_url, brands(logo_url)").in("id", campaignIds);
      campaigns?.forEach(campaign => {
        campaignsMap.set(campaign.id, {
          ...campaign,
          // Use brands.logo_url as fallback if brand_logo_url is null
          brand_logo_url: campaign.brand_logo_url || (campaign.brands as any)?.logo_url
        });
      });
    }

    // Fetch boost details if we have boost IDs
    let boostsMap = new Map();
    if (boostIds.length > 0) {
      const {
        data: boosts
      } = await supabase.from("bounty_campaigns").select("id, title, brands(name, logo_url)").in("id", boostIds);
      boosts?.forEach(boost => {
        boostsMap.set(boost.id, {
          id: boost.id,
          title: boost.title,
          brand_name: (boost.brands as any)?.name || '',
          brand_logo_url: (boost.brands as any)?.logo_url || null
        });
      });
    }

    // Calculate total pending and in-transit withdrawals
    const pendingAmount = payoutRequests?.filter(pr => pr.status === 'pending' || pr.status === 'in_transit').reduce((sum, pr) => sum + Number(pr.amount), 0) || 0;
    setPendingWithdrawals(pendingAmount);

    // Extract unique campaigns and boosts for filter dropdown
    const uniqueCampaigns = Array.from(campaignsMap.values()).map(c => ({
      id: c.id,
      title: c.title,
      brand_name: c.brand_name,
      brand_logo_url: c.brand_logo_url || null,
      type: 'campaign' as const
    }));
    const uniqueBoosts = Array.from(boostsMap.values()).map(b => ({
      id: b.id,
      title: b.title,
      brand_name: b.brand_name,
      brand_logo_url: b.brand_logo_url || null,
      type: 'boost' as const
    }));
    setAvailableCampaigns([...uniqueCampaigns, ...uniqueBoosts]);
    const allTransactions: Transaction[] = [];
    if (walletTransactions) {
      walletTransactions.forEach(txn => {
        const metadata = txn.metadata as any;
        let source = '';
        let destination = '';
        let payoutDetails = null;
        const isBoostEarning = txn.type === 'earning' && metadata?.boost_id;

        // Try to match with payout request to get full details
        if (txn.type === 'withdrawal' && payoutRequests) {
          const matchingPayout = payoutRequests.find(pr => Math.abs(new Date(pr.requested_at).getTime() - new Date(txn.created_at).getTime()) < 5000 && Number(pr.amount) === Number(txn.amount));
          if (matchingPayout) {
            payoutDetails = matchingPayout.payout_details;
            // Add rejection reason if available
            if (matchingPayout.rejection_reason) {
              const metadataObj = typeof metadata === 'object' && metadata !== null ? metadata : {};
              txn.metadata = {
                ...metadataObj,
                rejection_reason: matchingPayout.rejection_reason
              };
            }
          }
        }
        switch (txn.type) {
          case 'admin_adjustment':
            source = 'Virality Admin';
            destination = 'Wallet';
            break;
          case 'earning':
            source = isBoostEarning ? 'Boost Video' : 'Campaign Submission';
            destination = 'Wallet';
            break;
          case 'withdrawal':
            const payoutMethod = metadata?.payout_method;
            if (payoutMethod === 'paypal') {
              destination = 'PayPal';
            } else if (payoutMethod === 'crypto') {
              destination = `Crypto (${metadata?.network || 'ETH'})`;
            } else if (payoutMethod === 'bank') {
              destination = 'Bank Transfer';
            } else if (payoutMethod === 'wise') {
              destination = 'Wise';
            } else if (payoutMethod === 'revolut') {
              destination = 'Revolut';
            } else if (payoutMethod === 'tips') {
              destination = 'TIPS';
            } else {
              destination = payoutMethod || 'Unknown';
            }
            break;
          case 'bonus':
            source = 'Bonus Payment';
            destination = 'Wallet';
            break;
          case 'refund':
            source = 'Refund';
            destination = 'Wallet';
            break;
          case 'transfer_sent':
            source = 'Wallet';
            destination = `@${metadata?.recipient_username || 'User'}`;
            break;
          case 'transfer_received':
            source = `@${metadata?.sender_username || 'User'}`;
            destination = 'Wallet';
            break;
        }

        // Determine transaction type
        let transactionType: Transaction['type'];
        if (txn.type === 'balance_correction') {
          transactionType = 'balance_correction';
        } else if (txn.type === 'transfer_sent') {
          transactionType = 'transfer_sent';
        } else if (txn.type === 'transfer_received') {
          transactionType = 'transfer_received';
        } else if (isBoostEarning) {
          transactionType = 'boost_earning';
        } else if (txn.type === 'admin_adjustment' || txn.type === 'earning' || txn.type === 'bonus' || txn.type === 'refund') {
          transactionType = 'earning';
        } else {
          transactionType = 'withdrawal';
        }
        allTransactions.push({
          id: txn.id,
          type: transactionType,
          amount: Number(txn.amount) || 0,
          date: new Date(txn.created_at),
          destination,
          source: source || txn.description || '',
          status: txn.status,
          rejection_reason: (txn.metadata as any)?.rejection_reason,
          metadata: Object.assign({}, txn.metadata as any, {
            payoutDetails
          }),
          campaign: metadata?.campaign_id ? campaignsMap.get(metadata.campaign_id) || null : null,
          boost: metadata?.boost_id ? boostsMap.get(metadata.boost_id) || null : null
        });
      });
    }
    setTransactions(allTransactions);
  };
  const fetchWallet = async () => {
    setLoading(true);
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const {
      data,
      error
    } = await supabase.from("wallets").select("*").eq("user_id", session.user.id).single();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch wallet data"
      });
    } else {
      setWallet(data);
      if (data?.payout_details) {
        const methods = Array.isArray(data.payout_details) ? data.payout_details : [data.payout_details];
        setPayoutMethods(methods.map((m: any, i: number) => ({
          id: `method-${i}`,
          method: m.method || data.payout_method,
          details: m.details || m
        })));
      }
    }
    setLoading(false);
  };
  const handleAddPayoutMethod = async (method: string, details: any) => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session || !wallet) return;
    if (payoutMethods.length >= 3) {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: "You can only add up to 3 payout methods"
      });
      return;
    }
    const updatedMethods = [...payoutMethods, {
      id: `method-${Date.now()}`,
      method,
      details
    }];
    console.log("Adding payout method:", {
      method,
      details
    });
    console.log("Updated methods array:", updatedMethods);
    const payoutDetailsPayload = updatedMethods.map(m => ({
      method: m.method,
      details: m.details
    }));
    console.log("Payload to Supabase:", payoutDetailsPayload);
    const {
      error
    } = await supabase.from("wallets").update({
      payout_method: method,
      payout_details: payoutDetailsPayload
    }).eq("id", wallet.id);
    if (error) {
      console.error("Supabase error when adding payout method:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to add payout method: ${error.message}`
      });
    } else {
      console.log("Payout method added successfully");
      toast({
        title: "Success",
        description: "Payout method added successfully"
      });
      fetchWallet();
    }
  };
  const handleDeleteMethod = async (methodId: string) => {
    if (!wallet) return;
    const updatedMethods = payoutMethods.filter(m => m.id !== methodId);
    const {
      error
    } = await supabase.from("wallets").update({
      payout_method: updatedMethods.length > 0 ? updatedMethods[0].method : null,
      payout_details: updatedMethods.length > 0 ? updatedMethods.map(m => ({
        method: m.method,
        details: m.details
      })) : null
    }).eq("id", wallet.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove payout method"
      });
    } else {
      toast({
        title: "Success",
        description: "Payout method removed"
      });
      fetchWallet();
    }
  };
  const handleSetDefaultMethod = async (methodId: string) => {
    if (!wallet) return;
    const methodIndex = payoutMethods.findIndex(m => m.id === methodId);
    if (methodIndex === -1 || methodIndex === 0) return; // Already default or not found

    const selectedMethod = payoutMethods[methodIndex];

    // Block UPI from being set as default
    if (selectedMethod.method === 'upi') {
      toast({
        variant: "destructive",
        title: "Temporarily Disabled",
        description: "UPI payouts are temporarily disabled. Please use another payment method."
      });
      return;
    }
    const updatedMethods = [...payoutMethods];
    const [method] = updatedMethods.splice(methodIndex, 1);
    updatedMethods.unshift(method);
    const {
      error
    } = await supabase.from("wallets").update({
      payout_method: method.method,
      payout_details: updatedMethods.map(m => ({
        method: m.method,
        details: m.details
      }))
    }).eq("id", wallet.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set default method"
      });
    } else {
      toast({
        title: "Success",
        description: "Default payment method updated"
      });
      fetchWallet();
    }
  };
  const handleRequestPayout = async () => {
    if (!wallet?.balance || wallet.balance < 20) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Minimum payout amount is $20"
      });
      return;
    }
    if (payoutMethods.length === 0) {
      toast({
        variant: "destructive",
        title: "No Payout Method",
        description: "Please add a payout method first"
      });
      return;
    }
    setSelectedPayoutMethod(payoutMethods[0].id);
    setPayoutAmount(wallet.balance.toString());
    setPayoutDialogOpen(true);
  };

  // Fetch user profile for share dialog
  const fetchUserProfile = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const {
      data: profile
    } = await supabase.from('profiles').select('username, avatar_url, banner_url').eq('id', session.user.id).single();
    if (profile) {
      setUserProfile(profile);
    }
  };
  useEffect(() => {
    fetchUserProfile();
  }, []);
  const handleConfirmPayout = async () => {
    if (isSubmittingPayout) return; // Prevent duplicate submissions

    if (!wallet || !payoutAmount || Number(payoutAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount"
      });
      return;
    }
    const amount = Number(payoutAmount);
    const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
    if (!selectedMethod) return;

    // Block UPI withdrawals
    if (selectedMethod.method === 'upi') {
      toast({
        variant: "destructive",
        title: "Temporarily Disabled",
        description: "UPI payouts are temporarily disabled. Please use another payment method."
      });
      return;
    }

    // Bank minimum is $250
    const minimumAmount = selectedMethod.method === 'bank' ? 250 : 20;
    if (amount < minimumAmount) {
      toast({
        variant: "destructive",
        title: "Minimum Amount",
        description: `Minimum payout amount is $${minimumAmount}${selectedMethod.method === 'bank' ? ' for bank transfers' : ''}`
      });
      return;
    }
    if (amount > wallet.balance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Amount exceeds available balance"
      });
      return;
    }
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    if (!selectedMethod) return;

    // Set submitting state BEFORE any async operations to prevent race conditions
    setIsSubmittingPayout(true);

    // Check for existing pending/in-transit withdrawal requests
    const {
      data: existingRequests,
      error: checkError
    } = await supabase.from("payout_requests").select("id").eq("user_id", session.user.id).in("status", ["pending", "in_transit"]);
    if (checkError) {
      setIsSubmittingPayout(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify withdrawal status"
      });
      return;
    }
    if (existingRequests && existingRequests.length > 0) {
      setIsSubmittingPayout(false);
      toast({
        variant: "destructive",
        title: "Pending Withdrawal Exists",
        description: "You already have a pending withdrawal request. Please wait for it to be processed before requesting another."
      });
      return;
    }
    try {
      const balance_before = wallet.balance;
      const balance_after = wallet.balance - amount;

      // Create payout request
      const {
        error: payoutError
      } = await supabase.from("payout_requests").insert({
        user_id: session.user.id,
        amount: amount,
        payout_method: selectedMethod.method,
        payout_details: selectedMethod.details,
        status: 'pending'
      });
      if (payoutError) throw payoutError;

      // Create wallet transaction
      const {
        error: txnError
      } = await supabase.from("wallet_transactions").insert({
        user_id: session.user.id,
        amount: -amount,
        // Negative for withdrawals
        type: 'withdrawal',
        status: 'pending',
        description: `Withdrawal to ${selectedMethod.method === 'paypal' ? 'PayPal' : 'Crypto'}`,
        metadata: {
          payout_method: selectedMethod.method,
          network: selectedMethod.details.network || null,
          balance_before: balance_before,
          balance_after: balance_after
        },
        created_by: session.user.id
      });
      if (txnError) throw txnError;

      // Update wallet balance
      const {
        error: walletError
      } = await supabase.from("wallets").update({
        balance: wallet.balance - amount,
        total_withdrawn: wallet.total_withdrawn + amount
      }).eq("id", wallet.id);
      if (walletError) throw walletError;

      // Send Discord notification
      try {
        await supabase.functions.invoke('notify-withdrawal', {
          body: {
            username: session.user.user_metadata?.username || 'Unknown',
            email: session.user.email || 'Unknown',
            amount: amount,
            payout_method: selectedMethod.method,
            payout_details: selectedMethod.details,
            balance_before: balance_before,
            balance_after: balance_after,
            date: new Date().toISOString()
          }
        });
      } catch (notifError) {
        console.error('Failed to send Discord notification:', notifError);
      }
      toast({
        title: "Payout Requested",
        description: "Your payout request has been submitted and will be processed within 3-5 business days."
      });
      setPayoutDialogOpen(false);
      fetchWallet();
      fetchTransactions();
    } catch (error: any) {
      // Rollback wallet update if transaction failed
      const {
        error: rollbackError
      } = await supabase.from("wallets").update({
        balance: wallet.balance,
        total_withdrawn: wallet.total_withdrawn
      }).eq("id", wallet.id);
      if (rollbackError) {
        console.error('Failed to rollback wallet update:', rollbackError);
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit payout request"
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };
  // Loading state removed - ProfileHeader handles its own loading skeleton
  const totalEarnings = earningsData.reduce((sum, point) => sum + point.amount, 0);
  const timePeriodLabels: Record<TimePeriod, string> = {
    '3D': '3 Days',
    '1W': '1 Week',
    '1M': '1 Month',
    '3M': '3 Months',
    '1Y': '1 Year',
    'TW': 'This Week'
  };
  return <div className="space-y-6 max-w-[650px] mx-auto pt-6 font-inter tracking-[-0.5px]">

      {/* Profile Header Section */}
      <ProfileHeader totalViews={0} totalPosts={transactions.filter(t => t.type === 'earning' || t.type === 'boost_earning').length} />



      {/* Balance Cards - Hidden */}

      {/* Payout Pipeline Section - Hidden */}

    {/* Team & Affiliate Earnings Charts - Hidden */}

      <Card className="border rounded-xl overflow-hidden border-[#141414]/0 bg-neutral-100/0">
        {/* Filter Button */}
        <div className="pt-5 pb-4 px-0">
          <DropdownMenu open={filterOpen} onOpenChange={open => {
          setFilterOpen(open);
          if (!open) {
            setFilterSubmenu('main');
            setFilterSearch('');
          }
        }}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-[9px] border-border bg-background hover:bg-background hover:text-foreground px-4 py-2 h-auto">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="font-medium">Filter</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px] p-2.5 overflow-hidden bg-white dark:bg-[#0a0a0a] border-[#dce1eb] dark:border-[#141414] font-['Inter'] tracking-[-0.5px]">
              <div className="relative">
                {/* Main Menu */}
                <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'main' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full absolute inset-0'}`}>
                  <div className="relative mb-3">
                    <Input placeholder="Filter..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="bg-background/50 border-border h-10 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border" />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">F</kbd>
                  </div>
                  
                  {/* Show matching filter options when searching */}
                  {filterSearch ? <div className="space-y-1 max-h-[250px] overflow-y-auto">
                      {/* Type options */}
                      {[{
                    value: 'earning',
                    label: 'Campaign Payout'
                  }, {
                    value: 'withdrawal',
                    label: 'Withdrawal'
                  }, {
                    value: 'team_earning',
                    label: 'Team Earnings'
                  }, {
                    value: 'affiliate_earning',
                    label: 'Affiliate Earnings'
                  }, {
                    value: 'referral',
                    label: 'Referral Bonus'
                  }, {
                    value: 'transfer_sent',
                    label: 'Transfer Sent'
                  }, {
                    value: 'transfer_received',
                    label: 'Transfer Received'
                  }].filter(opt => opt.label.toLowerCase().includes(filterSearch.toLowerCase()) || opt.value.toLowerCase().includes(filterSearch.toLowerCase())).map(option => <button key={option.value} onClick={e => {
                    e.preventDefault();
                    setTypeFilter(option.value);
                    setFilterSearch('');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${typeFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                            <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                              <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                              <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                              <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                              <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                            </div>
                            <span className="text-sm">{option.label}</span>
                            {typeFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                          </button>)}
                      
                      {/* Status options */}
                      {[{
                    value: 'completed',
                    label: 'Completed'
                  }, {
                    value: 'pending',
                    label: 'Pending'
                  }, {
                    value: 'in_transit',
                    label: 'In Transit'
                  }, {
                    value: 'rejected',
                    label: 'Rejected'
                  }].filter(opt => opt.label.toLowerCase().includes(filterSearch.toLowerCase()) || opt.value.toLowerCase().includes(filterSearch.toLowerCase())).map(option => <button key={option.value} onClick={e => {
                    e.preventDefault();
                    setStatusFilter(option.value);
                    setFilterSearch('');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${statusFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                            <div className="w-4 h-4 rounded-full border-2 border-dashed border-current" />
                            <span className="text-sm">{option.label}</span>
                            {statusFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                          </button>)}
                      
                      {/* Program options */}
                      {availableCampaigns.filter(c => c.title.toLowerCase().includes(filterSearch.toLowerCase()) || c.brand_name?.toLowerCase().includes(filterSearch.toLowerCase())).map(campaign => <button key={campaign.id} onClick={e => {
                    e.preventDefault();
                    setCampaignFilter(campaign.id);
                    setFilterSearch('');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${campaignFilter === campaign.id ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                            {campaign.brand_logo_url ? <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                                <img src={campaign.brand_logo_url} alt={campaign.brand_name || 'Brand'} className="w-full h-full object-cover" />
                              </div> : <Briefcase className="h-4 w-4" />}
                            <span className="text-sm truncate">{campaign.title}</span>
                            {campaignFilter === campaign.id && <Check className="h-4 w-4 ml-auto flex-shrink-0" />}
                          </button>)}
                      
                      {/* No results */}
                      {[{
                    value: 'earning',
                    label: 'Campaign Payout'
                  }, {
                    value: 'withdrawal',
                    label: 'Withdrawal'
                  }, {
                    value: 'team_earning',
                    label: 'Team Earnings'
                  }, {
                    value: 'affiliate_earning',
                    label: 'Affiliate Earnings'
                  }, {
                    value: 'referral',
                    label: 'Referral Bonus'
                  }, {
                    value: 'transfer_sent',
                    label: 'Transfer Sent'
                  }, {
                    value: 'transfer_received',
                    label: 'Transfer Received'
                  }].filter(opt => opt.label.toLowerCase().includes(filterSearch.toLowerCase()) || opt.value.toLowerCase().includes(filterSearch.toLowerCase())).length === 0 && [{
                    value: 'completed',
                    label: 'Completed'
                  }, {
                    value: 'pending',
                    label: 'Pending'
                  }, {
                    value: 'in_transit',
                    label: 'In Transit'
                  }, {
                    value: 'rejected',
                    label: 'Rejected'
                  }].filter(opt => opt.label.toLowerCase().includes(filterSearch.toLowerCase()) || opt.value.toLowerCase().includes(filterSearch.toLowerCase())).length === 0 && availableCampaigns.filter(c => c.title.toLowerCase().includes(filterSearch.toLowerCase()) || c.brand_name?.toLowerCase().includes(filterSearch.toLowerCase())).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No matching filters</p>}
                    </div> : (/* Default menu items when not searching */
                <div className="space-y-1">
                      <button onClick={e => {
                    e.preventDefault();
                    setFilterSubmenu('type');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${typeFilter !== 'all' ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                        <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                          <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                          <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                          <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                          <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                        </div>
                        <span className="font-medium">Type</span>
                        {typeFilter !== 'all' && <span className="ml-auto text-xs text-muted-foreground capitalize">{typeFilter.replace('_', ' ')}</span>}
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                      </button>
                      <button onClick={e => {
                    e.preventDefault();
                    setFilterSubmenu('status');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${statusFilter !== 'all' ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                        <div className="w-4 h-4 rounded-full border-2 border-dashed border-current" />
                        <span className="font-medium">Status</span>
                        {statusFilter !== 'all' && <span className="ml-auto text-xs text-muted-foreground capitalize">{statusFilter.replace('_', ' ')}</span>}
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                      </button>
                      {availableCampaigns.length > 0 && <button onClick={e => {
                    e.preventDefault();
                    setFilterSubmenu('program');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${campaignFilter !== 'all' ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                          <Briefcase className="h-4 w-4" />
                          <span className="font-medium">Program</span>
                          {campaignFilter !== 'all' && <span className="ml-auto text-xs text-muted-foreground truncate max-w-[80px]">
                              {availableCampaigns.find(c => c.id === campaignFilter)?.title}
                            </span>}
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        </button>}
                    </div>)}
                  
                  {(typeFilter !== 'all' || statusFilter !== 'all' || campaignFilter !== 'all') && !filterSearch && <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground mt-3" onClick={e => {
                  e.preventDefault();
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setCampaignFilter('all');
                }}>
                      Clear filters
                    </Button>}
                </div>

                {/* Type Submenu */}
                <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'type' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'}`}>
                  <button onClick={e => {
                  e.preventDefault();
                  setFilterSubmenu('main');
                  setFilterSearch('');
                }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
                    <ChevronLeft className="h-4 w-4" />
                    <span>Type</span>
                  </button>
                  <div className="space-y-1">
                    {[{
                    value: 'all',
                    label: 'All Types'
                  }, {
                    value: 'earning',
                    label: 'Campaign Payout'
                  }, {
                    value: 'withdrawal',
                    label: 'Withdrawal'
                  }, {
                    value: 'team_earning',
                    label: 'Team Earnings'
                  }, {
                    value: 'affiliate_earning',
                    label: 'Affiliate Earnings'
                  }, {
                    value: 'referral',
                    label: 'Referral Bonus'
                  }, {
                    value: 'transfer_sent',
                    label: 'Transfer Sent'
                  }, {
                    value: 'transfer_received',
                    label: 'Transfer Received'
                  }].filter(option => !filterSearch || option.label.toLowerCase().includes(filterSearch.toLowerCase()) || option.value.toLowerCase().includes(filterSearch.toLowerCase())).map(option => <button key={option.value} onClick={e => {
                    e.preventDefault();
                    setTypeFilter(option.value);
                    setFilterSubmenu('main');
                    setFilterSearch('');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${typeFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                        <span className="text-sm">{option.label}</span>
                        {typeFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                      </button>)}
                  </div>
                </div>

                {/* Status Submenu */}
                <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'status' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'}`}>
                  <button onClick={e => {
                  e.preventDefault();
                  setFilterSubmenu('main');
                  setFilterSearch('');
                }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
                    <ChevronLeft className="h-4 w-4" />
                    <span>Status</span>
                  </button>
                  <div className="space-y-1">
                    {[{
                    value: 'all',
                    label: 'All Statuses'
                  }, {
                    value: 'completed',
                    label: 'Completed'
                  }, {
                    value: 'pending',
                    label: 'Pending'
                  }, {
                    value: 'in_transit',
                    label: 'In Transit'
                  }, {
                    value: 'rejected',
                    label: 'Rejected'
                  }].filter(option => !filterSearch || option.label.toLowerCase().includes(filterSearch.toLowerCase()) || option.value.toLowerCase().includes(filterSearch.toLowerCase())).map(option => <button key={option.value} onClick={e => {
                    e.preventDefault();
                    setStatusFilter(option.value);
                    setFilterSubmenu('main');
                    setFilterSearch('');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${statusFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                        <span className="text-sm">{option.label}</span>
                        {statusFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                      </button>)}
                  </div>
                </div>

                {/* Program Submenu */}
                <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'program' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'}`}>
                  <button onClick={e => {
                  e.preventDefault();
                  setFilterSubmenu('main');
                  setFilterSearch('');
                }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
                    <ChevronLeft className="h-4 w-4" />
                    <span>Program</span>
                  </button>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    <button onClick={e => {
                    e.preventDefault();
                    setCampaignFilter('all');
                    setFilterSubmenu('main');
                    setFilterSearch('');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${campaignFilter === 'all' ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                      <span className="text-sm">All Programs</span>
                      {campaignFilter === 'all' && <Check className="h-4 w-4 ml-auto" />}
                    </button>
                    {availableCampaigns.filter(campaign => !filterSearch || campaign.title.toLowerCase().includes(filterSearch.toLowerCase()) || campaign.brand_name?.toLowerCase().includes(filterSearch.toLowerCase())).map(campaign => <button key={campaign.id} onClick={e => {
                    e.preventDefault();
                    setCampaignFilter(campaign.id);
                    setFilterSubmenu('main');
                    setFilterSearch('');
                  }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${campaignFilter === campaign.id ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                        {campaign.brand_logo_url ? <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                            <img src={campaign.brand_logo_url} alt={campaign.brand_name || 'Brand'} className="w-full h-full object-cover" />
                          </div> : <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-foreground font-medium">
                              {campaign.title.charAt(0).toUpperCase()}
                            </span>
                          </div>}
                        <span className="text-sm truncate flex-1">{campaign.title}</span>
                        {campaignFilter === campaign.id && <Check className="h-4 w-4 ml-auto flex-shrink-0" />}
                      </button>)}
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Transactions Table */}
        <div className="pb-6 px-0">
          {transactions.length === 0 ? <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div> : <>
              <div className="overflow-x-auto border border-[#dce1eb] dark:border-[#141414] rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#dce1eb] dark:border-[#141414] hover:bg-transparent dark:bg-[#0e0e0e]">
                      <TableHead className="text-foreground font-medium text-sm h-12">Program</TableHead>
                      <TableHead className="text-foreground font-medium text-sm h-12">Type</TableHead>
                      <TableHead className="text-foreground font-medium text-sm h-12">Status</TableHead>
                      <TableHead className="text-foreground font-medium text-sm h-12">Processed</TableHead>
                      <TableHead className="text-foreground font-medium text-sm h-12 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.filter(transaction => {
                  if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
                  if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
                  if (campaignFilter !== "all") {
                    const matchesCampaign = transaction.campaign?.id === campaignFilter;
                    const matchesBoost = transaction.boost?.id === campaignFilter;
                    if (!matchesCampaign && !matchesBoost) return false;
                  }
                  return true;
                }).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(transaction => <TableRow key={transaction.id} onClick={() => {
                  setSelectedTransaction(transaction);
                  setTransactionSheetOpen(true);
                }} className="cursor-pointer hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors border-[#dce1eb] dark:border-[#141414]">
                        {/* Program */}
                        <TableCell className="py-4">
                          {transaction.boost?.title ? <div className="flex items-center gap-2">
                              {transaction.boost?.brand_logo_url ? <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                  <img src={transaction.boost.brand_logo_url} alt={transaction.boost.brand_name || 'Brand'} className="w-full h-full object-cover" />
                                </div> : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs text-foreground font-medium">
                                    {transaction.boost.title.charAt(0).toUpperCase()}
                                  </span>
                                </div>}
                              <span className="text-sm font-medium">{transaction.boost.title}</span>
                            </div> : transaction.campaign?.title ? <div className="flex items-center gap-2">
                              {transaction.campaign?.brand_logo_url ? <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                  <img src={transaction.campaign.brand_logo_url} alt={transaction.campaign.brand_name || 'Brand'} className="w-full h-full object-cover" />
                                </div> : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs text-foreground font-medium">
                                    {transaction.campaign.title.charAt(0).toUpperCase()}
                                  </span>
                                </div>}
                              <span className="text-sm font-medium">{transaction.campaign.title}</span>
                            </div> : <span className="text-sm text-muted-foreground">-</span>}
                        </TableCell>
                        
                        {/* Type */}
                        <TableCell className="py-4">
                          <span className="text-sm text-muted-foreground">
                            {transaction.type === 'boost_earning' ? 'Boost Payout' : transaction.type === 'earning' ? 'Campaign Payout' : transaction.type === 'withdrawal' ? 'Withdrawal' : transaction.type === 'referral' ? 'Referral Bonus' : transaction.type === 'balance_correction' ? 'Balance Correction' : transaction.type === 'transfer_sent' ? 'Transfer Sent' : transaction.type === 'transfer_received' ? 'Transfer Received' : 'Other'}
                          </span>
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${transaction.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : transaction.status === 'pending' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : transaction.status === 'in_transit' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : transaction.status === 'rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
                            {transaction.status === 'completed' && <Check className="h-3 w-3" />}
                            {transaction.status === 'pending' && <Clock className="h-3 w-3" />}
                            {transaction.status === 'in_transit' && <Hourglass className="h-3 w-3" />}
                            {transaction.status === 'rejected' && <X className="h-3 w-3" />}
                            {transaction.status === 'completed' ? 'Completed' : transaction.status === 'pending' ? 'Pending' : transaction.status === 'in_transit' ? 'In Transit' : transaction.status === 'rejected' ? 'Rejected' : transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1)}
                          </span>
                        </TableCell>
                        
                        
                        {/* Processed */}
                        <TableCell className="py-4 text-sm text-muted-foreground">
                          {transaction.status === 'completed' ? <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="underline decoration-dotted cursor-pointer hover:text-foreground">
                                    {format(transaction.date, 'MMM d')}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-popover border border-border rounded-xl shadow-xl p-3 max-w-[200px]">
                                  <div className="space-y-1.5">
                                    <p className="text-xs text-muted-foreground">Payment Completed</p>
                                    <p className="text-sm font-medium">{format(transaction.date, 'MMMM d, yyyy')}</p>
                                    <p className="text-xs text-muted-foreground">{format(transaction.date, 'h:mm a')}</p>
                                    <div className="flex items-center gap-1.5 pt-1 border-t border-border mt-1">
                                      <Check className="h-3 w-3 text-green-500" />
                                      <span className="text-xs text-green-500">Successfully processed</span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider> : transaction.status === 'rejected' ? <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="underline decoration-dotted cursor-pointer hover:text-foreground text-red-500">
                                    {format(transaction.date, 'MMM d')}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-popover border border-border rounded-xl shadow-xl p-3 max-w-[240px]">
                                  <div className="space-y-1.5">
                                    <p className="text-xs text-muted-foreground">Rejected</p>
                                    <p className="text-sm font-medium">{format(transaction.date, 'MMMM d, yyyy')}</p>
                                    <p className="text-xs text-muted-foreground">{format(transaction.date, 'h:mm a')}</p>
                                    {transaction.rejection_reason && <div className="pt-1 border-t border-border mt-1">
                                        <p className="text-xs text-red-500">Reason: {transaction.rejection_reason}</p>
                                      </div>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider> : '-'}
                        </TableCell>
                        
                        {/* Amount */}
                        <TableCell className="py-4 text-right">
                          <span className={`text-sm font-semibold tabular-nums ${transaction.type === 'withdrawal' || transaction.type === 'transfer_sent' ? 'text-red-500' : 'text-green-500'}`}>
                            {transaction.type === 'withdrawal' || transaction.type === 'transfer_sent' ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#dadce2]/0">
                <p className="text-sm text-muted-foreground">
                  Viewing {Math.min((currentPage - 1) * itemsPerPage + 1, transactions.filter(transaction => {
                if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
                if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
                if (campaignFilter !== "all" && (!transaction.campaign || transaction.campaign.id !== campaignFilter)) return false;
                return true;
              }).length)}-{Math.min(currentPage * itemsPerPage, transactions.filter(transaction => {
                if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
                if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
                if (campaignFilter !== "all" && (!transaction.campaign || transaction.campaign.id !== campaignFilter)) return false;
                return true;
              }).length)} of {transactions.filter(transaction => {
                if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
                if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
                if (campaignFilter !== "all" && (!transaction.campaign || transaction.campaign.id !== campaignFilter)) return false;
                return true;
              }).length} payouts
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-9 px-4 rounded-lg border-border text-muted-foreground hover:text-foreground disabled:opacity-50">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage * itemsPerPage >= transactions.filter(transaction => {
                if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
                if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
                if (campaignFilter !== "all" && (!transaction.campaign || transaction.campaign.id !== campaignFilter)) return false;
                return true;
              }).length} className="h-9 px-4 rounded-lg border-border text-muted-foreground hover:text-foreground disabled:opacity-50">
                    Next
                  </Button>
                </div>
              </div>
            </>}
        </div>
      </Card>

      {/* Balance Cards - Removed duplicate */}

      <PayoutMethodDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleAddPayoutMethod} currentMethodCount={payoutMethods.length} />

      {/* Payout Request Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Choose the amount and payment method for your withdrawal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payout-amount">Amount ($)</Label>
              <Input id="payout-amount" type="number" min={(() => {
              const method = payoutMethods.find(m => m.id === selectedPayoutMethod);
              return method?.method === 'bank' ? 250 : 20;
            })()} step="0.01" max={wallet?.balance || 0} placeholder={(() => {
              const method = payoutMethods.find(m => m.id === selectedPayoutMethod);
              return method?.method === 'bank' ? '250.00' : '20.00';
            })()} value={payoutAmount} onChange={e => setPayoutAmount(e.target.value.replace(',', '.'))} className="bg-muted border-transparent placeholder:text-muted-foreground h-14 text-lg font-medium focus-visible:ring-primary/50" />
              <div className="flex gap-2 flex-wrap">
                {(() => {
                const method = payoutMethods.find(m => m.id === selectedPayoutMethod);
                const amounts = method?.method === 'bank' ? [250, 500, 1000] : [20, 50, 100, 500];
                return amounts.map(amount => <Button key={amount} type="button" variant="ghost" size="sm" onClick={() => setPayoutAmount(amount.toString())} disabled={wallet?.balance ? wallet.balance < amount : true} className="bg-muted hover:bg-accent">
                      ${amount}
                    </Button>);
              })()}
              </div>
              <p className="text-xs text-muted-foreground">
                {(() => {
                const method = payoutMethods.find(m => m.id === selectedPayoutMethod);
                const minimum = method?.method === 'bank' ? '$250.00' : '$20.00';
                return `Minimum: ${minimum} • Available: $${wallet?.balance?.toFixed(2) || "0.00"}`;
              })()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-method">Payment Method</Label>
              <Select value={selectedPayoutMethod} onValueChange={setSelectedPayoutMethod}>
                <SelectTrigger id="payout-method" className="bg-muted border-transparent h-14 text-lg">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {payoutMethods.map(method => {
                  const getMethodLabel = () => {
                    switch (method.method) {
                      case "paypal":
                        return "PayPal";
                      case "crypto":
                        return "Crypto";
                      case "bank":
                        return "Bank";
                      case "upi":
                        return "UPI (Disabled)";
                      case "wise":
                        return "Wise";
                      case "revolut":
                        return "Revolut";
                      case "tips":
                        return "TIPS";
                      default:
                        return method.method;
                    }
                  };
                  const getMethodDetails = () => {
                    switch (method.method) {
                      case "paypal":
                        return method.details.email;
                      case "crypto":
                        return `${method.details.address?.slice(0, 8)}...${method.details.address?.slice(-6)}`;
                      case "bank":
                        return `${method.details.bankName}`;
                      case "upi":
                        return method.details.upi_id;
                      case "wise":
                        return method.details.email;
                      case "revolut":
                        return method.details.email;
                      case "tips":
                        return method.details.username;
                      default:
                        return "N/A";
                    }
                  };
                  const getNetworkLogo = () => {
                    if (method.method !== "crypto") return null;
                    const network = method.details?.network?.toLowerCase();
                    if (network === 'ethereum') return ethereumLogo;
                    if (network === 'optimism') return optimismLogo;
                    if (network === 'solana') return solanaLogo;
                    if (network === 'polygon') return polygonLogo;
                    return null;
                  };
                  const networkLogo = getNetworkLogo();
                  return <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2">
                          {networkLogo && <img src={networkLogo} alt="Network logo" className="h-4 w-4" />}
                          <span>{getMethodLabel()} - {getMethodDetails()}</span>
                        </div>
                      </SelectItem>;
                })}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg text-sm bg-neutral-900/0">
              {(() => {
              const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
              const isPayPal = selectedMethod?.method === 'paypal';
              const isUpi = selectedMethod?.method === 'upi';
              const isBank = selectedMethod?.method === 'bank';
              if (isUpi) {
                return <>
                  <p className="text-destructive font-medium">UPI payouts are temporarily disabled</p>
                  <p className="text-xs text-muted-foreground">Please select another payment method</p>
                </>;
              }
              if (isBank) {
                return <>
                  <p className="text-muted-foreground">3-5 business day wait time</p>
                  <p className="text-xs text-muted-foreground mb-2">Minimum withdrawal: $250</p>
                  <p className="font-medium">$1 + 0.75% fee</p>
                </>;
              }
              if (isPayPal) {
                return <>
                  <p className="text-muted-foreground">24h wait time</p>
                </>;
              }
              return <>
                <p className="text-muted-foreground">2-3 business day wait time</p>
                <p className="text-xs text-muted-foreground mb-2">(Payouts will not be operated on Saturday & Sunday)</p>
                <p className="font-medium">$1 + 0.75% fee</p>
              </>;
            })()}
            </div>

            {/* Fee Breakdown and Net Amount */}
            {payoutAmount && (() => {
            const amount = parseFloat(payoutAmount);
            const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
            const isPayPal = selectedMethod?.method === 'paypal';
            const isUpi = selectedMethod?.method === 'upi';
            const isBank = selectedMethod?.method === 'bank';
            const minimumAmount = isBank ? 250 : 20;

            // Don't show fee breakdown for PayPal or UPI
            if (isPayPal || isUpi || amount < minimumAmount) {
              return null;
            }

            // For crypto/bank, show fee breakdown
            const percentageFee = amount * 0.0075;
            const afterPercentage = amount - percentageFee;
            const netAmount = afterPercentage - 1;
            const feeAmount = percentageFee + 1;
            return <div className="p-4 bg-card rounded-lg border border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Withdrawal amount</span>
                    <span className="font-medium">${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing fee</span>
                    <span className="font-medium text-red-400">-${feeAmount.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="font-semibold">You'll receive</span>
                    <span className="font-bold text-lg text-primary">${netAmount.toFixed(2)}</span>
                  </div>
                </div>;
          })()}
          </div>

          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setPayoutDialogOpen(false)} disabled={isSubmittingPayout} className="font-inter tracking-[-0.5px] border-0 hover:bg-destructive/10 hover:text-destructive">
              Cancel
            </Button>
            <Button onClick={handleConfirmPayout} disabled={isSubmittingPayout} className="font-inter tracking-[-0.5px]">
              {isSubmittingPayout ? "Processing..." : "Confirm Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Receipt Sheet */}
      <Sheet open={transactionSheetOpen} onOpenChange={setTransactionSheetOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto border-l-0 font-inter tracking-[-0.3px]">
          {selectedTransaction && <div className="flex flex-col h-full">
              {/* Hero Header with Amount */}
              <div className="px-6 pt-8 pb-6 text-center border-b border-[#242424]/0 relative">
                <button onClick={() => setTransactionSheetOpen(false)} className="absolute top-4 right-4 md:hidden p-2 rounded-full bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className={`text-4xl font-bold tracking-[-0.5px] mb-2 ${selectedTransaction.type === 'earning' || selectedTransaction.type === 'boost_earning' || selectedTransaction.type === 'transfer_received' || selectedTransaction.type === 'referral' ? 'text-green-500' : selectedTransaction.type === 'balance_correction' ? 'text-orange-500' : 'text-red-500'}`}>
                  {selectedTransaction.type === 'earning' || selectedTransaction.type === 'boost_earning' || selectedTransaction.type === 'transfer_received' || selectedTransaction.type === 'referral' ? '+' : selectedTransaction.amount < 0 ? '-' : ''}${Math.abs(selectedTransaction.amount).toFixed(2)}
                </div>
                
                {selectedTransaction.status && selectedTransaction.status !== 'completed' && <Badge variant={selectedTransaction.status === 'rejected' ? 'destructive' : selectedTransaction.status === 'in_transit' ? 'default' : 'secondary'} className="capitalize">
                    {selectedTransaction.status === 'in_transit' && <Hourglass className="h-3 w-3 mr-1" />}
                    {selectedTransaction.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {selectedTransaction.status === 'in_transit' ? 'In Transit' : selectedTransaction.status}
                  </Badge>}
              </div>

              {/* Invoice Details Content */}
              <div className="flex-1 px-6 py-5">
                <h3 className="text-base font-semibold tracking-[-0.5px] mb-5">Invoice details</h3>
                
                <div className="space-y-4">
                  {/* Program */}
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-muted-foreground">Program</span>
                    <div className="flex items-center gap-2">
                      {selectedTransaction.campaign?.brand_logo_url || selectedTransaction.boost?.brand_logo_url ? <img src={selectedTransaction.campaign?.brand_logo_url || selectedTransaction.boost?.brand_logo_url} alt="" className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                        </div>}
                      <span className="text-sm font-medium tracking-[-0.5px] truncate max-w-[180px]">
                        {selectedTransaction.campaign?.title || selectedTransaction.boost?.title || selectedTransaction.campaign?.brand_name || selectedTransaction.boost?.brand_name || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Period */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Period</span>
                    <span className="text-sm font-medium tracking-[-0.5px]">
                      {selectedTransaction.metadata?.period_start && selectedTransaction.metadata?.period_end ? `${format(new Date(selectedTransaction.metadata.period_start), 'MMM d')}-${format(new Date(selectedTransaction.metadata.period_end), 'MMM d, yyyy')}` : format(selectedTransaction.date, 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Status */}
                  

                  {/* Initiated */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground border-b border-dashed border-muted-foreground/50">Initiated</span>
                    <span className="text-sm font-medium tracking-[-0.5px]">
                      {format(selectedTransaction.date, 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Paid */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground border-b border-dashed border-muted-foreground/50">Paid</span>
                    <span className="text-sm font-medium tracking-[-0.5px]">
                      {selectedTransaction.status === 'completed' ? format(selectedTransaction.date, 'MMM d, yyyy') : '-'}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-sm font-semibold tracking-[-0.5px]">
                      ${Math.abs(selectedTransaction.amount).toFixed(2)}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-muted-foreground shrink-0">Description</span>
                    <span className="text-sm font-medium tracking-[-0.5px] text-right truncate">
                      {selectedTransaction.source || (selectedTransaction.type === 'earning' || selectedTransaction.type === 'boost_earning' ? `${selectedTransaction.campaign?.brand_name || selectedTransaction.boost?.brand_name || 'Campaign'} payout` : selectedTransaction.type === 'withdrawal' ? 'Withdrawal request' : selectedTransaction.type === 'referral' ? 'Referral bonus' : selectedTransaction.type === 'transfer_sent' ? `Sent to @${selectedTransaction.metadata?.recipient_username || 'user'}` : selectedTransaction.type === 'transfer_received' ? `Received from @${selectedTransaction.metadata?.sender_username || 'user'}` : selectedTransaction.type === 'balance_correction' ? 'Balance correction' : 'Transaction')}
                    </span>
                  </div>

                  {/* Transaction ID - Collapsible */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Transaction ID</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {selectedTransaction.id.slice(0, 6)}...{selectedTransaction.id.slice(-4)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted hover:text-foreground" onClick={() => {
                    navigator.clipboard.writeText(selectedTransaction.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                    toast({
                      description: "Transaction ID copied"
                    });
                  }}>
                        {copiedId ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedTransaction.status === 'rejected' && selectedTransaction.rejection_reason && <div className="mt-5 p-3 bg-destructive/10 rounded-xl">
                    <div className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium tracking-[-0.5px] text-destructive mb-1">Rejection Reason</div>
                        <p className="text-sm text-muted-foreground">{selectedTransaction.rejection_reason}</p>
                      </div>
                    </div>
                  </div>}

                {/* Payout Method Details */}
                {selectedTransaction.type === 'withdrawal' && selectedTransaction.metadata && (() => {
              return <div className="space-y-1 pt-4">
                      <div className="text-xs font-medium tracking-[-0.5px] text-muted-foreground uppercase tracking-wide mb-3">Payout Details</div>
                      
                      {selectedTransaction.metadata.payout_method && <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-muted-foreground">Method</span>
                          <span className="text-sm font-medium tracking-[-0.5px] capitalize">{selectedTransaction.metadata.payout_method}</span>
                        </div>}
                      
                      {selectedTransaction.metadata.network && (() => {
                  const network = selectedTransaction.metadata.network.toLowerCase();
                  const getNetworkLogo = () => {
                    if (network === 'ethereum') return ethereumLogo;
                    if (network === 'optimism') return optimismLogo;
                    if (network === 'solana') return solanaLogo;
                    if (network === 'polygon') return polygonLogo;
                    return null;
                  };
                  const networkLogo = getNetworkLogo();
                  return <div className="flex items-center justify-between py-2.5">
                            <span className="text-sm text-muted-foreground">Network</span>
                            <div className="flex items-center gap-1.5">
                              {networkLogo && <img src={networkLogo} alt="Network" className="h-4 w-4" />}
                              <span className="text-sm font-medium capitalize">{selectedTransaction.metadata.network}</span>
                            </div>
                          </div>;
                })()}
                      
                      {selectedTransaction.metadata.payoutDetails?.address && <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-muted-foreground">Address</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-mono">{selectedTransaction.metadata.payoutDetails.address.slice(0, 6)}...{selectedTransaction.metadata.payoutDetails.address.slice(-4)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      navigator.clipboard.writeText(selectedTransaction.metadata.payoutDetails.address);
                      toast({
                        description: "Address copied"
                      });
                    }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>}
                      
                      {selectedTransaction.metadata.payoutDetails?.currency && <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-muted-foreground">Currency</span>
                          <span className="text-sm font-medium uppercase">{selectedTransaction.metadata.payoutDetails.currency}</span>
                        </div>}
                      
                      {selectedTransaction.metadata.payoutDetails?.email && <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-muted-foreground">PayPal</span>
                          <span className="text-sm font-medium">{selectedTransaction.metadata.payoutDetails.email}</span>
                        </div>}
                    </div>;
            })()}
              </div>
              
              {/* Fixed Share Button */}
              <div className="sticky bottom-0 left-0 right-0 p-4 bg-background border-t border-border mt-auto">
                <Button onClick={() => setShareDialogOpen(true)} className="w-full gap-2">
                  <Share2 className="h-4 w-4" />
                  Share Transaction
                </Button>
              </div>
            </div>}
        </SheetContent>
      </Sheet>

      {/* P2P Transfer Dialog */}
      <P2PTransferDialog open={p2pTransferDialogOpen} onOpenChange={setP2pTransferDialogOpen} currentBalance={wallet?.balance || 0} onTransferComplete={() => {
      fetchWallet();
      fetchTransactions();
    }} />

      {/* Share Transaction Dialog */}
      <TransactionShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} transaction={selectedTransaction} userProfile={userProfile} />
    </div>;
}