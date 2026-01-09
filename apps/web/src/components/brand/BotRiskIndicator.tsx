import { Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BotScoreBreakdown {
  commentAnalysis?: {
    botPatternScore: number;
    genericRatio: number;
    duplicateRatio: number;
    shortCommentRatio: number;
    totalComments: number;
    verdict: string;
  };
  userAnalysis?: {
    authenticityScore: number;
    flags: string[];
    followerCount: number;
    verified: boolean;
  };
  finalScore?: number;
  verdict?: string;
  analyzedAt?: string;
}

interface BotRiskIndicatorProps {
  botScore?: number | null;
  trustScore?: number | null;
  breakdown?: BotScoreBreakdown | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

type RiskLevel = "low" | "medium" | "high" | "unknown";

function getRiskLevel(botScore?: number | null, trustScore?: number | null): RiskLevel {
  if ((botScore === null || botScore === undefined) &&
      (trustScore === null || trustScore === undefined)) {
    return "unknown";
  }

  const normalizedBotScore = botScore ?? 0;
  const normalizedTrustScore = trustScore ?? 100;

  if (normalizedBotScore > 50 || normalizedTrustScore < 40) {
    return "high";
  }

  if (normalizedBotScore > 20 || normalizedTrustScore < 70) {
    return "medium";
  }

  return "low";
}

// Get background and border colors based on score (0-100 scale, green to red)
function getScoreColors(score: number | null | undefined): { bg: string; border: string; text: string } {
  if (score === null || score === undefined) {
    return { bg: "bg-muted", border: "border-t-muted-foreground/30", text: "text-muted-foreground" };
  }

  // Score 0-20: Green (low risk)
  if (score <= 20) {
    return { bg: "bg-emerald-600", border: "border-t-emerald-400", text: "text-white" };
  }
  // Score 21-35: Light green
  if (score <= 35) {
    return { bg: "bg-emerald-500", border: "border-t-emerald-300", text: "text-white" };
  }
  // Score 36-50: Yellow/amber (medium risk)
  if (score <= 50) {
    return { bg: "bg-amber-500", border: "border-t-amber-300", text: "text-white" };
  }
  // Score 51-70: Orange
  if (score <= 70) {
    return { bg: "bg-orange-500", border: "border-t-orange-300", text: "text-white" };
  }
  // Score 71-85: Red-orange
  if (score <= 85) {
    return { bg: "bg-red-500", border: "border-t-red-300", text: "text-white" };
  }
  // Score 86-100: Dark red (high risk)
  return { bg: "bg-red-600", border: "border-t-red-400", text: "text-white" };
}

const riskDescriptions: Record<RiskLevel, string> = {
  low: "This submission appears authentic with normal engagement patterns",
  medium: "Some indicators suggest potential artificial engagement",
  high: "Multiple indicators suggest artificial or bot-driven engagement",
  unknown: "Not enough data to determine authenticity"
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

export function BotRiskIndicator({
  botScore,
  trustScore,
  breakdown,
  size = "sm",
  className
}: BotRiskIndicatorProps) {
  const riskLevel = getRiskLevel(botScore, trustScore);
  const sizes = sizeConfig[size];
  const colors = getScoreColors(botScore);

  const displayScore = botScore !== null && botScore !== undefined
    ? Math.round(botScore)
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
            <Shield className={sizes.icon} />
            <span>{displayScore !== null ? displayScore : "?"}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          <div className="space-y-2">
            <p className="font-medium text-sm">
              {riskLevel === "low" ? "Low Risk" : riskLevel === "medium" ? "Medium Risk" : riskLevel === "high" ? "High Risk" : "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">{riskDescriptions[riskLevel]}</p>

            {(botScore !== null && botScore !== undefined) || (trustScore !== null && trustScore !== undefined) ? (
              <div className="flex items-center gap-3 pt-1 text-xs border-t border-border/50">
                {botScore !== null && botScore !== undefined && (
                  <span className="text-muted-foreground">
                    Bot Score: <span className="font-medium text-foreground">{botScore.toFixed(0)}</span>
                  </span>
                )}
                {trustScore !== null && trustScore !== undefined && (
                  <span className="text-muted-foreground">
                    Trust: <span className="font-medium text-foreground">{trustScore.toFixed(0)}</span>
                  </span>
                )}
              </div>
            ) : null}

            {breakdown?.commentAnalysis && (
              <div className="pt-1 border-t border-border/50 space-y-1">
                <p className="text-xs font-medium">Comment Analysis</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  <span className="text-muted-foreground">Generic:</span>
                  <span className="font-medium">{(breakdown.commentAnalysis.genericRatio * 100).toFixed(1)}%</span>
                  <span className="text-muted-foreground">Duplicates:</span>
                  <span className="font-medium">{(breakdown.commentAnalysis.duplicateRatio * 100).toFixed(1)}%</span>
                  <span className="text-muted-foreground">Short:</span>
                  <span className="font-medium">{(breakdown.commentAnalysis.shortCommentRatio * 100).toFixed(1)}%</span>
                  <span className="text-muted-foreground">Analyzed:</span>
                  <span className="font-medium">{breakdown.commentAnalysis.totalComments} comments</span>
                </div>
              </div>
            )}

            {breakdown?.userAnalysis && (
              <div className="pt-1 border-t border-border/50 space-y-1">
                <p className="text-xs font-medium">User Profile</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  <span className="text-muted-foreground">Authenticity:</span>
                  <span className="font-medium">{breakdown.userAnalysis.authenticityScore}%</span>
                  <span className="text-muted-foreground">Followers:</span>
                  <span className="font-medium">{breakdown.userAnalysis.followerCount.toLocaleString()}</span>
                  {breakdown.userAnalysis.verified && (
                    <>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-blue-500">Verified</span>
                    </>
                  )}
                </div>
                {breakdown.userAnalysis.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {breakdown.userAnalysis.flags.map((flag, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-[9px] bg-red-500/10 text-red-600 rounded">
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {breakdown?.verdict && (
              <div className="pt-1 border-t border-border/50 text-xs">
                <span className="text-muted-foreground">Verdict: </span>
                <span className="font-medium capitalize">{breakdown.verdict.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { getRiskLevel, type RiskLevel };
