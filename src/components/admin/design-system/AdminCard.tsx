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
        "bg-white/[0.03] rounded-xl border border-white/[0.06]",
        "hover:border-white/[0.1] transition-all duration-200",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-white font-inter tracking-[-0.5px]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-white/40 font-inter tracking-[-0.5px] mt-0.5">
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
  icon?: ReactNode;
  color?: "default" | "green" | "red" | "orange" | "blue" | "purple" | "cyan";
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  default: "text-white",
  green: "text-green-400",
  red: "text-red-400",
  orange: "text-orange-400",
  blue: "text-blue-400",
  purple: "text-purple-400",
  cyan: "text-cyan-400",
};

export function AdminStatCard({
  label,
  value,
  change,
  icon,
  color = "default",
  onClick,
  className,
}: AdminStatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white/[0.03] rounded-xl p-5",
        "border border-white/[0.04] hover:border-white/[0.08]",
        "transition-all duration-200",
        onClick && "cursor-pointer hover:bg-white/[0.04]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 font-inter tracking-[-0.5px]">{label}</p>
        {change && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold font-inter",
              change.isPositive ? "text-green-400" : "text-red-400"
            )}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(!change.isPositive && "rotate-180")}
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
            {change.value.toFixed(0)}%
          </div>
        )}
        {icon && !change && <div className="text-white/30">{icon}</div>}
      </div>
      <div className={cn("text-2xl font-bold font-inter tracking-[-0.5px]", colorClasses[color])}>
        {value}
      </div>
    </div>
  );
}

// Compact secondary stat card
export function AdminMiniStatCard({
  label,
  value,
  color = "default",
  className,
}: Omit<AdminStatCardProps, "change" | "icon" | "onClick">) {
  return (
    <div
      className={cn(
        "bg-white/[0.02] rounded-xl p-4",
        "border border-white/[0.03]",
        className
      )}
    >
      <div className={cn("text-lg font-bold font-inter tracking-[-0.5px]", colorClasses[color])}>
        {value}
      </div>
      <p className="text-[10px] text-white/40 font-inter tracking-[-0.5px]">{label}</p>
    </div>
  );
}
