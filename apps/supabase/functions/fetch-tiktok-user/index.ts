const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TikTokUserRequest {
  username: string;  // uniqueId without @
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username }: TikTokUserRequest = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean username (remove @ if present)
    const cleanUsername = username.replace(/^@/, '');

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching user profile for:', cleanUsername);

    const apiUrl = `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${cleanUsername}`;

    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    });

    if (!apiResponse.ok) {
      console.error('TikTok API error:', apiResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile from TikTok' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await apiResponse.json();

    if (!data.userInfo) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = data.userInfo.user;
    const stats = data.userInfo.stats;

    // Calculate authenticity signals
    const followerFollowingRatio = stats.followingCount > 0
      ? stats.followerCount / stats.followingCount
      : stats.followerCount;

    const likesPerFollower = stats.followerCount > 0
      ? stats.heartCount / stats.followerCount
      : 0;

    // Risk flags
    const flags: string[] = [];

    // Following way more than followers (engagement farming)
    if (stats.followingCount > 3000 && followerFollowingRatio < 0.3) {
      flags.push('engagement_farming_pattern');
    }

    // Zero following with significant followers (often bot)
    if (stats.followingCount === 0 && stats.followerCount > 500) {
      flags.push('zero_following');
    }

    // Very low engagement relative to followers
    if (stats.followerCount > 10000 && likesPerFollower < 1) {
      flags.push('low_engagement_ratio');
    }

    // High followers but not verified
    if (stats.followerCount > 100000 && !user.verified) {
      flags.push('high_followers_unverified');
    }

    // Calculate simple authenticity score (higher = more authentic)
    let authenticityScore = 70; // Base score

    if (user.verified) authenticityScore += 15;
    if (followerFollowingRatio > 1 && followerFollowingRatio < 100) authenticityScore += 10;
    if (likesPerFollower > 5) authenticityScore += 5;

    // Deduct for flags
    authenticityScore -= flags.length * 15;
    authenticityScore = Math.max(0, Math.min(100, authenticityScore));

    const profileData = {
      username: user.uniqueId,
      nickname: user.nickname,
      verified: user.verified,
      privateAccount: user.privateAccount,
      avatar: user.avatarMedium || user.avatarThumb,
      bio: user.signature,

      // Stats
      followerCount: stats.followerCount,
      followingCount: stats.followingCount,
      videoCount: stats.videoCount,
      heartCount: stats.heartCount,  // Total likes received

      // Calculated metrics
      followerFollowingRatio: Math.round(followerFollowingRatio * 100) / 100,
      likesPerFollower: Math.round(likesPerFollower * 100) / 100,

      // Authenticity assessment
      authenticityScore,
      flags,
    };

    console.log('Successfully fetched user profile:', cleanUsername);

    return new Response(
      JSON.stringify({ success: true, data: profileData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fetch-tiktok-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
