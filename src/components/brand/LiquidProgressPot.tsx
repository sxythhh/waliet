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
  const [animatedLevel, setAnimatedLevel] = useState(0);
  const fillPercent = Math.min((current / max) * 100, 100);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedLevel(fillPercent);
    }, 100);
    return () => clearTimeout(timer);
  }, [fillPercent]);

  // Calculate remaining amount
  const remainingAmount = maxAmount - earnedAmount;
  const remainingVideos = max - current;

  return (
    <div className="relative w-full">
      {/* Stats row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold tracking-[-1px]">{current}</span>
          <span className="text-sm text-muted-foreground tracking-[-0.3px]">/ {max} videos</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-semibold tracking-[-0.5px] text-emerald-500">${earnedAmount.toFixed(0)}</span>
          <span className="text-xs text-muted-foreground ml-1">earned</span>
        </div>
      </div>

      {/* The Pot/Container Illustration */}
      <div className="relative h-28 w-full">
        {/* Container outline - jar/beaker shape */}
        <svg 
          viewBox="0 0 200 100" 
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Definitions for gradients and effects */}
          <defs>
            {/* Liquid gradient */}
            <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(142, 76%, 45%)" stopOpacity="0.9" />
              <stop offset="50%" stopColor="hsl(142, 76%, 36%)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="hsl(142, 76%, 28%)" stopOpacity="1" />
            </linearGradient>
            
            {/* Empty container gradient */}
            <linearGradient id="containerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
            </linearGradient>
            
            {/* Wave animation */}
            <clipPath id="liquidClip">
              <rect 
                x="20" 
                y={90 - (animatedLevel * 0.7)} 
                width="160" 
                height={animatedLevel * 0.7 + 10}
                rx="4"
                style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </clipPath>

            {/* Shine effect */}
            <linearGradient id="shineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="0.15" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Container background */}
          <rect 
            x="20" 
            y="15" 
            width="160" 
            height="75" 
            rx="8" 
            fill="url(#containerGradient)"
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />

          {/* Measurement lines */}
          {[25, 50, 75].map((percent) => (
            <line
              key={percent}
              x1="25"
              y1={90 - (percent * 0.7)}
              x2="35"
              y2={90 - (percent * 0.7)}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="0.5"
              strokeOpacity="0.4"
            />
          ))}

          {/* Liquid fill */}
          <g clipPath="url(#liquidClip)">
            <rect 
              x="20" 
              y="15" 
              width="160" 
              height="75" 
              rx="8" 
              fill="url(#liquidGradient)"
            />
            
            {/* Wave effect on top of liquid */}
            <path
              d={`M 20 ${90 - (animatedLevel * 0.7)} 
                  Q 60 ${87 - (animatedLevel * 0.7)} 100 ${90 - (animatedLevel * 0.7)} 
                  T 180 ${90 - (animatedLevel * 0.7)} 
                  V 90 H 20 Z`}
              fill="url(#liquidGradient)"
              opacity="0.8"
              style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <animate 
                attributeName="d" 
                values={`
                  M 20 ${90 - (animatedLevel * 0.7)} Q 60 ${87 - (animatedLevel * 0.7)} 100 ${90 - (animatedLevel * 0.7)} T 180 ${90 - (animatedLevel * 0.7)} V 90 H 20 Z;
                  M 20 ${90 - (animatedLevel * 0.7)} Q 60 ${93 - (animatedLevel * 0.7)} 100 ${90 - (animatedLevel * 0.7)} T 180 ${90 - (animatedLevel * 0.7)} V 90 H 20 Z;
                  M 20 ${90 - (animatedLevel * 0.7)} Q 60 ${87 - (animatedLevel * 0.7)} 100 ${90 - (animatedLevel * 0.7)} T 180 ${90 - (animatedLevel * 0.7)} V 90 H 20 Z
                `}
                dur="3s" 
                repeatCount="indefinite"
              />
            </path>

            {/* Bubbles */}
            {animatedLevel > 10 && (
              <>
                <circle cx="50" cy="70" r="3" fill="white" fillOpacity="0.2">
                  <animate attributeName="cy" values="80;40;80" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="r" values="2;4;2" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="130" cy="75" r="2" fill="white" fillOpacity="0.15">
                  <animate attributeName="cy" values="85;35;85" dur="5s" repeatCount="indefinite" />
                  <animate attributeName="r" values="1.5;3;1.5" dur="5s" repeatCount="indefinite" />
                </circle>
                <circle cx="90" cy="78" r="2.5" fill="white" fillOpacity="0.18">
                  <animate attributeName="cy" values="82;42;82" dur="3.5s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>

          {/* Container shine */}
          <rect 
            x="25" 
            y="18" 
            width="8" 
            height="68" 
            rx="4" 
            fill="url(#shineGradient)"
          />

          {/* Dollar signs floating in liquid */}
          {animatedLevel > 20 && (
            <text 
              x="100" 
              y={85 - (animatedLevel * 0.35)} 
              textAnchor="middle" 
              fill="white" 
              fillOpacity="0.4" 
              fontSize="16"
              fontWeight="bold"
              style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              $
            </text>
          )}
        </svg>
      </div>

      {/* Bottom info */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground tracking-[-0.3px]">${remainingAmount.toFixed(0)} remaining</span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-amber-500 tracking-[-0.3px]">{pendingCount} pending</span>
            </div>
          )}
        </div>
        <span className="text-muted-foreground tracking-[-0.3px]">{remainingVideos} videos left</span>
      </div>
    </div>
  );
}
