import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import wordmarkLogo from "@/assets/wordmark.ai.png";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2, CreditCard, ArrowUpRight, ChevronDown, ArrowDownLeft, Clock, X, Copy, Check, Eye } from "lucide-react";
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
import usdtLogo from "@/assets/usdt-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
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
  type: 'earning' | 'withdrawal';
  amount: number;
  date: Date;
  destination?: string;
  source?: string;
  status?: string;
  rejection_reason?: string;
  metadata?: any;
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
  }, [timePeriod, wallet, earningsChartOffset]);
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
    const {
      start,
      end
    } = getDateRange();

    // Get all transactions from the beginning
    const {
      data: submissions
    } = await supabase.from("campaign_submissions").select("earnings, submitted_at").eq("creator_id", session.user.id).order("submitted_at", {
      ascending: true
    });
    const {
      data: payouts
    } = await supabase.from("payout_requests").select("amount, requested_at, status").eq("user_id", session.user.id).in("status", ["completed"]).order("requested_at", {
      ascending: true
    });

    // Generate date points for every day in the selected period
    const days = timePeriod === '3D' ? 3 : timePeriod === '1W' || timePeriod === 'TW' ? 7 : timePeriod === '1M' ? 30 : timePeriod === '3M' ? 90 : 365;
    const dataPoints: EarningsDataPoint[] = [];

    // Create data point for each day
    for (let i = 0; i <= days; i++) {
      const currentDate = subDays(end, days - i);
      const dateStr = format(currentDate, 'MMM dd');

      // Calculate cumulative balance up to this date
      let balanceAtDate = 0;

      // Add all earnings up to and including this date
      if (submissions) {
        submissions.forEach(sub => {
          const subDate = new Date(sub.submitted_at);
          if (subDate <= currentDate) {
            balanceAtDate += Number(sub.earnings) || 0;
          }
        });
      }

      // Subtract all completed payouts up to and including this date
      if (payouts) {
        payouts.forEach(payout => {
          const payoutDate = new Date(payout.requested_at);
          if (payoutDate <= currentDate) {
            balanceAtDate -= Number(payout.amount) || 0;
          }
        });
      }
      dataPoints.push({
        date: dateStr,
        amount: Number(Math.max(0, balanceAtDate).toFixed(2))
      });
    }

    // Ensure the last point shows current wallet balance
    if (dataPoints.length > 0 && wallet) {
      dataPoints[dataPoints.length - 1].amount = Number(wallet.balance.toFixed(2));
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
            if (['earning', 'admin_adjustment', 'bonus', 'refund'].includes(txn.type)) {
              earningsAmount += Number(txn.amount) || 0;
            } else if (txn.type === 'withdrawal') {
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
    }).limit(10);

    // Fetch payout requests to get full payout details
    const {
      data: payoutRequests
    } = await supabase.from("payout_requests").select("*").eq("user_id", session.user.id);
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
            source = 'Admin Payment';
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
        }
        allTransactions.push({
          id: txn.id,
          type: txn.type === 'admin_adjustment' || txn.type === 'earning' || txn.type === 'bonus' || txn.type === 'refund' ? 'earning' : 'withdrawal',
          amount: Number(txn.amount) || 0,
          date: new Date(txn.created_at),
          destination,
          source: source || txn.description || '',
          status: txn.status,
          rejection_reason: (txn.metadata as any)?.rejection_reason,
          metadata: Object.assign({}, txn.metadata as any, {
            payoutDetails
          })
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
    const {
      error
    } = await supabase.from("wallets").update({
      payout_method: method,
      payout_details: updatedMethods.map(m => ({
        method: m.method,
        details: m.details
      }))
    }).eq("id", wallet.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add payout method"
      });
    } else {
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
    if (!wallet?.balance || wallet.balance < 50) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Minimum payout amount is $50"
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
    if (!wallet || !payoutAmount || Number(payoutAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount"
      });
      return;
    }
    const amount = Number(payoutAmount);
    if (amount < 50) {
      toast({
        variant: "destructive",
        title: "Minimum Amount",
        description: "Minimum payout amount is $50"
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
    const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
    if (!selectedMethod) return;
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
        amount: amount,
        type: 'withdrawal',
        status: 'pending',
        description: `Withdrawal to ${selectedMethod.method === 'paypal' ? 'PayPal' : 'Crypto'}`,
        metadata: {
          payout_method: selectedMethod.method,
          network: selectedMethod.details.network || null
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
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading wallet...</p>
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
  return <div className="space-y-6 max-w-6xl mx-auto my-0">
      {/* Header with Main Balance */}
      <div className="flex items-center justify-between py-0">
        <h2 className="hidden sm:block text-3xl font-semibold font-sans tracking-tight" style={{
        letterSpacing: '-0.5px',
        fontWeight: 600
      }}>Virality Wallet</h2>
        <Button onClick={handleRequestPayout} size="lg" className="gap-1 py-px px-[22px] mx-0 my-px">
          <ArrowUpRight className="h-4 w-4" />
          Request Payout
        </Button>
      </div>

      {/* Earnings Graph and Recent Transactions - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Graph */}
        <Card className="bg-card border-0">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {format(new Date(), 'MMM dd, yyyy')}
              </p>
              <p className="text-4xl font-bold tracking-tight">
                ${wallet?.balance?.toFixed(2) || "0.00"}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="gap-2 bg-[#1C1C1C] hover:bg-[#1C1C1C]/80">
                  {timePeriodLabels[timePeriod]}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card z-50">
                {Object.entries(timePeriodLabels).map(([value, label]) => <DropdownMenuItem key={value} onClick={() => setTimePeriod(value as TimePeriod)} className={timePeriod === value ? "bg-muted" : "hover:bg-[#1C1C1C]"}>
                    {label}
                  </DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-64">
            {earningsData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#60a5fa" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#93c5fd" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} style={{
                  opacity: 0.6
                }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `$${value}`} style={{
                  opacity: 0.6
                }} />
                  <Tooltip contentStyle={{
                  backgroundColor: "#0C0C0C",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  fontFamily: "Instrument Sans, sans-serif",
                  letterSpacing: "-0.5px"
                }} labelStyle={{
                  color: "#666666",
                  fontWeight: 500,
                  marginBottom: "4px",
                  fontFamily: "Instrument Sans, sans-serif",
                  letterSpacing: "-0.5px",
                  fontSize: "12px"
                }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']} itemStyle={{
                  color: "#ffffff",
                  fontFamily: "Instrument Sans, sans-serif",
                  letterSpacing: "-0.5px",
                  fontWeight: 600
                }} cursor={{
                  stroke: "#333333",
                  strokeWidth: 2
                }} />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fill="url(#balanceGradient)" dot={false} activeDot={{
                  r: 6,
                  fill: "#3b82f6",
                  stroke: "#1a1a1a",
                  strokeWidth: 2
                }} />
                </AreaChart>
              </ResponsiveContainer> : <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-blue-500">${wallet?.balance?.toFixed(2) || "0.00"}</div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                </div>
              </div>}
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Available Balance</span>
            <span className="text-lg font-semibold">${wallet?.balance?.toFixed(2) || "0.00"}</span>
          </div>
        </CardContent>
      </Card>

        {/* Recent Transactions */}
        <Card className="bg-card border-0">
        <CardHeader className="px-[24px] py-0">
          <CardTitle className="text-lg font-semibold py-[10px]">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div> : <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {transactions.map(transaction => <div key={transaction.id} onClick={() => {
              setSelectedTransaction(transaction);
              setTransactionSheetOpen(true);
            }} style={{
              backgroundColor: '#0d0d0d'
            }} className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors bg-[#0d0d0d] hover:bg-[#151515]">
                  <div className="flex items-center gap-4 flex-1">
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold" style={{
                      fontFamily: 'Chakra Petch, sans-serif',
                      letterSpacing: '-0.5px'
                    }}>
                          {transaction.type === 'earning' ? 'Earnings' : 'Withdrawal'}
                        </p>
                        {transaction.status && <Badge variant="outline" className={`text-[9px] font-semibold tracking-wider px-2 py-0.5 border-0 ${transaction.status === 'completed' ? 'text-green-500 bg-green-500/5' : 'text-yellow-500 bg-yellow-500/5'}`} style={{
                      letterSpacing: '-0.5px'
                    }}>
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).toLowerCase()}
                          </Badge>}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-foreground/50 mb-1">
                        <Clock className="h-3 w-3" />
                        <span style={{
                      letterSpacing: '-0.5px'
                    }}>{format(transaction.date, 'MMM dd, yyyy / HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold whitespace-nowrap ml-4 ${transaction.type === 'earning' ? 'text-green-500' : 'text-red-500'}`} style={{
                fontFamily: 'Chakra Petch, sans-serif',
                letterSpacing: '-0.5px'
              }}>
                    {transaction.type === 'earning' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>
      </div>

      {/* Balance Cards */}
      

      {/* Payout Methods */}
      <Card className="bg-card border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Payout Methods</CardTitle>
          <Button onClick={() => setDialogOpen(true)} size="sm" disabled={payoutMethods.length >= 3} className="bg-primary hover:bg-primary/90 text-white border-0">
            <Plus className="mr-2 h-4 w-4" />
            Add Method {payoutMethods.length >= 3 ? "(Max 3)" : ""}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {payoutMethods.length === 0 ? <div className="text-center py-8">
              
              <p className="text-sm text-muted-foreground mb-3">No payout methods</p>
              <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-primary hover:bg-primary/90 text-white border-0">
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
            if (currency === 'usdt') return usdtLogo;
            if (currency === 'usdc') return usdcLogo;
            if (network === 'ethereum') return ethereumLogo;
            if (network === 'optimism') return optimismLogo;
            if (network === 'solana') return solanaLogo;
            if (network === 'polygon') return polygonLogo;
            return null;
          };
          const cryptoLogo = getCryptoLogo();
          const networkLogo = getNetworkLogo();
          return <div key={method.id} className="relative overflow-hidden rounded-xl bg-neutral-900/50">
                  
                  <div className="relative flex items-center justify-between p-4 bg-[#0d0d0d]">
                    <div className="flex items-center gap-4 flex-1">
                      {cryptoLogo && <img src={cryptoLogo} alt="Crypto logo" className="h-8 w-8 rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-base font-semibold text-foreground">
                            {getMethodLabel()}
                          </p>
                          {method.method.includes('crypto') && <Badge variant="secondary" className="text-[10px] font-instrument px-2 py-0.5 bg-transparent text-white border-0 flex items-center gap-1.5 normal-case hover:bg-transparent">
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

      {/* Earnings History Chart */}
      <Card className="bg-card border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Transaction History</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setEarningsChartOffset(earningsChartOffset + 1)} className="h-8 w-8">
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[80px] text-center">
              {earningsChartOffset === 0 ? 'Last 7 days' : `${earningsChartOffset * 7} days ago`}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setEarningsChartOffset(Math.max(0, earningsChartOffset - 1))} disabled={earningsChartOffset === 0} className="h-8 w-8">
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {withdrawalData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                <BarChart data={withdrawalData}>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} style={{
                opacity: 0.6
              }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `$${value}`} style={{
                opacity: 0.6
              }} />
                  <Tooltip contentStyle={{
                backgroundColor: "#0C0C0C",
                border: "none",
                borderRadius: "12px",
                padding: "12px 16px",
                fontFamily: "Instrument Sans, sans-serif",
                letterSpacing: "-0.5px"
              }} labelStyle={{
                color: "#666666",
                fontWeight: 500,
                marginBottom: "4px",
                fontFamily: "Instrument Sans, sans-serif",
                letterSpacing: "-0.5px",
                fontSize: "12px"
              }} itemStyle={{
                color: "#ffffff",
                fontFamily: "Instrument Sans, sans-serif",
                letterSpacing: "-0.5px",
                fontWeight: 600
              }} formatter={(value: number) => `$${value.toFixed(2)}`} cursor={{
                fill: "rgba(255, 255, 255, 0.05)"
              }} />
                  <Bar dataKey="earnings" fill="#22c55e" radius={[8, 8, 0, 0]} name="Earnings" />
                  <Bar dataKey="withdrawals" fill="#ef4444" radius={[8, 8, 0, 0]} name="Withdrawals" />
                </BarChart>
              </ResponsiveContainer> : <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No transactions in this period</p>
              </div>}
          </div>
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
              <Input id="payout-amount" type="number" min="50" step="0.01" max={wallet?.balance || 0} placeholder="50.00" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} className="bg-[#171717] border-transparent text-white placeholder:text-white/40 h-14 text-lg font-medium focus-visible:ring-primary/50" />
              <p className="text-xs text-muted-foreground">
                Minimum: $50.00 • Available: ${wallet?.balance?.toFixed(2) || "0.00"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-method">Payment Method</Label>
              <Select value={selectedPayoutMethod} onValueChange={setSelectedPayoutMethod}>
                <SelectTrigger id="payout-method" className="bg-[#171717] border-transparent text-white h-14 text-lg">
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
              <p className="text-muted-foreground">Processing Time</p>
              <p className="font-medium">3-5 business days</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayout}>
              Confirm Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Receipt Sheet */}
      <Sheet open={transactionSheetOpen} onOpenChange={setTransactionSheetOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
          {selectedTransaction && <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 pb-8 bg-gradient-to-b from-card to-background border-b sticky top-0 z-10">
                {/* Close button and Logo on same line */}
                <div className="flex items-center justify-between mb-6">
                  <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setTransactionSheetOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <img src={wordmarkLogo} alt="Virality" className="h-12" />
                  <div className="w-8" />
                </div>

                {/* Icon */}
                

                {/* Type Badge */}
                

                {/* Amount */}
                <div className="text-center mb-2">
                  {selectedTransaction.type === 'withdrawal' ? <>
                      <div className="flex items-center justify-center mb-3">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Check className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      <p className="text-muted-foreground font-semibold tracking-tight" style={{
                  fontFamily: 'Instrument Sans, sans-serif',
                  letterSpacing: '-0.5px'
                }}>
                        Your ${selectedTransaction.amount.toFixed(2)} is on its way!
                      </p>
                    </> : <div className={`text-5xl font-bold ${selectedTransaction.type === 'earning' ? 'text-green-500' : 'text-red-500'}`} style={{
                fontFamily: 'Chakra Petch, sans-serif',
                letterSpacing: '-1px'
              }}>
                      {selectedTransaction.type === 'earning' ? '+' : '-'}${selectedTransaction.amount.toFixed(2)}
                    </div>}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 p-6 space-y-6">
                {/* Date and Status */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a]/30">
                  <span className="text-sm text-muted-foreground">
                    {format(selectedTransaction.date, 'MMMM dd yyyy, hh:mm a')}
                  </span>
                  {selectedTransaction.status && <Badge variant={selectedTransaction.status === 'completed' ? 'default' : selectedTransaction.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                      {selectedTransaction.status}
                    </Badge>}
                </div>

                {/* Transaction Metadata - Account & Views */}
                {selectedTransaction.type === 'earning' && selectedTransaction.metadata && (selectedTransaction.metadata.account_username || selectedTransaction.metadata.views !== undefined) && <div className="p-4 rounded-lg border border-border bg-[#1a1a1a]/30">
                    <div className="space-y-3">
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
                        {selectedTransaction.type === 'earning' ? 'Earnings' : 'Withdrawal'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className={`text-sm font-bold ${selectedTransaction.type === 'earning' ? 'text-green-500' : 'text-red-500'}`}>
                        {selectedTransaction.type === 'earning' ? '+' : '-'}${selectedTransaction.amount.toFixed(2)}
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
                          {selectedTransaction.destination}
                        </span>
                      </div>}
                  </div>
                </div>

                {/* Payout Method Details */}
                {selectedTransaction.type === 'withdrawal' && selectedTransaction.metadata && <>
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
                            <span className="text-sm text-muted-foreground">Address</span>
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
                        
                        {/* Display PayPal email if available */}
                        {selectedTransaction.metadata.payoutDetails?.email && <div className="flex justify-between items-start p-3 bg-muted/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">Email</span>
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
                  </>}

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
    </div>;
}