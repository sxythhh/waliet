import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry and exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      // Rate limited - wait and retry with exponential backoff
      const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.log(`Rate limited (429), waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
      await delay(waitTime);
      lastError = new Error(`Rate limited after ${maxRetries} attempts`);
      continue;
    }
    
    return response;
  }
  
  throw lastError || new Error('Max retries exceeded');
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
      uploadedAtEnd
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
      uploadedAtEnd
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
      apiKeyLength: brand?.shortimize_api_key?.length,
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

    // Get campaign hashtag if campaignId is provided
    let campaignHashtag: string | null = null;
    if (campaignId) {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('hashtag')
        .eq('id', campaignId)
        .single();
      
      if (!campaignError && campaign?.hashtag) {
        campaignHashtag = campaign.hashtag;
        console.log('[fetch-shortimize-videos] Campaign hashtag:', campaignHashtag);
      }
    }

    // Use provided collection name or fall back to brand's collection
    const collection = collectionName || brand.collection_name;
    console.log('[fetch-shortimize-videos] Using collection:', collection);

    // Build query parameters
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('order_by', orderBy);
    params.append('order_direction', orderDirection);
    
    if (collection) {
      // URLSearchParams handles encoding automatically - don't double encode
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

    // Fetch videos from Shortimize API with retry logic
    const response = await fetchWithRetry(
      apiUrl,
      {
        headers: {
          'Authorization': `Bearer ${brand.shortimize_api_key}`,
        },
      },
      3
    );

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
    
    // Filter by campaign hashtag if provided
    if (campaignHashtag) {
      const hashtagLower = campaignHashtag.toLowerCase();
      videos = videos.filter((video: any) => {
        // Check if the video's hashtags/labels contain the campaign hashtag
        const videoHashtags = video.hashtags || video.label_names || [];
        return videoHashtags.some((tag: string) => 
          tag.toLowerCase() === hashtagLower || 
          tag.toLowerCase() === `#${hashtagLower}` ||
          tag.toLowerCase().replace('#', '') === hashtagLower
        );
      });
      console.log('[fetch-shortimize-videos] Filtered by hashtag:', {
        hashtag: campaignHashtag,
        originalCount: result.data?.length || 0,
        filteredCount: videos.length
      });
    }
    
    console.log('[fetch-shortimize-videos] API response:', {
      videosCount: videos.length,
      pagination: result.pagination,
      hasData: !!result.data,
      hashtagFilter: campaignHashtag,
      firstVideoSample: videos[0] ? {
        ad_id: videos[0].ad_id,
        username: videos[0].username,
        platform: videos[0].platform,
        hashtags: videos[0].hashtags || videos[0].label_names
      } : null
    });

    // If no videos found, try fetching without collection filter to debug
    if (videos.length === 0 && collection && !campaignHashtag) {
      console.log('[fetch-shortimize-videos] No videos found with collection filter. Checking available collections...');
      
      // Try fetching a sample without collection filter to see if API key works
      const debugParams = new URLSearchParams();
      debugParams.append('page', '1');
      debugParams.append('limit', '5');
      
      const debugResponse = await fetchWithRetry(
        `https://api.shortimize.com/videos?${debugParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${brand.shortimize_api_key}`,
          },
        },
        3
      );
      
      if (debugResponse.ok) {
        const debugResult = await debugResponse.json();
        // Get unique collections from sample videos
        const sampleCollections = [...new Set(
          debugResult.data?.flatMap((v: any) => v.label_names || []) || []
        )];
        console.log('[fetch-shortimize-videos] Debug fetch (no collection filter):', {
          totalVideos: debugResult.pagination?.total || 0,
          availableCollections: sampleCollections,
          firstVideoSample: debugResult.data?.[0] || null
        });
      }
    }

    return new Response(JSON.stringify({
      videos: videos,
      pagination: {
        ...result.pagination,
        // Adjust total if we filtered by hashtag
        total: campaignHashtag ? videos.length : (result.pagination?.total || 0),
        total_pages: campaignHashtag ? 1 : (result.pagination?.total_pages || 0)
      },
      debug: {
        collectionUsed: collection,
        hashtagFilter: campaignHashtag,
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
        debug: {
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
