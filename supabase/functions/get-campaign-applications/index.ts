import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const campaign_id = url.searchParams.get('campaign_id');

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching applications for campaign:', campaign_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch campaign submissions (applications)
    const { data: applications, error: applicationsError } = await supabase
      .from('campaign_submissions')
      .select(`
        id,
        campaign_id,
        creator_id,
        status,
        application_answers,
        submitted_at,
        reviewed_at
      `)
      .eq('campaign_id', campaign_id)
      .order('submitted_at', { ascending: false });

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError);
      throw applicationsError;
    }

    if (!applications || applications.length === 0) {
      return new Response(
        JSON.stringify({ applications: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(applications.map(app => app.creator_id))];

    // Fetch profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, email, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Fetch social accounts for all users
    const { data: socialAccounts, error: socialAccountsError } = await supabase
      .from('social_accounts')
      .select('id, user_id, platform, username, account_link, follower_count')
      .in('user_id', userIds);

    if (socialAccountsError) {
      console.error('Error fetching social accounts:', socialAccountsError);
      throw socialAccountsError;
    }

    // Create lookup maps
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const socialAccountsMap = new Map<string, any[]>();
    
    socialAccounts?.forEach(sa => {
      if (!socialAccountsMap.has(sa.user_id)) {
        socialAccountsMap.set(sa.user_id, []);
      }
      socialAccountsMap.get(sa.user_id)!.push(sa);
    });

    // Merge data
    const enrichedApplications = applications.map(app => ({
      ...app,
      profile: profileMap.get(app.creator_id) || null,
      social_accounts: socialAccountsMap.get(app.creator_id) || []
    }));

    return new Response(
      JSON.stringify({ applications: enrichedApplications }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-campaign-applications:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
