import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawalRequest {
  amount: number;
  payout_method: string;
  payout_details: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate user using anon key with auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user client for authentication
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: WithdrawalRequest = await req.json();
    const { amount, payout_method, payout_details } = body;

    // Validate input
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payout_method || !payout_details) {
      return new Response(JSON.stringify({ error: 'Missing payout method or details' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Block UPI withdrawals
    if (payout_method === 'upi') {
      return new Response(JSON.stringify({ error: 'UPI payouts are temporarily disabled' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Minimum amount validation
    const minimumAmount = payout_method === 'bank' ? 250 : 20;
    if (amount < minimumAmount) {
      return new Response(JSON.stringify({
        error: `Minimum payout amount is $${minimumAmount}${payout_method === 'bank' ? ' for bank transfers' : ''}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch wallet and verify balance (SERVER-SIDE validation)
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, total_withdrawn')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet fetch error:', walletError);
      return new Response(JSON.stringify({ error: 'Wallet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Server-side balance validation
    const currentBalance = parseFloat(wallet.balance);
    if (amount > currentBalance) {
      console.warn(`Withdrawal attempt exceeds balance: user=${user.id}, requested=${amount}, available=${currentBalance}`);
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing pending/in-transit withdrawals
    const { data: existingRequests, error: checkError } = await supabase
      .from('payout_requests')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_transit']);

    if (checkError) {
      console.error('Existing request check error:', checkError);
      return new Response(JSON.stringify({ error: 'Failed to verify withdrawal status' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingRequests && existingRequests.length > 0) {
      return new Response(JSON.stringify({
        error: 'You already have a pending withdrawal request. Please wait for it to be processed.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const balance_before = currentBalance;
    const balance_after = currentBalance - amount;

    // Create payout request
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('payout_requests')
      .insert({
        user_id: user.id,
        amount: amount,
        payout_method: payout_method,
        payout_details: payout_details,
        status: 'pending'
      })
      .select('id')
      .single();

    if (payoutError) {
      console.error('Payout request creation error:', payoutError);
      return new Response(JSON.stringify({ error: 'Failed to create payout request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create wallet transaction
    const { error: txnError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        type: 'withdrawal',
        status: 'pending',
        description: `Withdrawal to ${payout_method === 'paypal' ? 'PayPal' : payout_method === 'crypto' ? 'Crypto' : payout_method}`,
        metadata: {
          payout_method: payout_method,
          payout_request_id: payoutRequest.id,
          network: (payout_details as Record<string, string>).network || null,
          balance_before: balance_before,
          balance_after: balance_after
        },
        created_by: user.id
      });

    if (txnError) {
      console.error('Transaction creation error:', txnError);
      // Rollback: delete payout request
      await supabase.from('payout_requests').delete().eq('id', payoutRequest.id);
      return new Response(JSON.stringify({ error: 'Failed to create transaction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update wallet balance (using service role, bypasses user restrictions)
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({
        balance: balance_after,
        total_withdrawn: parseFloat(wallet.total_withdrawn) + amount
      })
      .eq('id', wallet.id);

    if (walletUpdateError) {
      console.error('Wallet update error:', walletUpdateError);
      // Rollback: delete payout request and transaction
      await supabase.from('payout_requests').delete().eq('id', payoutRequest.id);
      await supabase.from('wallet_transactions').delete().eq('user_id', user.id).eq('type', 'withdrawal').eq('status', 'pending');
      return new Response(JSON.stringify({ error: 'Failed to update wallet' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send Discord notification (non-blocking)
    try {
      await supabase.functions.invoke('notify-withdrawal', {
        body: {
          username: user.user_metadata?.username || 'Unknown',
          email: user.email || 'Unknown',
          amount: amount,
          payout_method: payout_method,
          payout_details: payout_details,
          balance_before: balance_before,
          balance_after: balance_after,
          date: new Date().toISOString()
        }
      });
    } catch (notifError) {
      console.error('Failed to send Discord notification:', notifError);
    }

    console.log(`Withdrawal request created: user=${user.id}, amount=${amount}, method=${payout_method}`);

    return new Response(JSON.stringify({
      success: true,
      payout_request_id: payoutRequest.id,
      amount: amount,
      balance_after: balance_after
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Withdrawal error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
