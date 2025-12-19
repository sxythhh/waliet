import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, CreditCard, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

interface AddBrandFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  currentBalance: number;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

type ViewState = 'amount' | 'checkout';

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
  const [viewState, setViewState] = useState<ViewState>('amount');
  const [checkoutSession, setCheckoutSession] = useState<{
    sessionId: string;
    planId: string;
  } | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setViewState('amount');
      setCheckoutSession(null);
      setSelectedAmount(1000);
      setCustomAmount("");
    }
  }, [open]);

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

  const handleProceedToCheckout = async () => {
    const amount = getFinalAmount();

    if (amount < 100) {
      toast.error('Minimum top-up amount is $100');
      return;
    }

    setLoading(true);

    try {
      // Create checkout session with metadata
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          brand_id: brandId, 
          amount,
          mode: 'setup', // Setup mode to save payment method
          return_url: window.location.href,
        },
      });

      if (error) throw error;

      if (data?.session_id && data?.plan_id) {
        setCheckoutSession({
          sessionId: data.session_id,
          planId: data.plan_id,
        });
        setViewState('checkout');
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to initialize checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutComplete = async (planId: string, receiptId: string) => {
    console.log('Checkout complete:', { planId, receiptId });
    
    const amount = getFinalAmount();
    
    try {
      // Now process the actual topup since payment method is set up
      const { data, error } = await supabase.functions.invoke('create-brand-wallet-topup', {
        body: { 
          brand_id: brandId, 
          amount,
          return_url: window.location.href,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Successfully added ${formatCurrency(amount)} to your wallet!`);
        onOpenChange(false);
        onSuccess?.();
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error processing topup:', error);
      toast.error('Payment method saved. You can now add funds.');
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const finalAmount = getFinalAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f] border-[#1f1f1f] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {viewState === 'checkout' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewState('amount')}
                className="h-8 w-8 mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Wallet className="w-5 h-5 text-[#2060df]" />
            {viewState === 'amount' ? 'Add Funds to Wallet' : 'Complete Payment'}
          </DialogTitle>
        </DialogHeader>

        {viewState === 'amount' ? (
          <div className="space-y-6 pt-2">
            {/* Current Balance */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <p className="text-sm text-neutral-400 mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(currentBalance)}</p>
            </div>

            {/* Amount Selection */}
            <div>
              <Label className="text-neutral-300 mb-3 block">Select Amount</Label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESET_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handlePresetClick(amount)}
                    className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                      selectedAmount === amount
                        ? 'bg-[#2060df] text-white'
                        : 'bg-[#1a1a1a] text-neutral-300 hover:bg-[#252525]'
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                  <Input
                    type="number"
                    placeholder="Custom"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="pl-7 bg-[#1a1a1a] border-[#2a2a2a] text-white h-full"
                  />
                </div>
              </div>
            </div>

            {/* Minimum Warning */}
            {finalAmount > 0 && finalAmount < 100 && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-400/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4" />
                <span>Minimum top-up amount is $100</span>
              </div>
            )}

            {/* Summary */}
            {finalAmount >= 100 && (
              <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Amount to add</span>
                  <span className="text-white font-medium">{formatCurrency(finalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-[#2a2a2a] pt-2 mt-2">
                  <span className="text-neutral-400">New balance</span>
                  <span className="text-green-400 font-medium">
                    {formatCurrency(currentBalance + finalAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-[#2a2a2a] text-white hover:bg-[#1a1a1a]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedToCheckout}
                disabled={loading || finalAmount < 100}
                className="flex-1 bg-[#2060df] hover:bg-[#1a50c0]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Loading...' : 'Continue to Payment'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Amount Summary */}
            <div className="bg-[#1a1a1a] rounded-lg p-4 flex justify-between items-center">
              <span className="text-neutral-400">Adding to wallet</span>
              <span className="text-xl font-semibold text-white">{formatCurrency(finalAmount)}</span>
            </div>

            {/* Embedded Checkout */}
            {checkoutSession ? (
              <div className="rounded-xl overflow-hidden border border-[#1f1f1f] bg-[#0a0a0a]">
                <WhopCheckoutEmbed
                  planId={checkoutSession.planId}
                  sessionId={checkoutSession.sessionId}
                  returnUrl={window.location.href}
                  theme="dark"
                  setupFutureUsage="off_session"
                  onComplete={handleCheckoutComplete}
                  fallback={
                    <div className="flex items-center justify-center h-[400px]">
                      <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
