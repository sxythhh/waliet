import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[auto-process-boost-payouts] Starting auto-payout processing...');

    // Find all ended boost campaigns
    const now = new Date().toISOString();
    const { data: endedBoosts, error: boostsError } = await supabase
      .from('bounty_campaigns')
      .select('id, title, end_date')
      .lt('end_date', now)
      .eq('status', 'active');

    if (boostsError) {
      console.error('[auto-process-boost-payouts] Error fetching ended boosts:', boostsError);
      throw boostsError;
    }

    console.log(`[auto-process-boost-payouts] Found ${endedBoosts?.length || 0} ended boosts`);

    if (!endedBoosts || endedBoosts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No ended boosts with pending payments found',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const boostIds = endedBoosts.map(b => b.id);
    let totalProcessed = 0;
    let totalAmount = 0;

    // Find pending payment ledger entries for these boosts
    const { data: pendingPayments, error: paymentsError } = await supabase
      .from('payment_ledger')
      .select('id, user_id, accrued_amount, paid_amount, source_id, boost_submission_id')
      .eq('source_type', 'boost')
      .eq('status', 'pending')
      .in('source_id', boostIds);

    if (paymentsError) {
      console.error('[auto-process-boost-payouts] Error fetching pending payments:', paymentsError);
      throw paymentsError;
    }

    console.log(`[auto-process-boost-payouts] Found ${pendingPayments?.length || 0} pending payments`);

    if (!pendingPayments || pendingPayments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending boost payments to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group payments by user
    const paymentsByUser: Record<string, typeof pendingPayments> = {};
    for (const payment of pendingPayments) {
      if (!paymentsByUser[payment.user_id]) {
        paymentsByUser[payment.user_id] = [];
      }
      paymentsByUser[payment.user_id].push(payment);
    }

    // Process each user's payments
    const clearingEndsAt = new Date();
    clearingEndsAt.setDate(clearingEndsAt.getDate() + 7);

    for (const [userId, userPayments] of Object.entries(paymentsByUser)) {
      const totalUserAmount = userPayments.reduce((sum, p) => {
        return sum + Math.max(0, Number(p.accrued_amount) - Number(p.paid_amount));
      }, 0);

      // Skip if below minimum payout threshold
      if (totalUserAmount < 1) {
        console.log(`[auto-process-boost-payouts] Skipping user ${userId}: amount $${totalUserAmount.toFixed(2)} below minimum`);
        continue;
      }

      console.log(`[auto-process-boost-payouts] Processing user ${userId}: $${totalUserAmount.toFixed(2)} from ${userPayments.length} payments`);

      // Create payout request
      const { data: payoutRequest, error: requestError } = await supabase
        .from('payout_requests')
        .insert({
          user_id: userId,
          total_amount: totalUserAmount,
          status: 'clearing',
          clearing_ends_at: clearingEndsAt.toISOString(),
          is_auto_processed: true,
        })
        .select()
        .single();

      if (requestError) {
        console.error(`[auto-process-boost-payouts] Error creating payout request for user ${userId}:`, requestError);
        continue;
      }

      // Update payment ledger entries
      const paymentIds = userPayments.map(p => p.id);
      const { error: updateError } = await supabase
        .from('payment_ledger')
        .update({
          status: 'clearing',
          payout_request_id: payoutRequest.id,
          locked_at: new Date().toISOString(),
          clearing_ends_at: clearingEndsAt.toISOString(),
        })
        .in('id', paymentIds);

      if (updateError) {
        console.error(`[auto-process-boost-payouts] Error updating ledger entries for user ${userId}:`, updateError);
        continue;
      }

      totalProcessed += userPayments.length;
      totalAmount += totalUserAmount;

      console.log(`[auto-process-boost-payouts] Successfully processed ${userPayments.length} payments for user ${userId}`);
    }

    console.log(`[auto-process-boost-payouts] Completed: processed ${totalProcessed} payments, total $${totalAmount.toFixed(2)}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Auto-processed ${totalProcessed} boost payments`,
      processed: totalProcessed,
      totalAmount: totalAmount.toFixed(2),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[auto-process-boost-payouts] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
