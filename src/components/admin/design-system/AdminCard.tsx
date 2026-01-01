import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AdminCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  noPadding?: boolean;
}

export function AdminCard({
  children,
  className,
  title,
  subtitle,
  action,
  noPadding = false,
}: AdminCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-card",
        "border border-border",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-foreground font-inter tracking-[-0.3px]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-muted-foreground font-inter tracking-[-0.2px] mt-0.5">
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

// Compact variant for small stat cards
interface AdminStatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export function AdminStatCard({
  label,
  value,
  change,
  onClick,
  className,
}: AdminStatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-5 overflow-hidden",
        "bg-muted/30",
        "border border-border",
        onClick && "cursor-pointer hover:bg-muted/50",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-inter font-medium tracking-[-0.2px]">
          {label}
        </p>
        {change && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold font-inter px-1.5 py-0.5 rounded-full",
              "text-foreground bg-muted"
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
            {change.value.toFixed(0)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold font-inter tracking-[-0.5px] text-foreground">
        {value}
      </div>
    </div>
  );
}

// Mini stat card - more compact
export function AdminMiniStatCard({
  label,
  value,
  className,
}: Omit<AdminStatCardProps, "change" | "onClick">) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 overflow-hidden",
        "bg-muted/20",
        "border border-border",
        className
      )}
    >
      <div className="text-lg font-semibold font-inter tracking-[-0.5px] mb-0.5 text-foreground">
        {value}
      </div>
      <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.2px]">
        {label}
      </p>
    </div>
  );
}
