import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PromotionCriteria {
  min_months_active: number;
  min_avg_views: number;
  min_completion_rate: number;
  min_engagement_rate: number;
}

interface DemotionCriteria {
  consecutive_missed_quotas: number;
  min_completion_rate: number;
}

interface CreatorTier {
  id: string;
  bounty_campaign_id: string;
  name: string;
  level: number;
  monthly_retainer: number;
  videos_per_month: number;
  promotion_criteria: PromotionCriteria;
  demotion_criteria: DemotionCriteria;
  is_entry_tier: boolean;
}

interface CreatorAssignment {
  id: string;
  bounty_campaign_id: string;
  user_id: string;
  tier_id: string;
  months_in_tier: number;
  tier_start_date: string;
}

interface CreatorTierMetrics {
  id: string;
  user_id: string;
  bounty_campaign_id: string;
  period_year: number;
  period_month: number;
  videos_submitted: number;
  videos_approved: number;
  completion_rate: number;
  avg_views_per_video: number;
  engagement_rate: number;
  total_earnings: number;
  quota_met: boolean;
  demotion_warning?: boolean;
}

interface PerformanceSnapshot {
  months_in_tier: number;
  videos_submitted?: number;
  videos_approved?: number;
  completion_rate?: number;
  avg_views?: number;
  engagement_rate?: number;
  total_earned?: number;
  quota_met?: boolean;
}

interface TierChangeResult {
  boost_id: string;
  user_id: string;
  action: "promote" | "demote" | "warning";
  from_tier?: string;
  to_tier?: string;
  reason: string;
}

