import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackUserRequest {
  bountyId: string;
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

    const { bountyId, userId }: TrackUserRequest = await req.json();

    if (!bountyId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Bounty ID and User ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tracking user ${userId} for boost ${bountyId}`);

    // Get bounty campaign and brand details
    const { data: bounty, error: bountyError } = await supabaseClient
      .from('bounty_campaigns')
      .select(`
        id,
        brand_id,
        shortimize_collection_name
      `)
      .eq('id', bountyId)
      .single();

    if (bountyError) {
      console.error('Error fetching bounty:', bountyError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bounty details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bounty) {
      return new Response(
        JSON.stringify({ error: 'Bounty not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get brand secrets (shortimize_api_key is now in brand_secrets table)
    const { data: brandSecrets, error: secretsError } = await supabaseClient
      .from('brand_secrets')
      .select('shortimize_api_key')
      .eq('brand_id', bounty.brand_id)
      .single();

    if (secretsError && secretsError.code !== 'PGRST116') {
      console.error('Error fetching brand secrets:', secretsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch brand secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shortimizeApiKey = brandSecrets?.shortimize_api_key;
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

    // Get user's social accounts
    const { data: socialAccounts, error: accountsError } = await supabaseClient
      .from('social_accounts')
      .select(`
        id,
        platform,
        username,
        account_link
      `)
      .eq('user_id', userId);

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
    for (const account of socialAccounts) {
      if (!account.account_link) {
        console.log(`No account link for ${account.username}, skipping`);
        continue;
      }

      console.log(`Tracking account: ${account.username} (${account.platform})`);

      // Prepare collection names (use boost's collection name if set)
      const collectionNames = bounty.shortimize_collection_name
        ? [bounty.shortimize_collection_name]
        : [];

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
    console.error('Error in track-boost-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
