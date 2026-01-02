import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

// Discord interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
};

// Discord response types
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
};

// Discord embed colors
const Colors = {
  PRIMARY: 0x5865F2,    // Discord Blurple
  SUCCESS: 0x57F287,    // Green
  WARNING: 0xFEE75C,    // Yellow
  ERROR: 0xED4245,      // Red
  INFO: 0x5865F2,       // Blurple
};

function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array();
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

// Verify Discord signature using tweetnacl
async function verifyDiscordSignature(
  request: Request,
  publicKey: string
): Promise<{ valid: boolean; body: string }> {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const body = await request.text();

  console.log("Verifying signature...");
  console.log("Has signature header:", !!signature);
  console.log("Has timestamp header:", !!timestamp);
  console.log("Public key length:", publicKey?.length);

  if (!signature || !timestamp) {
    console.log("Missing signature or timestamp headers");
    return { valid: false, body };
  }

  try {
    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + body),
      hexToUint8Array(signature),
      hexToUint8Array(publicKey)
    );

    console.log("Signature valid:", isValid);
    return { valid: isValid, body };
  } catch (error) {
    console.error("Signature verification error:", error);
    return { valid: false, body };
  }
}

// Response helpers
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function embedResponse(embed: any, ephemeral = false) {
  return jsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [embed],
      flags: ephemeral ? 64 : 0, // 64 = ephemeral
    },
  });
}

function textResponse(content: string, ephemeral = false) {
  return jsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: ephemeral ? 64 : 0,
    },
  });
}

function modalResponse(customId: string, title: string, components: any[]) {
  return jsonResponse({
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: customId,
      title,
      components,
    },
  });
}

// Get linked user from Discord ID
async function getLinkedUser(supabase: any, discordId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, wallet_balance, discord_id, discord_username")
    .eq("discord_id", discordId)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

// Command Handlers
async function handleBalanceCommand(supabase: any, discordId: string) {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    return embedResponse({
      title: "Account Not Linked",
      description: "You haven't linked your Virality account yet.\n\nUse `/link` to connect your account.",
      color: Colors.WARNING,
    }, true);
  }

  const balance = user.wallet_balance || 0;

  return embedResponse({
    title: "Your Balance",
    description: `**$${balance.toFixed(2)}**`,
    color: Colors.SUCCESS,
    footer: { text: `@${user.username || user.display_name}` },
  }, true);
}

async function handleCampaignsCommand(supabase: any, discordId: string) {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    return embedResponse({
      title: "Account Not Linked",
      description: "You haven't linked your Virality account yet.\n\nUse `/link` to connect your account.",
      color: Colors.WARNING,
    }, true);
  }

  // Get active campaigns the user is part of
  const { data: memberships, error } = await supabase
    .from("campaign_members")
    .select(`
      campaign_id,
      status,
      campaigns (
        id,
        title,
        status,
        payout_type,
        payout_amount
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(10);

  if (error) {
    console.error("Error fetching campaigns:", error);
    return embedResponse({
      title: "Error",
      description: "Failed to fetch your campaigns. Please try again.",
      color: Colors.ERROR,
    }, true);
  }

  if (!memberships || memberships.length === 0) {
    return embedResponse({
      title: "Your Campaigns",
      description: "You're not currently part of any active campaigns.\n\nVisit [virality.gg](https://virality.gg) to discover campaigns!",
      color: Colors.INFO,
    }, true);
  }

  const campaignList = memberships
    .filter((m: any) => m.campaigns)
    .map((m: any) => {
      const c = m.campaigns;
      const payout = c.payout_amount ? `$${c.payout_amount}` : "Variable";
      return `**${c.title}**\nPayout: ${payout} • Status: ${c.status}`;
    })
    .join("\n\n");

  return embedResponse({
    title: "Your Active Campaigns",
    description: campaignList || "No active campaigns found.",
    color: Colors.PRIMARY,
    footer: { text: `${memberships.length} campaign(s)` },
  }, true);
}

async function handleStatsCommand(supabase: any, discordId: string) {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    return embedResponse({
      title: "Account Not Linked",
      description: "You haven't linked your Virality account yet.\n\nUse `/link` to connect your account.",
      color: Colors.WARNING,
    }, true);
  }

  // Get user stats
  const [submissionsResult, earningsResult, campaignsResult] = await Promise.all([
    supabase
      .from("campaign_submissions")
      .select("id, status")
      .eq("user_id", user.id),
    supabase
      .from("wallet_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "earning"),
    supabase
      .from("campaign_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const submissions = submissionsResult.data || [];
  const earnings = earningsResult.data || [];
  const campaigns = campaignsResult.data || [];

  const totalSubmissions = submissions.length;
  const approvedSubmissions = submissions.filter((s: any) => s.status === "approved").length;
  const totalEarnings = earnings.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const activeCampaigns = campaigns.length;

  return embedResponse({
    title: "Your Stats",
    fields: [
      { name: "Total Earnings", value: `$${totalEarnings.toFixed(2)}`, inline: true },
      { name: "Current Balance", value: `$${(user.wallet_balance || 0).toFixed(2)}`, inline: true },
      { name: "Active Campaigns", value: `${activeCampaigns}`, inline: true },
      { name: "Total Submissions", value: `${totalSubmissions}`, inline: true },
      { name: "Approved", value: `${approvedSubmissions}`, inline: true },
      { name: "Approval Rate", value: totalSubmissions > 0 ? `${((approvedSubmissions / totalSubmissions) * 100).toFixed(0)}%` : "N/A", inline: true },
    ],
    color: Colors.PRIMARY,
    footer: { text: `@${user.username || user.display_name}` },
  }, true);
}

async function handleLinkCommand(discordId: string) {
  const baseUrl = Deno.env.get("SITE_URL") || "https://virality.gg";

  return embedResponse({
    title: "Link Your Account",
    description: `To link your Virality account with Discord:\n\n1. Go to [virality.gg/dashboard](${baseUrl}/dashboard)\n2. Click on your profile settings\n3. Connect your Discord account\n\nOnce linked, you'll be able to use all bot commands!`,
    color: Colors.PRIMARY,
  }, true);
}

