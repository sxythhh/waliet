import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ClearingCountdownProps {
  endsAt: string;
  showIcon?: boolean;
  compact?: boolean;
}

function getTimeRemaining(endDate: string) {
  const total = new Date(endDate).getTime() - Date.now();
  
  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, expired: true };
  }
  
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  
  return { total, days, hours, minutes, expired: false };
}

function formatTimeRemaining(time: ReturnType<typeof getTimeRemaining>, compact: boolean) {
  if (time.expired) return compact ? 'Done' : 'Processing...';
  
  if (compact) {
    if (time.days > 0) return `${time.days}d ${time.hours}h`;
    if (time.hours > 0) return `${time.hours}h ${time.minutes}m`;
    return `${time.minutes}m`;
  }
  
  if (time.days > 0) {
    return `${time.days}d ${time.hours}h remaining`;
  }
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m remaining`;
  }
  return `${time.minutes}m remaining`;
}

export function ClearingCountdown({ endsAt, showIcon = true, compact = false }: ClearingCountdownProps) {
  const [time, setTime] = useState(() => getTimeRemaining(endsAt));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(endsAt));
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [endsAt]);
  
  const formattedTime = formatTimeRemaining(time, compact);
  
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
        {showIcon && <Clock className="h-3 w-3" />}
        <span className="text-xs font-medium">{formattedTime}</span>
      </span>
    );
  }
  
  return (
    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
      {showIcon && <Clock className="h-4 w-4" />}
      <span className="text-sm font-medium">{formattedTime}</span>
    </div>
  );
}

// Helper to check if an item can still be flagged (first 4 days)
export function canBeFlagged(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation < 4;
}
