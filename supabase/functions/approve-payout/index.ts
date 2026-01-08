import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface ApprovePayoutInput {
  approval_id: string;
  vote: 'approve' | 'reject';
  comment?: string;
}

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
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const body: ApprovePayoutInput = await req.json();
    const { approval_id, vote, comment } = body;

    if (!approval_id) {
      return new Response(JSON.stringify({ error: 'approval_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!vote || !['approve', 'reject'].includes(vote)) {
      return new Response(JSON.stringify({ error: 'vote must be "approve" or "reject"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch approval request
    const { data: approval, error: approvalError } = await supabase
      .from('payout_approvals')
      .select('*')
      .eq('id', approval_id)
      .single();

    if (approvalError || !approval) {
      return new Response(JSON.stringify({ error: 'Approval request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate status
    if (approval.status !== 'pending') {
      return new Response(JSON.stringify({
        error: 'Approval not pending',
        details: `Approval status is: ${approval.status}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiration
    if (new Date(approval.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('payout_approvals')
        .update({ status: 'expired' })
        .eq('id', approval_id);

      await supabase
        .from('payout_audit_log')
        .insert({
          payout_id: approval.payout_request_id,
          approval_id,
          action: 'expired',
          details: { expired_at: new Date().toISOString() }
        });

      return new Response(JSON.stringify({
        error: 'Approval request has expired',
        expires_at: approval.expires_at
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if admin already voted
    const { data: existingVote } = await supabase
      .from('payout_approval_votes')
      .select('id, vote')
      .eq('approval_id', approval_id)
      .eq('admin_id', user.id)
      .maybeSingle();

    if (existingVote) {
      return new Response(JSON.stringify({
        error: 'Already voted',
        details: `You already voted to ${existingVote.vote} this payout`,
        vote_id: existingVote.id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cast vote
    const { data: voteRecord, error: voteError } = await supabase
      .from('payout_approval_votes')
      .insert({
        approval_id,
        admin_id: user.id,
        vote,
        comment: comment || null
      })
      .select()
      .single();

    if (voteError) {
      console.error('Failed to cast vote:', voteError);
      return new Response(JSON.stringify({ error: 'Failed to cast vote' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log vote
    await supabase
      .from('payout_audit_log')
      .insert({
        payout_id: approval.payout_request_id,
        approval_id,
        action: 'vote_cast',
        actor_id: user.id,
        details: {
          vote,
          comment,
          admin_username: adminProfile.username
        }
      });

    // Get current vote counts
    const { data: votes } = await supabase
      .from('payout_approval_votes')
      .select('vote')
      .eq('approval_id', approval_id);

    const approveCount = votes?.filter(v => v.vote === 'approve').length || 0;
    const rejectCount = votes?.filter(v => v.vote === 'reject').length || 0;

    let newStatus = 'pending';
    let canExecute = false;

    // Check if rejection threshold met (any single rejection)
    if (vote === 'reject') {
      newStatus = 'rejected';

      await supabase
        .from('payout_approvals')
        .update({
          status: 'rejected',
          rejection_reason: comment || 'Rejected by admin'
        })
        .eq('id', approval_id);

      // Update payout request back to pending or rejected
      await supabase
        .from('payout_requests')
        .update({ status: 'rejected', rejection_reason: comment || 'Rejected by admin' })
        .eq('id', approval.payout_request_id);

      await supabase
        .from('payout_audit_log')
        .insert({
          payout_id: approval.payout_request_id,
          approval_id,
          action: 'rejected',
          actor_id: user.id,
          details: {
            reason: comment,
            vote_counts: { approve: approveCount, reject: rejectCount }
          }
        });
    }
    // Check if approval threshold met
    else if (approveCount >= approval.required_approvals) {
      newStatus = 'approved';
      canExecute = true;

      await supabase
        .from('payout_approvals')
        .update({ status: 'approved' })
        .eq('id', approval_id);

      await supabase
        .from('payout_audit_log')
        .insert({
          payout_id: approval.payout_request_id,
          approval_id,
          action: 'approved',
          actor_id: user.id,
          details: {
            vote_counts: { approve: approveCount, reject: rejectCount },
            required_approvals: approval.required_approvals
          }
        });
    }

    console.log('Vote cast:', {
      approval_id,
      admin_id: user.id,
      vote,
      approve_count: approveCount,
      reject_count: rejectCount,
      required: approval.required_approvals,
      new_status: newStatus,
      can_execute: canExecute
    });

    return new Response(JSON.stringify({
      success: true,
      vote_id: voteRecord.id,
      vote,
      approval_status: newStatus,
      vote_counts: {
        approve: approveCount,
        reject: rejectCount
      },
      required_approvals: approval.required_approvals,
      can_execute: canExecute,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error casting vote:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