async function handleLeaderboardCommand(supabase: any) {
  // Get top earners
  const { data: topEarners, error } = await supabase
    .from("profiles")
    .select("username, display_name, wallet_balance")
    .order("wallet_balance", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return embedResponse({
      title: "Error",
      description: "Failed to fetch leaderboard. Please try again.",
      color: Colors.ERROR,
    }, true);
  }

  if (!topEarners || topEarners.length === 0) {
    return embedResponse({
      title: "Leaderboard",
      description: "No data available yet.",
      color: Colors.INFO,
    });
  }

  const leaderboardText = topEarners
    .map((user: any, index: number) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
      const name = user.display_name || user.username || "Anonymous";
      return `${medal} **${name}** - $${(user.wallet_balance || 0).toFixed(2)}`;
    })
    .join("\n");

  return embedResponse({
    title: "Top Creators Leaderboard",
    description: leaderboardText,
    color: Colors.PRIMARY,
    footer: { text: "Based on current balance" },
  });
}

async function handleSubmitCommand(supabase: any, discordId: string) {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    return embedResponse({
      title: "Account Not Linked",
      description: "You haven't linked your Virality account yet.\n\nUse `/link` to connect your account.",
      color: Colors.WARNING,
    }, true);
  }

  // Get user's active campaigns for the modal
  const { data: memberships } = await supabase
    .from("campaign_members")
    .select(`
      campaign_id,
      campaigns (id, title, status)
    `)
    .eq("user_id", user.id)
    .eq("status", "active");

  const activeCampaigns = (memberships || [])
    .filter((m: any) => m.campaigns?.status === "active")
    .map((m: any) => m.campaigns);

  if (activeCampaigns.length === 0) {
    return embedResponse({
      title: "No Active Campaigns",
      description: "You're not currently part of any active campaigns.\n\nJoin a campaign first at [virality.gg](https://virality.gg)",
      color: Colors.WARNING,
    }, true);
  }

  // Return modal for video submission
  return modalResponse("submit_video_modal", "Submit Video", [
    {
      type: 1, // Action Row
      components: [{
        type: 4, // Text Input
        custom_id: "video_url",
        label: "Video URL",
        style: 1, // Short
        placeholder: "https://tiktok.com/@username/video/...",
        required: true,
      }],
    },
    {
      type: 1,
      components: [{
        type: 4,
        custom_id: "campaign_id",
        label: "Campaign ID",
        style: 1,
        placeholder: activeCampaigns[0]?.id || "Enter campaign ID",
        required: true,
        value: activeCampaigns.length === 1 ? activeCampaigns[0].id : "",
      }],
    },
    {
      type: 1,
      components: [{
        type: 4,
        custom_id: "notes",
        label: "Notes (Optional)",
        style: 2, // Paragraph
        placeholder: "Any additional notes for the brand...",
        required: false,
      }],
    },
  ]);
}

async function handleTicketCommand(supabase: any, discordId: string, options: any[]) {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    return embedResponse({
      title: "Account Not Linked",
      description: "You haven't linked your Virality account yet.\n\nUse `/link` to connect your account.",
      color: Colors.WARNING,
    }, true);
  }

  const subject = options?.find((o: any) => o.name === "subject")?.value || "Support Request";
  const description = options?.find((o: any) => o.name === "description")?.value || "";

  const message = `**Subject:** ${subject}\n\n${description}`;

  // Create feedback submission (used as support ticket)
  const { data: ticket, error } = await supabase
    .from("feedback_submissions")
    .insert({
      user_id: user.id,
      message,
      type: "support",
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating ticket:", error);
    return embedResponse({
      title: "Error",
      description: "Failed to create support ticket. Please try again or contact support directly.",
      color: Colors.ERROR,
    }, true);
  }

  return embedResponse({
    title: "Ticket Created",
    description: `Your support request has been submitted.\n\n**Ticket ID:** ${ticket.id.slice(0, 8)}\n**Subject:** ${subject}\n\nOur team will respond as soon as possible.`,
    color: Colors.SUCCESS,
  }, true);
}

