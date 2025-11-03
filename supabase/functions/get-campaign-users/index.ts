import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Fetching users for campaign:', campaignId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch campaign submissions with user profiles and social accounts
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
          avatar_url
        )
      `)
      .eq('campaign_id', campaignId)
      .in('status', ['approved', 'pending']);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      throw submissionsError;
    }

    // Fetch social accounts linked to this campaign for these users
    const userIds = submissions?.map(s => s.creator_id) || [];
    
    const { data: socialAccounts, error: socialError } = await supabase
      .from('social_account_campaigns')
      .select(`
        social_account_id,
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
      .in('social_accounts.user_id', userIds);

    if (socialError) {
      console.error('Error fetching social accounts:', socialError);
    }

    // Map social accounts by user_id
    const socialAccountsByUser = socialAccounts?.reduce((acc, sa) => {
      const account = sa.social_accounts as any;
      if (account && !Array.isArray(account)) {
        if (!acc[account.user_id]) {
          acc[account.user_id] = [];
        }
        acc[account.user_id].push({
          id: account.id,
          platform: account.platform,
          username: account.username,
          account_link: account.account_link,
          follower_count: account.follower_count,
          is_verified: account.is_verified,
        });
      }
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Format response
    const users = submissions?.map(submission => ({
      user_id: submission.creator_id,
      submission_id: submission.id,
      status: submission.status,
      joined_at: submission.submitted_at,
      application_answers: submission.application_answers,
      profile: submission.profiles,
      social_accounts: socialAccountsByUser[submission.creator_id] || [],
    })) || [];

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
