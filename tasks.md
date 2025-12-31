# Brand Workspace Dashboard Improvements

## Overview
Comprehensive overhaul of the brand workspace dashboard focusing on analytics/insights, workflow efficiency, and new feature additions. The existing navigation structure will be preserved while improving the content and capabilities within each tab.

---

## Priority Order
1. **Analytics & Insights** (first priority)
2. Communication System
3. Automation & Workflows
4. Contracts & Content Calendar

---

## 1. Analytics & Performance Dashboard

### 1.1 Performance Snapshot Home
The main dashboard home will focus on a **performance snapshot** with data visualization.

**Time Controls:**
- Custom date picker as the default (no assumed time window)
- Quick presets: Today, This Week, This Month, Last 30 Days, Custom Range

**View Modes (toggle between):**
- **Aggregate view**: All campaigns combined, brand-level metrics
- **Single campaign view**: Drill down into one campaign
- **Comparison view**: Select 2+ campaigns to compare side-by-side

**Key Metrics to Display:**
- Total views, engagement rate, cost per view
- Creator count (active vs total)
- Budget utilization (spent vs remaining)
- Payout velocity (pending, processing, completed)

### 1.2 Creator ROI Tracking

**Per-Campaign Metrics:**
- Cost per view (total spend / total views)
- Cost per engagement
- Individual creator performance vs campaign average
- Views generated per dollar spent

**Lifetime Value View:**
- Total brand spend on creator across all campaigns
- Total views/engagement delivered
- Historical performance trend
- Creator reliability score (based on strike system, see 4.2)

**Display Options:**
- Both per-campaign and lifetime aggregate views available
- Comparative benchmarks: show how each creator performs vs brand average

### 1.3 Audience Insights

**Data Source:** Creator self-reported via existing system
- Creators submit screen recording every 7 days
- Admins assign a score 0-100 per account
- Surface this demographic score in brand analytics

**Display:**
- Demographic score breakdown per creator
- Aggregate audience quality across campaign creators
- Flag creators with outdated submissions (>7 days)

### 1.4 Data Export
- **CSV/Excel export** for all analytics tables
- Export available from any data view (creators, campaigns, performance)

---

## 2. Communication System

### 2.1 1:1 Direct Messages

**Model:** In-app messaging only
- Messages persist in platform
- Email digest for offline users (daily summary of unread messages)
- No push notifications (no mobile app)

**Features:**
- Threaded conversations
- Read receipts
- Message search
- Attach files/images

### 2.2 Announcement Broadcasts

**Targeting:** Simple campaign-based targeting
- Select one or more campaigns
- Broadcast goes to all creators in selected campaign(s)
- No advanced segmentation needed initially

**Features:**
- Rich text formatting
- Schedule broadcasts for future delivery
- Track open/read rates

### 2.3 Discord Integration (Bidirectional)

**Outbound (Platform → Discord):**
- Webhook notifications to Discord channels:
  - New submissions
  - Milestone achievements
  - Payout completions
  - Campaign updates
- Bot with commands to query stats from Discord

**Inbound (Discord → Platform):**
- Role sync: Auto-assign Discord roles based on:
  - Campaign membership
  - Earnings tiers
  - Creator status
- Track role/membership changes (who joined/left)
- Track reaction sentiment on announcement posts (emoji reactions as proxy for reception)

**Implementation Notes:**
- Group/campaign-based discussions happen in Discord (not in-platform)
- Platform serves as source of truth, Discord for community engagement

---

## 3. Automation & Workflows

### 3.1 Milestone Notifications
- Auto-send messages when creators hit thresholds:
  - View milestones (10K, 50K, 100K, etc.)
  - Earning milestones
  - Submission count milestones
- Configurable thresholds per campaign

### 3.2 Performance-Based Tier Changes
- Auto-promote/demote creators between tiers based on metrics
- Tier criteria configurable:
  - Total views delivered
  - Average engagement rate
  - Number of successful videos
  - Reliability score

### 3.3 Auto-Reject Flagged Content
- Content failing certain checks auto-rejected:
  - Duplicate video submissions
  - Wrong format/platform
  - Blacklisted hashtags/content
