import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      specificCampaignId = body?.campaignId || null;
    } catch (e) {
      // No body - will sync all campaigns
    }

    console.log('[sync-metrics] Starting sync from cached videos...', specificCampaignId ? `for campaign ${specificCampaignId}` : 'for all campaigns');

    // Build query for campaigns
    let campaignQuery = supabaseClient
      .from('campaigns')
      .select('id, title, brand_id')
      .eq('status', 'active');

    if (specificCampaignId) {
      campaignQuery = campaignQuery.eq('id', specificCampaignId);
    }

    const { data: campaigns, error: campaignsError } = await campaignQuery;

    if (campaignsError) {
      console.error('[sync-metrics] Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    console.log(`[sync-metrics] Found ${campaigns?.length || 0} active campaigns`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    for (const campaign of campaigns || []) {
      try {
        // Aggregate metrics from cached_campaign_videos table
        const { data: cachedVideos, error: videosError } = await supabaseClient
          .from('cached_campaign_videos')
          .select('views, likes, comments, shares, bookmarks')
          .eq('campaign_id', campaign.id);

        if (videosError) {
          console.error(`[sync-metrics] Error fetching cached videos for "${campaign.title}":`, videosError);
          errorMessages.push(`${campaign.title}: ${videosError.message}`);
          errorCount++;
          continue;
        }

        if (!cachedVideos || cachedVideos.length === 0) {
          console.log(`[sync-metrics] No cached videos for "${campaign.title}", skipping`);
          skippedCount++;
          continue;
        }

        // Calculate totals
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let totalBookmarks = 0;

        for (const video of cachedVideos) {
          totalViews += video.views || 0;
          totalLikes += video.likes || 0;
          totalComments += video.comments || 0;
          totalShares += video.shares || 0;
          totalBookmarks += video.bookmarks || 0;
        }

        console.log(`[sync-metrics] Campaign "${campaign.title}": ${cachedVideos.length} videos, ${totalViews.toLocaleString()} views`);

        // Insert metrics snapshot
        const { error: insertError } = await supabaseClient
          .from('campaign_video_metrics')
          .insert({
            campaign_id: campaign.id,
            brand_id: campaign.brand_id,
            total_views: totalViews,
            total_likes: totalLikes,
            total_comments: totalComments,
            total_shares: totalShares,
            total_bookmarks: totalBookmarks,
            total_videos: cachedVideos.length,
            recorded_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`[sync-metrics] Insert error for "${campaign.title}":`, insertError);
          errorMessages.push(`${campaign.title}: ${insertError.message}`);
          errorCount++;
        } else {
          console.log(`[sync-metrics] ✓ Recorded metrics for "${campaign.title}"`);
          syncedCount++;
        }

      } catch (error) {
        console.error(`[sync-metrics] Error processing "${campaign.title}":`, error);
        errorMessages.push(`${campaign.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
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
