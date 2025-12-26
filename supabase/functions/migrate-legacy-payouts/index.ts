import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * This edge function migrates existing payout data from legacy tables
 * (campaign_cpm_payouts, view_bonus_payouts) to the unified payment_ledger table.
 * 
 * It should be run once to populate historical data, then the legacy tables
 * can be deprecated (but kept for audit purposes).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { dryRun = true } = body;

    console.log('Starting legacy payout migration', { dryRun });

    const results = {
      cpmPayoutsMigrated: 0,
      viewBonusesMigrated: 0,
      boostSubmissionsMigrated: 0,
      errors: [] as string[],
      dryRun,
    };

    // 1. Migrate campaign CPM payouts
    const { data: cpmPayouts, error: cpmError } = await supabase
      .from('campaign_cpm_payouts')
      .select(`
        id,
        campaign_id,
        creator_id,
        video_submission_id,
        views_at_payout,
        cpm_amount_paid,
        flat_rate_paid,
        created_at
      `);

    if (cpmError) {
      results.errors.push(`Failed to fetch CPM payouts: ${cpmError.message}`);
    } else if (cpmPayouts && cpmPayouts.length > 0) {
      console.log(`Found ${cpmPayouts.length} CPM payouts to migrate`);

      const ledgerEntries = cpmPayouts.map(payout => ({
        user_id: payout.creator_id,
        video_submission_id: payout.video_submission_id,
        source_type: 'campaign' as const,
        source_id: payout.campaign_id,
        payment_type: 'cpm',
        views_snapshot: payout.views_at_payout || 0,
        rate: 0, // We don't have the rate stored, only the final amount
        accrued_amount: parseFloat(payout.cpm_amount_paid || 0) + parseFloat(payout.flat_rate_paid || 0),
        paid_amount: parseFloat(payout.cpm_amount_paid || 0) + parseFloat(payout.flat_rate_paid || 0),
        status: 'paid',
        last_calculated_at: payout.created_at,
        last_paid_at: payout.created_at,
        cleared_at: payout.created_at,
        created_at: payout.created_at,
      }));

      if (!dryRun) {
        const { error: insertError } = await supabase
          .from('payment_ledger')
          .upsert(ledgerEntries, {
            onConflict: 'video_submission_id,payment_type,COALESCE(milestone_threshold,0)',
            ignoreDuplicates: true,
          });

        if (insertError) {
          results.errors.push(`Failed to migrate CPM payouts: ${insertError.message}`);
        } else {
          results.cpmPayoutsMigrated = ledgerEntries.length;
        }
      } else {
        results.cpmPayoutsMigrated = ledgerEntries.length;
        console.log('DRY RUN: Would migrate', ledgerEntries.length, 'CPM payouts');
      }
    }

    // 2. Migrate view bonus payouts
    const { data: viewBonuses, error: vbError } = await supabase
      .from('view_bonus_payouts')
      .select(`
        id,
        bounty_campaign_id,
        user_id,
        boost_submission_id,
        views_at_payout,
        bonus_tier_id,
        amount,
        created_at
      `);

    if (vbError) {
      results.errors.push(`Failed to fetch view bonus payouts: ${vbError.message}`);
    } else if (viewBonuses && viewBonuses.length > 0) {
      console.log(`Found ${viewBonuses.length} view bonus payouts to migrate`);

      // Get bonus tier details for milestone thresholds
      const tierIds = [...new Set(viewBonuses.map(vb => vb.bonus_tier_id).filter(Boolean))];
      const { data: tiers } = await supabase
        .from('boost_view_bonuses')
        .select('id, view_threshold, bonus_type')
        .in('id', tierIds);

      const tierMap = new Map(tiers?.map(t => [t.id, t]) || []);

      const ledgerEntries = viewBonuses.map(bonus => {
        const tier = tierMap.get(bonus.bonus_tier_id);
        return {
          user_id: bonus.user_id,
          boost_submission_id: bonus.boost_submission_id,
          source_type: 'boost' as const,
          source_id: bonus.bounty_campaign_id,
          payment_type: tier?.bonus_type === 'cpm' ? 'view_bonus' : 'milestone',
          views_snapshot: bonus.views_at_payout || 0,
          rate: 0,
          milestone_threshold: tier?.view_threshold || 0,
          accrued_amount: parseFloat(bonus.amount || 0),
          paid_amount: parseFloat(bonus.amount || 0),
          status: 'paid',
          last_calculated_at: bonus.created_at,
          last_paid_at: bonus.created_at,
          cleared_at: bonus.created_at,
          created_at: bonus.created_at,
        };
      });

      if (!dryRun) {
        const { error: insertError } = await supabase
          .from('payment_ledger')
          .upsert(ledgerEntries, {
            onConflict: 'boost_submission_id,payment_type,COALESCE(milestone_threshold,0)',
            ignoreDuplicates: true,
          });

        if (insertError) {
          results.errors.push(`Failed to migrate view bonuses: ${insertError.message}`);
        } else {
          results.viewBonusesMigrated = ledgerEntries.length;
        }
      } else {
        results.viewBonusesMigrated = ledgerEntries.length;
        console.log('DRY RUN: Would migrate', ledgerEntries.length, 'view bonuses');
      }
    }

    // 3. Migrate boost submissions with payout_amount (flat rate/retainer)
    const { data: boostSubmissions, error: bsError } = await supabase
      .from('boost_video_submissions')
      .select(`
        id,
        user_id,
        bounty_campaign_id,
        payout_amount,
        status,
        created_at
      `)
      .eq('status', 'approved')
      .gt('payout_amount', 0);

    if (bsError) {
      results.errors.push(`Failed to fetch boost submissions: ${bsError.message}`);
    } else if (boostSubmissions && boostSubmissions.length > 0) {
      console.log(`Found ${boostSubmissions.length} boost submissions with payouts to migrate`);

      const ledgerEntries = boostSubmissions.map(sub => ({
        user_id: sub.user_id,
        boost_submission_id: sub.id,
        source_type: 'boost' as const,
        source_id: sub.bounty_campaign_id,
        payment_type: 'flat_rate',
        views_snapshot: 0,
        rate: parseFloat(sub.payout_amount || 0),
        accrued_amount: parseFloat(sub.payout_amount || 0),
        paid_amount: parseFloat(sub.payout_amount || 0), // Assume already paid if approved
        status: 'paid',
        last_calculated_at: sub.created_at,
        last_paid_at: sub.created_at,
        cleared_at: sub.created_at,
        created_at: sub.created_at,
      }));

      if (!dryRun) {
        const { error: insertError } = await supabase
          .from('payment_ledger')
          .upsert(ledgerEntries, {
            onConflict: 'boost_submission_id,payment_type,COALESCE(milestone_threshold,0)',
            ignoreDuplicates: true,
          });

        if (insertError) {
          results.errors.push(`Failed to migrate boost submissions: ${insertError.message}`);
        } else {
          results.boostSubmissionsMigrated = ledgerEntries.length;
        }
      } else {
        results.boostSubmissionsMigrated = ledgerEntries.length;
        console.log('DRY RUN: Would migrate', ledgerEntries.length, 'boost submissions');
      }
    }

    console.log('Migration complete', results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
      message: dryRun 
        ? 'Dry run complete. Set dryRun: false to execute migration.'
        : 'Migration complete.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error during migration:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
