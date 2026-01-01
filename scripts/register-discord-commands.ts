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
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1358316231341375518";

if (!DISCORD_BOT_TOKEN) {
  console.error("Error: DISCORD_BOT_TOKEN environment variable is required");
  console.log("\nUsage:");
  console.log("  DISCORD_BOT_TOKEN=your_token npx ts-node scripts/register-discord-commands.ts");
  process.exit(1);
}

const commands = [
  {
    name: "balance",
    description: "View your current wallet balance",
  },
  {
    name: "campaigns",
    description: "List your active campaigns",
  },
  {
    name: "stats",
    description: "View your creator statistics",
  },
  {
    name: "link",
    description: "Get instructions to link your Virality account",
  },
  {
    name: "leaderboard",
    description: "View the top creators leaderboard",
  },
  {
    name: "submit",
    description: "Submit a video to a campaign",
  },
  {
    name: "ticket",
    description: "Create a support ticket",
    options: [
      {
        name: "subject",
        description: "Brief subject of your issue",
        type: 3, // STRING
        required: true,
      },
      {
        name: "description",
        description: "Detailed description of your issue",
        type: 3, // STRING
        required: true,
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
