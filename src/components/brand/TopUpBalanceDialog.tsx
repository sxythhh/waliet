import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, AlertCircle, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TopUpBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boostId: string;
  boostTitle: string;
  currentBalance: number;
  onSuccess?: () => void;
}

export function TopUpBalanceDialog({
  open,
  onOpenChange,
  boostId,
  boostTitle,
  currentBalance,
  onSuccess,
}: TopUpBalanceDialogProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [viralityBalance, setViralityBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  useEffect(() => {
    if (open) {
      fetchViralityBalance();
    }
  }, [open, boostId]);

  const fetchViralityBalance = async () => {
    setLoadingBalance(true);
    try {
      // Get the boost to find the brand_id
      const { data: boostData, error: boostError } = await supabase
        .from("bounty_campaigns")
        .select("brand_id")
        .eq("id", boostId)
        .single();

      if (boostError || !boostData) {
        console.error("Error fetching boost:", boostError);
        return;
      }

      // Get the brand's virality balance
      const { data, error } = await supabase.functions.invoke("get-brand-balance", {
        body: { brandId: boostData.brand_id },
      });

      if (error) throw error;
      setViralityBalance(data?.virality_balance || 0);
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleTransfer = async () => {
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (parsedAmount > viralityBalance) {
      toast.error("Insufficient Virality balance");
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Get the boost to find the brand_id
      const { data: boostData, error: boostError } = await supabase
        .from("bounty_campaigns")
        .select("brand_id, budget")
        .eq("id", boostId)
        .single();

      if (boostError || !boostData) {
        throw new Error("Failed to fetch boost data");
      }

      // Create the transaction record (debit from virality balance)
      const { error: transactionError } = await supabase
        .from("brand_wallet_transactions")
        .insert({
          brand_id: boostData.brand_id,
          boost_id: boostId,
          type: "boost_allocation",
          amount: -parsedAmount,
          status: "completed",
          description: `Funds allocated to boost: ${boostTitle}`,
          created_by: userData?.user?.id,
        });

      if (transactionError) throw transactionError;

      // Update the boost budget
      const { error: updateError } = await supabase
        .from("bounty_campaigns")
        .update({
          budget: (boostData.budget || 0) + parsedAmount,
        })
        .eq("id", boostId);

      if (updateError) throw updateError;

      toast.success(`${formatCurrency(parsedAmount)} transferred to boost`);
      onOpenChange(false);
      setAmount("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error transferring funds:", error);
      toast.error(error.message || "Failed to transfer funds");
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const exceedsBalance = parsedAmount > viralityBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px] flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Transfer to Boost
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Virality Balance */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">Virality Balance</p>
            </div>
            {loadingBalance ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-semibold font-inter tracking-[-0.5px]">
                {formatCurrency(viralityBalance)}
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium font-inter tracking-[-0.3px]">
              Amount to Transfer
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 font-inter tracking-[-0.3px] text-lg"
              />
            </div>
          </div>

          {/* Validation Warning */}
          {exceedsBalance && parsedAmount > 0 && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="font-inter tracking-[-0.3px]">Amount exceeds Virality balance</span>
            </div>
          )}

          {/* Summary */}
          {parsedAmount > 0 && !exceedsBalance && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-inter tracking-[-0.3px]">Transferring</span>
                <span className="font-medium font-inter tracking-[-0.3px]">{formatCurrency(parsedAmount)}</span>
              </div>
              <div className="border-t border-border" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-inter tracking-[-0.3px]">New Boost Balance</span>
                <span className="font-medium text-emerald-500 font-inter tracking-[-0.3px]">
                  {formatCurrency(currentBalance + parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-inter tracking-[-0.3px]">Remaining Virality Balance</span>
                <span className="font-medium font-inter tracking-[-0.3px]">
                  {formatCurrency(viralityBalance - parsedAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 font-inter tracking-[-0.5px]"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={loading || parsedAmount <= 0 || exceedsBalance || loadingBalance}
              className="flex-1 font-inter tracking-[-0.5px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Transfer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
