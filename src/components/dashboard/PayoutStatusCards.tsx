import { Wallet, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClearingCountdown } from "./ClearingCountdown";

interface PayoutStatusCardsProps {
  accruing: {
    amount: number;
    videoCount: number;
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Accruing Card */}
      <Card className="p-4 bg-card border border-border/50 hover:border-border transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 uppercase tracking-wide">
            Ready
          </span>
        </div>
        <p className="text-2xl font-bold text-foreground font-['Inter']" style={{ letterSpacing: '-0.5px' }}>
          ${accruing.amount.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-['Inter']">
          {accruing.videoCount} video{accruing.videoCount !== 1 ? 's' : ''} • Ready to withdraw
        </p>
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
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 uppercase tracking-wide">
            Clearing
          </span>
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
