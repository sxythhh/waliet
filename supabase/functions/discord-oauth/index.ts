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
    const { code, userId, action, redirectUri } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle disconnect action
    if (action === 'disconnect') {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          discord_id: null,
          discord_username: null,
          discord_discriminator: null,
          discord_avatar: null,
          discord_email: null,
          discord_connected_at: null
        })
        .eq('id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Discord account disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle OAuth callback
    if (!code) {
      throw new Error('Authorization code is required');
    }

    const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID');
    const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET');
    const REDIRECT_URI = redirectUri;

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID!,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Discord token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const { access_token } = await tokenResponse.json();

    // Fetch user data from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Discord user data');
    }

    const discordUser = await userResponse.json();

    // Update profile with Discord data
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        discord_discriminator: discordUser.discriminator,
        discord_avatar: discordUser.avatar 
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : null,
        discord_email: discordUser.email,
        discord_connected_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Discord account linked successfully',
        discord: {
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in discord-oauth function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});