import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DollarSign, AlertCircle } from "lucide-react";

interface OverridePayoutAmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalAmount: number;
  onConfirm: (newAmount: number, reason: string) => void;
  isSubmitting?: boolean;
}

export function OverridePayoutAmountDialog({
  open,
  onOpenChange,
  originalAmount,
  onConfirm,
  isSubmitting = false,
}: OverridePayoutAmountDialogProps) {
  const [customAmount, setCustomAmount] = useState<string>("");
  const [reason, setReason] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCustomAmount(originalAmount.toFixed(2));
      setReason("");
    }
  }, [open, originalAmount]);

  const parsedAmount = parseFloat(customAmount) || 0;
  const isValid = parsedAmount >= 0 && reason.trim().length > 0;
  const difference = parsedAmount - originalAmount;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(parsedAmount, reason.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">Override Payout Amount</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set a custom payout amount for this video submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Amount */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/40">
            <span className="text-sm text-muted-foreground">Original Amount</span>
            <span className="font-medium">${originalAmount.toFixed(2)}</span>
          </div>

          {/* Custom Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-amount" className="text-sm font-medium">
              New Amount
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="custom-amount"
                type="number"
                step="0.01"
                min="0"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="pl-9 font-mono"
                placeholder="0.00"
              />
            </div>
            {difference !== 0 && (
              <p className={`text-xs ${difference < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {difference > 0 ? '+' : ''}{difference.toFixed(2)} from original
              </p>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Override <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Partial payment due to content issues, bonus for exceptional performance..."
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be recorded for audit purposes.
            </p>
          </div>

          {/* Warning for $0 */}
          {parsedAmount === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-500">
                Setting the amount to $0 will approve this item without paying the creator.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? "Saving..." : "Confirm Override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
