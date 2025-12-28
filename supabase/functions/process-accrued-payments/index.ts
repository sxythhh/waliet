import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoSubmission {
  id: string;
  user_id: string;
  campaign_id: string;
  views: number | null;
  status: string;
}

interface BoostSubmission {
  id: string;
  user_id: string;
  bounty_campaign_id: string;
  payout_amount: number | null;
  status: string;
}

interface Campaign {
  id: string;
  brand_id: string;
  payment_type: string;
  rpm_rate: number | null;
  flat_rate_per_video: number | null;
}

interface BountyCampaign {
  id: string;
  brand_id: string;
  monthly_retainer: number;
  view_bonuses_enabled: boolean | null;
}

interface ViewBonus {
  id: string;
  bounty_campaign_id: string;
  view_threshold: number;
  bonus_amount: number;
  bonus_type: string;
  cpm_rate: number | null;
  min_views: number | null;
  is_active: boolean | null;
}

interface PaymentLedgerEntry {
  user_id: string;
  video_submission_id?: string;
  boost_submission_id?: string;
  source_type: 'campaign' | 'boost';
  source_id: string;
  payment_type: string;
  views_snapshot: number;
  rate: number;
  milestone_threshold?: number;
  accrued_amount: number;
  last_calculated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { sourceType, sourceId } = body;

    console.log('Starting accrued payments processing', { sourceType, sourceId });

    const results = {
      campaignsProcessed: 0,
      boostsProcessed: 0,
      ledgerEntriesCreated: 0,
      ledgerEntriesUpdated: 0,
      errors: [] as string[],
    };

    // Process campaign video submissions (CPM payments)
    if (!sourceType || sourceType === 'campaign') {
      const campaignResult = await processCampaignPayments(supabase, sourceId);
      results.campaignsProcessed = campaignResult.processed;
      results.ledgerEntriesCreated += campaignResult.created;
      results.ledgerEntriesUpdated += campaignResult.updated;
      if (campaignResult.errors.length) {
        results.errors.push(...campaignResult.errors);
      }
    }

    // Process boost submissions (retainers + view bonuses)
    if (!sourceType || sourceType === 'boost') {
      const boostResult = await processBoostPayments(supabase, sourceId);
      results.boostsProcessed = boostResult.processed;
      results.ledgerEntriesCreated += boostResult.created;
      results.ledgerEntriesUpdated += boostResult.updated;
      if (boostResult.errors.length) {
        results.errors.push(...boostResult.errors);
      }
    }

