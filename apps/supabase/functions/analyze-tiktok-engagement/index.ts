import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  videoId: string;
  username: string;
  targetTable: 'video_submissions' | 'cached_campaign_videos';
  targetId: string;
  checkAutoReject?: boolean;
  boostId?: string;
  // Video stats for engagement ratio analysis
  videoStats?: {
    views: number;
    likes: number;
    comments: number;
    shares?: number;
  };
}

interface CommentAnalysis {
  totalComments: number;
  avgLength: number;
  genericRatio: number;
  duplicateRatio: number;
  shortCommentRatio: number;
  botPatternScore: number;
  verdict: string;
}

interface UserAnalysis {
  authenticityScore: number;
  flags: string[];
  followerCount: number;
  followingCount: number;
  verified: boolean;
}

interface EngagementRatioAnalysis {
  views: number;
  likes: number;
  comments: number;
  likeRate: number;        // likes / views
  commentRate: number;     // comments / views
  expectedCommentRate: number;
  expectedLikeRate: number;
  likeRatioScore: number;  // 0-100, higher = more suspicious
  commentRatioScore: number;
  overallScore: number;
  flags: string[];
  verdict: string;
}

interface BotScoreBreakdown {
  commentAnalysis: CommentAnalysis;
  userAnalysis: UserAnalysis;
  engagementRatioAnalysis?: EngagementRatioAnalysis;
  finalScore: number;
  verdict: string;
  analyzedAt: string;
}

// Expected engagement rates for TikTok (based on industry averages)
const TIKTOK_BENCHMARKS = {
  minLikeRate: 0.03,     // 3% - minimum expected like rate
  avgLikeRate: 0.08,     // 8% - average like rate
  minCommentRate: 0.005, // 0.5% - minimum expected comment rate
  avgCommentRate: 0.015, // 1.5% - average comment rate
  minViewsForAnalysis: 1000, // Only analyze ratio if video has 1k+ views
};

