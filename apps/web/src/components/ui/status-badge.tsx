import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Pause, Circle } from "lucide-react";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
  {
    variants: {
      status: {
        // Success states
        active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
        live: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
        verified: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
        approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
        completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
        paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",

        // Warning states
        pending: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
        review: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
        processing: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",

        // Error states
        rejected: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
        failed: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
        declined: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",

        // Neutral states
        expired: "bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400",
        ended: "bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400",
        inactive: "bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400",

        // Info states
        paused: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
        draft: "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400",
        scheduled: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
      },
      size: {
        sm: "text-2xs px-2 py-0 gap-1",
        default: "text-xs px-2.5 py-0.5 gap-1.5",
        lg: "text-sm px-3 py-1 gap-2",
      },
    },
    defaultVariants: {
      status: "pending",
      size: "default",
    },
  }
);

const statusIcons: Record<string, React.ElementType> = {
  // Success
  active: CheckCircle2,
  live: CheckCircle2,
  verified: CheckCircle2,
  approved: CheckCircle2,
  completed: CheckCircle2,
  paid: CheckCircle2,
  // Warning
  pending: Clock,
  review: Clock,
  processing: Clock,
  // Error
  rejected: XCircle,
  failed: XCircle,
  declined: XCircle,
  // Neutral
  expired: AlertTriangle,
  ended: AlertTriangle,
  inactive: Circle,
  // Info
  paused: Pause,
  draft: Clock,
  scheduled: Clock,
};

const iconSizes = {
  sm: "h-3 w-3",
  default: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  showIcon?: boolean;
  label?: string;
}

export function StatusBadge({
  status,
  size = "default",
  showIcon = true,
  label,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const Icon = status ? statusIcons[status] : null;
  const displayLabel = label || children || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "");

  return (
    <span
      className={cn(statusBadgeVariants({ status, size }), className)}
      {...props}
    >
      {showIcon && Icon && <Icon className={iconSizes[size]} />}
      {displayLabel}
    </span>
  );
}

StatusBadge.displayName = "StatusBadge";

export { statusBadgeVariants };
