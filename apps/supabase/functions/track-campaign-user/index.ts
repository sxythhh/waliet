import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackUserRequest {
  campaignId: string;
  userId: string;
}

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

    console.log(`Tracking user ${userId} for campaign ${campaignId}`);

    // Get campaign and brand details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select(`
        id,
        brand_id,
        brands!campaigns_brand_id_fkey (
          id,
          shortimize_api_key,
          collection_id,
          collection_name
        )
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

    const brandData = Array.isArray(campaign.brands) ? campaign.brands[0] : campaign.brands;
    if (!brandData) {
      return new Response(
        JSON.stringify({ error: 'Brand not found for campaign' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shortimizeApiKey = brandData.shortimize_api_key;
    if (!shortimizeApiKey) {
      console.log('No Shortimize API key configured for brand');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No Shortimize API key configured, skipping tracking' 
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

    // Track each account
    const results = [];
    for (const accountData of socialAccounts) {
      const account = Array.isArray(accountData.social_accounts) 
        ? accountData.social_accounts[0] 
        : accountData.social_accounts;
      
      if (!account.account_link) {
        console.log(`No account link for ${account.username}, skipping`);
        continue;
      }

      console.log(`Tracking account: ${account.username} (${account.platform})`);

      // Prepare collection names/IDs
      const collectionNames = brandData.collection_name ? [brandData.collection_name] : [];
      const collectionIds = brandData.collection_id ? [brandData.collection_id] : [];

      try {
        const trackResponse = await fetch('https://api.shortimize.com/accounts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${shortimizeApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            link: account.account_link,
            collection_names: collectionNames,
            collection_ids: collectionIds.length > 0 ? collectionIds : undefined,
            tracking_type: undefined, // Use organization default
          }),
        });

        const trackData = await trackResponse.json();

        if (!trackResponse.ok) {
          console.error(`Error tracking ${account.username}:`, trackResponse.status, trackData);
          
          // Check if already tracked
          if (trackData.properties?.error?.includes('already tracked')) {
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
              error: trackData.properties?.error || 'Unknown error'
            });
          }
        } else {
          console.log(`Successfully tracked ${account.username}`);
          results.push({
            username: account.username,
            platform: account.platform,
            success: true,
            accountId: trackData.properties?.accountId,
            directUrl: trackData.properties?.directUrl
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
        message: `Tracked ${results.filter(r => r.success).length} of ${results.length} accounts`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in track-campaign-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
