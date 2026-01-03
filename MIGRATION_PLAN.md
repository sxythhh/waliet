# Lovable Cloud Migration Plan - Virality Nexus

## Executive Summary

This document outlines a comprehensive migration strategy for moving Virality Nexus from Lovable Cloud to a self-managed Supabase instance. Based on codebase analysis, this is a **high-complexity migration** requiring careful planning.

### Project Complexity Assessment

| Metric | Value | Migration Impact |
|--------|-------|------------------|
| Migration Files | 353 | High - Must run in sequence |
| Database Tables | 96+ | High - Complex relationships |
| RLS Policies | 637+ | Critical - Security-sensitive |
| Edge Functions | 78 | High - Must redeploy all |
| Database Triggers | 99+ | High - Order-dependent |
| Database Functions | 100+ | High - Required for RLS |
| Environment Variables | 30+ | Medium - Must document all |
| OAuth Providers | 3 (Google, Discord, X) | High - Redirect URL changes |
| External Integrations | 12+ services | Medium - Webhook URL updates |

---

## Phase 1: Pre-Migration Preparation (Before Starting)

### 1.1 Document All Secrets and API Keys

**Frontend Variables (required in `.env.local`):**
```env
VITE_SUPABASE_URL=https://[NEW_PROJECT_ID].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[NEW_ANON_KEY]
```

**Edge Function Secrets (configure in Supabase Dashboard → Edge Functions → Manage Secrets):**
```
# Core Supabase
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY

# Discord Integration
DISCORD_BOT_TOKEN
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_PUBLIC_KEY
DISCORD_BOT_SECRET
DISCORD_WEBHOOK_URL
DISCORD_FRAUD_WEBHOOK_URL

# Twitter/X
TWITTER_CLIENT_ID
TWITTER_CLIENT_SECRET

# Payments - Whop
WHOP_API_KEY
WHOP_PARENT_COMPANY_ID
WHOP_WEBHOOK_SECRET

# Payments - Slash (Crypto)
SLASH_API_KEY
SLASH_ACCOUNT_ID
SLASH_WEBHOOK_SECRET

# Crypto - Solana
SOLANA_TREASURY_PRIVATE_KEY
HELIUS_API_KEY

# Social Media APIs
RAPIDAPI_KEY

# Analytics
POSTHOG_API_KEY
POSTHOG_PROJECT_ID

# Email
RESEND_API_KEY

# Internal
LOVABLE_API_KEY
VIRALITY_API_KEY
BOT_SCORING_API_URL
SITE_URL
```

### 1.2 Export Data from Lovable Cloud

1. **Database Tables**: Export all tables via Cloud → Database → Table → Export CSV
2. **Storage Files**: Download all files from Lovable Cloud Storage manually
3. **User List**: Export user emails for password reset notifications

### 1.3 Create New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note the following credentials:
   - Project URL
   - Anon Key (public)
   - Service Role Key (secret)
   - Project Reference ID
3. Save the JWT Secret from Settings → API (needed for session continuity)

---

## Phase 2: Database Migration

### 2.1 Run Migrations in Order

The 353 migration files must be executed in chronological order. Two approaches:

**Option A: Supabase CLI (Recommended)**
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your new project
supabase link --project-ref [YOUR_NEW_PROJECT_ID]

# Push all migrations
supabase db push
```

**Option B: Manual SQL Execution**
Run each file in `supabase/migrations/` chronologically via SQL Editor.

### 2.2 Verify Critical Database Objects

After migration, verify these exist:

**Core Functions (used in RLS policies):**
- [ ] `is_brand_member(user_id, brand_id)`
- [ ] `is_brand_admin(user_id, brand_id)`
- [ ] `has_admin_permission(user_id, resource)`
- [ ] `has_role(user_id, role_name)`
- [ ] `can_view_profile(user_id, profile_id)`

**Encryption Functions:**
- [ ] `encrypt_discord_token()` / `decrypt_discord_token()`
- [ ] `encrypt_payout_details()` / `decrypt_payout_details()`

**Financial Functions:**
- [ ] `atomic_complete_payout()`
- [ ] `atomic_allocate_budget()`
- [ ] `atomic_p2p_transfer()`

### 2.3 Import Data

1. Import CSV files in dependency order (parent tables before children)
2. Suggested order:
   - `profiles` (depends on auth.users - import users first)
   - `brands`
   - `wallets`
   - `brand_members`
   - `campaigns`
   - `bounty_campaigns`
   - All other tables

---

## Phase 3: Edge Functions Deployment

### 3.1 Deploy All 78 Edge Functions

```bash
# Deploy all functions at once
supabase functions deploy

