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
  default: "#ffffff",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f97316",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#06b6d4",
};

const valueColors = {
  default: "text-white",
  green: "text-green-400",
  red: "text-red-400",
  orange: "text-orange-400",
  blue: "text-blue-400",
  purple: "text-purple-400",
  cyan: "text-cyan-400",
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
        "relative bg-white/[0.03] rounded-xl overflow-hidden",
        "border border-white/[0.04] hover:border-white/[0.1]",
        "transition-all duration-200",
        onClick && "cursor-pointer hover:bg-white/[0.05]",
        isLarge ? "p-6" : "p-5",
        className
      )}
    >
      {/* Sparkline background */}
      {sparkline && sparkline.length > 1 && (
        <div className="absolute inset-0 opacity-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColors[color]} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={sparklineColors[color]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparklineColors[color]}
                strokeWidth={1.5}
                fill={`url(#gradient-${label})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && <div className="text-white/40">{icon}</div>}
            <p className={cn(
              "text-white/40 font-inter tracking-[-0.5px]",
              isLarge ? "text-sm" : "text-xs"
            )}>
              {label}
            </p>
          </div>
          {change && (
            <div
              className={cn(
                "flex items-center gap-1 font-semibold font-inter",
                isLarge ? "text-xs" : "text-[10px]",
                change.isPositive ? "text-green-400" : "text-red-400"
              )}
            >
              <svg
                width={isLarge ? 14 : 12}
                height={isLarge ? 14 : 12}
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
              {Math.abs(change.value).toFixed(0)}%
            </div>
          )}
        </div>

        {/* Value */}
        <div
          className={cn(
            "font-bold font-inter tracking-[-0.5px]",
            valueColors[color],
            isLarge ? "text-3xl" : "text-2xl"
          )}
        >
          {value}
        </div>

        {/* Subtext */}
        {change?.label && (
          <p className="text-[10px] text-white/30 font-inter tracking-[-0.5px] mt-1">
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
    bg: "bg-blue-500/10",
    border: "border-blue-500/20 hover:border-blue-500/40",
    value: "text-blue-400",
    pulse: "",
  },
  warning: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20 hover:border-orange-500/40",
    value: "text-orange-400",
    pulse: "",
  },
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/20 hover:border-red-500/40",
    value: "text-red-400",
    pulse: "animate-pulse",
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
        "rounded-xl p-5 border transition-all duration-200",
        styles.bg,
        styles.border,
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {severity === "critical" && (
          <div className={cn("w-2 h-2 rounded-full bg-red-500", styles.pulse)} />
        )}
        <p className="text-xs text-white/50 font-inter tracking-[-0.5px]">{label}</p>
      </div>
      <div className={cn("text-2xl font-bold font-inter tracking-[-0.5px]", styles.value)}>
        {value}
      </div>
    </div>
  );
}
