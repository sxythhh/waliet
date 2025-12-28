import { Wallet, Clock, CheckCircle, ArrowRight, Zap, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ClearingCountdown } from "./ClearingCountdown";

interface PayoutStatusCardsProps {
  accruing: {
    amount: number;
    videoCount: number;
    boostAmount?: number;
    boostCount?: number;
    campaignAmount?: number;
    campaignCount?: number;
  };
  clearing: {
    amount: number;
    videoCount: number;
    clearingEndsAt?: string;
    canBeFlagged: boolean;
  };
  paid: {
    amount: number;
    videoCount: number;
  };
  onRequestPayout: () => void;
  isRequesting: boolean;
  minPayout?: number;
}

export function PayoutStatusCards({
  accruing,
  clearing,
  paid,
  onRequestPayout,
  isRequesting,
  minPayout = 1,
}: PayoutStatusCardsProps) {
  const canRequest = accruing.amount >= minPayout;
  const progressToMin = Math.min(100, (accruing.amount / minPayout) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Accruing Card */}
      <Card className="p-4 bg-card border border-border/50 hover:border-border transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 uppercase tracking-wide">
              Ready
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">Earnings ready for payout. Request anytime above the $1.00 minimum.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground font-['Inter']" style={{ letterSpacing: '-0.5px' }}>
          ${accruing.amount.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-['Inter']">
          {accruing.videoCount} video{accruing.videoCount !== 1 ? 's' : ''} • Ready to withdraw
        </p>
        
        {/* Boost vs Campaign breakdown */}
        {(accruing.boostAmount !== undefined || accruing.campaignAmount !== undefined) && (
          <div className="mt-2 pt-2 border-t border-border/50 flex gap-3 text-[10px]">
            {accruing.campaignAmount !== undefined && accruing.campaignAmount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Wallet className="h-3 w-3 text-purple-500" />
                <span>${accruing.campaignAmount.toFixed(2)} campaigns</span>
              </div>
            )}
            {accruing.boostAmount !== undefined && accruing.boostAmount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-3 w-3 text-amber-500" />
                <span>${accruing.boostAmount.toFixed(2)} boosts</span>
              </div>
            )}
          </div>
        )}

        {/* Progress to minimum */}
        {!canRequest && accruing.amount > 0 && (
          <div className="mt-3 space-y-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300" 
                style={{ width: `${progressToMin}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              ${(minPayout - accruing.amount).toFixed(2)} more to reach minimum
            </p>
          </div>
        )}

        <Button
          onClick={onRequestPayout}
          disabled={!canRequest || isRequesting}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-['Inter']"
          size="sm"
        >
          {isRequesting ? 'Requesting...' : canRequest ? 'Request Payout' : `Min $${minPayout.toFixed(2)}`}
          {canRequest && !isRequesting && <ArrowRight className="h-3.5 w-3.5 ml-2" />}
        </Button>
      </Card>

      {/* Clearing Card */}
      <Card className="p-4 bg-card border border-border/50 hover:border-border transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              Clearing
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">7-day review period. Brands can flag suspicious activity during the first 4 days.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground font-['Inter']" style={{ letterSpacing: '-0.5px' }}>
          ${clearing.amount.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-['Inter']">
          {clearing.videoCount} video{clearing.videoCount !== 1 ? 's' : ''} • 7-day period
        </p>
        {clearing.clearingEndsAt && clearing.amount > 0 && (
          <div className="mt-4 space-y-1.5">
            <ClearingCountdown endsAt={clearing.clearingEndsAt} />
            <p className={`text-[10px] font-medium ${clearing.canBeFlagged ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
              {clearing.canBeFlagged ? '⚠️ Can be flagged' : '🔓 Past flag window'}
            </p>
          </div>
        )}
        {clearing.amount === 0 && (
          <p className="text-[10px] text-muted-foreground mt-4 font-['Inter']">
            No pending payouts in clearing
          </p>
        )}
      </Card>

      {/* Paid Card */}
      <Card className="p-4 bg-card border border-border/50 hover:border-border transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Completed
          </span>
        </div>
        <p className="text-2xl font-bold text-foreground font-['Inter']" style={{ letterSpacing: '-0.5px' }}>
          ${paid.amount.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-['Inter']">
          {paid.videoCount} video{paid.videoCount !== 1 ? 's' : ''} • All time
        </p>
        <p className="text-[10px] text-muted-foreground mt-4 font-['Inter']">
          Paid to your wallet
        </p>
      </Card>
    </div>
  );
}
