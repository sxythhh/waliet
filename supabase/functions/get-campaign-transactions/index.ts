import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to check if user is admin or brand member
async function isAuthorized(supabase: any, userId: string, campaignId: string): Promise<boolean> {
  // Check if user is admin
  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (adminRole) return true;

  // Check if user is brand member for this campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('brand_id')
    .eq('id', campaignId)
    .single();

  if (!campaign?.brand_id) return false;

  const { data: brandMember } = await supabase
    .from('brand_members')
    .select('role')
    .eq('user_id', userId)
    .eq('brand_id', campaign.brand_id)
    .maybeSingle();

  return !!brandMember;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get('campaign_id');

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'campaign_id parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check authorization
    const authorized = await isAuthorized(supabase, user.id, campaignId);
    if (!authorized) {
      console.error(`User ${user.id} not authorized to view transactions for campaign ${campaignId}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - you do not have permission to view transactions for this campaign' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching transactions for campaign:', campaignId);

    // Fetch transactions for this campaign (exclude reverted transactions)
    const { data: transactions, error: transactionsError } = await supabase
      .from('wallet_transactions')
      .select(`
        id,
        user_id,
        amount,
        type,
        status,
        description,
        metadata,
        created_at,
        created_by
      `)
      .eq('type', 'earning')
      .neq('status', 'reverted')
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      throw transactionsError;
    }

    // Filter transactions by campaign_id in metadata
    const campaignTransactions = transactions?.filter(tx => 
      tx.metadata?.campaign_id === campaignId
    ) || [];

    // Fetch profiles for the users in these transactions
    const userIds = [...new Set(campaignTransactions.map(tx => tx.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, email, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Map profiles by user_id
    const profilesByUserId = profiles?.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>) || {};

    // Fetch social accounts for the transactions
    const socialAccountIds = campaignTransactions
      .map(tx => tx.metadata?.social_account_id)
      .filter(id => id);
    
    let socialAccountsByIdMap: Record<string, any> = {};
    
    if (socialAccountIds.length > 0) {
      const { data: socialAccounts, error: socialAccountsError } = await supabase
        .from('social_accounts')
        .select('id, username, account_link, platform')
        .in('id', socialAccountIds);

      if (socialAccountsError) {
        console.error('Error fetching social accounts:', socialAccountsError);
      }

      socialAccountsByIdMap = socialAccounts?.reduce((acc, account) => {
        acc[account.id] = account;
        return acc;
      }, {} as Record<string, any>) || {};
    }

    console.log(`Found ${campaignTransactions.length} transactions for campaign ${campaignId}`);

    return new Response(
      JSON.stringify({
        campaign_id: campaignId,
        total_transactions: campaignTransactions.length,
        total_amount: campaignTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0),
        transactions: campaignTransactions.map(tx => ({
          id: tx.id,
          user_id: tx.user_id,
          amount: Number(tx.amount),
          type: tx.type,
          status: tx.status,
          description: tx.description,
          metadata: tx.metadata,
          created_at: tx.created_at,
          created_by: tx.created_by,
          profile: profilesByUserId[tx.user_id] || null,
          social_account: tx.metadata?.social_account_id 
            ? socialAccountsByIdMap[tx.metadata.social_account_id] || null 
            : null,
        })),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in get-campaign-transactions:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
