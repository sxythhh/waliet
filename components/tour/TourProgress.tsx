import { cn } from "@/lib/utils";

interface TourProgressProps {
  currentIndex: number;
  totalSteps: number;
  maxVisible?: number;
}

export function TourProgress({
  currentIndex,
  totalSteps,
  maxVisible = 7,
}: TourProgressProps) {
  // For many steps, show a sliding window of dots
  const showAllDots = totalSteps <= maxVisible;

  if (showAllDots) {
    return (
      <div className="flex items-center justify-center gap-1">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1 rounded-[2px] transition-all duration-200",
              index === currentIndex
                ? "w-5 bg-primary"
                : index < currentIndex
                ? "w-3 bg-white/30"
                : "w-3 bg-white/15"
            )}
          />
        ))}
      </div>
    );
  }

  // Sliding window for many steps
  const windowStart = Math.max(0, Math.min(currentIndex - 3, totalSteps - maxVisible));
  const visibleIndices = Array.from({ length: maxVisible }, (_, i) => windowStart + i);

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Leading ellipsis */}
      {windowStart > 0 && (
        <div className="w-2 h-1 rounded-[2px] bg-white/10" />
      )}

      {visibleIndices.map((index) => (
        <div
          key={index}
          className={cn(
            "h-1 rounded-[2px] transition-all duration-200",
            index === currentIndex
              ? "w-5 bg-primary"
              : index < currentIndex
              ? "w-3 bg-white/30"
              : "w-3 bg-white/15"
          )}
        />
      ))}

      {/* Trailing ellipsis */}
      {windowStart + maxVisible < totalSteps && (
        <div className="w-2 h-1 rounded-[2px] bg-white/10" />
      )}

      {/* Step counter */}
      <span className="ml-2 text-[11px] text-white/40 tabular-nums">
        {currentIndex + 1}/{totalSteps}
      </span>
    </div>
  );
}
