import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManualPayCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  creator: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  onSuccess?: () => void;
}

export function ManualPayCreatorDialog({
  open,
  onOpenChange,
  brandId,
  creator,
  onSuccess,
}: ManualPayCreatorDialogProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [ownerBalance, setOwnerBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(false);

  useEffect(() => {
    if (open && brandId) {
      fetchOwnerBalance();
    }
  }, [open, brandId]);

  const fetchOwnerBalance = async () => {
    setFetchingBalance(true);
    try {
      // Get brand owner
      const { data: owner } = await supabase
        .from("brand_members")
        .select("user_id")
        .eq("brand_id", brandId)
        .eq("role", "owner")
        .single();

      if (owner) {
        // Get owner's personal wallet balance
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", owner.user_id)
          .single();

        setOwnerBalance(wallet?.balance || 0);
      }
    } catch (error) {
      console.error("Error fetching owner balance:", error);
    } finally {
      setFetchingBalance(false);
    }
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (ownerBalance !== null && amountNum > ownerBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!creator) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manual-creator-payment", {
        body: {
          brand_id: brandId,
          creator_id: creator.id,
          amount: amountNum,
          description: description.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Successfully paid $${amountNum.toFixed(2)} to ${creator.full_name || creator.username}`);
      onOpenChange(false);
      setAmount("");
      setDescription("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && (ownerBalance === null || amountNum <= ownerBalance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <DialogTitle className="text-base font-semibold font-inter tracking-[-0.3px]">
            Pay Creator
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground font-inter tracking-[-0.3px] mt-1">
            Send from your personal wallet
          </DialogDescription>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Creator Info */}
          {creator && (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={creator.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-muted">
                  {(creator.full_name || creator.username)?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[13px] font-inter tracking-[-0.3px] truncate">
                  {creator.full_name || creator.username}
                </p>
                <p className="text-[11px] text-muted-foreground font-inter tracking-[-0.3px]">
                  @{creator.username}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground font-inter tracking-[-0.3px]">
                  Your balance
                </p>
                {fetchingBalance ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
                ) : (
                  <p className="text-[13px] font-semibold font-inter tracking-[-0.3px] tabular-nums">
                    ${(ownerBalance || 0).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground font-inter tracking-[-0.3px] uppercase">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-inter">
                $
              </span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 h-10 text-[14px] font-inter tracking-[-0.3px] bg-muted/40 border-border/50 focus:bg-muted/60 tabular-nums"
                step="0.01"
                min="0"
              />
            </div>
            {amountNum > 0 && ownerBalance !== null && amountNum > ownerBalance && (
              <p className="text-[11px] text-destructive font-inter tracking-[-0.3px]">
                Insufficient balance
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground font-inter tracking-[-0.3px] uppercase">
              Note <span className="font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="e.g., Bonus for exceptional work"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-[13px] font-inter tracking-[-0.3px] bg-muted/40 border-border/50 focus:bg-muted/60 resize-none min-h-[72px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-9 text-[13px] font-inter tracking-[-0.3px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !isValidAmount || !creator}
              className="flex-1 h-9 text-[13px] gap-1.5 font-inter tracking-[-0.3px]"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Pay ${amountNum.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
