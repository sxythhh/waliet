import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PADDING, TYPOGRAPHY, BORDERS, BACKGROUNDS, TRANSITIONS } from "@/lib/admin-tokens";

// =============================================================================
// SHEET PRIMITIVES
// =============================================================================

const AdminSheetRoot = SheetPrimitive.Root;
const AdminSheetTrigger = SheetPrimitive.Trigger;
const AdminSheetClose = SheetPrimitive.Close;
const AdminSheetPortal = SheetPrimitive.Portal;

// =============================================================================
// OVERLAY
// =============================================================================

const AdminSheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50",
      "bg-black/60 backdrop-blur-sm", // Unified with dialog
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
AdminSheetOverlay.displayName = "AdminSheetOverlay";

// =============================================================================
// CONTENT VARIANTS
// =============================================================================

const sheetContentVariants = cva(
  [
    "fixed z-50 bg-background shadow-lg",
    "flex flex-col",
    "transition ease-in-out",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:duration-200 data-[state=open]:duration-300",
    "focus:outline-none focus:ring-0",
  ],
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        left:
          "inset-y-0 left-0 h-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
      },
      width: {
        sm: "w-full sm:w-[400px]",
        md: "w-full sm:w-[500px]",
        lg: "w-full sm:w-[600px]",
        xl: "w-full sm:w-[700px]",
      },
    },
    defaultVariants: {
      side: "right",
      width: "md",
    },
  }
);

// =============================================================================
// SHEET CONTENT
// =============================================================================

interface AdminSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetContentVariants> {
  /** Hide close button */
  hideCloseButton?: boolean;
}

const AdminSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  AdminSheetContentProps
>(
  (
    { side = "right", width = "md", className, children, hideCloseButton, ...props },
    ref
  ) => (
    <AdminSheetPortal>
      <AdminSheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          sheetContentVariants({ side, width }),
          BORDERS.default,
          className
        )}
        {...props}
      >
        {!hideCloseButton && (
          <SheetPrimitive.Close
            className={cn(
              "absolute right-4 top-4 z-10",
              "rounded-full p-1.5",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted/30 dark:hover:bg-muted/20",
              "transition-all duration-200",
              "focus:outline-none focus:ring-0"
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
        {children}
      </SheetPrimitive.Content>
    </AdminSheetPortal>
  )
);
AdminSheetContent.displayName = "AdminSheetContent";

// =============================================================================
// SHEET HEADER
// =============================================================================

interface AdminSheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes bottom border */
  noBorder?: boolean;
}

const AdminSheetHeader = React.forwardRef<HTMLDivElement, AdminSheetHeaderProps>(
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
AdminSheetHeader.displayName = "AdminSheetHeader";

// =============================================================================
// SHEET BODY (scrollable)
// =============================================================================

const AdminSheetBody = React.forwardRef<
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
AdminSheetBody.displayName = "AdminSheetBody";

// =============================================================================
// SHEET FOOTER
// =============================================================================

interface AdminSheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes top border */
  noBorder?: boolean;
}

const AdminSheetFooter = React.forwardRef<HTMLDivElement, AdminSheetFooterProps>(
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
AdminSheetFooter.displayName = "AdminSheetFooter";

// =============================================================================
// SHEET TITLE
// =============================================================================

const AdminSheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(TYPOGRAPHY.pageTitle, className)}
    {...props}
  />
));
AdminSheetTitle.displayName = "AdminSheetTitle";

// =============================================================================
// SHEET DESCRIPTION
// =============================================================================

const AdminSheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn(TYPOGRAPHY.caption, "mt-1", className)}
    {...props}
  />
));
AdminSheetDescription.displayName = "AdminSheetDescription";

// =============================================================================
// SHEET SECTION (for organizing content)
// =============================================================================

interface AdminSheetSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section title */
  title?: string;
  /** Section action */
  action?: React.ReactNode;
}

const AdminSheetSection = React.forwardRef<HTMLDivElement, AdminSheetSectionProps>(
  ({ className, title, action, children, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-3", className)} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          {title && <h3 className={TYPOGRAPHY.label}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
);
AdminSheetSection.displayName = "AdminSheetSection";

// =============================================================================
// EXPORTS
// =============================================================================

export {
  AdminSheetRoot as AdminSheet,
  AdminSheetTrigger,
  AdminSheetClose,
  AdminSheetPortal,
  AdminSheetOverlay,
  AdminSheetContent,
  AdminSheetHeader,
  AdminSheetBody,
  AdminSheetFooter,
  AdminSheetTitle,
  AdminSheetDescription,
  AdminSheetSection,
};
