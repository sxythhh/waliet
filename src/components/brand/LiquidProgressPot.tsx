import { useEffect, useState } from "react";

interface LiquidProgressPotProps {
  current: number;
  max: number;
  earnedAmount: number;
  maxAmount: number;
  pendingCount?: number;
}

export function LiquidProgressPot({
  current,
  max,
  earnedAmount,
  maxAmount,
  pendingCount = 0
}: LiquidProgressPotProps) {
  const [animatedLevel, setAnimatedLevel] = useState(100);
  
  // Calculate remaining percentage (starts full, drains as videos are completed)
  const remainingPercent = Math.max(0, ((max - current) / max) * 100);
  const remainingAmount = maxAmount - earnedAmount;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedLevel(remainingPercent);
    }, 100);
    return () => clearTimeout(timer);
  }, [remainingPercent]);

  return (
    <div className="relative w-full">
      {/* Stats row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tracking-[-0.5px]">{current}</span>
          <span className="text-xs text-muted-foreground tracking-[-0.3px]">/ {max}</span>
        </div>
        <span className="text-sm font-medium tracking-[-0.5px] text-emerald-500">
          ${earnedAmount.toFixed(0)}
        </span>
      </div>

      {/* Simple container with liquid */}
      <div className="relative h-16 w-full rounded-lg overflow-hidden bg-muted/30 border border-muted-foreground/10">
        {/* Liquid fill - starts from top, drains down */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-700 ease-out"
          style={{ height: `${animatedLevel}%` }}
        >
          {/* Subtle wave pattern */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-emerald-300/30 to-transparent" />
        </div>
        
        {/* Amount label centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-semibold tracking-[-0.5px] ${animatedLevel > 40 ? 'text-white' : 'text-foreground'}`}>
            ${remainingAmount.toFixed(0)} left
          </span>
        </div>
      </div>

      {/* Bottom info */}
      {pendingCount > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-xs text-amber-500 tracking-[-0.3px]">{pendingCount} pending</span>
        </div>
      )}
    </div>
  );
}
