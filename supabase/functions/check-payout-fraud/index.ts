import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVIDENCE_DEADLINE_HOURS = 48;
const NEW_CREATOR_DAYS = 30;
const NEW_CREATOR_AMOUNT_THRESHOLD = 100;

interface FraudCheckResult {
  approved: boolean;
  flags: FraudFlag[];
  tier: string;
  requiresEvidence: boolean;
}

interface FraudFlag {
  type: 'engagement' | 'velocity' | 'new_creator' | 'previous_fraud';
  reason: string;
  detectedValue?: number;
  thresholdValue?: number;
}

interface EngagementData {
  views: number;
  comments: number;
  likes: number;
  shares: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { payoutRequestId } = body;

    if (!payoutRequestId) {
      return new Response(JSON.stringify({ error: 'payoutRequestId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Checking payout for fraud', { payoutRequestId });

    // 1. Fetch payout request with creator info
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('submission_payout_requests')
      .select(`
        *,
        profiles:user_id (
          id,
          created_at,
          trust_score,
          fraud_flag_permanent,
          fraud_flag_count,
          banned_at
        )
      `)
      .eq('id', payoutRequestId)
      .single();

    if (payoutError || !payoutRequest) {
      console.error('Failed to fetch payout request:', payoutError);
      return new Response(JSON.stringify({ error: 'Payout request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const creator = payoutRequest.profiles as any;
    const amount = parseFloat(payoutRequest.total_amount);

    // Check if creator is banned
    if (creator.banned_at) {
      return new Response(JSON.stringify({
        error: 'Creator is banned',
        approved: false,
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get approval thresholds based on amount tier
    const tier = getTier(amount);
    const thresholds = getApprovalThresholds(tier);

    // 3. Fetch related submissions to check engagement
    const { data: ledgerEntries } = await supabase
      .from('payment_ledger')
      .select(`
        *,
        video_submissions:video_submission_id (
          id,
          video_url,
          platform,
          views,
          source_id
        )
      `)
      .eq('payout_request_id', payoutRequestId);

    // 4. Get campaign/boost info for fraud sensitivity
    let fraudSensitivity = 'normal';
    if (ledgerEntries && ledgerEntries.length > 0) {
      const firstEntry = ledgerEntries[0];
      if (firstEntry.source_type === 'campaign') {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('brand_id, brands(fraud_sensitivity)')
          .eq('id', firstEntry.source_id)
          .single();
        if (campaign?.brands) {
          fraudSensitivity = (campaign.brands as any).fraud_sensitivity || 'normal';
        }
      } else if (firstEntry.source_type === 'boost') {
        const { data: boost } = await supabase
          .from('bounty_campaigns')
          .select('brand_id, brands(fraud_sensitivity)')
          .eq('id', firstEntry.source_id)
          .single();
        if (boost?.brands) {
          fraudSensitivity = (boost.brands as any).fraud_sensitivity || 'normal';
        }
      }
    }

    const engagementThreshold = getEngagementThreshold(fraudSensitivity);

    // 5. Run fraud checks
    const flags: FraudFlag[] = [];

    // Check 1: Previous fraud flag (permanent)
    if (creator.fraud_flag_permanent) {
      flags.push({
        type: 'previous_fraud',
        reason: `Creator has ${creator.fraud_flag_count} previous confirmed fraud(s)`,
      });
    }

    // Check 2: New creator with high payout
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(creator.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (accountAgeDays < NEW_CREATOR_DAYS && amount > NEW_CREATOR_AMOUNT_THRESHOLD) {
      flags.push({
        type: 'new_creator',
        reason: `Account is ${accountAgeDays} days old with payout of $${amount.toFixed(2)}`,
        detectedValue: accountAgeDays,
        thresholdValue: NEW_CREATOR_DAYS,
      });
    }

    // Check 3: Engagement rate and velocity for each video
    const viewsSnapshot: Record<string, number> = {};

    if (ledgerEntries) {
      for (const entry of ledgerEntries) {
        const video = entry.video_submissions as any;
        if (!video) continue;

        viewsSnapshot[entry.id] = video.views || 0;

        // Fetch cached engagement data
        const { data: cachedVideo } = await supabase
          .from('cached_campaign_videos')
          .select('views, likes, comments, shares, previous_views, last_fetched_at')
          .eq('video_url', video.video_url)
          .single();

        if (cachedVideo) {
          // Check engagement rate
          const engagement = calculateEngagementRate({
            views: cachedVideo.views || 0,
            comments: cachedVideo.comments || 0,
            likes: cachedVideo.likes || 0,
            shares: cachedVideo.shares || 0,
          });

          if (engagement < engagementThreshold) {
            flags.push({
              type: 'engagement',
              reason: `Low engagement rate on video: ${(engagement * 100).toFixed(3)}%`,
              detectedValue: engagement,
              thresholdValue: engagementThreshold,
            });
          }

          // Check velocity spike
          if (cachedVideo.previous_views && cachedVideo.previous_views > 0) {
            const velocityMultiplier = cachedVideo.views / cachedVideo.previous_views;
            if (velocityMultiplier >= 10) {
              flags.push({
                type: 'velocity',
                reason: `Suspicious view spike: ${velocityMultiplier.toFixed(1)}x increase`,
                detectedValue: velocityMultiplier,
                thresholdValue: 10,
              });
            }
          }
        }
      }
    }

    // 5.5 Run ML-based bot scoring
    let avgBotScore = 0;
    let botScoringFlags: string[] = [];
    try {
      const botScoringResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-bot-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ payoutRequestId }),
      });

      if (botScoringResponse.ok) {
        const botResult = await botScoringResponse.json();
        avgBotScore = botResult.summary?.avg_score || 0;

        // Add high-risk bot scores as flags
        if (avgBotScore >= 60) {
          flags.push({
            type: 'engagement' as const,
            reason: `High bot score detected: ${avgBotScore.toFixed(1)}/100`,
            detectedValue: avgBotScore,
            thresholdValue: 60,
          });
        }

        // Collect unique flags from bot scoring
        botScoringFlags = [...new Set(
          (botResult.scores || []).flatMap((s: any) => s.flags || [])
        )] as string[];

        console.log('Bot scoring completed', { avgBotScore, flagCount: botScoringFlags.length });
      }
    } catch (botError) {
      console.error('Bot scoring failed (non-blocking):', botError);
    }

    // 6. Determine auto-approval
    const trustScore = creator.trust_score || 0;
    const { data: successfulPayouts } = await supabase
      .from('submission_payout_requests')
      .select('id')
      .eq('user_id', creator.id)
      .eq('status', 'completed')
      .limit(thresholds.minSuccessfulPayouts + 1);

    const successfulPayoutCount = successfulPayouts?.length || 0;

    const meetsThresholds =
      trustScore >= thresholds.minTrustScore &&
      accountAgeDays >= thresholds.minAccountAgeDays &&
      successfulPayoutCount >= thresholds.minSuccessfulPayouts;

    const approved = flags.length === 0 && meetsThresholds;

    // 7. Store fraud check result
    const fraudCheckResult = {
      approved,
      tier,
      flags,
      thresholds,
      creatorStats: {
        trustScore,
        accountAgeDays,
        successfulPayoutCount,
      },
      fraudSensitivity,
      botScoring: {
        avgScore: avgBotScore,
        flags: botScoringFlags,
      },
      checkedAt: new Date().toISOString(),
    };

    // 8. Update payout request with result
    const updateData: any = {
      fraud_check_result: fraudCheckResult,
      views_snapshot: viewsSnapshot,
    };

    if (approved) {
      updateData.auto_approval_status = 'approved';
    } else {
      updateData.auto_approval_status = 'pending_evidence';
      updateData.evidence_requested_at = new Date().toISOString();
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + EVIDENCE_DEADLINE_HOURS);
      updateData.evidence_deadline = deadline.toISOString();
    }

    await supabase
      .from('submission_payout_requests')
      .update(updateData)
      .eq('id', payoutRequestId);

    // 9. Create fraud flag records if any
    if (flags.length > 0) {
      const flagRecords = flags.map(flag => ({
        creator_id: creator.id,
        payout_request_id: payoutRequestId,
        flag_type: flag.type,
        flag_reason: flag.reason,
        detected_value: flag.detectedValue,
        threshold_value: flag.thresholdValue,
        status: 'pending',
      }));

      await supabase.from('fraud_flags').insert(flagRecords);
    }

    // 10. If not approved, trigger evidence request
    if (!approved) {
      // Call send-evidence-request function
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-evidence-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            payoutRequestId,
            creatorId: creator.id,
            flags,
            deadline: updateData.evidence_deadline,
          }),
        });
      } catch (e) {
        console.error('Failed to send evidence request:', e);
      }

      // Send Discord alert for high-priority cases
      if (amount > 500 || creator.fraud_flag_permanent) {
        try {
          await sendDiscordAlert({
            payoutRequestId,
            creatorId: creator.id,
            amount,
            flags,
            priority: 'high',
          });
        } catch (e) {
          console.error('Failed to send Discord alert:', e);
        }
      }
    }

    console.log('Fraud check completed', {
      payoutRequestId,
      approved,
      flagCount: flags.length,
      tier,
    });

    return new Response(JSON.stringify({
      success: true,
      result: {
        approved,
        flags,
        tier,
        requiresEvidence: !approved,
        evidenceDeadline: updateData.evidence_deadline,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error checking payout fraud:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getTier(amount: number): string {
  if (amount <= 50) return 'micro';
  if (amount <= 200) return 'small';
  if (amount <= 1000) return 'medium';
  return 'large';
}

function getApprovalThresholds(tier: string): {
  minTrustScore: number;
  minAccountAgeDays: number;
  minSuccessfulPayouts: number;
} {
  switch (tier) {
    case 'micro':
      return { minTrustScore: 60, minAccountAgeDays: 0, minSuccessfulPayouts: 0 };
    case 'small':
      return { minTrustScore: 70, minAccountAgeDays: 14, minSuccessfulPayouts: 0 };
    case 'medium':
      return { minTrustScore: 80, minAccountAgeDays: 30, minSuccessfulPayouts: 3 };
    case 'large':
      return { minTrustScore: 90, minAccountAgeDays: 60, minSuccessfulPayouts: 5 };
    default:
      return { minTrustScore: 70, minAccountAgeDays: 14, minSuccessfulPayouts: 0 };
  }
}

function getEngagementThreshold(sensitivity: string): number {
  switch (sensitivity) {
    case 'strict':
      return 0.0015; // 0.15%
    case 'lenient':
      return 0.0005; // 0.05%
    default:
      return 0.001; // 0.1% (normal)
  }
}

function calculateEngagementRate(data: EngagementData): number {
  if (data.views === 0) return 0;

  // Primary: comments/views
  // Fallback: (likes + shares) / views if comments are 0 (disabled)
  if (data.comments > 0) {
    return data.comments / data.views;
  }

  // Fallback to likes + shares
  return (data.likes + data.shares) / data.views;
}

async function sendDiscordAlert(data: {
  payoutRequestId: string;
  creatorId: string;
  amount: number;
  flags: FraudFlag[];
  priority: string;
}) {
  const webhookUrl = Deno.env.get('DISCORD_FRAUD_WEBHOOK_URL');
  if (!webhookUrl) {
    console.log('Discord webhook URL not configured, skipping alert');
    return;
  }

  const flagList = data.flags.map(f => `• **${f.type}**: ${f.reason}`).join('\n');

  const embed = {
    title: `🚨 ${data.priority === 'high' ? 'HIGH PRIORITY' : ''} Fraud Flag`,
    color: data.priority === 'high' ? 0xFF0000 : 0xFFA500,
    fields: [
      { name: 'Payout Amount', value: `$${data.amount.toFixed(2)}`, inline: true },
      { name: 'Creator ID', value: data.creatorId.slice(0, 8), inline: true },
      { name: 'Flags', value: flagList || 'None' },
    ],
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
