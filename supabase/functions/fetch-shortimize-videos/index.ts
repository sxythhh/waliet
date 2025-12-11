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
  
  // Check multiple possible caption fields
  const caption = (video.title || video.caption || video.description || video.text || '').toLowerCase();
  
  if (logFirst) {
    console.log('[fetch-shortimize-videos] Sample video caption fields:', {
      title: video.title?.substring(0, 100),
      caption: video.caption?.substring(0, 100),
      description: video.description?.substring(0, 100),
      text: video.text?.substring(0, 100),
      combinedCaption: caption.substring(0, 100)
    });
  }
  
  return hashtags.some(hashtag => {
    const hashtagLower = hashtag.toLowerCase().replace(/^#/, '');
    // Check for hashtag with # prefix, without prefix, or as part of words
    const hasMatch = caption.includes(`#${hashtagLower}`) || 
                     caption.includes(hashtagLower) ||
                     caption.includes(hashtagLower.replace(/\s+/g, ''));
    return hasMatch;
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

    // Determine collection filter - skip if noCollectionFilter is true or if filtering by hashtag
    const useCollectionFilter = !noCollectionFilter && campaignHashtags.length === 0;
    const collection = useCollectionFilter ? (collectionName || brand.collection_name) : null;
    
    console.log('[fetch-shortimize-videos] Using collection:', collection, 'Hashtag filtering:', campaignHashtags.length > 0);

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

    // If filtering by hashtags without collection, we need to fetch multiple pages
    if (campaignHashtags.length > 0 && !collection) {
      const allMatchingVideos: any[] = [];
      let currentPage = 1;
      const maxPages = 10; // Limit to prevent too many requests
      const targetLimit = limit;
      
      while (allMatchingVideos.length < targetLimit && currentPage <= maxPages) {
        const pageParams = new URLSearchParams();
        pageParams.append('page', currentPage.toString());
        pageParams.append('limit', '100'); // Fetch 100 at a time
        pageParams.append('order_by', orderBy);
        pageParams.append('order_direction', orderDirection);
        
        if (username) pageParams.append('username', username);
        if (uploadedAtStart) pageParams.append('uploaded_at_start', uploadedAtStart);
        if (uploadedAtEnd) pageParams.append('uploaded_at_end', uploadedAtEnd);

        const pageUrl = `https://api.shortimize.com/videos?${pageParams.toString()}`;
        
        const response = await fetchWithRetry(pageUrl, {
          headers: { 'Authorization': `Bearer ${brand.shortimize_api_key}` },
        }, 5);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[fetch-shortimize-videos] Shortimize API error:', errorText);
          throw new Error(`Shortimize API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        const videos = result.data || [];
        
        // Filter by hashtag - log first video for debugging
        const matchingVideos = videos.filter((v: any, idx: number) => videoMatchesHashtags(v, campaignHashtags, idx === 0));
        allMatchingVideos.push(...matchingVideos);
        
        console.log(`[fetch-shortimize-videos] Page ${currentPage}: ${videos.length} videos, ${matchingVideos.length} matching, total: ${allMatchingVideos.length}`);

        // Check if there are more pages
        if (!result.pagination || currentPage >= result.pagination.total_pages || videos.length === 0) {
          break;
        }
        
        currentPage++;
        await delay(500); // Small delay between pages
      }

      // Sort and limit results
      const sortedVideos = allMatchingVideos
        .sort((a, b) => {
          const aVal = a[orderBy] || 0;
          const bVal = b[orderBy] || 0;
          return orderDirection === 'desc' ? bVal - aVal : aVal - bVal;
        })
        .slice(0, targetLimit);

      return new Response(JSON.stringify({
        videos: sortedVideos,
        pagination: {
          total: allMatchingVideos.length,
          page: 1,
          limit: targetLimit,
          total_pages: 1
        },
        debug: {
          collectionUsed: null,
          hashtagFilter: campaignHashtags,
          apiKeyConfigured: true,
          pagesScanned: currentPage
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Standard fetch with collection filter
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
    
    // Filter by campaign hashtags if provided (for collection-filtered results)
    if (campaignHashtags.length > 0) {
      const originalCount = videos.length;
      videos = videos.filter((video: any) => videoMatchesHashtags(video, campaignHashtags));
      console.log('[fetch-shortimize-videos] Filtered by hashtags:', {
        hashtags: campaignHashtags,
        originalCount,
        filteredCount: videos.length
      });
    }
    
    console.log('[fetch-shortimize-videos] API response:', {
      videosCount: videos.length,
      pagination: result.pagination,
      hashtagFilter: campaignHashtags.length > 0 ? campaignHashtags : null,
    });

    return new Response(JSON.stringify({
      videos: videos,
      pagination: {
        ...result.pagination,
        total: campaignHashtags.length > 0 ? videos.length : (result.pagination?.total || 0),
        total_pages: campaignHashtags.length > 0 ? 1 : (result.pagination?.total_pages || 0)
      },
      debug: {
        collectionUsed: collection,
        hashtagFilter: campaignHashtags.length > 0 ? campaignHashtags : null,
        apiKeyConfigured: true
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
