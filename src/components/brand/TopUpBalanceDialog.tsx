import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from "lucide-react";
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
      const { data: boostData, error: boostError } = await supabase
        .from("bounty_campaigns")
        .select("brand_id")
        .eq("id", boostId)
        .single();

      if (boostError || !boostData) {
        console.error("Error fetching boost:", boostError);
        return;
      }

      const { data, error } = await supabase.functions.invoke("get-brand-balance", {
        body: { brand_id: boostData.brand_id },
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
      
      const { data: boostData, error: boostError } = await supabase
        .from("bounty_campaigns")
        .select("brand_id, budget")
        .eq("id", boostId)
        .single();

      if (boostError || !boostData) {
        throw new Error("Failed to fetch boost data");
      }

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
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px] text-lg">
              Transfer to Boost
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">
              Move funds from your Virality wallet
            </p>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Available Balance */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] uppercase">Available Balance</p>
            {loadingBalance ? (
              <div className="h-9 w-32 bg-muted/50 animate-pulse rounded" />
            ) : (
              <p className="text-3xl font-semibold font-inter tracking-[-1px]">
                {formatCurrency(viralityBalance)}
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-inter tracking-[-0.3px] uppercase">
              Transfer Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 h-12 font-inter tracking-[-0.3px] text-lg bg-muted/30"
              />
            </div>
          </div>

          {/* Validation Warning */}
          {exceedsBalance && parsedAmount > 0 && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/5 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="font-inter tracking-[-0.3px]">Exceeds available balance</span>
            </div>
          )}

          {/* Summary */}
          {parsedAmount > 0 && !exceedsBalance && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">New boost balance</span>
                <span className="text-sm font-medium text-emerald-500 font-inter tracking-[-0.3px]">
                  {formatCurrency(currentBalance + parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">Remaining balance</span>
                <span className="text-sm font-medium font-inter tracking-[-0.3px]">
                  {formatCurrency(viralityBalance - parsedAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 font-inter tracking-[-0.5px] h-11"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={loading || parsedAmount <= 0 || exceedsBalance || loadingBalance}
            className="flex-1 font-inter tracking-[-0.5px] h-11"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              "Transfer"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