function analyzeEngagementRatios(stats: { views: number; likes: number; comments: number; shares?: number }): EngagementRatioAnalysis {
  const { views, likes, comments } = stats;
  const flags: string[] = [];

  // Calculate actual rates
  const likeRate = views > 0 ? likes / views : 0;
  const commentRate = views > 0 ? comments / views : 0;

  let likeRatioScore = 0;
  let commentRatioScore = 0;

  // Only analyze if video has enough views to be meaningful
  if (views >= TIKTOK_BENCHMARKS.minViewsForAnalysis) {
    // Like ratio analysis
    if (likeRate < TIKTOK_BENCHMARKS.minLikeRate * 0.1) {
      // Less than 10% of minimum expected - extremely suspicious
      likeRatioScore = 80;
      flags.push('extremely_low_like_rate');
    } else if (likeRate < TIKTOK_BENCHMARKS.minLikeRate * 0.3) {
      // Less than 30% of minimum expected - very suspicious
      likeRatioScore = 60;
      flags.push('very_low_like_rate');
    } else if (likeRate < TIKTOK_BENCHMARKS.minLikeRate) {
      // Below minimum expected
      likeRatioScore = 40;
      flags.push('low_like_rate');
    } else if (likeRate > 0.5) {
      // Suspiciously high like rate (>50%)
      likeRatioScore = 30;
      flags.push('unusually_high_like_rate');
    }

    // Comment ratio analysis
    if (commentRate < TIKTOK_BENCHMARKS.minCommentRate * 0.05) {
      // Less than 5% of minimum expected - extremely suspicious (like 1 comment on 42k views)
      commentRatioScore = 90;
      flags.push('extremely_low_comment_rate');
    } else if (commentRate < TIKTOK_BENCHMARKS.minCommentRate * 0.2) {
      // Less than 20% of minimum expected - very suspicious
      commentRatioScore = 70;
      flags.push('very_low_comment_rate');
    } else if (commentRate < TIKTOK_BENCHMARKS.minCommentRate) {
      // Below minimum expected
      commentRatioScore = 45;
      flags.push('low_comment_rate');
    }

    // Check for imbalanced engagement (high likes but no comments or vice versa)
    if (likes > 0 && comments === 0 && views >= 5000) {
      commentRatioScore = Math.max(commentRatioScore, 85);
      flags.push('zero_comments_with_engagement');
    }

    if (likeRate > 0.1 && commentRate < 0.001) {
      // High likes but almost no comments - engagement farming pattern
      flags.push('engagement_imbalance');
      commentRatioScore = Math.max(commentRatioScore, 60);
    }
  }

  // Overall engagement ratio score (weighted average)
  const overallScore = Math.round((likeRatioScore * 0.4) + (commentRatioScore * 0.6));

  // Determine verdict
  let verdict: string;
  if (overallScore < 20) verdict = 'normal';
  else if (overallScore < 40) verdict = 'slightly_unusual';
  else if (overallScore < 60) verdict = 'suspicious';
  else if (overallScore < 80) verdict = 'very_suspicious';
  else verdict = 'likely_fake_views';

  return {
    views,
    likes,
    comments,
    likeRate,
    commentRate,
    expectedCommentRate: TIKTOK_BENCHMARKS.avgCommentRate,
    expectedLikeRate: TIKTOK_BENCHMARKS.avgLikeRate,
    likeRatioScore,
    commentRatioScore,
    overallScore,
    flags,
    verdict
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const {
      videoId,
      username,
      targetTable,
      targetId,
      checkAutoReject = true,
      boostId,
      videoStats
    }: AnalysisRequest = await req.json();

    if (!videoId || !username || !targetTable || !targetId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: videoId, username, targetTable, targetId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing TikTok engagement for video ${videoId} by @${username}`);

    // Mark as analyzing
    await supabase
      .from(targetTable)
      .update({ bot_analysis_status: 'analyzing' })
      .eq('id', targetId);

    // 1. Fetch comment analysis
    let commentAnalysis: CommentAnalysis = {
      totalComments: 0,
      avgLength: 0,
      genericRatio: 0,
      duplicateRatio: 0,
      shortCommentRatio: 0,
      botPatternScore: 0,
      verdict: 'no_data'
    };

    try {
      const commentsResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-tiktok-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, count: 50 })
      });

      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        if (commentsData.success && commentsData.analysis) {
          commentAnalysis = commentsData.analysis;
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }

    // 2. Fetch user analysis
    let userAnalysis: UserAnalysis = {
      authenticityScore: 70,
      flags: [],
      followerCount: 0,
      followingCount: 0,
      verified: false
    };

    try {
      const userResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-tiktok-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.success && userData.data) {
          userAnalysis = {
            authenticityScore: userData.data.authenticityScore,
            flags: userData.data.flags || [],
            followerCount: userData.data.followerCount,
            followingCount: userData.data.followingCount,
            verified: userData.data.verified
          };
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }

    // 3. Analyze engagement ratios (if video stats provided)
    let engagementRatioAnalysis: EngagementRatioAnalysis | undefined;

    if (videoStats && videoStats.views >= TIKTOK_BENCHMARKS.minViewsForAnalysis) {
      engagementRatioAnalysis = analyzeEngagementRatios(videoStats);
      console.log(`Engagement ratio analysis: ${JSON.stringify(engagementRatioAnalysis)}`);
    }

    // 4. Calculate combined score
    // New weights: 40% comments, 25% user profile, 35% engagement ratios
    let finalScore: number;

    if (engagementRatioAnalysis) {
      const commentWeight = 0.35;
      const userWeight = 0.25;
      const engagementWeight = 0.40;

      const userBotScore = 100 - userAnalysis.authenticityScore;
      finalScore = Math.round(
        (commentAnalysis.botPatternScore * commentWeight) +
        (userBotScore * userWeight) +
        (engagementRatioAnalysis.overallScore * engagementWeight)
      );
    } else {
      // Fallback to original weights if no video stats
      const commentWeight = 0.6;
      const userWeight = 0.4;
      const userBotScore = 100 - userAnalysis.authenticityScore;
      finalScore = Math.round(
        (commentAnalysis.botPatternScore * commentWeight) +
        (userBotScore * userWeight)
      );
    }

    // Add flag penalties from user analysis
    for (const flag of userAnalysis.flags) {
      switch (flag) {
        case 'engagement_farming_pattern': finalScore += 10; break;
        case 'zero_following': finalScore += 5; break;
        case 'low_engagement_ratio': finalScore += 8; break;
        case 'high_followers_unverified': finalScore += 3; break;
      }
    }

    // Add flag penalties from engagement ratio analysis
    if (engagementRatioAnalysis) {
      for (const flag of engagementRatioAnalysis.flags) {
        switch (flag) {
          case 'extremely_low_comment_rate': finalScore += 15; break;
          case 'extremely_low_like_rate': finalScore += 10; break;
          case 'zero_comments_with_engagement': finalScore += 20; break;
          case 'engagement_imbalance': finalScore += 8; break;
        }
      }
    }

    finalScore = Math.min(100, Math.max(0, finalScore));

    // Determine verdict
    let verdict: string;
    if (finalScore < 15) verdict = 'organic';
    else if (finalScore < 30) verdict = 'mostly_organic';
    else if (finalScore < 50) verdict = 'mixed';
    else if (finalScore < 70) verdict = 'suspicious';
    else verdict = 'likely_fake';

    const breakdown: BotScoreBreakdown = {
      commentAnalysis,
      userAnalysis,
      engagementRatioAnalysis,
      finalScore,
      verdict,
      analyzedAt: new Date().toISOString()
    };

    // 5. Update target table
    const updateData: Record<string, any> = {
      bot_score: finalScore,
      bot_score_breakdown: breakdown,
      bot_analyzed_at: new Date().toISOString(),
      bot_analysis_status: 'completed'
    };

    // 6. Check auto-rejection if enabled
    let autoRejected = false;
    let rejectionReason: string | null = null;

    if (checkAutoReject && boostId && targetTable === 'video_submissions') {
      const { data: campaign } = await supabase
        .from('bounty_campaigns')
        .select('bot_score_threshold, bot_auto_reject_enabled')
        .eq('id', boostId)
        .single();

      if (campaign?.bot_auto_reject_enabled && campaign?.bot_score_threshold) {
        if (finalScore >= campaign.bot_score_threshold) {
          autoRejected = true;
          rejectionReason = `Bot score ${finalScore} exceeds threshold ${campaign.bot_score_threshold}`;
          updateData.status = 'rejected';
          updateData.rejection_reason = rejectionReason;
          updateData.is_flagged = true;
          updateData.reviewed_at = new Date().toISOString();
        }
      }
    }

    // Flag for review if suspicious but not auto-rejected
    if (!autoRejected && finalScore >= 50) {
      updateData.is_flagged = true;
    }

    await supabase
      .from(targetTable)
      .update(updateData)
      .eq('id', targetId);

    console.log(`Analysis complete for ${videoId}: score=${finalScore}, verdict=${verdict}`);

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        username,
        finalScore,
        verdict,
        breakdown,
        autoRejected,
        rejectionReason
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-tiktok-engagement:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
