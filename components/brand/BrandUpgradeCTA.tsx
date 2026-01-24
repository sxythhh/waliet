import { useBrandUsage } from "@/hooks/useBrandUsage";
import { getRemainingCount, isUnlimited, PLAN_LIMITS } from "@/utils/subscriptionLimits";
import { Zap } from "lucide-react";
import nutFillIcon from "@/assets/nut-fill.svg";

interface BrandUpgradeCTAProps {
  brandId: string;
  subscriptionPlan: string | null | undefined;
  onUpgrade: () => void;
  variant?: "sidebar" | "card" | "banner";
}

function getNextPlanName(currentPlan: string | null | undefined): string {
  const normalizedPlan = currentPlan?.trim().toLowerCase();
  if (!normalizedPlan || !['starter', 'growth', 'enterprise'].includes(normalizedPlan)) {
    return "Starter";
  }
  if (normalizedPlan === "starter") {
    return "Growth";
  }
  if (normalizedPlan === "growth") {
    return "Enterprise";
  }
  return "Enterprise";
}

function getPlanDisplayName(plan: string | null | undefined): string {
  const normalizedPlan = plan?.trim().toLowerCase();
  if (!normalizedPlan || !['starter', 'growth', 'enterprise'].includes(normalizedPlan)) {
    return "free plan";
  }
  return `${normalizedPlan.charAt(0).toUpperCase()}${normalizedPlan.slice(1)} plan`;
}

export function BrandUpgradeCTA({
  brandId,
  subscriptionPlan,
  onUpgrade,
  variant = "sidebar",
}: BrandUpgradeCTAProps) {
  const {
    hiresUsed,
    hiresLimit,
    loading,
    hasActiveSubscription,
    isCustomPlan,
  } = useBrandUsage(brandId, subscriptionPlan);

  // Don't show for enterprise or custom plans
  if (subscriptionPlan === "enterprise" || isCustomPlan) {
    return null;
  }

  const hiresRemaining = getRemainingCount(hiresUsed, hiresLimit);
  const isFreePlan = !hasActiveSubscription;
  const nextPlan = getNextPlanName(subscriptionPlan);
  const currentPlanDisplay = getPlanDisplayName(subscriptionPlan);

  // Sidebar variant - compact
  if (variant === "sidebar") {
    const hiresUsedPercent = hiresLimit > 0 ? Math.min((hiresUsed / hiresLimit) * 100, 100) : 100;

    return (
      <div className="px-2 py-1">
        <div className="p-3 bg-muted/30 dark:bg-muted/20 rounded-xl space-y-2.5">
          {/* Hires progress */}
          {!loading && hiresRemaining !== null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-inter text-xs font-semibold text-foreground tracking-[-0.5px]">
                  {hiresRemaining} Hire{hiresRemaining !== 1 ? "s" : ""} Left
                </span>
                <span className="text-xs text-muted-foreground tracking-[-0.3px]">
                  {hiresUsed}/{hiresLimit}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${100 - hiresUsedPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Plan status */}
          <p className="text-[13px] font-medium text-foreground tracking-[-0.4px]">
            Your brand is on the {currentPlanDisplay}
          </p>

          {/* Description */}
          <p className="text-xs text-muted-foreground tracking-[-0.3px] leading-relaxed">
            Upgrade now to unlock more opportunities, hires, and tools to manage your campaigns.{" "}
            <button
              onClick={onUpgrade}
              className="text-primary hover:underline font-medium"
            >
              Learn more
            </button>
          </p>

          {/* Upgrade button */}
          <button
            onClick={onUpgrade}
            className="w-full py-2 px-3 bg-primary border-t border-primary/70 rounded-lg font-inter text-[13px] font-medium tracking-[-0.5px] text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <img src={nutFillIcon} alt="" className="h-3.5 w-3.5" />
            Upgrade Plan
          </button>
        </div>
      </div>
    );
  }

  // Card variant - for dashboard sections
  if (variant === "card") {
    return (
      <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border border-primary/20 rounded-xl space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-[-0.4px]">
              Upgrade to {nextPlan}
            </span>
          </div>
          {!loading && hiresRemaining !== null && (
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full tracking-[-0.3px]">
              {hiresRemaining} Hire{hiresRemaining !== 1 ? "s" : ""} Left
            </span>
          )}
        </div>

        {/* Plan status */}
        <p className="text-sm font-medium text-foreground tracking-[-0.4px]">
          Your brand is on the {currentPlanDisplay}
        </p>

        {/* Description */}
        <p className="text-sm text-muted-foreground tracking-[-0.3px] leading-relaxed">
          Upgrade now to unlock more opportunities, hires, and tools to manage your campaigns.{" "}
          <button
            onClick={onUpgrade}
            className="text-primary hover:underline font-medium"
          >
            Learn more
          </button>
        </p>

        {/* Upgrade button */}
        <button
          onClick={onUpgrade}
          className="w-full py-2.5 px-4 bg-primary border-t border-primary/70 rounded-lg font-inter text-sm font-medium tracking-[-0.5px] text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <img src={nutFillIcon} alt="" className="h-4 w-4" />
          Upgrade Plan
        </button>
      </div>
    );
  }

  // Banner variant - horizontal for page tops
  if (variant === "banner") {
    return (
      <div className="p-4 bg-muted/30 dark:bg-muted/20 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-foreground tracking-[-0.4px]">
              Upgrade to {nextPlan}
            </span>
            {!loading && hiresRemaining !== null && (
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full tracking-[-0.3px]">
                {hiresRemaining} Hire{hiresRemaining !== 1 ? "s" : ""} Left
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground tracking-[-0.3px]">
            Your brand is on the {currentPlanDisplay}. Upgrade now to unlock more opportunities, hires, and tools.{" "}
            <button
              onClick={onUpgrade}
              className="text-primary hover:underline font-medium"
            >
              Learn more
            </button>
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="py-2 px-4 bg-primary border-t border-primary/70 rounded-lg font-inter text-sm font-medium tracking-[-0.5px] text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <img src={nutFillIcon} alt="" className="h-4 w-4" />
          Upgrade
        </button>
      </div>
    );
  }

  return null;
}
