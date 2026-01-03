import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ExternalLink, CreditCard, DollarSign } from "lucide-react";

interface CoinbaseOnrampWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
  network?: string;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

export function CoinbaseOnrampWidget({
  open,
  onOpenChange,
  brandId,
  brandName,
  network = 'solana',
  onSuccess,
}: CoinbaseOnrampWidgetProps) {
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSessionUrl(null);
      setDepositAddress(null);
      setLoading(false);
      setCustomAmount("");
    }
  }, [open]);

  const handleAmountSelect = (presetAmount: number) => {
    setAmount(presetAmount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
    }
  };

  const createSession = async () => {
    if (amount < 10) {
      toast.error("Minimum amount is $10");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('coinbase-onramp-session', {
        body: {
          brand_id: brandId,
          amount_usd: amount,
          network,
        },
      });

      if (error) throw error;

      if (data?.success && data?.session_url) {
        setSessionUrl(data.session_url);
        setDepositAddress(data.deposit_address);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error creating Coinbase session:', error);
      toast.error(error?.message || 'Failed to create Coinbase session');
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    if (sessionUrl) {
      window.open(sessionUrl, '_blank', 'noopener,noreferrer');
      toast.success('Coinbase Onramp opened in new tab');
      // Close dialog after a moment
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 1000);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle
            className="text-lg font-semibold tracking-[-0.5px] flex items-center gap-2"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <CreditCard className="w-5 h-5" />
            Buy USDC with Card
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground tracking-[-0.3px]">
            Purchase USDC instantly using credit or debit card via Coinbase
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {!sessionUrl ? (
            <>
              {/* Amount Selection */}
              <div className="space-y-3">
                <Label
                  className="text-sm font-medium tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Select Amount
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAmountSelect(preset)}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${amount === preset && !customAmount
                          ? 'bg-foreground text-background'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }
                      `}
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {formatCurrency(preset)}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="pl-9"
                    min={10}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">You pay</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">You receive (approx.)</span>
                  <span className="font-medium">{amount.toFixed(2)} USDC</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium capitalize">{network}</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p
                  className="text-xs text-blue-600 dark:text-blue-400 tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Powered by Coinbase. Funds will be deposited directly to {brandName}'s wallet.
                </p>
              </div>

              {/* Continue Button */}
              <Button
                onClick={createSession}
                disabled={loading || amount < 10}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating session...
                  </>
                ) : (
                  <>
                    Continue to Coinbase
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Session Ready */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold tracking-[-0.5px]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Ready to Purchase
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete your purchase of {formatCurrency(amount)} in USDC
                  </p>
                </div>
              </div>

              {/* Deposit Address Preview */}
              {depositAddress && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Deposit Address</p>
                  <p className="text-xs font-mono break-all">{depositAddress}</p>
                </div>
              )}

              {/* Open Coinbase Button */}
              <Button
                onClick={openInNewTab}
                className="w-full gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Coinbase
              </Button>

              {/* Info */}
              <p className="text-xs text-center text-muted-foreground">
                A new tab will open to complete your purchase. Funds will be credited automatically once confirmed.
              </p>

              {/* Back Button */}
              <Button
                variant="ghost"
                onClick={() => setSessionUrl(null)}
                className="w-full"
              >
                Change amount
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
