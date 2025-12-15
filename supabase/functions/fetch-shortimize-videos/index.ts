import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry and exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const waitTime = Math.pow(2, attempt) * 2000;
      console.log(`Rate limited (429), waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
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
  
  const caption = (
    video.title || 
    video.caption || 
    video.description || 
    video.text || 
    video.content ||
    video.video_title ||
    video.ad_title ||
    ''
  ).toLowerCase();
  
  return hashtags.some(hashtag => {
    const hashtagLower = hashtag.toLowerCase().replace(/^#/, '');
    return caption.includes(`#${hashtagLower}`) || 
           caption.includes(hashtagLower) ||
           caption.includes(hashtagLower.replace(/\s+/g, ''));
  });
}

// Fetch a single page from Shortimize API
async function fetchShortimizePage(
  apiKey: string,
  page: number,
  limit: number,
  orderBy: string,
  orderDirection: string,
  collection: string | null,
  username: string | null,
  uploadedAtStart: string | null,
  uploadedAtEnd: string | null
): Promise<{ videos: any[]; pagination: any }> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  params.append('order_by', orderBy);
  params.append('order_direction', orderDirection);
  
  if (collection) {
    params.append('collections', collection.trim());
  }
  if (username) {
    params.append('username', username);
  }
  if (uploadedAtStart) {
    params.append('uploaded_at_start', uploadedAtStart);
  }
  if (uploadedAtEnd) {
    params.append('uploaded_at_end', uploadedAtEnd);
  }

  const apiUrl = `https://api.shortimize.com/videos?${params.toString()}`;
  
  const response = await fetchWithRetry(apiUrl, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  }, 5);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shortimize API returned ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return {
    videos: result.data || [],
    pagination: result.pagination || {}
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      brandId, 
      collectionName,
      campaignId,
      page = 1,
      limit = 50,
      orderBy = 'uploaded_at',
      orderDirection = 'desc',
      username,
      uploadedAtStart,
      uploadedAtEnd,
      noCollectionFilter = false,
    } = await req.json();

    console.log('[fetch-shortimize-videos] Request params:', { 
      brandId, campaignId, page, limit, orderBy, orderDirection, username, noCollectionFilter
    });

    if (!brandId) {
      throw new Error('brandId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the brand's Shortimize API key and collection name
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('shortimize_api_key, collection_name, name')
      .eq('id', brandId)
      .single();

    if (brandError || !brand?.shortimize_api_key) {
      throw new Error('Shortimize API key not configured for this brand');
    }

    // Get campaign hashtags if campaignId is provided
    let campaignHashtags: string[] = [];
    if (campaignId) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('hashtags')
        .eq('id', campaignId)
        .single();
      
      if (campaign?.hashtags && campaign.hashtags.length > 0) {
        campaignHashtags = campaign.hashtags;
        console.log('[fetch-shortimize-videos] Campaign hashtags:', campaignHashtags);
      }
    }

    // Determine collection filter - skip if using hashtag filtering
    const useHashtagFiltering = campaignHashtags.length > 0;
    const collection = (useHashtagFiltering || noCollectionFilter) ? null : (collectionName || brand.collection_name);
    
    console.log('[fetch-shortimize-videos] Mode:', useHashtagFiltering ? 'hashtag filtering' : 'collection filtering');

    // If using hashtag filtering, we need to paginate through API pages to find enough matches
    if (useHashtagFiltering) {
      const matchedVideos: any[] = [];
      const targetCount = limit; // How many videos we want
      const skipCount = (page - 1) * limit; // How many to skip for pagination
      let totalMatched = 0;
      let apiPage = 1;
      const maxApiPages = 50; // Safety limit
      const apiPageSize = 100; // Fetch larger pages for efficiency
      let totalApiVideos = 0;
      let hasMorePages = true;

      console.log('[fetch-shortimize-videos] Starting hashtag search, need:', targetCount, 'skip:', skipCount);

      while (matchedVideos.length < targetCount && apiPage <= maxApiPages && hasMorePages) {
        const pageResult = await fetchShortimizePage(
          brand.shortimize_api_key,
          apiPage,
          apiPageSize,
          orderBy,
          orderDirection,
          null, // No collection filter
          username,
          uploadedAtStart,
          uploadedAtEnd
        );

        if (apiPage === 1) {
          totalApiVideos = pageResult.pagination.total || 0;
          console.log('[fetch-shortimize-videos] Total videos in API:', totalApiVideos);
        }

        // Filter this page by hashtags
        const pageMatches = pageResult.videos.filter((v: any) => videoMatchesHashtags(v, campaignHashtags));
        
        // Apply skip logic (for pagination)
        for (const video of pageMatches) {
          if (totalMatched >= skipCount && matchedVideos.length < targetCount) {
            matchedVideos.push(video);
          }
          totalMatched++;
        }

        console.log('[fetch-shortimize-videos] Page', apiPage, ':', pageResult.videos.length, 'videos,', pageMatches.length, 'matches, accumulated:', matchedVideos.length);

        // Check if there are more pages
        hasMorePages = pageResult.videos.length === apiPageSize && apiPage < (pageResult.pagination.total_pages || maxApiPages);
        apiPage++;

        // Small delay to avoid rate limiting
        if (hasMorePages && matchedVideos.length < targetCount) {
          await delay(100);
        }
      }

      // Estimate total matching videos based on match rate
      const pagesScanned = apiPage - 1;
      const videosScanned = pagesScanned * apiPageSize;
      const matchRate = videosScanned > 0 ? totalMatched / Math.min(videosScanned, totalApiVideos) : 0;
      const estimatedTotal = Math.round(totalApiVideos * matchRate);

      console.log('[fetch-shortimize-videos] Hashtag search complete:', {
        matchedVideos: matchedVideos.length,
        totalMatched,
        pagesScanned,
        estimatedTotal
      });

      return new Response(JSON.stringify({
        videos: matchedVideos,
        pagination: {
          total: estimatedTotal,
          page,
          limit,
          total_pages: Math.ceil(estimatedTotal / limit),
          order_by: orderBy,
          order_direction: orderDirection,
        },
        debug: {
          mode: 'hashtag_filtering',
          hashtagFilter: campaignHashtags,
          pagesScanned,
          totalMatched,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Standard collection-based fetch (single page)
    const pageResult = await fetchShortimizePage(
      brand.shortimize_api_key,
      page,
      limit,
      orderBy,
      orderDirection,
      collection,
      username,
      uploadedAtStart,
      uploadedAtEnd
    );

    console.log('[fetch-shortimize-videos] Collection fetch complete:', pageResult.videos.length, 'videos');

    return new Response(JSON.stringify({
      videos: pageResult.videos,
      pagination: {
        ...pageResult.pagination,
        total: pageResult.pagination?.total ?? pageResult.videos.length,
        total_pages: pageResult.pagination?.total_pages ?? 1,
      },
      debug: {
        mode: 'collection_filtering',
        collectionUsed: collection,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[fetch-shortimize-videos] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: { timestamp: new Date().toISOString() }
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
