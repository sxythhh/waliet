import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import PayoutMethodDialog from "@/components/PayoutMethodDialog";

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

export function WalletTab() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWallet();
    fetchEarningsData();
  }, []);

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

  const fetchEarningsData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: submissions } = await supabase
      .from("campaign_submissions")
      .select("earnings, submitted_at")
      .eq("creator_id", session.user.id)
      .order("submitted_at", { ascending: true });

    if (submissions && submissions.length > 0) {
      const monthlyMap = new Map();
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        monthlyMap.set(monthKey, 0);
      }

      submissions.forEach((sub) => {
        const date = new Date(sub.submitted_at);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        if (monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, monthlyMap.get(monthKey) + (Number(sub.earnings) || 0));
        }
      });

      const monthly = Array.from(monthlyMap.entries()).map(([month, earnings]) => ({
        month,
        earnings: Number(earnings.toFixed(2)),
      }));

      setMonthlyData(monthly);

      const weeklyMap = new Map();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayKey = days[date.getDay()];
        weeklyMap.set(dayKey, 0);
      }

      submissions.forEach((sub) => {
        const date = new Date(sub.submitted_at);
        const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
          const dayKey = days[date.getDay()];
          weeklyMap.set(dayKey, weeklyMap.get(dayKey) + (Number(sub.earnings) || 0));
        }
      });

      const weekly = Array.from(weeklyMap.entries()).map(([day, earnings]) => ({
        day,
        earnings: Number(earnings.toFixed(2)),
      }));

      setWeeklyData(weekly);
    } else {
      setMonthlyData([]);
      setWeeklyData([]);
    }
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

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <WalletIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              ${wallet?.balance?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Minimum payout: $50.00
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              ${wallet?.total_earned?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All-time earnings
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${wallet?.total_withdrawn?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Successfully paid out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Monthly Earnings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No earnings data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="day" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar 
                    dataKey="earnings" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No earnings data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payout Methods */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payout Methods</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage how you receive your earnings
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Method
            </Button>
            <Button 
              onClick={handleRequestPayout}
              variant="default"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Request Payout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payoutMethods.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <WalletIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No payout methods added yet</p>
              <Button onClick={() => setDialogOpen(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {payoutMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50"
                >
                  <div className="flex items-center gap-4">
                    {method.method === "paypal" ? (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <WalletIcon className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {method.method === "paypal" ? "PayPal" : "Crypto"}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {method.method === "paypal" 
                            ? "Email" 
                            : method.details.network?.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
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
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
    </div>
  );
}
