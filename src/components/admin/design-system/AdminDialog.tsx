import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PADDING, TYPOGRAPHY, BORDERS, BACKGROUNDS, TRANSITIONS, RADII } from "@/lib/admin-tokens";

// =============================================================================
// DIALOG PRIMITIVES
// =============================================================================

const AdminDialogRoot = DialogPrimitive.Root;
const AdminDialogTrigger = DialogPrimitive.Trigger;
const AdminDialogClose = DialogPrimitive.Close;
const AdminDialogPortal = DialogPrimitive.Portal;

// =============================================================================
// OVERLAY
// =============================================================================

const AdminDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50",
      "bg-black/60 backdrop-blur-sm", // Unified with sheet
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
AdminDialogOverlay.displayName = "AdminDialogOverlay";

// =============================================================================
// CONTENT VARIANTS
// =============================================================================

const dialogContentVariants = cva(
  [
    "fixed z-50",
    "w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)]",
    "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
    "bg-background",
    "shadow-lg",
    RADII.lg,
    "overflow-hidden",
    "flex flex-col",
    "duration-200",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
    "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
    "focus:outline-none focus:ring-0",
  ],
  {
    variants: {
      size: {
        sm: "max-w-[400px]",
        md: "max-w-[500px]",
        lg: "max-w-[600px]",
        xl: "max-w-[700px]",
        "2xl": "max-w-[800px]",
        full: "max-w-[calc(100vw-4rem)]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

// =============================================================================
// DIALOG CONTENT
// =============================================================================

interface AdminDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /** Hide close button */
  hideCloseButton?: boolean;
}

const AdminDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  AdminDialogContentProps
>(({ size = "md", className, children, hideCloseButton, ...props }, ref) => (
  <AdminDialogPortal>
    <AdminDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(dialogContentVariants({ size }), className)}
      {...props}
    >
      {!hideCloseButton && (
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 top-4 z-10",
            "rounded-full p-1.5",
            "text-muted-foreground hover:text-foreground",
            BACKGROUNDS.hover,
            TRANSITIONS.fast,
            "focus:outline-none focus:ring-0"
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
      {children}
    </DialogPrimitive.Content>
  </AdminDialogPortal>
));
AdminDialogContent.displayName = "AdminDialogContent";

// =============================================================================
// DIALOG HEADER
// =============================================================================

interface AdminDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes bottom border */
  noBorder?: boolean;
}

const AdminDialogHeader = React.forwardRef<HTMLDivElement, AdminDialogHeaderProps>(
  ({ className, noBorder, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        PADDING.sheetHeader,
        !noBorder && cn("border-b", BORDERS.default),
        "flex-shrink-0",
        className
      )}
      {...props}
    />
  )
);
AdminDialogHeader.displayName = "AdminDialogHeader";

// =============================================================================
// DIALOG BODY
// =============================================================================

const AdminDialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      PADDING.sheetContent,
      "flex-1 overflow-y-auto",
      className
    )}
    {...props}
  />
));
AdminDialogBody.displayName = "AdminDialogBody";

// =============================================================================
// DIALOG FOOTER
// =============================================================================

interface AdminDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes top border */
  noBorder?: boolean;
}

const AdminDialogFooter = React.forwardRef<HTMLDivElement, AdminDialogFooterProps>(
  ({ className, noBorder, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        PADDING.sheetFooter,
        !noBorder && cn("border-t", BORDERS.default),
        BACKGROUNDS.accent,
        "flex-shrink-0",
        "flex items-center justify-end gap-3",
        className
      )}
      {...props}
    />
  )
);
AdminDialogFooter.displayName = "AdminDialogFooter";

// =============================================================================
// DIALOG TITLE
// =============================================================================

const AdminDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(TYPOGRAPHY.pageTitle, className)}
    {...props}
  />
));
AdminDialogTitle.displayName = "AdminDialogTitle";

// =============================================================================
// DIALOG DESCRIPTION
// =============================================================================

const AdminDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(TYPOGRAPHY.caption, "mt-1", className)}
    {...props}
  />
));
AdminDialogDescription.displayName = "AdminDialogDescription";

// =============================================================================
// SIMPLE CONFIRM DIALOG
// =============================================================================

interface AdminConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "default" | "destructive";
  loading?: boolean;
}

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
}: AdminConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AdminDialogRoot open={open} onOpenChange={onOpenChange}>
      <AdminDialogContent size="sm" hideCloseButton>
        <AdminDialogHeader noBorder>
          <AdminDialogTitle>{title}</AdminDialogTitle>
          {description && (
            <AdminDialogDescription>{description}</AdminDialogDescription>
          )}
        </AdminDialogHeader>
        <AdminDialogFooter noBorder className="pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className={cn(
              "h-9 px-4 rounded-md text-sm font-medium",
              BACKGROUNDS.hover,
              TRANSITIONS.fast,
              "disabled:opacity-50"
            )}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "h-9 px-4 rounded-md text-sm font-medium",
              TRANSITIONS.fast,
              "disabled:opacity-50",
              variant === "destructive"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-foreground text-background hover:bg-foreground/90"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </AdminDialogFooter>
      </AdminDialogContent>
    </AdminDialogRoot>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  AdminDialogRoot as AdminDialog,
  AdminDialogTrigger,
  AdminDialogClose,
  AdminDialogPortal,
  AdminDialogOverlay,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogTitle,
  AdminDialogDescription,
};
