# X (Twitter) Account Linking Setup

This guide will help you configure X OAuth for account linking in your Virality application.

## Prerequisites

- A Twitter/X Developer Account
- Access to the Twitter Developer Portal

## Setup Steps

### 1. Create a Twitter App

1. Go to the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project or select an existing one
3. Create a new app within the project

### 2. Configure OAuth 2.0 Settings

In your app settings, configure the following:

#### App Info
- **App name**: Your app name (e.g., "Virality")
- **App description**: Brief description of your app
- **Website URL**: `https://virality.gg`

#### Authentication Settings
Enable **OAuth 2.0** and configure:

**Type of App**: Web App, Automated App or Bot

**Callback URI / Redirect URL**:
```
https://virality.gg/x/callback
https://6bde31cd-d5f5-42d8-bbe2-186f0e7d9738.lovableproject.com/x/callback
```

**Website URL**: `https://virality.gg`

### 3. Get Your Credentials

After creating the app, you'll receive:
- **Client ID** (OAuth 2.0 Client ID)
- **Client Secret** (OAuth 2.0 Client Secret)

These were added to your Supabase secrets as:
- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`

### 4. Update the Client ID in Code

Open `src/components/XLinkDialog.tsx` and update line 31 with your actual Twitter Client ID:

```typescript
const TWITTER_CLIENT_ID = import.meta.env.VITE_SUPABASE_URL?.includes('upiypxzjaagithghxayv') 
  ? 'YOUR_ACTUAL_TWITTER_CLIENT_ID_HERE'
  : 'YOUR_TWITTER_CLIENT_ID';
```

### 5. OAuth Scopes

The integration uses the following OAuth 2.0 scopes:
- `tweet.read` - Read tweets
- `users.read` - Read user profile information

### 6. Test the Integration

1. Go to your profile settings in the Virality app
2. Click "Link X" button
3. Authorize the app in the popup window
4. Your X account should now be linked to your profile

## Troubleshooting

### Common Issues

1. **"Invalid Callback URL"**
   - Ensure the callback URLs are exactly as listed above
   - Check that OAuth 2.0 is enabled in your app settings

2. **"Authentication Failed"**
   - Verify your Client ID and Secret are correct
   - Check that the secrets are properly saved in Supabase
   - Ensure your app has the correct permissions

3. **"App Not Approved"**
   - Some Twitter apps require approval for certain features
   - Basic authentication should work immediately for most apps

### Security Notes

- Never commit your Client Secret to version control
- The secrets are stored securely in Supabase and accessed via environment variables
- The OAuth flow uses PKCE (Proof Key for Code Exchange) for additional security

## Additional Resources

- [Twitter OAuth 2.0 Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Twitter API Reference](https://developer.twitter.com/en/docs/api-reference-index)
- [OAuth 2.0 Best Practices](https://tools.ietf.org/html/rfc8252)

## Production Checklist

Before going to production, ensure:
- [ ] Twitter app is approved (if required)
- [ ] Production callback URLs are added
- [ ] Client ID is updated in the code
- [ ] Rate limits are understood and monitored
- [ ] Error handling is tested thoroughly
