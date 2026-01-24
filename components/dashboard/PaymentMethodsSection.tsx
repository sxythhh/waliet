import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Star, Building2, Smartphone, CreditCard } from "lucide-react";
import PayoutMethodDialog from "@/components/PayoutMethodDialog";
import paypalLogo from "@/assets/paypal-logo.svg";
import walletActiveIcon from "@/assets/wallet-active.svg";

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

export function PaymentMethodsSection() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      console.error("Failed to fetch wallet data:", error);
    } else {
      setWallet(data);
      if (data?.payout_details) {
        const methods = Array.isArray(data.payout_details) 
          ? data.payout_details 
          : [data.payout_details];
        setPayoutMethods(methods.map((m: any, i: number) => ({
          id: `method-${i}`,
          method: m.method || data.payout_method,
          details: m.details || m
        })));
      }
    }
  };

  const handleAddPayoutMethod = async (method: string, details: any) => {
    const { data: { session } } = await supabase.auth.getSession();
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

    const payoutDetailsPayload = updatedMethods.map(m => ({
      method: m.method,
      details: m.details
    }));

    const { error } = await supabase
      .from("wallets")
      .update({
        payout_method: method,
        payout_details: payoutDetailsPayload
      })
      .eq("id", wallet.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to add payout method: ${error.message}`
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

    const { error } = await supabase
      .from("wallets")
      .update({
        payout_method: updatedMethods.length > 0 ? updatedMethods[0].method : null,
        payout_details: updatedMethods.length > 0 
          ? updatedMethods.map(m => ({ method: m.method, details: m.details })) 
          : null
      })
      .eq("id", wallet.id);

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
    if (methodIndex === -1 || methodIndex === 0) return;

    const selectedMethod = payoutMethods[methodIndex];

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

    const { error } = await supabase
      .from("wallets")
      .update({
        payout_method: method.method,
        payout_details: updatedMethods.map(m => ({ method: m.method, details: m.details }))
      })
      .eq("id", wallet.id);

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

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "paypal": return "PayPal";
      case "crypto": return "Crypto";
      case "bank": return "Bank";
      case "upi": return "UPI";
      case "wise": return "Wise";
      case "revolut": return "Revolut";
      case "tips": return "TIPS";
      default: return method;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "paypal": return paypalLogo;
      case "crypto": return walletActiveIcon;
      default: return null;
    }
  };

  const getMethodDetails = (method: PayoutMethod) => {
    switch (method.method) {
      case "paypal": return method.details.email;
      case "crypto": return `${method.details.address?.slice(0, 6)}...${method.details.address?.slice(-4)}`;
      case "bank": return `${method.details.bankName} - ****${method.details.accountNumber?.slice(-4)}`;
      case "wise": return method.details.email;
      case "revolut": return method.details.email;
      case "upi": return method.details.upi_id;
      case "tips": return method.details.username;
      default: return "N/A";
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        {payoutMethods.map((method, index) => {
          const isDefault = index === 0;
          const methodIcon = getMethodIcon(method.method);
          
          return (
            <div 
              key={method.id} 
              className="group relative rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] p-4 border border-border dark:border-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#e0e0e0] dark:bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  {methodIcon ? (
                    <img src={methodIcon} alt={getMethodLabel(method.method)} className="w-5 h-5" />
                  ) : method.method === 'bank' ? (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  ) : method.method === 'upi' ? (
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground dark:text-white font-inter tracking-[-0.5px]">
                      {getMethodLabel(method.method)}
                    </p>
                    {isDefault && (
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-0 font-inter tracking-[-0.4px]"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate font-inter tracking-[-0.4px]">
                    {getMethodDetails(method)}
                  </p>
                  {method.method === 'crypto' && method.details?.network && (
                    <p className="text-[10px] text-neutral-500/70 mt-0.5 uppercase font-inter tracking-[-0.4px]">
                      {method.details.network}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isDefault && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleSetDefaultMethod(method.id)} 
                      className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary flex-shrink-0"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteMethod(method.id)} 
                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Add Method Card */}
        {payoutMethods.length < 3 && (
          <button
            onClick={() => setDialogOpen(true)}
            className="group rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] hover:bg-[#e8e8e8] dark:hover:bg-[#141414] transition-colors p-4 border border-dashed border-border dark:border-border/50"
          >
            <div className="flex items-center justify-center gap-2">
              <Plus className="h-4 w-4 text-neutral-500 group-hover:text-foreground dark:group-hover:text-white transition-colors" />
              <span className="text-sm text-neutral-500 group-hover:text-foreground dark:group-hover:text-white transition-colors font-inter tracking-[-0.4px]">
                Add Method
              </span>
            </div>
          </button>
        )}
      </div>

      <PayoutMethodDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        onSave={handleAddPayoutMethod}
        currentMethodCount={payoutMethods.length}
      />
    </div>
  );
}
