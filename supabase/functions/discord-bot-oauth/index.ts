import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BotOAuthRequest {
  code?: string;
  guildId?: string;
  brandId: string;
  action: 'connect' | 'disconnect' | 'get_oauth_url';
  redirectUri?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, guildId, brandId, action, redirectUri } = await req.json() as BotOAuthRequest;

    console.log('Discord Bot OAuth request:', { action, brandId, hasCode: !!code, guildId });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID');
    const SITE_URL = Deno.env.get('SITE_URL') || 'https://virality.gg';

    // Action: Get OAuth URL for adding bot to server
    if (action === 'get_oauth_url') {
      // Bot permissions: Administrator (8) - as requested
      const permissions = '8';

      // Scopes needed: bot (to add the bot) and applications.commands (for slash commands)
      const scopes = 'bot applications.commands';

      const oauthUrl = `https://discord.com/api/oauth2/authorize?` +
        `client_id=${DISCORD_CLIENT_ID}` +
        `&permissions=${permissions}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri || `${SITE_URL}/discord/bot-callback`)}` +
        `&state=${encodeURIComponent(JSON.stringify({ brandId }))}`;

      return new Response(
        JSON.stringify({ success: true, oauthUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Disconnect Discord server from brand
    if (action === 'disconnect') {
      if (!brandId) {
        throw new Error('brandId is required for disconnect');
      }

      // Check if user has access to this brand (basic auth check)
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Authorization required');
      }

      // Clear Discord fields from brand
      const { error } = await supabaseClient
        .from('brands')
        .update({
          discord_guild_id: null,
          discord_guild_name: null,
          discord_guild_icon: null,
          discord_bot_added_at: null,
        })
        .eq('id', brandId);

      if (error) {
        console.error('Failed to disconnect Discord:', error);
        throw error;
      }

      console.log('Discord server disconnected from brand:', brandId);

      return new Response(
        JSON.stringify({ success: true, message: 'Discord server disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Connect (handle OAuth callback)
    if (action === 'connect') {
      // code is optional - only present when OAuth2 Code Grant is enabled
      if (!guildId || !brandId) {
        throw new Error('guildId and brandId are required for connect');
      }

      const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET');
      const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

      // The code from bot OAuth is different - it's just authorization confirmation
      // We don't need to exchange it for tokens since we use the bot token
      // The guildId is passed from the OAuth callback

      // Verify the bot is actually in the guild by fetching guild info
      const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        },
      });

      if (!guildResponse.ok) {
        const errorText = await guildResponse.text();
        console.error('Failed to fetch guild:', errorText);
        throw new Error('Bot is not in the specified server. Please try adding the bot again.');
      }

      const guild = await guildResponse.json();
      console.log('Guild fetched:', guild.name);

      // Build icon URL if available
      const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : null;

      // Update brand with Discord server info
      const { error: updateError } = await supabaseClient
        .from('brands')
        .update({
          discord_guild_id: guild.id,
          discord_guild_name: guild.name,
          discord_guild_icon: iconUrl,
          discord_bot_added_at: new Date().toISOString(),
        })
        .eq('id', brandId);

      if (updateError) {
        console.error('Failed to update brand:', updateError);
        throw updateError;
      }

      console.log('Brand updated with Discord server:', { brandId, guildId: guild.id, guildName: guild.name });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Discord server connected successfully',
          guild: {
            id: guild.id,
            name: guild.name,
            icon: iconUrl,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in discord-bot-oauth function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
