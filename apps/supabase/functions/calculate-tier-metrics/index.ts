import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BoostSubmission {
  id: string;
  user_id: string;
  bounty_campaign_id: string;
  status: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  created_at: string;
}

interface CreatorAssignment {
  id: string;
  bounty_campaign_id: string;
  user_id: string;
  tier_id: string;
  tier: {
    id: string;
    videos_per_month: number;
    monthly_retainer: number;
  };
}

interface MetricsResult {
  boost_id: string;
  user_id: string;
  videos_submitted: number;
  videos_approved: number;
  total_views: number;
  avg_views: number;
  completion_rate: number;
  engagement_rate: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional year/month override
    let targetYear: number;
    let targetMonth: number;

    try {
      const body = await req.json();
      targetYear = body.year || new Date().getFullYear();
      targetMonth = body.month || new Date().getMonth() + 1;
    } catch {
      // Default to current month
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    console.log(`Calculating tier metrics for ${targetMonth}/${targetYear}`);

    // Calculate date range for the target month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Find all boosts with tiers enabled
    const { data: boosts, error: boostsError } = await supabase
      .from("bounty_campaigns")
      .select("id, title, tiers_enabled")
      .eq("tiers_enabled", true);

    if (boostsError) throw boostsError;

    console.log(`Found ${boosts?.length || 0} boosts with tiers enabled`);

    const results: MetricsResult[] = [];
    let metricsCreated = 0;
    let metricsUpdated = 0;

    for (const boost of boosts || []) {
      console.log(`Processing boost: ${boost.title} (${boost.id})`);

      // Get all creator tier assignments for this boost
      const { data: assignments, error: assignmentsError } = await supabase
        .from("creator_tier_assignments")
        .select(`
          id,
          bounty_campaign_id,
          user_id,
          tier_id,
          tier:boost_creator_tiers!tier_id (
            id,
            videos_per_month,
            monthly_retainer
          )
        `)
        .eq("bounty_campaign_id", boost.id);

      if (assignmentsError) {
        console.error(`Error fetching assignments for boost ${boost.id}:`, assignmentsError);
        continue;
      }

      if (!assignments || assignments.length === 0) {
        console.log(`No tier assignments for boost ${boost.id}`);
        continue;
      }

      // Get all boost submissions for this month
      const { data: submissions, error: submissionsError } = await supabase
        .from("boost_submissions")
        .select("id, user_id, bounty_campaign_id, status, views, likes, comments, shares, created_at")
        .eq("bounty_campaign_id", boost.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (submissionsError) {
        console.error(`Error fetching submissions for boost ${boost.id}:`, submissionsError);
        continue;
      }

      // Group submissions by user
      const userSubmissions = new Map<string, BoostSubmission[]>();
      for (const sub of (submissions || []) as BoostSubmission[]) {
        const existing = userSubmissions.get(sub.user_id) || [];
        existing.push(sub);
        userSubmissions.set(sub.user_id, existing);
      }

      // Calculate metrics for each creator
      for (const assignment of assignments as CreatorAssignment[]) {
        const subs = userSubmissions.get(assignment.user_id) || [];
        const approvedSubs = subs.filter((s) => s.status === "approved");
        const rejectedSubs = subs.filter((s) => s.status === "rejected");

        // Calculate metrics
        const videosSubmitted = subs.length;
        const videosApproved = approvedSubs.length;
        const videosRejected = rejectedSubs.length;

        const totalViews = approvedSubs.reduce((sum, s) => sum + (s.views || 0), 0);
        const totalLikes = approvedSubs.reduce((sum, s) => sum + (s.likes || 0), 0);
        const totalComments = approvedSubs.reduce((sum, s) => sum + (s.comments || 0), 0);
        const totalShares = approvedSubs.reduce((sum, s) => sum + (s.shares || 0), 0);

        const avgViewsPerVideo = videosApproved > 0 ? totalViews / videosApproved : 0;

        // Completion rate = approved / required quota
        const quotaRequired = assignment.tier?.videos_per_month || 1;
        const completionRate = Math.min(videosApproved / quotaRequired, 1);

        // Engagement rate = (likes + comments + shares) / views
        const totalEngagement = totalLikes + totalComments + totalShares;
        const engagementRate = totalViews > 0 ? totalEngagement / totalViews : 0;

        // Calculate earnings (simplified: base retainer * completion rate)
        const baseEarnings = (assignment.tier?.monthly_retainer || 0) * completionRate;
        const bonusEarnings = 0; // Could be calculated based on performance
        const totalEarnings = baseEarnings + bonusEarnings;

        const quotaMet = videosApproved >= quotaRequired;

        // Check for existing metrics record
        const { data: existingMetrics } = await supabase
          .from("creator_tier_metrics")
          .select("id")
          .eq("bounty_campaign_id", boost.id)
          .eq("user_id", assignment.user_id)
          .eq("period_year", targetYear)
          .eq("period_month", targetMonth)
          .single();

        const metricsData = {
          bounty_campaign_id: boost.id,
          user_id: assignment.user_id,
          tier_id: assignment.tier_id,
          period_year: targetYear,
          period_month: targetMonth,
          videos_submitted: videosSubmitted,
          videos_approved: videosApproved,
          videos_rejected: videosRejected,
          total_views: totalViews,
          total_likes: totalLikes,
          total_comments: totalComments,
          total_shares: totalShares,
          completion_rate: completionRate,
          avg_views_per_video: avgViewsPerVideo,
          engagement_rate: engagementRate,
          base_earnings: baseEarnings,
          bonus_earnings: bonusEarnings,
          total_earnings: totalEarnings,
          quota_required: quotaRequired,
          quota_met: quotaMet,
          promotion_eligible: false, // Will be determined by process-tier-progression
          demotion_warning: false,
        };

        if (existingMetrics?.id) {
          // Update existing
          const { error: updateError } = await supabase
            .from("creator_tier_metrics")
            .update(metricsData)
            .eq("id", existingMetrics.id);

          if (updateError) {
            console.error(`Error updating metrics for user ${assignment.user_id}:`, updateError);
          } else {
            metricsUpdated++;
          }
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from("creator_tier_metrics")
            .insert(metricsData);

          if (insertError) {
            console.error(`Error inserting metrics for user ${assignment.user_id}:`, insertError);
          } else {
            metricsCreated++;
          }
        }

        results.push({
          boost_id: boost.id,
          user_id: assignment.user_id,
          videos_submitted: videosSubmitted,
          videos_approved: videosApproved,
          total_views: totalViews,
          avg_views: avgViewsPerVideo,
          completion_rate: completionRate,
          engagement_rate: engagementRate,
        });
      }
    }

    console.log(`Metrics calculation complete: ${metricsCreated} created, ${metricsUpdated} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        period: `${targetMonth}/${targetYear}`,
        metrics_created: metricsCreated,
        metrics_updated: metricsUpdated,
        total_processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error calculating tier metrics:", error);
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
