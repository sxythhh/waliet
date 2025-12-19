import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddBrandFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  currentBalance: number;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000];

export function AddBrandFundsDialog({
  open,
  onOpenChange,
  brandId,
  currentBalance,
  onSuccess,
}: AddBrandFundsDialogProps) {
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

    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const processingFee = (amount * 0.03) + 0.30;
      const totalAmount = amount + processingFee;

      const { data, error } = await supabase.functions.invoke('create-brand-wallet-topup', {
        body: { 
          brand_id: brandId, 
          amount,
          total_amount: totalAmount,
          return_url: window.location.href,
        },
      });

      if (error) throw error;

       if (data?.needs_payment_method && data?.checkout_url) {
         // Store the amount + intent id so we can finalize the top-up after returning from checkout
         sessionStorage.setItem(
           `pending_topup_${brandId}`,
           JSON.stringify({ amount, transactionId: data?.transaction_id })
         );
         toast.message('Redirecting to checkout', {
           description: 'Complete your payment to add funds.',
         });
         window.location.href = data.checkout_url;
         return;
       }

      if (data?.needs_payment_method && !data?.checkout_url) {
        toast.error('Please enter an amount to add funds.');
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
  const processingFee = finalAmount > 0 ? (finalAmount * 0.03) + 0.30 : 0;
  const totalCharged = finalAmount + processingFee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border-0 text-white max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle 
            className="text-lg font-semibold tracking-[-0.5px]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Add Funds
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Current Balance */}
          <div>
            <p 
              className="text-xs text-neutral-500 mb-1 tracking-[-0.3px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Current Balance
            </p>
            <p 
              className="text-3xl font-semibold text-white tracking-[-0.5px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {formatCurrency(currentBalance)}
            </p>
          </div>

          {/* Preset Amounts */}
          <div className="flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handlePresetClick(amount)}
                className={`px-4 py-2 rounded-full text-sm font-medium tracking-[-0.3px] transition-colors ${
                  selectedAmount === amount
                    ? 'bg-white text-black'
                    : 'bg-[#1a1a1a] text-neutral-400 hover:text-white'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {formatCurrency(amount)}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="relative">
            <span 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              $
            </span>
            <Input
              type="number"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className="pl-8 h-12 bg-[#111] border-0 text-white text-sm tracking-[-0.3px] placeholder:text-neutral-600 focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {/* Summary */}
          {finalAmount > 0 && (
            <div className="pt-2 space-y-3">
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm text-neutral-500 tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Deposit Amount
                </span>
                <span 
                  className="text-sm text-white font-medium tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {formatCurrency(finalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm text-neutral-500 tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Payment Processor
                </span>
                <span 
                  className="text-sm text-neutral-400 font-medium tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {formatCurrency(processingFee)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                <span 
                  className="text-sm text-neutral-500 tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Total Charged
                </span>
                <span 
                  className="text-sm text-white font-medium tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {formatCurrency(totalCharged)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span 
                  className="text-sm text-emerald-400 tracking-[-0.3px] flex items-center gap-1.5"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  You will receive
                </span>
                <span 
                  className="text-sm text-emerald-400 font-medium tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {formatCurrency(finalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 text-neutral-400 hover:text-white hover:bg-[#1a1a1a] font-medium tracking-[-0.5px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFunds}
              disabled={loading || finalAmount <= 0}
              className="flex-1 h-11 bg-white text-black hover:bg-neutral-200 font-medium tracking-[-0.5px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? 'Processing...' : `Add ${formatCurrency(finalAmount)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
