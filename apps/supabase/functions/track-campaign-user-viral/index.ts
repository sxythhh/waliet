import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackUserRequest {
  campaignId: string;
  userId: string;
}

// Map our platform names to viral.app platform names
const PLATFORM_MAP: Record<string, string> = {
  tiktok: 'tiktok',
  instagram: 'instagram',
  youtube: 'youtube',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { campaignId, userId }: TrackUserRequest = await req.json();

    if (!campaignId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID and User ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[viral.app] Tracking user ${userId} for campaign ${campaignId}`);

    // Get campaign and brand details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select(`
        id,
        brand_id,
        title
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('Error fetching campaign:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch campaign details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get brand secrets (viral_api_key)
    const { data: brandSecrets, error: secretsError } = await supabaseClient
      .from('brand_secrets')
      .select('viral_api_key')
      .eq('brand_id', campaign.brand_id)
      .single();

    if (secretsError && secretsError.code !== 'PGRST116') {
      console.error('Error fetching brand secrets:', secretsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch brand secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const viralApiKey = brandSecrets?.viral_api_key;
    if (!viralApiKey) {
      console.log('No viral.app API key configured for brand');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No viral.app API key configured, skipping tracking'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's social accounts linked to this campaign
    const { data: socialAccounts, error: accountsError } = await supabaseClient
      .from('social_account_campaigns')
      .select(`
        social_accounts!inner (
          id,
          platform,
          username,
          account_link
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'active')
      .eq('social_accounts.user_id', userId);

    if (accountsError) {
      console.error('Error fetching social accounts:', accountsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch social accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!socialAccounts || socialAccounts.length === 0) {
      console.log('No social accounts found for user');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No social accounts to track'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Track each account with viral.app
    const results = [];
    for (const accountData of socialAccounts) {
      const account = Array.isArray(accountData.social_accounts)
        ? accountData.social_accounts[0]
        : accountData.social_accounts;

      if (!account.username) {
        console.log(`No username for account, skipping`);
        continue;
      }

      const viralPlatform = PLATFORM_MAP[account.platform?.toLowerCase()];
      if (!viralPlatform) {
        console.log(`Unsupported platform ${account.platform}, skipping`);
        results.push({
          username: account.username,
          platform: account.platform,
          success: false,
          error: 'Unsupported platform for viral.app'
        });
        continue;
      }

      console.log(`[viral.app] Tracking account: ${account.username} (${viralPlatform})`);

      try {
        // viral.app API: POST /accounts/tracked
        const trackResponse = await fetch('https://viral.app/api/v1/accounts/tracked', {
          method: 'POST',
          headers: {
            'x-api-key': viralApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: viralPlatform,
            username: account.username,
            // Optional: Add to a project if we have project support later
            // projectId: campaign.viral_project_id
          }),
        });

        const trackData = await trackResponse.json();

        if (!trackResponse.ok) {
          console.error(`Error tracking ${account.username}:`, trackResponse.status, trackData);

          // Check if already tracked (common API response)
          if (trackData.error?.includes('already') || trackData.message?.includes('already')) {
            results.push({
              username: account.username,
              platform: account.platform,
              success: true,
              alreadyTracked: true,
              message: 'Account already tracked'
            });
          } else {
            results.push({
              username: account.username,
              platform: account.platform,
              success: false,
              error: trackData.error || trackData.message || 'Unknown error'
            });
          }
        } else {
          console.log(`[viral.app] Successfully tracked ${account.username}`);
          results.push({
            username: account.username,
            platform: account.platform,
            success: true,
            accountId: trackData.id || trackData.accountId,
          });
        }
      } catch (error) {
        console.error(`Error tracking ${account.username}:`, error);
        results.push({
          username: account.username,
          platform: account.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'viral',
        message: `Tracked ${results.filter(r => r.success).length} of ${results.length} accounts`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in track-campaign-user-viral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
