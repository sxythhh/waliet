import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2, CreditCard, ArrowUpRight, ChevronDown, ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PayoutMethodDialog from "@/components/PayoutMethodDialog";
import { Separator } from "@/components/ui/separator";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, BarChart } from "recharts";
import { format, subDays, subMonths, subYears, startOfWeek } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  amount: number;
}

interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal';
  amount: number;
  date: Date;
  destination?: string;
  source?: string;
  status?: string;
}

type TimePeriod = '1W' | '1M' | '3M' | '1Y' | 'TW';

export function WalletTab() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsDataPoint[]>([]);
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalDataPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1M');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchWallet();
  }, []);

  useEffect(() => {
    if (wallet) {
      fetchEarningsData();
      fetchWithdrawalData();
      fetchTransactions();
    }
  }, [timePeriod, wallet]);

  const getDateRange = () => {
    const now = new Date();
    switch (timePeriod) {
      case '1W':
        return { start: subDays(now, 7), end: now };
      case '1M':
        return { start: subMonths(now, 1), end: now };
      case '3M':
        return { start: subMonths(now, 3), end: now };
      case '1Y':
        return { start: subYears(now, 1), end: now };
      case 'TW':
        return { start: startOfWeek(now), end: now };
      default:
        return { start: subMonths(now, 1), end: now };
    }
  };

  const fetchEarningsData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { start, end } = getDateRange();

    // Get all transactions from the beginning
    const { data: submissions } = await supabase
      .from("campaign_submissions")
      .select("earnings, submitted_at")
      .eq("creator_id", session.user.id)
      .order("submitted_at", { ascending: true });

    const { data: payouts } = await supabase
      .from("payout_requests")
      .select("amount, requested_at, status")
      .eq("user_id", session.user.id)
      .in("status", ["completed"])
      .order("requested_at", { ascending: true });

    // Generate date points for every day in the selected period
    const days = timePeriod === '1W' || timePeriod === 'TW' ? 7 : 
                 timePeriod === '1M' ? 30 : 
                 timePeriod === '3M' ? 90 : 365;
    
    const dataPoints: EarningsDataPoint[] = [];

    // Create data point for each day
    for (let i = 0; i <= days; i++) {
      const currentDate = subDays(end, days - i);
      const dateStr = format(currentDate, 'MMM dd');
      
      // Calculate cumulative balance up to this date
      let balanceAtDate = 0;
      
      // Add all earnings up to and including this date
      if (submissions) {
        submissions.forEach((sub) => {
          const subDate = new Date(sub.submitted_at);
          if (subDate <= currentDate) {
            balanceAtDate += Number(sub.earnings) || 0;
          }
        });
      }

      // Subtract all completed payouts up to and including this date
      if (payouts) {
        payouts.forEach((payout) => {
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { start, end } = getDateRange();

    const { data: payouts } = await supabase
      .from("payout_requests")
      .select("amount, requested_at, status")
      .eq("user_id", session.user.id)
      .gte("requested_at", start.toISOString())
      .lte("requested_at", end.toISOString())
      .order("requested_at", { ascending: true });

    const days = timePeriod === '1W' || timePeriod === 'TW' ? 7 : 
                 timePeriod === '1M' ? 30 : 
                 timePeriod === '3M' ? 90 : 365;
    
    const dataPoints: WithdrawalDataPoint[] = [];

    for (let i = 0; i <= days; i++) {
      const currentDate = subDays(end, days - i);
      const dateStr = format(currentDate, 'MMM dd');
      
      let withdrawalAmount = 0;
      
      if (payouts) {
        payouts.forEach((payout) => {
          const payoutDate = new Date(payout.requested_at);
          if (format(payoutDate, 'MMM dd') === dateStr) {
            withdrawalAmount += Number(payout.amount) || 0;
          }
        });
      }

      dataPoints.push({
        date: dateStr,
        amount: Number(withdrawalAmount.toFixed(2))
      });
    }

    setWithdrawalData(dataPoints);
  };

  const fetchTransactions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: walletTransactions } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const allTransactions: Transaction[] = [];

    if (walletTransactions) {
      walletTransactions.forEach((txn) => {
        const metadata = txn.metadata as any;
        let source = '';
        let destination = '';

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
            destination = metadata?.payout_method === 'paypal' 
              ? 'PayPal' 
              : `Crypto (${metadata?.network || 'ETH'})`;
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
          status: txn.status
        });
      });
    }

    setTransactions(allTransactions);
  };

  const fetchWallet = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return;

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch wallet data",
      });
    } else {
      setWallet(data);
      
      if (data?.payout_details) {
        const methods = Array.isArray(data.payout_details) 
          ? data.payout_details 
          : [data.payout_details];
        setPayoutMethods(methods.map((m: any, i: number) => ({
          id: `method-${i}`,
          method: m.method || data.payout_method,
          details: m.details || m,
        })));
      }
    }
    setLoading(false);
  };

  const handleAddPayoutMethod = async (method: string, details: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !wallet) return;

    const updatedMethods = [...payoutMethods, { 
      id: `method-${Date.now()}`, 
      method, 
      details 
    }];

    const { error } = await supabase
      .from("wallets")
      .update({
        payout_method: method,
        payout_details: updatedMethods.map(m => ({ method: m.method, details: m.details })),
      })
      .eq("id", wallet.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add payout method",
      });
    } else {
      toast({
        title: "Success",
        description: "Payout method added successfully",
      });
      fetchWallet();
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (!wallet) return;

    const updatedMethods = payoutMethods.filter(m => m.id !== methodId);

    const { error } = await supabase
      .from("wallets")
      .update({
        payout_method: updatedMethods.length > 0 ? updatedMethods[0].method : null,
        payout_details: updatedMethods.length > 0 
          ? updatedMethods.map(m => ({ method: m.method, details: m.details }))
          : null,
      })
      .eq("id", wallet.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove payout method",
      });
    } else {
      toast({
        title: "Success",
        description: "Payout method removed",
      });
      fetchWallet();
    }
  };

  const handleRequestPayout = async () => {
    if (!wallet?.balance || wallet.balance < 50) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Minimum payout amount is $50",
      });
      return;
    }

    if (payoutMethods.length === 0) {
      toast({
        variant: "destructive",
        title: "No Payout Method",
        description: "Please add a payout method first",
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
        description: "Please enter a valid amount",
      });
      return;
    }

    const amount = Number(payoutAmount);

    if (amount < 50) {
      toast({
        variant: "destructive",
        title: "Minimum Amount",
        description: "Minimum payout amount is $50",
      });
      return;
    }

    if (amount > wallet.balance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Amount exceeds available balance",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
    if (!selectedMethod) return;

    try {
      // Create payout request
      const { error: payoutError } = await supabase
        .from("payout_requests")
        .insert({
          user_id: session.user.id,
          amount: amount,
          payout_method: selectedMethod.method,
          payout_details: selectedMethod.details,
          status: 'pending'
        });

      if (payoutError) throw payoutError;

      // Create wallet transaction
      const { error: txnError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: session.user.id,
          amount: amount,
          type: 'withdrawal',
          status: 'pending',
          description: `Withdrawal to ${selectedMethod.method === 'paypal' ? 'PayPal' : 'Crypto'}`,
          metadata: {
            payout_method: selectedMethod.method,
            network: selectedMethod.details.network || null
          },
          created_by: session.user.id,
        });

      if (txnError) throw txnError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance: wallet.balance - amount,
          total_withdrawn: wallet.total_withdrawn + amount
        })
        .eq("id", wallet.id);

      if (walletError) throw walletError;

      toast({
        title: "Payout Requested",
        description: "Your payout request has been submitted and will be processed within 3-5 business days.",
      });

      setPayoutDialogOpen(false);
      fetchWallet();
      fetchTransactions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit payout request",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading wallet...</p>
      </div>
    );
  }

  const totalEarnings = earningsData.reduce((sum, point) => sum + point.amount, 0);

  const timePeriodLabels: Record<TimePeriod, string> = {
    '1W': '1 Week',
    '1M': '1 Month',
    '3M': '3 Months',
    '1Y': '1 Year',
    'TW': 'This Week'
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Main Balance */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Wallet</h2>
          <p className="text-muted-foreground mt-1">Manage your earnings and payouts</p>
        </div>
        <Button onClick={handleRequestPayout} size="lg" className="gap-2">
          <ArrowUpRight className="h-4 w-4" />
          Request Payout
        </Button>
      </div>

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
                <Button variant="outline" className="gap-2">
                  {timePeriodLabels[timePeriod]}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card z-50">
                {Object.entries(timePeriodLabels).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setTimePeriod(value as TimePeriod)}
                    className={timePeriod === value ? "bg-muted" : ""}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-64">
            {earningsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#60a5fa" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#93c5fd" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    style={{ opacity: 0.6 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                    style={{ opacity: 0.6 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#0C0C0C",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      fontFamily: "Chakra Petch, sans-serif",
                      letterSpacing: "-0.5px",
                    }}
                    labelStyle={{
                      color: "#ffffff",
                      fontWeight: 600,
                      marginBottom: "4px",
                      fontFamily: "Chakra Petch, sans-serif",
                      letterSpacing: "-0.5px",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']}
                    itemStyle={{
                      color: "#60a5fa",
                      fontFamily: "Chakra Petch, sans-serif",
                      letterSpacing: "-0.5px",
                    }}
                    cursor={{ stroke: "#333333", strokeWidth: 2 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#balanceGradient)"
                    dot={false}
                    activeDot={{ 
                      r: 6, 
                      fill: "#3b82f6",
                      stroke: "#1a1a1a",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-blue-500">${wallet?.balance?.toFixed(2) || "0.00"}</div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Available Balance</span>
            <span className="text-lg font-semibold">${wallet?.balance?.toFixed(2) || "0.00"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">${wallet?.total_earned?.toFixed(2) || "0.00"}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Withdrawn</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">${wallet?.total_withdrawn?.toFixed(2) || "0.00"}</p>
            <p className="text-xs text-muted-foreground mt-1">Total paid</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Period Earnings</p>
              <WalletIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Selected period</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Methods */}
      <Card className="bg-card border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Payout Methods</CardTitle>
          <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Method
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {payoutMethods.length === 0 ? (
            <div className="text-center py-8">
              <WalletIcon className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No payout methods</p>
              <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </div>
          ) : (
            payoutMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {method.method === "paypal" ? (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <WalletIcon className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {method.method === "paypal" ? "PayPal" : "Crypto"}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {method.method === "paypal" 
                          ? "Email" 
                          : method.details.network?.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {method.method === "paypal"
                        ? method.details.email
                        : `${method.details.address?.slice(0, 8)}...${method.details.address?.slice(-6)}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteMethod(method.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Requests Chart */}
      <Card className="bg-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {withdrawalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={withdrawalData}>
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    style={{ opacity: 0.6 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                    style={{ opacity: 0.6 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#0C0C0C",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      fontFamily: "Chakra Petch, sans-serif",
                      letterSpacing: "-0.5px",
                    }}
                    labelStyle={{
                      color: "#ffffff",
                      fontWeight: 600,
                      marginBottom: "4px",
                      fontFamily: "Chakra Petch, sans-serif",
                      letterSpacing: "-0.5px",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Withdrawn']}
                    itemStyle={{
                      color: "#ef4444",
                      fontFamily: "Chakra Petch, sans-serif",
                      letterSpacing: "-0.5px",
                    }}
                    cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="#ef4444"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No withdrawal requests in this period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`h-11 w-11 rounded-lg flex items-center justify-center border ${
                      transaction.type === 'earning' 
                        ? 'bg-green-500/5 border-green-500/20' 
                        : 'bg-red-500/5 border-red-500/20'
                    }`}>
                      {transaction.type === 'earning' ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowDownLeft className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif', letterSpacing: '-0.5px' }}>
                          {transaction.type === 'earning' ? 'Earnings' : 'Withdrawal'}
                        </p>
                        {transaction.status && (
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="text-xs capitalize">
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                        {transaction.type === 'earning' ? (
                          <>
                            <span className="truncate">{transaction.source}</span>
                            <span>→</span>
                            <span>{transaction.destination}</span>
                          </>
                        ) : (
                          <>
                            <span>To</span>
                            <span className="truncate">{transaction.destination}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground/60">
                        {format(transaction.date, 'MMM dd, yyyy • HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div 
                    className={`text-lg font-bold whitespace-nowrap ml-4 ${
                      transaction.type === 'earning' ? 'text-green-500' : 'text-red-500'
                    }`}
                    style={{ fontFamily: 'Chakra Petch, sans-serif', letterSpacing: '-0.5px' }}
                  >
                    {transaction.type === 'earning' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PayoutMethodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleAddPayoutMethod}
      />

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
              <Input
                id="payout-amount"
                type="number"
                min="50"
                step="0.01"
                max={wallet?.balance || 0}
                placeholder="50.00"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum: $50.00 • Available: ${wallet?.balance?.toFixed(2) || "0.00"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-method">Payment Method</Label>
              <Select value={selectedPayoutMethod} onValueChange={setSelectedPayoutMethod}>
                <SelectTrigger id="payout-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {payoutMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.method === "paypal" ? "PayPal" : "Crypto"} - {" "}
                      {method.method === "paypal"
                        ? method.details.email
                        : `${method.details.address?.slice(0, 8)}...${method.details.address?.slice(-6)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm">
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
    </div>
  );
}
