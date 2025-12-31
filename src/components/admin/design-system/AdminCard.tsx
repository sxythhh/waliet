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
        "rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-white/[0.06] to-white/[0.02]",
        "backdrop-blur-xl",
        "border border-white/[0.06]",
        "transition-all duration-300",
        "hover:border-white/[0.1]",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-white font-inter tracking-[-0.3px]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-white/40 font-inter tracking-[-0.2px] mt-0.5">
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
  green: "text-emerald-400",
  red: "text-red-400",
  orange: "text-amber-400",
  blue: "text-blue-400",
  purple: "text-purple-400",
  cyan: "text-cyan-400",
};

const colorBgClasses = {
  default: "from-white/[0.06] to-white/[0.02]",
  green: "from-emerald-500/10 to-emerald-500/5",
  red: "from-red-500/10 to-red-500/5",
  orange: "from-amber-500/10 to-amber-500/5",
  blue: "from-blue-500/10 to-blue-500/5",
  purple: "from-purple-500/10 to-purple-500/5",
  cyan: "from-cyan-500/10 to-cyan-500/5",
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
        "rounded-2xl p-5 overflow-hidden",
        "bg-gradient-to-br backdrop-blur-xl",
        colorBgClasses[color],
        "border border-white/[0.06]",
        "transition-all duration-300",
        "hover:border-white/[0.1]",
        "hover:shadow-lg hover:shadow-black/10",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/50 font-inter font-medium tracking-[-0.2px]">{label}</p>
        {change && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold font-inter px-1.5 py-0.5 rounded-full",
              change.isPositive
                ? "text-emerald-400 bg-emerald-500/15"
                : "text-red-400 bg-red-500/15"
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
        {icon && !change && <div className="text-white/30">{icon}</div>}
      </div>
      <div className={cn("text-2xl font-semibold font-inter tracking-[-0.5px]", colorClasses[color])}>
        {value}
      </div>
    </div>
  );
}

// Mini stat card - more compact
export function AdminMiniStatCard({
  label,
  value,
  color = "default",
  className,
}: Omit<AdminStatCardProps, "change" | "icon" | "onClick">) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 overflow-hidden",
        "bg-gradient-to-br backdrop-blur-xl",
        "from-white/[0.04] to-white/[0.01]",
        "border border-white/[0.04]",
        "transition-all duration-300",
        "hover:border-white/[0.08]",
        className
      )}
    >
      <div className={cn("text-lg font-semibold font-inter tracking-[-0.5px] mb-0.5", colorClasses[color])}>
        {value}
      </div>
      <p className="text-[10px] text-white/40 font-inter tracking-[-0.2px]">{label}</p>
    </div>
  );
}
