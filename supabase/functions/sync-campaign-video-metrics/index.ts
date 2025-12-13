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
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429 || response.status >= 500) {
        const waitTime = Math.pow(2, attempt) * 3000;
        console.log(`Got ${response.status}, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await delay(waitTime);
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 3000;
        console.log(`Fetch error, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}:`, error);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Check if video caption contains any of the hashtags
function videoMatchesHashtags(video: any, hashtags: string[]): boolean {
  if (!hashtags || hashtags.length === 0) return true;
  
  // Check multiple possible caption fields
  const caption = (
    video.title || 
    video.caption || 
    video.description || 
    video.text || 
    ''
  ).toLowerCase();
  
  return hashtags.some(hashtag => {
    const hashtagLower = hashtag.toLowerCase().replace(/^#/, '').trim();
    // Match with or without # prefix, and handle spaces
    return caption.includes(`#${hashtagLower}`) || 
           caption.includes(hashtagLower) ||
           caption.includes(hashtagLower.replace(/\s+/g, ''));
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

    // Global Shortimize API key as fallback
    const globalApiKey = Deno.env.get('SHORTIMIZE_API_KEY');

    // Check if a specific campaignId was provided
    let specificCampaignId: string | null = null;
    
    const clonedReq = req.clone();
    try {
      const body = await clonedReq.json();
      specificCampaignId = body?.campaignId || null;
    } catch (e) {
      // No body - will sync all campaigns
    }

    console.log('[sync-metrics] Starting sync...', specificCampaignId ? `for campaign ${specificCampaignId}` : 'for all campaigns');

    // Build query for campaigns with their brand's API key
    let query = supabaseClient
      .from('campaigns')
      .select(`
        id,
        title,
        brand_id,
        hashtags,
        brands!campaigns_brand_id_fkey (
          id,
          name,
          shortimize_api_key,
          collection_name
        )
      `)
      .eq('status', 'active');

    if (specificCampaignId) {
      query = query.eq('id', specificCampaignId);
    }

    const { data: campaigns, error: campaignsError } = await query;

    if (campaignsError) {
      console.error('[sync-metrics] Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    console.log(`[sync-metrics] Found ${campaigns?.length || 0} active campaigns`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let errorMessages: string[] = [];

    for (const campaign of campaigns || []) {
      const brandsData = campaign.brands as unknown;
      const brand = Array.isArray(brandsData) ? brandsData[0] : brandsData as { 
        id: string; 
        name: string;
        shortimize_api_key: string | null;
        collection_name: string | null;
      } | null;
      
      // Use brand's API key or fall back to global key
      const apiKey = brand?.shortimize_api_key || globalApiKey;
      
      if (!apiKey) {
        console.log(`[sync-metrics] Campaign "${campaign.title}" (${campaign.id}) - no API key available, skipping`);
        skippedCount++;
        continue;
      }

      const campaignHashtags = campaign.hashtags || [];
      
      // If no hashtags configured, skip - we need hashtags to filter videos
      if (campaignHashtags.length === 0) {
        console.log(`[sync-metrics] Campaign "${campaign.title}" (${campaign.id}) - no hashtags configured, skipping`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`[sync-metrics] Syncing campaign "${campaign.title}" with hashtags: [${campaignHashtags.join(', ')}]`);

        // Fetch all videos and filter by hashtag
        const allMatchingVideos: any[] = [];
        let page = 1;
        let hasMore = true;
        const maxPages = 100;

        while (hasMore && page <= maxPages) {
          const url = new URL('https://api.shortimize.com/videos');
          url.searchParams.set('limit', '100');
          url.searchParams.set('page', page.toString());
          url.searchParams.set('order_by', 'uploaded_at');
          url.searchParams.set('order_direction', 'desc');

          const response = await fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[sync-metrics] Shortimize API error for "${campaign.title}":`, response.status, errorText);
            throw new Error(`Shortimize API error: ${response.status}`);
          }

          const data = await response.json();
          const videos = data.data || [];
          
          // Filter videos by hashtag in caption
          const matchingVideos = videos.filter((video: any) => videoMatchesHashtags(video, campaignHashtags));
          allMatchingVideos.push(...matchingVideos);
          
          if (page === 1) {
            console.log(`[sync-metrics] Page 1: ${videos.length} total videos, ${matchingVideos.length} matching`);
          }

          // Check pagination
          const pagination = data.pagination;
          if (pagination && page < pagination.total_pages) {
            page++;
            await delay(500); // Rate limit protection
          } else {
            hasMore = false;
          }
        }

        console.log(`[sync-metrics] Campaign "${campaign.title}": Found ${allMatchingVideos.length} matching videos across ${page} pages`);

        // Calculate totals from matching videos
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let totalBookmarks = 0;

        for (const video of allMatchingVideos) {
          totalViews += video.latest_views || video.views || 0;
          totalLikes += video.latest_likes || video.likes || 0;
          totalComments += video.latest_comments || video.comments || 0;
          totalShares += video.latest_shares || video.shares || 0;
          totalBookmarks += video.latest_bookmarks || video.bookmarks || 0;
        }

        // Insert metrics snapshot
        const { error: insertError } = await supabaseClient
          .from('campaign_video_metrics')
          .insert({
            campaign_id: campaign.id,
            brand_id: brand?.id || campaign.brand_id,
            total_views: totalViews,
            total_likes: totalLikes,
            total_comments: totalComments,
            total_shares: totalShares,
            total_bookmarks: totalBookmarks,
            total_videos: allMatchingVideos.length,
            recorded_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`[sync-metrics] Insert error for "${campaign.title}":`, insertError);
          errorMessages.push(`${campaign.title}: ${insertError.message}`);
          errorCount++;
        } else {
          console.log(`[sync-metrics] ✓ Recorded metrics for "${campaign.title}": ${totalViews.toLocaleString()} views, ${allMatchingVideos.length} videos`);
          syncedCount++;
        }

      } catch (error) {
        console.error(`[sync-metrics] Error processing "${campaign.title}":`, error);
        errorMessages.push(`${campaign.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }

      // Small delay between campaigns to avoid rate limiting
      await delay(1000);
    }

    const summary = {
      success: errorCount === 0,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorMessage: errorMessages.length > 0 ? errorMessages.join('; ') : null,
      timestamp: new Date().toISOString(),
    };

    console.log(`[sync-metrics] Complete:`, summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[sync-metrics] Fatal error:', error);
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
