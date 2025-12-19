import { Dialog, DialogContent } from "@/components/ui/dialog";

interface SubscriptionGateDialogProps {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionGateDialog({ 
  brandId, 
  open,
  onOpenChange
}: SubscriptionGateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 bg-transparent border-0 overflow-hidden">
        <iframe 
          src="https://join.virality.gg/page-2" 
          className="w-full h-[80vh] border-0 rounded-xl"
          title="Upgrade Plan"
        />
      </DialogContent>
    </Dialog>
  );
}
