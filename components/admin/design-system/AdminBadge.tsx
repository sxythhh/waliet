import * as React from "react";
import { cn } from "@/lib/utils";
import { STATUS, RADII, TYPOGRAPHY } from "@/lib/admin-tokens";

// =============================================================================
// TYPES
// =============================================================================

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

// =============================================================================
// ADMIN BADGE
// =============================================================================

export interface AdminBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Badge variant determines color */
  variant?: BadgeVariant;
  /** Dot indicator style (minimal) */
  dot?: boolean;
  /** Outlined style */
  outline?: boolean;
  /** Size variant */
  size?: "sm" | "default";
}

export const AdminBadge = React.forwardRef<HTMLSpanElement, AdminBadgeProps>(
  (
    {
      className,
      variant = "neutral",
      dot = false,
      outline = false,
      size = "default",
      children,
      ...props
    },
    ref
  ) => {
    const colors = STATUS[variant];

    const sizeClasses = {
      sm: "px-1.5 py-0.5 text-[10px]",
      default: "px-2 py-0.5 text-xs",
    };

    if (dot) {
      return (
        <span
          ref={ref}
          className={cn(
            "inline-flex items-center gap-1.5",
            "font-medium font-inter tracking-[-0.3px]",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              variant === "success" && "bg-emerald-500",
              variant === "warning" && "bg-amber-500",
              variant === "error" && "bg-red-500",
              variant === "info" && "bg-blue-500",
              variant === "neutral" && "bg-muted-foreground"
            )}
          />
          {children}
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center",
          "rounded-full",
          "font-semibold font-inter tracking-[-0.3px]",
          sizeClasses[size],
          outline
            ? cn("border", colors.border, colors.text, "bg-transparent")
            : cn(colors.bg, colors.text),
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
AdminBadge.displayName = "AdminBadge";

// =============================================================================
// ADMIN STATUS BADGE (semantic shorthand)
// =============================================================================

export interface AdminStatusBadgeProps
  extends Omit<AdminBadgeProps, "variant"> {
  /** Status type */
  status:
    | "active"
    | "inactive"
    | "pending"
    | "completed"
    | "failed"
    | "draft"
    | "published"
    | "archived"
    | "new"
    | "processing"
    | "approved"
    | "rejected"
    | "expired"
    | "paused";
}

const statusToVariant: Record<AdminStatusBadgeProps["status"], BadgeVariant> = {
  active: "success",
  inactive: "neutral",
  pending: "warning",
  completed: "success",
  failed: "error",
  draft: "neutral",
  published: "success",
  archived: "neutral",
  new: "info",
  processing: "warning",
  approved: "success",
  rejected: "error",
  expired: "error",
  paused: "warning",
};

const statusLabels: Record<AdminStatusBadgeProps["status"], string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  new: "New",
  processing: "Processing",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  paused: "Paused",
};

export const AdminStatusBadge = React.forwardRef<
  HTMLSpanElement,
  AdminStatusBadgeProps
>(({ status, children, ...props }, ref) => (
  <AdminBadge ref={ref} variant={statusToVariant[status]} {...props}>
    {children || statusLabels[status]}
  </AdminBadge>
));
AdminStatusBadge.displayName = "AdminStatusBadge";

// =============================================================================
// ADMIN COUNT BADGE (for notifications/counts)
// =============================================================================

export interface AdminCountBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Count value */
  count: number;
  /** Max count before showing "+" */
  max?: number;
  /** Variant */
  variant?: BadgeVariant;
}

export const AdminCountBadge = React.forwardRef<
  HTMLSpanElement,
  AdminCountBadgeProps
>(({ className, count, max = 99, variant = "neutral", ...props }, ref) => {
  const colors = STATUS[variant];
  const displayCount = count > max ? `${max}+` : count;

  if (count === 0) return null;

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-[18px] h-[18px] px-1.5",
        "rounded-full",
        "text-[10px] font-semibold font-inter tracking-[-0.3px] tabular-nums",
        colors.bg,
        colors.text,
        className
      )}
      {...props}
    >
      {displayCount}
    </span>
  );
});
AdminCountBadge.displayName = "AdminCountBadge";

// =============================================================================
// ADMIN PLATFORM BADGE (for social platforms)
// =============================================================================

export interface AdminPlatformBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  platform: "tiktok" | "instagram" | "youtube" | "twitter" | "snapchat" | "facebook";
  showLabel?: boolean;
}

const platformColors: Record<AdminPlatformBadgeProps["platform"], string> = {
  tiktok: "bg-[#000000] text-white",
  instagram: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white",
  youtube: "bg-[#FF0000] text-white",
  twitter: "bg-[#1DA1F2] text-white",
  snapchat: "bg-[#FFFC00] text-black",
  facebook: "bg-[#1877F2] text-white",
};

const platformLabels: Record<AdminPlatformBadgeProps["platform"], string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter",
  snapchat: "Snapchat",
  facebook: "Facebook",
};

export const AdminPlatformBadge = React.forwardRef<
  HTMLSpanElement,
  AdminPlatformBadgeProps
>(({ className, platform, showLabel = true, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center",
      "px-2 py-0.5",
      "rounded-full",
      "text-xs font-medium font-inter tracking-[-0.3px]",
      platformColors[platform],
      className
    )}
    {...props}
  >
    {showLabel && platformLabels[platform]}
  </span>
));
AdminPlatformBadge.displayName = "AdminPlatformBadge";
