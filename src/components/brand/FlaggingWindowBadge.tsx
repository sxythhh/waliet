import { useState, useEffect } from "react";
import { Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FlaggingWindowBadgeProps {
  createdAt: string;
  clearingEndsAt: string;
  compact?: boolean;
}

// Flagging window is first 4 days of the 7-day clearing period
const FLAGGING_WINDOW_DAYS = 4;

function getFlaggingStatus(createdAt: string, clearingEndsAt: string) {
  const created = new Date(createdAt);
  const clearingEnds = new Date(clearingEndsAt);
  const now = new Date();
  
  // Calculate time elapsed since creation
  const elapsedMs = now.getTime() - created.getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  
  // Calculate remaining flagging window
  const flaggingWindowMs = FLAGGING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const flaggingEnds = new Date(created.getTime() + flaggingWindowMs);
  const flaggingRemainingMs = flaggingEnds.getTime() - now.getTime();
  
  // Calculate remaining clearing time
  const clearingRemainingMs = clearingEnds.getTime() - now.getTime();
  
  if (clearingRemainingMs <= 0) {
    return { status: 'ready' as const, remainingMs: 0, canFlag: false };
  }
  
  if (flaggingRemainingMs <= 0) {
    return { status: 'safe' as const, remainingMs: clearingRemainingMs, canFlag: false };
  }
  
  return { status: 'flaggable' as const, remainingMs: flaggingRemainingMs, canFlag: true };
}

function formatRemaining(ms: number) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h`;
}

export function FlaggingWindowBadge({ createdAt, clearingEndsAt, compact = false }: FlaggingWindowBadgeProps) {
  const [status, setStatus] = useState(() => getFlaggingStatus(createdAt, clearingEndsAt));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getFlaggingStatus(createdAt, clearingEndsAt));
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [createdAt, clearingEndsAt]);
  
  if (status.status === 'ready') {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
        <Clock className="h-3 w-3" />
        Ready
      </Badge>
    );
  }
  
  if (status.status === 'safe') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-muted text-muted-foreground border-border/50 gap-1">
            <ShieldCheck className="h-3 w-3" />
            {compact ? 'Safe' : `Safe • ${formatRemaining(status.remainingMs)} left`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Past flagging window. Clears in {formatRemaining(status.remainingMs)}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  // Flaggable
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 gap-1">
          <AlertTriangle className="h-3 w-3" />
          {compact ? formatRemaining(status.remainingMs) : `${formatRemaining(status.remainingMs)} to review`}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">You can flag this submission for {formatRemaining(status.remainingMs)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Export helper for checking if item can still be flagged
export function canBeFlagged(createdAt: string, clearingEndsAt: string): boolean {
  const status = getFlaggingStatus(createdAt, clearingEndsAt);
  return status.canFlag;
}
