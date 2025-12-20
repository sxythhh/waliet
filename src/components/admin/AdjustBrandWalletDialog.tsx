import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Plus, Minus } from "lucide-react";

interface AdjustBrandWalletDialogProps {
  brandId: string;
  brandName: string;
  onSuccess?: () => void;
}

export function AdjustBrandWalletDialog({
  brandId,
  brandName,
  onSuccess
}: AdjustBrandWalletDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      fetchBalance();
    }
  }, [open, brandId]);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("brand_wallet_transactions")
        .select("type, amount, status")
        .eq("brand_id", brandId);

      if (error) throw error;

      // Calculate balance from transactions
      const calculatedBalance = (data || []).reduce((acc, tx) => {
        if (tx.status !== "completed") return acc;
        const txAmount = Number(tx.amount) || 0;
        if (["deposit", "topup", "refund", "admin_credit"].includes(tx.type)) {
          return acc + txAmount;
        } else {
          return acc - txAmount;
        }
      }, 0);

      setBalance(calculatedBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (adjustmentType === "remove" && numAmount > balance) {
      toast.error("Cannot remove more than current balance");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("brand_wallet_transactions")
        .insert({
          brand_id: brandId,
          type: adjustmentType === "add" ? "admin_credit" : "admin_debit",
          amount: numAmount,
          status: "completed",
          description: description || `Admin ${adjustmentType === "add" ? "credit" : "debit"}`,
          created_by: userData?.user?.id
        });

      if (error) throw error;

      toast.success(`Successfully ${adjustmentType === "add" ? "added" : "removed"} $${numAmount.toFixed(2)}`);
      setOpen(false);
      setAmount("");
      setDescription("");
      onSuccess?.();
    } catch (error) {
      console.error("Error adjusting balance:", error);
      toast.error("Failed to adjust balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const newBalance = adjustmentType === "add" 
    ? balance + (parseFloat(amount) || 0)
    : balance - (parseFloat(amount) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Wallet className="h-3.5 w-3.5" />
          Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Wallet Balance</DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-1">{brandName}</p>
          <p className="text-2xl font-semibold">
            {loading ? "..." : `$${balance.toFixed(2)}`}
          </p>
          <p className="text-xs text-muted-foreground">Current Balance</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={adjustmentType === "add" ? "default" : "outline"}
              className="flex-1 gap-1.5"
              onClick={() => setAdjustmentType("add")}
            >
              <Plus className="h-4 w-4" />
              Add Funds
            </Button>
            <Button
              type="button"
              variant={adjustmentType === "remove" ? "default" : "outline"}
              className="flex-1 gap-1.5"
              onClick={() => setAdjustmentType("remove")}
            >
              <Minus className="h-4 w-4" />
              Remove
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for adjustment..."
              rows={2}
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Balance:</span>
                <span className={`font-medium ${newBalance < 0 ? 'text-destructive' : ''}`}>
                  ${newBalance.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !amount}>
              {isSubmitting ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
