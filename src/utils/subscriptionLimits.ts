export const PLAN_LIMITS = {
  starter: { boosts: 1, hires: 10 },
  growth: { boosts: 3, hires: 30 },
  enterprise: { boosts: Infinity, hires: Infinity },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string | null | undefined) {
  if (!plan || !(plan in PLAN_LIMITS)) {
    return { boosts: 0, hires: 0 }; // No subscription = no access
  }
  return PLAN_LIMITS[plan as PlanKey];
}

export function canCreateBoost(plan: string | null | undefined, currentBoostCount: number): boolean {
  const limits = getPlanLimits(plan);
  return currentBoostCount < limits.boosts;
}

export function canHireCreator(plan: string | null | undefined, currentHireCount: number): boolean {
  const limits = getPlanLimits(plan);
  return currentHireCount < limits.hires;
}