interface TierEvaluationResult {
  user_id: string;
  current_tier_id: string;
  new_tier_id: string | null;
  action: "promote" | "demote" | "warning" | "maintain";
  reason: string;
  performance_snapshot: PerformanceSnapshot;
  criteria_evaluation: {
    met_criteria: string[];
    failed_criteria: string[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Get previous month for evaluation
    const evalYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const evalMonth = currentMonth === 1 ? 12 : currentMonth - 1;

    console.log(`Processing tier progression for ${evalMonth}/${evalYear}`);

    // Find all boosts with tiers enabled and auto-progression
    const { data: boosts, error: boostsError } = await supabase
      .from("bounty_campaigns")
      .select("id, title, tiers_enabled, auto_tier_progression")
      .eq("tiers_enabled", true)
      .eq("auto_tier_progression", true)
      .in("status", ["active", "paused"]);

    if (boostsError) throw boostsError;

    console.log(`Found ${boosts?.length || 0} boosts with auto-progression enabled`);

    const results: TierChangeResult[] = [];

    for (const boost of boosts || []) {
      console.log(`Processing boost: ${boost.title} (${boost.id})`);

      // Get all tiers for this boost
      const { data: tiers, error: tiersError } = await supabase
        .from("boost_creator_tiers")
        .select("*")
        .eq("bounty_campaign_id", boost.id)
        .order("level", { ascending: true });

      if (tiersError) throw tiersError;
      if (!tiers || tiers.length === 0) continue;

      // Get all creator assignments for this boost
      const { data: assignments, error: assignmentsError } = await supabase
        .from("boost_tier_assignments")
        .select("*")
        .eq("bounty_campaign_id", boost.id);

      if (assignmentsError) throw assignmentsError;
      if (!assignments || assignments.length === 0) continue;

      // Get metrics for the evaluation month
      const { data: metrics, error: metricsError } = await supabase
        .from("creator_tier_metrics")
        .select("*")
        .eq("bounty_campaign_id", boost.id)
        .eq("period_year", evalYear)
        .eq("period_month", evalMonth);

      if (metricsError) throw metricsError;

      const metricsMap = new Map<string, CreatorTierMetrics>(
        (metrics || []).map((m: CreatorTierMetrics) => [m.user_id, m])
      );

      // Evaluate each creator
      for (const assignment of assignments as CreatorAssignment[]) {
        const currentTier = tiers.find((t: CreatorTier) => t.id === assignment.tier_id);
        if (!currentTier) continue;

        const creatorMetrics = metricsMap.get(assignment.user_id);
        const evaluation = evaluateCreator(
          assignment,
          currentTier,
          tiers as CreatorTier[],
          creatorMetrics
        );

        if (evaluation.action === "maintain") {
          // Just increment months in tier
          await supabase
            .from("boost_tier_assignments")
            .update({
              months_in_tier: assignment.months_in_tier + 1,
            })
            .eq("id", assignment.id);

          continue;
        }

        if (evaluation.action === "warning") {
          // Record warning in metrics
          if (creatorMetrics) {
            await supabase
              .from("creator_tier_metrics")
              .update({ demotion_warning: true })
              .eq("id", creatorMetrics.id);
          }

          // Increment months in tier
          await supabase
            .from("boost_tier_assignments")
            .update({
              months_in_tier: assignment.months_in_tier + 1,
            })
            .eq("id", assignment.id);

          results.push({
            boost_id: boost.id,
            user_id: assignment.user_id,
            action: "warning",
            reason: evaluation.reason,
          });

          continue;
        }

        if (evaluation.new_tier_id) {
          // Perform tier change
          const newTier = tiers.find((t: CreatorTier) => t.id === evaluation.new_tier_id);

          // Update assignment
          await supabase
            .from("boost_tier_assignments")
            .update({
              tier_id: evaluation.new_tier_id,
              previous_tier_id: assignment.tier_id,
              assignment_reason: evaluation.action === "promote" ? "auto_promoted" : "auto_demoted",
              assigned_at: new Date().toISOString(),
              months_in_tier: 0,
              tier_start_date: new Date().toISOString().split("T")[0],
            })
            .eq("id", assignment.id);

          // Record in history
          await supabase.from("tier_change_history").insert({
            bounty_campaign_id: boost.id,
            user_id: assignment.user_id,
            from_tier_id: assignment.tier_id,
            to_tier_id: evaluation.new_tier_id,
            change_type: evaluation.action,
            change_reason: evaluation.reason,
            performance_snapshot: evaluation.performance_snapshot,
            criteria_evaluation: evaluation.criteria_evaluation,
          });

          results.push({
            boost_id: boost.id,
            user_id: assignment.user_id,
            action: evaluation.action,
            from_tier: currentTier.name,
            to_tier: newTier?.name,
            reason: evaluation.reason,
          });

          console.log(
            `${evaluation.action}: ${assignment.user_id} from ${currentTier.name} to ${newTier?.name}`
          );
        }
      }
    }

    console.log(`Processed ${results.length} tier changes`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error processing tier progression:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function evaluateCreator(
  assignment: CreatorAssignment,
  currentTier: CreatorTier,
  allTiers: CreatorTier[],
  metrics: CreatorTierMetrics | undefined
): TierEvaluationResult {
  const performanceSnapshot: PerformanceSnapshot = {
    months_in_tier: assignment.months_in_tier + 1,
  };

  const metCriteria: string[] = [];
  const failedCriteria: string[] = [];

  // If no metrics for this month, check for demotion (missed quota)
  if (!metrics) {
    // Check demotion criteria
    const demotionCriteria = currentTier.demotion_criteria;

    // This counts as a missed quota
    // Check if there's a lower tier to demote to
    const lowerTier = allTiers.find((t) => t.level === currentTier.level - 1);

    if (lowerTier && demotionCriteria.consecutive_missed_quotas <= 1) {
      return {
        user_id: assignment.user_id,
        current_tier_id: assignment.tier_id,
        new_tier_id: lowerTier.id,
        action: "demote",
        reason: "Missed monthly quota - no submissions",
        performance_snapshot,
        criteria_evaluation: { met_criteria: metCriteria, failed_criteria: ["quota_met"] },
      };
    }

    // Issue warning instead
    return {
      user_id: assignment.user_id,
      current_tier_id: assignment.tier_id,
      new_tier_id: null,
      action: "warning",
      reason: "Missed monthly quota",
      performance_snapshot,
      criteria_evaluation: { met_criteria: metCriteria, failed_criteria: ["quota_met"] },
    };
  }

  // Populate performance snapshot
  performanceSnapshot.videos_submitted = metrics.videos_submitted;
  performanceSnapshot.videos_approved = metrics.videos_approved;
  performanceSnapshot.completion_rate = metrics.completion_rate;
  performanceSnapshot.avg_views = metrics.avg_views_per_video;
  performanceSnapshot.engagement_rate = metrics.engagement_rate;
  performanceSnapshot.total_earned = metrics.total_earnings;
  performanceSnapshot.quota_met = metrics.quota_met;

  // Check for demotion first
  const demotionCriteria = currentTier.demotion_criteria;
  const lowerTier = allTiers.find((t) => t.level === currentTier.level - 1);

  if (!metrics.quota_met || metrics.completion_rate < demotionCriteria.min_completion_rate) {
    failedCriteria.push("completion_rate");

    // Check if should demote
    // For now, demote after 2 consecutive missed quotas (simplified check)
    if (lowerTier && metrics.completion_rate < demotionCriteria.min_completion_rate * 0.8) {
      return {
        user_id: assignment.user_id,
        current_tier_id: assignment.tier_id,
        new_tier_id: lowerTier.id,
        action: "demote",
        reason: `Completion rate (${(metrics.completion_rate * 100).toFixed(0)}%) significantly below minimum`,
        performance_snapshot,
        criteria_evaluation: { met_criteria: metCriteria, failed_criteria: failedCriteria },
      };
    }

    // Issue warning
    return {
      user_id: assignment.user_id,
      current_tier_id: assignment.tier_id,
      new_tier_id: null,
      action: "warning",
      reason: "Below minimum completion rate",
      performance_snapshot,
      criteria_evaluation: { met_criteria: metCriteria, failed_criteria: failedCriteria },
    };
  }

  // Check for promotion
  const nextTier = allTiers.find((t) => t.level === currentTier.level + 1);
  if (!nextTier) {
    // Already at highest tier
    return {
      user_id: assignment.user_id,
      current_tier_id: assignment.tier_id,
      new_tier_id: null,
      action: "maintain",
      reason: "At highest tier",
      performance_snapshot,
      criteria_evaluation: { met_criteria: metCriteria, failed_criteria: failedCriteria },
    };
  }

  const promotionCriteria = currentTier.promotion_criteria;
  const monthsActive = assignment.months_in_tier + 1;

  // Check each promotion criterion
  if (monthsActive >= promotionCriteria.min_months_active) {
    metCriteria.push("min_months_active");
  } else {
    failedCriteria.push("min_months_active");
  }

  if (metrics.avg_views_per_video >= promotionCriteria.min_avg_views) {
    metCriteria.push("min_avg_views");
  } else {
    failedCriteria.push("min_avg_views");
  }

  if (metrics.completion_rate >= promotionCriteria.min_completion_rate) {
    metCriteria.push("min_completion_rate");
  } else {
    failedCriteria.push("min_completion_rate");
  }

  if (metrics.engagement_rate >= promotionCriteria.min_engagement_rate) {
    metCriteria.push("min_engagement_rate");
  } else {
    failedCriteria.push("min_engagement_rate");
  }

  // All criteria met = promote
  if (failedCriteria.length === 0) {
    return {
      user_id: assignment.user_id,
      current_tier_id: assignment.tier_id,
      new_tier_id: nextTier.id,
      action: "promote",
      reason: "Met all promotion criteria",
      performance_snapshot,
      criteria_evaluation: { met_criteria: metCriteria, failed_criteria: failedCriteria },
    };
  }

  // Maintain current tier
  return {
    user_id: assignment.user_id,
    current_tier_id: assignment.tier_id,
    new_tier_id: null,
    action: "maintain",
    reason: `Did not meet all promotion criteria (${failedCriteria.length} remaining)`,
    performance_snapshot,
    criteria_evaluation: { met_criteria: metCriteria, failed_criteria: failedCriteria },
  };
}
