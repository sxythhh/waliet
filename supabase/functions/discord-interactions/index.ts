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

// Component types
const ComponentType = {
  ACTION_ROW: 1,
  BUTTON: 2,
  STRING_SELECT: 3,
  TEXT_INPUT: 4,
  USER_SELECT: 5,
  ROLE_SELECT: 6,
  MENTIONABLE_SELECT: 7,
  CHANNEL_SELECT: 8,
};

// Button styles
const ButtonStyle = {
  PRIMARY: 1,    // Blurple
  SECONDARY: 2,  // Grey
  SUCCESS: 3,    // Green
  DANGER: 4,     // Red
  LINK: 5,       // Grey, navigates to URL
};

// Discord embed colors
const Colors = {
  PRIMARY: 0x5865F2,    // Discord Blurple
  SUCCESS: 0x57F287,    // Green
  WARNING: 0xFEE75C,    // Yellow
  ERROR: 0xED4245,      // Red
  INFO: 0x5865F2,       // Blurple
  BRAND: 0x7C3AED,      // Virality Purple
};

// Site URL
const SITE_URL = Deno.env.get("SITE_URL") || "https://virality.gg";

// Discord API base URL
const DISCORD_API = "https://discord.com/api/v10";

// Channel types
const ChannelType = {
  GUILD_TEXT: 0,
  GUILD_CATEGORY: 4,
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

// Create rich embed with Virality branding
function createEmbed(options: {
  title: string;
  description?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  color?: number;
  thumbnail?: string;
  image?: string;
  userInfo?: { username: string; avatar?: string };
  showTimestamp?: boolean;
}) {
  return {
    title: options.title,
    description: options.description,
    fields: options.fields,
    color: options.color || Colors.BRAND,
    thumbnail: options.thumbnail ? { url: options.thumbnail } : undefined,
    image: options.image ? { url: options.image } : undefined,
    author: {
      name: "Virality",
      icon_url: `${SITE_URL}/logo.png`,
      url: SITE_URL,
    },
    footer: {
      text: options.userInfo ? `@${options.userInfo.username}` : "virality.gg",
      icon_url: options.userInfo?.avatar,
    },
    timestamp: options.showTimestamp !== false ? new Date().toISOString() : undefined,
  };
}

// Response with components (buttons, selects)
function componentResponse(
  embed: any,
  components: any[],
  ephemeral = false
) {
  return jsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [embed],
      components,
      flags: ephemeral ? 64 : 0,
    },
  });
}

// Update existing message (for button/select interactions)
function updateResponse(embed: any, components: any[]) {
  return jsonResponse({
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: {
      embeds: [embed],
      components,
    },
  });
}

// Create action row with buttons
function createButtonRow(buttons: Array<{
  label: string;
  style: number;
  customId?: string;
  url?: string;
  emoji?: string;
  disabled?: boolean;
}>) {
  return {
    type: ComponentType.ACTION_ROW,
    components: buttons.map(btn => ({
      type: ComponentType.BUTTON,
      style: btn.style,
      label: btn.label,
      custom_id: btn.customId,
      url: btn.url,
      emoji: btn.emoji ? { name: btn.emoji } : undefined,
      disabled: btn.disabled,
    })),
  };
}

// Create select menu
function createSelectMenu(options: {
  customId: string;
  placeholder: string;
  options: Array<{ label: string; value: string; description?: string; emoji?: string }>;
  minValues?: number;
  maxValues?: number;
}) {
  return {
    type: ComponentType.ACTION_ROW,
    components: [{
      type: ComponentType.STRING_SELECT,
      custom_id: options.customId,
      placeholder: options.placeholder,
      min_values: options.minValues || 1,
      max_values: options.maxValues || 1,
      options: options.options.map(opt => ({
        label: opt.label.substring(0, 100),
        value: opt.value,
        description: opt.description?.substring(0, 100),
        emoji: opt.emoji ? { name: opt.emoji } : undefined,
      })),
    }],
  };
}

// Discord API helpers
async function discordApiRequest(endpoint: string, method: string, body?: any) {
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
  if (!botToken) throw new Error("DISCORD_BOT_TOKEN not set");

  const response = await fetch(`${DISCORD_API}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Discord API error: ${response.status} - ${error}`);
    throw new Error(`Discord API error: ${response.status}`);
  }

  return response.json();
}

// Send a follow-up message to a deferred interaction
async function sendFollowup(applicationId: string, interactionToken: string, content: string, ephemeral = false) {
  const response = await fetch(`${DISCORD_API}/webhooks/${applicationId}/${interactionToken}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      flags: ephemeral ? 64 : 0,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Followup error: ${response.status} - ${error}`);
  }

  return response;
}

async function createTicketChannel(
  guildId: string,
  categoryId: string | null,
  userId: string,
  username: string,
  supportRoleId: string | null,
  ticketNumber: string
) {
  // Create permission overwrites
  const permissionOverwrites: any[] = [
    // Deny everyone
    {
      id: guildId,
      type: 0, // role
      deny: "1024", // VIEW_CHANNEL
    },
    // Allow the ticket creator
    {
      id: userId,
      type: 1, // member
      allow: "3072", // VIEW_CHANNEL + SEND_MESSAGES
    },
  ];

  // Allow support role if configured
  if (supportRoleId) {
    permissionOverwrites.push({
      id: supportRoleId,
      type: 0, // role
      allow: "3072", // VIEW_CHANNEL + SEND_MESSAGES
    });
  }

  const channelName = `ticket-${ticketNumber.toLowerCase().replace("tkt-", "")}`;

  const channel = await discordApiRequest(`/guilds/${guildId}/channels`, "POST", {
    name: channelName,
    type: ChannelType.GUILD_TEXT,
    parent_id: categoryId,
    permission_overwrites: permissionOverwrites,
    topic: `Support ticket ${ticketNumber} for @${username}`,
  });

  return channel;
}

async function sendDiscordChannelMessage(channelId: string, content: string | object) {
  const body = typeof content === "string" ? { content } : content;
  return discordApiRequest(`/channels/${channelId}/messages`, "POST", body);
}

async function archiveTicketChannel(channelId: string) {
  // Archive by removing send permissions
  return discordApiRequest(`/channels/${channelId}`, "PATCH", {
    name: `closed-${Date.now()}`,
    permission_overwrites: [],
  });
}

