import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ViewBonus {
  id: string;
  bounty_campaign_id: string;
  view_threshold: number;
  min_views: number | null;
  bonus_amount: number;
  bonus_type: 'milestone' | 'cpm';
  cpm_rate: number | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bounty_campaign_id } = await req.json();

    console.log('Processing view bonuses for boost:', bounty_campaign_id || 'all boosts');

    // Get all boosts with view bonuses enabled (or specific one)
    let boostQuery = supabase
      .from('bounty_campaigns')
      .select('id, brand_id, budget, budget_used')
      .eq('view_bonuses_enabled', true)
      .eq('status', 'active');

    if (bounty_campaign_id) {
      boostQuery = boostQuery.eq('id', bounty_campaign_id);
    }

    const { data: boosts, error: boostsError } = await boostQuery;

    if (boostsError) {
      console.error('Error fetching boosts:', boostsError);
      throw boostsError;
    }

    if (!boosts || boosts.length === 0) {
      console.log('No boosts with view bonuses enabled found');
      return new Response(
        JSON.stringify({ success: true, message: 'No boosts with view bonuses enabled', bonuses_paid: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalBonusesPaid = 0;
    let totalAmountPaid = 0;
    const payoutDetails: any[] = [];

    for (const boost of boosts) {
      console.log(`Processing boost: ${boost.id}`);

      // Get view bonus tiers for this boost
      const { data: bonusTiers, error: tiersError } = await supabase
        .from('boost_view_bonuses')
        .select('*')
        .eq('bounty_campaign_id', boost.id)
        .eq('is_active', true)
        .order('view_threshold', { ascending: true });

      if (tiersError || !bonusTiers || bonusTiers.length === 0) {
        console.log(`No bonus tiers for boost ${boost.id}`);
        continue;
      }

      // Get all approved video submissions for this boost with metrics
      const { data: submissions, error: submissionsError } = await supabase
        .from('boost_video_submissions')
        .select('id, user_id, shortimize_video_id')
        .eq('bounty_campaign_id', boost.id)
        .eq('status', 'approved');

      if (submissionsError || !submissions || submissions.length === 0) {
        console.log(`No approved submissions for boost ${boost.id}`);
        continue;
      }

      // For each submission, check if we have metrics and if bonuses need to be paid
      for (const submission of submissions) {
        if (!submission.shortimize_video_id) continue;

        // Get video metrics from video_submissions table
        const { data: videoData } = await supabase
          .from('video_submissions')
          .select('video_views')
          .eq('source_type', 'boost')
          .eq('source_id', boost.id)
          .eq('shortimize_video_id', submission.shortimize_video_id)
          .single();

        const currentViews = videoData?.video_views || 0;
        if (currentViews === 0) continue;

        // Check which bonuses this video has already received
        const { data: existingPayouts } = await supabase
          .from('view_bonus_payouts')
          .select('bonus_id, views_at_payout, amount_paid')
          .eq('video_submission_id', submission.id);

        const paidBonusMap = new Map((existingPayouts || []).map(p => [p.bonus_id, p]));

        // Check each tier
        for (const tier of bonusTiers as ViewBonus[]) {
          const existingPayout = paidBonusMap.get(tier.id);

          if (tier.bonus_type === 'cpm') {
            // CPM bonus: pay based on views within the specified range
            const minViews = tier.min_views || 0;
            
            // Only pay for views above the minimum threshold
            if (currentViews <= minViews) continue;
            
            // Calculate views eligible for payment (between min and max)
            const eligibleViews = Math.min(currentViews, tier.view_threshold) - minViews;
            if (eligibleViews <= 0) continue;
            
            const totalEarned = (tier.cpm_rate! * eligibleViews) / 1000;
            const alreadyPaid = existingPayout?.amount_paid || 0;
            const amountToPay = Math.max(0, totalEarned - alreadyPaid);

            // Only pay if there's at least $0.01 to pay
            if (amountToPay < 0.01) continue;

            console.log(`CPM bonus for video ${submission.id}: ${eligibleViews} eligible views (${minViews}-${tier.view_threshold}) at $${tier.cpm_rate}/CPM = $${totalEarned.toFixed(2)} (already paid: $${alreadyPaid.toFixed(2)}, paying: $${amountToPay.toFixed(2)})`);

            // Create wallet transaction for the creator
            const { data: transaction, error: txError } = await supabase
              .from('wallet_transactions')
              .insert({
                user_id: submission.user_id,
                amount: amountToPay,
                type: 'boost',
                description: `CPM bonus: $${tier.cpm_rate}/1K views (${eligibleViews.toLocaleString()} views)`,
                metadata: {
                  boost_id: boost.id,
                  bonus_id: tier.id,
                  video_submission_id: submission.id,
                  views_at_payout: currentViews,
                  bonus_type: 'cpm',
                  cpm_rate: tier.cpm_rate
                }
              })
              .select()
              .single();

            if (txError) {
              console.error('Error creating CPM transaction:', txError);
              continue;
            }

            // Update creator's wallet balance
            const { data: wallet } = await supabase
              .from('wallets')
              .select('balance, total_earned')
              .eq('user_id', submission.user_id)
              .single();

            if (wallet) {
              await supabase
                .from('wallets')
                .update({
                  balance: (wallet.balance || 0) + amountToPay,
                  total_earned: (wallet.total_earned || 0) + amountToPay
                })
                .eq('user_id', submission.user_id);
            }

            // Upsert the bonus payout record
            if (existingPayout) {
              await supabase
                .from('view_bonus_payouts')
                .update({
                  views_at_payout: currentViews,
                  amount_paid: totalEarned,
                  transaction_id: transaction?.id
                })
                .eq('bonus_id', tier.id)
                .eq('video_submission_id', submission.id);
            } else {
              await supabase
                .from('view_bonus_payouts')
                .insert({
                  bonus_id: tier.id,
                  video_submission_id: submission.id,
                  creator_id: submission.user_id,
                  views_at_payout: currentViews,
                  amount_paid: totalEarned,
                  transaction_id: transaction?.id
                });
            }

            // Update boost budget_used
            await supabase
              .from('bounty_campaigns')
              .update({ budget_used: (boost.budget_used || 0) + amountToPay })
              .eq('id', boost.id);

            totalBonusesPaid++;
            totalAmountPaid += amountToPay;
            payoutDetails.push({
              boost_id: boost.id,
              video_submission_id: submission.id,
              creator_id: submission.user_id,
              bonus_type: 'cpm',
              cpm_rate: tier.cpm_rate,
              views: currentViews,
              amount: amountToPay
            });

          } else {
            // Milestone bonus: one-time payment when threshold is crossed
            if (existingPayout || currentViews < tier.view_threshold) {
              continue;
            }

            console.log(`Milestone bonus for video ${submission.id}: crossed ${tier.view_threshold} views, paying $${tier.bonus_amount}`);

            // Create wallet transaction for the creator
            const { data: transaction, error: txError } = await supabase
              .from('wallet_transactions')
              .insert({
                user_id: submission.user_id,
                amount: tier.bonus_amount,
                type: 'boost',
                description: `View bonus: ${tier.view_threshold.toLocaleString()} views reached`,
                metadata: {
                  boost_id: boost.id,
                  bonus_id: tier.id,
                  video_submission_id: submission.id,
                  views_at_payout: currentViews,
                  bonus_type: 'milestone'
                }
              })
              .select()
              .single();

            if (txError) {
              console.error('Error creating milestone transaction:', txError);
              continue;
            }

            // Update creator's wallet balance
            const { data: wallet } = await supabase
              .from('wallets')
              .select('balance, total_earned')
              .eq('user_id', submission.user_id)
              .single();

            if (wallet) {
              await supabase
                .from('wallets')
                .update({
                  balance: (wallet.balance || 0) + tier.bonus_amount,
                  total_earned: (wallet.total_earned || 0) + tier.bonus_amount
                })
                .eq('user_id', submission.user_id);
            }

            // Record the bonus payout
            await supabase
              .from('view_bonus_payouts')
              .insert({
                bonus_id: tier.id,
                video_submission_id: submission.id,
                creator_id: submission.user_id,
                views_at_payout: currentViews,
                amount_paid: tier.bonus_amount,
                transaction_id: transaction?.id
              });

            // Update boost budget_used
            await supabase
              .from('bounty_campaigns')
              .update({ budget_used: (boost.budget_used || 0) + tier.bonus_amount })
              .eq('id', boost.id);

            totalBonusesPaid++;
            totalAmountPaid += tier.bonus_amount;
            payoutDetails.push({
              boost_id: boost.id,
              video_submission_id: submission.id,
              creator_id: submission.user_id,
              bonus_type: 'milestone',
              tier_threshold: tier.view_threshold,
              amount: tier.bonus_amount,
              views: currentViews
            });
          }
        }
      }
    }

    console.log(`Processed ${totalBonusesPaid} bonuses totaling $${totalAmountPaid.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        bonuses_paid: totalBonusesPaid,
        total_amount: totalAmountPaid,
        details: payoutDetails
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing view bonuses:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
