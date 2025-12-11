import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry logic for rate limiting
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      // Rate limited - wait and retry with exponential backoff
      const waitTime = Math.pow(2, attempt) * 3000; // 3s, 6s, 12s, 24s, 48s
      console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
      await delay(waitTime);
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded due to rate limiting');
}

// Check if video caption contains any of the hashtags
function videoMatchesHashtags(video: any, hashtags: string[]): boolean {
  if (!hashtags || hashtags.length === 0) return true;
  
  const caption = (video.title || video.caption || '').toLowerCase();
  
  return hashtags.some(hashtag => {
    const hashtagLower = hashtag.toLowerCase().replace(/^#/, '');
    return caption.includes(`#${hashtagLower}`) || caption.includes(hashtagLower);
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if a specific campaignId was provided
    let specificCampaignId: string | null = null;
    
    const clonedReq = req.clone();
    try {
      const body = await clonedReq.json();
      console.log('Received body object:', JSON.stringify(body));
      specificCampaignId = body?.campaignId || null;
      console.log('Parsed campaignId:', specificCampaignId);
    } catch (e) {
      console.log('No body or parse error - will sync all campaigns');
    }

    console.log('Starting campaign video metrics sync...', specificCampaignId ? `for campaign ${specificCampaignId}` : 'for all campaigns');

    // Build query for campaigns - include hashtags field
    let query = supabaseClient
      .from('campaigns')
      .select(`
        id,
        brand_id,
        hashtags,
        brands!campaigns_brand_id_fkey (
          id,
          shortimize_api_key
        )
      `)
      .eq('status', 'active');

    // Filter to specific campaign if provided
    if (specificCampaignId) {
      query = query.eq('id', specificCampaignId);
    }

    const { data: campaigns, error: campaignsError } = await query;

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    console.log(`Found ${campaigns?.length || 0} campaigns to sync`);

    let syncedCount = 0;
    let errorCount = 0;
    let errorMessage = '';

    for (const campaign of campaigns || []) {
      const brandsData = campaign.brands as unknown;
      const brand = Array.isArray(brandsData) ? brandsData[0] : brandsData as { id: string; shortimize_api_key: string | null } | null;
      
      if (!brand?.shortimize_api_key) {
        console.log(`Campaign ${campaign.id} - brand has no Shortimize API key, skipping`);
        errorMessage = 'Brand has no Shortimize API key configured';
        errorCount++;
        continue;
      }

      const campaignHashtags = campaign.hashtags || [];
      
      // Skip if no hashtags configured - need hashtags to filter
      if (campaignHashtags.length === 0) {
        console.log(`Campaign ${campaign.id} - no hashtags configured, skipping metrics sync`);
        errorMessage = 'No hashtags configured for campaign';
        errorCount++;
        continue;
      }

      try {
        console.log(`Syncing metrics for campaign ${campaign.id}, hashtags: ${campaignHashtags.join(', ')}`);

        // Fetch ALL videos from Shortimize (no collection filter) and filter by hashtag
        const allMatchingVideos: any[] = [];
        let page = 1;
        let hasMore = true;
        const maxPages = 20; // Safety limit to prevent infinite loops

        while (hasMore && page <= maxPages) {
          const url = new URL('https://api.shortimize.com/videos');
          url.searchParams.set('limit', '100');
          url.searchParams.set('page', page.toString());
          // NO collection filter - fetch all videos

          console.log(`[sync-campaign-video-metrics] Fetching page ${page}...`);

          const response = await fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${brand.shortimize_api_key}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Shortimize API error for campaign ${campaign.id}:`, errorText);
            errorMessage = `Shortimize API error: ${response.status}`;
            throw new Error(errorMessage);
          }

          const data = await response.json();
          const videos = data.data || [];
          
          // Filter videos by hashtag in caption
          const matchingVideos = videos.filter((video: any) => videoMatchesHashtags(video, campaignHashtags));
          allMatchingVideos.push(...matchingVideos);
          
          console.log(`[sync-campaign-video-metrics] Page ${page}: ${videos.length} videos, ${matchingVideos.length} matching hashtags`);

          // Check if there are more pages
          const pagination = data.pagination;
          if (pagination && page < pagination.total_pages) {
            page++;
            // Longer delay between pages to avoid rate limiting
            await delay(1000);
          } else {
            hasMore = false;
          }
        }

        console.log(`[sync-campaign-video-metrics] Total matching videos for campaign ${campaign.id}: ${allMatchingVideos.length}`);

        // Calculate totals from matching videos
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let totalBookmarks = 0;

        for (const video of allMatchingVideos) {
          totalViews += video.latest_views || 0;
          totalLikes += video.latest_likes || 0;
          totalComments += video.latest_comments || 0;
          totalShares += video.latest_shares || 0;
          totalBookmarks += video.latest_bookmarks || 0;
        }

        // Insert metrics record
        const { error: insertError } = await supabaseClient
          .from('campaign_video_metrics')
          .insert({
            campaign_id: campaign.id,
            brand_id: brand.id,
            total_views: totalViews,
            total_likes: totalLikes,
            total_comments: totalComments,
            total_shares: totalShares,
            total_bookmarks: totalBookmarks,
            total_videos: allMatchingVideos.length,
            recorded_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Error inserting metrics for campaign ${campaign.id}:`, insertError);
          errorMessage = insertError.message;
          errorCount++;
        } else {
          console.log(`Successfully recorded metrics for campaign ${campaign.id}: ${totalViews} views, ${totalLikes} likes, ${totalComments} comments, ${allMatchingVideos.length} videos`);
          syncedCount++;
        }

      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errorCount++;
      }
    }

    console.log(`Metrics sync complete. Synced: ${syncedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        synced: syncedCount,
        errors: errorCount,
        errorMessage: errorCount > 0 ? errorMessage : null,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-campaign-video-metrics:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
