import { cn } from "@/lib/utils";

interface AdminMetricProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

export function AdminMetric({
  label,
  value,
  change,
  onClick,
  className,
}: AdminMetricProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-5",
        "bg-card dark:bg-[#0e0e0e]",
        "border border-border/50",
        onClick && "cursor-pointer hover:border-border transition-all duration-200",
        className
      )}
    >
      <p className="text-xs text-muted-foreground font-inter font-medium tracking-[-0.3px] mb-3">
        {label}
      </p>

      <div className="flex items-end justify-between gap-3">
        <div className="text-2xl font-semibold font-inter tracking-[-0.5px] text-foreground tabular-nums">
          {value}
        </div>

        {change && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold font-inter tracking-[-0.3px]",
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
      </div>

      {change?.label && (
        <p className="text-[10px] text-muted-foreground/60 font-inter tracking-[-0.3px] mt-2">
          {change.label}
        </p>
      )}
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

export function AdminAlertMetric({
  label,
  value,
  severity,
  onClick,
  className,
}: AdminAlertMetricProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-5 border",
        "bg-card dark:bg-[#0e0e0e] border-border/50",
        onClick && "cursor-pointer hover:border-border transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            severity === "critical" && "bg-red-500 animate-pulse",
            severity === "warning" && "bg-amber-500",
            severity === "info" && "bg-blue-500"
          )}
        />
        <p className="text-xs text-muted-foreground font-inter font-medium tracking-[-0.3px]">
          {label}
        </p>
      </div>
      <div className="text-2xl font-semibold font-inter tracking-[-0.5px] text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}
