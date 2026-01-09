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
    const { userId, message, embedTitle, embedDescription, embedColor } = await req.json();

    if (!userId || !message) {
      throw new Error('Missing required fields: userId and message');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user's Discord ID from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('discord_id, discord_username')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (!profile?.discord_id) {
      throw new Error('User has not linked their Discord account');
    }

    const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!DISCORD_BOT_TOKEN) {
      throw new Error('DISCORD_BOT_TOKEN is not set');
    }

    console.log(`Sending DM to Discord user: ${profile.discord_username} (${profile.discord_id})`);

    // Step 1: Create DM channel with the user
    const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: profile.discord_id,
      }),
    });

    if (!dmChannelResponse.ok) {
      const errorData = await dmChannelResponse.text();
      console.error('Discord DM channel creation failed:', errorData);
      throw new Error(`Failed to create DM channel: ${dmChannelResponse.status}`);
    }

    const dmChannel = await dmChannelResponse.json();
    console.log(`DM channel created: ${dmChannel.id}`);

    // Step 2: Send message to the DM channel
    const messagePayload: any = {
      content: message,
    };

    // Add embed if provided
    if (embedTitle || embedDescription) {
      messagePayload.embeds = [{
        title: embedTitle,
        description: embedDescription,
        color: embedColor || 0x5865F2, // Discord Blurple by default
      }];
    }

    const sendMessageResponse = await fetch(
      `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    if (!sendMessageResponse.ok) {
      const errorData = await sendMessageResponse.text();
      console.error('Discord message send failed:', errorData);
      throw new Error(`Failed to send message: ${sendMessageResponse.status}`);
    }

    const sentMessage = await sendMessageResponse.json();
    console.log(`Message sent successfully: ${sentMessage.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Discord DM sent successfully',
        messageId: sentMessage.id,
        channelId: dmChannel.id,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error sending Discord DM:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