async function deleteChannel(channelId: string) {
  return discordApiRequest(`/channels/${channelId}`, "DELETE");
}

// Get linked user from Discord ID
async function getLinkedUser(supabase: any, discordId: string) {
  console.log("Looking up user with discord_id:", discordId, "type:", typeof discordId);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, discord_id, discord_username, wallets(balance, total_earned)")
    .eq("discord_id", discordId)
    .single();

  if (error) {
    console.log("Lookup error:", error.message, error.code);
    // Try to find if any profile has this discord_id to debug
    const { data: debugData } = await supabase
      .from("profiles")
      .select("id, discord_id, discord_username")
      .not("discord_id", "is", null)
      .limit(5);
    console.log("Sample discord_ids in DB:", debugData?.map((d: any) => ({ id: d.discord_id, username: d.discord_username })));
  }

  if (error || !data) {
    return null;
  }

  console.log("Found user:", data.username, "with discord_id:", data.discord_id);

  // Flatten wallet data for easier access
  return {
    ...data,
    wallet_balance: data.wallets?.balance || 0,
    total_earned: data.wallets?.total_earned || 0,
  };
}

// Command Handlers
async function handleBalanceCommand(supabase: any, discordId: string) {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    const embed = createEmbed({
      title: "🔗 Account Not Linked",
      description: "You haven't linked your Virality account yet.\n\nConnect your Discord to access your wallet, submit content, and track earnings!",
      color: Colors.WARNING,
    });

    const buttons = createButtonRow([
      {
        label: "Link Account",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=settings`,
        emoji: "🔗",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  const balance = user.wallet_balance || 0;
  const totalEarned = user.total_earned || 0;
  const pending = 0; // Could fetch pending payouts

  const embed = createEmbed({
    title: "💰 Your Wallet",
    fields: [
      { name: "Available Balance", value: `**$${balance.toFixed(2)}**`, inline: true },
      { name: "Total Earned", value: `$${totalEarned.toFixed(2)}`, inline: true },
      { name: "Pending", value: `$${pending.toFixed(2)}`, inline: true },
    ],
    color: balance > 0 ? Colors.SUCCESS : Colors.INFO,
    userInfo: { username: user.username || user.full_name },
  });

  const buttons = createButtonRow([
    {
      label: "View Wallet",
      style: ButtonStyle.LINK,
      url: `${SITE_URL}/dashboard?tab=wallet`,
      emoji: "💳",
    },
    {
      label: "Withdraw",
      style: ButtonStyle.SUCCESS,
      customId: "withdraw:start",
      emoji: "💸",
      disabled: balance < 10,
    },
    {
      label: "Refresh",
      style: ButtonStyle.SECONDARY,
      customId: "refresh:balance",
      emoji: "🔄",
    },
  ]);

  return componentResponse(embed, [buttons], true);
}

async function handleCampaignsCommand(supabase: any, discordId: string, page = 0, status = "active") {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    const embed = createEmbed({
      title: "🔗 Account Not Linked",
      description: "You haven't linked your Virality account yet.\n\nConnect your Discord to view and join campaigns!",
      color: Colors.WARNING,
    });

    const buttons = createButtonRow([
      {
        label: "Link Account",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=settings`,
        emoji: "🔗",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  const PAGE_SIZE = 5;
  const offset = page * PAGE_SIZE;

  // Build query based on status filter
  let query = supabase
    .from("campaign_members")
    .select(`
      campaign_id,
      status,
      joined_at,
      campaigns (
        id,
        title,
        status,
        payout_type,
        payout_amount,
        end_date
      )
    `, { count: "exact" })
    .eq("user_id", user.id);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: memberships, error, count } = await query
    .order("joined_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    console.error("Error fetching campaigns:", error);
    return componentResponse(
      createEmbed({
        title: "❌ Error",
        description: "Failed to fetch your campaigns. Please try again.",
        color: Colors.ERROR,
      }),
      [],
      true
    );
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!memberships || memberships.length === 0) {
    const embed = createEmbed({
      title: "📋 Your Campaigns",
      description: status === "all"
        ? "You haven't joined any campaigns yet.\n\nDiscover campaigns and start earning!"
        : `No ${status} campaigns found.`,
      color: Colors.INFO,
      userInfo: { username: user.username || user.full_name },
    });

    const buttons = createButtonRow([
      {
        label: "Discover Campaigns",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=campaigns`,
        emoji: "🔍",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  const statusEmoji: Record<string, string> = {
    active: "🟢",
    completed: "✅",
    paused: "⏸️",
    draft: "📝",
  };

  const campaignFields = memberships
    .filter((m: any) => m.campaigns)
    .map((m: any) => {
      const c = m.campaigns;
      const payout = c.payout_amount ? `$${c.payout_amount}` : "Variable";
      const emoji = statusEmoji[c.status] || "📋";
      const endDate = c.end_date ? new Date(c.end_date).toLocaleDateString() : "Ongoing";
      return {
        name: `${emoji} ${c.title}`,
        value: `💵 ${payout} • 📅 ${endDate}`,
        inline: false,
      };
    });

  const embed = createEmbed({
    title: "📋 Your Campaigns",
    description: `Showing ${offset + 1}-${offset + memberships.length} of ${totalCount} campaigns`,
    fields: campaignFields,
    color: Colors.BRAND,
    userInfo: { username: user.username || user.full_name },
  });

  const components = [];

  // Navigation buttons
  const navButtons = createButtonRow([
    {
      label: "◀ Prev",
      style: ButtonStyle.SECONDARY,
      customId: `page:campaigns:${page - 1}:${status}`,
      disabled: page === 0,
    },
    {
      label: `${page + 1}/${totalPages}`,
      style: ButtonStyle.SECONDARY,
      customId: "noop",
      disabled: true,
    },
    {
      label: "Next ▶",
      style: ButtonStyle.SECONDARY,
      customId: `page:campaigns:${page + 1}:${status}`,
      disabled: page >= totalPages - 1,
    },
  ]);
  components.push(navButtons);

  // Action buttons
  const actionButtons = createButtonRow([
    {
      label: "View All",
      style: ButtonStyle.LINK,
      url: `${SITE_URL}/dashboard?tab=campaigns`,
      emoji: "🌐",
    },
    {
      label: "Refresh",
      style: ButtonStyle.SECONDARY,
      customId: `refresh:campaigns:${page}:${status}`,
      emoji: "🔄",
    },
  ]);
  components.push(actionButtons);

  return componentResponse(embed, components, true);
}

async function handleStatsCommand(supabase: any, discordId: string, period = "all") {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    const embed = createEmbed({
      title: "🔗 Account Not Linked",
      description: "You haven't linked your Virality account yet.\n\nConnect your Discord to track your performance!",
      color: Colors.WARNING,
    });

    const buttons = createButtonRow([
      {
        label: "Link Account",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=settings`,
        emoji: "🔗",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  // Calculate date filter
  let dateFilter: Date | null = null;
  const periodLabels: Record<string, string> = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "all": "All Time",
  };

  if (period === "7d") {
    dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Build queries with date filter
  let submissionsQuery = supabase
    .from("campaign_submissions")
    .select("id, status, created_at")
    .eq("creator_id", user.id);

  let earningsQuery = supabase
    .from("wallet_transactions")
    .select("amount, created_at")
    .eq("user_id", user.id)
    .eq("type", "earning");

  if (dateFilter) {
    submissionsQuery = submissionsQuery.gte("created_at", dateFilter.toISOString());
    earningsQuery = earningsQuery.gte("created_at", dateFilter.toISOString());
  }

  const [submissionsResult, earningsResult, campaignsResult] = await Promise.all([
    submissionsQuery,
    earningsQuery,
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
  const pendingSubmissions = submissions.filter((s: any) => s.status === "pending").length;
  const rejectedSubmissions = submissions.filter((s: any) => s.status === "rejected").length;
  const periodEarnings = earnings.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const activeCampaigns = campaigns.length;
  const approvalRate = totalSubmissions > 0 ? ((approvedSubmissions / totalSubmissions) * 100).toFixed(0) : "N/A";

  // Create progress bar for approval rate
  const approvalPercent = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;
  const filledBlocks = Math.round(approvalPercent / 10);
  const progressBar = "█".repeat(filledBlocks) + "░".repeat(10 - filledBlocks);

  const embed = createEmbed({
    title: "📊 Your Statistics",
    description: `**Period:** ${periodLabels[period] || "All Time"}`,
    fields: [
      { name: "💰 Earnings", value: `**$${periodEarnings.toFixed(2)}**`, inline: true },
      { name: "💳 Balance", value: `$${(user.wallet_balance || 0).toFixed(2)}`, inline: true },
      { name: "📋 Campaigns", value: `${activeCampaigns} active`, inline: true },
      { name: "📤 Submissions", value: `${totalSubmissions} total`, inline: true },
      { name: "✅ Approved", value: `${approvedSubmissions}`, inline: true },
      { name: "⏳ Pending", value: `${pendingSubmissions}`, inline: true },
      { name: `📈 Approval Rate ${approvalRate !== "N/A" ? approvalRate + "%" : ""}`, value: `\`${progressBar}\``, inline: false },
    ],
    color: approvalPercent >= 80 ? Colors.SUCCESS : approvalPercent >= 50 ? Colors.WARNING : Colors.BRAND,
    userInfo: { username: user.username || user.full_name },
  });

  const components = [];

  // Period selector buttons
  const periodButtons = createButtonRow([
    {
      label: "7 Days",
      style: period === "7d" ? ButtonStyle.PRIMARY : ButtonStyle.SECONDARY,
      customId: "stats:7d",
    },
    {
      label: "30 Days",
      style: period === "30d" ? ButtonStyle.PRIMARY : ButtonStyle.SECONDARY,
      customId: "stats:30d",
    },
    {
      label: "All Time",
      style: period === "all" ? ButtonStyle.PRIMARY : ButtonStyle.SECONDARY,
      customId: "stats:all",
    },
  ]);
  components.push(periodButtons);

  // Action buttons
  const actionButtons = createButtonRow([
    {
      label: "View Dashboard",
      style: ButtonStyle.LINK,
      url: `${SITE_URL}/dashboard`,
      emoji: "🌐",
    },
    {
      label: "Refresh",
      style: ButtonStyle.SECONDARY,
      customId: `refresh:stats:${period}`,
      emoji: "🔄",
    },
  ]);
  components.push(actionButtons);

  return componentResponse(embed, components, true);
}

async function handleLinkCommand(discordId: string) {
  const embed = createEmbed({
    title: "🔗 Link Your Account",
    description: "Connect your Discord to access all features:\n\n" +
      "**Step 1:** Visit your dashboard settings\n" +
      "**Step 2:** Click \"Connect Discord\"\n" +
      "**Step 3:** Authorize the connection\n\n" +
      "Once linked, you can check balance, submit content, and track earnings directly from Discord!",
    color: Colors.PRIMARY,
  });

  const buttons = createButtonRow([
    {
      label: "Open Settings",
      style: ButtonStyle.LINK,
      url: `${SITE_URL}/dashboard?tab=settings`,
      emoji: "⚙️",
    },
    {
      label: "Create Account",
      style: ButtonStyle.LINK,
      url: `${SITE_URL}/auth`,
      emoji: "✨",
    },
  ]);

  return componentResponse(embed, [buttons], true);
}

async function handleLeaderboardCommand(supabase: any, discordId: string, page = 0) {
  const PAGE_SIZE = 10;
  const offset = page * PAGE_SIZE;

  // Get top earners by total_earned (more meaningful than current balance)
  const { data: topEarners, error, count } = await supabase
    .from("wallets")
    .select("balance, total_earned, user_id, profiles(username, full_name, avatar_url)", { count: "exact" })
    .order("total_earned", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return componentResponse(
      createEmbed({
        title: "❌ Error",
        description: "Failed to fetch leaderboard. Please try again.",
        color: Colors.ERROR,
      }),
      [],
      true
    );
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!topEarners || topEarners.length === 0) {
    return componentResponse(
      createEmbed({
        title: "🏆 Leaderboard",
        description: "No creators on the leaderboard yet.\n\nBe the first to earn!",
        color: Colors.INFO,
      }),
      []
    );
  }

  // Find current user's rank
  let userRank = null;
  if (discordId) {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("discord_id", discordId)
      .single();

    if (userProfile) {
      const { data: userWallet } = await supabase
        .from("wallets")
        .select("total_earned")
        .eq("user_id", userProfile.id)
        .single();

      if (userWallet) {
        const { count: rankCount } = await supabase
          .from("wallets")
          .select("id", { count: "exact", head: true })
          .gt("total_earned", userWallet.total_earned || 0);

        userRank = (rankCount || 0) + 1;
      }
    }
  }

  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `\`#${rank}\``;
  };

  const leaderboardLines = topEarners.map((wallet: any, index: number) => {
    const rank = offset + index + 1;
    const medal = getMedal(rank);
    const name = wallet.profiles?.full_name || wallet.profiles?.username || "Anonymous";
    const earned = wallet.total_earned || 0;
    return `${medal} **${name}** • $${earned.toFixed(2)} earned`;
  });

  const description = leaderboardLines.join("\n") +
    (userRank ? `\n\n━━━━━━━━━━━━━━━\n🎯 **Your Rank:** #${userRank}` : "");

  const embed = createEmbed({
    title: "🏆 Top Creators",
    description,
    color: Colors.BRAND,
    showTimestamp: true,
  });

  const components = [];

  // Navigation buttons
  if (totalPages > 1) {
    const navButtons = createButtonRow([
      {
        label: "◀ Prev",
        style: ButtonStyle.SECONDARY,
        customId: `page:leaderboard:${page - 1}`,
        disabled: page === 0,
      },
      {
        label: `${page + 1}/${totalPages}`,
        style: ButtonStyle.SECONDARY,
        customId: "noop",
        disabled: true,
      },
      {
        label: "Next ▶",
        style: ButtonStyle.SECONDARY,
        customId: `page:leaderboard:${page + 1}`,
        disabled: page >= totalPages - 1,
      },
    ]);
    components.push(navButtons);
  }

  // Action buttons
  const actionButtons = createButtonRow([
    {
      label: "View Full Leaderboard",
      style: ButtonStyle.LINK,
      url: `${SITE_URL}/leaderboard`,
      emoji: "🌐",
    },
    {
      label: "Refresh",
      style: ButtonStyle.SECONDARY,
      customId: `refresh:leaderboard:${page}`,
      emoji: "🔄",
    },
  ]);
  components.push(actionButtons);

  return componentResponse(embed, components);
}

async function handleSubmitCommand(supabase: any, discordId: string) {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    const embed = createEmbed({
      title: "🔗 Account Not Linked",
      description: "You need to link your Virality account to submit content.\n\nConnect your Discord to get started!",
      color: Colors.WARNING,
    });

    const buttons = createButtonRow([
      {
        label: "Link Account",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=settings`,
        emoji: "🔗",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  // Get user's active campaigns
  const { data: memberships } = await supabase
    .from("campaign_members")
    .select(`
      campaign_id,
      campaigns (id, title, status, payout_amount, payout_type)
    `)
    .eq("user_id", user.id)
    .eq("status", "active");

  const activeCampaigns = (memberships || [])
    .filter((m: any) => m.campaigns?.status === "active")
    .map((m: any) => m.campaigns);

  if (activeCampaigns.length === 0) {
    const embed = createEmbed({
      title: "📋 No Active Campaigns",
      description: "You're not currently part of any active campaigns.\n\nDiscover and join campaigns to start earning!",
      color: Colors.WARNING,
      userInfo: { username: user.username || user.full_name },
    });

    const buttons = createButtonRow([
      {
        label: "Discover Campaigns",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=campaigns`,
        emoji: "🔍",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  // If only one campaign, go directly to modal
  if (activeCampaigns.length === 1) {
    const campaign = activeCampaigns[0];
    return modalResponse(`submit_video_modal:${campaign.id}`, `Submit to: ${campaign.title.substring(0, 30)}`, [
      {
        type: ComponentType.ACTION_ROW,
        components: [{
          type: ComponentType.TEXT_INPUT,
          custom_id: "video_url",
          label: "Video URL",
          style: 1,
          placeholder: "https://tiktok.com/@username/video/...",
          required: true,
        }],
      },
      {
        type: ComponentType.ACTION_ROW,
        components: [{
          type: ComponentType.TEXT_INPUT,
          custom_id: "notes",
          label: "Notes (Optional)",
          style: 2,
          placeholder: "Any additional notes for the brand...",
          required: false,
        }],
      },
    ]);
  }

  // Multiple campaigns - show select menu
  const embed = createEmbed({
    title: "📤 Submit Content",
    description: "Select a campaign to submit your content to.\n\nYou can submit TikTok, Instagram, YouTube, or Twitter links.",
    color: Colors.BRAND,
    userInfo: { username: user.username || user.full_name },
  });

  const selectMenu = createSelectMenu({
    customId: "select_campaign_submit",
    placeholder: "Choose a campaign...",
    options: activeCampaigns.slice(0, 25).map((c: any) => ({
      label: c.title.substring(0, 100),
      value: c.id,
      description: c.payout_amount ? `$${c.payout_amount} per submission` : "Variable payout",
      emoji: "📋",
    })),
  });

  return componentResponse(embed, [selectMenu], true);
}

async function handleTicketCommand(supabase: any, discordId: string, options: any[]) {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    const embed = createEmbed({
      title: "🔗 Account Not Linked",
      description: "You need to link your Virality account to create support tickets.",
      color: Colors.WARNING,
    });

    const buttons = createButtonRow([
      {
        label: "Link Account",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=settings`,
        emoji: "🔗",
      },
    ]);

    return componentResponse(embed, [buttons], true);
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
    return componentResponse(
      createEmbed({
        title: "❌ Error",
        description: "Failed to create support ticket. Please try again or contact support directly.",
        color: Colors.ERROR,
      }),
      [],
      true
    );
  }

  const embed = createEmbed({
    title: "🎫 Ticket Created",
    description: "Your support request has been submitted. Our team will respond as soon as possible.",
    fields: [
      { name: "Ticket ID", value: `\`${ticket.id.slice(0, 8)}\``, inline: true },
      { name: "Subject", value: subject, inline: true },
    ],
    color: Colors.SUCCESS,
    userInfo: { username: user.username || user.full_name },
  });

  return componentResponse(embed, [], true);
}

// New: Withdraw command
async function handleWithdrawCommand(supabase: any, discordId: string) {
  const user = await getLinkedUser(supabase, discordId);

  if (!user) {
    const embed = createEmbed({
      title: "🔗 Account Not Linked",
      description: "You need to link your Virality account to request withdrawals.",
      color: Colors.WARNING,
    });

    const buttons = createButtonRow([
      {
        label: "Link Account",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=settings`,
        emoji: "🔗",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  const balance = user.wallet_balance || 0;
  const minWithdraw = 10;

  if (balance < minWithdraw) {
    const embed = createEmbed({
      title: "💸 Request Withdrawal",
      description: `You need at least **$${minWithdraw}** to request a withdrawal.\n\nCurrent balance: **$${balance.toFixed(2)}**`,
      color: Colors.WARNING,
      userInfo: { username: user.username || user.full_name },
    });

    const buttons = createButtonRow([
      {
        label: "View Campaigns",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=campaigns`,
        emoji: "📋",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  const embed = createEmbed({
    title: "💸 Request Withdrawal",
    description: `Available balance: **$${balance.toFixed(2)}**\n\nSelect your preferred payout method:`,
    fields: [
      { name: "💳 Crypto (USDC)", value: "Fast • No fees • Solana network", inline: false },
      { name: "🏦 PayPal", value: "2-3 business days • Standard fees", inline: false },
    ],
    color: Colors.BRAND,
    userInfo: { username: user.username || user.full_name },
  });

  const buttons = createButtonRow([
    {
      label: "Crypto (USDC)",
      style: ButtonStyle.SUCCESS,
      customId: "withdraw:crypto",
      emoji: "💳",
    },
    {
      label: "PayPal",
      style: ButtonStyle.PRIMARY,
      customId: "withdraw:paypal",
      emoji: "🏦",
    },
  ]);

  const actionButtons = createButtonRow([
    {
      label: "Manage Payout Methods",
      style: ButtonStyle.LINK,
      url: `${SITE_URL}/dashboard?tab=wallet`,
      emoji: "⚙️",
    },
  ]);

  return componentResponse(embed, [buttons, actionButtons], true);
}

// New: Profile command
async function handleProfileCommand(supabase: any, discordId: string, targetUserId?: string) {
  // If no target specified, show own profile
  let targetDiscordId = targetUserId || discordId;

  const user = await getLinkedUser(supabase, targetDiscordId);

  if (!user) {
    if (targetUserId && targetUserId !== discordId) {
      return componentResponse(
        createEmbed({
          title: "❓ User Not Found",
          description: "This user hasn't linked their Virality account.",
          color: Colors.WARNING,
        }),
        [],
        true
      );
    }

    const embed = createEmbed({
      title: "🔗 Account Not Linked",
      description: "Link your Virality account to view your profile.",
      color: Colors.WARNING,
    });

    const buttons = createButtonRow([
      {
        label: "Link Account",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=settings`,
        emoji: "🔗",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  // Fetch stats
  const [submissionsResult, campaignsResult] = await Promise.all([
    supabase
      .from("campaign_submissions")
      .select("id, status")
      .eq("creator_id", user.id),
    supabase
      .from("campaign_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const submissions = submissionsResult.data || [];
  const campaigns = campaignsResult.data || [];

  const totalSubmissions = submissions.length;
  const approvedSubmissions = submissions.filter((s: any) => s.status === "approved").length;
  const approvalRate = totalSubmissions > 0
    ? ((approvedSubmissions / totalSubmissions) * 100).toFixed(0) + "%"
    : "N/A";

  const isOwnProfile = !targetUserId || targetUserId === discordId;

  const embed = createEmbed({
    title: `${isOwnProfile ? "👤 Your Profile" : `👤 ${user.full_name || user.username}`}`,
    description: `@${user.username}`,
    fields: [
      { name: "💰 Total Earned", value: `$${(user.total_earned || 0).toFixed(2)}`, inline: true },
      { name: "📋 Active Campaigns", value: `${campaigns.length}`, inline: true },
      { name: "📤 Submissions", value: `${totalSubmissions}`, inline: true },
      { name: "✅ Approved", value: `${approvedSubmissions}`, inline: true },
      { name: "📈 Approval Rate", value: approvalRate, inline: true },
      { name: "💳 Balance", value: isOwnProfile ? `$${(user.wallet_balance || 0).toFixed(2)}` : "Hidden", inline: true },
    ],
    color: Colors.BRAND,
    userInfo: { username: user.username || user.full_name },
  });

  const buttons = createButtonRow([
    {
      label: "View Full Profile",
      style: ButtonStyle.LINK,
      url: `${SITE_URL}/${user.username}`,
      emoji: "🌐",
    },
    ...(isOwnProfile ? [{
      label: "Edit Profile",
      style: ButtonStyle.SECONDARY,
      url: `${SITE_URL}/dashboard?tab=settings`,
      emoji: "✏️",
    }] : []),
  ]);

  return componentResponse(embed, [buttons], true);
}

// New: Help command
async function handleHelpCommand(commandName?: string) {
  const commands = [
    { name: "balance", emoji: "💰", description: "View your wallet balance and earnings" },
    { name: "campaigns", emoji: "📋", description: "Browse your active campaigns" },
    { name: "stats", emoji: "📊", description: "View your performance statistics" },
    { name: "submit", emoji: "📤", description: "Submit content to a campaign" },
    { name: "leaderboard", emoji: "🏆", description: "See top creators" },
    { name: "withdraw", emoji: "💸", description: "Request a payout" },
    { name: "profile", emoji: "👤", description: "View your or another user's profile" },
    { name: "link", emoji: "🔗", description: "Link your Virality account" },
    { name: "ticket", emoji: "🎫", description: "Create a support ticket" },
  ];

  if (commandName) {
    const cmd = commands.find(c => c.name === commandName);
    if (!cmd) {
      return componentResponse(
        createEmbed({
          title: "❓ Unknown Command",
          description: `Command \`/${commandName}\` not found.\n\nUse \`/help\` to see all available commands.`,
          color: Colors.WARNING,
        }),
        [],
        true
      );
    }

    const embed = createEmbed({
      title: `${cmd.emoji} /${cmd.name}`,
      description: cmd.description,
      color: Colors.BRAND,
    });

    return componentResponse(embed, [], true);
  }

  const commandList = commands
    .map(c => `${c.emoji} **/${c.name}** - ${c.description}`)
    .join("\n");

  const embed = createEmbed({
    title: "📚 Virality Bot Commands",
    description: commandList,
    color: Colors.BRAND,
  });

  const buttons = createButtonRow([
    {
      label: "Visit Dashboard",
      style: ButtonStyle.LINK,
      url: SITE_URL,
      emoji: "🌐",
    },
    {
      label: "Support",
      style: ButtonStyle.LINK,
      url: `${SITE_URL}/support`,
      emoji: "💬",
    },
  ]);

  return componentResponse(embed, [buttons], true);
}

// Handle setup-tickets command (admin only)
async function handleSetupTicketsCommand(supabase: any, interaction: any) {
  const guildId = interaction.guild_id;
  const options = interaction.data.options || [];
  const discordId = interaction.member?.user?.id;

  // Check if user has admin/manage_guild permission
  const memberPermissions = BigInt(interaction.member?.permissions || "0");
  const MANAGE_GUILD = BigInt(0x20); // MANAGE_GUILD permission flag

  if ((memberPermissions & MANAGE_GUILD) === BigInt(0)) {
    return textResponse("You need **Manage Server** permission to configure tickets.", true);
  }

  const getOption = (name: string) => options.find((o: any) => o.name === name)?.value;

  const categoryId = getOption("category");
  const supportRoleId = getOption("support_role");
  const panelChannelId = getOption("panel_channel");
  const welcomeMessage = getOption("welcome_message") || "Thanks for creating a ticket! Our team will be with you shortly.";

  if (!panelChannelId) {
    return textResponse("Please specify a channel for the ticket panel.", true);
  }

  try {
    // Check if config exists for this guild
    const { data: existingConfig } = await supabase
      .from("discord_ticket_config")
      .select("id, brand_id")
      .eq("guild_id", guildId)
      .single();

    // Find brand associated with this guild (if any)
    const { data: linkedBrand } = await supabase
      .from("brands")
      .select("id, name")
      .eq("discord_guild_id", guildId)
      .single();

    const brandId = linkedBrand?.id || existingConfig?.brand_id || null;

    // Upsert config
    const { error: configError } = await supabase
      .from("discord_ticket_config")
      .upsert({
        guild_id: guildId,
        brand_id: brandId,
        ticket_category_id: categoryId,
        support_role_id: supportRoleId,
        panel_channel_id: panelChannelId,
        welcome_message: welcomeMessage,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "guild_id",
      });

    if (configError) {
      console.error("Error saving ticket config:", configError);
      return textResponse("Failed to save ticket configuration.", true);
    }

    // Create the ticket panel message
    const panelEmbed = {
      title: "🎫 Support Tickets",
      description: "Need help? Click the button below to create a support ticket.\n\nOur team will assist you as soon as possible.",
      color: Colors.BRAND,
      footer: {
        text: "Powered by Virality",
        icon_url: `${SITE_URL}/logo.png`,
      },
    };

    const panelMessage = await sendDiscordChannelMessage(panelChannelId, {
      embeds: [panelEmbed],
      components: [{
        type: ComponentType.ACTION_ROW,
        components: [{
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: "Create Ticket",
          custom_id: "ticket:create",
          emoji: { name: "🎫" },
        }],
      }],
    });

    // Save panel message ID
    await supabase
      .from("discord_ticket_config")
      .update({ panel_message_id: panelMessage.id })
      .eq("guild_id", guildId);

    const embed = createEmbed({
      title: "✅ Ticket System Configured",
      description: "The ticket system has been set up successfully!",
      fields: [
        { name: "Panel Channel", value: `<#${panelChannelId}>`, inline: true },
        { name: "Category", value: categoryId ? `<#${categoryId}>` : "None", inline: true },
        { name: "Support Role", value: supportRoleId ? `<@&${supportRoleId}>` : "None", inline: true },
      ],
      color: Colors.SUCCESS,
    });

    return componentResponse(embed, [], true);
  } catch (error: any) {
    console.error("Error setting up tickets:", error);
    return textResponse(`Failed to setup tickets: ${error.message}`, true);
  }
}

// Handle create ticket button
async function handleCreateTicketButton(supabase: any, interaction: any) {
  const guildId = interaction.guild_id;
  const discordId = interaction.member?.user?.id;
  const username = interaction.member?.user?.username || "user";
  const interactionToken = interaction.token;
  const applicationId = interaction.application_id;

  // Do the work in background and return deferred response
  const doTicketCreation = async () => {
    try {
      // Get ticket config for this guild
      const { data: config, error: configError } = await supabase
        .from("discord_ticket_config")
        .select("*")
        .eq("guild_id", guildId)
        .single();

      if (configError || !config) {
        await sendFollowup(applicationId, interactionToken, "Ticket system is not configured for this server.", true);
        return;
      }

      // Check if user already has an open ticket
      const { data: existingTicket } = await supabase
        .from("discord_ticket_channels")
        .select("id, channel_id, ticket_id, support_tickets(status)")
        .eq("guild_id", guildId)
        .eq("discord_user_id", discordId)
        .is("closed_at", null)
        .single();

      if (existingTicket && existingTicket.support_tickets?.status !== "closed") {
        await sendFollowup(applicationId, interactionToken, `You already have an open ticket: <#${existingTicket.channel_id}>`, true);
        return;
      }

      // Get or create linked user (optional - tickets can work without linking)
      const linkedUser = await getLinkedUser(supabase, discordId);

      // Create support ticket in database
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: linkedUser?.id || null,
          subject: `Discord Ticket from @${username}`,
          category: "other",
          priority: "medium",
          status: "open",
        })
        .select()
        .single();

      if (ticketError) {
        console.error("Error creating ticket:", ticketError);
        await sendFollowup(applicationId, interactionToken, "Failed to create ticket. Please try again.", true);
        return;
      }

      // Create Discord channel
      const channel = await createTicketChannel(
        guildId,
        config.ticket_category_id,
        discordId,
        username,
        config.support_role_id,
        ticket.ticket_number
      );

      // Link channel to ticket
      const { error: linkError } = await supabase
        .from("discord_ticket_channels")
        .insert({
          ticket_id: ticket.id,
          channel_id: channel.id,
          guild_id: guildId,
          discord_user_id: discordId,
          channel_name: channel.name,
        });

      if (linkError) {
        console.error("Error linking channel:", linkError);
        try {
          await deleteChannel(channel.id);
        } catch {}
        await sendFollowup(applicationId, interactionToken, "Failed to create ticket channel.", true);
        return;
      }

      // Send welcome message in the ticket channel
      const welcomeEmbed = {
        title: `🎫 Ticket ${ticket.ticket_number}`,
        description: config.welcome_message,
        fields: [
          { name: "Created by", value: `<@${discordId}>`, inline: true },
          { name: "Status", value: "🟢 Open", inline: true },
        ],
        color: Colors.SUCCESS,
        footer: {
          text: "Type your message below to get started",
        },
      };

      await sendDiscordChannelMessage(channel.id, {
        content: `<@${discordId}>${config.support_role_id ? ` <@&${config.support_role_id}>` : ""}`,
        embeds: [welcomeEmbed],
        components: [{
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.DANGER,
              label: "Close Ticket",
              custom_id: `ticket:close:${ticket.id}`,
              emoji: { name: "🔒" },
            },
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.LINK,
              label: "View on Web",
              url: `${SITE_URL}/support`,
              emoji: { name: "🌐" },
            },
          ],
        }],
      });

      await sendFollowup(applicationId, interactionToken, `Ticket created! Head to <#${channel.id}> to continue.`, true);
    } catch (error) {
      console.error("Error in ticket creation:", error);
      await sendFollowup(applicationId, interactionToken, "An error occurred while creating the ticket.", true);
    }
  };

  // Start the work in background
  doTicketCreation();

  // Return deferred response immediately
  return jsonResponse({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: 64 }, // ephemeral
  });
}

// Handle close ticket button
async function handleCloseTicketButton(supabase: any, interaction: any, ticketId: string) {
  const channelId = interaction.channel_id;
  const discordId = interaction.member?.user?.id;

  try {
    // Get ticket and channel info
    const { data: ticketChannel, error } = await supabase
      .from("discord_ticket_channels")
      .select("*, support_tickets(*)")
      .eq("ticket_id", ticketId)
      .single();

    if (error || !ticketChannel) {
      return textResponse("Ticket not found.", true);
    }

    // Check if user is ticket creator or has support role
    const isCreator = ticketChannel.discord_user_id === discordId;
    const memberPermissions = BigInt(interaction.member?.permissions || "0");
    const MANAGE_CHANNELS = BigInt(0x10);
    const isStaff = (memberPermissions & MANAGE_CHANNELS) !== BigInt(0);

    if (!isCreator && !isStaff) {
      return textResponse("You don't have permission to close this ticket.", true);
    }

    // Update ticket status
    await supabase
      .from("support_tickets")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    // Mark channel as closed
    await supabase
      .from("discord_ticket_channels")
      .update({ closed_at: new Date().toISOString() })
      .eq("ticket_id", ticketId);

    // Send closure message
    const closeEmbed = {
      title: "🔒 Ticket Closed",
      description: `This ticket was closed by <@${discordId}>.\n\nThis channel will be deleted in 10 seconds.`,
      color: Colors.ERROR,
    };

    await sendDiscordChannelMessage(channelId, { embeds: [closeEmbed] });

    // Schedule channel deletion (10 seconds)
    setTimeout(async () => {
      try {
        await deleteChannel(channelId);
      } catch (e) {
        console.error("Error deleting channel:", e);
      }
    }, 10000);

    return jsonResponse({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        components: [], // Remove buttons
      },
    });
  } catch (error: any) {
    console.error("Error closing ticket:", error);
    return textResponse(`Failed to close ticket: ${error.message}`, true);
  }
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

  // Handle submit_video_modal:campaignId format
  if (customId.startsWith("submit_video_modal:")) {
    const campaignId = customId.split(":")[1];
    const user = await getLinkedUser(supabase, discordId);
    if (!user) {
      return textResponse("Your account is not linked. Use `/link` first.", true);
    }

    const components = interaction.data.components;
    const contentUrl = components[0]?.components[0]?.value;
    const notes = components[1]?.components[0]?.value || "";

    if (!contentUrl) {
      return textResponse("Video URL is required. Please try again.", true);
    }

    // Verify user is member of this campaign
    const { data: membership } = await supabase
      .from("campaign_members")
      .select("id, campaigns(title)")
      .eq("user_id", user.id)
      .eq("campaign_id", campaignId)
      .eq("status", "active")
      .single();

    if (!membership) {
      return componentResponse(
        createEmbed({
          title: "❌ Not a Member",
          description: "You're not a member of this campaign.",
          color: Colors.ERROR,
        }),
        [],
        true
      );
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
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating submission:", error);
      return componentResponse(
        createEmbed({
          title: "❌ Error",
          description: "Failed to submit video. Please try again.",
          color: Colors.ERROR,
        }),
        [],
        true
      );
    }

    const platformEmoji: Record<string, string> = {
      tiktok: "🎵",
      instagram: "📸",
      youtube: "▶️",
      twitter: "🐦",
      other: "🔗",
    };

    const embed = createEmbed({
      title: "✅ Content Submitted!",
      description: "Your content has been submitted for review.",
      fields: [
        { name: "Campaign", value: membership.campaigns?.title || "Unknown", inline: true },
        { name: "Platform", value: `${platformEmoji[platform] || "🔗"} ${platform}`, inline: true },
        { name: "Submission ID", value: `\`${submission.id.slice(0, 8)}\``, inline: true },
      ],
      color: Colors.SUCCESS,
      userInfo: { username: user.username || user.full_name },
    });

    const buttons = createButtonRow([
      {
        label: "View Submissions",
        style: ButtonStyle.LINK,
        url: `${SITE_URL}/dashboard?tab=campaigns`,
        emoji: "📋",
      },
      {
        label: "Submit Another",
        style: ButtonStyle.SECONDARY,
        customId: "cmd:submit",
        emoji: "➕",
      },
    ]);

    return componentResponse(embed, [buttons], true);
  }

  return textResponse("Unknown modal submission.", true);
}

// Handle button/select component interactions
async function handleComponentInteraction(supabase: any, interaction: any) {
  const customId = interaction.data.custom_id;
  const discordId = interaction.member?.user?.id || interaction.user?.id;
  const componentType = interaction.data.component_type;

  console.log(`Handling component interaction: ${customId}, type: ${componentType}`);

  // Parse custom_id format: "action:param1:param2:..."
  const [action, ...params] = customId.split(":");

  // Handle select menu for campaign submission
  if (componentType === ComponentType.STRING_SELECT) {
    if (customId === "select_campaign_submit") {
      const campaignId = interaction.data.values[0];

      // Fetch campaign details
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, title")
        .eq("id", campaignId)
        .single();

      if (!campaign) {
        return updateResponse(
          createEmbed({
            title: "❌ Campaign Not Found",
            description: "This campaign no longer exists.",
            color: Colors.ERROR,
          }),
          []
        );
      }

      // Show modal for URL input
      return modalResponse(`submit_video_modal:${campaignId}`, `Submit to: ${campaign.title.substring(0, 30)}`, [
        {
          type: ComponentType.ACTION_ROW,
          components: [{
            type: ComponentType.TEXT_INPUT,
            custom_id: "video_url",
            label: "Video URL",
            style: 1,
            placeholder: "https://tiktok.com/@username/video/...",
            required: true,
          }],
        },
        {
          type: ComponentType.ACTION_ROW,
          components: [{
            type: ComponentType.TEXT_INPUT,
            custom_id: "notes",
            label: "Notes (Optional)",
            style: 2,
            placeholder: "Any additional notes for the brand...",
            required: false,
          }],
        },
      ]);
    }
  }

  // Handle button interactions
  if (componentType === ComponentType.BUTTON) {
    // Refresh handlers
    if (action === "refresh") {
      const [target, ...extraParams] = params;

      switch (target) {
        case "balance":
          return handleBalanceCommand(supabase, discordId);
        case "campaigns":
          const campPage = parseInt(extraParams[0] || "0");
          const campStatus = extraParams[1] || "active";
          return handleCampaignsCommand(supabase, discordId, campPage, campStatus);
        case "stats":
          const statsPeriod = extraParams[0] || "all";
          return handleStatsCommand(supabase, discordId, statsPeriod);
        case "leaderboard":
          const lbPage = parseInt(extraParams[0] || "0");
          return handleLeaderboardCommand(supabase, discordId, lbPage);
      }
    }

    // Pagination handlers
    if (action === "page") {
      const [target, pageStr, ...extraParams] = params;
      const page = parseInt(pageStr || "0");

      switch (target) {
        case "campaigns":
          const status = extraParams[0] || "active";
          return handleCampaignsCommand(supabase, discordId, page, status);
        case "leaderboard":
          return handleLeaderboardCommand(supabase, discordId, page);
      }
    }

    // Stats period selector
    if (action === "stats") {
      const period = params[0] || "all";
      return handleStatsCommand(supabase, discordId, period);
    }

    // Withdraw handlers
    if (action === "withdraw") {
      const method = params[0];

      if (method === "start") {
        return handleWithdrawCommand(supabase, discordId);
      }

      if (method === "crypto" || method === "paypal") {
        // Redirect to appropriate page
        const embed = createEmbed({
          title: method === "crypto" ? "💳 Crypto Withdrawal" : "🏦 PayPal Withdrawal",
          description: `To complete your ${method === "crypto" ? "crypto" : "PayPal"} withdrawal, please continue on our website.`,
          color: Colors.BRAND,
        });

        const buttons = createButtonRow([
          {
            label: "Continue Withdrawal",
            style: ButtonStyle.LINK,
            url: `${SITE_URL}/dashboard?tab=wallet`,
            emoji: method === "crypto" ? "💳" : "🏦",
          },
        ]);

        return updateResponse(embed, [buttons]);
      }
    }

    // Command shortcuts
    if (action === "cmd") {
      const command = params[0];
      switch (command) {
        case "submit":
          return handleSubmitCommand(supabase, discordId);
        case "balance":
          return handleBalanceCommand(supabase, discordId);
        case "campaigns":
          return handleCampaignsCommand(supabase, discordId);
      }
    }

    // No-op for disabled buttons
    if (action === "noop") {
      return jsonResponse({
        type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
      });
    }

    // Ticket button handlers
    if (action === "ticket") {
      const [ticketAction, ...ticketParams] = params;

      if (ticketAction === "create") {
        return handleCreateTicketButton(supabase, interaction);
      }

      if (ticketAction === "close" && ticketParams[0]) {
        return handleCloseTicketButton(supabase, interaction, ticketParams[0]);
      }
    }
  }

  console.log(`Unknown component interaction: ${customId}`);
  return textResponse("This interaction is not yet supported.", true);
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

    // Extract common options
    const getOption = (optName: string) => options?.find((o: any) => o.name === optName)?.value;

    switch (name) {
      case "balance":
        return handleBalanceCommand(supabase, discordId);

      case "campaigns": {
        const status = getOption("status") || "active";
        return handleCampaignsCommand(supabase, discordId, 0, status);
      }

      case "stats": {
        const period = getOption("period") || "all";
        return handleStatsCommand(supabase, discordId, period);
      }

      case "link":
        return handleLinkCommand(discordId);

      case "leaderboard":
        return handleLeaderboardCommand(supabase, discordId, 0);

      case "submit":
        return handleSubmitCommand(supabase, discordId);

      case "ticket":
        return handleTicketCommand(supabase, discordId, options);

      case "withdraw":
        return handleWithdrawCommand(supabase, discordId);

      case "profile": {
        const targetUser = getOption("user");
        return handleProfileCommand(supabase, discordId, targetUser);
      }

      case "help": {
        const commandName = getOption("command");
        return handleHelpCommand(commandName);
      }

      case "setup-tickets":
        return handleSetupTicketsCommand(supabase, interaction);

      default:
        return textResponse(`Unknown command: ${name}`, true);
    }
  }

  // Handle modal submissions
  if (interaction.type === InteractionType.MODAL_SUBMIT) {
    return handleModalSubmit(supabase, interaction);
  }

  // Handle button/select component interactions
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    return handleComponentInteraction(supabase, interaction);
  }

  return jsonResponse({ error: "Unknown interaction type" }, 400);
});
