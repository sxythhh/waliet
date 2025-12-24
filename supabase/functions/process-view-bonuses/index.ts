import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ViewBonus {
  id: string;
  bounty_campaign_id: string;
  view_threshold: number;
  bonus_amount: number;
}

interface VideoSubmission {
  id: string;
  creator_id: string;
  video_views: number | null;
  bounty_campaign_id: string;
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

        // Get video metrics from cached_campaign_videos or video_submissions views
        // We'll check the video_submissions table for view data
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
          .select('bonus_id')
          .eq('video_submission_id', submission.id);

        const paidBonusIds = new Set((existingPayouts || []).map(p => p.bonus_id));

        // Check each tier
        for (const tier of bonusTiers) {
          // Skip if already paid or views haven't crossed threshold
          if (paidBonusIds.has(tier.id) || currentViews < tier.view_threshold) {
            continue;
          }

          console.log(`Video ${submission.id} crossed ${tier.view_threshold} views, paying $${tier.bonus_amount} bonus`);

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
                bonus_type: 'view_bonus'
              }
            })
            .select()
            .single();

          if (txError) {
            console.error('Error creating transaction:', txError);
            continue;
          }

          // Update creator's wallet balance
          const { error: walletError } = await supabase.rpc('update_wallet_balance', {
            p_user_id: submission.user_id,
            p_amount: tier.bonus_amount
          });

          // If RPC doesn't exist, update directly
          if (walletError) {
            await supabase
              .from('wallets')
              .update({ 
                balance: supabase.rpc('add_to_balance', { amount: tier.bonus_amount }),
                total_earned: supabase.rpc('add_to_total', { amount: tier.bonus_amount })
              })
              .eq('user_id', submission.user_id);
            
            // Fallback: direct update
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
          }

          // Record the bonus payout
          const { error: payoutError } = await supabase
            .from('view_bonus_payouts')
            .insert({
              bonus_id: tier.id,
              video_submission_id: submission.id,
              creator_id: submission.user_id,
              views_at_payout: currentViews,
              amount_paid: tier.bonus_amount,
              transaction_id: transaction?.id
            });

          if (payoutError) {
            console.error('Error recording payout:', payoutError);
            // Don't fail the whole process
          }

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
            tier_threshold: tier.view_threshold,
            amount: tier.bonus_amount,
            views: currentViews
          });
        }
      }
    }

    console.log(`Processed ${totalBonusesPaid} bonuses totaling $${totalAmountPaid}`);

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
