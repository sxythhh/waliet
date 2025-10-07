import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShortimizeAccount {
  organisation_id: string;
  account_link?: string;
  username: string;
  platform: string;
  empty?: boolean;
  link?: string;
  latest_followers_count?: number | null;
  latest_following_count?: number | null;
  tracking_type?: string;
  median_views_non_zero?: number;
  percent_outperform_10x?: number;
  percent_outperform_25x?: number;
  total_videos_tracked?: number;
  total_views?: number;
  total_likes?: number;
  total_comments?: number;
  total_bookmarks?: number;
  total_shares?: number;
  bio?: string;
  last_uploaded_at?: string;
  removed?: boolean;
  private?: boolean;
  label_ids?: any;
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

    const { campaignId, collectionNames } = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shortimizeApiKey = Deno.env.get('SHORTIMIZE_API_KEY');
    if (!shortimizeApiKey) {
      return new Response(
        JSON.stringify({ error: 'Shortimize API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query params for collection filtering
    const params = new URLSearchParams();
    if (collectionNames && collectionNames.length > 0) {
      params.append('collections', collectionNames.join(','));
    }

    const queryString = params.toString();
    const url = `https://api.shortimize.com/accounts${queryString ? `?${queryString}` : ''}`;

    console.log('Fetching accounts from Shortimize:', url);

    // Fetch accounts from Shortimize (filtered by collection if specified)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${shortimizeApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shortimize API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Shortimize API error: ${response.status}`,
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accounts: ShortimizeAccount[] = await response.json();
    console.log(`Fetched ${accounts.length} accounts from Shortimize`);

    let syncedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Upsert each account into campaign_account_analytics
    for (const account of accounts) {
      try {
        // Skip empty, removed, or private accounts
        if (account.empty || account.removed || account.private) {
          continue;
        }

        const analyticsData = {
          campaign_id: campaignId,
          account_username: account.username,
          platform: account.platform.toLowerCase(),
          account_link: account.account_link || account.link,
          // Only add basic account info - metrics will come from CSV import
          total_views: 0,
          total_likes: 0,
          total_comments: 0,
          total_videos: 0,
          total_bookmarks: 0,
          total_shares: 0,
          average_video_views: 0,
          median_views_non_zero: null,
          percent_outperform_10x: null,
          percent_outperform_25x: null,
          latest_followers_count: account.latest_followers_count,
          latest_following_count: account.latest_following_count,
          tracking_type: account.tracking_type,
          bio: account.bio,
          last_uploaded_at: account.last_uploaded_at,
          shortimize_account_id: `${account.platform}_${account.username}`,
          last_tracked: new Date().toISOString().split('T')[0],
        };

        const { error: upsertError } = await supabaseClient
          .from('campaign_account_analytics')
          .upsert(analyticsData, {
            onConflict: 'campaign_id,account_username,platform',
          });

        if (upsertError) {
          console.error('Error upserting account:', account.username, upsertError);
          errors.push(`${account.username}: ${upsertError.message}`);
          errorCount++;
        } else {
          syncedCount++;
        }
      } catch (err) {
        console.error('Error processing account:', account.username, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${account.username}: ${errorMessage}`);
        errorCount++;
      }
    }

    // Update tracking status
    const trackingUpdate = {
      campaign_id: campaignId,
      collection_name: collectionNames?.[0] || 'default',
      last_sync_at: new Date().toISOString(),
      sync_status: errorCount > 0 ? 'partial' : 'completed',
      accounts_synced: syncedCount,
      sync_error: errors.length > 0 ? errors.join('; ') : null,
    };

    await supabaseClient
      .from('shortimize_tracking')
      .upsert(trackingUpdate, {
        onConflict: 'campaign_id,collection_name',
      });

    return new Response(
      JSON.stringify({
        success: true,
        total: accounts.length,
        synced: syncedCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-shortimize-analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
