import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
      // Remove tokens from secure storage using RPC
      const { error: tokenError } = await supabaseClient.rpc('delete_discord_tokens', {
        p_user_id: userId
      });

      if (tokenError) {
        console.error('Failed to delete discord tokens:', tokenError);
      }

      // Clear Discord profile fields (except tokens which are now in separate table)
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          discord_id: null,
          discord_username: null,
          discord_discriminator: null,
          discord_avatar: null,
          discord_email: null,
          discord_connected_at: null,
          // Legacy fields - set to null for cleanup
          discord_access_token: null,
          discord_refresh_token: null,
          discord_token_expires_at: null
        })
        .eq('id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Discord account disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

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

    // Store encrypted tokens in secure table using RPC
    const { error: tokenStoreError } = await supabaseClient.rpc('upsert_discord_tokens', {
      p_user_id: userId,
      p_discord_id: discordUser.id,
      p_access_token: access_token,
      p_refresh_token: refresh_token,
      p_token_expires_at: expiresAt
    });

    if (tokenStoreError) {
      console.error('Failed to store encrypted tokens:', tokenStoreError);
      throw new Error('Failed to store tokens securely');
    }

    // Update profile with Discord data (without tokens)
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
        discord_connected_at: new Date().toISOString(),
        // Clear legacy token fields from profiles table
        discord_access_token: null,
        discord_refresh_token: null,
        discord_token_expires_at: null
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      throw updateError;
    }

    // Log successful token storage to audit log
    await supabaseClient
      .from('security_audit_log')
      .insert({
        user_id: userId,
        action: 'STORE_DISCORD_TOKENS',
        table_name: 'discord_tokens',
        new_data: {
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          stored_at: new Date().toISOString()
        }
      });

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
