import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriptionCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  brandId: string;
  onComplete?: () => void;
}

const PLAN_IDS: Record<string, string> = {
  starter: "plan_DU4ba3ik2UHVZ",
  growth: "plan_JSWLvDSLsSde4",
};

export function SubscriptionCheckoutDialog({
  open,
  onOpenChange,
  planId,
  planName,
  brandId,
  onComplete,
}: SubscriptionCheckoutDialogProps) {
  const [mounted, setMounted] = useState(false);
  
  // Get the actual Whop plan ID
  const whopPlanId = PLAN_IDS[planId] || planId;
  
  // Construct return URL with brand context
  const returnUrl = `${window.location.origin}/dashboard?workspace=${brandId}&tab=profile&checkout=complete`;

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      // Reset mounted state when dialog closes
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleComplete = (planId: string, receiptId: string) => {
    console.log("Checkout complete:", { planId, receiptId });
    onComplete?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-[-0.5px]">
            Subscribe to {planName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="min-h-[400px]">
          {mounted && (
            <WhopCheckoutEmbed
              planId={whopPlanId}
              returnUrl={returnUrl}
              theme="system"
              onComplete={handleComplete}
              fallback={
                <div className="space-y-4 p-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
