import { ArrowUp, ArrowDown } from "lucide-react";

interface ChangeIndicatorProps {
  value: number;
  formatter?: (val: number) => string;
  showArrow?: boolean;
}

const formatPercent = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

export function ChangeIndicator({ 
  value, 
  formatter = formatPercent,
  showArrow = true 
}: ChangeIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;
  
  if (isNeutral) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 text-muted-foreground text-xs font-medium tracking-[-0.5px]">
        <span>0%</span>
      </div>
    );
  }
  
  return (
    <div 
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium tracking-[-0.5px]
        ${isPositive 
          ? 'text-emerald-400 bg-emerald-500/15' 
          : 'text-red-400 bg-red-500/15'
        }
      `}
      style={{
        boxShadow: isPositive 
          ? '0 0 12px 0 rgba(16, 185, 129, 0.3), 0 0 4px 0 rgba(16, 185, 129, 0.2)' 
          : '0 0 12px 0 rgba(239, 68, 68, 0.3), 0 0 4px 0 rgba(239, 68, 68, 0.2)'
      }}
    >
      {showArrow && (
        isPositive ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      )}
      <span>{formatter(Math.abs(value))}</span>
    </div>
  );
}
