interface SemiCircleProgressProps {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

export const SemiCircleProgress = ({ total, pending, accepted, rejected }: SemiCircleProgressProps) => {
  const radius = 70;
  const strokeWidth = 12;
  const circumference = Math.PI * radius;
  
  // Calculate percentages
  const pendingPercent = total > 0 ? (pending / total) * 100 : 0;
  const acceptedPercent = total > 0 ? (accepted / total) * 100 : 0;
  const rejectedPercent = total > 0 ? (rejected / total) * 100 : 0;
  
  // Calculate stroke dasharray for each segment
  const acceptedDash = (acceptedPercent / 100) * circumference;
  const pendingDash = (pendingPercent / 100) * circumference;
  const rejectedDash = (rejectedPercent / 100) * circumference;
  
  // Offsets for each segment
  const acceptedOffset = 0;
  const pendingOffset = acceptedDash;
  const rejectedOffset = acceptedDash + pendingDash;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 160, height: 90 }}>
        <svg
          width="160"
          height="90"
          viewBox="0 0 160 90"
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={`M 10 80 A ${radius} ${radius} 0 0 1 150 80`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Accepted segment (green) */}
          {accepted > 0 && (
            <path
              d={`M 10 80 A ${radius} ${radius} 0 0 1 150 80`}
              fill="none"
              stroke="hsl(142 71% 45%)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${acceptedDash} ${circumference}`}
              strokeDashoffset={-acceptedOffset}
              className="transition-all duration-500"
            />
          )}
          
          {/* Pending segment (amber) */}
          {pending > 0 && (
            <path
              d={`M 10 80 A ${radius} ${radius} 0 0 1 150 80`}
              fill="none"
              stroke="hsl(38 92% 50%)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${pendingDash} ${circumference}`}
              strokeDashoffset={-pendingOffset}
              className="transition-all duration-500"
            />
          )}
          
          {/* Rejected segment (red) */}
          {rejected > 0 && (
            <path
              d={`M 10 80 A ${radius} ${radius} 0 0 1 150 80`}
              fill="none"
              stroke="hsl(0 84% 60%)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${rejectedDash} ${circumference}`}
              strokeDashoffset={-rejectedOffset}
              className="transition-all duration-500"
            />
          )}
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-semibold tracking-[-1px]">{total}</span>
          <span className="text-[10px] text-muted-foreground tracking-[-0.3px]">applicants</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs text-muted-foreground">{pending}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">{accepted}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-muted-foreground">{rejected}</span>
        </div>
      </div>
    </div>
  );
};
