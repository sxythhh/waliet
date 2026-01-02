import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";

interface PushMessageRequest {
  ticket_message_id: string;
}

// Send message to Discord channel
async function sendDiscordMessage(channelId: string, content: string | object) {
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
  if (!botToken) throw new Error("DISCORD_BOT_TOKEN not set");

  const body = typeof content === "string" ? { content } : content;

  const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Discord API error: ${response.status} - ${error}`);
    throw new Error(`Discord API error: ${response.status}`);
  }

  return response.json();
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Verify authorization - only service role can call this
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (authHeader !== `Bearer ${expectedKey}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: PushMessageRequest = await req.json();
    const { ticket_message_id } = body;

    if (!ticket_message_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: ticket_message_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the message with ticket and sender info
    const { data: message, error: messageError } = await supabase
      .from("ticket_messages")
      .select(`
        id,
        ticket_id,
        sender_id,
        sender_type,
        content,
        is_internal,
        discord_synced,
        created_at,
        profiles:sender_id (username, full_name)
      `)
      .eq("id", ticket_message_id)
      .single();

    if (messageError || !message) {
      console.error("Error fetching message:", messageError);
      return new Response(
        JSON.stringify({ error: "Message not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip internal notes
    if (message.is_internal) {
      return new Response(
        JSON.stringify({ success: true, message: "Skipping internal note" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already synced from Discord (prevent echo)
    if (message.discord_synced) {
      return new Response(
        JSON.stringify({ success: true, message: "Skipping Discord-sourced message" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this message already has a sync record
    const { data: existingSync } = await supabase
      .from("discord_ticket_messages")
      .select("id")
      .eq("ticket_message_id", ticket_message_id)
      .single();

    if (existingSync) {
      return new Response(
        JSON.stringify({ success: true, message: "Already synced" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get linked Discord channel
    const { data: ticketChannel, error: channelError } = await supabase
      .from("discord_ticket_channels")
      .select("channel_id, ticket_id")
      .eq("ticket_id", message.ticket_id)
      .is("closed_at", null)
      .single();

    if (channelError || !ticketChannel) {
      console.log(`No active Discord channel for ticket ${message.ticket_id}`);
      return new Response(
        JSON.stringify({ success: true, message: "No Discord channel linked" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine sender name
    const senderName = message.sender_type === "admin"
      ? `Support (${message.profiles?.full_name || message.profiles?.username || "Staff"})`
      : message.profiles?.full_name || message.profiles?.username || "User";

    // Format the message for Discord
    const formattedContent = `**${senderName}:** ${message.content}`;

    // Truncate if too long (Discord limit is 2000 chars)
    const truncatedContent = formattedContent.length > 1900
      ? formattedContent.substring(0, 1900) + "... (message truncated)"
      : formattedContent;

    // Send to Discord
    const discordMessage = await sendDiscordMessage(ticketChannel.channel_id, truncatedContent);

    // Create sync record
    const { error: syncError } = await supabase
      .from("discord_ticket_messages")
      .insert({
        ticket_id: message.ticket_id,
        ticket_message_id: ticket_message_id,
        discord_message_id: discordMessage.id,
        channel_id: ticketChannel.channel_id,
        source: "web",
      });

    if (syncError) {
      console.error("Error creating sync record:", syncError);
      // Message was sent but sync record failed - log but don't fail
    }

    // Mark the message as synced
    await supabase
      .from("ticket_messages")
      .update({ discord_synced: true })
      .eq("id", ticket_message_id);

    console.log(`Pushed message ${ticket_message_id} to Discord channel ${ticketChannel.channel_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        discord_message_id: discordMessage.id,
        channel_id: ticketChannel.channel_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error pushing message:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
