import { Progress } from "@/components/ui/progress";

interface TrustScoreProgressProps {
  score: number;
  showLabel?: boolean;
}

export function TrustScoreProgress({ score, showLabel = true }: TrustScoreProgressProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-success";
    if (score >= 50) return "bg-warning";
    return "bg-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Attention";
  };

  const label = getScoreLabel(score);
  const color = getScoreColor(score);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Trust Score</span>
        <div className="flex items-center gap-2">
          {showLabel && (
            <span className={`text-sm font-semibold ${
              score >= 70 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive"
            }`}>
              {label}
            </span>
          )}
          <span className="text-sm font-bold text-foreground">{score}%</span>
        </div>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`absolute inset-y-0 left-0 ${color} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
