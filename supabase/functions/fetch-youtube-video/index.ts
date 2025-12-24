import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl } = await req.json();
    
    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching YouTube video details for:', videoUrl);

    // Extract video ID from YouTube URL
    let videoId = '';
    
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = videoUrl.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Could not extract video ID from URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted video ID:', videoId);

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = `https://youtube138.p.rapidapi.com/v2/video-details?video_id=${videoId}&hl=en`;
    
    console.log('Calling YouTube API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'youtube138.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    });

    if (!response.ok) {
      console.error('YouTube API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video details from YouTube API' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('YouTube API response status:', data.status);

    if (data.status !== 'success') {
      return new Response(
        JSON.stringify({ error: 'Video not found or unavailable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the best thumbnail (maxresdefault or fallback)
    const thumbnail = data.videoThumbnails?.find((t: any) => t.quality === 'maxresdefault') 
      || data.videoThumbnails?.find((t: any) => t.quality === 'sddefault')
      || data.videoThumbnails?.[0];

    // Get author thumbnail
    const authorThumbnail = data.authorThumbnails?.find((t: any) => t.width >= 100)
      || data.authorThumbnails?.[0];

    // Convert published timestamp to ISO date
    const publishedDate = data.published ? new Date(data.published * 1000).toISOString() : null;

    const videoDetails = {
      title: data.title || '',
      description: data.description || '',
      thumbnail_url: thumbnail?.url || '',
      author_username: data.author || '',
      author_avatar: authorThumbnail?.url || '',
      published_date: publishedDate,
      view_count: data.viewCount || 0,
      like_count: data.likeCount || 0,
      video_id: data.videoId || videoId,
    };

    console.log('Returning video details:', videoDetails.title);

    return new Response(
      JSON.stringify(videoDetails),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fetch-youtube-video:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
