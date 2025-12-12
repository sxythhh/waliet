import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyTikTok(username: string, verificationCode: string, rapidApiKey: string) {
  console.log(`Fetching TikTok profile for: ${username}`);
  
  const response = await fetch(
    `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${encodeURIComponent(username)}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    }
  );

  if (!response.ok) {
    console.error(`TikTok API error: ${response.status}`);
    throw new Error(`TikTok API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('TikTok API response received');

  if (data.statusCode !== 0 || !data.userInfo?.user) {
    throw new Error('User not found on TikTok');
  }

  const user = data.userInfo.user;
  const bio = user.signature || '';
  const verified = bio.includes(verificationCode);

  return {
    verified,
    bio,
    user: {
      nickname: user.nickname,
      avatar: user.avatarMedium,
      followerCount: data.userInfo.stats?.followerCount || 0,
      isVerified: user.verified,
    },
  };
}

async function verifyInstagram(username: string, verificationCode: string, rapidApiKey: string) {
  console.log(`Fetching Instagram profile for: ${username}`);
  
  const response = await fetch(
    'https://instagram120.p.rapidapi.com/api/instagram/profile',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'instagram120.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
      body: JSON.stringify({ username }),
    }
  );

  if (!response.ok) {
    console.error(`Instagram API error: ${response.status}`);
    const errorText = await response.text();
    console.error(`Instagram API response: ${errorText}`);
    throw new Error(`Instagram API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('Instagram API response received:', JSON.stringify(data).slice(0, 500));

  // instagram120 wraps profile data under `result` key
  const profile = (data as any).result || (data as any).profile || (data as any).data || data;

  if (!profile || (!profile.username && !profile.id)) {
    throw new Error('User not found on Instagram');
  }

  const bioRaw =
    (profile as any).biography ||
    (profile as any).bio ||
    (profile as any).biography_with_entities?.raw_text ||
    '';

  const bio = typeof bioRaw === 'string' ? bioRaw : String(bioRaw ?? '');
  console.log('Instagram bio candidate:', bio);

  // Normalize to alphanumeric uppercase to avoid hidden characters or formatting issues
  const normalizedBio = bio.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normalizedCode = verificationCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const verified = normalizedBio.includes(normalizedCode);

  return {
    verified,
    bio,
    user: {
      nickname: (profile as any).full_name || (profile as any).name || (profile as any).username,
      avatar:
        (profile as any).profile_pic_url ||
        (profile as any).profile_pic_url_hd ||
        (profile as any).avatar_hd ||
        (profile as any).avatar,
      followerCount:
        (profile as any).follower_count ||
        (profile as any).followers_count ||
        (profile as any).followers ||
        (profile as any).edge_followed_by?.count ||
        0,
      isVerified: (profile as any).is_verified || false,
    },
  };
}

async function verifyYouTube(channelId: string, verificationCode: string, rapidApiKey: string) {
  console.log(`Fetching YouTube channel for: ${channelId}`);
  
  // Extract channel ID from URL if provided
  let cleanChannelId = channelId;
  if (channelId.includes('youtube.com')) {
    // Handle URLs like youtube.com/channel/UCxxx or youtube.com/@handle
    const channelMatch = channelId.match(/channel\/([^\/\?]+)/);
    const handleMatch = channelId.match(/@([^\/\?]+)/);
    if (channelMatch) {
      cleanChannelId = channelMatch[1];
    } else if (handleMatch) {
      cleanChannelId = `@${handleMatch[1]}`;
    }
  }
  
  const response = await fetch(
    `https://youtube138.p.rapidapi.com/v2/channel-details?channel_id=${encodeURIComponent(cleanChannelId)}&hl=en`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'youtube138.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    }
  );

  if (!response.ok) {
    console.error(`YouTube API error: ${response.status}`);
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('YouTube API response received');

  if (data.status !== 'success' || !data.author) {
    throw new Error('YouTube channel not found');
  }

  const bio = data.description || '';
  const verified = bio.includes(verificationCode);

  // Get the largest thumbnail
  const avatar = data.authorThumbnails?.length > 0 
    ? data.authorThumbnails[data.authorThumbnails.length - 1]?.url 
    : null;

  return {
    verified,
    bio,
    user: {
      nickname: data.author,
      avatar,
      followerCount: data.subCount || 0,
      isVerified: false,
      channelId: data.authorId,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, verificationCode, platform = 'tiktok' } = await req.json();

    if (!username || !verificationCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing username or verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    
    if (platform === 'instagram') {
      result = await verifyInstagram(username, verificationCode, rapidApiKey);
    } else if (platform === 'youtube') {
      result = await verifyYouTube(username, verificationCode, rapidApiKey);
    } else {
      result = await verifyTikTok(username, verificationCode, rapidApiKey);
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
