import { Check, Clock, Lock, AlertCircle, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ClearingCountdown } from "./ClearingCountdown";
export type PayoutStatus = 'accruing' | 'locked' | 'clearing' | 'paid' | 'clawed_back' | 'pending_approval';
interface PayoutStatusBadgeProps {
  status: PayoutStatus;
  amount: number;
  clearingEndsAt?: string;
  onRequestPayout?: () => void;
  canRequest?: boolean;
  isRpm?: boolean;
}
const statusConfig: Record<PayoutStatus, {
  label: string;
  icon: typeof Check;
  className: string;
  bgClass: string;
}> = {
  accruing: {
    label: 'Accruing',
    icon: Banknote,
    className: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-500/10'
  },
  locked: {
    label: 'Locked',
    icon: Lock,
    className: 'text-gray-600 dark:text-gray-400',
    bgClass: 'bg-gray-500/10'
  },
  clearing: {
    label: 'Clearing',
    icon: Clock,
    className: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-500/10'
  },
  paid: {
    label: 'Paid',
    icon: Check,
    className: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-500/10'
  },
  clawed_back: {
    label: 'Clawed Back',
    icon: AlertCircle,
    className: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/10'
  },
  pending_approval: {
    label: 'Pending',
    icon: Clock,
    className: 'text-muted-foreground',
    bgClass: 'bg-muted'
  }
};
export function PayoutStatusBadge({
  status,
  amount,
  clearingEndsAt,
  onRequestPayout,
  canRequest = false,
  isRpm = false
}: PayoutStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return <div className="flex flex-col items-end gap-1">
      {/* Amount */}
      <span className={`text-sm font-semibold ${config.className}`} style={{
      fontFamily: 'Inter',
      letterSpacing: '-0.5px'
    }}>
        {status === 'pending_approval' ? '~' : ''}${amount.toFixed(2)}
      </span>
      
      {/* Status Badge */}
      <div className="flex items-center gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgClass} ${config.className}`}>
                
                {status === 'clearing' && clearingEndsAt ? <ClearingCountdown endsAt={clearingEndsAt} showIcon={false} compact /> : config.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              {status === 'accruing' && <p className="text-sm">
                  {isRpm ? 'Earnings accumulating based on views. Request payout when ready.' : 'Ready to request payout.'}
                </p>}
              {status === 'locked' && <p className="text-sm">Payout requested, waiting to enter clearing period.</p>}
              {status === 'clearing' && <p className="text-sm">In 7-day clearing period. Brands can flag during first 4 days.</p>}
              {status === 'paid' && <p className="text-sm">Successfully paid to your wallet.</p>}
              {status === 'clawed_back' && <p className="text-sm">This payment was flagged and revoked by the brand.</p>}
              {status === 'pending_approval' && <p className="text-sm">Waiting for brand approval. Amount is estimated.</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Request Button for accruing status */}
        {status === 'accruing' && canRequest && onRequestPayout && <Button onClick={e => {
        e.stopPropagation();
        onRequestPayout();
      }} variant="ghost" size="sm" className="h-5 px-2 text-xs text-green-600 dark:text-green-400 hover:bg-green-500/10">
            Request
          </Button>}
      </div>
    </div>;
}