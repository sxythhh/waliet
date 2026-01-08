import { supabase } from "@/integrations/supabase/client";

// Sentinel value for unlimited resources
// Using -1 instead of Infinity because:
// 1. JSON.stringify(Infinity) = null, which breaks serialization
// 2. -1 is a common convention for "unlimited" in APIs
// 3. Number.MAX_SAFE_INTEGER could cause issues in comparisons
export const UNLIMITED = -1;

/**
 * Check if a limit value represents unlimited access
 */
export function isUnlimited(limit: number): boolean {
  return limit === UNLIMITED;
}

export const PLAN_LIMITS = {
  starter: { campaigns: 1, boosts: 1, hires: 10 },
  growth: { campaigns: 5, boosts: 3, hires: 30 },
  enterprise: { campaigns: UNLIMITED, boosts: UNLIMITED, hires: UNLIMITED },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export interface PlanLimits {
  campaigns: number;
  boosts: number;
  hires: number;
}

export interface EffectivePlanLimits extends PlanLimits {
  isCustom: boolean;
  customPlanName: string | null;
}

/**
 * Normalize plan name for lookup
 * Handles case-insensitivity and whitespace
 */
function normalizePlanName(plan: string | null | undefined): string | null {
  if (!plan) return null;
  return plan.trim().toLowerCase();
}

/**
 * Get plan limits for a given plan name
 * Returns zero limits for unknown/null plans
 */
export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  const normalizedPlan = normalizePlanName(plan);

  if (!normalizedPlan || !(normalizedPlan in PLAN_LIMITS)) {
    return { campaigns: 0, boosts: 0, hires: 0 };
  }

  return { ...PLAN_LIMITS[normalizedPlan as PlanKey] };
}

/**
 * Get effective plan limits for a brand, checking for custom plans first.
 * Custom plan values: null = use standard, -1 = unlimited
 */
export async function getEffectivePlanLimits(
  brandId: string,
  standardPlan: string | null | undefined
): Promise<EffectivePlanLimits> {
  const standardLimits = getPlanLimits(standardPlan);

  try {
    const { data: customPlan, error } = await supabase
      .from("custom_brand_plans")
      .select("name, campaigns_limit, boosts_limit, hires_limit")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .single();

    if (error || !customPlan) {
      return {
        ...standardLimits,
        isCustom: false,
        customPlanName: null,
      };
    }

    // Convert custom plan limits: null = use standard, -1 = unlimited
    const resolveLimits = (customValue: number | null, standardValue: number) => {
      if (customValue === null) return standardValue;
      if (customValue === UNLIMITED) return UNLIMITED;
      return customValue;
    };

    return {
      campaigns: resolveLimits(customPlan.campaigns_limit, standardLimits.campaigns),
      boosts: resolveLimits(customPlan.boosts_limit, standardLimits.boosts),
      hires: resolveLimits(customPlan.hires_limit, standardLimits.hires),
      isCustom: true,
      customPlanName: customPlan.name,
    };
  } catch (error) {
    console.error("Error fetching custom plan:", error);
    return {
      ...standardLimits,
      isCustom: false,
      customPlanName: null,
    };
  }
}

/**
 * Check if a campaign can be created given current count and limit
 */
export function canCreateCampaign(plan: string | null | undefined, currentCampaignCount: number): boolean {
  if (currentCampaignCount < 0) {
    console.warn('Negative campaign count detected:', currentCampaignCount);
    return false;
  }
  const limits = getPlanLimits(plan);
  return isUnlimited(limits.campaigns) || currentCampaignCount < limits.campaigns;
}

/**
 * Check if a boost can be created given current count and limit
 */
export function canCreateBoost(plan: string | null | undefined, currentBoostCount: number): boolean {
  if (currentBoostCount < 0) {
    console.warn('Negative boost count detected:', currentBoostCount);
    return false;
  }
  const limits = getPlanLimits(plan);
  return isUnlimited(limits.boosts) || currentBoostCount < limits.boosts;
}

/**
 * Check if a creator can be hired given current hire count and limit
 */
export function canHireCreator(plan: string | null | undefined, currentHireCount: number): boolean {
  if (currentHireCount < 0) {
    console.warn('Negative hire count detected:', currentHireCount);
    return false;
  }
  const limits = getPlanLimits(plan);
  return isUnlimited(limits.hires) || currentHireCount < limits.hires;
}

/**
 * Generic check if creation is allowed given current count and limit
 * Handles unlimited (-1) as a special case
 */
export function canCreateWithLimit(currentCount: number, limit: number): boolean {
  if (!Number.isFinite(currentCount) || !Number.isFinite(limit)) {
    console.warn('Invalid count or limit:', { currentCount, limit });
    return false;
  }
  if (currentCount < 0) {
    console.warn('Negative count detected:', currentCount);
    return false;
  }
  if (isUnlimited(limit)) {
    return true;
  }
  return currentCount < limit;
}

/**
 * Get remaining count until limit
 * Returns null for unlimited plans
 */
export function getRemainingCount(currentCount: number, limit: number): number | null {
  if (isUnlimited(limit)) {
    return null;
  }
  return Math.max(0, limit - currentCount);
}

/**
 * Format limit for display
 * Shows "Unlimited" for unlimited plans
 */
export function formatLimit(limit: number): string {
  if (isUnlimited(limit)) {
    return "Unlimited";
  }
  return limit.toString();
}
