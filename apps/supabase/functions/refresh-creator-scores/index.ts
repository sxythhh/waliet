import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface CreatorFeedback {
  creator_id: string;
  avg_quality: number | null;
  avg_communication: number | null;
  avg_timeliness: number | null;
  avg_adherence: number | null;
  total_feedback: number;
  would_hire_again_count: number;
  retainer_recommended_count: number;
}

interface CreatorPerformance {
  creator_id: string;
  campaigns_completed: number;
  boosts_completed: number;
  videos_delivered: number;
  avg_views: number | null;
  unique_brands: number;
}

interface ComputedScore {
  creator_id: string;
  avg_quality_score: number | null;
  avg_communication_score: number | null;
  avg_timeliness_score: number | null;
  avg_adherence_score: number | null;
  total_feedback_count: number;
  total_campaigns_completed: number;
  total_boosts_completed: number;
  total_videos_delivered: number;
  avg_views_per_video: number | null;
  repeat_hire_rate: number | null;
  retainer_recommendation_rate: number | null;
  unique_brands_worked_with: number;
  value_score: number | null;
  overall_score: number;
}

// Scoring weights for overall score calculation
const WEIGHTS = {
  quality: 0.25,
  communication: 0.10,
  timeliness: 0.15,
  adherence: 0.10,
  experience: 0.15, // Based on campaigns completed
  repeatHire: 0.15,
  retainerRec: 0.10,
};

