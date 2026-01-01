import { useBrandUsage } from "@/hooks/useBrandUsage";
import { UsageProgressBar } from "./UsageProgressBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Zap, TrendingUp } from "lucide-react";

interface BillingUsageCardProps {
  brandId: string;
  subscriptionPlan: string | null | undefined;
  onUpgrade?: () => void;
}

export function BillingUsageCard({
  brandId,
  subscriptionPlan,
  onUpgrade,
}: BillingUsageCardProps) {
  const { boostsUsed, boostsLimit, hiresUsed, hiresLimit, loading } =
    useBrandUsage(brandId, subscriptionPlan);

  const isUnlimitedPlan = subscriptionPlan === "enterprise";
  const canUpgrade = subscriptionPlan !== "enterprise";
  const hasReachedAnyLimit =
    !isUnlimitedPlan &&
    (boostsUsed >= boostsLimit || hiresUsed >= hiresLimit);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!subscriptionPlan) {
    return (
      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium tracking-[-0.5px]">
            No Active Plan
          </span>
        </div>
        <p className="text-xs text-muted-foreground tracking-[-0.5px]">
          Subscribe to a plan to start creating boosts and hiring creators.
        </p>
        {onUpgrade && (
          <Button onClick={onUpgrade} size="sm" className="w-full">
            Choose a Plan
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium tracking-[-0.5px]">Current Usage</h3>
        {canUpgrade && hasReachedAnyLimit && onUpgrade && (
          <Button
            onClick={onUpgrade}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <UsageProgressBar
          used={boostsUsed}
          limit={boostsLimit}
          label="Active Boosts"
        />
        <UsageProgressBar
          used={hiresUsed}
          limit={hiresLimit}
          label="Creator Hires"
        />
      </div>

      {isUnlimitedPlan && (
        <p className="text-xs text-muted-foreground tracking-[-0.5px] flex items-center gap-1">
          <span className="text-green-500">✓</span>
          Unlimited usage with Enterprise plan
        </p>
      )}
    </div>
  );
}
