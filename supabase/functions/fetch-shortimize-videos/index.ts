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
      // Rate limited - wait and retry with exponential backoff
      const waitTime = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s, 16s, 32s
      console.log(`Rate limited (429), waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
      await delay(waitTime);
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded due to rate limiting');
}

// Check if video caption contains any of the hashtags
function videoMatchesHashtags(video: any, hashtags: string[], logFirst = false): boolean {
  if (!hashtags || hashtags.length === 0) return true;
  
  if (logFirst) {
    // Log all available fields on the video object
    console.log('[fetch-shortimize-videos] Sample video object keys:', Object.keys(video));
    console.log('[fetch-shortimize-videos] Sample video data:', JSON.stringify(video, null, 2).substring(0, 2000));
  }
  
  // Check multiple possible caption fields from Shortimize API
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
      limit = 100,
      orderBy = 'uploaded_at',
      orderDirection = 'desc',
      username,
      uploadedAtStart,
      uploadedAtEnd,
      noCollectionFilter = false, // New option to skip collection filtering
    } = await req.json();

    console.log('[fetch-shortimize-videos] Request params:', { 
      brandId, 
      collectionName, 
      campaignId,
      page, 
      limit, 
      orderBy, 
      orderDirection,
      username,
      uploadedAtStart,
      uploadedAtEnd,
      noCollectionFilter
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

    console.log('[fetch-shortimize-videos] Brand data:', { 
      brandName: brand?.name,
      hasApiKey: !!brand?.shortimize_api_key,
      storedCollectionName: brand?.collection_name,
      error: brandError
    });

    if (brandError) {
      console.error('[fetch-shortimize-videos] Error fetching brand:', brandError);
      throw new Error('Failed to fetch brand');
    }

    if (!brand?.shortimize_api_key) {
      throw new Error('Shortimize API key not configured for this brand');
    }

    // Get campaign hashtags if campaignId is provided
    let campaignHashtags: string[] = [];
    if (campaignId) {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('hashtags')
        .eq('id', campaignId)
        .single();
      
      if (!campaignError && campaign?.hashtags && campaign.hashtags.length > 0) {
        campaignHashtags = campaign.hashtags;
        console.log('[fetch-shortimize-videos] Campaign hashtags:', campaignHashtags);
      }
    }

    // Determine which Shortimize collection to use
    // If campaign has hashtags configured, skip collection filter and search all videos by hashtag
    const collection = (campaignHashtags.length > 0 || noCollectionFilter) ? null : (collectionName || brand.collection_name);
    
    console.log('[fetch-shortimize-videos] Using collection:', collection, 'Hashtags:', campaignHashtags);

    // Build query parameters
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
    console.log('[fetch-shortimize-videos] Calling Shortimize API:', apiUrl);

    // Standard fetch with collection filter and server-side sorting/filtering
    const response = await fetchWithRetry(apiUrl, {
      headers: { 'Authorization': `Bearer ${brand.shortimize_api_key}` },
    }, 5);

    console.log('[fetch-shortimize-videos] API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetch-shortimize-videos] Shortimize API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Shortimize API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    let videos = result.data || [];
    
    // Filter by campaign hashtags if provided
    if (campaignHashtags.length > 0) {
      const originalCount = videos.length;
      videos = videos.filter((video: any) => videoMatchesHashtags(video, campaignHashtags, originalCount > 0 && videos.indexOf(video) === 0));
      console.log('[fetch-shortimize-videos] Filtered by hashtags:', {
        hashtags: campaignHashtags,
        originalCount,
        filteredCount: videos.length
      });
    }
    
    console.log('[fetch-shortimize-videos] Final response:', {
      videosCount: videos.length,
      pagination: result.pagination,
    });

    return new Response(JSON.stringify({
      videos,
      pagination: {
        ...result.pagination,
        // Note: pagination totals from API won't reflect hashtag filtering
        // This is a tradeoff for efficiency - we filter a single page at a time
        total: result.pagination?.total ?? videos.length,
        total_pages: result.pagination?.total_pages ?? (videos.length > 0 ? 1 : 0),
      },
      debug: {
        collectionUsed: collection,
        hashtagFilter: campaignHashtags.length > 0 ? campaignHashtags : null,
        apiKeyConfigured: true,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[fetch-shortimize-videos] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        debug: { timestamp: new Date().toISOString() }
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
