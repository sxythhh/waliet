import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2, CreditCard, Clock, CheckCircle, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PayoutMethodDialog from "@/components/PayoutMethodDialog";
import { Separator } from "@/components/ui/separator";

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

interface Transaction {
  id: string;
  amount: number;
  type: 'earning' | 'payout';
  status: 'completed' | 'pending' | 'processing';
  date: string;
  campaign?: string;
}

export function WalletTab() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Mock transactions for demo
  const recentTransactions: Transaction[] = [
    { id: '1', amount: 125.50, type: 'earning', status: 'completed', date: '2025-10-01', campaign: 'Summer Campaign' },
    { id: '2', amount: 200.00, type: 'payout', status: 'completed', date: '2025-09-28' },
    { id: '3', amount: 89.25, type: 'earning', status: 'pending', date: '2025-09-25', campaign: 'Brand X Launch' },
  ];

  useEffect(() => {
    fetchWallet();
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

  const pendingBalance = 89.25; // Mock pending earnings
  const availableBalance = wallet?.balance || 0;

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

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-0 col-span-2">
          <CardContent className="pt-6">
            <div className="space-y-1 mb-4">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-4xl font-bold tracking-tight">${availableBalance.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Pending: ${pendingBalance.toFixed(2)}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>Min. payout: $50.00</span>
            </div>
          </CardContent>
        </Card>

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout Methods */}
        <Card className="bg-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Payout Methods</CardTitle>
            <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add
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

        {/* Recent Transactions */}
        <Card className="bg-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    transaction.type === 'earning' 
                      ? 'bg-success/10' 
                      : 'bg-muted'
                  }`}>
                    {transaction.type === 'earning' ? (
                      <TrendingUp className="h-5 w-5 text-success" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {transaction.type === 'earning' ? 'Earning' : 'Payout'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.campaign || transaction.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    transaction.type === 'earning' ? 'text-success' : 'text-foreground'
                  }`}>
                    {transaction.type === 'earning' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {transaction.status === 'completed' ? (
                      <CheckCircle className="h-3 w-3 text-success" />
                    ) : (
                      <Clock className="h-3 w-3 text-warning" />
                    )}
                    <span className="text-xs text-muted-foreground capitalize">
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <PayoutMethodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleAddPayoutMethod}
      />
    </div>
  );
}
