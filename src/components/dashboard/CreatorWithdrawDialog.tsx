import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ethereumLogo from "@/assets/ethereum-logo.png";
import optimismLogo from "@/assets/optimism-logo.png";
import solanaLogo from "@/assets/solana-logo.png";
import polygonLogo from "@/assets/polygon-logo.png";

interface PayoutMethod {
  id: string;
  method: string;
  details: any;
}

interface CreatorWithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatorWithdrawDialog({ open, onOpenChange, onSuccess }: CreatorWithdrawDialogProps) {
  const [wallet, setWallet] = useState<{ id: string; balance: number; total_withdrawn: number } | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    // Fetch wallet with payout details
    const { data: walletData } = await supabase
      .from("wallets")
      .select("id, balance, total_withdrawn, payout_method, payout_details")
      .eq("user_id", session.user.id)
      .single();

    if (walletData) {
      setWallet(walletData);
      setPayoutAmount(walletData.balance.toString());
      
      // Extract payout methods from wallet's payout_details array
      const payoutDetails = walletData.payout_details as Array<{ method: string; details: any }> | null;
      if (payoutDetails && Array.isArray(payoutDetails) && payoutDetails.length > 0) {
        const methods: PayoutMethod[] = payoutDetails.map((item, index) => ({
          id: `method-${index}`,
          method: item.method,
          details: item.details
        }));
        setPayoutMethods(methods);
        setSelectedPayoutMethod(methods[0].id);
      }
    }

    // Fetch pending withdrawals
    const { data: payoutRequests } = await supabase
      .from("payout_requests")
      .select("amount")
      .eq("user_id", session.user.id)
      .in("status", ["pending", "in_transit"]);

    if (payoutRequests) {
      const totalPending = payoutRequests.reduce((sum, req) => sum + (req.amount || 0), 0);
      setPendingWithdrawals(totalPending);
    }

