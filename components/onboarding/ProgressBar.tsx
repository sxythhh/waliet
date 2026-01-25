"use client";

interface ProgressBarProps {
  completed: number;
  total: number;
  percentage: number;
}

export function ProgressBar({ completed, total, percentage }: ProgressBarProps) {
  return (
    <div className="space-y-1.5 max-w-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Checklist ({completed} of {total} Completed)
        </span>
        <span className="text-xs text-muted-foreground">{percentage}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
