/**
 * Discord Slash Command Registration Script
 *
 * Run this script to register slash commands with Discord.
 * You only need to run this once, or when you add/update commands.
 *
 * Usage:
 *   npx ts-node scripts/register-discord-commands.ts
 *
 * Or with environment variables:
 *   DISCORD_BOT_TOKEN=your_token DISCORD_CLIENT_ID=your_client_id npx ts-node scripts/register-discord-commands.ts
 */

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID) {
  const missing = [];
  if (!DISCORD_BOT_TOKEN) missing.push("DISCORD_BOT_TOKEN");
  if (!DISCORD_CLIENT_ID) missing.push("DISCORD_CLIENT_ID");
  console.error(`Error: ${missing.join(" and ")} environment variable(s) required`);
  console.log("\nUsage:");
  console.log("  DISCORD_BOT_TOKEN=your_token DISCORD_CLIENT_ID=your_client_id npx ts-node scripts/register-discord-commands.ts");
  process.exit(1);
}

// Command option types
const OptionType = {
  SUB_COMMAND: 1,
  SUB_COMMAND_GROUP: 2,
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
  CHANNEL: 7,
  ROLE: 8,
  MENTIONABLE: 9,
  NUMBER: 10,
  ATTACHMENT: 11,
};

const commands = [
  {
    name: "balance",
    description: "View your wallet balance and earnings",
  },
  {
    name: "campaigns",
    description: "Browse your campaigns",
    options: [
      {
        name: "status",
        description: "Filter by campaign status",
        type: OptionType.STRING,
        required: false,
        choices: [
          { name: "Active", value: "active" },
          { name: "Completed", value: "completed" },
          { name: "All", value: "all" },
        ],
      },
    ],
  },
  {
    name: "stats",
    description: "View your performance statistics",
    options: [
      {
        name: "period",
        description: "Time period to show stats for",
        type: OptionType.STRING,
        required: false,
        choices: [
          { name: "Last 7 Days", value: "7d" },
          { name: "Last 30 Days", value: "30d" },
          { name: "All Time", value: "all" },
        ],
      },
    ],
  },
  {
    name: "link",
    description: "Link your Virality account to Discord",
  },
  {
    name: "leaderboard",
    description: "View the top creators leaderboard",
  },
  {
    name: "submit",
    description: "Submit content to a campaign",
  },
  {
    name: "ticket",
    description: "Create a support ticket",
    options: [
      {
        name: "subject",
        description: "Brief subject of your issue",
        type: OptionType.STRING,
        required: true,
      },
      {
        name: "description",
        description: "Detailed description of your issue",
        type: OptionType.STRING,
        required: true,
      },
    ],
  },
  {
    name: "withdraw",
    description: "Request a payout from your balance",
  },
  {
    name: "profile",
    description: "View your or another user's profile",
    options: [
      {
        name: "user",
        description: "User to view (leave empty for your own profile)",
        type: OptionType.USER,
        required: false,
      },
    ],
  },
  {
    name: "help",
    description: "Get help with bot commands",
    options: [
      {
        name: "command",
        description: "Get help for a specific command",
        type: OptionType.STRING,
        required: false,
        choices: [
          { name: "balance", value: "balance" },
          { name: "campaigns", value: "campaigns" },
          { name: "stats", value: "stats" },
          { name: "submit", value: "submit" },
          { name: "withdraw", value: "withdraw" },
          { name: "profile", value: "profile" },
          { name: "leaderboard", value: "leaderboard" },
          { name: "link", value: "link" },
          { name: "ticket", value: "ticket" },
        ],
      },
    ],
  },
  {
    name: "setup-tickets",
    description: "Configure the Discord ticket system (Admin only)",
    options: [
      {
        name: "panel_channel",
        description: "Channel where the ticket panel will be posted",
        type: OptionType.CHANNEL,
        required: true,
      },
      {
        name: "category",
        description: "Category where ticket channels will be created",
        type: OptionType.CHANNEL,
        required: false,
      },
      {
        name: "support_role",
        description: "Role that can view and respond to tickets",
        type: OptionType.ROLE,
        required: false,
      },
      {
        name: "welcome_message",
        description: "Message shown when a ticket is created",
        type: OptionType.STRING,
        required: false,
      },
    ],
  },
];

async function registerCommands() {
  console.log("Registering Discord slash commands...\n");

  const url = `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/commands`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to register commands:", response.status, error);
      process.exit(1);
    }

    const data = await response.json();
    console.log("Successfully registered commands:");
    data.forEach((cmd: any) => {
      console.log(`  /${cmd.name} - ${cmd.description}`);
    });
    console.log(`\nTotal: ${data.length} commands registered`);
  } catch (error) {
    console.error("Error registering commands:", error);
    process.exit(1);
  }
}

registerCommands();
