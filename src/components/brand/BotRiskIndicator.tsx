import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BotRiskIndicatorProps {
  botScore?: number | null;
  trustScore?: number | null;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

type RiskLevel = "low" | "medium" | "high" | "unknown";

function getRiskLevel(botScore?: number | null, trustScore?: number | null): RiskLevel {
  // If no scores available, return unknown
  if ((botScore === null || botScore === undefined) && 
      (trustScore === null || trustScore === undefined)) {
    return "unknown";
  }

  // Calculate risk based on available scores
  const normalizedBotScore = botScore ?? 0;
  const normalizedTrustScore = trustScore ?? 100;

  // High risk: high bot score OR low trust score
  if (normalizedBotScore > 50 || normalizedTrustScore < 40) {
    return "high";
  }

  // Medium risk: moderate bot score OR moderate trust score
  if (normalizedBotScore > 20 || normalizedTrustScore < 70) {
    return "medium";
  }

  // Low risk: low bot score AND high trust score
  return "low";
}

const riskConfig: Record<RiskLevel, {
  label: string;
  color: string;
  bgColor: string;
  Icon: typeof Shield;
  description: string;
}> = {
  low: {
    label: "Low Risk",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    Icon: ShieldCheck,
    description: "This submission appears authentic with normal engagement patterns"
  },
  medium: {
    label: "Medium Risk",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    Icon: Shield,
    description: "Some indicators suggest potential artificial engagement"
  },
  high: {
    label: "High Risk",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    Icon: ShieldAlert,
    description: "Multiple indicators suggest artificial or bot-driven engagement"
  },
  unknown: {
    label: "Unknown",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    Icon: ShieldQuestion,
    description: "Not enough data to determine authenticity"
  }
};

const sizeConfig = {
  sm: {
    icon: "h-3.5 w-3.5",
    text: "text-[10px]",
    padding: "px-1.5 py-0.5"
  },
  md: {
    icon: "h-4 w-4",
    text: "text-xs",
    padding: "px-2 py-1"
  },
  lg: {
    icon: "h-5 w-5",
    text: "text-sm",
    padding: "px-3 py-1.5"
  }
};

export function BotRiskIndicator({
  botScore,
  trustScore,
  showLabel = true,
  size = "sm",
  className
}: BotRiskIndicatorProps) {
  const riskLevel = getRiskLevel(botScore, trustScore);
  const config = riskConfig[riskLevel];
  const sizes = sizeConfig[size];
  const Icon = config.Icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn(
              config.bgColor,
              config.color,
              sizes.padding,
              sizes.text,
              "font-medium cursor-help border-0 gap-1",
              className
            )}
          >
            <Icon className={sizes.icon} />
            {showLabel && <span>{config.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px]">
          <div className="space-y-1.5">
            <p className="font-medium text-sm">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {(botScore !== null && botScore !== undefined) || (trustScore !== null && trustScore !== undefined) ? (
              <div className="flex items-center gap-3 pt-1 text-xs">
                {botScore !== null && botScore !== undefined && (
                  <span className="text-muted-foreground">
                    Bot Score: <span className="font-medium text-foreground">{botScore.toFixed(0)}%</span>
                  </span>
                )}
                {trustScore !== null && trustScore !== undefined && (
                  <span className="text-muted-foreground">
                    Trust: <span className="font-medium text-foreground">{trustScore.toFixed(0)}%</span>
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { getRiskLevel, type RiskLevel };
