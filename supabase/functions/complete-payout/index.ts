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

    // Rate limiting check (if approvedBy is provided, use that user for rate limiting)
    if (approvedBy) {
      const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        p_user_id: approvedBy,
        p_action: 'complete_payout',
        p_max_attempts: 10,
        p_window_seconds: 60
      });

      if (rateLimitError || !allowed) {
        console.log('Rate limit exceeded for payout approver:', approvedBy);
        return new Response(JSON.stringify({ error: 'Too many payout attempts. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Executing atomic payout completion:', { payoutRequestId, approvedBy });

    // Execute atomic payout using RPC
    const { data: result, error: payoutError } = await supabase.rpc('atomic_complete_payout', {
      p_payout_request_id: payoutRequestId,
      p_approved_by: approvedBy || null
    });

    if (payoutError) {
      console.error('Atomic payout failed:', payoutError);
      
      // Map specific error messages
      let errorMessage = 'Payout failed';
      let statusCode = 500;
      
      if (payoutError.message.includes('not found')) {
        errorMessage = 'Payout request not found';
        statusCode = 404;
      } else if (payoutError.message.includes('already completed')) {
        errorMessage = 'Payout already completed';
        statusCode = 400;
      } else if (payoutError.message.includes('Clearing period')) {
        errorMessage = 'Clearing period has not ended yet';
        statusCode = 400;
      } else if (payoutError.message.includes('No locked entries')) {
        errorMessage = 'No locked entries found for this payout';
        statusCode = 400;
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Payout completed successfully:', result);

    return new Response(JSON.stringify({
      success: true,
      totalPaid: result?.total_paid,
      entriesCompleted: result?.entries_completed,
      transactionId: result?.transaction_id,
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
