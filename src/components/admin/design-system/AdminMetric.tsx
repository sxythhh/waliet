import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparklineData {
  value: number;
}

interface AdminMetricProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  sparkline?: SparklineData[];
  icon?: ReactNode;
  color?: "default" | "green" | "red" | "orange" | "blue" | "purple" | "cyan";
  onClick?: () => void;
  className?: string;
  size?: "default" | "large";
}

const sparklineColors = {
  default: "rgba(255,255,255,0.5)",
  green: "#34d399",
  red: "#f87171",
  orange: "#fb923c",
  blue: "#60a5fa",
  purple: "#c084fc",
  cyan: "#22d3ee",
};

export function AdminMetric({
  label,
  value,
  change,
  sparkline,
  icon,
  color = "default",
  onClick,
  className,
  size = "default",
}: AdminMetricProps) {
  const isLarge = size === "large";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-white/[0.08] to-white/[0.02]",
        "backdrop-blur-xl",
        "border border-white/[0.08]",
        "transition-all duration-300 ease-out",
        "hover:from-white/[0.1] hover:to-white/[0.04]",
        "hover:border-white/[0.12]",
        "hover:shadow-lg hover:shadow-black/20",
        onClick && "cursor-pointer",
        isLarge ? "p-6" : "p-5",
        className
      )}
    >
      {/* Sparkline background */}
      {sparkline && sparkline.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${label.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColors[color]} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={sparklineColors[color]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparklineColors[color]}
                strokeWidth={1.5}
                fill={`url(#gradient-${label.replace(/\s/g, '-')})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="relative z-10">
        {/* Label */}
        <div className="flex items-center gap-2 mb-3">
          {icon && <div className="text-white/40">{icon}</div>}
          <p className={cn(
            "text-white/50 font-inter font-medium tracking-[-0.2px]",
            isLarge ? "text-sm" : "text-xs"
          )}>
            {label}
          </p>
        </div>

        {/* Value + Change Row */}
        <div className="flex items-end justify-between gap-3">
          <div
            className={cn(
              "font-semibold font-inter tracking-[-0.5px] text-white",
              isLarge ? "text-3xl" : "text-2xl"
            )}
          >
            {value}
          </div>

          {change && (
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium font-inter",
                change.isPositive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/15 text-red-400"
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
        </div>

        {/* Subtext */}
        {change?.label && (
          <p className="text-[10px] text-white/30 font-inter tracking-[-0.2px] mt-2">
            {change.label}
          </p>
        )}
      </div>
    </div>
  );
}

// Alert metric card for urgent items
interface AdminAlertMetricProps {
  label: string;
  value: string | number;
  severity: "info" | "warning" | "critical";
  onClick?: () => void;
  className?: string;
}

const severityStyles = {
  info: {
    bg: "from-blue-500/10 to-blue-500/5",
    border: "border-blue-500/20",
    value: "text-blue-400",
    dot: "bg-blue-400",
  },
  warning: {
    bg: "from-amber-500/10 to-amber-500/5",
    border: "border-amber-500/20",
    value: "text-amber-400",
    dot: "bg-amber-400",
  },
  critical: {
    bg: "from-red-500/15 to-red-500/5",
    border: "border-red-500/25",
    value: "text-red-400",
    dot: "bg-red-400 animate-pulse",
  },
};

export function AdminAlertMetric({
  label,
  value,
  severity,
  onClick,
  className,
}: AdminAlertMetricProps) {
  const styles = severityStyles[severity];

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl p-5 border transition-all duration-300 ease-out",
        "bg-gradient-to-br backdrop-blur-xl",
        styles.bg,
        styles.border,
        "hover:border-opacity-60",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-1.5 h-1.5 rounded-full", styles.dot)} />
        <p className="text-xs text-white/50 font-inter font-medium tracking-[-0.2px]">{label}</p>
      </div>
      <div className={cn("text-2xl font-semibold font-inter tracking-[-0.5px]", styles.value)}>
        {value}
      </div>
    </div>
  );
}
