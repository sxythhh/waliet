import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetRolesRequest {
  guildId: string;
  brandId: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  hoist: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guildId, brandId } = await req.json() as GetRolesRequest;

    if (!guildId) {
      throw new Error('guildId is required');
    }

    console.log('Fetching roles for guild:', guildId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

    // Verify the brand has this guild connected
    if (brandId) {
      const { data: brand, error: brandError } = await supabaseClient
        .from('brands')
        .select('discord_guild_id')
        .eq('id', brandId)
        .single();

      if (brandError || brand?.discord_guild_id !== guildId) {
        throw new Error('Guild is not connected to this brand');
      }
    }

    // Fetch roles from Discord API
    const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text();
      console.error('Failed to fetch roles:', errorText);
      throw new Error('Failed to fetch roles from Discord. Make sure the bot is in the server.');
    }

    const roles: DiscordRole[] = await rolesResponse.json();

    // Get bot's own role to determine position
    const botMemberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${Deno.env.get('DISCORD_CLIENT_ID')}`, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    let botHighestPosition = 0;
    if (botMemberResponse.ok) {
      const botMember = await botMemberResponse.json();
      // Find the highest position among bot's roles
      if (botMember.roles && botMember.roles.length > 0) {
        botHighestPosition = Math.max(
          ...roles
            .filter(r => botMember.roles.includes(r.id))
            .map(r => r.position)
        );
      }
    }

    // Filter and format roles:
    // - Exclude @everyone role (position 0 or name @everyone)
    // - Exclude managed roles (bot roles, integration roles)
    // - Sort by position descending (highest first)
    const filteredRoles = roles
      .filter(role => {
        // Exclude @everyone
        if (role.name === '@everyone') return false;
        // Exclude managed roles (bot roles, boosters, etc.)
        if (role.managed) return false;
        return true;
      })
      .sort((a, b) => b.position - a.position)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        canAssign: role.position < botHighestPosition, // Bot can only assign roles below its highest role
      }));

    console.log(`Found ${filteredRoles.length} assignable roles`);

    return new Response(
      JSON.stringify({
        success: true,
        roles: filteredRoles,
        botHighestPosition,
        totalRoles: filteredRoles.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in get-discord-guild-roles function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
