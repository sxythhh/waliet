import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AudienceScoreIndicatorProps {
  score: number | null | undefined;
  className?: string;
}

const getScoreLabel = (score: number): { label: string; color: string } => {
  if (score >= 70) return { label: "Very Good", color: "bg-emerald-500" };
  if (score >= 50) return { label: "Good", color: "bg-emerald-500" };
  if (score >= 40) return { label: "Average", color: "bg-amber-500" };
  if (score >= 25) return { label: "Bad", color: "bg-amber-500" };
  return { label: "Very Bad", color: "bg-amber-600" };
};

const getFilledSteps = (score: number): number => {
  if (score >= 70) return 5;
  if (score >= 50) return 4;
  if (score >= 40) return 3;
  if (score >= 25) return 2;
  return 1;
};

export function AudienceScoreIndicator({ score, className }: AudienceScoreIndicatorProps) {
  if (score === null || score === undefined) {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <span className="text-[10px] font-inter tracking-[-0.3px] text-muted-foreground/70">
          Score: <span className="text-muted-foreground">Not submitted</span>
        </span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className="h-2 w-4 rounded-full bg-muted/30"
            />
          ))}
        </div>
      </div>
    );
  }

  const { label, color } = getScoreLabel(score);
  const filledSteps = getFilledSteps(score);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex flex-col gap-0.5", className)}>
            <span className="text-[10px] font-inter tracking-[-0.3px] text-muted-foreground">
              Score: <span className="text-foreground font-medium">{label}</span>
            </span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-2 w-4 rounded-full transition-colors",
                    step <= filledSteps ? color : "bg-muted/50"
                  )}
                />
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-inter tracking-[-0.3px]">
          <p className="text-xs">Audience Score: {score}%</p>
          <p className="text-[10px] text-muted-foreground">Based on Tier 1 audience percentage</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
