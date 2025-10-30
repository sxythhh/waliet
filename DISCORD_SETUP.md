# Discord OAuth Integration Setup

## Overview
The Discord account linking integration has been successfully implemented in your Virality platform. This allows users to connect their Discord accounts to their Virality profiles.

## What's Been Implemented

### 1. Database Schema
- Added Discord fields to the `profiles` table:
  - `discord_id` - Unique Discord user ID
  - `discord_username` - Discord username
  - `discord_discriminator` - Discord discriminator (if applicable)
  - `discord_avatar` - URL to Discord avatar
  - `discord_email` - Discord email address
  - `discord_connected_at` - Timestamp of when the account was linked

### 2. Backend (Edge Function)
- Created `discord-oauth` edge function that:
  - Handles OAuth code exchange with Discord
  - Fetches Discord user data
  - Updates user profile with Discord information
  - Supports account disconnection

### 3. Frontend Components
- **DiscordLinkDialog**: Main UI component for linking/unlinking Discord
- **DiscordOAuthCallback**: Handles OAuth callback and communicates with parent window
- **ProfileTab Integration**: Shows Discord connection status in user profile

### 4. Security
- OAuth state parameter for CSRF protection
- Secure credential storage using environment variables
- Proper RLS policies on profiles table

## Discord Developer Portal Setup

To complete the integration, you need to configure your Discord application:

### Step 1: Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Virality")
4. Click "Create"

### Step 2: Get Your Credentials
1. Go to the "OAuth2" section in your Discord application
2. Copy your **Client ID** and **Client Secret**
3. These are already stored securely in your backend

### Step 3: Configure OAuth2 Settings
1. In the Discord Developer Portal, go to "OAuth2" → "General"
2. Add the following redirect URIs:
   ```
   https://virality.gg/discord/callback
   https://6bde31cd-d5f5-42d8-bbe2-186f0e7d9738.lovableproject.com/discord/callback
   ```
   (Add both your production and preview URLs)

3. Under "OAuth2 URL Generator", select these scopes:
   - `identify` - To get the user's Discord username and avatar
   - `email` - To get the user's Discord email

### Step 4: Update Client ID in Code
You need to add your Discord Client ID to the frontend:

1. Open `src/components/DiscordLinkDialog.tsx`
2. Find line ~27 where it says `'1331319843054780498'`
3. Replace it with your actual Discord Client ID from the Developer Portal

## How It Works

### User Flow:
1. User clicks "Link Discord" button in their profile
2. A popup opens with Discord OAuth authorization
3. User authorizes the Virality app
4. Discord redirects to the callback page
5. The callback page exchanges the code for user data
6. Profile is updated with Discord information
7. Popup closes and profile refreshes

### Unlinking:
1. User clicks "Manage Discord" → "Unlink Discord"
2. All Discord data is removed from their profile
3. They can re-link anytime

## Testing

1. Go to your profile page (`/dashboard?tab=profile`)
2. Scroll to the "Discord Account" section
3. Click "Link Discord"
4. Authorize in the popup
5. Your Discord account should now be linked!

## Features Enabled

With Discord integration, you can now:
- Display Discord username and avatar on user profiles
- Verify users through their Discord accounts
- Access Discord-specific features in your platform
- Send Discord-based notifications (requires additional setup)
- Create Discord-gated content or features

## Troubleshooting

### "Invalid redirect_uri" error
- Make sure you've added all your app URLs to the Discord OAuth2 redirect URIs list

### "Invalid client_id" error
- Verify the client ID in `DiscordLinkDialog.tsx` matches your Discord application

### Account not linking
- Check the browser console for errors
- Verify the edge function is deployed (it should be automatic)
- Check the edge function logs in your backend

## Next Steps

Consider adding:
- Discord server integration (invite users to your Discord server)
- Discord role sync (give Discord roles based on Virality activity)
- Discord notifications (notify users via Discord webhook)
- Discord-gated campaigns (require Discord server membership)

## Support

If you encounter any issues, check:
1. Edge function logs in your backend
2. Browser console for errors
3. Discord Developer Portal for OAuth error codes
