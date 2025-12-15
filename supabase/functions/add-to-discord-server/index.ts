import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddToServerRequest {
  userId: string;
  guildId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, guildId } = await req.json() as AddToServerRequest;

    if (!userId || !guildId) {
      throw new Error('userId and guildId are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user's Discord tokens from secure storage using RPC
    const { data: tokenData, error: tokenError } = await supabaseClient.rpc('get_discord_tokens', {
      p_user_id: userId
    });

    if (tokenError) {
      console.error('Failed to fetch discord tokens:', tokenError);
      throw new Error('Failed to retrieve Discord tokens');
    }

    const tokens = tokenData?.[0];

    if (!tokens?.discord_id || !tokens?.access_token) {
      throw new Error('User has not connected their Discord account');
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokens.access_token;
    const tokenExpiry = new Date(tokens.token_expires_at);
    const now = new Date();

    if (tokenExpiry <= now && tokens.refresh_token) {
      console.log('Token expired, refreshing...');
      
      const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID');
      const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET');

      const refreshResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID!,
          client_secret: DISCORD_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
        }),
      });

      if (refreshResponse.ok) {
        const { access_token, refresh_token, expires_in } = await refreshResponse.json();
        accessToken = access_token;
        const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

        // Update tokens in secure storage using RPC
        const { error: updateError } = await supabaseClient.rpc('upsert_discord_tokens', {
          p_user_id: userId,
          p_discord_id: tokens.discord_id,
          p_access_token: access_token,
          p_refresh_token: refresh_token,
          p_token_expires_at: expiresAt
        });

        if (updateError) {
          console.error('Failed to update tokens:', updateError);
        }
      } else {
        throw new Error('Failed to refresh Discord token');
      }
    }

    const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

    // Add user to Discord server using Discord API
    const addMemberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${tokens.discord_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      }
    );

    // Get username from profiles for logging
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('discord_username')
      .eq('id', userId)
      .single();

    if (!addMemberResponse.ok) {
      const errorText = await addMemberResponse.text();
      console.error('Discord API error:', errorText);
      
      // If user is already in server, consider it a success
      if (addMemberResponse.status === 204 || errorText.includes('already a member')) {
        console.log('User already in server');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User is already in the Discord server',
            alreadyMember: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Failed to add user to Discord server: ${errorText}`);
    }

    console.log(`Successfully added user ${profile?.discord_username} to guild ${guildId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User added to Discord server successfully',
        discordUsername: profile?.discord_username
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in add-to-discord-server function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
