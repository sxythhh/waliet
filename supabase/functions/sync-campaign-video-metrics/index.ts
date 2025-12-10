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
    
    // Clone the request to read body safely
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

    // Build query for campaigns
    let query = supabaseClient
      .from('campaigns')
      .select(`
        id,
        brand_id,
        brands!campaigns_brand_id_fkey (
          id,
          shortimize_api_key,
          collection_name
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

    for (const campaign of campaigns || []) {
      // The brands relationship may return as array from Supabase, get first element
      const brandsData = campaign.brands as unknown;
      const brand = Array.isArray(brandsData) ? brandsData[0] : brandsData as { id: string; shortimize_api_key: string | null; collection_name: string | null } | null;
      
      if (!brand?.shortimize_api_key || !brand?.collection_name) {
        console.log(`Campaign ${campaign.id} - brand has no Shortimize config, skipping`);
        continue;
      }

      try {
        console.log(`Syncing metrics for campaign ${campaign.id} with collection ${brand.collection_name}`);

        // Fetch all videos from Shortimize for this collection
        const allVideos: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const url = new URL('https://api.shortimize.com/videos');
          url.searchParams.set('limit', '100');
          url.searchParams.set('page', page.toString());
          // URLSearchParams already handles encoding, don't double-encode
          url.searchParams.set('collections', brand.collection_name);

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${brand.shortimize_api_key}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Shortimize API error for campaign ${campaign.id}:`, errorText);
            throw new Error(`Shortimize API error: ${response.status}`);
          }

          const data = await response.json();
          const videos = data.videos || [];
          allVideos.push(...videos);

          // Check if there are more pages
          const pagination = data.pagination;
          if (pagination && page < pagination.total_pages) {
            page++;
          } else {
            hasMore = false;
          }
        }

        console.log(`Fetched ${allVideos.length} videos for campaign ${campaign.id}`);

        // Calculate totals
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let totalBookmarks = 0;

        for (const video of allVideos) {
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
            total_videos: allVideos.length,
            recorded_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Error inserting metrics for campaign ${campaign.id}:`, insertError);
          errorCount++;
        } else {
          console.log(`Successfully recorded metrics for campaign ${campaign.id}: ${totalViews} views, ${totalLikes} likes, ${totalComments} comments, ${allVideos.length} videos`);
          syncedCount++;
        }

      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Metrics sync complete. Synced: ${syncedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        errors: errorCount,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-campaign-video-metrics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
