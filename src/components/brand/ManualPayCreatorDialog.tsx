import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, DollarSign, Loader2 } from "lucide-react";
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-instrument tracking-tight">
            Pay Creator
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            Send a manual payment from your personal wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Creator Info */}
          {creator && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={creator.avatar_url || undefined} />
                <AvatarFallback className="text-sm">
                  {(creator.full_name || creator.username)?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm font-inter tracking-[-0.3px]">
                  {creator.full_name || creator.username}
                </p>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                  @{creator.username}
                </p>
              </div>
            </div>
          )}

          {/* Your Balance */}
          <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mb-1">
              Your Balance
            </p>
            {fetchingBalance ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <p className="text-lg font-bold font-['Geist'] tracking-[-0.5px]">
                ${(ownerBalance || 0).toFixed(2)}
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className="font-inter tracking-[-0.3px] text-sm">
              Amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 font-['Geist'] tracking-[-0.5px]"
                step="0.01"
                min="0"
              />
            </div>
            {amountNum > 0 && ownerBalance !== null && amountNum > ownerBalance && (
              <div className="flex items-center gap-1.5 text-destructive text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>Insufficient balance</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="font-inter tracking-[-0.3px] text-sm">
              Description (optional)
            </Label>
            <Textarea
              placeholder="e.g., Bonus for exceptional work"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="font-inter tracking-[-0.3px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-inter tracking-[-0.3px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValidAmount || !creator}
            className="gap-2 font-inter tracking-[-0.3px]"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Pay ${amountNum.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
