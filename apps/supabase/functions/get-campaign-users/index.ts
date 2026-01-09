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
      console.error(`User ${user.id} not authorized to view users for campaign ${campaignId}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - you do not have permission to view users for this campaign' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching users for campaign:', campaignId);

    // Fetch campaign submissions with user profiles
    const { data: submissions, error: submissionsError } = await supabase
      .from('campaign_submissions')
      .select(`
        id,
        creator_id,
        status,
        submitted_at,
        application_answers,
        profiles:creator_id (
          id,
          username,
          full_name,
          email,
          avatar_url,
          trust_score,
          successful_referrals,
          referral_earnings,
          account_type,
          phone_number
        )
      `)
      .eq('campaign_id', campaignId)
      .in('status', ['approved', 'pending']);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      throw submissionsError;
    }

    const userIds = submissions?.map(s => s.creator_id) || [];
    
    // Fetch social account campaigns with their social accounts separately
    const { data: socialAccountCampaigns, error: sacError } = await supabase
      .from('social_account_campaigns')
      .select(`
        social_account_id,
        user_id,
        social_accounts:social_account_id (
          id,
          user_id,
          platform,
          username,
          account_link,
          follower_count,
          is_verified
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'active');

    if (sacError) {
      console.error('Error fetching social account campaigns:', sacError);
    }

    // Filter to only include social accounts for users in this campaign
    const userIdSet = new Set(userIds);
    const filteredSocialAccountCampaigns = socialAccountCampaigns?.filter(sac => 
      userIdSet.has(sac.user_id)
    ) || [];

    console.log(`Found ${socialAccountCampaigns?.length || 0} total social account connections, ${filteredSocialAccountCampaigns.length} for campaign users`);

    // Fetch campaign earnings for these users
    const { data: transactions, error: transactionsError } = await supabase
      .from('wallet_transactions')
      .select('user_id, amount, metadata')
      .eq('type', 'earning')
      .in('user_id', userIds);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
    }

    // Calculate campaign earnings by user
    const campaignEarningsByUser = transactions?.reduce((acc, tx) => {
      const txCampaignId = tx.metadata?.campaign_id;
      if (txCampaignId === campaignId) {
        if (!acc[tx.user_id]) {
          acc[tx.user_id] = 0;
        }
        acc[tx.user_id] += Number(tx.amount);
      }
      return acc;
    }, {} as Record<string, number>) || {};

    // Map social accounts by user_id
    const socialAccountsByUser = filteredSocialAccountCampaigns.reduce((acc, sac) => {
      const account = sac.social_accounts as any;
      if (account && !Array.isArray(account)) {
        const userId = sac.user_id;
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push({
          id: account.id,
          platform: account.platform,
          username: account.username,
          account_link: account.account_link,
          follower_count: account.follower_count,
          is_verified: account.is_verified,
        });
      }
      return acc;
    }, {} as Record<string, any[]>);

    // Format response and deduplicate by user_id (keep most recent submission)
    const userMap = new Map();
    submissions?.forEach(submission => {
      const userId = submission.creator_id;
      const existingUser = userMap.get(userId);
      
      // Keep the most recent submission per user
      if (!existingUser || new Date(submission.submitted_at) > new Date(existingUser.joined_at)) {
        userMap.set(userId, {
          user_id: userId,
          submission_id: submission.id,
          status: submission.status,
          joined_at: submission.submitted_at,
          application_answers: submission.application_answers,
          profile: submission.profiles,
          social_accounts: socialAccountsByUser[userId] || [],
          campaign_earnings: campaignEarningsByUser[userId] || 0,
        });
      }
    });
    
    const users = Array.from(userMap.values());

    console.log(`Found ${users.length} users for campaign ${campaignId}`);

    return new Response(
      JSON.stringify({
        campaign_id: campaignId,
        total_users: users.length,
        users: users,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in get-campaign-users:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