- Rejection includes reason message to creator

### 3.4 Low Balance Handling (Tiered Approach)
When brand wallet balance gets low during active campaign:

1. **Notify** - Send alerts to brand when approaching threshold
2. **Pause payouts** - Queue payouts but don't process until topped up
3. **Pause campaign** - Auto-pause campaign from accepting new submissions
4. **Auto-charge** - If card on file, auto top-up to minimum threshold

Configure thresholds and which actions trigger at each level.

---

## 4. Contracts & Content Calendar

### 4.1 Simple Agreement Templates

**Template Management:**
- Platform provides default templates
- Brands can customize or create their own

**Features:**
- Fill-in-the-blank fields for specifics (rates, dates, terms)
- E-signature capture
- Template versioning
- Signed contract storage

**Template Types:**
- Standard campaign participation
- Exclusive creator agreements
- Boost/retainer contracts
- Custom

### 4.2 Content Calendar with Negotiated Slots

**Scheduling Model:** Both sides agree on posting slots
- Calendar shows creator availability
- Brand proposes dates
- Creator confirms or suggests alternatives
- Agreed dates locked in

**Missed Date Handling - Strike System:**
- Track missed posting dates per creator
- Strike thresholds configurable
- Too many strikes affects:
  - Creator standing/tier
  - Visibility in discovery
  - Eligibility for future campaigns
- Auto-notifications on missed dates

**Calendar Views:**
- Monthly calendar view
- List view by creator
- List view by date
- Campaign-filtered views

---

## 5. Workflow Improvements

### 5.1 Creator Discovery & Vetting
- Surface demographic scores prominently
- Quick-filter by:
  - Platform
  - Follower count
  - Audience score
  - Past campaign performance
  - Reliability score (from strike system)

### 5.2 Payout Management
- Batch approval for similar payouts
- Quick-action buttons for common operations
- Clear status indicators (pending, processing, completed, flagged)
- Clawback visibility

### 5.3 Campaign Setup
- Template-based quick start
- Clone existing campaigns
- Bulk edit campaign settings

### 5.4 Content Review
- Grid view for quick visual scanning
- Keyboard shortcuts for approve/reject
- Bulk actions on filtered sets
- Side-by-side comparison with brief

---

## Technical Considerations

### Scale Requirements
- Medium scale: 5-20 campaigns, 50-500 creators per brand
- Pre-aggregation needed for performance
- Background jobs for analytics computation
- Cache frequently accessed metrics

### Database
- Add indexes on frequently queried fields
- Materialized views for complex aggregations
- Consider time-series storage for historical metrics

### Real-time Updates
- Use existing Supabase real-time for:
  - Message notifications
  - Payout status changes
  - New submissions

---

## Implementation Phases

### Phase 1: Analytics Foundation
- [ ] Performance snapshot dashboard
- [ ] Creator ROI tracking views
- [ ] Custom date picker controls
- [ ] CSV export functionality
- [ ] View mode toggles (aggregate/single/comparison)

### Phase 2: Communication
- [ ] 1:1 DM system (in-app)
- [ ] Email digest for offline users
- [ ] Announcement broadcast feature
- [ ] Discord webhook integration

### Phase 3: Automation
- [ ] Milestone notification system
- [ ] Tier auto-promotion rules
- [ ] Content auto-rejection rules
- [ ] Low balance handling workflow

### Phase 4: Discord Deep Integration
- [ ] Discord bot with query commands
- [ ] Role sync (platform → Discord)
- [ ] Reaction sentiment tracking (Discord → platform)
- [ ] Membership change tracking

### Phase 5: Contracts & Calendar
- [ ] Agreement template builder
- [ ] E-signature integration
- [ ] Content calendar UI
- [ ] Slot negotiation flow
- [ ] Strike system implementation

---

## Open Questions
- Which e-signature provider to use? (DocuSign, HelloSign, native?)
- Discord bot hosting: self-hosted or serverless?
- How long to retain message history?
- Should strikes ever expire/reset?
