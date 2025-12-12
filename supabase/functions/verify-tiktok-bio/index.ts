import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, verificationCode } = await req.json();

    if (!username || !verificationCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username and verification code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying TikTok bio for @${username} with code ${verificationCode}`);

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
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch TikTok profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.statusCode !== 0 || !data.userInfo?.user) {
      console.error('User not found or invalid response:', data);
      return new Response(
        JSON.stringify({ success: false, error: 'TikTok user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bio = data.userInfo.user.signature || '';
    const verified = bio.includes(verificationCode);

    console.log(`Bio: "${bio}", Code: "${verificationCode}", Verified: ${verified}`);

    return new Response(
      JSON.stringify({
        success: true,
        verified,
        bio,
        user: {
          nickname: data.userInfo.user.nickname,
          avatar: data.userInfo.user.avatarMedium,
          followerCount: data.userInfo.stats?.followerCount || 0,
          isVerified: data.userInfo.user.verified || false,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error verifying TikTok bio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
