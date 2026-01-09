import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrackVideoRequest {
  videoUrl: string;
  campaignId?: string;
  boostId?: string;
  submissionId: string;
  isBoost: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { videoUrl, campaignId, boostId, submissionId, isBoost }: TrackVideoRequest = await req.json();

    console.log('Track Shortimize Video request:', { videoUrl, campaignId, boostId, submissionId, isBoost });

    if (!videoUrl) {
      console.error('Missing video URL');
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!campaignId && !boostId) {
      console.error('Missing campaign or boost ID');
      return new Response(
        JSON.stringify({ error: 'Campaign ID or Boost ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get brand info including API key and collection settings
    let brandId: string | null = null;
    let collectionName: string | null = null;

    if (isBoost && boostId) {
      // Fetch boost and its brand
      const { data: boost, error: boostError } = await supabase
        .from('bounty_campaigns')
        .select('brand_id, shortimize_collection_name')
        .eq('id', boostId)
        .single();

      if (boostError) {
        console.error('Error fetching boost:', boostError);
        return new Response(
          JSON.stringify({ error: 'Boost not found', details: boostError.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      brandId = boost.brand_id;
      collectionName = boost.shortimize_collection_name;
    } else if (campaignId) {
      // Fetch campaign and its brand
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('brand_id, shortimize_collection_name')
        .eq('id', campaignId)
        .single();

      if (campaignError) {
        console.error('Error fetching campaign:', campaignError);
        return new Response(
          JSON.stringify({ error: 'Campaign not found', details: campaignError.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      brandId = campaign.brand_id;
      collectionName = campaign.shortimize_collection_name;
    }

    if (!brandId) {
      console.error('No brand ID found');
      return new Response(
        JSON.stringify({ error: 'Brand not found for this campaign/boost' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brand's Shortimize API key and fallback collection name
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('shortimize_api_key, collection_name')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand:', brandError);
      return new Response(
        JSON.stringify({ error: 'Brand not found', details: brandError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!brand.shortimize_api_key) {
      console.log('No Shortimize API key configured for brand');
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true, 
          message: 'No Shortimize API key configured for this brand' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use campaign/boost-specific collection, fall back to brand-level collection
    const finalCollectionName = collectionName || brand.collection_name;

    if (!finalCollectionName) {
      console.log('No collection name configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true, 
          message: 'No Shortimize collection configured for this campaign/boost' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tracking video with Shortimize:', { 
      videoUrl, 
      collectionName: finalCollectionName,
      brandId 
    });

    // Call Shortimize Video Tracking API
    const shortimizeResponse = await fetch('https://api.shortimize.com/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${brand.shortimize_api_key}`,
      },
      body: JSON.stringify({
        link: videoUrl,
        collection_names: [finalCollectionName],
      }),
    });

    // Handle potentially empty or non-JSON responses
    const responseText = await shortimizeResponse.text();
    console.log('Shortimize raw response:', { 
      status: shortimizeResponse.status, 
      statusText: shortimizeResponse.statusText,
      responseLength: responseText.length,
      responseText: responseText.substring(0, 500) // Log first 500 chars
    });

    let shortimizeResult: { error?: string; message?: string; videoId?: string; id?: string; directUrl?: string } = {};
    
    if (responseText) {
      try {
        shortimizeResult = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Shortimize response:', responseText);
        shortimizeResult = { error: 'Invalid JSON response' };
      }
    } else {
      console.log('Shortimize returned empty response body');
    }

    console.log('Shortimize parsed result:', shortimizeResult);

    if (!shortimizeResponse.ok) {
      // Check if it's a duplicate video error (already tracked)
      if (shortimizeResult.error?.includes('already') || shortimizeResult.message?.includes('already')) {
        console.log('Video already tracked on Shortimize');
        return new Response(
          JSON.stringify({ 
            success: true, 
            alreadyTracked: true, 
            message: 'Video is already being tracked on Shortimize' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('Shortimize API error:', shortimizeResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Shortimize API error', 
          details: shortimizeResult 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the Shortimize video ID in the submission record
    const shortimizeVideoId = shortimizeResult.videoId || shortimizeResult.id;
    
    if (shortimizeVideoId && submissionId) {
      // Update the unified video_submissions table only
      const { error: updateError } = await supabase
        .from('video_submissions')
        .update({ shortimize_video_id: shortimizeVideoId })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Error updating video_submissions:', updateError);
      } else {
        console.log('Stored Shortimize video ID:', shortimizeVideoId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId: shortimizeVideoId,
        directUrl: shortimizeResult.directUrl,
        collectionName: finalCollectionName,
        message: 'Video successfully tracked on Shortimize'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in track-shortimize-video:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