// Detect platform from URL
function detectPlatform(url: string): string {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes("tiktok.com")) return "tiktok";
  if (lowercaseUrl.includes("instagram.com")) return "instagram";
  if (lowercaseUrl.includes("youtube.com") || lowercaseUrl.includes("youtu.be")) return "youtube";
  if (lowercaseUrl.includes("twitter.com") || lowercaseUrl.includes("x.com")) return "twitter";
  return "other";
}

// Handle modal submissions
async function handleModalSubmit(supabase: any, interaction: any) {
  const customId = interaction.data.custom_id;
  const discordId = interaction.member?.user?.id || interaction.user?.id;

  if (customId === "submit_video_modal") {
    const user = await getLinkedUser(supabase, discordId);
    if (!user) {
      return textResponse("Your account is not linked. Use `/link` first.", true);
    }

    const components = interaction.data.components;
    const contentUrl = components[0]?.components[0]?.value;
    const campaignId = components[1]?.components[0]?.value;

    if (!contentUrl || !campaignId) {
      return textResponse("Missing required fields. Please try again.", true);
    }

    // Verify user is member of this campaign
    const { data: membership } = await supabase
      .from("campaign_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("campaign_id", campaignId)
      .eq("status", "active")
      .single();

    if (!membership) {
      return embedResponse({
        title: "Not a Member",
        description: "You're not a member of this campaign.",
        color: Colors.ERROR,
      }, true);
    }

    const platform = detectPlatform(contentUrl);

    // Create submission
    const { data: submission, error } = await supabase
      .from("campaign_submissions")
      .insert({
        creator_id: user.id,
        campaign_id: campaignId,
        content_url: contentUrl,
        platform,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating submission:", error);
      return embedResponse({
        title: "Error",
        description: "Failed to submit video. Please try again.",
        color: Colors.ERROR,
      }, true);
    }

    return embedResponse({
      title: "Video Submitted!",
      description: `Your video has been submitted for review.\n\n**Video:** ${contentUrl}\n**Platform:** ${platform}\n**Submission ID:** ${submission.id.slice(0, 8)}`,
      color: Colors.SUCCESS,
    }, true);
  }

  return textResponse("Unknown modal submission.", true);
}

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Signature-Ed25519, X-Signature-Timestamp",
      },
    });
  }

  const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY");

  if (!DISCORD_PUBLIC_KEY) {
    console.error("DISCORD_PUBLIC_KEY is not set in environment variables");
    return jsonResponse({ error: "Server configuration error - missing public key" }, 500);
  }

  console.log("Received Discord interaction request");

  // Verify Discord signature
  const { valid, body } = await verifyDiscordSignature(req, DISCORD_PUBLIC_KEY);

  if (!valid) {
    console.error("Invalid Discord signature - verification failed");
    return jsonResponse({ error: "Invalid request signature" }, 401);
  }

  console.log("Signature verified successfully");

  const interaction = JSON.parse(body);
  console.log("Interaction type:", interaction.type);

  // Handle PING (Discord verification) - this MUST be fast and simple
  if (interaction.type === InteractionType.PING) {
    console.log("Responding to PING with PONG");
    return jsonResponse({ type: InteractionResponseType.PONG });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const discordId = interaction.member?.user?.id || interaction.user?.id;

  // Handle slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = interaction.data;

    console.log(`Handling command: /${name} from user: ${discordId}`);

    switch (name) {
      case "balance":
        return handleBalanceCommand(supabase, discordId);

      case "campaigns":
        return handleCampaignsCommand(supabase, discordId);

      case "stats":
        return handleStatsCommand(supabase, discordId);

      case "link":
        return handleLinkCommand(discordId);

      case "leaderboard":
        return handleLeaderboardCommand(supabase);

      case "submit":
        return handleSubmitCommand(supabase, discordId);

      case "ticket":
        return handleTicketCommand(supabase, discordId, options);

      default:
        return textResponse(`Unknown command: ${name}`, true);
    }
  }

  // Handle modal submissions
  if (interaction.type === InteractionType.MODAL_SUBMIT) {
    return handleModalSubmit(supabase, interaction);
  }

  // Handle button/component interactions (for future use)
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    return textResponse("Button interactions coming soon!", true);
  }

  return jsonResponse({ error: "Unknown interaction type" }, 400);
});
