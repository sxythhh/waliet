# Virality Platform Documentation

> Comprehensive platform documentation covering sitemap, user flows, features, integrations, and backend services.

**Last Updated:** January 14, 2026

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Sitemap & Routing](#sitemap--routing)
3. [Creator Persona](#creator-persona)
4. [Brand Persona](#brand-persona)
5. [Admin Persona](#admin-persona)
6. [Third-Party Integrations](#third-party-integrations)
7. [Edge Functions Catalog](#edge-functions-catalog)

---

## Platform Overview

Virality is a creator marketplace platform that connects brands with content creators. The platform facilitates:

- **Campaigns (Clipping)**: Pay-per-view opportunities where creators submit content and earn based on verified views
- **Boosts (Retainers)**: Fixed-rate creator partnerships with ongoing content requirements
- **Wallet System**: Integrated payment infrastructure with Stripe, crypto (Coinbase/Slash), and internal transfers
- **Analytics**: Real-time view tracking across TikTok, YouTube, Instagram, and X

### Tech Stack
- **Frontend**: React + Vite + TypeScript
- **UI**: Shadcn/UI + Tailwind CSS + Radix UI
- **State**: TanStack Query
- **Backend**: Supabase (Postgres + Edge Functions)
- **Auth**: Supabase Auth (Email OTP + Discord OAuth)
- **Mobile**: Capacitor (iOS/Android)
- **Deployment**: Vercel

---

## Sitemap & Routing

### Public Routes (No Auth Required)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | LandingPage | Marketing landing page |
| `/auth` | AuthPage | Login/signup with email OTP or Discord |
| `/auth/callback` | AuthCallback | OAuth callback handler |
| `/c/:slug` | PublicCampaignPage | Public campaign view (join page) |
| `/b/:slug` | PublicCampaignPage | Public boost view |
| `/brand/:slug` | BrandPage | Public brand profile |
| `/legal/terms` | TermsPage | Terms of service |
| `/legal/privacy` | PrivacyPage | Privacy policy |
| `/invite/:code` | InvitePage | Referral invite handler |

### Authenticated Routes (Creator/Brand)

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | Dashboard | Main dashboard (role-based content) |
| `/dashboard?tab=campaigns` | CampaignsTab | Creator's joined campaigns |
| `/dashboard?tab=wallet` | WalletTab | Wallet balance & transactions |
| `/dashboard?tab=settings` | SettingsTab | Profile & account settings |
| `/dashboard?tab=referrals` | ReferralsTab | Referral program |
| `/source/:slug` | SourceDetailsPage | Campaign/boost detail page |
| `/source/:slug/submit` | SubmitVideoPage | Video submission flow |
| `/source/:slug/training` | TrainingPage | Campaign training modules |
| `/onboarding` | OnboardingPage | New user onboarding flow |
| `/connect/tiktok` | TikTokConnect | TikTok OAuth flow |
| `/connect/youtube` | YouTubeConnect | YouTube OAuth flow |
| `/connect/instagram` | InstagramConnect | Instagram OAuth flow |
| `/connect/x` | XConnect | X/Twitter OAuth flow |

### Brand Dashboard Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard?tab=brand-campaigns` | BrandCampaignsTab | Brand's campaigns list |
| `/dashboard?tab=brand-blueprints` | BrandBlueprintsTab | Submission blueprints |
| `/dashboard?tab=brand-wallet` | BrandWalletTab | Brand wallet & payouts |
| `/dashboard?tab=brand-team` | BrandTeamTab | Team management |
| `/brand/create-campaign` | CreateCampaignPage | Campaign creation wizard |
| `/brand/campaign/:id` | CampaignDashboard | Campaign management |
| `/brand/campaign/:id/submissions` | SubmissionsPage | Review submissions |
| `/brand/campaign/:id/members` | MembersPage | Campaign members |
| `/brand/campaign/:id/analytics` | AnalyticsPage | Campaign analytics |
| `/brand/campaign/:id/settings` | CampaignSettings | Campaign configuration |

### Admin Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | AdminDashboard | Admin overview |
| `/admin/users` | UsersAdmin | User management |
| `/admin/brands` | BrandsAdmin | Brand management |
| `/admin/campaigns` | CampaignsAdmin | All campaigns |
| `/admin/submissions` | SubmissionsAdmin | All submissions |
| `/admin/payouts` | PayoutsAdmin | Payout management |
| `/admin/wallets` | WalletsAdmin | Wallet overview |
| `/admin/analytics` | AnalyticsAdmin | Platform analytics |
| `/admin/moderation` | ModerationAdmin | Content moderation |
| `/admin/security` | SecurityAdmin | Security logs |

---

## Creator Persona

### 1. Onboarding Flow

**Entry Points:**
- Direct signup at `/auth`
- Campaign invite link `/c/:slug`
- Referral link `/invite/:code`

**Steps:**
1. Email OTP or Discord OAuth authentication
2. Profile setup (username, display name, avatar)
3. Social account connection (TikTok, YouTube, Instagram, X)
4. Wallet setup (optional crypto wallet connection)
5. First campaign discovery

**Components:**
- `OnboardingPage.tsx` - Main onboarding wizard
- `ProfileSetupStep.tsx` - Profile creation
- `SocialConnectStep.tsx` - Platform connections
- `WalletSetupStep.tsx` - Payment setup

### 2. Dashboard

**Main View (`/dashboard`):**
- Active campaigns overview
- Recent earnings summary
- Pending submissions status
- Wallet balance widget

**Tabs:**
- **Campaigns**: Joined campaigns grid with status filters
- **Wallet**: Balance, transactions, withdrawal
- **Settings**: Profile, notifications, connected accounts
- **Referrals**: Referral code, earnings, invited users

### 3. Campaign Discovery & Joining

**Public Campaign Page (`/c/:slug`):**
- Campaign banner and branding
- Payment model (per-view rates or flat rate)
- Requirements and guidelines
- Creator requirements (followers, platforms)
- "Join Campaign" CTA

**Join Flow:**
1. Check eligibility (connected platforms, follower count)
2. Accept campaign terms
3. Complete training (if required)
4. Access submission portal

### 4. Source Details (Campaign/Boost View)

**Layout Components:**
- `SourceDetailsPage.tsx` - Main container
- `SourceDetailsLeftSidebar.tsx` - Navigation & info
- `SourceDetailsMobileLayout.tsx` - Mobile-optimized view

**Sections:**
- **Feed**: Campaign announcements and updates
- **Training**: Required training modules with progress
- **Assets**: Downloadable brand assets
- **Discord**: Community integration
- **Contract**: Digital agreement (for boosts)
- **Submit**: Video submission portal

### 5. Video Submission

**Submission Flow:**
1. Select connected platform (TikTok/YouTube/Instagram/X)
2. Enter video URL
3. Video validation (ownership, metrics access)
4. Blueprint selection (if applicable)
5. Submit for review

**Components:**
- `SubmitVideoPage.tsx` - Submission form
- `VideoPreview.tsx` - Video embed preview
- `BlueprintSelector.tsx` - Content blueprint picker
- `SubmissionStatus.tsx` - Status tracker

### 6. Earnings & Wallet

**Wallet Features:**
- Real-time balance display
- Transaction history with filters
- Pending earnings tracker
- Withdrawal to:
  - Bank account (Stripe)
  - Crypto wallet (USDC/ETH)
  - Internal transfer

**Components:**
- `WalletTab.tsx` - Main wallet view
- `TransactionList.tsx` - Transaction history
- `WithdrawModal.tsx` - Withdrawal flow
- `EarningsChart.tsx` - Earnings visualization

### 7. Profile & Settings

**Profile Settings:**
- Display name & username
- Avatar upload
- Bio & social links
- Notification preferences

**Connected Accounts:**
- TikTok connection status
- YouTube connection status
- Instagram connection status
- X/Twitter connection status
- Discord connection

**Payment Settings:**
- Bank account (Stripe Connect)
- Crypto wallet addresses
- Payout preferences

### 8. Training System

**Training Modules:**
- Video-based lessons
- Quiz questions
- Progress tracking
- Completion certificates

**Components:**
- `TrainingPage.tsx` - Training module viewer
- `ModuleCard.tsx` - Module overview
- `QuizComponent.tsx` - Interactive quiz
- `ProgressTracker.tsx` - Completion status

### 9. Notifications

**Notification Types:**
- Campaign announcements
- Submission status updates
- Payment notifications
- New campaign invites

**Delivery Channels:**
- In-app notifications
- Email notifications
- Push notifications (mobile)
- Discord DMs (if connected)

### 10. Referral Program

**Features:**
- Unique referral code
- Shareable referral link
- Earnings per referral
- Referral leaderboard

---

## Brand Persona

### 1. Brand Onboarding

**Steps:**
1. Email verification
2. Brand profile creation
3. Logo and banner upload
4. Team member invites
5. Wallet funding

**Components:**
- `BrandOnboarding.tsx` - Onboarding wizard
- `BrandProfileSetup.tsx` - Brand details
- `TeamInvite.tsx` - Team member invitations

### 2. Brand Dashboard

**Overview Widgets:**
- Active campaigns count
- Total spend
- Creator count
- View metrics

**Tabs:**
- **Campaigns**: Campaign management grid
- **Blueprints**: Submission templates
- **Wallet**: Brand wallet & transactions
- **Team**: Team member management

### 3. Campaign Creation

**Campaign Types:**
- **Clipping Campaign**: Pay-per-view model
- **Boost Campaign**: Retainer/flat-rate model

**Creation Steps:**
1. Campaign type selection
2. Basic info (title, description)
3. Banner and branding
4. Payment configuration
5. Requirements setup
6. Training module creation (optional)
7. Asset upload (optional)
8. Review and publish

**Components:**
- `CreateCampaignPage.tsx` - Creation wizard
- `CampaignTypeSelector.tsx` - Type picker
- `PaymentConfigStep.tsx` - Rate configuration
- `RequirementsStep.tsx` - Creator requirements
- `TrainingBuilderStep.tsx` - Training editor

### 4. Campaign Management

**Campaign Dashboard (`/brand/campaign/:id`):**
- Performance overview
- Member management
- Submission review queue
- Analytics dashboard
- Settings & configuration

**Sections:**
- **Overview**: Key metrics and status
- **Members**: Joined creators list
- **Submissions**: Review queue
- **Analytics**: Performance charts
- **Settings**: Campaign configuration

### 5. Submission Review

**Review Queue:**
- Pending submissions list
- Video preview
- Creator information
- View metrics (if available)

**Actions:**
- Approve submission
- Reject with feedback
- Request revision
- Bulk actions

**Components:**
- `SubmissionQueue.tsx` - Queue view
- `SubmissionCard.tsx` - Individual submission
- `ReviewActions.tsx` - Approval/rejection
- `FeedbackModal.tsx` - Rejection feedback

### 6. Blueprint System

**Blueprint Features:**
- Content templates
- Required elements checklist
- Example content
- Platform-specific variations

**Components:**
- `BlueprintList.tsx` - Blueprint gallery
- `BlueprintEditor.tsx` - Blueprint creation
- `BlueprintPreview.tsx` - Template preview

### 7. Brand Wallet

**Wallet Features:**
- Campaign funding
- Automatic payout processing
- Transaction history
- Budget alerts

**Funding Methods:**
- Credit/debit card (Stripe)
- Bank transfer (ACH)
- Crypto (USDC via Coinbase/Slash)

**Components:**
- `BrandWalletTab.tsx` - Wallet overview
- `FundCampaignModal.tsx` - Add funds
- `PayoutHistory.tsx` - Payout records

### 8. Team Management

**Team Roles:**
- Owner: Full access
- Admin: Campaign management
- Member: View-only access

**Features:**
- Invite by email
- Role assignment
- Access revocation
- Activity logs

### 9. Analytics Dashboard

**Metrics:**
- Total views
- Engagement rate
- Cost per view
- Top performing creators
- Platform breakdown

**Visualizations:**
- Views over time
- Platform distribution
- Creator leaderboard
- Budget utilization

### 10. Campaign Settings

**Configurable Options:**
- Campaign status (active/paused/ended)
- Payment rates
- Creator requirements
- Auto-approval settings
- Notification preferences

---

## Admin Persona

### 1. Admin Dashboard

**Overview Widgets:**
- Total users count
- Active campaigns
- Pending submissions
- Platform revenue

**Quick Actions:**
- Review flagged content
- Process payouts
- Moderate submissions
- View security alerts

### 2. User Management

**Features:**
- User search and filtering
- Profile viewing/editing
- Role assignment
- Account suspension
- Wallet adjustments

**Components:**
- `UsersAdmin.tsx` - User list
- `UserDetail.tsx` - Individual user
- `UserActions.tsx` - Admin actions

### 3. Brand Management

**Features:**
- Brand verification
- Brand profile editing
- Wallet management
- Campaign oversight

### 4. Campaign Oversight

**Features:**
- All campaigns view
- Campaign moderation
- Force status changes
- Budget adjustments

### 5. Submission Moderation

**Features:**
- Global submission queue
- Content moderation
- Flagged content review
- Bulk processing

### 6. Payout Management

**Features:**
- Pending payouts queue
- Manual payout processing
- Failed payout resolution
- Payout history

### 7. Wallet Administration

**Features:**
- Global wallet overview
- Manual adjustments
- Transaction investigation
- Balance corrections

### 8. Platform Analytics

**Metrics:**
- User growth
- Campaign activity
- Revenue tracking
- Platform health

### 9. Content Moderation

**Features:**
- Reported content queue
- Automated flagging
- Manual review
- Action logging

### 10. Security Administration

**Features:**
- Login audit logs
- Suspicious activity alerts
- IP blocking
- Rate limit management

### 11. System Configuration

**Settings:**
- Platform fees
- Payout thresholds
- Feature flags
- Maintenance mode

### 12. Support Tools

**Features:**
- User impersonation
- Ticket integration
- Debug tools
- Error logs

---

## Third-Party Integrations

### 1. Authentication

| Provider | Purpose | Implementation |
|----------|---------|----------------|
| Supabase Auth | Email OTP | Native integration |
| Discord OAuth | Social login + community | OAuth 2.0 flow |

### 2. Social Platforms

| Platform | Features | API |
|----------|----------|-----|
| TikTok | Video verification, view tracking | TikTok API v2 |
| YouTube | Video verification, analytics | YouTube Data API v3 |
| Instagram | Video verification, metrics | Instagram Basic Display API |
| X/Twitter | Video verification, engagement | Twitter API v2 |

### 3. Payment Processing

| Provider | Purpose | Features |
|----------|---------|----------|
| Stripe | Card payments, payouts | Connect, Checkout, Transfers |
| Coinbase Commerce | Crypto payments | USDC/ETH deposits |
| Slash | Crypto payouts | USDC transfers |

### 4. Communication

| Service | Purpose | Features |
|---------|---------|----------|
| Discord | Community, notifications | Bot integration, webhooks |
| Resend | Transactional email | Email templates, delivery |
| OneSignal | Push notifications | Mobile push |

### 5. Storage & Media

| Service | Purpose | Features |
|---------|---------|----------|
| Supabase Storage | File uploads | Images, documents |
| Cloudflare R2 | Video storage | Large file handling |

### 6. Analytics & Monitoring

| Service | Purpose | Features |
|---------|---------|----------|
| PostHog | Product analytics | Events, funnels, feature flags |
| Sentry | Error tracking | Error monitoring |
| Vercel Analytics | Web vitals | Performance monitoring |

### 7. Content Import

| Service | Purpose | Status |
|---------|---------|--------|
| Google Docs | Training content import | Implemented |
| Notion | Training content import | Implemented |

### 8. Verification & Identity

| Service | Purpose | Features |
|---------|---------|----------|
| Reclaim Protocol | Social verification | Proof generation |

### 9. AI Services

| Service | Purpose | Features |
|---------|---------|----------|
| OpenAI | Content analysis | GPT-4 for moderation |
| Anthropic Claude | Content generation | Training content |

### 10. Infrastructure

| Service | Purpose | Features |
|---------|---------|----------|
| Vercel | Hosting | Edge functions, CDN |
| Supabase | Database | Postgres, Realtime |
| Upstash | Rate limiting | Redis caching |

---

## Edge Functions Catalog

### Authentication & OAuth (8 functions)

| Function | Purpose |
|----------|---------|
| `discord-oauth` | Discord OAuth flow |
| `discord-callback` | Discord OAuth callback |
| `tiktok-oauth` | TikTok OAuth initiation |
| `tiktok-callback` | TikTok OAuth callback |
| `youtube-oauth` | YouTube OAuth flow |
| `instagram-oauth` | Instagram OAuth flow |
| `x-oauth` | X/Twitter OAuth flow |
| `refresh-social-tokens` | Token refresh handler |

### Social Platform APIs (12 functions)

| Function | Purpose |
|----------|---------|
| `tiktok-verify-video` | Verify TikTok video ownership |
| `tiktok-get-metrics` | Fetch TikTok video metrics |
| `youtube-verify-video` | Verify YouTube video ownership |
| `youtube-get-metrics` | Fetch YouTube video metrics |
| `instagram-verify-video` | Verify Instagram video ownership |
| `instagram-get-metrics` | Fetch Instagram video metrics |
| `x-verify-video` | Verify X video ownership |
| `x-get-metrics` | Fetch X video metrics |
| `fetch-all-metrics` | Aggregate metrics fetch |
| `sync-social-accounts` | Sync connected accounts |
| `validate-creator-eligibility` | Check creator requirements |
| `update-video-stats` | Periodic stats update |

### Payment Processing (15 functions)

| Function | Purpose |
|----------|---------|
| `stripe-checkout` | Create Stripe checkout session |
| `stripe-webhook` | Handle Stripe webhooks |
| `stripe-connect-onboard` | Stripe Connect onboarding |
| `stripe-payout` | Process Stripe payouts |
| `coinbase-webhook` | Coinbase Commerce webhooks |
| `coinbase-create-charge` | Create crypto charge |
| `slash-payout` | Process Slash crypto payouts |
| `slash-webhook` | Handle Slash webhooks |
| `process-campaign-payouts` | Automated campaign payouts |
| `calculate-earnings` | Calculate creator earnings |
| `wallet-transfer` | Internal wallet transfers |
| `wallet-withdraw` | Withdrawal processing |
| `verify-payout-eligibility` | Check payout requirements |
| `generate-payout-report` | Create payout reports |
| `refund-processing` | Handle refunds |

### Campaign Management (10 functions)

| Function | Purpose |
|----------|---------|
| `create-campaign` | Campaign creation |
| `update-campaign` | Campaign updates |
| `campaign-status-change` | Status transitions |
| `join-campaign` | Creator join flow |
| `leave-campaign` | Creator leave handling |
| `campaign-invite` | Invitation generation |
| `campaign-analytics` | Analytics aggregation |
| `blueprint-management` | Blueprint CRUD |
| `training-progress` | Training tracking |
| `campaign-budget-check` | Budget validation |

### Submission Processing (8 functions)

| Function | Purpose |
|----------|---------|
| `submit-video` | Video submission handler |
| `validate-submission` | Submission validation |
| `approve-submission` | Approval processing |
| `reject-submission` | Rejection handling |
| `bulk-submission-action` | Bulk operations |
| `submission-metrics-sync` | Metrics synchronization |
| `auto-approve-check` | Automated approval |
| `submission-notifications` | Status notifications |

### Notifications (6 functions)

| Function | Purpose |
|----------|---------|
| `send-email` | Email dispatch via Resend |
| `discord-notify` | Discord webhook notifications |
| `push-notification` | Mobile push via OneSignal |
| `notification-preferences` | Preference management |
| `batch-notifications` | Bulk notification sending |
| `notification-templates` | Template management |

### User Management (8 functions)

| Function | Purpose |
|----------|---------|
| `profile-update` | Profile updates |
| `avatar-upload` | Avatar processing |
| `username-check` | Username availability |
| `referral-tracking` | Referral attribution |
| `user-analytics` | User metrics |
| `account-deletion` | Account removal |
| `data-export` | GDPR data export |
| `impersonation` | Admin impersonation |

### Content Import (4 functions)

| Function | Purpose |
|----------|---------|
| `google-docs-auth` | Google OAuth for Docs |
| `google-docs-import` | Document import |
| `notion-auth` | Notion OAuth |
| `notion-import` | Notion page import |

### Admin Operations (12 functions)

| Function | Purpose |
|----------|---------|
| `admin-user-action` | User management |
| `admin-brand-action` | Brand management |
| `admin-campaign-action` | Campaign override |
| `admin-wallet-adjust` | Wallet adjustments |
| `admin-moderation` | Content moderation |
| `admin-analytics` | Platform analytics |
| `admin-payout-process` | Manual payouts |
| `admin-audit-log` | Audit logging |
| `admin-security-check` | Security monitoring |
| `admin-feature-flag` | Feature flag management |
| `admin-maintenance` | Maintenance mode |
| `admin-reports` | Report generation |

### Scheduled Jobs (9 functions)

| Function | Purpose |
|----------|---------|
| `cron-metrics-sync` | Hourly metrics sync |
| `cron-payout-process` | Daily payout processing |
| `cron-token-refresh` | Token refresh job |
| `cron-campaign-status` | Campaign status updates |
| `cron-cleanup` | Data cleanup |
| `cron-analytics-aggregate` | Analytics aggregation |
| `cron-notification-digest` | Notification digests |
| `cron-budget-alerts` | Budget warning alerts |
| `cron-health-check` | System health checks |

---

## Appendix: Key Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles |
| `brands` | Brand accounts |
| `brand_members` | Brand team members |
| `campaigns` | Campaign definitions |
| `campaign_members` | Creator memberships |
| `submissions` | Video submissions |
| `wallets` | User/brand wallets |
| `transactions` | Financial transactions |
| `payouts` | Payout records |
| `social_accounts` | Connected platforms |
| `training_modules` | Training content |
| `training_progress` | Completion tracking |
| `blueprints` | Submission blueprints |
| `notifications` | Notification records |
| `referrals` | Referral tracking |
| `audit_logs` | Admin audit trail |

---

*Documentation generated by Claude Code exploration agents*