    console.log('Accrued payments processing complete', results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error processing accrued payments:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processCampaignPayments(supabase: any, campaignId?: string) {
  const result = { processed: 0, created: 0, updated: 0, errors: [] as string[] };

  try {
    // Fetch active campaigns with RPM rate
    let campaignQuery = supabase
      .from('campaigns')
      .select('id, brand_id, payment_type, rpm_rate, flat_rate_per_video, status')
      .eq('status', 'active')
      .gt('rpm_rate', 0);

    if (campaignId) {
      campaignQuery = campaignQuery.eq('id', campaignId);
    }

    const { data: campaigns, error: campaignError } = await campaignQuery;

    if (campaignError) {
      result.errors.push(`Failed to fetch campaigns: ${campaignError.message}`);
      return result;
    }

    console.log(`Found ${campaigns?.length || 0} campaigns to process`);

    for (const campaign of campaigns || []) {
      try {
        // Fetch approved video submissions for this campaign
        const { data: submissions, error: submissionError } = await supabase
          .from('video_submissions')
          .select('id, creator_id, campaign_id, views, status')
          .eq('campaign_id', campaign.id)
          .eq('status', 'approved')
          .gt('views', 0);

        if (submissionError) {
          result.errors.push(`Campaign ${campaign.id}: ${submissionError.message}`);
          continue;
        }

        if (!submissions?.length) {
          continue;
        }

        // Prepare batch upsert entries
        const ledgerEntries: PaymentLedgerEntry[] = [];

        for (const submission of submissions) {
          const views = submission.views || 0;
          const rpmRate = campaign.rpm_rate || 0;
          
          // Calculate CPM earnings: (views / 1000) * rpm_rate
          const cpmEarnings = (views / 1000) * rpmRate;
          
          // Add flat rate if applicable
          const flatRate = campaign.flat_rate_per_video || 0;
          const totalAccrued = cpmEarnings + flatRate;

          ledgerEntries.push({
            user_id: submission.creator_id,
            video_submission_id: submission.id,
            source_type: 'campaign',
            source_id: campaign.id,
            payment_type: 'cpm',
            views_snapshot: views,
            rate: rpmRate,
            accrued_amount: parseFloat(totalAccrued.toFixed(2)),
            last_calculated_at: new Date().toISOString(),
          });
        }

        // Batch upsert to payment_ledger
        if (ledgerEntries.length > 0) {
          const { data: upsertResult, error: upsertError } = await supabase
            .from('payment_ledger')
            .upsert(ledgerEntries, {
              onConflict: 'video_submission_id,payment_type,COALESCE(milestone_threshold,0)',
              ignoreDuplicates: false,
            })
            .select();

          if (upsertError) {
            result.errors.push(`Campaign ${campaign.id} upsert: ${upsertError.message}`);
          } else {
            result.created += upsertResult?.length || 0;
          }
        }

        result.processed++;
      } catch (err: unknown) {
        result.errors.push(`Campaign ${campaign.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

  } catch (err: unknown) {
    result.errors.push(`Campaign processing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return result;
}

async function processBoostPayments(supabase: any, boostId?: string) {
  const result = { processed: 0, created: 0, updated: 0, errors: [] as string[] };

  try {
    // Fetch active boosts
    let boostQuery = supabase
      .from('bounty_campaigns')
      .select('id, brand_id, monthly_retainer, view_bonuses_enabled, status')
      .eq('status', 'active');

    if (boostId) {
      boostQuery = boostQuery.eq('id', boostId);
    }

    const { data: boosts, error: boostError } = await boostQuery;

    if (boostError) {
      result.errors.push(`Failed to fetch boosts: ${boostError.message}`);
      return result;
    }

    console.log(`Found ${boosts?.length || 0} boosts to process`);

    for (const boost of boosts || []) {
      try {
        // Fetch approved boost submissions
        const { data: submissions, error: submissionError } = await supabase
          .from('boost_video_submissions')
          .select('id, user_id, bounty_campaign_id, payout_amount, status')
          .eq('bounty_campaign_id', boost.id)
          .eq('status', 'approved');

        if (submissionError) {
          result.errors.push(`Boost ${boost.id}: ${submissionError.message}`);
          continue;
        }

        // Fetch view bonuses if enabled
        let viewBonuses: ViewBonus[] = [];
        if (boost.view_bonuses_enabled) {
          const { data: bonuses, error: bonusError } = await supabase
            .from('boost_view_bonuses')
            .select('*')
            .eq('bounty_campaign_id', boost.id)
            .eq('is_active', true);

          if (!bonusError && bonuses) {
            viewBonuses = bonuses;
          }
        }

        const ledgerEntries: PaymentLedgerEntry[] = [];

        for (const submission of submissions || []) {
          // Add flat rate / retainer entry
          if (submission.payout_amount && submission.payout_amount > 0) {
            ledgerEntries.push({
              user_id: submission.user_id,
              boost_submission_id: submission.id,
              source_type: 'boost',
              source_id: boost.id,
              payment_type: 'flat_rate',
              views_snapshot: 0,
              rate: submission.payout_amount,
              accrued_amount: parseFloat(submission.payout_amount.toFixed(2)),
              last_calculated_at: new Date().toISOString(),
            });
          }

          // Process view bonuses if submission has a shortimize video linked
          if (viewBonuses.length > 0) {
            // Fetch video views from boost_video_submissions or linked metrics
            // For now, we'll check if there's view data in video_submissions table
            const { data: videoData } = await supabase
              .from('video_submissions')
              .select('views')
              .eq('boost_submission_id', submission.id)
              .single();

            const views = videoData?.views || 0;

            for (const bonus of viewBonuses) {
              if (bonus.bonus_type === 'milestone' && views >= bonus.view_threshold) {
                // Milestone bonus - pay once when threshold reached
                ledgerEntries.push({
                  user_id: submission.user_id,
                  boost_submission_id: submission.id,
                  source_type: 'boost',
                  source_id: boost.id,
                  payment_type: 'milestone',
                  views_snapshot: views,
                  rate: bonus.bonus_amount,
                  milestone_threshold: bonus.view_threshold,
                  accrued_amount: parseFloat(bonus.bonus_amount.toFixed(2)),
                  last_calculated_at: new Date().toISOString(),
                });
              } else if (bonus.bonus_type === 'cpm' && views >= (bonus.min_views || 0)) {
                // CPM bonus - calculated based on views
                const cpmRate = bonus.cpm_rate || 0;
                const eligibleViews = Math.max(0, views - (bonus.min_views || 0));
                const cpmAmount = (eligibleViews / 1000) * cpmRate;

                if (cpmAmount > 0) {
                  ledgerEntries.push({
                    user_id: submission.user_id,
                    boost_submission_id: submission.id,
                    source_type: 'boost',
                    source_id: boost.id,
                    payment_type: 'view_bonus',
                    views_snapshot: views,
                    rate: cpmRate,
                    milestone_threshold: bonus.view_threshold,
                    accrued_amount: parseFloat(cpmAmount.toFixed(2)),
                    last_calculated_at: new Date().toISOString(),
                  });
                }
              }
            }
          }
        }

        // Batch upsert to payment_ledger
        if (ledgerEntries.length > 0) {
          const { data: upsertResult, error: upsertError } = await supabase
            .from('payment_ledger')
            .upsert(ledgerEntries, {
              onConflict: 'boost_submission_id,payment_type,COALESCE(milestone_threshold,0)',
              ignoreDuplicates: false,
            })
            .select();

          if (upsertError) {
            result.errors.push(`Boost ${boost.id} upsert: ${upsertError.message}`);
          } else {
            result.created += upsertResult?.length || 0;
          }
        }

        result.processed++;
      } catch (err: unknown) {
        result.errors.push(`Boost ${boost.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

  } catch (err: unknown) {
    result.errors.push(`Boost processing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return result;
}
