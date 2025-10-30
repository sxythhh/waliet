import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const { code, userId, action } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle disconnect action
    if (action === 'disconnect') {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          twitter_id: null,
          twitter_username: null,
          twitter_name: null,
          twitter_avatar: null,
          twitter_connected_at: null
        })
        .eq('id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'X account disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle OAuth callback
    if (!code) {
      throw new Error('Authorization code is required');
    }

    const TWITTER_CLIENT_ID = Deno.env.get('TWITTER_CLIENT_ID');
    const TWITTER_CLIENT_SECRET = Deno.env.get('TWITTER_CLIENT_SECRET');
    const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/x-oauth`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: 'challenge', // In production, use proper PKCE
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('X token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const { access_token } = await tokenResponse.json();

    // Fetch user data from X
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch X user data');
    }

    const { data: twitterUser } = await userResponse.json();

    // Update profile with X data
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        twitter_id: twitterUser.id,
        twitter_username: twitterUser.username,
        twitter_name: twitterUser.name,
        twitter_avatar: twitterUser.profile_image_url,
        twitter_connected_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'X account linked successfully',
        twitter: {
          username: twitterUser.username,
          name: twitterUser.name,
          avatar: twitterUser.profile_image_url
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in x-oauth function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
