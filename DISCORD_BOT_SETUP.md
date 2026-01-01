# Discord Bot Setup (Slash Commands)

This guide explains how to set up the Discord bot slash commands for Virality.

## Overview

The Discord bot uses Discord's HTTP Interactions (webhook-based) instead of a traditional bot process. This means:
- No external hosting required - runs entirely on Supabase Edge Functions
- Slash commands are handled via HTTP POST requests from Discord
- Works seamlessly with Lovable Cloud

## Available Commands

| Command | Description |
|---------|-------------|
| `/balance` | View your current wallet balance |
| `/campaigns` | List your active campaigns |
| `/stats` | View your creator statistics |
| `/submit` | Submit a video to a campaign (opens modal) |
| `/ticket` | Create a support ticket |
| `/link` | Get instructions to link your Virality account |
| `/leaderboard` | View the top creators leaderboard |

## Setup Steps

### Step 1: Discord Developer Portal Configuration

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your existing Virality application (or create one)
3. Note your **Application ID** (also called Client ID): `1358316231341375518`

### Step 2: Get Bot Token and Public Key

1. In your Discord application, go to **Bot** section
2. Click "Reset Token" to get a new bot token
3. Copy the **Bot Token** - you'll need this for registering commands
4. Go to **General Information** section
5. Copy the **Public Key** - you'll need this for the edge function

### Step 3: Configure Edge Function Secrets

In your Lovable Cloud / Supabase dashboard, add these environment variables to your edge functions:

```
DISCORD_PUBLIC_KEY=your_discord_public_key_here
DISCORD_BOT_TOKEN=your_bot_token_here
```

The edge function already has access to:
- `SUPABASE_URL` (automatic)
- `SUPABASE_SERVICE_ROLE_KEY` (automatic)

### Step 4: Set Up Interactions Endpoint URL

1. In Discord Developer Portal, go to **General Information**
2. Find the **Interactions Endpoint URL** field
3. Enter your edge function URL:
   ```
   https://upiypxzjaagithghxayv.supabase.co/functions/v1/discord-interactions
   ```
4. Discord will send a PING request to verify the endpoint
5. If verification fails, check your `DISCORD_PUBLIC_KEY` environment variable

### Step 5: Register Slash Commands

Run the registration script to create the slash commands:

```bash
# Set your bot token
export DISCORD_BOT_TOKEN="your_bot_token_here"

# Run the registration script
npx ts-node scripts/register-discord-commands.ts
```

Or run directly with the token:

```bash
DISCORD_BOT_TOKEN=your_token npx ts-node scripts/register-discord-commands.ts
```

You should see:
```
Registering Discord slash commands...

Successfully registered commands:
  /balance - View your current wallet balance
  /campaigns - List your active campaigns
  /stats - View your creator statistics
  /link - Get instructions to link your Virality account
  /leaderboard - View the top creators leaderboard
  /submit - Submit a video to a campaign
  /ticket - Create a support ticket

Total: 7 commands registered
```

### Step 6: Invite Bot to Your Server

Create an invite URL with the required permissions:

```
https://discord.com/api/oauth2/authorize?client_id=1358316231341375518&permissions=0&scope=bot%20applications.commands
```

Or go to **OAuth2 > URL Generator** in Discord Developer Portal:
- Select scopes: `bot`, `applications.commands`
- No permissions needed (the bot doesn't send messages proactively)
- Use the generated URL to invite the bot

## How It Works

```
User types /balance
      │
      ▼
Discord sends HTTP POST to your edge function
      │
      ▼
┌─────────────────────────────────────────────────────┐
│  discord-interactions Edge Function                  │
│                                                      │
│  1. Verify Discord signature (security)             │
│  2. Parse the slash command                         │
│  3. Look up user by Discord ID                      │
│  4. Query database (has SUPABASE_SERVICE_ROLE_KEY)  │
│  5. Return formatted response                       │
└─────────────────────────────────────────────────────┘
      │
      ▼
Discord displays response to user
```

## Command Details

### /balance
Shows the user's wallet balance. Requires linked account.

### /campaigns
Lists up to 10 active campaigns the user is part of, with payout information.

### /stats
Shows comprehensive creator statistics:
- Total earnings
- Current balance
- Active campaigns
- Total submissions
- Approval rate

### /submit
Opens a modal for video submission:
1. User enters video URL (TikTok, Instagram, YouTube, Twitter)
2. User enters campaign ID
3. Platform is auto-detected from URL
4. Submission is created in database

### /ticket
Creates a support ticket (stored in `feedback_submissions` table):
- Requires subject and description
- Marked with type "support"

### /leaderboard
Shows top 10 creators by wallet balance (public command).

### /link
Provides instructions for linking Discord account to Virality.

## Troubleshooting

### "Interaction Failed" error
- Check edge function logs in Supabase dashboard
- Verify `DISCORD_PUBLIC_KEY` is set correctly
- Make sure the edge function is deployed

### "Account Not Linked" for all users
- Users need to link their Discord account on virality.gg first
- The `/link` command provides instructions

### Commands not appearing
- Run the registration script again
- Commands can take up to 1 hour to propagate globally
- For instant testing, register guild-specific commands instead

### Signature verification failing
- Double-check the `DISCORD_PUBLIC_KEY` value
- It should be the Public Key from Discord's General Information page, not the Client Secret

## Adding New Commands

1. Add the command definition to `scripts/register-discord-commands.ts`
2. Add the handler in `supabase/functions/discord-interactions/index.ts`
3. Run the registration script
4. Deploy the edge function (automatic in Lovable Cloud)

## Limitations

Since this uses HTTP Interactions (not a bot gateway), you cannot:
- Receive real-time events (member joins, message reactions)
- Send proactive messages without user interaction
- Monitor server activity

For these features, you'd need a separate bot process (Option 2 from our discussion).

## Security Notes

- All commands require Discord signature verification
- User data is only accessible if they've linked their Discord account
- Ephemeral responses (only visible to the user) are used for sensitive data
- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` for privileged operations

## Next Steps

Consider adding:
- `/withdraw` - Request a payout
- `/notifications` - Toggle notification preferences
- `/profile` - View/edit profile settings
- Button interactions for quick actions
- Dropdown menus for campaign selection
