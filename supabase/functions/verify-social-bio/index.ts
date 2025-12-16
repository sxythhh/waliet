import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to remove verification code from bio
function filterVerificationCode(bio: string, verificationCode: string): string {
  if (!bio || !verificationCode) return bio;
  // Remove the verification code (case-insensitive) and clean up extra whitespace
  const filtered = bio.replace(new RegExp(verificationCode, 'gi'), '').trim();
  // Clean up multiple spaces and trim
  return filtered.replace(/\s+/g, ' ').trim();
}

// Primary TikTok API (tiktok-scraper7)
async function verifyTikTokPrimary(username: string, verificationCode: string, rapidApiKey: string) {
  console.log(`Fetching TikTok profile (primary API) for: ${username}`);
  
  const response = await fetch(
    `https://tiktok-scraper7.p.rapidapi.com/user/info?unique_id=${encodeURIComponent(username)}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    }
  );

  if (!response.ok) {
    console.error(`TikTok primary API error: ${response.status}`);
    throw new Error(`TikTok primary API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('TikTok primary API response received');

  if (data.code !== 0 || !data.data?.user) {
    throw new Error('User not found on TikTok (primary API)');
  }

  const user = data.data.user;
  const bio = user.signature || '';
  const verified = bio.includes(verificationCode);

  const cleanBio = filterVerificationCode(bio, verificationCode);

  return {
    verified,
    bio: cleanBio,
    user: {
      nickname: user.nickname,
      avatar: user.avatarMedium,
      followerCount: data.data.stats?.followerCount || 0,
      isVerified: user.verified,
      region: null, // This API doesn't provide region
    },
  };
}

// Fallback TikTok API (tiktok-api23 with region)
async function verifyTikTokFallback(username: string, verificationCode: string, rapidApiKey: string) {
  console.log(`Fetching TikTok profile (fallback API) for: ${username}`);
  
  const response = await fetch(
    `https://tiktok-api23.p.rapidapi.com/api/user/info-with-region?uniqueId=${encodeURIComponent(username)}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    }
  );

  if (!response.ok) {
    console.error(`TikTok fallback API error: ${response.status}`);
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a minute and try again.');
    }
    throw new Error(`TikTok fallback API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('TikTok fallback API response received');

  if (data.statusCode !== 0 || !data.userInfo?.user) {
    throw new Error('User not found on TikTok');
  }

  const user = data.userInfo.user;
  const bio = user.signature || '';
  const verified = bio.includes(verificationCode);

  const cleanBio = filterVerificationCode(bio, verificationCode);

  return {
    verified,
    bio: cleanBio,
    user: {
      nickname: user.nickname,
      avatar: user.avatarMedium,
      followerCount: data.userInfo.stats?.followerCount || 0,
      isVerified: user.verified,
      region: user.language || null,
    },
  };
}

// Main TikTok verification with fallback
async function verifyTikTok(username: string, verificationCode: string, rapidApiKey: string) {
  try {
    return await verifyTikTokPrimary(username, verificationCode, rapidApiKey);
  } catch (primaryError) {
    console.log('Primary TikTok API failed, trying fallback:', primaryError);
    try {
      return await verifyTikTokFallback(username, verificationCode, rapidApiKey);
    } catch (fallbackError) {
      console.error('Both TikTok APIs failed:', fallbackError);
      throw fallbackError;
    }
  }
}

async function verifyInstagram(username: string, verificationCode: string, rapidApiKey: string) {
  console.log(`Fetching Instagram profile for: ${username}`);
  
  const response = await fetch(
    `https://instagram-looter2.p.rapidapi.com/profile2?username=${encodeURIComponent(username)}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-looter2.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    }
  );

  if (!response.ok) {
    console.error(`Instagram API error: ${response.status}`);
    const errorText = await response.text();
    console.error(`Instagram API response: ${errorText}`);
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a minute and try again.');
    }
    throw new Error(`Instagram API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('Instagram API raw response:', JSON.stringify(data).substring(0, 500));

  // Check for error response or missing data
  if (!data.status || !data.username) {
    console.error('Instagram API returned error or user not found');
    throw new Error('User not found on Instagram');
  }

  const bio = data.biography || '';

  console.log('Instagram bio to check:', bio, '| Code:', verificationCode);

  // Normalize to alphanumeric uppercase to avoid hidden characters or formatting issues
  const normalizedBio = bio.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normalizedCode = verificationCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const verified = normalizedBio.includes(normalizedCode);

  const cleanBio = filterVerificationCode(bio, verificationCode);

  // Use hd_profile_pic_url_info.url for best quality, fallback to profile_pic_url
  const avatarUrl = data.hd_profile_pic_url_info?.url || data.profile_pic_url || null;

  return {
    verified,
    bio: cleanBio,
    user: {
      nickname: data.full_name || data.username || username,
      avatar: avatarUrl,
      followerCount: data.follower_count || 0,
      isVerified: data.is_verified || false,
    },
  };
}

async function verifyYouTube(channelId: string, verificationCode: string, rapidApiKey: string) {
  console.log(`Fetching YouTube channel for: ${channelId}`);
  
  // Extract channel ID or handle from URL if provided
  let cleanChannelId = channelId.trim();
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
  
  // Ensure handles have @ prefix
  if (!cleanChannelId.startsWith('UC') && !cleanChannelId.startsWith('@')) {
    cleanChannelId = `@${cleanChannelId}`;
  }
  
  console.log(`Using channel identifier: ${cleanChannelId}`);
  
  const response = await fetch(
    `https://youtube138.p.rapidapi.com/channel/details/?id=${encodeURIComponent(cleanChannelId)}&hl=en&gl=US`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'youtube138.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`YouTube API error: ${response.status}, body: ${errorText}`);
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a minute and try again.');
    }
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('YouTube API response received:', JSON.stringify(data).substring(0, 500));

  // Handle different response formats
  const channelData = data.meta || data;
  
  if (!channelData || (!channelData.title && !channelData.channelId)) {
    throw new Error('YouTube channel not found');
  }

  const bio = channelData.description || '';
  const verified = bio.toUpperCase().includes(verificationCode.toUpperCase());

  // Get avatar/thumbnail
  const avatar = channelData.thumbnail?.[0]?.url || channelData.avatar?.[0]?.url || null;

  const cleanBio = filterVerificationCode(bio, verificationCode);

  return {
    verified,
    bio: cleanBio,
    user: {
      nickname: channelData.title || channelData.name,
      avatar,
      followerCount: parseInt(channelData.subscriberCount) || 0,
      isVerified: channelData.isVerified || false,
      channelId: channelData.channelId || channelData.externalId,
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
