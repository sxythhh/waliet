import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, ArrowRight, UserCircle } from "lucide-react";

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
      <DialogContent className="bg-[#0a0a0a] border-0 text-white max-w-sm p-0 gap-0 overflow-hidden">
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
          <div className="p-4 bg-[#111] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p 
                  className="text-xs text-neutral-500 tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {brandName} Balance
                </p>
                <p 
                  className="text-xl font-semibold text-white tracking-[-0.5px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {formatCurrency(viralityBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Transfer Arrow */}
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-neutral-500" />
            </div>
          </div>

          {/* Personal Wallet */}
          <div className="p-4 bg-[#111] rounded-lg border border-dashed border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p 
                  className="text-xs text-neutral-500 tracking-[-0.3px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Transfer to
                </p>
                <p 
                  className="text-base font-medium text-white tracking-[-0.5px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Your Personal Wallet
                </p>
              </div>
            </div>
          </div>

          {/* Amount Input */}
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={viralityBalance}
              className="pl-8 h-12 bg-[#111] border-0 text-white text-sm tracking-[-0.3px] placeholder:text-neutral-600 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1a1a] text-neutral-400 hover:text-white hover:bg-[#222] transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {percent}%
              </button>
            ))}
            <button
              onClick={() => setAmount(viralityBalance.toFixed(2))}
              disabled={viralityBalance <= 0}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1a1a] text-neutral-400 hover:text-white hover:bg-[#222] transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Max
            </button>
          </div>

          {/* Info */}
          <p 
            className="text-xs text-neutral-500 tracking-[-0.3px]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Transfers are instant. From your personal wallet, you can request a withdrawal to your payout method.
          </p>

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
              onClick={handleTransfer}
              disabled={loading || !isValidAmount}
              className="flex-1 h-11 bg-white text-black hover:bg-neutral-200 font-medium tracking-[-0.5px]"
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
