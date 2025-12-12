import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

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
    const authorized = await isAuthorized(supabase, user.id, campaign_id);
    if (!authorized) {
      console.error(`User ${user.id} not authorized to view applications for campaign ${campaign_id}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - you do not have permission to view applications for this campaign' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching applications for campaign:', campaign_id);

    // Fetch campaign submissions (applications) - only pending ones
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
      .eq('status', 'pending')
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
      .select('id, username, full_name, email, avatar_url, trust_score')
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
