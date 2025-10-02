import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2, CreditCard, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PayoutMethodDialog from "@/components/PayoutMethodDialog";
import { Separator } from "@/components/ui/separator";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { format, subDays, subMonths, subYears, startOfWeek } from "date-fns";

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

type TimePeriod = '1W' | '1M' | '3M' | '1Y' | 'TW';

export function WalletTab() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsDataPoint[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1M');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWallet();
    fetchEarningsData();
  }, [timePeriod]);

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

    const { data: submissions } = await supabase
      .from("campaign_submissions")
      .select("earnings, submitted_at")
      .eq("creator_id", session.user.id)
      .gte("submitted_at", start.toISOString())
      .lte("submitted_at", end.toISOString())
      .order("submitted_at", { ascending: true });

    if (submissions && submissions.length > 0) {
      // Aggregate earnings by date
      const dataMap = new Map<string, number>();
      
      submissions.forEach((sub) => {
        const date = format(new Date(sub.submitted_at), 'MMM dd');
        const current = dataMap.get(date) || 0;
        dataMap.set(date, current + (Number(sub.earnings) || 0));
      });

      const chartData = Array.from(dataMap.entries()).map(([date, amount]) => ({
        date,
        amount: Number(amount.toFixed(2))
      }));

      setEarningsData(chartData);
    } else {
      // Generate empty data points for the time period
      const days = timePeriod === '1W' || timePeriod === 'TW' ? 7 : 
                   timePeriod === '1M' ? 30 : 
                   timePeriod === '3M' ? 90 : 365;
      
      const emptyData = Array.from({ length: Math.min(days, 10) }, (_, i) => ({
        date: format(subDays(end, days - i * (days / 10)), 'MMM dd'),
        amount: 0
      }));

      setEarningsData(emptyData);
    }
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

  const handleRequestPayout = () => {
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

    toast({
      title: "Payout Requested",
      description: "Your payout request has been submitted and will be processed within 3-5 business days.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading wallet...</p>
      </div>
    );
  }

  const totalEarnings = earningsData.reduce((sum, point) => sum + point.amount, 0);

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
            <div className="flex flex-col gap-1 bg-muted/30 rounded-lg p-1">
              {[
                { label: '1 Week', value: '1W' },
                { label: '1 Month', value: '1M' },
                { label: '3 Months', value: '3M' },
                { label: '1 Year', value: '1Y' },
                { label: 'This Week', value: 'TW' },
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setTimePeriod(period.value as TimePeriod)}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    timePeriod === period.value
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64">
            {earningsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#earningsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No earnings data for this period
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

      <PayoutMethodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleAddPayoutMethod}
      />
    </div>
  );
}
