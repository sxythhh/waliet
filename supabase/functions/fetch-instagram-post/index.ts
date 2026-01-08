const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramPostRequest {
  postUrl: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postUrl }: InstagramPostRequest = await req.json();

    if (!postUrl) {
      return new Response(
        JSON.stringify({ error: 'Post URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's an Instagram URL
    if (!postUrl.includes('instagram.com')) {
      return new Response(
        JSON.stringify({ error: 'Only Instagram URLs are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Instagram post details for URL:', postUrl);

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Instagram API
    const encodedUrl = encodeURIComponent(postUrl);
    const apiUrl = `https://instagram-looter2.p.rapidapi.com/post?url=${encodedUrl}`;
    
    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-looter2.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    });

    if (!apiResponse.ok) {
      console.error('Instagram API error:', apiResponse.status, await apiResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch post details from Instagram' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await apiResponse.json();
    
    if (!data.status || !data.owner) {
      console.error('Instagram API returned error or no data:', data);
      return new Response(
        JSON.stringify({ error: 'Post not found or unavailable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caption/description
    const caption = data.edge_media_to_caption?.edges?.[0]?.node?.text || '';
    
    // Parse the upload date from created_at (Unix timestamp in caption)
    const createdAtTimestamp = data.edge_media_to_caption?.edges?.[0]?.node?.created_at;
    const uploadDate = createdAtTimestamp 
      ? new Date(parseInt(createdAtTimestamp) * 1000).toISOString()
      : null;

    // Get engagement stats - try multiple possible field names
    const likesCount = data.edge_media_preview_like?.count
      ?? data.like_count
      ?? data.likes?.count
      ?? 0;

    const commentsCount = data.edge_media_to_parent_comment?.count
      ?? data.edge_media_to_comment?.count
      ?? data.comment_count
      ?? 0;

    // Get views for videos/reels - try multiple possible field names
    // Note: Instagram often restricts view counts to post owners only
    const viewsCount = data.video_view_count
      ?? data.video_play_count
      ?? data.play_count
      ?? data.view_count
      ?? null;

    // Extract video playback URL for reels/videos
    let videoPlaybackUrl: string | null = null;
    if (data.is_video) {
      videoPlaybackUrl = data.video_url || null;
    }

    // Log raw data keys for debugging
    console.log('Instagram API raw response keys:', Object.keys(data));
    if (data.is_video) {
      console.log('Video stats from API:', {
        video_view_count: data.video_view_count,
        video_play_count: data.video_play_count,
        play_count: data.play_count
      });
    }

    // Extract the relevant data
    const postDetails = {
      postId: data.id,
      shortcode: data.shortcode,
      description: caption,
      coverUrl: data.thumbnail_src || data.display_url || null,
      videoUrl: videoPlaybackUrl,
      authorUsername: data.owner?.username || null,
      authorFullName: data.owner?.full_name || null,
      authorAvatar: data.owner?.profile_pic_url || null,
      authorVerified: data.owner?.is_verified || false,
      uploadDate: uploadDate,
      isVideo: data.is_video || false,
      views: viewsCount,
      likes: likesCount,
      comments: commentsCount,
      followersCount: data.owner?.edge_followed_by?.count || null,
    };

    console.log('Successfully fetched Instagram post details:', postDetails.shortcode);

    return new Response(
      JSON.stringify({ success: true, data: postDetails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fetch-instagram-post:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
