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
    const { sourceType, sourceId, videoSubmissionId, boostSubmissionId } = body;

    console.log('Processing payout request', { userId: user.id, sourceType, sourceId, videoSubmissionId, boostSubmissionId });

    // 1. Fetch all pending ledger entries for this user (optionally filtered)
    let ledgerQuery = supabase
      .from('payment_ledger')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    // Filter by specific video submission if provided
    if (videoSubmissionId) {
      ledgerQuery = ledgerQuery.eq('video_submission_id', videoSubmissionId);
    } else if (boostSubmissionId) {
      ledgerQuery = ledgerQuery.eq('boost_submission_id', boostSubmissionId);
    } else if (sourceType && sourceId) {
      // Filter by source (program) if provided
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

    // 6. Run fraud check on the payout request
    let fraudCheckResult = null;
    try {
      const fraudCheckResponse = await fetch(`${supabaseUrl}/functions/v1/check-payout-fraud`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ payoutRequestId: payoutRequest.id }),
      });

      if (fraudCheckResponse.ok) {
        const fraudCheckData = await fraudCheckResponse.json();
        fraudCheckResult = fraudCheckData.result;
        console.log('Fraud check completed', fraudCheckResult);
      } else {
        console.error('Fraud check failed:', await fraudCheckResponse.text());
      }
    } catch (fraudError) {
      console.error('Error running fraud check:', fraudError);
      // Continue even if fraud check fails - will default to manual review
    }

    return new Response(JSON.stringify({
      success: true,
      payoutRequest: {
        id: payoutRequest.id,
        totalAmount: parseFloat(totalPending.toFixed(2)),
        entriesCount: entryIds.length,
        clearingEndsAt: clearingEndsAt.toISOString(),
        status: 'pending',
        fraudCheck: fraudCheckResult,
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
