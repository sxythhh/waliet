import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface ClawbackPayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemAmount: number;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function ClawbackPayoutDialog({
  open,
  onOpenChange,
  itemAmount,
  onConfirm,
  isLoading = false,
}: ClawbackPayoutDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Clawback Payout
          </DialogTitle>
          <DialogDescription>
            This will reverse the payout of <span className="font-semibold text-foreground">${itemAmount.toFixed(2)}</span> and 
            deduct it from the creator's wallet balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">
              Warning: This action will immediately deduct funds from the creator's wallet.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clawback-reason">Reason for clawback *</Label>
            <Textarea
              id="clawback-reason"
              placeholder="e.g., Fraudulent views detected, Policy violation, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? "Processing..." : `Clawback $${itemAmount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