    setLoading(false);
  };

  const handleConfirmPayout = async () => {
    if (isSubmitting) return;

    if (!wallet || !payoutAmount || Number(payoutAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount"
      });
      return;
    }

    const amount = Number(payoutAmount);
    const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
    if (!selectedMethod) return;

    // Block UPI withdrawals
    if (selectedMethod.method === 'upi') {
      toast({
        variant: "destructive",
        title: "Temporarily Disabled",
        description: "UPI payouts are temporarily disabled. Please use another payment method."
      });
      return;
    }

    // Bank minimum is $250
    const minimumAmount = selectedMethod.method === 'bank' ? 250 : 20;
    if (amount < minimumAmount) {
      toast({
        variant: "destructive",
        title: "Minimum Amount",
        description: `Minimum payout amount is $${minimumAmount}${selectedMethod.method === 'bank' ? ' for bank transfers' : ''}`
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsSubmitting(true);

    // Check for existing pending/in-transit withdrawal requests
    const { data: existingRequests, error: checkError } = await supabase
      .from("payout_requests")
      .select("id")
      .eq("user_id", session.user.id)
      .in("status", ["pending", "in_transit"]);

    if (checkError) {
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify withdrawal status"
      });
      return;
    }

    if (existingRequests && existingRequests.length > 0) {
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Pending Withdrawal Exists",
        description: "You already have a pending withdrawal request. Please wait for it to be processed before requesting another."
      });
      return;
    }

    try {
      const balance_before = wallet.balance;
      const balance_after = wallet.balance - amount;

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
          amount: -amount,
          type: 'withdrawal',
          status: 'pending',
          description: `Withdrawal to ${selectedMethod.method === 'paypal' ? 'PayPal' : selectedMethod.method === 'crypto' ? 'Crypto' : selectedMethod.method}`,
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
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance: wallet.balance - amount,
          total_withdrawn: wallet.total_withdrawn + amount
        })
        .eq("id", wallet.id);

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

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit payout request"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodLabel = (method: PayoutMethod) => {
    switch (method.method) {
      case "paypal": return "PayPal";
      case "crypto": return "Crypto";
      case "bank": return "Bank";
      case "upi": return "UPI (Disabled)";
      case "wise": return "Wise";
      case "revolut": return "Revolut";
      case "tips": return "TIPS";
      default: return method.method;
    }
  };

  const getMethodDetails = (method: PayoutMethod) => {
    switch (method.method) {
      case "paypal": return method.details.email;
      case "crypto": return `${method.details.address?.slice(0, 8)}...${method.details.address?.slice(-6)}`;
      case "bank": return method.details.bankName;
      case "upi": return method.details.upi_id;
      case "wise": return method.details.email;
      case "revolut": return method.details.email;
      case "tips": return method.details.username;
      default: return "N/A";
    }
  };

  const getNetworkLogo = (method: PayoutMethod) => {
    if (method.method !== "crypto") return null;
    const network = method.details?.network?.toLowerCase();
    if (network === 'ethereum') return ethereumLogo;
    if (network === 'optimism') return optimismLogo;
    if (network === 'solana') return solanaLogo;
    if (network === 'polygon') return polygonLogo;
    return null;
  };

  const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
  const minimumAmount = selectedMethod?.method === 'bank' ? 250 : 20;
  const amounts = selectedMethod?.method === 'bank' ? [250, 500, 1000] : [20, 50, 100, 500];

  const canWithdraw = wallet && wallet.balance >= 20 && payoutMethods.length > 0 && pendingWithdrawals === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">Request Payout</DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.5px]">
            Choose the amount and payment method for your withdrawal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground font-inter tracking-[-0.5px]">Loading...</div>
        ) : !wallet || wallet.balance < 20 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground font-inter tracking-[-0.5px]">Minimum balance of $20 required to withdraw.</p>
            <p className="text-sm text-muted-foreground mt-2 font-inter tracking-[-0.5px]">Current balance: ${wallet?.balance?.toFixed(2) || '0.00'}</p>
          </div>
        ) : payoutMethods.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground font-inter tracking-[-0.5px]">Please add a payout method first.</p>
          </div>
        ) : pendingWithdrawals > 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground font-inter tracking-[-0.5px]">You have a pending withdrawal of ${pendingWithdrawals.toFixed(2)}.</p>
            <p className="text-sm text-muted-foreground mt-2 font-inter tracking-[-0.5px]">Please wait for it to be processed.</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payout-amount" className="font-inter tracking-[-0.5px]">Amount ($)</Label>
              <Input
                id="payout-amount"
                type="number"
                min={minimumAmount}
                step="0.01"
                max={wallet?.balance || 0}
                placeholder={minimumAmount.toString() + '.00'}
                value={payoutAmount}
                onChange={e => setPayoutAmount(e.target.value.replace(',', '.'))}
                className="bg-muted border-transparent placeholder:text-muted-foreground h-14 text-lg font-medium focus-visible:ring-primary/50 font-inter tracking-[-0.5px]"
              />
              <div className="flex gap-2 flex-wrap">
                {amounts.map(amount => (
                  <Button
                    key={amount}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPayoutAmount(amount.toString())}
                    disabled={wallet?.balance ? wallet.balance < amount : true}
                    className="bg-muted hover:bg-accent font-inter tracking-[-0.5px]"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Minimum: ${minimumAmount}.00 • Available: ${wallet?.balance?.toFixed(2) || "0.00"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-method" className="font-inter tracking-[-0.5px]">Payment Method</Label>
              <Select value={selectedPayoutMethod} onValueChange={setSelectedPayoutMethod}>
                <SelectTrigger id="payout-method" className="bg-muted border-transparent h-14 text-lg font-inter tracking-[-0.5px]">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {payoutMethods.map(method => {
                    const networkLogo = getNetworkLogo(method);
                    return (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2 font-inter tracking-[-0.5px]">
                          {networkLogo && <img src={networkLogo} alt="Network logo" className="h-4 w-4" />}
                          <span>{getMethodLabel(method)} - {getMethodDetails(method)}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg text-sm bg-neutral-900/0">
              {selectedMethod?.method === 'upi' ? (
                <>
                  <p className="text-destructive font-medium font-inter tracking-[-0.5px]">UPI payouts are temporarily disabled</p>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Please select another payment method</p>
                </>
              ) : selectedMethod?.method === 'bank' ? (
                <>
                  <p className="text-muted-foreground font-inter tracking-[-0.5px]">3-5 business day wait time</p>
                  <p className="text-xs text-muted-foreground mb-2 font-inter tracking-[-0.5px]">Minimum withdrawal: $250</p>
                  <p className="font-medium font-inter tracking-[-0.5px]">$1 + 0.75% fee</p>
                </>
              ) : selectedMethod?.method === 'paypal' ? (
                <p className="text-muted-foreground font-inter tracking-[-0.5px]">24h wait time</p>
              ) : (
                <>
                  <p className="text-muted-foreground font-inter tracking-[-0.5px]">2-3 business day wait time</p>
                  <p className="text-xs text-muted-foreground mb-2 font-inter tracking-[-0.5px]">(Payouts will not be operated on Saturday & Sunday)</p>
                  <p className="font-medium font-inter tracking-[-0.5px]">$1 + 0.75% fee</p>
                </>
              )}
            </div>

            {/* Fee Breakdown */}
            {payoutAmount && (() => {
              const amount = parseFloat(payoutAmount);
              const isPayPal = selectedMethod?.method === 'paypal';
              const isUpi = selectedMethod?.method === 'upi';
              const isBank = selectedMethod?.method === 'bank';
              const minAmount = isBank ? 250 : 20;

              if (isPayPal || isUpi || amount < minAmount) return null;

              const percentageFee = amount * 0.0075;
              const netAmount = amount - percentageFee - 1;
              const feeAmount = percentageFee + 1;

              return (
                <div className="p-4 bg-card rounded-lg border border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-inter tracking-[-0.5px]">Withdrawal amount</span>
                    <span className="font-medium font-inter tracking-[-0.5px]">${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-inter tracking-[-0.5px]">Processing fee</span>
                    <span className="font-medium text-red-400 font-inter tracking-[-0.5px]">-${feeAmount.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="font-semibold font-inter tracking-[-0.5px]">You'll receive</span>
                    <span className="font-bold text-lg text-primary font-inter tracking-[-0.5px]">${netAmount.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <DialogFooter className="gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="font-inter tracking-[-0.5px] border-0 hover:bg-destructive/10 hover:text-destructive"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPayout}
            disabled={!canWithdraw || isSubmitting || selectedMethod?.method === 'upi'}
            className="font-inter tracking-[-0.5px]"
          >
            {isSubmitting ? 'Processing...' : 'Request Payout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}