function calculateOverallScore(
  avgQuality: number | null,
  avgCommunication: number | null,
  avgTimeliness: number | null,
  avgAdherence: number | null,
  campaignsCompleted: number,
  repeatHireRate: number | null,
  retainerRecRate: number | null,
  trustScore: number | null
): number {
  // Normalize scores to 0-100 scale
  const qualityNorm = avgQuality ? (avgQuality / 5) * 100 : 50;
  const commNorm = avgCommunication ? (avgCommunication / 5) * 100 : 50;
  const timeNorm = avgTimeliness ? (avgTimeliness / 5) * 100 : 50;
  const adherenceNorm = avgAdherence ? (avgAdherence / 5) * 100 : 50;

  // Experience score (caps at 20 campaigns)
  const expNorm = Math.min(campaignsCompleted / 20, 1) * 100;

  // Hiring signals
  const repeatNorm = repeatHireRate !== null ? repeatHireRate * 100 : 50;
  const retainerNorm = retainerRecRate !== null ? retainerRecRate * 100 : 50;

  // Calculate weighted score
  let weightedScore =
    qualityNorm * WEIGHTS.quality +
    commNorm * WEIGHTS.communication +
    timeNorm * WEIGHTS.timeliness +
    adherenceNorm * WEIGHTS.adherence +
    expNorm * WEIGHTS.experience +
    repeatNorm * WEIGHTS.repeatHire +
    retainerNorm * WEIGHTS.retainerRec;

  // If no feedback data, blend with trust score
  const hasFeedback = avgQuality !== null;
  if (!hasFeedback && trustScore !== null) {
    weightedScore = trustScore * 0.7 + weightedScore * 0.3;
  }

  return Math.round(weightedScore * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional creator_id filter from request
    let creatorIds: string[] | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.creator_ids && Array.isArray(body.creator_ids)) {
          creatorIds = body.creator_ids;
        }
      } catch {
        // No body or invalid JSON, process all creators
      }
    }

    console.log(`Refreshing creator scores${creatorIds ? ` for ${creatorIds.length} creators` : ' for all creators'}`);

    // Step 1: Aggregate brand feedback per creator
    const feedbackQuery = supabase
      .from('brand_creator_feedback')
      .select('creator_id, quality_score, communication_score, timeliness_score, adherence_score, would_hire_again, recommended_for_retainer');

    if (creatorIds) {
      feedbackQuery.in('creator_id', creatorIds);
    }

    const { data: feedbackData, error: feedbackError } = await feedbackQuery;

    if (feedbackError) {
      throw new Error(`Failed to fetch feedback: ${feedbackError.message}`);
    }

    // Group feedback by creator
    const feedbackByCreator = new Map<string, CreatorFeedback>();
    for (const row of feedbackData || []) {
      const existing = feedbackByCreator.get(row.creator_id) || {
        creator_id: row.creator_id,
        avg_quality: null,
        avg_communication: null,
        avg_timeliness: null,
        avg_adherence: null,
        total_feedback: 0,
        would_hire_again_count: 0,
        retainer_recommended_count: 0,
      };

      const scores = {
        quality: [] as number[],
        communication: [] as number[],
        timeliness: [] as number[],
        adherence: [] as number[],
      };

      if (row.quality_score) scores.quality.push(row.quality_score);
      if (row.communication_score) scores.communication.push(row.communication_score);
      if (row.timeliness_score) scores.timeliness.push(row.timeliness_score);
      if (row.adherence_score) scores.adherence.push(row.adherence_score);

      existing.total_feedback++;
      if (row.would_hire_again) existing.would_hire_again_count++;
      if (row.recommended_for_retainer) existing.retainer_recommended_count++;

      feedbackByCreator.set(row.creator_id, existing);
    }

    // Calculate averages for each creator
    for (const [creatorId, feedback] of feedbackByCreator) {
      const allFeedback = (feedbackData || []).filter(f => f.creator_id === creatorId);
      const qualityScores = allFeedback.filter(f => f.quality_score).map(f => f.quality_score!);
      const commScores = allFeedback.filter(f => f.communication_score).map(f => f.communication_score!);
      const timeScores = allFeedback.filter(f => f.timeliness_score).map(f => f.timeliness_score!);
      const adherenceScores = allFeedback.filter(f => f.adherence_score).map(f => f.adherence_score!);

      feedback.avg_quality = qualityScores.length ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : null;
      feedback.avg_communication = commScores.length ? commScores.reduce((a, b) => a + b, 0) / commScores.length : null;
      feedback.avg_timeliness = timeScores.length ? timeScores.reduce((a, b) => a + b, 0) / timeScores.length : null;
      feedback.avg_adherence = adherenceScores.length ? adherenceScores.reduce((a, b) => a + b, 0) / adherenceScores.length : null;
    }

    // Step 2: Get performance metrics for creators
    let creatorsQuery = supabase
      .from('profiles')
      .select('id, trust_score')
      .eq('onboarding_completed', true)
      .eq('account_type', 'creator');

    if (creatorIds) {
      creatorsQuery = creatorsQuery.in('id', creatorIds);
    }

    const { data: creators, error: creatorsError } = await creatorsQuery;

    if (creatorsError) {
      throw new Error(`Failed to fetch creators: ${creatorsError.message}`);
    }

    // Step 3: Get campaign submission stats
    const { data: campaignStats, error: campaignError } = await supabase
      .rpc('get_creator_campaign_stats', { p_creator_ids: creatorIds });

    // Step 4: Build and upsert computed scores
    const scoresToUpsert: ComputedScore[] = [];

    for (const creator of creators || []) {
      const feedback = feedbackByCreator.get(creator.id);
      const stats = (campaignStats || []).find((s: { creator_id: string }) => s.creator_id === creator.id);

      const campaignsCompleted = stats?.campaigns_completed || 0;
      const boostsCompleted = stats?.boosts_completed || 0;
      const videosDelivered = stats?.videos_delivered || 0;
      const uniqueBrands = stats?.unique_brands || 0;

      const repeatHireRate = feedback && feedback.total_feedback > 0
        ? feedback.would_hire_again_count / feedback.total_feedback
        : null;

      const retainerRecRate = feedback && feedback.total_feedback > 0
        ? feedback.retainer_recommended_count / feedback.total_feedback
        : null;

      const overallScore = calculateOverallScore(
        feedback?.avg_quality || null,
        feedback?.avg_communication || null,
        feedback?.avg_timeliness || null,
        feedback?.avg_adherence || null,
        campaignsCompleted,
        repeatHireRate,
        retainerRecRate,
        creator.trust_score
      );

      scoresToUpsert.push({
        creator_id: creator.id,
        avg_quality_score: feedback?.avg_quality ? Math.round(feedback.avg_quality * 100) / 100 : null,
        avg_communication_score: feedback?.avg_communication ? Math.round(feedback.avg_communication * 100) / 100 : null,
        avg_timeliness_score: feedback?.avg_timeliness ? Math.round(feedback.avg_timeliness * 100) / 100 : null,
        avg_adherence_score: feedback?.avg_adherence ? Math.round(feedback.avg_adherence * 100) / 100 : null,
        total_feedback_count: feedback?.total_feedback || 0,
        total_campaigns_completed: campaignsCompleted,
        total_boosts_completed: boostsCompleted,
        total_videos_delivered: videosDelivered,
        avg_views_per_video: stats?.avg_views || null,
        repeat_hire_rate: repeatHireRate ? Math.round(repeatHireRate * 100) / 100 : null,
        retainer_recommendation_rate: retainerRecRate ? Math.round(retainerRecRate * 100) / 100 : null,
        unique_brands_worked_with: uniqueBrands,
        value_score: null, // TODO: Calculate based on rate cards
        overall_score: overallScore,
      });
    }

    // Batch upsert scores
    if (scoresToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('creator_computed_scores')
        .upsert(
          scoresToUpsert.map(s => ({
            ...s,
            last_computed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'creator_id' }
        );

      if (upsertError) {
        throw new Error(`Failed to upsert scores: ${upsertError.message}`);
      }
    }

    console.log(`Successfully refreshed ${scoresToUpsert.length} creator scores`);

    return new Response(
      JSON.stringify({
        success: true,
        refreshed_count: scoresToUpsert.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error refreshing creator scores:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
