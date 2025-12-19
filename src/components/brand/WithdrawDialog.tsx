import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FocusScope } from "@radix-ui/react-focus-scope";
import { cn } from "@/lib/utils";
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 w-[calc(100%-2rem)] max-w-md",
            "bg-background border border-border text-foreground",
            "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
            "rounded-xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Non-modal dialog so Radix doesn't block pointer events outside content (Whop popups are portaled). */}
          <FocusScope trapped={false} loop={false}>
            <div className="px-6 pt-6 pb-2">
              <DialogPrimitive.Title className="text-lg font-semibold tracking-[-0.5px]">
                Withdraw
              </DialogPrimitive.Title>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <EmbeddedPayoutPortal brandId={brandId} redirectUrl={redirectUrl} />
            </div>
          </FocusScope>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1.5 opacity-60 hover:opacity-100 hover:bg-muted transition-all">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
