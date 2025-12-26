import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { payoutRequestId, approvedBy } = body;

    if (!payoutRequestId) {
      return new Response(JSON.stringify({ error: 'payoutRequestId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Completing payout request', { payoutRequestId, approvedBy });

    // 1. Fetch the payout request
    const { data: payoutRequest, error: requestError } = await supabase
      .from('submission_payout_requests')
      .select('*')
      .eq('id', payoutRequestId)
      .single();

    if (requestError || !payoutRequest) {
      return new Response(JSON.stringify({ error: 'Payout request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Check if clearing period has ended
    const clearingEndsAt = new Date(payoutRequest.clearing_ends_at);
    const now = new Date();

    if (now < clearingEndsAt && payoutRequest.status !== 'approved') {
      return new Response(JSON.stringify({ 
        error: 'Clearing period has not ended yet',
        clearingEndsAt: clearingEndsAt.toISOString(),
        daysRemaining: Math.ceil((clearingEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch all locked ledger entries for this payout request
    const { data: lockedEntries, error: ledgerError } = await supabase
      .from('payment_ledger')
      .select('*')
      .eq('payout_request_id', payoutRequestId)
      .eq('status', 'locked');

    if (ledgerError) {
      console.error('Failed to fetch locked entries:', ledgerError);
      return new Response(JSON.stringify({ error: 'Failed to fetch locked entries' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!lockedEntries || lockedEntries.length === 0) {
      return new Response(JSON.stringify({ error: 'No locked entries found for this payout' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Calculate total amount to pay
    const totalToPay = lockedEntries.reduce((sum, entry) => {
      const pending = parseFloat(entry.accrued_amount) - parseFloat(entry.paid_amount);
      return sum + Math.max(0, pending);
    }, 0);

    // 5. Update ledger entries to paid
    const entryIds = lockedEntries.map(e => e.id);
    const { error: updateError } = await supabase
      .from('payment_ledger')
      .update({
        status: 'paid',
        paid_amount: supabase.rpc('raw', { sql: 'accrued_amount' }), // Set paid = accrued
        cleared_at: new Date().toISOString(),
        last_paid_at: new Date().toISOString(),
      })
      .in('id', entryIds);

    // Alternative: Update each entry individually to set paid_amount = accrued_amount
    for (const entry of lockedEntries) {
      await supabase
        .from('payment_ledger')
        .update({
          status: 'paid',
          paid_amount: entry.accrued_amount,
          cleared_at: new Date().toISOString(),
          last_paid_at: new Date().toISOString(),
        })
        .eq('id', entry.id);
    }

    // 6. Create wallet transaction for the user
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: payoutRequest.user_id,
        amount: parseFloat(totalToPay.toFixed(2)),
        type: 'earning',
        status: 'completed',
        description: `Payout completed - ${lockedEntries.length} video(s)`,
        metadata: {
          payout_request_id: payoutRequestId,
          entries_count: lockedEntries.length,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error('Failed to create wallet transaction:', txError);
      // Continue - the ledger update is the source of truth
    }

    // 7. Update user's wallet balance
    const { error: walletError } = await supabase
      .from('wallets')
      .update({
        balance: supabase.rpc('increment_balance', { amount: totalToPay }),
        total_earned: supabase.rpc('increment_total_earned', { amount: totalToPay }),
      })
      .eq('user_id', payoutRequest.user_id);

    // Update wallet balance directly
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, total_earned')
      .eq('user_id', payoutRequest.user_id)
      .single();

    if (wallet) {
      await supabase
        .from('wallets')
        .update({
          balance: parseFloat(wallet.balance || 0) + totalToPay,
          total_earned: parseFloat(wallet.total_earned || 0) + totalToPay,
        })
        .eq('user_id', payoutRequest.user_id);
    }

    // 8. Update payout request status
    await supabase
      .from('submission_payout_requests')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        approved_by: approvedBy,
      })
      .eq('id', payoutRequestId);

    // 9. Update campaign/boost budget_used
    const sourceUpdates = new Map<string, number>();
    for (const entry of lockedEntries) {
      const key = `${entry.source_type}:${entry.source_id}`;
      const amount = parseFloat(entry.accrued_amount) - parseFloat(entry.paid_amount);
      sourceUpdates.set(key, (sourceUpdates.get(key) || 0) + amount);
    }

    for (const [key, amount] of sourceUpdates) {
      const [sourceType, sourceId] = key.split(':');
      const table = sourceType === 'campaign' ? 'campaigns' : 'bounty_campaigns';
      
      const { data: source } = await supabase
        .from(table)
        .select('budget_used')
        .eq('id', sourceId)
        .single();

      if (source) {
        await supabase
          .from(table)
          .update({
            budget_used: parseFloat(source.budget_used || 0) + amount,
          })
          .eq('id', sourceId);
      }
    }

    console.log('Payout completed successfully', {
      payoutRequestId,
      totalPaid: totalToPay,
      entriesCompleted: lockedEntries.length,
    });

    return new Response(JSON.stringify({
      success: true,
      totalPaid: parseFloat(totalToPay.toFixed(2)),
      entriesCompleted: lockedEntries.length,
      transactionId: transaction?.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error completing payout:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
