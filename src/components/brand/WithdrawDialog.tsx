import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmbeddedPayoutPortal } from "./EmbeddedPayoutPortal";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandSlug: string;
}

export function WithdrawDialog({ open, onOpenChange, brandId, brandSlug }: WithdrawDialogProps) {
  const redirectUrl = `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=profile&verification=complete`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border-[#1f1f1f] text-white max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-semibold tracking-[-0.5px]">
            Withdraw
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <EmbeddedPayoutPortal brandId={brandId} redirectUrl={redirectUrl} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
