import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";

interface RequestVideoPayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoTitle: string;
  programName: string;
  amount: number;
  onConfirm: () => void;
  isLoading: boolean;
}

export function RequestVideoPayoutDialog({
  open,
  onOpenChange,
  videoTitle,
  programName,
  amount,
  onConfirm,
  isLoading,
}: RequestVideoPayoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Request Payout
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Request payout for this video submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Info */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium truncate" title={videoTitle}>
              {videoTitle || 'Untitled Video'}
            </p>
            <p className="text-xs text-muted-foreground">
              {programName}
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2" style={{ fontFamily: 'Inter' }}>
              ${amount.toFixed(2)}
            </p>
          </div>

          {/* Clearing Period Warning */}
          <div className="flex gap-3 p-3 bg-orange-500/10 rounded-lg">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                7-day clearing period
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                After requesting, this amount will be locked for 7 days. Brands can flag for review during the first 4 days.
              </p>
            </div>
          </div>

          {/* What happens next */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">What happens next:</p>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Amount locked and enters clearing period
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                After 7 days, funds sent to your wallet automatically
              </p>
            </div>
          </div>

          {amount < 1 && (
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">Minimum payout is $1.00</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={amount < 1 || isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Requesting...' : `Request $${amount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