# Or deploy individually
supabase functions deploy discord-auth
supabase functions deploy discord-oauth
supabase functions deploy x-oauth
# ... etc for all 78 functions
```

### 3.2 Function Categories to Deploy

**Authentication (5 functions):**
- discord-auth, discord-oauth, x-oauth, discord-interactions

**Payment Processing (15 functions):**
- create-payment-api, create-campaign-payment, create-subscription-checkout
- create-whop-checkout, request-payout, complete-payout, approve-payout
- process-crypto-payout, request-crypto-payout, p2p-transfer
- personal-to-brand-transfer, brand-to-personal-transfer, transfer-to-withdraw
- create-boost-topup, allocate-brand-budget, create-brand-wallet-topup

**Campaign Management (10 functions):**
- create-campaign-link, create-campaign-webhook, sync-campaign-videos
- get-campaign-users, get-campaign-applications, approve-campaign-application
- get-campaign-transactions, process-campaign-video-payments
- process-evidence-deadlines, process-view-bonuses

**Analytics & Tracking (9 functions):**
- track-user-session, track-link-click, track-link-conversion
- track-campaign-user, track-shortimize-video, sync-shortimize-metrics
- get-link-analytics, fetch-video-history, calculate-trust-score

**Social Media (5 functions):**
- fetch-youtube-video, fetch-tiktok-video, fetch-instagram-post
- verify-social-bio, sync-discord-message, push-discord-message, send-discord-dm

**Notifications (8 functions):**
- send-application-approval, send-brand-invitation, send-payment-notification
- send-evidence-request, send-password-reset, notify-campaign-application
- notify-demographic-submission, notify-withdrawal

**Admin/Support (8 functions):**
- support-chat, check-payout-fraud, apply-fraud-penalty, execute-clawback
- impersonate-user, auto-process-boost-payouts, get-slash-accounts, generate-sitemap

**Webhooks (3 functions):**
- whop-webhook, slash-webhook, create-payment-api

### 3.3 Configure Edge Function Secrets

In Supabase Dashboard → Edge Functions → Manage Secrets, add all secrets listed in Phase 1.1.

---

## Phase 4: Authentication Migration

### 4.0 Email OTP Strategy (Recommended - Avoids Password Resets!)

**The password hash problem can be completely avoided** by using Email OTP (one-time password) authentication. This has been implemented in the codebase.

#### How It Works:
1. User enters their email
2. Supabase sends a 6-digit code to their email
3. User enters the code to authenticate
4. No password required = no password hash problem!

#### Implementation Added:
- **New Component**: `src/components/auth/EmailOTPAuth.tsx`
- **Updated Auth Page**: `src/pages/Auth.tsx` now offers OTP as an option

#### Migration Strategy with OTP:

**Option A: OTP-First Migration (Smoothest)**
1. Before migration, communicate to users that login will use email codes
2. After migration, users simply use "Sign in with email code" option
3. Optionally, let users set a password later in their profile settings

**Option B: Hybrid Approach**
1. Keep password login for OAuth users (Google, Discord) - no change needed
2. Email/password users see "Sign in with email code instead" option
3. No forced password resets required

#### User Communication Template:
```
Subject: Important: Login Update for Virality

Hi [Name],

We've upgraded our authentication system. You can now sign in using:
- Google or Discord (no changes)
- Email code: Enter your email, receive a 6-digit code, and you're in!

No password reset required. Just use the email code option on the login page.

Questions? Reply to this email.

