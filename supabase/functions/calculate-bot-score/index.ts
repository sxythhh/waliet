import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoFeatures {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  hours_since_upload: number;
  hours_since_submission: number;
  author_verified: boolean;
  author_follower_count: number | null;
  account_age_days: number;
  creator_previous_submissions: number;
  creator_previous_flags: number;
  creator_trust_score: number;
  campaign_avg_engagement_rate: number | null;
  campaign_avg_views: number | null;
  platform: string;
}

interface BotScoreResult {
  bot_score: number;
  confidence: number;
  flags: string[];
  feature_contributions: Record<string, number>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const botScoringApiUrl = Deno.env.get('BOT_SCORING_API_URL') || 'http://localhost:8000';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { submissionIds, payoutRequestId } = body;

    // Either get submissions by IDs or by payout request
    let videoSubmissions: any[] = [];

    if (payoutRequestId) {
      // Get submissions linked to this payout request via payment_ledger
      const { data: ledgerEntries, error: ledgerError } = await supabase
        .from('payment_ledger')
        .select(`
          video_submission_id,
          video_submissions:video_submission_id (
            id, video_url, platform, views, likes, comments, shares, bookmarks,
            video_upload_date, submitted_at, creator_id, source_type, source_id,
            social_account_id
          )
        `)
        .eq('payout_request_id', payoutRequestId);

      if (ledgerError) {
        console.error('Failed to fetch ledger entries:', ledgerError);
        throw new Error('Failed to fetch submissions for payout');
      }

      videoSubmissions = (ledgerEntries || [])
        .map(e => e.video_submissions)
        .filter(Boolean);

    } else if (submissionIds && submissionIds.length > 0) {
      const { data, error } = await supabase
        .from('video_submissions')
        .select(`
          id, video_url, platform, views, likes, comments, shares, bookmarks,
          video_upload_date, submitted_at, creator_id, source_type, source_id,
          social_account_id
        `)
        .in('id', submissionIds);

      if (error) {
        console.error('Failed to fetch submissions:', error);
        throw new Error('Failed to fetch submissions');
      }
      videoSubmissions = data || [];
    } else {
      return new Response(JSON.stringify({ error: 'Either submissionIds or payoutRequestId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (videoSubmissions.length === 0) {
      return new Response(JSON.stringify({ scores: [], message: 'No submissions found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${videoSubmissions.length} submissions for bot scoring`);

    // Gather creator info
    const creatorIds = [...new Set(videoSubmissions.map(s => s.creator_id))];
    const { data: creators } = await supabase
      .from('profiles')
      .select('id, created_at, trust_score, fraud_flag_count')
      .in('id', creatorIds);

    const creatorsMap = (creators || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, any>);

    // Get previous submission counts
    const { data: submissionCounts } = await supabase
      .from('video_submissions')
      .select('creator_id')
      .in('creator_id', creatorIds);

    const submissionCountMap = (submissionCounts || []).reduce((acc, s) => {
      acc[s.creator_id] = (acc[s.creator_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get social account follower counts
    const socialAccountIds = videoSubmissions.map(s => s.social_account_id).filter(Boolean);
    const { data: socialAccounts } = await supabase
      .from('social_accounts')
      .select('id, follower_count, is_verified')
      .in('id', socialAccountIds);

    const socialAccountsMap = (socialAccounts || []).reduce(
      (acc, a) => ({ ...acc, [a.id]: a }),
      {} as Record<string, any>
    );

    // Get campaign/boost average engagement (for context)
    const sourceIds = [...new Set(videoSubmissions.map(s => s.source_id))];
    const campaignAvgMap: Record<string, { avg_engagement: number; avg_views: number }> = {};

    for (const sourceId of sourceIds) {
      const { data: campaignVideos } = await supabase
        .from('video_submissions')
        .select('views, likes, comments, shares')
        .eq('source_id', sourceId)
        .eq('status', 'approved')
        .limit(100);

      if (campaignVideos && campaignVideos.length > 0) {
        const totalViews = campaignVideos.reduce((sum, v) => sum + (v.views || 0), 0);
        const totalEngagement = campaignVideos.reduce(
          (sum, v) => sum + (v.likes || 0) + (v.comments || 0) + (v.shares || 0),
          0
        );
        const avgViews = totalViews / campaignVideos.length;
        const avgEngagement = totalViews > 0 ? totalEngagement / totalViews : 0;
        campaignAvgMap[sourceId] = { avg_engagement: avgEngagement, avg_views: avgViews };
      }
    }

    // Build feature vectors for each submission
    const now = Date.now();
    const features: VideoFeatures[] = videoSubmissions.map(submission => {
      const creator = creatorsMap[submission.creator_id] || {};
      const socialAccount = socialAccountsMap[submission.social_account_id] || {};
      const campaignAvg = campaignAvgMap[submission.source_id];

      const uploadDate = submission.video_upload_date ? new Date(submission.video_upload_date).getTime() : now;
      const submittedAt = submission.submitted_at ? new Date(submission.submitted_at).getTime() : now;
      const createdAt = creator.created_at ? new Date(creator.created_at).getTime() : now;

      const hoursSinceUpload = Math.max((now - uploadDate) / (1000 * 60 * 60), 0.1);
      const hoursSinceSubmission = Math.max((now - submittedAt) / (1000 * 60 * 60), 0.1);
      const accountAgeDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

      return {
        views: submission.views || 0,
        likes: submission.likes || 0,
        comments: submission.comments || 0,
        shares: submission.shares || 0,
        bookmarks: submission.bookmarks || 0,
        hours_since_upload: hoursSinceUpload,
        hours_since_submission: hoursSinceSubmission,
        author_verified: socialAccount.is_verified || false,
        author_follower_count: socialAccount.follower_count || null,
        account_age_days: accountAgeDays,
        creator_previous_submissions: submissionCountMap[submission.creator_id] || 0,
        creator_previous_flags: creator.fraud_flag_count || 0,
        creator_trust_score: creator.trust_score || 100,
        campaign_avg_engagement_rate: campaignAvg?.avg_engagement || null,
        campaign_avg_views: campaignAvg?.avg_views || null,
        platform: submission.platform || 'unknown',
      };
    });

    // Call the Python bot scoring API
    let scores: BotScoreResult[] = [];

    try {
      const response = await fetch(`${botScoringApiUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissions: features }),
      });

      if (!response.ok) {
        throw new Error(`Bot scoring API returned ${response.status}`);
      }

      const result = await response.json();
      scores = result.scores;
    } catch (apiError) {
      console.error('Bot scoring API error, using fallback:', apiError);
      // Fallback: simple rule-based scoring if API is unavailable
      scores = features.map(f => calculateFallbackScore(f));
    }

    // Update bot_score in database
    const updates = videoSubmissions.map((submission, i) => ({
      id: submission.id,
      bot_score: scores[i].bot_score,
    }));

    for (const update of updates) {
      await supabase
        .from('video_submissions')
        .update({ bot_score: update.bot_score })
        .eq('id', update.id);
    }

    // Build response with submission IDs mapped to scores
    const response = {
      scores: videoSubmissions.map((submission, i) => ({
        submission_id: submission.id,
        ...scores[i],
      })),
      summary: {
        total: scores.length,
        high_risk: scores.filter(s => s.bot_score >= 60).length,
        medium_risk: scores.filter(s => s.bot_score >= 40 && s.bot_score < 60).length,
        low_risk: scores.filter(s => s.bot_score < 40).length,
        avg_score: scores.reduce((sum, s) => sum + s.bot_score, 0) / scores.length,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bot scoring error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Fallback scoring when Python API is unavailable
 */
function calculateFallbackScore(features: VideoFeatures): BotScoreResult {
  const flags: string[] = [];
  let score = 0;

  const views = Math.max(features.views, 1);
  const engagementRate = (features.likes + features.comments) / views;

  // Low engagement check
  if (features.views > 1000 && engagementRate < 0.001) {
    flags.push('extremely_low_engagement');
    score += 25;
  }

  // High velocity check
  const viewVelocity = features.views / Math.max(features.hours_since_upload, 0.1);
  if (viewVelocity > 10000 && !features.author_verified) {
    flags.push('high_velocity_unverified');
    score += 20;
  }

  // New account with high views
  if (features.account_age_days < 30 && features.views > 50000) {
    flags.push('new_account_viral');
    score += 15;
  }

  // Previous fraud history
  if (features.creator_previous_flags >= 2) {
    flags.push('repeat_fraud_history');
    score += 30;
  }

  // Low trust score
  if (features.creator_trust_score < 50) {
    flags.push('low_trust_score');
    score += 15;
  }

  // Zero comments with high views
  if (features.views > 5000 && features.comments === 0) {
    flags.push('zero_comments_high_views');
    score += 15;
  }

  return {
    bot_score: Math.min(score, 100),
    confidence: 0.5,
    flags,
    feature_contributions: { fallback: 1 },
  };
}
