import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface HeldEarningsCountdownProps {
  releaseAt: string;
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
  if (time.expired) return compact ? "Ready" : "Ready to release";

  if (compact) {
    if (time.days > 0) return `${time.days}d ${time.hours}h`;
    if (time.hours > 0) return `${time.hours}h ${time.minutes}m`;
    return `${time.minutes}m`;
  }

  if (time.days > 0) {
    return `${time.days}d ${time.hours}h until release`;
  }
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m until release`;
  }
  return `${time.minutes}m until release`;
}

export function HeldEarningsCountdown({ releaseAt, showIcon = true, compact = false }: HeldEarningsCountdownProps) {
  const [time, setTime] = useState(() => getTimeRemaining(releaseAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(releaseAt));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [releaseAt]);

  const formattedTime = formatTimeRemaining(time, compact);
  const isExpired = time.expired;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 ${isExpired ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
        {showIcon && <Clock className="h-3 w-3" />}
        <span className="text-xs font-medium">{formattedTime}</span>
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${isExpired ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
      {showIcon && <Clock className="h-4 w-4" />}
      <span className="text-sm font-medium">{formattedTime}</span>
    </div>
  );
}
