import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ShortimizeVideo {
  ad_id: string;
  username: string;
  platform: string;
  ad_link: string;
  uploaded_at: string;
  title: string;
  latest_views: number;
  latest_likes: number;
  latest_comments: number;
  latest_bookmarks: number;
  latest_shares: number;
  caption?: string;
  description?: string;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        console.log(`[sync-campaign-account-videos] Rate limited, waiting ${retryAfter}s before retry ${attempt + 1}`);
        await delay(retryAfter * 1000);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`[sync-campaign-account-videos] Fetch error attempt ${attempt + 1}:`, error);
      await delay(1000 * (attempt + 1));
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

async function fetchVideosForUsername(
  apiKey: string,
  username: string,
  collectionName?: string
): Promise<ShortimizeVideo[]> {
  const allVideos: ShortimizeVideo[] = [];
  let page = 1;
  const limit = 100;
  let hasMore = true;
  
  while (hasMore) {
    const params = new URLSearchParams({
      username,
      page: page.toString(),
      limit: limit.toString(),
      order_by: 'uploaded_at',
      order_direction: 'desc',
    });
    
    if (collectionName) {
      params.set('collections', collectionName);
    }
    
    const url = `https://app.shortimize.com/api/v1/ads?${params.toString()}`;
    console.log(`[sync-campaign-account-videos] Fetching page ${page} for @${username}`);
    
    const response = await fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[sync-campaign-account-videos] API error for @${username}:`, response.status);
      break;
    }
    
    const data = await response.json();
    const videos = data.data || [];
    
    allVideos.push(...videos);
    
    // Check if there are more pages
    hasMore = videos.length === limit && page < (data.pagination?.total_pages || 1);
    page++;
    
    // Rate limit protection: wait between pages
    if (hasMore) {
      await delay(500);
    }
  }
  
  return allVideos;
}

function videoMatchesHashtags(video: ShortimizeVideo, hashtags: string[]): boolean {
  if (!hashtags || hashtags.length === 0) return true;
  
  const searchText = [
    video.title || '',
    video.caption || '',
    video.description || ''
  ].join(' ').toLowerCase();
  
  return hashtags.some(tag => {
    const normalizedTag = tag.toLowerCase().replace('#', '');
    return searchText.includes(normalizedTag) || searchText.includes(`#${normalizedTag}`);
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, forceRefresh = false } = await req.json();
    
    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'campaignId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-campaign-account-videos] Starting sync for campaign: ${campaignId}, forceRefresh: ${forceRefresh}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get campaign details including brand and hashtags
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, brand_id, hashtags, brands(shortimize_api_key, collection_name)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('[sync-campaign-account-videos] Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brandData = campaign.brands as unknown as { shortimize_api_key: string | null; collection_name: string | null } | null;
    const apiKey = brandData?.shortimize_api_key;
    const collectionName = brandData?.collection_name || undefined;

    if (!apiKey) {
      console.log('[sync-campaign-account-videos] No Shortimize API key configured');
      return new Response(
        JSON.stringify({ error: 'Shortimize API key not configured for this brand' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check sync status - skip if recently synced (within 1 hour) unless forced
    const { data: syncStatus } = await supabase
      .from('campaign_video_sync_status')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (!forceRefresh && syncStatus?.last_synced_at) {
      const lastSync = new Date(syncStatus.last_synced_at);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastSync > hourAgo) {
        console.log('[sync-campaign-account-videos] Recently synced, skipping');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Recently synced',
            videos_synced: syncStatus.videos_synced,
            last_synced_at: syncStatus.last_synced_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update sync status to in_progress
    await supabase
      .from('campaign_video_sync_status')
      .upsert({
        campaign_id: campaignId,
        sync_status: 'in_progress',
        updated_at: new Date().toISOString()
      }, { onConflict: 'campaign_id' });

    // Get all active social accounts connected to this campaign
    const { data: connectedAccounts, error: accountsError } = await supabase
      .from('social_account_campaigns')
      .select(`
        social_accounts(username, platform)
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'active');

    if (accountsError) {
      console.error('[sync-campaign-account-videos] Error fetching accounts:', accountsError);
      throw accountsError;
    }

    // Extract unique usernames
    const usernames = [...new Set(
      connectedAccounts
        ?.map(ac => {
          const account = ac.social_accounts as unknown as { username: string; platform: string } | null;
          return account?.username;
        })
        .filter((u): u is string => Boolean(u)) || []
    )];

    console.log(`[sync-campaign-account-videos] Found ${usernames.length} connected accounts:`, usernames);

    if (usernames.length === 0) {
      // No accounts connected, update sync status
      await supabase
        .from('campaign_video_sync_status')
        .upsert({
          campaign_id: campaignId,
          sync_status: 'completed',
          last_synced_at: new Date().toISOString(),
          videos_synced: 0,
          error_message: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'campaign_id' });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No connected accounts',
          videos_synced: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hashtags = (campaign.hashtags || []) as string[];
    const allVideos: ShortimizeVideo[] = [];

    // Fetch videos for each username with rate limiting
    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      console.log(`[sync-campaign-account-videos] Fetching videos for @${username} (${i + 1}/${usernames.length})`);
      
      try {
        const videos = await fetchVideosForUsername(apiKey, username, collectionName);
        
        // Filter by hashtags if campaign has hashtags configured
        const matchingVideos = hashtags.length > 0 
          ? videos.filter(v => videoMatchesHashtags(v, hashtags))
          : videos;
        
        console.log(`[sync-campaign-account-videos] @${username}: ${videos.length} total, ${matchingVideos.length} matching hashtags`);
        allVideos.push(...matchingVideos);
      } catch (error) {
        console.error(`[sync-campaign-account-videos] Error fetching @${username}:`, error);
      }

      // Rate limit between accounts
      if (i < usernames.length - 1) {
        await delay(1000);
      }
    }

    console.log(`[sync-campaign-account-videos] Total videos to cache: ${allVideos.length}`);

    // Clear old cached videos for this campaign
    await supabase
      .from('cached_campaign_videos')
      .delete()
      .eq('campaign_id', campaignId);

    // Insert new videos in batches
    const batchSize = 100;
    for (let i = 0; i < allVideos.length; i += batchSize) {
      const batch = allVideos.slice(i, i + batchSize).map(video => ({
        campaign_id: campaignId,
        brand_id: campaign.brand_id,
        shortimize_video_id: video.ad_id,
        platform: video.platform,
        username: video.username,
        video_url: video.ad_link,
        thumbnail_url: null, // Could be constructed from video data
        title: video.title,
        caption: video.caption || null,
        description: video.description || null,
        views: video.latest_views || 0,
        likes: video.latest_likes || 0,
        comments: video.latest_comments || 0,
        shares: video.latest_shares || 0,
        bookmarks: video.latest_bookmarks || 0,
        uploaded_at: video.uploaded_at,
        cached_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('cached_campaign_videos')
        .insert(batch);

      if (insertError) {
        console.error(`[sync-campaign-account-videos] Error inserting batch ${i}:`, insertError);
      }
    }

    // Update sync status
    await supabase
      .from('campaign_video_sync_status')
      .upsert({
        campaign_id: campaignId,
        sync_status: 'completed',
        last_synced_at: new Date().toISOString(),
        videos_synced: allVideos.length,
        error_message: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'campaign_id' });

    console.log(`[sync-campaign-account-videos] Sync completed: ${allVideos.length} videos cached`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videos_synced: allVideos.length,
        accounts_processed: usernames.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[sync-campaign-account-videos] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
