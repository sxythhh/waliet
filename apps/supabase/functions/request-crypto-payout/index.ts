import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Amount thresholds for approval requirements
const PAYOUT_THRESHOLDS = {
  LOW: { max: 50, requiredApprovals: 1, delayMinutes: 0 },
  MEDIUM: { max: 500, requiredApprovals: 2, delayMinutes: 0 },
  HIGH: { max: Infinity, requiredApprovals: 3, delayMinutes: 60 },
};

function getRequiredApprovals(amount: number): { requiredApprovals: number; delayMinutes: number; tier: string } {
  if (amount <= PAYOUT_THRESHOLDS.LOW.max) {
    return { ...PAYOUT_THRESHOLDS.LOW, tier: 'LOW' };
  }
  if (amount <= PAYOUT_THRESHOLDS.MEDIUM.max) {
    return { ...PAYOUT_THRESHOLDS.MEDIUM, tier: 'MEDIUM' };
  }
  return { requiredApprovals: PAYOUT_THRESHOLDS.HIGH.requiredApprovals, delayMinutes: PAYOUT_THRESHOLDS.HIGH.delayMinutes, tier: 'HIGH' };
}

interface RequestPayoutInput {
  payout_request_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate admin authorization
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
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const body: RequestPayoutInput = await req.json();
    const { payout_request_id } = body;

    if (!payout_request_id) {
      return new Response(JSON.stringify({ error: 'payout_request_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch payout request
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('id', payout_request_id)
      .single();

    if (payoutError || !payoutRequest) {
      return new Response(JSON.stringify({ error: 'Payout request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate status
    if (payoutRequest.status !== 'pending') {
      return new Response(JSON.stringify({
        error: 'Invalid payout status',
        details: `Cannot request approval for payout with status: ${payoutRequest.status}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate payment method
    if (payoutRequest.payout_method !== 'crypto') {
      return new Response(JSON.stringify({
        error: 'Not a crypto payout',
        details: 'This endpoint only handles crypto payouts'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if approval already exists
    const { data: existingApproval } = await supabase
      .from('payout_approvals')
      .select('id, status')
      .eq('payout_request_id', payout_request_id)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (existingApproval) {
      return new Response(JSON.stringify({
        error: 'Approval already exists',
        approval_id: existingApproval.id,
        status: existingApproval.status
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate required approvals based on amount
    const amount = parseFloat(payoutRequest.amount);
    const { requiredApprovals, delayMinutes, tier } = getRequiredApprovals(amount);

    // Get wallet address
    const walletAddress = payoutRequest.payout_details?.wallet_address ||
                         payoutRequest.payout_details?.address;

    // Create approval request
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: approval, error: approvalError } = await supabase
      .from('payout_approvals')
      .insert({
        payout_request_id,
        payout_type: 'crypto',
        user_id: payoutRequest.user_id,
        amount,
        currency: 'USDC',
        wallet_address: walletAddress,
        status: 'pending',
        required_approvals: requiredApprovals,
        requested_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (approvalError) {
      console.error('Failed to create approval:', approvalError);
      return new Response(JSON.stringify({ error: 'Failed to create approval request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-cast requesting admin's vote as approve
    await supabase
      .from('payout_approval_votes')
      .insert({
        approval_id: approval.id,
        admin_id: user.id,
        vote: 'approve',
        comment: 'Initial request'
      });

    // Log audit entry
    await supabase
      .from('payout_audit_log')
      .insert({
        payout_id: payout_request_id,
        approval_id: approval.id,
        action: 'requested',
        actor_id: user.id,
        details: {
          amount,
          wallet_address: walletAddress,
          required_approvals: requiredApprovals,
          tier,
          delay_minutes: delayMinutes
        }
      });

    // Update payout request status to in_transit
    await supabase
      .from('payout_requests')
      .update({ status: 'in_transit' })
      .eq('id', payout_request_id);

    console.log('Approval request created:', {
      approval_id: approval.id,
      payout_request_id,
      amount,
      required_approvals: requiredApprovals,
      tier,
      requested_by: user.id
    });

    // Check if auto-approve (single admin threshold met)
    const canAutoExecute = requiredApprovals === 1;

    return new Response(JSON.stringify({
      success: true,
      approval_id: approval.id,
      required_approvals: requiredApprovals,
      current_approvals: 1,
      tier,
      delay_minutes: delayMinutes,
      can_execute: canAutoExecute,
      expires_at: expiresAt.toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error creating payout approval:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
