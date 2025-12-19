import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Loader2, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddBrandFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  currentBalance: number;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export function AddBrandFundsDialog({
  open,
  onOpenChange,
  brandId,
  currentBalance,
  onSuccess,
}: AddBrandFundsDialogProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(1000);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddFunds = async () => {
    const amount = getFinalAmount();

    if (amount < 100) {
      toast.error('Minimum top-up amount is $100');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-brand-wallet-topup', {
        body: { 
          brand_id: brandId, 
          amount,
          return_url: window.location.href,
        },
      });

      if (error) throw error;

       if (data?.needs_payment_method) {
         if (data?.setup_checkout_url) {
           toast.message('Add a payment method to continue', {
             description: 'You will be redirected to securely save a card, then you can retry your top-up.',
           });
           window.location.href = data.setup_checkout_url;
           return;
         }

         toast.error('No payment method on file. Please add a payment method first.');
         return;
       }

      if (data?.success) {
        toast.success(`Successfully added ${formatCurrency(amount)} to your wallet!`);
        onOpenChange(false);
        onSuccess?.();
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error creating top-up:', error);
      toast.error('Failed to add funds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const finalAmount = getFinalAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-[#0c0c0c] to-[#080808] border-white/[0.06] text-white max-w-[420px] p-0 gap-0 overflow-hidden">
        {/* Header with gradient accent */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <h2 className="text-lg font-medium tracking-tight text-white">Add Funds</h2>
          <p className="text-sm text-white/40 mt-0.5">Top up your wallet balance</p>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Current Balance Card */}
          <div className="relative rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] p-4 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <span className="text-xs font-medium uppercase tracking-wider text-white/30">Current Balance</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-semibold tracking-tight text-white">{formatCurrency(currentBalance)}</span>
              </div>
            </div>
          </div>

          {/* Amount Selection */}
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-wider text-white/30">Select Amount</span>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handlePresetClick(amount)}
                  className={cn(
                    "relative py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                    "border border-transparent",
                    selectedAmount === amount
                      ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border-white/[0.06]"
                  )}
                >
                  {formatCurrency(amount)}
                </button>
              ))}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">$</span>
                <Input
                  type="number"
                  placeholder="Other"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className={cn(
                    "pl-7 h-full bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30",
                    "focus:bg-white/[0.08] focus:border-white/20 transition-all duration-200",
                    customAmount && "bg-white text-black border-white placeholder:text-black/50"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Minimum Warning */}
          {finalAmount > 0 && finalAmount < 100 && (
            <div className="flex items-center gap-2.5 text-amber-400/90 text-sm bg-amber-500/[0.08] border border-amber-500/20 rounded-lg px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Minimum amount is $100</span>
            </div>
          )}

          {/* Summary */}
          {finalAmount >= 100 && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.06]">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-white/40">Adding</span>
                <span className="text-sm font-medium text-white">{formatCurrency(finalAmount)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-white/40">New balance</span>
                <span className="text-sm font-medium text-emerald-400">
                  {formatCurrency(currentBalance + finalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 bg-transparent border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.04] hover:border-white/[0.12]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFunds}
              disabled={loading || finalAmount < 100}
              className={cn(
                "flex-1 h-11 font-medium transition-all duration-200",
                "bg-white text-black hover:bg-white/90",
                "disabled:bg-white/10 disabled:text-white/30"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add {formatCurrency(finalAmount)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
