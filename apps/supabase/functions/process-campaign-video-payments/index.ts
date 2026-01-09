import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight with proper origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  // Get validated CORS headers for all responses
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate admin authorization - CRITICAL SECURITY CHECK
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      console.error('Non-admin attempted to process campaign payments:', { user_id: user.id });
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { campaign_id } = await req.json().catch(() => ({}));

    console.log('Processing CPM payments for campaign:', campaign_id || 'all pay_per_post campaigns');

    // Get all campaigns with pay_per_post model and positive rpm_rate (or specific one)
    // Also fetch payout_type to determine if we should credit wallet
    let campaignQuery = supabase
      .from('campaigns')
      .select('id, brand_id, budget, budget_used, rpm_rate, post_rate, payment_model, title, payout_type')
      .eq('payment_model', 'pay_per_post')
      .gt('rpm_rate', 0)
      .eq('status', 'active');

    if (campaign_id) {
      campaignQuery = campaignQuery.eq('id', campaign_id);
    }

    const { data: campaigns, error: campaignsError } = await campaignQuery;

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('No pay_per_post campaigns with CPM rate found');
      return new Response(
        JSON.stringify({ success: true, message: 'No campaigns to process', payments_made: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalPaymentsMade = 0;
    let totalAmountPaid = 0;
    const payoutDetails: any[] = [];

    for (const campaign of campaigns) {
      console.log(`Processing campaign: ${campaign.id} (${campaign.title})`);

      // Get all approved video submissions for this campaign
      const { data: submissions, error: submissionsError } = await supabase
        .from('video_submissions')
        .select('id, creator_id, views, video_url, shortimize_video_id')
        .eq('source_type', 'campaign')
        .eq('source_id', campaign.id)
        .eq('status', 'approved');

      if (submissionsError) {
        console.error(`Error fetching submissions for campaign ${campaign.id}:`, submissionsError);
        continue;
      }

      if (!submissions || submissions.length === 0) {
        console.log(`No approved submissions for campaign ${campaign.id}`);
        continue;
      }

      // Process each submission
      for (const submission of submissions) {
        const currentViews = submission.views || 0;
        if (currentViews === 0) continue;

        // Check existing CPM payouts for this video
        const { data: existingPayout } = await supabase
          .from('campaign_cpm_payouts')
          .select('id, views_at_payout, cpm_amount_paid, flat_rate_paid')
          .eq('video_submission_id', submission.id)
          .single();

        // Calculate CPM earnings based on current views
        const cpmEarned = (currentViews / 1000) * campaign.rpm_rate;
        const alreadyPaidCpm = existingPayout?.cpm_amount_paid || 0;
        const amountToPay = Math.max(0, cpmEarned - alreadyPaidCpm);

        // Only pay if there's at least $0.01 to pay
        if (amountToPay < 0.01) {
          console.log(`Video ${submission.id}: No new CPM to pay (earned: $${cpmEarned.toFixed(2)}, already paid: $${alreadyPaidCpm.toFixed(2)})`);
          continue;
        }

        console.log(`Video ${submission.id}: ${currentViews} views at $${campaign.rpm_rate}/CPM = $${cpmEarned.toFixed(2)} total (already paid: $${alreadyPaidCpm.toFixed(2)}, paying: $${amountToPay.toFixed(2)})`);

        // Check payout_type: only credit wallet for on_platform campaigns
        let transaction = null;
        const isOnPlatform = campaign.payout_type !== 'off_platform';

        if (isOnPlatform) {
          // Use atomic RPC function to create transaction and update balance atomically
          const { data: paymentResult, error: paymentError } = await supabase
            .rpc('atomic_campaign_payment', {
              p_creator_id: submission.creator_id,
              p_campaign_id: campaign.id,
              p_amount: amountToPay,
              p_description: `CPM payment: $${campaign.rpm_rate}/1K views (${currentViews.toLocaleString()} views) - ${campaign.title}`,
              p_metadata: {
                campaign_id: campaign.id,
                video_submission_id: submission.id,
                views_at_payout: currentViews,
                cpm_rate: campaign.rpm_rate,
                payment_type: 'cpm'
              }
            });

          if (paymentError) {
            console.error('Error processing atomic campaign payment:', paymentError);
            continue;
          }

          transaction = paymentResult;
        } else {
          console.log(`Skipping wallet credit for off-platform campaign ${campaign.id}`);
        }

        // Upsert the CPM payout record
        if (existingPayout) {
          await supabase
            .from('campaign_cpm_payouts')
            .update({
              views_at_payout: currentViews,
              cpm_amount_paid: cpmEarned,
              transaction_id: transaction?.transaction_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPayout.id);
        } else {
          await supabase
            .from('campaign_cpm_payouts')
            .insert({
              campaign_id: campaign.id,
              video_submission_id: submission.id,
              creator_id: submission.creator_id,
              views_at_payout: currentViews,
              cpm_amount_paid: cpmEarned,
              flat_rate_paid: campaign.post_rate || 0,
              transaction_id: transaction?.transaction_id
            });
        }

        // Update campaign budget_used
        await supabase
          .from('campaigns')
          .update({ budget_used: (campaign.budget_used || 0) + amountToPay })
          .eq('id', campaign.id);

        totalPaymentsMade++;
        totalAmountPaid += amountToPay;
        payoutDetails.push({
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          video_submission_id: submission.id,
          creator_id: submission.creator_id,
          views: currentViews,
          cpm_rate: campaign.rpm_rate,
          amount: amountToPay
        });
      }
    }

    console.log(`Processed ${totalPaymentsMade} CPM payments totaling $${totalAmountPaid.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        payments_made: totalPaymentsMade,
        total_amount: totalAmountPaid,
        details: payoutDetails
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing campaign video payments:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
