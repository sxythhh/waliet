import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, AlertCircle, Wallet, ArrowDownRight, Loader2 } from "lucide-react";

interface TransferToWithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  viralityBalance: number;
  onSuccess?: () => void;
}

export function TransferToWithdrawDialog({
  open,
  onOpenChange,
  brandId,
  viralityBalance,
  onSuccess,
}: TransferToWithdrawDialogProps) {
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
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parsedAmount > viralityBalance) {
      toast.error('Insufficient Virality balance');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('transfer-to-withdraw', {
        body: { brandId, amount: parsedAmount }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${formatCurrency(parsedAmount)} transferred to withdraw balance`);
      onOpenChange(false);
      setAmount("");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error transferring funds:', error);
      toast.error(error.message || 'Failed to transfer funds');
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const exceedsBalance = parsedAmount > viralityBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#080808] border-[#161616] text-white max-w-md p-0 overflow-hidden font-inter">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#161616]">
          <DialogTitle className="text-lg font-semibold tracking-[-0.5px] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-neutral-400" />
            </div>
            Transfer to Withdraw
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Balance Card */}
          <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                <Wallet className="w-4 h-4 text-neutral-500" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 tracking-[-0.5px]">Available Balance</p>
                <p className="text-xl font-semibold tracking-[-0.5px] text-white">{formatCurrency(viralityBalance)}</p>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className="text-xs text-neutral-400 tracking-[-0.5px]">Transfer Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-medium">$</span>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 h-12 bg-[#0c0c0c] border-[#1a1a1a] text-white text-lg font-medium tracking-[-0.5px] focus:border-[#2a2a2a] focus:ring-0 placeholder:text-neutral-600"
              />
            </div>
            {parsedAmount > 0 && !exceedsBalance && (
              <p className="text-xs text-neutral-500 tracking-[-0.5px]">
                Remaining: {formatCurrency(viralityBalance - parsedAmount)}
              </p>
            )}
          </div>

          {/* Validation Warning */}
          {exceedsBalance && (
            <div className="flex items-center gap-2.5 text-red-400 text-xs bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2.5 tracking-[-0.5px]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Amount exceeds available balance</span>
            </div>
          )}

          {/* Transfer Flow Visual */}
          {parsedAmount > 0 && !exceedsBalance && (
            <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">From</p>
                  <p className="text-xs font-medium text-neutral-300 tracking-[-0.5px]">Virality</p>
                </div>
                <div className="flex-1 flex items-center justify-center px-4">
                  <div className="h-px bg-gradient-to-r from-[#1a1a1a] via-neutral-600 to-[#1a1a1a] flex-1" />
                  <div className="px-2">
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                  </div>
                  <div className="h-px bg-gradient-to-r from-[#1a1a1a] via-neutral-600 to-[#1a1a1a] flex-1" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">To</p>
                  <p className="text-xs font-medium text-neutral-300 tracking-[-0.5px]">Withdraw</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 tracking-[-0.5px]">Amount</span>
                  <span className="text-sm font-semibold text-white tracking-[-0.5px]">{formatCurrency(parsedAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 bg-transparent border-[#1a1a1a] text-neutral-300 hover:bg-[#141414] hover:text-white tracking-[-0.5px] font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={loading || parsedAmount <= 0 || exceedsBalance}
              className="flex-1 h-11 bg-white text-black hover:bg-neutral-200 tracking-[-0.5px] font-medium disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
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