The Virality Team
```

### 4.1 OAuth Provider Configuration

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Update OAuth 2.0 Client redirect URIs:
   - Add: `https://[NEW_PROJECT_ID].supabase.co/auth/v1/callback`
   - Remove old Lovable Cloud URLs
4. Configure in Supabase: Authentication → Providers → Google

**Discord OAuth:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application → OAuth2
3. Update redirect URIs:
   - Add: `https://[YOUR_DOMAIN]/discord/callback`
   - Add: `https://[NEW_PROJECT_ID].supabase.co/functions/v1/discord-auth`
4. Update `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in edge function secrets

**Twitter/X OAuth:**
1. Go to [Twitter Developer Portal](https://developer.twitter.com)
2. Update callback URLs to your new domain
3. Update `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET`

### 4.2 User Migration Strategy

**CRITICAL: Password hashes cannot be exported from Lovable Cloud.**

#### Recommended: Use Email OTP (No Password Resets!)

With the Email OTP implementation added to the codebase, you can avoid the password reset problem entirely:

1. Export user emails from `auth.users` table (via profiles or direct export)
2. Create users in new Supabase using admin API:
   ```typescript
   await supabase.auth.admin.createUser({
     email: user.email,
     email_confirm: true,
     user_metadata: { /* preserved metadata */ }
   })
   ```
3. **No password reset needed!** Users simply use "Sign in with email code" option
4. Optionally, users can set a new password later if they prefer

#### Alternative: Traditional Password Reset

If you prefer to keep password-based authentication:

1. Create users as above (without passwords)
2. Trigger password reset for all users:
   ```typescript
   await supabase.auth.resetPasswordForEmail(email)
   ```
3. Add prominent notice on login page about password reset requirement

### 4.3 Session Continuity (Optional)

To keep existing sessions valid temporarily:
1. Copy JWT Secret from old project (if accessible)
2. Set it in new project: Settings → API → JWT Secret
3. **Note**: This only extends session validity; password hashes still won't work

### 4.4 Fix Potential Auth Deadlocks

The codebase has 6 `onAuthStateChange` listeners that could cause issues:

**Files to Review:**
- `src/contexts/AuthContext.tsx` (primary - keep)
- `src/pages/Auth.tsx` (PASSWORD_RECOVERY only - keep)
- `src/pages/ResetPassword.tsx` (keep)
- `src/pages/BlogPost.tsx` (consider removing)
- `src/pages/CreatorTerms.tsx` (consider removing)
- `src/pages/PublicCourseDetail.tsx` (consider removing)
- `src/pages/Privacy.tsx` (consider removing)
- `src/pages/Terms.tsx` (consider removing)

**Recommendation:** Consolidate auth state checks to use `useAuth()` hook from AuthContext instead of individual listeners.

---

## Phase 5: External Service Reconfiguration

### 5.1 Payment Webhooks

**Whop:**
1. Log into Whop Dashboard
2. Update webhook URL to: `https://[NEW_PROJECT_ID].supabase.co/functions/v1/whop-webhook`
3. Verify `WHOP_WEBHOOK_SECRET` is configured

**Slash:**
1. Log into Slash Dashboard
2. Update webhook URL to: `https://[NEW_PROJECT_ID].supabase.co/functions/v1/slash-webhook`
3. Verify `SLASH_WEBHOOK_SECRET` is configured

### 5.2 Discord Bot

1. Update bot configuration in Discord Developer Portal
2. Update Interactions Endpoint URL to: `https://[NEW_PROJECT_ID].supabase.co/functions/v1/discord-interactions`
3. Reconfigure Discord webhooks (DISCORD_WEBHOOK_URL, DISCORD_FRAUD_WEBHOOK_URL)
4. Update Discord bot `.env` file in `discord-bot/`:
   ```env
   SUPABASE_URL=https://[NEW_PROJECT_ID].supabase.co
   SUPABASE_FUNCTIONS_URL=https://[NEW_PROJECT_ID].supabase.co/functions/v1
   ```

### 5.3 PostHog

Update the hardcoded key in `src/lib/posthog.ts` if using a different project:
```typescript
posthog.init('[YOUR_POSTHOG_KEY]', {
  api_host: 'https://us.i.posthog.com'
})
```

