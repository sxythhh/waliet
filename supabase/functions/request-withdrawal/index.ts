import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface WithdrawalRequest {
  amount: number;
  payout_method: string;
  payout_details: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight with origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

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

    // Check if user is an admin (admins can bypass minimum amount)
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !!adminRole;

    // Minimum amount validation (admins bypass minimum)
    const minimumAmount = isAdmin ? 1 : (payout_method === 'bank' ? 250 : 20);
    if (amount < minimumAmount) {
      return new Response(JSON.stringify({
        error: `Minimum payout amount is $${minimumAmount}${payout_method === 'bank' ? ' for bank transfers' : ''}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check tax form requirement (read-only check before atomic operation)
    const { data: taxRequirement, error: taxError } = await supabase
      .rpc('check_tax_form_required', {
        p_user_id: user.id,
        p_payout_amount: amount
      });

    if (taxError) {
      console.error('Tax form check error:', taxError);
      return new Response(JSON.stringify({ error: 'Failed to verify tax form status' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if tax form is required
    const taxReq = taxRequirement?.[0];
    let taxFormId: string | null = null;
    let taxFormVerified = false;
    let withholdingRate = 0;
    let withholdingAmount = 0;

    if (taxReq?.required) {
      // Tax form is required but not submitted - reject withdrawal
      const formTypeLabel = taxReq.form_type === 'w9' ? 'W-9' : 'W-8BEN';
      return new Response(JSON.stringify({
        error: `A ${formTypeLabel} tax form is required before you can withdraw. Please submit your tax form in Settings.`,
        tax_form_required: true,
        form_type: taxReq.form_type
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If tax form exists, get the ID and calculate withholding
    if (taxReq?.existing_form_id && taxReq?.existing_form_status === 'verified') {
      taxFormId = taxReq.existing_form_id;
      taxFormVerified = true;

      // Get withholding rate for non-US payees
      const { data: rateData } = await supabase
        .rpc('get_withholding_rate', {
          p_user_id: user.id,
          p_tax_form_id: taxFormId
        });

      if (rateData !== null) {
        withholdingRate = rateData;
        withholdingAmount = amount * (withholdingRate / 100);
      }
    }

    // Execute atomic withdrawal - database handles all locking and rollback
    const { data: result, error: withdrawalError } = await supabase
      .rpc('atomic_request_withdrawal', {
        p_user_id: user.id,
        p_amount: amount,
        p_payout_method: payout_method,
        p_payout_details: payout_details,
        p_tax_form_id: taxFormId,
        p_tax_form_verified: taxFormVerified,
        p_withholding_rate: withholdingRate,
        p_withholding_amount: withholdingAmount
      });

    if (withdrawalError) {
      console.error('Atomic withdrawal error:', withdrawalError);

      // Parse specific error messages for user-friendly responses
      const errorMessage = withdrawalError.message || 'Failed to process withdrawal';

      if (errorMessage.includes('Insufficient balance')) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (errorMessage.includes('pending withdrawal request')) {
        return new Response(JSON.stringify({
          error: 'You already have a pending withdrawal request. Please wait for it to be processed.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (errorMessage.includes('Wallet not found')) {
        return new Response(JSON.stringify({ error: 'Wallet not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Failed to process withdrawal' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update cumulative payouts for tax tracking (non-blocking)
    try {
      await supabase.rpc('update_cumulative_payouts', {
        p_user_id: user.id,
        p_amount: amount
      });
    } catch (cumulativeError) {
      // Log but don't fail the withdrawal for this
      console.error('Failed to update cumulative payouts:', cumulativeError);
    }

    // Send Discord notification (non-blocking, errors here don't affect the withdrawal)
    try {
      await supabase.functions.invoke('notify-withdrawal', {
        body: {
          username: user.user_metadata?.username || 'Unknown',
          email: user.email || 'Unknown',
          amount: amount,
          payout_method: payout_method,
          payout_details: payout_details,
          balance_before: (result.balance_after as number) + amount,
          balance_after: result.balance_after,
          date: new Date().toISOString()
        }
      });
    } catch (notifError) {
      // Don't fail for notification errors - the withdrawal itself succeeded
      console.error('Failed to send Discord notification:', notifError);
    }

    console.log(`Withdrawal request created: user=${user.id}, amount=${amount}, method=${payout_method}, payout_request_id=${result.payout_request_id}, transaction_id=${result.transaction_id}`);

    return new Response(JSON.stringify({
      success: true,
      payout_request_id: result.payout_request_id,
      transaction_id: result.transaction_id,
      amount: result.amount,
      balance_after: result.balance_after,
      withholding_rate: result.withholding_rate,
      withholding_amount: result.withholding_amount,
      net_amount: result.net_amount,
      tax_form_verified: result.tax_form_verified
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
