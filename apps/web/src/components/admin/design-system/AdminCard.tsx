import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { TYPOGRAPHY, BORDERS, BACKGROUNDS, TRANSITIONS } from "@/lib/admin-tokens";

// =============================================================================
// ADMIN CARD
// =============================================================================

interface AdminCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  noPadding?: boolean;
  /** Hoverable card */
  hoverable?: boolean;
}

export function AdminCard({
  children,
  className,
  title,
  subtitle,
  action,
  noPadding = false,
  hoverable = false,
}: AdminCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-card dark:bg-[#0e0e0e]",
        "border border-border/50",
        hoverable && "hover:border-border transition-all duration-200",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-foreground font-inter tracking-[-0.5px]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  );
}

// =============================================================================
// ADMIN STAT CARD - For metrics/KPIs
// =============================================================================

interface AdminStatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function AdminStatCard({
  label,
  value,
  change,
  icon,
  onClick,
  className,
}: AdminStatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-4 overflow-hidden",
        "bg-muted/30 dark:bg-muted/20",
        onClick && "cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/30",
        "transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-inter font-medium tracking-[-0.3px]">
          {label}
        </p>
        {change && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold font-inter px-1.5 py-0.5 rounded-full tracking-[-0.3px]",
              change.isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            <svg
              width={10}
              height={10}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(!change.isPositive && "rotate-180")}
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
            {Math.abs(change.value).toFixed(0)}%
          </div>
        )}
        {icon && !change && (
          <div className="text-muted-foreground/60">{icon}</div>
        )}
      </div>
      <div className="text-2xl font-semibold font-inter tracking-[-0.5px] text-foreground">
        {value}
      </div>
    </div>
  );
}

// =============================================================================
// ADMIN MINI STAT CARD - Compact version
// =============================================================================

interface AdminMiniStatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function AdminMiniStatCard({
  label,
  value,
  className,
}: AdminMiniStatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 overflow-hidden",
        "bg-muted/20 dark:bg-muted/10",
        className
      )}
    >
      <div className="text-lg font-semibold font-inter tracking-[-0.5px] mb-0.5 text-foreground">
        {value}
      </div>
      <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
        {label}
      </p>
    </div>
  );
}

// =============================================================================
// ADMIN METRIC CARD - Large featured metric
// =============================================================================

interface AdminMetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon?: ReactNode;
  className?: string;
}

export function AdminMetricCard({
  label,
  value,
  subtitle,
  change,
  icon,
  className,
}: AdminMetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-5 overflow-hidden",
        "bg-card dark:bg-[#0e0e0e]",
        "border border-border/50",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground font-inter font-medium tracking-[-0.3px]">
            {label}
          </p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground/60 font-inter tracking-[-0.2px] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-muted/30 dark:bg-muted/20 flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-semibold font-inter tracking-[-0.5px] text-foreground tabular-nums">
          {value}
        </div>
        {change && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium font-inter tracking-[-0.3px]",
              change.isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(!change.isPositive && "rotate-180")}
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
            {Math.abs(change.value).toFixed(1)}%
            {change.label && (
              <span className="text-muted-foreground ml-1">{change.label}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ADMIN INFO CARD - For contextual information
// =============================================================================

interface AdminInfoCardProps {
  children: ReactNode;
  variant?: "default" | "warning" | "error" | "success" | "info";
  className?: string;
}

export function AdminInfoCard({
  children,
  variant = "default",
  className,
}: AdminInfoCardProps) {
  const variantClasses = {
    default: "bg-muted/30 dark:bg-muted/20 border-border/50",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    error: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  };

  return (
    <div
      className={cn(
        "rounded-lg p-4 border",
        "text-sm font-inter tracking-[-0.3px]",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
