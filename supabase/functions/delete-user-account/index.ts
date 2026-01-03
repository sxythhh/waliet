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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse request body for confirmation
    const body = await req.json().catch(() => ({}));
    const { confirmEmail, exportData = false } = body;

    // Verify email confirmation matches
    if (!confirmEmail || confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Email confirmation does not match' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let exportedData = null;

    // Optionally export data before deletion
    if (exportData) {
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get wallet data
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get transactions
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId);

      exportedData = {
        exportedAt: new Date().toISOString(),
        userId,
        email: user.email,
        profile,
        wallet,
        transactions: transactions || [],
      };
    }

    // Check for pending payouts or active campaigns that might block deletion
    const { data: pendingPayouts } = await supabase
      .from('payout_requests')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing']);

    if (pendingPayouts && pendingPayouts.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Cannot delete account with pending payouts',
          pendingPayouts: pendingPayouts.length,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (wallet && Number(wallet.balance) > 0) {
      return new Response(
        JSON.stringify({
          error: 'Please withdraw your remaining balance before deleting your account',
          balance: wallet.balance,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the deletion before it happens
    await supabase.rpc('log_security_event', {
      p_action_type: 'account_deletion',
      p_entity_type: 'user',
      p_entity_id: userId,
      p_actor_id: userId,
      p_metadata: {
        email: user.email,
        deletion_requested_at: new Date().toISOString(),
      }
    });

    // Delete the user from auth.users
    // This will cascade delete:
    // - profiles (which cascades to wallets, social_accounts, user_sessions, etc.)
    // - wallet_transactions
    // - payment_ledger entries
    // - campaign_applications
    // - video_submissions
    // - bounty_submissions
    // - referrals
    // - And other related data
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
        exportedData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user-account:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
