import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TopUpBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boostId: string;
  boostTitle: string;
  currentBalance: number;
}

const PRESET_AMOUNTS = [100, 500, 1000, 2500];

export function TopUpBalanceDialog({
  open,
  onOpenChange,
  boostId,
  boostTitle,
  currentBalance,
}: TopUpBalanceDialogProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getFinalAmount = () => {
    if (customAmount) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedAmount || 0;
  };

  const handleTopUp = async () => {
    const amount = getFinalAmount();
    
    if (amount < 100) {
      toast.error("Minimum top-up amount is $100");
      return;
    }

    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to continue");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-boost-topup", {
        body: { boostId, amount },
      });

      if (error) {
        throw error;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Top-up error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">Add Funds to Boost</DialogTitle>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            Add funds to "{boostTitle}" boost campaign.
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Processing fees notice */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-500 font-inter tracking-[-0.3px]">Processing fees</p>
                <p className="text-sm text-amber-500/80 font-inter tracking-[-0.3px]">
                  Cards incur Stripe's 2.9% + $0.30 fee per top-up.
                </p>
              </div>
            </div>
          </div>

          {/* Current Balance */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium font-inter tracking-[-0.3px]">Current Balance</span>
            </div>
            <span className="text-lg font-semibold font-inter tracking-[-0.5px]">
              ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Amount Selection */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium font-inter tracking-[-0.3px]">Select amount</h3>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Pick a quick amount or enter a custom value in USD.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handlePresetClick(amount)}
                  className={`py-3 px-4 rounded-full text-sm font-medium font-inter tracking-[-0.3px] border transition-all ${
                    selectedAmount === amount
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                Custom amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="100"
                  step="0.01"
                  placeholder="Enter amount (min $100)"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="pl-7 font-inter tracking-[-0.3px]"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 font-inter tracking-[-0.5px]"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 font-inter tracking-[-0.5px]"
              onClick={handleTopUp}
              disabled={loading || getFinalAmount() < 100}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Add $${getFinalAmount().toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
