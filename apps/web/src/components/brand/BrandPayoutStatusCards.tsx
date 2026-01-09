import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, Flag } from "lucide-react";
import { ClearingCountdown } from "@/components/dashboard/ClearingCountdown";

interface BrandPayoutStatusCardsProps {
  inReviewAmount: number;
  inReviewCount: number;
  approvedAmount: number;
  approvedCount: number;
  flaggedAmount: number;
  flaggedCount: number;
  earliestClearingEndsAt?: string;
  canStillFlag?: boolean;
}

export function BrandPayoutStatusCards({
  inReviewAmount,
  inReviewCount,
  approvedAmount,
  approvedCount,
  flaggedAmount,
  flaggedCount,
  earliestClearingEndsAt,
  canStillFlag = true,
}: BrandPayoutStatusCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {/* In Review Card */}
      <Card className="bg-orange-500/5 border-orange-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-orange-500/10">
              <Clock className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
              In Review
            </span>
          </div>
          <div className="text-2xl font-bold mb-1">
            ${inReviewAmount.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {inReviewCount} {inReviewCount === 1 ? 'submission' : 'submissions'}
          </div>
          {earliestClearingEndsAt && inReviewCount > 0 && (
            <div className="mt-2 pt-2 border-t border-orange-500/10">
              <ClearingCountdown endsAt={earliestClearingEndsAt} compact />
              {canStillFlag && (
                <div className="text-xs text-muted-foreground mt-1">
                  Can flag for review
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Card */}
      <Card className="bg-emerald-500/5 border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Approved
            </span>
          </div>
          <div className="text-2xl font-bold mb-1">
            ${approvedAmount.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {approvedCount} {approvedCount === 1 ? 'submission' : 'submissions'}
          </div>
        </CardContent>
      </Card>

      {/* Flagged Card */}
      <Card className={`${flaggedCount > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/30 border-border/30'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center justify-center h-6 w-6 rounded-full ${flaggedCount > 0 ? 'bg-amber-500/10' : 'bg-muted'}`}>
              <Flag className={`h-3.5 w-3.5 ${flaggedCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </div>
            <span className={`text-xs font-medium ${flaggedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
              Flagged
            </span>
          </div>
          <div className="text-2xl font-bold mb-1">
            ${flaggedAmount.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {flaggedCount} {flaggedCount === 1 ? 'submission' : 'submissions'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
