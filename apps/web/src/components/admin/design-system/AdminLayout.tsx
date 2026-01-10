import * as React from "react";
import { cn } from "@/lib/utils";
import { PADDING, TYPOGRAPHY, BORDERS, BACKGROUNDS, TRANSITIONS, SPACING } from "@/lib/admin-tokens";

// =============================================================================
// ADMIN PAGE HEADER
// =============================================================================

export interface AdminPageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Breadcrumb content */
  breadcrumb?: React.ReactNode;
  /** Right-side actions */
  actions?: React.ReactNode;
  /** Removes bottom border */
  noBorder?: boolean;
}

export const AdminPageHeader = React.forwardRef<HTMLDivElement, AdminPageHeaderProps>(
  ({ className, title, description, breadcrumb, actions, noBorder, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        PADDING.page,
        !noBorder && cn("border-b", BORDERS.default),
        "flex-shrink-0",
        className
      )}
      {...props}
    >
      {breadcrumb && <div className="mb-3">{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className={TYPOGRAPHY.pageTitle}>{title}</h1>
          {description && (
            <p className={cn(TYPOGRAPHY.caption, "mt-1.5")}>{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  )
);
AdminPageHeader.displayName = "AdminPageHeader";

// =============================================================================
// ADMIN SECTION
// =============================================================================

export interface AdminSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Right-side action */
  action?: React.ReactNode;
  /** Removes bottom border */
  noBorder?: boolean;
  /** Compact padding */
  compact?: boolean;
}

export const AdminSection = React.forwardRef<HTMLDivElement, AdminSectionProps>(
  (
    { className, title, description, action, noBorder, compact, children, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        compact ? PADDING.card : PADDING.section,
        !noBorder && cn("border-b", BORDERS.default),
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && <h2 className={TYPOGRAPHY.sectionTitle}>{title}</h2>}
            {description && (
              <p className={cn(TYPOGRAPHY.caption, "mt-1")}>{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
);
AdminSection.displayName = "AdminSection";

// =============================================================================
// ADMIN CONTENT (scrollable main area)
// =============================================================================

export const AdminContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto", className)}
    {...props}
  />
));
AdminContent.displayName = "AdminContent";

// =============================================================================
// ADMIN TOOLBAR (sticky filter/action bar)
// =============================================================================

export interface AdminToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes bottom border */
  noBorder?: boolean;
}

export const AdminToolbar = React.forwardRef<HTMLDivElement, AdminToolbarProps>(
  ({ className, noBorder, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-4 sm:px-6 md:px-8 py-3",
        !noBorder && cn("border-b", BORDERS.default),
        "flex items-center gap-3",
        "flex-shrink-0",
        BACKGROUNDS.muted,
        className
      )}
      {...props}
    />
  )
);
AdminToolbar.displayName = "AdminToolbar";

// =============================================================================
// ADMIN EMPTY STATE
// =============================================================================

export interface AdminEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button/element */
  action?: React.ReactNode;
}

export const AdminEmptyState = React.forwardRef<HTMLDivElement, AdminEmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted/50 dark:bg-muted/30 flex items-center justify-center mb-4">
          <div className="text-muted-foreground/60">{icon}</div>
        </div>
      )}
      <h3 className="font-inter font-medium tracking-[-0.5px] text-foreground">{title}</h3>
      {description && (
        <p className={cn(TYPOGRAPHY.caption, "mt-1.5 max-w-sm")}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
);
AdminEmptyState.displayName = "AdminEmptyState";

// =============================================================================
// ADMIN LOADING STATE
// =============================================================================

export interface AdminLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Loading text */
  text?: string;
}

export const AdminLoading = React.forwardRef<HTMLDivElement, AdminLoadingProps>(
  ({ className, text, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center py-16",
        className
      )}
      {...props}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {text && <p className={cn(TYPOGRAPHY.caption, "mt-3")}>{text}</p>}
    </div>
  )
);
AdminLoading.displayName = "AdminLoading";

// =============================================================================
// ADMIN GRID (responsive grid container)
// =============================================================================

export interface AdminGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns */
  cols?: 1 | 2 | 3 | 4;
  /** Gap size */
  gap?: "sm" | "md" | "lg";
}

export const AdminGrid = React.forwardRef<HTMLDivElement, AdminGridProps>(
  ({ className, cols = 4, gap = "md", children, ...props }, ref) => {
    const colsClass = {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
    }[cols];

    const gapClass = {
      sm: SPACING.sm,
      md: SPACING.md,
      lg: SPACING.lg,
    }[gap];

    return (
      <div
        ref={ref}
        className={cn("grid", colsClass, gapClass, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AdminGrid.displayName = "AdminGrid";

// =============================================================================
// ADMIN DIVIDER
// =============================================================================

export interface AdminDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label text */
  label?: string;
}

export const AdminDivider = React.forwardRef<HTMLDivElement, AdminDividerProps>(
  ({ className, label, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative flex items-center py-4", className)}
      {...props}
    >
      <div className={cn("flex-1 border-t", BORDERS.subtle)} />
      {label && (
        <>
          <span className={cn("px-3", TYPOGRAPHY.caption)}>{label}</span>
          <div className={cn("flex-1 border-t", BORDERS.subtle)} />
        </>
      )}
    </div>
  )
);
AdminDivider.displayName = "AdminDivider";

// =============================================================================
// ADMIN STAT ROW (inline stat display)
// =============================================================================

export interface AdminStatRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stat label */
  label: string;
  /** Stat value */
  value: React.ReactNode;
  /** Optional secondary value */
  secondary?: React.ReactNode;
}

export const AdminStatRow = React.forwardRef<HTMLDivElement, AdminStatRowProps>(
  ({ className, label, value, secondary, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between py-2.5",
        className
      )}
      {...props}
    >
      <span className={TYPOGRAPHY.inlineLabel}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={TYPOGRAPHY.value}>{value}</span>
        {secondary && (
          <span className={TYPOGRAPHY.caption}>{secondary}</span>
        )}
      </div>
    </div>
  )
);
AdminStatRow.displayName = "AdminStatRow";
