import { supabase } from "@/integrations/supabase/client";

export const PLAN_LIMITS = {
  starter: { campaigns: 1, boosts: 1, hires: 10 },
  growth: { campaigns: 5, boosts: 3, hires: 30 },
  enterprise: { campaigns: Infinity, boosts: Infinity, hires: Infinity },
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

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (!plan || !(plan in PLAN_LIMITS)) {
    return { campaigns: 0, boosts: 0, hires: 0 }; // No subscription = no access
  }
  return PLAN_LIMITS[plan as PlanKey];
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
      if (customValue === -1) return Infinity;
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

export function canCreateCampaign(plan: string | null | undefined, currentCampaignCount: number): boolean {
  const limits = getPlanLimits(plan);
  return currentCampaignCount < limits.campaigns;
}

export function canCreateBoost(plan: string | null | undefined, currentBoostCount: number): boolean {
  const limits = getPlanLimits(plan);
  return currentBoostCount < limits.boosts;
}

export function canHireCreator(plan: string | null | undefined, currentHireCount: number): boolean {
  const limits = getPlanLimits(plan);
  return currentHireCount < limits.hires;
}

// Enhanced versions that check custom plans
export function canCreateWithLimit(currentCount: number, limit: number): boolean {
  return currentCount < limit;
}
