import { useBrandUsage } from "@/hooks/useBrandUsage";
import { UsageProgressBar } from "./UsageProgressBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

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
  const {
    campaignsUsed,
    campaignsLimit,
    boostsUsed,
    boostsLimit,
    hiresUsed,
    hiresLimit,
    loading,
    isCustomPlan,
    customPlanName,
  } = useBrandUsage(brandId, subscriptionPlan);

  const isUnlimitedPlan = subscriptionPlan === "enterprise" || (
    campaignsLimit === Infinity && boostsLimit === Infinity && hiresLimit === Infinity
  );
  const canUpgrade = subscriptionPlan !== "enterprise" && !isCustomPlan;
  const hasReachedAnyLimit =
    !isUnlimitedPlan &&
    (campaignsUsed >= campaignsLimit ||
      boostsUsed >= boostsLimit ||
      hiresUsed >= hiresLimit);

  if (!subscriptionPlan && !isCustomPlan) {
    return (
      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
        <span className="text-sm font-medium tracking-[-0.5px]">
          No Active Plan
        </span>
        <p className="text-xs text-muted-foreground tracking-[-0.5px]">
          Subscribe to a plan to start creating campaigns and hiring creators.
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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium tracking-[-0.5px]">Current Usage</h3>
          {isCustomPlan && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Crown className="h-3 w-3" />
              {customPlanName || "Custom"}
            </Badge>
          )}
        </div>
        {canUpgrade && hasReachedAnyLimit && onUpgrade && (
          <Button
            onClick={onUpgrade}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
          >
            Upgrade
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <UsageProgressBar
          used={campaignsUsed}
          limit={campaignsLimit}
          label="Active Campaigns"
        />
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
          {isCustomPlan ? "Unlimited usage with custom plan" : "Unlimited usage with Enterprise plan"}
        </p>
      )}
    </div>
  );
}
