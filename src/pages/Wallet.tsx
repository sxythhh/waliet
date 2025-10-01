import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Download, Wallet as WalletIcon } from "lucide-react";

interface WalletData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  payout_method: string | null;
}

export default function Wallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetchWallet();
  }, []);

  const checkAuthAndFetchWallet = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setLoading(true);
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
    }
    setLoading(false);
  };

  if (loading || !wallet) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Your Wallet
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your earnings and request payouts
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <WalletIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">${wallet.balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">Ready to withdraw</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">${wallet.total_earned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">All-time earnings</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${wallet.total_withdrawn.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">Successfully paid out</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Method */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Payout Method</CardTitle>
          <CardDescription>Configure how you want to receive payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wallet.payout_method ? (
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium capitalize">{wallet.payout_method}</p>
                  <p className="text-sm text-muted-foreground">Primary payment method</p>
                </div>
              </div>
              <Badge className="bg-success/20 text-success">Active</Badge>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No payout method configured</p>
              <Button>Add Payout Method</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Payout */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
          <CardDescription>Minimum payout amount: $50.00</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            size="lg" 
            className="w-full"
            disabled={wallet.balance < 50}
          >
            <Download className="mr-2 h-4 w-4" />
            Request Payout
          </Button>
          {wallet.balance < 50 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              You need ${(50 - wallet.balance).toFixed(2)} more to request a payout
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start submitting content to campaigns to earn money!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
