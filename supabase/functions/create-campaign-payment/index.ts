import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  campaign_id: string;
  user_id: string;
  amount: number;
  description?: string;
  views?: number;
  platform?: string;
  account_username?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: PaymentRequest = await req.json();
    const { campaign_id, user_id, amount, description, views, platform, account_username } = body;

    // Validate required fields
    if (!campaign_id || !user_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: campaign_id, user_id, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount must be greater than 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, budget, budget_used')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance, total_earned')
      .eq('user_id', user_id)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: 'User wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const balanceBefore = parseFloat(wallet.balance.toString());
    const balanceAfter = balanceBefore + amount;
    const newTotalEarned = parseFloat(wallet.total_earned.toString()) + amount;
    const newBudgetUsed = parseFloat(campaign.budget_used?.toString() || '0') + amount;

    // Create metadata object
    const metadata: any = {
      campaign_id,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      campaign_budget_before: parseFloat(campaign.budget_used?.toString() || '0'),
      campaign_budget_after: newBudgetUsed,
      campaign_total_budget: parseFloat(campaign.budget.toString()),
    };

    if (views) metadata.views = views;
    if (platform) metadata.platform = platform;
    if (account_username) metadata.account_username = account_username;

    // Create transaction record
    const transactionDescription = description || 
      `Payment for ${platform || 'campaign'} ${account_username ? `account @${account_username}` : ''}`.trim();

    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        amount,
        type: 'earning',
        status: 'completed',
        description: transactionDescription,
        metadata,
        created_by: user.id,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw new Error('Failed to create transaction');
    }

    // Update user's wallet
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({
        balance: balanceAfter,
        total_earned: newTotalEarned,
      })
      .eq('user_id', user_id);

    if (walletUpdateError) {
      console.error('Wallet update error:', walletUpdateError);
      throw new Error('Failed to update wallet');
    }

    // Update campaign budget used
    const { error: campaignUpdateError } = await supabase
      .from('campaigns')
      .update({
        budget_used: newBudgetUsed,
      })
      .eq('id', campaign_id);

    if (campaignUpdateError) {
      console.error('Campaign update error:', campaignUpdateError);
      // Don't fail the transaction for this
    }

    // Log to audit trail
    await supabase
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        action: 'CREATE_PAYMENT',
        table_name: 'wallet_transactions',
        record_id: transaction.id,
        new_data: {
          transaction_id: transaction.id,
          recipient_user_id: user_id,
          amount,
          campaign_id,
        },
      });

    console.log(`Payment created: ${amount} for user ${profile.username} (${user_id}) in campaign ${campaign.title}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          user_id,
          username: profile.username,
          amount,
          campaign_id,
          campaign_title: campaign.title,
          balance_after: balanceAfter,
          total_earned: newTotalEarned,
          description: transactionDescription,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
