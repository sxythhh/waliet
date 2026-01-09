import { Check, X, TrendingUp, Clock, Eye, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CreatorTier, PerformanceSnapshot, calculateTierProgress } from "@/types/creatorTiers";
import { CreatorTierBadge } from "./CreatorTierBadge";

interface CreatorTierProgressProps {
  currentTier: CreatorTier;
  nextTier?: CreatorTier;
  currentMetrics: PerformanceSnapshot;
  className?: string;
}

export function CreatorTierProgress({
  currentTier,
  nextTier,
  currentMetrics,
  className,
}: CreatorTierProgressProps) {
  if (!nextTier) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <div className="flex items-center gap-3">
          <CreatorTierBadge
            tierName={currentTier.name}
            tierLevel={currentTier.level}
            tierColor={currentTier.color}
            size="lg"
          />
          <div>
            <p className="text-sm font-medium font-inter tracking-[-0.5px]">
              You've reached the highest tier!
            </p>
            <p className="text-xs text-muted-foreground">
              Keep up the great work
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { overallProgress, criteriaProgress } = calculateTierProgress(
    currentMetrics,
    nextTier.promotion_criteria
  );

  const allCriteriaMet = criteriaProgress.every((c) => c.met);

  const getCriteriaIcon = (name: string) => {
    switch (name) {
      case "Months Active":
        return <Clock className="h-3.5 w-3.5" />;
      case "Avg Views":
        return <Eye className="h-3.5 w-3.5" />;
      case "Completion Rate":
        return <Target className="h-3.5 w-3.5" />;
      case "Engagement Rate":
        return <TrendingUp className="h-3.5 w-3.5" />;
      default:
        return <Target className="h-3.5 w-3.5" />;
    }
  };

  const formatValue = (name: string, value: number) => {
    if (name === "Avg Views") {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString();
    }
    if (name.includes("Rate")) {
      return `${value.toFixed(1)}%`;
    }
    return value.toString();
  };

  return (
    <div className={cn("rounded-lg border p-4 space-y-4", className)}>
      {/* Header with current and next tier */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreatorTierBadge
            tierName={currentTier.name}
            tierLevel={currentTier.level}
            tierColor={currentTier.color}
            size="sm"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <CreatorTierBadge
            tierName={nextTier.name}
            tierLevel={nextTier.level}
            tierColor={nextTier.color}
            size="sm"
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {Math.round(overallProgress)}% complete
        </span>
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-1">
        <Progress
          value={overallProgress}
          className="h-2"
          style={
            {
              "--progress-color": nextTier.color,
            } as React.CSSProperties
          }
        />
      </div>

      {/* Criteria Breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {criteriaProgress.map((criteria) => (
          <div
            key={criteria.name}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg text-xs",
              criteria.met ? "bg-green-500/10" : "bg-muted/30"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full",
                criteria.met ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {criteria.met ? (
                <Check className="h-3 w-3" />
              ) : (
                getCriteriaIcon(criteria.name)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-medium truncate font-inter tracking-[-0.5px]",
                  criteria.met ? "text-green-600" : "text-foreground"
                )}
              >
                {criteria.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatValue(criteria.name, criteria.current)} /{" "}
                {formatValue(criteria.name, criteria.required)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Status Message */}
      {allCriteriaMet ? (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 text-green-600">
          <Check className="h-4 w-4" />
          <p className="text-xs font-medium font-inter tracking-[-0.5px]">
            You're eligible for promotion! It will be processed at the end of the month.
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground text-center">
          Meet all criteria to be promoted to {nextTier.name} tier
        </p>
      )}
    </div>
  );
}
