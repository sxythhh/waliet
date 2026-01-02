import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrustScoreBreakdown {
  baseScore: number;
  accountAgeBonus: number;
  approvalRateBonus: number;
  rejectionPenalty: number;
  fraudHistoryPenalty: number;
  permanentFraudPenalty: number;
  totalScore: number;
}

interface CalculateTrustScoreRequest {
  userId?: string;
  recalculateAll?: boolean;
}

/**
 * Trust Score Calculation Formula:
 * - Base Score: 50
 * - Account Age Bonus: min(20, account_days / 30 * 2) - max 20 points over 10 months
 * - Approval Rate Bonus: (approved / total_submissions) * 20 - max 20 points
 * - Rejection Penalty: (rejected / total_submissions) * 15 - max 15 points
 * - Fraud History Penalty: fraud_flag_count * 10 - unbounded
 * - Permanent Fraud Flag: -30 if fraud_flag_permanent is true
 *
 * Score is clamped between 0 and 100
 */
function calculateTrustScore(
  accountAgeDays: number,
  approvedCount: number,
  rejectedCount: number,
  totalSubmissions: number,
  fraudFlagCount: number,
  fraudFlagPermanent: boolean
): TrustScoreBreakdown {
  // Base score
  const baseScore = 50;

  // Account age bonus: 2 points per month, max 20
  const accountAgeBonus = Math.min(20, (accountAgeDays / 30) * 2);

  // Approval rate bonus: up to 20 points based on approval rate
  const approvalRateBonus = totalSubmissions > 0
    ? (approvedCount / totalSubmissions) * 20
    : 0;

  // Rejection penalty: up to 15 points based on rejection rate
  const rejectionPenalty = totalSubmissions > 0
    ? (rejectedCount / totalSubmissions) * 15
    : 0;

  // Fraud history penalty: 10 points per fraud flag
  const fraudHistoryPenalty = fraudFlagCount * 10;

  // Permanent fraud flag penalty
  const permanentFraudPenalty = fraudFlagPermanent ? 30 : 0;

  // Calculate total score
  let totalScore = baseScore + accountAgeBonus + approvalRateBonus
    - rejectionPenalty - fraudHistoryPenalty - permanentFraudPenalty;

  // Clamp between 0 and 100
  totalScore = Math.max(0, Math.min(100, totalScore));

  return {
    baseScore,
    accountAgeBonus: Math.round(accountAgeBonus * 100) / 100,
    approvalRateBonus: Math.round(approvalRateBonus * 100) / 100,
    rejectionPenalty: Math.round(rejectionPenalty * 100) / 100,
    fraudHistoryPenalty,
    permanentFraudPenalty,
    totalScore: Math.round(totalScore * 100) / 100,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: CalculateTrustScoreRequest = await req.json().catch(() => ({}));
    const { userId, recalculateAll } = body;

    // Get users to process
    let usersToProcess: string[] = [];

    if (userId) {
      usersToProcess = [userId];
    } else if (recalculateAll) {
      // Get all user IDs
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');
      usersToProcess = (profiles || []).map(p => p.id);
    } else {
      return new Response(JSON.stringify({
        error: 'Either userId or recalculateAll must be provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${usersToProcess.length} users`);

    const results: { userId: string; score: number; breakdown: TrustScoreBreakdown }[] = [];

    for (const uid of usersToProcess) {
      try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, created_at, fraud_flag_count, fraud_flag_permanent, trust_score')
          .eq('id', uid)
          .single();

        if (profileError || !profile) {
          console.error(`Profile not found for user ${uid}:`, profileError);
          continue;
        }

        // Calculate account age in days
        const createdAt = new Date(profile.created_at);
        const now = new Date();
        const accountAgeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        // Get submission statistics
        const { data: submissions, error: subError } = await supabase
          .from('video_submissions')
          .select('status')
          .eq('creator_id', uid);

        if (subError) {
          console.error(`Error fetching submissions for user ${uid}:`, subError);
          continue;
        }

        const totalSubmissions = submissions?.length || 0;
        const approvedCount = submissions?.filter(s => s.status === 'approved').length || 0;
        const rejectedCount = submissions?.filter(s => s.status === 'rejected').length || 0;

        // Calculate trust score
        const breakdown = calculateTrustScore(
          accountAgeDays,
          approvedCount,
          rejectedCount,
          totalSubmissions,
          profile.fraud_flag_count || 0,
          profile.fraud_flag_permanent || false
        );

        // Determine change reason
        let changeReason = 'Scheduled recalculation';
        if (userId) {
          changeReason = 'Manual recalculation';
        }

        // Update profile with new trust score
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            trust_score: breakdown.totalScore,
            trust_score_updated_at: new Date().toISOString(),
          })
          .eq('id', uid);

        if (updateError) {
          console.error(`Error updating trust score for user ${uid}:`, updateError);
          continue;
        }

        // Record in history if score changed
        const previousScore = profile.trust_score || 50;
        if (Math.abs(previousScore - breakdown.totalScore) > 0.01) {
          await supabase
            .from('trust_score_history')
            .insert({
              user_id: uid,
              trust_score: breakdown.totalScore,
              score_breakdown: breakdown,
              change_reason: changeReason,
            });
        }

        results.push({
          userId: uid,
          score: breakdown.totalScore,
          breakdown,
        });

        console.log(`Updated trust score for user ${uid}: ${breakdown.totalScore}`);
      } catch (err) {
        console.error(`Error processing user ${uid}:`, err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error calculating trust score:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
