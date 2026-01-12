import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDown } from "lucide-react";

interface BrandToPersonalTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
  viralityBalance: number;
  onSuccess?: () => void;
}

export function BrandToPersonalTransferDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
  viralityBalance,
  onSuccess,
}: BrandToPersonalTransferDialogProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleTransfer = async () => {
    const transferAmount = parseFloat(amount);
    
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (transferAmount > viralityBalance) {
      toast.error('Insufficient balance in brand wallet');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('brand-to-personal-transfer', {
        body: { 
          brand_id: brandId, 
          amount: transferAmount,
          description: `Transfer from ${brandName} to personal wallet`
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Successfully transferred ${formatCurrency(transferAmount)} to your personal wallet!`);
        onOpenChange(false);
        setAmount("");
        onSuccess?.();
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error transferring funds:', error);
      toast.error(error?.message || 'Failed to transfer funds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const transferAmount = parseFloat(amount) || 0;
  const isValidAmount = transferAmount > 0 && transferAmount <= viralityBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle 
            className="text-lg font-semibold tracking-[-0.5px]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Transfer to Personal Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Brand Wallet Balance */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p
              className="text-xs text-muted-foreground tracking-[-0.3px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {brandName} Balance
            </p>
            <p
              className="text-xl font-semibold text-foreground tracking-[-0.5px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {formatCurrency(viralityBalance)}
            </p>
          </div>

          {/* Transfer Arrow */}
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <ArrowDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Personal Wallet */}
          <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border">
            <p
              className="text-xs text-muted-foreground tracking-[-0.3px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Transfer to
            </p>
            <p
              className="text-base font-medium text-foreground tracking-[-0.5px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Your Personal Wallet
            </p>
          </div>

          {/* Amount Input */}
          <div className="relative">
            <span 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              $
            </span>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={viralityBalance}
              className="pl-8 h-12 bg-muted/50 border-border text-foreground text-sm tracking-[-0.3px] placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            {[25, 50, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => setAmount((viralityBalance * percent / 100).toFixed(2))}
                disabled={viralityBalance <= 0}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {percent}%
              </button>
            ))}
            <button
              onClick={() => setAmount(viralityBalance.toFixed(2))}
              disabled={viralityBalance <= 0}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Max
            </button>
          </div>

          {/* Info */}
          <div className="space-y-2">
            <p
              className="text-xs text-muted-foreground tracking-[-0.3px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Transfers are instant. From your personal wallet, you can request a withdrawal to your payout method.
            </p>
            <p
              className="text-xs text-amber-500/80 tracking-[-0.3px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Note: Ensure you maintain sufficient balance for pending creator payouts.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 text-muted-foreground hover:text-foreground hover:bg-muted font-medium tracking-[-0.5px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={loading || !isValidAmount}
              className="flex-1 h-11 bg-blue-500 text-white hover:bg-blue-600 font-medium tracking-[-0.5px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? 'Transferring...' : `Transfer ${formatCurrency(transferAmount)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
