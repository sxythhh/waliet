import { cn } from "@/lib/utils";

interface UsageProgressBarProps {
  used: number;
  limit: number;
  label: string;
  className?: string;
}

export function UsageProgressBar({ used, limit, label, className }: UsageProgressBarProps) {
  const isUnlimited = !Number.isFinite(limit);
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium tracking-[-0.5px]">{label}</span>
        <span className="text-sm text-muted-foreground tracking-[-0.5px]">
          {used} / {isUnlimited ? "∞" : limit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 rounded-full",
            isAtLimit
              ? "bg-destructive"
              : isNearLimit
              ? "bg-amber-500"
              : "bg-primary"
          )}
          style={{ width: isUnlimited ? "0%" : `${percentage}%` }}
        />
      </div>
      {isAtLimit && !isUnlimited && (
        <p className="text-xs text-destructive">
          You've reached your limit. Upgrade your plan for more.
        </p>
      )}
      {isNearLimit && !isAtLimit && !isUnlimited && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          You're approaching your limit.
        </p>
      )}
    </div>
  );
}
