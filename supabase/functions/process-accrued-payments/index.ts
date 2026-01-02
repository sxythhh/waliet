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
  paid_amount?: number;
  status?: string;
  last_calculated_at: string;
}

interface ExistingLedgerEntry {
  id: string;
  status: string;
  paid_amount: number;
  accrued_amount: number;
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
      entriesSkipped: 0,
      errors: [] as string[],
    };

    // Process campaign video submissions (CPM payments)
    if (!sourceType || sourceType === 'campaign') {
      const campaignResult = await processCampaignPayments(supabase, sourceId);
      results.campaignsProcessed = campaignResult.processed;
      results.ledgerEntriesCreated += campaignResult.created;
      results.ledgerEntriesUpdated += campaignResult.updated;
      results.entriesSkipped += campaignResult.skipped;
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
      results.entriesSkipped += boostResult.skipped;
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
  const result = { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] as string[] };

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

        // Get all submission IDs to check existing entries
        const submissionIds = submissions.map((s: any) => s.id);
        
        // Fetch existing ledger entries for these submissions
        const { data: existingEntries, error: existingError } = await supabase
          .from('payment_ledger')
          .select('id, video_submission_id, status, paid_amount, accrued_amount')
          .in('video_submission_id', submissionIds)
          .eq('payment_type', 'cpm');

        if (existingError) {
          console.error(`Failed to fetch existing entries for campaign ${campaign.id}:`, existingError.message);
        }

        // Create a map of existing entries by submission ID
        const existingMap: Record<string, ExistingLedgerEntry> = {};
        for (const entry of existingEntries || []) {
          if (entry.video_submission_id) {
            existingMap[entry.video_submission_id] = entry;
          }
        }

        // Fetch demographics scores for all creators in this batch
        const creatorIds = [...new Set(submissions.map((s: any) => s.creator_id))];
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('id, demographics_score')
          .in('id', creatorIds);

        // Create a map of creator demographics scores
        const demographicsMap: Record<string, number> = {};
        for (const profile of creatorProfiles || []) {
          demographicsMap[profile.id] = profile.demographics_score || 0;
        }

        // Process each submission individually to handle status correctly
        for (const submission of submissions) {
          const views = submission.views || 0;
          const rpmRate = campaign.rpm_rate || 0;

          // Get demographics multiplier (default 0.4 if no demographics submitted, otherwise tier1_percentage / 100)
          const demographicsScore = demographicsMap[submission.creator_id] || 0;
          const demographicsMultiplier = demographicsScore > 0 ? demographicsScore / 100 : 0.4;

          // Calculate CPM earnings: (views / 1000) * rpm_rate * demographics_multiplier
          const cpmEarnings = (views / 1000) * rpmRate * demographicsMultiplier;

          // Add flat rate if applicable (flat rate is NOT multiplied by demographics)
          const flatRate = campaign.flat_rate_per_video || 0;
          const newAccrued = parseFloat((cpmEarnings + flatRate).toFixed(2));

          const existing = existingMap[submission.id];

          if (existing) {
            // Entry exists - check status
            if (existing.status === 'locked' || existing.status === 'clearing') {
              // Skip entries in clearing period
              console.log(`Skipping locked/clearing entry for submission ${submission.id}`);
              result.skipped++;
              continue;
            }

            if (existing.status === 'paid') {
              // Check if there are additional earnings beyond what was paid
              const existingPaid = Number(existing.paid_amount) || 0;
              
              if (newAccrued > existingPaid) {
                // Update with new accrued amount, preserve paid_amount, set status to pending
                // Use optimistic locking: only update if status is still 'paid' (prevents race conditions)
                const { data: updateData, error: updateError } = await supabase
                  .from('payment_ledger')
                  .update({
                    accrued_amount: newAccrued,
                    views_snapshot: views,
                    status: 'pending', // Re-enable for payout
                    last_calculated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id)
                  .eq('status', 'paid') // Optimistic lock: only update if status unchanged
                  .select('id');

                if (updateError) {
                  result.errors.push(`Failed to update paid entry ${existing.id}: ${updateError.message}`);
                } else if (!updateData || updateData.length === 0) {
                  // Status changed between check and update (race condition), skip
                  console.log(`Entry ${existing.id} status changed, skipping (race condition detected)`);
                  result.skipped++;
                } else {
                  console.log(`Updated paid entry ${existing.id}: accrued ${existingPaid} -> ${newAccrued}, now pending`);
                  result.updated++;
                }
              } else {
                // No additional earnings, skip
                result.skipped++;
              }
              continue;
            }

            // For pending entries, update with optimistic locking
            const { data: updateData, error: updateError } = await supabase
              .from('payment_ledger')
              .update({
                accrued_amount: newAccrued,
                views_snapshot: views,
                rate: rpmRate,
                last_calculated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)
              .eq('status', 'pending') // Optimistic lock: only update if still pending
              .select('id');

            if (updateError) {
              result.errors.push(`Failed to update entry ${existing.id}: ${updateError.message}`);
            } else if (!updateData || updateData.length === 0) {
              // Status changed between check and update (race condition), skip
              console.log(`Entry ${existing.id} status changed, skipping (race condition detected)`);
              result.skipped++;
            } else {
              result.updated++;
            }
          } else {
            // No existing entry - create new one
            const { error: insertError } = await supabase
              .from('payment_ledger')
              .insert({
                user_id: submission.creator_id,
                video_submission_id: submission.id,
                source_type: 'campaign',
                source_id: campaign.id,
                payment_type: 'cpm',
                views_snapshot: views,
                rate: rpmRate,
                accrued_amount: newAccrued,
                paid_amount: 0,
                status: 'pending',
                last_calculated_at: new Date().toISOString(),
              });

            if (insertError) {
              result.errors.push(`Failed to insert entry for submission ${submission.id}: ${insertError.message}`);
            } else {
              result.created++;
            }
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
  const result = { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] as string[] };

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

        // Get all submission IDs
        const submissionIds = (submissions || []).map((s: any) => s.id);
        
        // Fetch existing ledger entries for these submissions
        const { data: existingEntries, error: existingError } = await supabase
          .from('payment_ledger')
          .select('id, boost_submission_id, payment_type, milestone_threshold, status, paid_amount, accrued_amount')
          .in('boost_submission_id', submissionIds);

        if (existingError) {
          console.error(`Failed to fetch existing entries for boost ${boost.id}:`, existingError.message);
        }

        // Create a map of existing entries by composite key
        const existingMap: Record<string, ExistingLedgerEntry> = {};
        for (const entry of existingEntries || []) {
          const key = `${entry.boost_submission_id}:${entry.payment_type}:${entry.milestone_threshold || 0}`;
          existingMap[key] = entry;
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

        for (const submission of submissions || []) {
          // Process flat rate / retainer entry
          if (submission.payout_amount && submission.payout_amount > 0) {
            const flatRateKey = `${submission.id}:flat_rate:0`;
            const existing = existingMap[flatRateKey];
            const newAccrued = parseFloat(submission.payout_amount.toFixed(2));

            if (existing) {
              if (existing.status === 'locked' || existing.status === 'clearing') {
                result.skipped++;
              } else if (existing.status === 'paid') {
                const existingPaid = Number(existing.paid_amount) || 0;
                if (newAccrued > existingPaid) {
                  const { error: updateError } = await supabase
                    .from('payment_ledger')
                    .update({
                      accrued_amount: newAccrued,
                      status: 'pending',
                      last_calculated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);

                  if (!updateError) result.updated++;
                }
              } else {
                const { error: updateError } = await supabase
                  .from('payment_ledger')
                  .update({
                    accrued_amount: newAccrued,
                    rate: submission.payout_amount,
                    last_calculated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id);

                if (!updateError) result.updated++;
              }
            } else {
              const { error: insertError } = await supabase
                .from('payment_ledger')
                .insert({
                  user_id: submission.user_id,
                  boost_submission_id: submission.id,
                  source_type: 'boost',
                  source_id: boost.id,
                  payment_type: 'flat_rate',
                  views_snapshot: 0,
                  rate: submission.payout_amount,
                  accrued_amount: newAccrued,
                  paid_amount: 0,
                  status: 'pending',
                  last_calculated_at: new Date().toISOString(),
                });

              if (!insertError) result.created++;
            }
          }

          // Process view bonuses if submission has a shortimize video linked
          if (viewBonuses.length > 0) {
            const { data: videoData } = await supabase
              .from('video_submissions')
              .select('views')
              .eq('boost_submission_id', submission.id)
              .single();

            const views = videoData?.views || 0;

            for (const bonus of viewBonuses) {
              if (bonus.bonus_type === 'milestone' && views >= bonus.view_threshold) {
                const milestoneKey = `${submission.id}:milestone:${bonus.view_threshold}`;
                const existing = existingMap[milestoneKey];
                const newAccrued = parseFloat(bonus.bonus_amount.toFixed(2));

                if (existing) {
                  if (existing.status === 'locked' || existing.status === 'clearing') {
                    result.skipped++;
                  } else if (existing.status === 'paid') {
                    // Milestone is one-time, no need to update
                    result.skipped++;
                  } else {
                    const { error: updateError } = await supabase
                      .from('payment_ledger')
                      .update({
                        accrued_amount: newAccrued,
                        views_snapshot: views,
                        last_calculated_at: new Date().toISOString(),
                      })
                      .eq('id', existing.id);

                    if (!updateError) result.updated++;
                  }
                } else {
                  const { error: insertError } = await supabase
                    .from('payment_ledger')
                    .insert({
                      user_id: submission.user_id,
                      boost_submission_id: submission.id,
                      source_type: 'boost',
                      source_id: boost.id,
                      payment_type: 'milestone',
                      views_snapshot: views,
                      rate: bonus.bonus_amount,
                      milestone_threshold: bonus.view_threshold,
                      accrued_amount: newAccrued,
                      paid_amount: 0,
                      status: 'pending',
                      last_calculated_at: new Date().toISOString(),
                    });

                  if (!insertError) result.created++;
                }
              } else if (bonus.bonus_type === 'cpm' && views >= (bonus.min_views || 0)) {
                const cpmRate = bonus.cpm_rate || 0;
                const eligibleViews = Math.max(0, views - (bonus.min_views || 0));
                const cpmAmount = parseFloat(((eligibleViews / 1000) * cpmRate).toFixed(2));

                if (cpmAmount > 0) {
                  const viewBonusKey = `${submission.id}:view_bonus:${bonus.view_threshold}`;
                  const existing = existingMap[viewBonusKey];

                  if (existing) {
                    if (existing.status === 'locked' || existing.status === 'clearing') {
                      result.skipped++;
                    } else if (existing.status === 'paid') {
                      const existingPaid = Number(existing.paid_amount) || 0;
                      if (cpmAmount > existingPaid) {
                        const { error: updateError } = await supabase
                          .from('payment_ledger')
                          .update({
                            accrued_amount: cpmAmount,
                            views_snapshot: views,
                            status: 'pending',
                            last_calculated_at: new Date().toISOString(),
                          })
                          .eq('id', existing.id);

                        if (!updateError) result.updated++;
                      }
                    } else {
                      const { error: updateError } = await supabase
                        .from('payment_ledger')
                        .update({
                          accrued_amount: cpmAmount,
                          views_snapshot: views,
                          last_calculated_at: new Date().toISOString(),
                        })
                        .eq('id', existing.id);

                      if (!updateError) result.updated++;
                    }
                  } else {
                    const { error: insertError } = await supabase
                      .from('payment_ledger')
                      .insert({
                        user_id: submission.user_id,
                        boost_submission_id: submission.id,
                        source_type: 'boost',
                        source_id: boost.id,
                        payment_type: 'view_bonus',
                        views_snapshot: views,
                        rate: cpmRate,
                        milestone_threshold: bonus.view_threshold,
                        accrued_amount: cpmAmount,
                        paid_amount: 0,
                        status: 'pending',
                        last_calculated_at: new Date().toISOString(),
                      });

                    if (!insertError) result.created++;
                  }
                }
              }
            }
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
