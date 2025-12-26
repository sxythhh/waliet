import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLEARING_PERIOD_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
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

    const body = await req.json();
    const { sourceType, sourceId } = body;

    console.log('Processing payout request', { userId: user.id, sourceType, sourceId });

    // 1. Fetch all pending ledger entries for this user (optionally filtered by source)
    let ledgerQuery = supabase
      .from('payment_ledger')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (sourceType && sourceId) {
      ledgerQuery = ledgerQuery.eq('source_type', sourceType).eq('source_id', sourceId);
    }

    const { data: pendingEntries, error: ledgerError } = await ledgerQuery;

    if (ledgerError) {
      console.error('Failed to fetch pending entries:', ledgerError);
      return new Response(JSON.stringify({ error: 'Failed to fetch pending payments' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingEntries || pendingEntries.length === 0) {
      return new Response(JSON.stringify({ error: 'No pending payments to request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Calculate total pending amount
    const totalPending = pendingEntries.reduce((sum, entry) => {
      const pending = parseFloat(entry.accrued_amount) - parseFloat(entry.paid_amount);
      return sum + Math.max(0, pending);
    }, 0);

    if (totalPending <= 0) {
      return new Response(JSON.stringify({ error: 'No positive balance to request payout' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Create payout request
    const clearingEndsAt = new Date();
    clearingEndsAt.setDate(clearingEndsAt.getDate() + CLEARING_PERIOD_DAYS);

    const { data: payoutRequest, error: requestError } = await supabase
      .from('submission_payout_requests')
      .insert({
        user_id: user.id,
        total_amount: parseFloat(totalPending.toFixed(2)),
        status: 'pending',
        clearing_ends_at: clearingEndsAt.toISOString(),
      })
      .select()
      .single();

    if (requestError) {
      console.error('Failed to create payout request:', requestError);
      return new Response(JSON.stringify({ error: 'Failed to create payout request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Lock all pending entries by linking them to this payout request
    const entryIds = pendingEntries.map(e => e.id);
    const { error: lockError } = await supabase
      .from('payment_ledger')
      .update({
        status: 'locked',
        payout_request_id: payoutRequest.id,
        locked_at: new Date().toISOString(),
        clearing_ends_at: clearingEndsAt.toISOString(),
      })
      .in('id', entryIds);

    if (lockError) {
      console.error('Failed to lock entries:', lockError);
      // Rollback: delete the payout request
      await supabase.from('submission_payout_requests').delete().eq('id', payoutRequest.id);
      return new Response(JSON.stringify({ error: 'Failed to lock pending payments' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Create payout items for each entry (for tracking in existing system)
    const payoutItems = pendingEntries.map(entry => ({
      payout_request_id: payoutRequest.id,
      submission_id: entry.video_submission_id,
      boost_submission_id: entry.boost_submission_id,
      amount: parseFloat((parseFloat(entry.accrued_amount) - parseFloat(entry.paid_amount)).toFixed(2)),
      views_at_request: entry.views_snapshot,
      status: 'pending',
    }));

    const { error: itemsError } = await supabase
      .from('submission_payout_items')
      .insert(payoutItems);

    if (itemsError) {
      console.error('Failed to create payout items:', itemsError);
      // Continue anyway, the ledger entries are the source of truth
    }

    console.log('Payout request created successfully', {
      requestId: payoutRequest.id,
      totalAmount: totalPending,
      entriesLocked: entryIds.length,
      clearingEndsAt: clearingEndsAt.toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      payoutRequest: {
        id: payoutRequest.id,
        totalAmount: parseFloat(totalPending.toFixed(2)),
        entriesCount: entryIds.length,
        clearingEndsAt: clearingEndsAt.toISOString(),
        status: 'pending',
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error processing payout request:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
