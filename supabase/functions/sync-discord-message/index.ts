import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncMessageRequest {
  channel_id: string;
  message_id: string;
  content: string;
  author_id: string;
  author_username: string;
  author_discriminator?: string;
  attachments?: Array<{ url: string; filename: string }>;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Verify authorization
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const botSecret = Deno.env.get("DISCORD_BOT_SECRET");

  // Allow either service role key or bot secret
  const isAuthorized = authHeader === `Bearer ${expectedKey}` ||
                       authHeader === `Bearer ${botSecret}`;

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: SyncMessageRequest = await req.json();
    const { channel_id, message_id, content, author_id, author_username, attachments, timestamp } = body;

    if (!channel_id || !message_id || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: channel_id, message_id, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find linked ticket by channel_id
    const { data: ticketChannel, error: channelError } = await supabase
      .from("discord_ticket_channels")
      .select("ticket_id, discord_user_id")
      .eq("channel_id", channel_id)
      .single();

    if (channelError || !ticketChannel) {
      console.log(`Channel ${channel_id} is not a ticket channel`);
      return new Response(
        JSON.stringify({ error: "Not a ticket channel" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if message already synced (prevent duplicates)
    const { data: existingSync } = await supabase
      .from("discord_ticket_messages")
      .select("id")
      .eq("discord_message_id", message_id)
      .single();

    if (existingSync) {
      console.log(`Message ${message_id} already synced`);
      return new Response(
        JSON.stringify({ success: true, message: "Already synced" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get ticket info and try to find linked user
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, user_id")
      .eq("id", ticketChannel.ticket_id)
      .single();

    if (!ticket) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine sender type based on Discord user
    // If the author is the ticket creator, it's a "user" message
    // Otherwise, it's an "admin" message (support staff)
    const isTicketCreator = author_id === ticketChannel.discord_user_id;
    const senderType = isTicketCreator ? "user" : "admin";

    // Try to get the actual user ID if they have linked their account
    let senderId = ticket.user_id;

    if (!isTicketCreator) {
      // Check if the Discord user has a linked Virality account
      const { data: linkedProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("discord_id", author_id)
        .single();

      if (linkedProfile) {
        senderId = linkedProfile.id;
      }
    }

    // Format content with attachments
    let fullContent = content;
    if (attachments && attachments.length > 0) {
      const attachmentLinks = attachments
        .map(a => `[${a.filename}](${a.url})`)
        .join("\n");
      fullContent = content + (content ? "\n\n" : "") + "Attachments:\n" + attachmentLinks;
    }

    // Create ticket message
    const { data: ticketMessage, error: messageError } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketChannel.ticket_id,
        sender_id: senderId,
        sender_type: senderType,
        content: fullContent,
        is_internal: false,
        discord_synced: true,
      })
      .select()
      .single();

    if (messageError) {
      console.error("Error creating ticket message:", messageError);
      return new Response(
        JSON.stringify({ error: "Failed to create message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create sync record
    const { error: syncError } = await supabase
      .from("discord_ticket_messages")
      .insert({
        ticket_id: ticketChannel.ticket_id,
        ticket_message_id: ticketMessage.id,
        discord_message_id: message_id,
        channel_id: channel_id,
        source: "discord",
      });

    if (syncError) {
      console.error("Error creating sync record:", syncError);
      // Message was created but sync record failed - not critical
    }

    // Update ticket status if it was awaiting reply
    await supabase
      .from("support_tickets")
      .update({
        status: isTicketCreator ? "awaiting_reply" : "in_progress",
        updated_at: new Date().toISOString()
      })
      .eq("id", ticketChannel.ticket_id)
      .eq("status", "awaiting_reply");

    console.log(`Synced Discord message ${message_id} to ticket ${ticketChannel.ticket_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        ticket_message_id: ticketMessage.id,
        ticket_id: ticketChannel.ticket_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error syncing message:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
