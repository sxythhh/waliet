import { Icon } from "@iconify/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface TrustScoreBreakdown {
  baseScore: number;
  accountAgeBonus: number;
  approvalRateBonus: number;
  rejectionPenalty: number;
  fraudHistoryPenalty: number;
  permanentFraudPenalty: number;
  totalScore: number;
}

export interface TrustScoreBadgeProps {
  score: number | null;
  showLabel?: boolean;
  showBreakdown?: boolean;
  breakdown?: TrustScoreBreakdown | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

type TrustLevel = 'excellent' | 'good' | 'moderate' | 'low' | 'very_low' | 'unknown';

function getTrustLevel(score: number | null): TrustLevel {
  if (score === null) return 'unknown';
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'very_low';
}

function getScoreColors(score: number | null): { bg: string; border: string; text: string } {
  if (score === null) {
    return { bg: "bg-muted", border: "border-t-muted-foreground/30", text: "text-muted-foreground" };
  }

  // Score 80-100: Emerald (excellent)
  if (score >= 80) {
    return { bg: "bg-emerald-500", border: "border-t-emerald-300", text: "text-white" };
  }
  // Score 60-79: Green (good)
  if (score >= 60) {
    return { bg: "bg-green-500", border: "border-t-green-300", text: "text-white" };
  }
  // Score 40-59: Amber (moderate)
  if (score >= 40) {
    return { bg: "bg-amber-500", border: "border-t-amber-300", text: "text-white" };
  }
  // Score 20-39: Orange (low)
  if (score >= 20) {
    return { bg: "bg-orange-500", border: "border-t-orange-300", text: "text-white" };
  }
  // Score 0-19: Red (very low)
  return { bg: "bg-red-500", border: "border-t-red-300", text: "text-white" };
}

const authenticityDescriptions: Record<TrustLevel, string> = {
  excellent: "Highly authentic creator with excellent track record",
  good: "Reliable creator with good approval history",
  moderate: "Creator with average performance metrics",
  low: "Creator with below-average metrics or recent issues",
  very_low: "Creator with significant authenticity concerns",
  unknown: "Not enough data to determine authenticity level"
};

const trustLabels: Record<TrustLevel, string> = {
  excellent: "Excellent",
  good: "Good",
  moderate: "Moderate",
  low: "Low",
  very_low: "Very Low",
  unknown: "Unknown"
};

const sizeConfig = {
  sm: {
    container: "h-6 px-1.5 gap-1",
    icon: "h-3.5 w-3.5",
    text: "text-[10px]",
  },
  md: {
    container: "h-7 px-2 gap-1.5",
    icon: "h-4 w-4",
    text: "text-xs",
  },
  lg: {
    container: "h-8 px-2.5 gap-1.5",
    icon: "h-5 w-5",
    text: "text-sm",
  }
};

export function TrustScoreBadge({
  score,
  showLabel = false,
  showBreakdown = true,
  breakdown,
  size = "sm",
  className
}: TrustScoreBadgeProps) {
  const trustLevel = getTrustLevel(score);
  const sizes = sizeConfig[size];
  const colors = getScoreColors(score);

  const displayScore = score !== null ? Math.round(score) : null;

  const badge = (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-md cursor-help",
        "border-t font-semibold",
        colors.bg,
        colors.border,
        colors.text,
        sizes.container,
        sizes.text,
        className
      )}
    >
      <Icon icon="material-symbols:shield-person" className={sizes.icon} />
      <span>{displayScore !== null ? displayScore : "?"}</span>
      {showLabel && (
        <span className="ml-1 font-normal opacity-90">Authenticity</span>
      )}
    </div>
  );

  if (!showBreakdown) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          <div className="space-y-2">
            <p className="font-medium text-sm">
              Authenticity: {trustLabels[trustLevel]}
            </p>
            <p className="text-xs text-muted-foreground">{authenticityDescriptions[trustLevel]}</p>

            {score !== null && (
              <div className="flex items-center gap-3 pt-1 text-xs border-t border-border/50">
                <span className="text-muted-foreground">
                  Score: <span className="font-medium text-foreground">{Math.round(score)}/100</span>
                </span>
              </div>
            )}

            {breakdown && (
              <div className="pt-1 border-t border-border/50 space-y-1">
                <p className="text-xs font-medium">Score Breakdown</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  <span className="text-muted-foreground">Base Score:</span>
                  <span className="font-medium">+{breakdown.baseScore}</span>

                  <span className="text-muted-foreground">Account Age:</span>
                  <span className="font-medium text-green-500">+{breakdown.accountAgeBonus.toFixed(1)}</span>

                  <span className="text-muted-foreground">Approval Rate:</span>
                  <span className="font-medium text-green-500">+{breakdown.approvalRateBonus.toFixed(1)}</span>

                  {breakdown.rejectionPenalty > 0 && (
                    <>
                      <span className="text-muted-foreground">Rejections:</span>
                      <span className="font-medium text-red-500">-{breakdown.rejectionPenalty.toFixed(1)}</span>
                    </>
                  )}

                  {breakdown.fraudHistoryPenalty > 0 && (
                    <>
                      <span className="text-muted-foreground">Fraud Flags:</span>
                      <span className="font-medium text-red-500">-{breakdown.fraudHistoryPenalty}</span>
                    </>
                  )}

                  {breakdown.permanentFraudPenalty > 0 && (
                    <>
                      <span className="text-muted-foreground">Perm. Flag:</span>
                      <span className="font-medium text-red-500">-{breakdown.permanentFraudPenalty}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
              Higher scores indicate more authentic creators based on approval history, account age, and fraud record.
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { getTrustLevel, type TrustLevel };
