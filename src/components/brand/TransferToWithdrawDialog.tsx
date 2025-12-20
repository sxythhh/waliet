import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, AlertCircle } from "lucide-react";

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
      const { data: userData } = await supabase.auth.getUser();

      // Create a debit transaction from Virality balance
      const { error } = await supabase
        .from('brand_wallet_transactions')
        .insert({
          brand_id: brandId,
          type: 'transfer_to_withdraw',
          amount: parsedAmount,
          status: 'completed',
          description: `Transfer to withdraw balance`,
          created_by: userData?.user?.id
        });

      if (error) throw error;

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
      <DialogContent className="bg-[#0f0f0f] border-[#1f1f1f] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-[#2060df]" />
            Transfer to Withdraw Balance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Current Virality Balance */}
          <div className="bg-[#1a1a1a] rounded-lg p-4">
            <p className="text-sm text-neutral-400 mb-1">Virality Balance</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(viralityBalance)}</p>
          </div>

          {/* Amount Input */}
          <div>
            <Label className="text-neutral-300 mb-2 block">Amount to Transfer</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 bg-[#1a1a1a] border-[#2a2a2a] text-white text-lg"
              />
            </div>
          </div>

          {/* Validation Warning */}
          {exceedsBalance && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4" />
              <span>Amount exceeds Virality balance</span>
            </div>
          )}

          {/* Summary */}
          {parsedAmount > 0 && !exceedsBalance && (
            <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Transferring</span>
                <span className="text-white font-medium">{formatCurrency(parsedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-[#2a2a2a] pt-2 mt-2">
                <span className="text-neutral-400">Remaining Virality balance</span>
                <span className="text-white">
                  {formatCurrency(viralityBalance - parsedAmount)}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                This will move funds from your Virality balance to your Withdraw balance, making them available for withdrawal.
              </p>
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
              onClick={handleTransfer}
              disabled={loading || parsedAmount <= 0 || exceedsBalance}
              className="flex-1 bg-[#2060df] hover:bg-[#1a50c0]"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              {loading ? 'Transferring...' : 'Transfer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
