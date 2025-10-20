import { Circle } from "lucide-react";

interface TrustScoreIndicatorProps {
  score: number;
  showPercentage?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function TrustScoreIndicator({ 
  score, 
  showPercentage = true, 
  showLabel = false,
  size = "md" 
}: TrustScoreIndicatorProps) {
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Attention";
  };

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const dotSizes = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4"
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Circle
            key={i}
            className={`${dotSizes[size]} ${i < Math.ceil(score / 20) ? color : "text-muted"} ${i < Math.ceil(score / 20) ? "fill-current" : ""}`}
          />
        ))}
      </div>
      {showPercentage && (
        <span className={`text-sm font-medium ${color}`}>
          {score}%
        </span>
      )}
      {showLabel && (
        <span className={`text-sm font-medium ${color}`}>
          {label}
        </span>
      )}
    </div>
  );
}
