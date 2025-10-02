import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Wallet as WalletIcon, Plus, Trash2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
              <WalletIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              ${wallet?.balance?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Minimum payout: $50.00
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${wallet?.total_earned?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time earnings
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Withdrawn</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${wallet?.total_withdrawn?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully paid out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Section */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Payout Methods</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage how you receive your earnings
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setDialogOpen(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Method
              </Button>
              <Button 
                onClick={handleRequestPayout}
                size="sm"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Request Payout
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payoutMethods.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <WalletIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No payout methods added yet</p>
              <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {payoutMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-border/80 transition-colors"
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
