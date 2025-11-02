import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import wordmarkLogo from "@/assets/wordmark.ai.png";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2, CreditCard, ArrowUpRight, ChevronDown, ArrowDownLeft, Clock, X, Copy, Check, Eye, EyeOff, Hourglass, ArrowRightLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PayoutMethodDialog from "@/components/PayoutMethodDialog";
import { Separator } from "@/components/ui/separator";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, BarChart } from "recharts";
import { format, subDays, subMonths, subYears, startOfWeek } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ethereumLogo from "@/assets/ethereum-logo.png";
import optimismLogo from "@/assets/optimism-logo.png";
import solanaLogo from "@/assets/solana-logo.png";
import polygonLogo from "@/assets/polygon-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import { Skeleton } from "@/components/ui/skeleton";
import { P2PTransferDialog } from "@/components/P2PTransferDialog";
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
interface WithdrawalDataPoint {
  date: string;
  earnings: number;
  withdrawals: number;
}
interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'referral' | 'balance_correction' | 'transfer_sent' | 'transfer_received';
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
}
type TimePeriod = '3D' | '1W' | '1M' | '3M' | '1Y' | 'TW';
export function WalletTab() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsDataPoint[]>([]);
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
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [p2pTransferDialogOpen, setP2pTransferDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [earningsChartPeriod, setEarningsChartPeriod] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchWallet();

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
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (wallet) {
      fetchEarningsData();
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
    let cumulativeEarnings = 0;

    // Generate data points
    const pointCount = Math.min(days, 30); // Max 30 points for performance
    const interval = Math.max(1, Math.floor(days / pointCount));
    for (let i = 0; i <= pointCount; i++) {
      const currentDate = new Date(start.getTime() + i * interval * 24 * 60 * 60 * 1000);
      if (currentDate > now) break;
      const dateStr = format(currentDate, earningsChartPeriod === '1D' ? 'HH:mm' : 'MMM dd');

      // Calculate cumulative earnings up to this date (only positive transactions)
      if (allTransactions) {
        allTransactions.forEach(txn => {
          const txnDate = new Date(txn.created_at);
          if (txnDate <= currentDate && txnDate > new Date(start.getTime() + (i - 1) * interval * 24 * 60 * 60 * 1000)) {
            const amount = Number(txn.amount) || 0;
            // Only count earnings (positive amounts)
            if (['earning', 'admin_adjustment', 'bonus', 'refund', 'transfer_received'].includes(txn.type) && amount > 0) {
              cumulativeEarnings += amount;
            }
          }
        });
      }
      dataPoints.push({
        date: dateStr,
        amount: Number(cumulativeEarnings.toFixed(2))
      });
    }

    // Ensure the last point shows current total earned
    if (dataPoints.length > 0 && wallet && earningsChartPeriod === 'ALL') {
      dataPoints[dataPoints.length - 1].amount = Number(wallet.total_earned.toFixed(2));
    }
    setEarningsData(dataPoints);
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

    // Calculate total pending and in-transit withdrawals
    const pendingAmount = payoutRequests?.filter(pr => pr.status === 'pending' || pr.status === 'in_transit').reduce((sum, pr) => sum + Number(pr.amount), 0) || 0;
    setPendingWithdrawals(pendingAmount);
    const allTransactions: Transaction[] = [];
    if (walletTransactions) {
      walletTransactions.forEach(txn => {
        const metadata = txn.metadata as any;
        let source = '';
        let destination = '';
        let payoutDetails = null;

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
            source = 'Campaign Submission';
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
        allTransactions.push({
          id: txn.id,
          type: txn.type === 'balance_correction' ? 'balance_correction' : txn.type === 'transfer_sent' ? 'transfer_sent' : txn.type === 'transfer_received' ? 'transfer_received' : txn.type === 'admin_adjustment' || txn.type === 'earning' || txn.type === 'bonus' || txn.type === 'refund' ? 'earning' : 'withdrawal',
          amount: Number(txn.amount) || 0,
          date: new Date(txn.created_at),
          destination,
          source: source || txn.description || '',
          status: txn.status,
          rejection_reason: (txn.metadata as any)?.rejection_reason,
          metadata: Object.assign({}, txn.metadata as any, {
            payoutDetails
          }),
          campaign: metadata?.campaign_id ? campaignsMap.get(metadata.campaign_id) || null : null
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
    if (amount < 20) {
      toast({
        variant: "destructive",
        title: "Minimum Amount",
        description: "Minimum payout amount is $20"
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

    // Check for existing pending/in-transit withdrawal requests
    const { data: existingRequests, error: checkError } = await supabase
      .from("payout_requests")
      .select("id")
      .eq("user_id", session.user.id)
      .in("status", ["pending", "in_transit"]);

    if (checkError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify withdrawal status"
      });
      return;
    }

    if (existingRequests && existingRequests.length > 0) {
      toast({
        variant: "destructive",
        title: "Pending Withdrawal Exists",
        description: "You already have a pending withdrawal request. Please wait for it to be processed before requesting another."
      });
      return;
    }

    const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
    if (!selectedMethod) return;
    setIsSubmittingPayout(true);
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
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit payout request"
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };
  if (loading) {
    return <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>;
  }
  const totalEarnings = earningsData.reduce((sum, point) => sum + point.amount, 0);
  const timePeriodLabels: Record<TimePeriod, string> = {
    '3D': '3 Days',
    '1W': '1 Week',
    '1M': '1 Month',
    '3M': '3 Months',
    '1Y': '1 Year',
    'TW': 'This Week'
  };
  return <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Main Balance */}
      <div className="flex items-center justify-between py-0">
        <div className="flex gap-2">
          <Button onClick={() => setP2pTransferDialogOpen(true)} size="lg" variant="outline" className="py-0 my-0 border-0 bg-muted hover:bg-accent font-geist tracking-tighter-custom" disabled={!wallet || wallet.balance < 1}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transfer Money
          </Button>
          <Button onClick={handleRequestPayout} size="lg" className="py-0 my-0 border-t border-primary/30 font-geist tracking-tighter-custom" disabled={!wallet || wallet.balance < 20 || !payoutMethods || payoutMethods.length === 0 || pendingWithdrawals > 0}>
            Withdraw Balance
          </Button>
        </div>
      </div>

      {/* Balance Cards - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lifetime Earnings Card */}
        <Card className="bg-card border-0">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">💰 Your Earnings</p>
              <div className="flex gap-1">
                {(['1D', '1W', '1M', 'ALL'] as const).map(period => <Button key={period} variant="ghost" size="sm" onClick={() => setEarningsChartPeriod(period)} className={`h-7 px-2 text-xs font-semibold ${earningsChartPeriod === period ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                    {period}
                  </Button>)}
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-3xl font-bold font-geist" style={{
              letterSpacing: '-0.3px'
            }}>
                {isBalanceVisible ? `$${wallet?.total_earned?.toFixed(2) || "0.00"}` : "••••••"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                {isBalanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Mini Earnings Chart */}
            <div className="h-20 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const value = typeof payload[0].value === 'number' ? payload[0].value : Number(payload[0].value);
                        return (
                          <div className="bg-popover border border-border rounded-lg shadow-lg p-3 font-geist tracking-tighter-custom">
                            <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.date}</p>
                            <p className="text-sm font-semibold">${value.toFixed(2)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#earningsGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Current Balance Card */}
        <Card className="bg-card border-0">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 mb-2">
              
              <p className="text-sm font-semibold text-foreground">💵 Current Balance</p>
            </div>
            <p className="text-3xl font-bold font-geist mb-4" style={{
            letterSpacing: '-0.3px'
          }}>
              {isBalanceVisible ? `$${wallet?.balance?.toFixed(2) || "0.00"}` : "••••••"}
            </p>
            <Separator className="my-4" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Available Balance</span>
              <span className="text-lg font-semibold">{isBalanceVisible ? `$${wallet?.balance?.toFixed(2) || "0.00"}` : "••••••"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">In Transit</span>
              <span className="text-lg font-semibold">{isBalanceVisible ? `$${pendingWithdrawals.toFixed(2)}` : "••••••"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions - Full Width */}
      <Card className="bg-card border-0">
        <CardHeader className="px-[24px] pt-4 pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 gap-3">
          <CardTitle className="text-lg font-semibold py-[10px]">Transactions</CardTitle>
          {transactions.length > 0 && <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-0">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="earning">Earnings</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="transfer_sent">Transfers Sent</SelectItem>
                  <SelectItem value="transfer_received">Transfers Received</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>}
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div> : <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {transactions.filter(transaction => {
            // Filter by type
            if (typeFilter !== "all" && transaction.type !== typeFilter) {
              return false;
            }
            // Filter by status
            if (statusFilter !== "all" && transaction.status !== statusFilter) {
              return false;
            }
            return true;
          }).map(transaction => <div key={transaction.id} onClick={() => {
            setSelectedTransaction(transaction);
            setTransactionSheetOpen(true);
          }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg cursor-pointer transition-colors bg-muted hover:bg-muted/80 gap-3">
                  <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-bold font-instrument flex items-center gap-2" style={{
                    letterSpacing: '-0.5px'
                  }}>
                          {transaction.type === 'earning' ? <>
                              Payment for 
                              {transaction.campaign && <span className="inline-flex items-center gap-1.5">
                                  <span className="flex-shrink-0 w-5 h-5 rounded bg-background border border-border flex items-center justify-center overflow-hidden">
                                    {transaction.campaign.brand_logo_url ? <img src={transaction.campaign.brand_logo_url} alt={transaction.campaign.brand_name} className="w-full h-full object-cover" /> : <span className="text-[10px] font-semibold text-muted-foreground">
                                        {transaction.campaign.brand_name?.charAt(0).toUpperCase() || 'C'}
                                      </span>}
                                  </span>
                                  {transaction.campaign.title}
                                </span>}
                            </> : transaction.type === 'balance_correction' ? 'Balance Correction' : transaction.type === 'referral' ? 'Referral Bonus' : transaction.type === 'transfer_sent' ? 'Transfer Sent' : transaction.type === 'transfer_received' ? 'Transfer Received' : 'Withdrawal'}
                        </p>
                        {transaction.status && <Badge variant="outline" className={`text-[9px] font-semibold tracking-wider px-2 py-0.5 border-0 flex items-center gap-1 ${transaction.status === 'completed' ? 'text-green-500 bg-green-500/5' : transaction.status === 'in_transit' ? 'text-blue-500 bg-blue-500/5' : transaction.status === 'rejected' ? 'text-red-500 bg-red-500/5' : 'text-yellow-500 bg-yellow-500/5'}`} style={{
                    letterSpacing: '-0.5px'
                  }}>
                            {transaction.status === 'in_transit' && <Hourglass className="h-2.5 w-2.5" />}
                            {transaction.status === 'pending' && <Clock className="h-2.5 w-2.5" />}
                            {transaction.status === 'completed' && <Check className="h-2.5 w-2.5" />}
                            {transaction.status === 'rejected' && <X className="h-2.5 w-2.5" />}
                            {transaction.status === 'in_transit' ? 'In Transit' : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).toLowerCase()}
                          </Badge>}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-foreground/50 mb-1">
                        <Clock className="h-3 w-3" />
                        <span style={{
                    letterSpacing: '-0.5px'
                  }}>
                          {(() => {
                      const now = new Date();
                      const diffInHours = Math.floor((now.getTime() - transaction.date.getTime()) / (1000 * 60 * 60));
                      if (diffInHours < 24) {
                        if (diffInHours < 1) {
                          const diffInMinutes = Math.floor((now.getTime() - transaction.date.getTime()) / (1000 * 60));
                          return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
                        }
                        return `${diffInHours}h ago`;
                      }
                      return format(transaction.date, 'MMM dd, yyyy / HH:mm');
                    })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold whitespace-nowrap sm:ml-4 self-end sm:self-auto ${transaction.status === 'rejected' ? 'text-red-500' : transaction.status === 'pending' ? 'text-yellow-500' : transaction.type === 'earning' || transaction.type === 'transfer_received' ? 'text-green-500' : transaction.type === 'balance_correction' ? 'text-orange-500' : 'text-red-500'}`} style={{
              fontFamily: 'Geist, sans-serif',
              letterSpacing: '-0.5px',
              fontWeight: 700
            }}>
                    {transaction.type === 'earning' || transaction.type === 'transfer_received' ? '+' : transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>

      {/* Balance Cards */}
      

      {/* Payout Methods */}
      <Card className="bg-card border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Payout Methods</CardTitle>
          <Button onClick={() => setDialogOpen(true)} size="sm" disabled={payoutMethods.length >= 3} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0">
            <Plus className="mr-2 h-4 w-4" />
            Add Method {payoutMethods.length >= 3 ? "(Max 3)" : ""}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {payoutMethods.length === 0 ? <div className="text-center py-8">
              
              <p className="text-sm text-muted-foreground mb-3">No payout methods</p>
              <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground border-0">
                <Plus className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </div> : payoutMethods.map(method => {
          const getMethodLabel = () => {
            switch (method.method) {
              case "paypal":
                return "PayPal";
              case "crypto":
                return "Crypto";
              case "bank":
                return "Bank Transfer";
              case "wise":
                return "Wise";
              case "revolut":
                return "Revolut";
              case "upi":
                return "UPI";
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
                return `${method.details.bankName} - ${method.details.accountNumber?.slice(-4)}`;
              case "wise":
                return method.details.email;
              case "revolut":
                return method.details.email;
              case "upi":
                return method.details.upi_id;
              case "tips":
                return method.details.username;
              default:
                return "N/A";
            }
          };
          const getBadgeText = () => {
            switch (method.method) {
              case "crypto":
                const network = method.details.network;
                return network ? network.charAt(0).toUpperCase() + network.slice(1).toLowerCase() : "";
              case "bank":
                return "Bank";
              case "paypal":
                return "Email";
              case "wise":
                return "Email";
              case "revolut":
                return "Email";
              case "tips":
                return "Username";
              default:
                return "";
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
          const getCryptoLogo = () => {
            const currency = method.details?.currency?.toLowerCase();
            const network = method.details?.network?.toLowerCase();
            if (currency === 'usdc') return usdcLogo;
            if (network === 'ethereum') return ethereumLogo;
            if (network === 'optimism') return optimismLogo;
            if (network === 'solana') return solanaLogo;
            if (network === 'polygon') return polygonLogo;
            return null;
          };
          const cryptoLogo = getCryptoLogo();
          const networkLogo = getNetworkLogo();
          return <div key={method.id} className="relative overflow-hidden rounded-xl bg-muted">
                  
                  <div className="relative flex items-center justify-between p-4 bg-card">
                    <div className="flex items-center gap-4 flex-1">
                      {method.method !== 'crypto' && cryptoLogo}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-base font-semibold text-foreground">
                            {getMethodLabel()}
                          </p>
                          {method.method.includes('crypto') && <Badge variant="secondary" className="text-[10px] font-instrument px-2 py-0.5 bg-transparent text-foreground border-0 flex items-center gap-1.5 normal-case hover:bg-transparent">
                              {networkLogo && <img src={networkLogo} alt="Network logo" className="h-3 w-3" />}
                              {getBadgeText()}
                            </Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground font-instrument tracking-tight font-medium truncate">
                          {getMethodDetails()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMethod(method.id)} className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors duration-200">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>;
        })}
        </CardContent>
      </Card>

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
              <Input id="payout-amount" type="number" min="20" step="0.01" max={wallet?.balance || 0} placeholder="20.00" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value.replace(',', '.'))} className="bg-muted border-transparent placeholder:text-muted-foreground h-14 text-lg font-medium focus-visible:ring-primary/50" />
              <div className="flex gap-2 flex-wrap">
                {[20, 50, 100, 500].map(amount => <Button key={amount} type="button" variant="ghost" size="sm" onClick={() => setPayoutAmount(amount.toString())} disabled={wallet?.balance ? wallet.balance < amount : true} className="bg-muted hover:bg-accent">
                    ${amount}
                  </Button>)}
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum: $20.00 • Available: ${wallet?.balance?.toFixed(2) || "0.00"}
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

            <div className="p-3 bg-neutral-900 rounded-lg text-sm">
              {(() => {
              const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
              const isPayPal = selectedMethod?.method === 'paypal';
              return isPayPal ? <>
                    <p className="text-muted-foreground">24h wait time</p>
                    <p className="font-medium">6% fee</p>
                  </> : <>
                    <p className="text-muted-foreground">2-3 business day wait time</p>
                    <p className="text-xs text-muted-foreground mb-2">(Payouts will not be operated on Saturday & Sunday)</p>
                    <p className="font-medium">$1 + 0.75% fee</p>
                  </>;
            })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)} disabled={isSubmittingPayout}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayout} disabled={isSubmittingPayout}>
              {isSubmittingPayout ? "Processing..." : "Confirm Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Receipt Sheet */}
      <Sheet open={transactionSheetOpen} onOpenChange={setTransactionSheetOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
          {selectedTransaction && <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 pb-8 border-b sticky top-0 z-10 bg-background">
                {/* Icon */}
                

                {/* Type Badge */}
                

                {/* Amount */}
                <div className="mb-2">
                  {selectedTransaction.type === 'withdrawal' ? <>
                      <div className="flex items-center justify-center mb-3">
                      <div className={`w-16 h-16 rounded-full ${selectedTransaction.status === 'completed' ? 'bg-green-500/10' : selectedTransaction.status === 'in_transit' ? 'bg-blue-500/10' : 'bg-orange-500/10'} flex items-center justify-center`}>
                          {selectedTransaction.status === 'completed' ? <Check className="w-8 h-8 text-green-500" /> : selectedTransaction.status === 'in_transit' ? <TrendingUp className="w-8 h-8 text-blue-500" /> : <Hourglass className="w-8 h-8 text-orange-500" />}
                        </div>
                      </div>
                      <p className="text-foreground font-bold font-chakra" style={{
                  letterSpacing: '-0.3px'
                }}>
                        {selectedTransaction.status === 'completed' ? `You have received $${Math.abs(selectedTransaction.amount).toFixed(2)}!` : selectedTransaction.status === 'in_transit' ? `Your $${Math.abs(selectedTransaction.amount).toFixed(2)} is in transit!` : `Your $${Math.abs(selectedTransaction.amount).toFixed(2)} is on its way!`}
                      </p>
                    </> : <div className={`text-5xl font-bold ${selectedTransaction.type === 'earning' || selectedTransaction.type === 'transfer_received' ? 'text-green-500' : 'text-red-500'}`} style={{
                fontFamily: 'Geist, sans-serif',
                letterSpacing: '-0.5px',
                fontWeight: 700
              }}>
                      {selectedTransaction.type === 'earning' || selectedTransaction.type === 'transfer_received' ? '+' : '-'}${Math.abs(selectedTransaction.amount).toFixed(2)}
                    </div>}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 p-6 space-y-6">
                {/* Date and Status */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">
                    {format(selectedTransaction.date, 'MMMM dd yyyy, hh:mm a')}
                  </span>
                  {selectedTransaction.status && <Badge variant={selectedTransaction.status === 'completed' ? 'default' : selectedTransaction.status === 'rejected' ? 'destructive' : selectedTransaction.status === 'in_transit' ? 'default' : 'secondary'} className="capitalize flex items-center gap-1">
                      {selectedTransaction.status === 'in_transit' && <Hourglass className="h-3 w-3" />}
                      {selectedTransaction.status === 'pending' && <Clock className="h-3 w-3" />}
                      {selectedTransaction.status === 'completed' && <Check className="h-3 w-3" />}
                      {selectedTransaction.status === 'in_transit' ? 'In Transit' : selectedTransaction.status}
                    </Badge>}
                </div>

                {/* Transaction Metadata - Account & Views */}
                {selectedTransaction.type === 'earning' && selectedTransaction.metadata && (selectedTransaction.metadata.account_username || selectedTransaction.metadata.views !== undefined || selectedTransaction.campaign) && <div className="p-4 rounded-lg border border-border bg-muted">
                    <div className="space-y-3">
                      {/* Campaign Info */}
                      {selectedTransaction.campaign && <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center p-1">
                            {selectedTransaction.campaign.brand_logo_url ? <img src={selectedTransaction.campaign.brand_logo_url} alt={selectedTransaction.campaign.brand_name} className="w-full h-full object-contain" /> : <DollarSign className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{selectedTransaction.campaign.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{selectedTransaction.campaign.brand_name}</div>
                          </div>
                        </div>}
                      
                      {/* Platform & Account */}
                      {selectedTransaction.metadata.account_username && <div className="flex items-center gap-3">
                          {(() => {
                    const platform = selectedTransaction.metadata.platform?.toLowerCase();
                    const platformIcon = platform === 'tiktok' ? tiktokLogo : platform === 'instagram' ? instagramLogo : platform === 'youtube' ? youtubeLogo : null;
                    return platformIcon ? <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center p-1.5">
                                <img src={platformIcon} alt={platform} className="w-full h-full object-contain" />
                              </div> : null;
                  })()}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">Account</div>
                            <div className="text-sm font-semibold truncate">@{selectedTransaction.metadata.account_username}</div>
                          </div>
                        </div>}
                      
                      {/* Views Count */}
                      {selectedTransaction.metadata.views !== undefined && <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">Views Paid</div>
                            <div className="text-sm font-semibold">{selectedTransaction.metadata.views.toLocaleString()}</div>
                          </div>
                        </div>}
                    </div>
                  </div>}

                {/* Rejection Reason */}
                {selectedTransaction.status === 'rejected' && selectedTransaction.rejection_reason && <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <X className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm text-destructive mb-1">Rejection Reason</h4>
                        <p className="text-sm text-muted-foreground">{selectedTransaction.rejection_reason}</p>
                      </div>
                    </div>
                  </div>}

                {/* Transfer Details - P2P */}
                {(selectedTransaction.type === 'transfer_sent' || selectedTransaction.type === 'transfer_received') && selectedTransaction.metadata && <div className="p-4 rounded-lg border border-border bg-muted">
                    <h4 className="font-semibold text-sm mb-3">Transfer Information</h4>
                    <div className="space-y-3">
                      {selectedTransaction.type === 'transfer_sent' && selectedTransaction.metadata.recipient_username && <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">Sent To</div>
                            <div className="text-sm font-semibold">@{selectedTransaction.metadata.recipient_username}</div>
                          </div>
                        </div>}
                      {selectedTransaction.type === 'transfer_received' && selectedTransaction.metadata.sender_username && <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
                            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">Received From</div>
                            <div className="text-sm font-semibold">@{selectedTransaction.metadata.sender_username}</div>
                          </div>
                        </div>}
                      {selectedTransaction.metadata.note && <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">Note</div>
                            <div className="text-sm">{selectedTransaction.metadata.note}</div>
                          </div>
                        </div>}
                    </div>
                  </div>}

                <Separator />

                {/* Transaction Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                      <span className="text-sm text-muted-foreground">Transaction ID</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">
                          {selectedTransaction.id.slice(0, 8)}...{selectedTransaction.id.slice(-8)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      navigator.clipboard.writeText(selectedTransaction.id);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                      toast({
                        description: "Transaction ID copied to clipboard"
                      });
                    }}>
                          {copiedId ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <span className="text-sm font-medium capitalize">
                        {selectedTransaction.type === 'earning' ? 'Earnings' : selectedTransaction.type === 'referral' ? 'Referral Bonus' : selectedTransaction.type === 'balance_correction' ? 'Balance Correction' : selectedTransaction.type === 'transfer_sent' ? 'Transfer Sent' : selectedTransaction.type === 'transfer_received' ? 'Transfer Received' : 'Withdrawal'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className={`text-sm font-bold ${selectedTransaction.type === 'earning' || selectedTransaction.type === 'transfer_received' ? 'text-green-500' : selectedTransaction.type === 'balance_correction' ? 'text-orange-500' : 'text-red-500'}`}>
                        {selectedTransaction.type === 'earning' || selectedTransaction.type === 'transfer_received' ? '+' : selectedTransaction.amount < 0 ? '-' : '+'}${Math.abs(selectedTransaction.amount).toFixed(2)}
                      </span>
                    </div>

                    {selectedTransaction.source && <div className="flex justify-between items-start p-3 bg-muted/20 rounded-lg">
                        <span className="text-sm text-muted-foreground">From</span>
                        <span className="text-sm font-medium text-right max-w-[200px] truncate">
                          {selectedTransaction.source}
                        </span>
                      </div>}

                    {selectedTransaction.destination && <div className="flex justify-between items-start p-3 bg-muted/20 rounded-lg">
                        <span className="text-sm text-muted-foreground">To</span>
                        <span className="text-sm font-medium text-right max-w-[200px] truncate">
                          {(() => {
                      const details = selectedTransaction.metadata?.payoutDetails;
                      if (details?.address) return details.address;
                      if (details?.email) return details.email;
                      if (details?.account_number) return `•••• ${details.account_number.slice(-4)}`;
                      return selectedTransaction.destination;
                    })()}
                        </span>
                      </div>}
                  </div>
                </div>

                {/* Payout Method Details */}
                {selectedTransaction.type === 'withdrawal' && selectedTransaction.metadata && (() => {
              console.log('Transaction metadata:', selectedTransaction.metadata);
              console.log('Payout details:', selectedTransaction.metadata.payoutDetails);
              return <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-4">Payout Method</h3>
                      <div className="space-y-3">
                        {selectedTransaction.metadata.payout_method && <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">Method</span>
                            <span className="text-sm font-medium capitalize">
                              {selectedTransaction.metadata.payout_method}
                            </span>
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
                      const networkName = selectedTransaction.metadata.network.charAt(0).toUpperCase() + selectedTransaction.metadata.network.slice(1).toLowerCase();
                      return <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                              <span className="text-sm text-muted-foreground">Network</span>
                              <div className="flex items-center gap-2">
                                {networkLogo && <img src={networkLogo} alt="Network logo" className="h-4 w-4" />}
                                <span className="text-sm font-medium font-instrument">
                                  {networkName}
                                </span>
                              </div>
                            </div>;
                    })()}
                        
                        {/* Display crypto address if available */}
                        {selectedTransaction.metadata.payoutDetails?.address && <div className="flex justify-between items-start p-3 bg-muted/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">Wallet Address</span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="text-sm font-mono text-right break-all max-w-[200px]">
                                {selectedTransaction.metadata.payoutDetails.address}
                              </span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => {
                          navigator.clipboard.writeText(selectedTransaction.metadata.payoutDetails.address);
                          toast({
                            description: "Address copied to clipboard"
                          });
                        }}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>}
                        
                        {/* Display crypto currency if available */}
                        {selectedTransaction.metadata.payoutDetails?.currency && <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">Currency</span>
                            <span className="text-sm font-medium uppercase">
                              {selectedTransaction.metadata.payoutDetails.currency}
                            </span>
                          </div>}
                        
                        {/* Display PayPal email if available */}
                        {selectedTransaction.metadata.payoutDetails?.email && <div className="flex justify-between items-start p-3 bg-muted/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">PayPal Email</span>
                            <span className="text-sm font-medium text-right max-w-[200px] truncate">
                              {selectedTransaction.metadata.payoutDetails.email}
                            </span>
                          </div>}
                        
                        {/* Display bank details if available */}
                        {selectedTransaction.metadata.payoutDetails?.account_number && <div className="flex justify-between items-start p-3 bg-muted/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">Account</span>
                            <span className="text-sm font-medium text-right">
                              •••• {selectedTransaction.metadata.payoutDetails.account_number.slice(-4)}
                            </span>
                          </div>}
                      </div>
                    </div>
                  </>;
            })()}

                <Separator />

                {/* Additional Info */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold mb-1">Need Help?</h4>
                      <p className="text-xs text-muted-foreground">
                        If you have questions about this transaction, contact our support team with the transaction ID above.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>}
        </SheetContent>
      </Sheet>

      {/* P2P Transfer Dialog */}
      <P2PTransferDialog open={p2pTransferDialogOpen} onOpenChange={setP2pTransferDialogOpen} currentBalance={wallet?.balance || 0} onTransferComplete={() => {
      fetchWallet();
      fetchTransactions();
    }} />
    </div>;
}