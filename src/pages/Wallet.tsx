import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import PayoutMethodDialog from "@/components/PayoutMethodDialog";
import { SiPaypal } from "react-icons/si";

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

export default function Wallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock earnings data for graphs
  const earningsData = [
    { month: "Jan", earnings: 120 },
    { month: "Feb", earnings: 250 },
    { month: "Mar", earnings: 380 },
    { month: "Apr", earnings: 420 },
    { month: "May", earnings: 550 },
    { month: "Jun", earnings: 680 },
  ];

  const weeklyData = [
    { day: "Mon", earnings: 45 },
    { day: "Tue", earnings: 78 },
    { day: "Wed", earnings: 52 },
    { day: "Thu", earnings: 95 },
    { day: "Fri", earnings: 110 },
    { day: "Sat", earnings: 88 },
    { day: "Sun", earnings: 62 },
  ];

  useEffect(() => {
    checkAuth();
    fetchWallet();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
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
      
      // Parse payout methods if they exist
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

    const newMethod = {
      method,
      details,
    };

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
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header with Request Payout */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Wallet & Earnings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your earnings and payout methods
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={handleRequestPayout}
          className="h-12 px-6"
        >
          <DollarSign className="mr-2 h-5 w-5" />
          Request Payout
        </Button>
      </div>

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
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${wallet?.total_earned?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-success mt-2">
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
            <CardTitle>Monthly Earnings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={earningsData}>
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
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
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
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
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
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar 
                  dataKey="earnings" 
                  fill="hsl(var(--primary))" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
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
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Method
          </Button>
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
                        <SiPaypal className="h-5 w-5 text-primary" />
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