### 5.4 Email (Resend)

1. Verify `RESEND_API_KEY` is set in edge function secrets
2. Update any hardcoded sender domains if applicable
3. Test email functions: send-password-reset, send-brand-invitation

---

## Phase 6: Frontend Deployment

### 6.1 Environment Configuration

Create `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://[NEW_PROJECT_ID].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[NEW_ANON_KEY]
```

### 6.2 Update Supabase Config

Update `supabase/config.toml`:
```toml
project_id = "[NEW_PROJECT_ID]"
```

### 6.3 Build and Test Locally

```bash
npm install
npm run build
npm run preview
```

### 6.4 Deploy to Hosting Platform

**Vercel:**
```bash
vercel --prod
```
Add environment variables in Vercel Dashboard → Settings → Environment Variables

**Netlify:**
```bash
netlify deploy --prod
```
Add environment variables in Netlify Dashboard → Site Settings → Environment Variables

**Other platforms:** Follow platform-specific deployment guides. All auto-detect Vite.

---

## Phase 7: Mobile App Updates (Capacitor)

### 7.1 Update Configuration

Update `capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  // Update server URL if using live reload
  server: {
    url: 'https://[YOUR_NEW_DOMAIN]'
  }
}
```

### 7.2 Rebuild Apps

```bash
npm run build
npm run cap:sync
npm run cap:ios    # For iOS
npm run cap:android # For Android
```

### 7.3 App Store Updates

Submit new builds to:
- Apple App Store (iOS)
- Google Play Store (Android)

---

## Phase 8: Post-Migration Validation

### 8.1 Authentication Testing

- [ ] Email/password login (after password reset)
- [ ] Google OAuth login
- [ ] Discord OAuth login + account linking
- [ ] X/Twitter account linking
- [ ] Password reset flow
- [ ] Session persistence

### 8.2 Core Features Testing

- [ ] Dashboard loads correctly
- [ ] Campaign creation and management
- [ ] Boost/bounty creation
- [ ] Campaign submissions
- [ ] Video tracking and metrics

### 8.3 Payment Testing

- [ ] Whop checkout flow
- [ ] Wallet top-ups
- [ ] Payout requests
- [ ] Crypto payouts (if applicable)
- [ ] Webhook processing

### 8.4 Integration Testing

- [ ] Discord bot commands
- [ ] Discord notifications
- [ ] Email delivery (Resend)
- [ ] Social media video fetching
- [ ] PostHog analytics events

### 8.5 Admin Features

- [ ] Admin dashboard access
- [ ] User management
- [ ] Fraud detection
- [ ] Payout approvals

---

## Risk Mitigation

### High-Risk Areas

1. **RLS Policies (637+)**: Test all user roles thoroughly
   - Regular user access
   - Brand member access
   - Admin access
   - Public/anonymous access

2. **Financial Operations**: Test with small amounts first
   - Wallet transfers
   - Payout processing
   - Commission calculations

3. **Discord Integration**: Complex OAuth flow
   - Magic link generation
   - Token encryption/decryption

### Rollback Plan

1. Keep Lovable Cloud active during migration (read-only)
2. Maintain DNS ability to switch back quickly
3. Keep database exports for 30 days minimum
4. Document all configuration changes for reversal

---

## Timeline Estimate

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Pre-Migration Preparation | Documentation + exports |
| 2 | Database Migration | Run 353 migrations + data import |
| 3 | Edge Functions | Deploy 78 functions + secrets |
| 4 | Authentication | OAuth config + user migration |
| 5 | External Services | Update 12+ webhook URLs |
| 6 | Frontend Deployment | Build + deploy |
| 7 | Mobile Apps | Rebuild + submit |
| 8 | Validation | Comprehensive testing |

---

## Post-Migration Maintenance

1. **Monitor error rates** for first 2 weeks
2. **Set up alerting** for failed edge functions
3. **Review RLS policy violations** in logs
4. **Track user password reset completion** rate
5. **Verify all scheduled jobs** are running (cron functions)

---

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Auth Migration Guide](https://supabase.com/docs/guides/auth)
