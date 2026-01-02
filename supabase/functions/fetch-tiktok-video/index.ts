import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TikTokVideoRequest {
  videoUrl: string;
}

// Extract video ID from TikTok URL
function extractTikTokVideoId(url: string): string | null {
  try {
    // Handle various TikTok URL formats
    // https://www.tiktok.com/@username/video/7306132438047116586
    // https://www.tiktok.com/@username/photo/7579016669914336523
    // https://vm.tiktok.com/ABC123/
    // https://www.tiktok.com/t/ABC123/
    
    // Match both /video/ and /photo/ URLs
    const videoMatch = url.match(/\/(video|photo)\/(\d+)/);
    if (videoMatch) {
      return videoMatch[2];
    }
    
    // For shortened URLs, we'd need to follow redirects - return null for now
    return null;
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl }: TikTokVideoRequest = await req.json();

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's a TikTok URL
    if (!videoUrl.includes('tiktok.com')) {
      return new Response(
        JSON.stringify({ error: 'Only TikTok URLs are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoId = extractTikTokVideoId(videoUrl);
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Could not extract video ID from URL. Please use a direct TikTok video URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching TikTok video details for ID:', videoId);

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call TikTok API
    const apiUrl = `https://tiktok-api23.p.rapidapi.com/api/post/detail?videoId=${videoId}`;
    
    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    });

    if (!apiResponse.ok) {
      console.error('TikTok API error:', apiResponse.status, await apiResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video details from TikTok' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await apiResponse.json();
    
    if (data.statusCode !== 0 || !data.itemInfo?.itemStruct) {
      console.error('TikTok API returned error:', data);
      return new Response(
        JSON.stringify({ error: 'Video not found or unavailable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const item = data.itemInfo.itemStruct;
    const author = item.author;
    const stats = item.statsV2 || item.stats;
    const video = item.video;

    // Parse the upload date from createTime (Unix timestamp)
    const uploadDate = item.createTime 
      ? new Date(parseInt(item.createTime) * 1000).toISOString()
      : null;

    // Extract video playback URL (watermark-free when available)
    // Priority: downloadAddr (no watermark) > playAddr > bitrateInfo
    let videoPlaybackUrl: string | null = null;
    if (video?.downloadAddr) {
      videoPlaybackUrl = video.downloadAddr;
    } else if (video?.playAddr) {
      videoPlaybackUrl = video.playAddr;
    } else if (video?.bitrateInfo?.[0]?.PlayAddr?.UrlList?.[0]) {
      videoPlaybackUrl = video.bitrateInfo[0].PlayAddr.UrlList[0];
    }

    // Extract the relevant data
    const videoDetails = {
      videoId: item.id,
      description: item.desc || '',
      coverUrl: video?.cover || video?.originCover || null,
      videoUrl: videoPlaybackUrl,
      authorUsername: author?.uniqueId || null,
      authorNickname: author?.nickname || null,
      authorAvatar: author?.avatarMedium || author?.avatarThumb || null,
      authorVerified: author?.verified || false,
      uploadDate: uploadDate,
      views: parseInt(stats?.playCount) || 0,
      likes: parseInt(stats?.diggCount) || 0,
      comments: parseInt(stats?.commentCount) || 0,
      shares: parseInt(stats?.shareCount) || 0,
      duration: video?.duration || null,
    };

    console.log('Successfully fetched video details:', videoDetails.videoId);

    return new Response(
      JSON.stringify({ success: true, data: videoDetails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fetch-tiktok-video:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
