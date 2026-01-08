# Retainer Campaign Lifecycle Management System

## Executive Summary

This plan outlines the next major feature for boost (retainer) campaigns: a comprehensive **Campaign Lifecycle Management System** that transforms one-time boost relationships into long-term, recurring creator partnerships with automated deliverables tracking, milestone-based progression, and in-platform communication.

Based on competitor analysis (GRIN, Aspire, CreatorIQ) and industry trends, 80%+ of marketers now prioritize long-term influencer relationships. This feature positions the platform as a true creator partnership management solution.

---

## Problem Statement

### Current Gaps Identified

**Brand-Side Limitations:**
1. No recurring payment automation - manual retainer distribution each month
2. No deliverables calendar - brands can't schedule expected content
3. No milestone/tier progression - static creator relationships
4. No in-platform communication - reliance on external channels
5. No contract management - acceptance is informal
6. Limited bulk operations - no batch approvals or tier changes

**Creator-Side Limitations:**
1. No discovery search/filter - can't find boosts by criteria
2. No "My Applications" consolidated view - fragmented status tracking
3. No earnings projections or historical charts
4. No direct messaging with brands
5. No content calendar visibility - unclear on deadlines
6. Missing onboarding and best practices guidance

**System-Level Gaps:**
1. No audit trail for status/tier changes
2. No recurring billing cycle management
3. Incomplete waitlist-to-active progression
4. No performance-based tier automation

---

## Proposed Feature: Retainer Campaign Lifecycle System

### Core Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RETAINER CAMPAIGN LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   RECRUIT    │───>│   ONBOARD    │───>│   PERFORM    │          │
│  │              │    │              │    │              │          │
│  │ - Discovery  │    │ - Contract   │    │ - Deliverables│         │
│  │ - Apply      │    │ - Training   │    │ - Milestones │          │
│  │ - Evaluate   │    │ - Goals      │    │ - Payments   │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│          │                  │                   │                   │
│          │                  │                   ▼                   │
│          │                  │          ┌──────────────┐            │
│          │                  │          │   RENEW OR   │            │
│          │                  │          │   GRADUATE   │            │
│          │                  │          │              │            │
│          │                  │          │ - Tier Up    │            │
│          │                  │          │ - Extend     │            │
│          │                  │          │ - Offboard   │            │
│          │                  │          └──────────────┘            │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════    │
│  │ COMMUNICATION LAYER │ ANALYTICS │ AUTOMATION ENGINE │           │
│  ═══════════════════════════════════════════════════════════════    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Creator Tiers & Progression System

**Duration:** 2-3 weeks
**Priority:** HIGH

### 1.1 Creator Tier Structure

```typescript
interface CreatorTier {
  id: string;
  boost_id: string;
  name: string;                    // "Bronze", "Silver", "Gold", "VIP"
  level: number;                   // 1, 2, 3, 4
  monthly_retainer: number;        // $100, $250, $500, $1000
  videos_per_month: number;        // 2, 4, 8, 12
  perks: string[];                 // ["Priority support", "Early access"]
  promotion_criteria: {
    min_months_active: number;     // 3 months before eligible
    min_avg_views: number;         // Average views per video
    min_completion_rate: number;   // % of quota met
    min_engagement_rate: number;   // Engagement threshold
  };
  demotion_criteria: {
    missed_quotas: number;         // Consecutive months
    min_avg_views: number;         // Below this = warning
  };
}
```

### 1.2 Database Schema

```sql
-- Creator tiers configuration per boost
CREATE TABLE boost_creator_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  monthly_retainer NUMERIC NOT NULL,
  videos_per_month INTEGER NOT NULL,
  perks JSONB DEFAULT '[]',
  promotion_criteria JSONB,
  demotion_criteria JSONB,
  color TEXT,  -- For UI badges
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bounty_campaign_id, level)
);

-- Creator tier assignments
CREATE TABLE creator_tier_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES boost_creator_tiers(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  reason TEXT,  -- "Auto-promoted", "Manual assignment", etc.
  previous_tier_id UUID REFERENCES boost_creator_tiers(id),
  UNIQUE(bounty_campaign_id, user_id)
);

-- Tier change history for auditing
CREATE TABLE tier_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  from_tier_id UUID,
  to_tier_id UUID,
  change_type TEXT CHECK (change_type IN ('promotion', 'demotion', 'manual', 'initial')),
  change_reason TEXT,
  changed_by UUID,
  performance_snapshot JSONB,  -- Metrics at time of change
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 Automatic Tier Progression Engine

```typescript
// Edge function: process-tier-promotions
// Runs monthly after payment cycle

interface TierEvaluationResult {
  user_id: string;
  current_tier: CreatorTier;
  recommendation: 'promote' | 'maintain' | 'demote' | 'warning';
  new_tier?: CreatorTier;
  metrics: {
    months_active: number;
    avg_views: number;
    completion_rate: number;
    engagement_rate: number;
    total_earned: number;
  };
}

// Auto-promotion rules:
// 1. Must meet ALL promotion criteria for next tier
// 2. Must have been in current tier for min_months
// 3. Brand can enable/disable auto-promotion per boost

// Auto-demotion rules:
// 1. Warning after 1 missed quota
// 2. Demotion after 2 consecutive missed quotas
// 3. Grace period for extenuating circumstances (manual override)
```

### 1.4 Brand UI Components

- **Tier Configuration Tab** in boost settings
- **Creator Tier Overview** card showing distribution
- **Tier Assignment Dialog** for manual changes
- **Promotion Queue** showing eligible creators
- **Tier History Timeline** for audit

### 1.5 Creator UI Components

- **My Tier Badge** prominently displayed
- **Progression Tracker** showing path to next tier
- **Tier Benefits Card** listing current perks
- **Milestone Progress** toward promotion

---

## Phase 2: Content Calendar & Deliverables System

**Duration:** 2-3 weeks
**Priority:** HIGH

### 2.1 Deliverables Calendar

```sql
-- Content calendar for scheduled deliverables
CREATE TABLE boost_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  content_type TEXT CHECK (content_type IN ('video', 'story', 'post', 'reel', 'short')),
  platform TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'in_progress', 'submitted', 'approved', 'revision_requested', 'late', 'missed'
  )),
  submission_id UUID REFERENCES video_submissions(id),
  notes TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recurring deliverable templates
CREATE TABLE deliverable_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT,
  platform TEXT,
  recurrence TEXT CHECK (recurrence IN ('weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER,  -- 0-6 for weekly
  day_of_month INTEGER, -- 1-28 for monthly
  auto_create BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Calendar UI

**Brand View:**
- Monthly/weekly calendar with all creator deliverables
- Filter by creator, status, content type
- Drag-and-drop rescheduling
- Bulk create from templates
- Color-coded by status (green=approved, yellow=pending, red=late)

**Creator View:**
- Personal deliverables calendar
- Upcoming deadlines prominently displayed
- One-click "Mark as In Progress"
- Direct link to submit when ready
- Late submission warnings

### 2.3 Reminder System

```typescript
// Automated reminders via edge function
interface DeliverableReminder {
  type: '7_days' | '3_days' | '1_day' | 'overdue';
  channels: ('email' | 'push' | 'discord')[];
  template: string;
}

// Reminder schedule:
// - 7 days before: "Upcoming deliverable"
// - 3 days before: "Deliverable due soon"
// - 1 day before: "Deliverable due tomorrow"
// - Day of: "Deliverable due today"
// - 1 day after: "Overdue deliverable"
// - 3 days after: "Final warning - may affect tier"
```

---

## Phase 3: Billing Cycles & Automated Payments

**Duration:** 2-3 weeks
**Priority:** HIGH

### 3.1 Billing Cycle Management

```sql
-- Billing cycles for each boost
CREATE TABLE boost_billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'processing', 'completed', 'cancelled'
  )),
  total_budget NUMERIC,
  total_paid NUMERIC DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual creator payments per cycle
CREATE TABLE creator_cycle_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_cycle_id UUID REFERENCES boost_billing_cycles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES boost_creator_tiers(id),
  base_amount NUMERIC NOT NULL,  -- Monthly retainer
  bonus_amount NUMERIC DEFAULT 0, -- View bonuses earned
  deductions NUMERIC DEFAULT 0,   -- Missed deliverables
  final_amount NUMERIC NOT NULL,
  videos_submitted INTEGER DEFAULT 0,
  videos_approved INTEGER DEFAULT 0,
  quota_met BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'processing', 'paid', 'disputed'
  )),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Payment Calculation Logic

```typescript
// Monthly payment calculation
interface MonthlyPaymentCalculation {
  creator_id: string;
  tier: CreatorTier;

  // Base calculation
  base_retainer: number;

  // Quota adjustment
  videos_required: number;
  videos_approved: number;
  completion_rate: number;  // approved / required
  quota_penalty: number;    // If < 100%, proportional reduction

  // Bonuses
  view_bonuses: number;     // From milestone/CPM bonuses
  performance_bonus: number; // Exceeding quota bonus

  // Deductions
  late_penalties: number;   // Late deliverables
  missed_penalties: number; // Completely missed deliverables

  // Final
  gross_amount: number;
  deductions: number;
  net_amount: number;
}

// Proration rules:
// - Quota not met: payment = base * (approved / required)
// - Exception: First month = no penalty if > 50%
// - Exceeding quota: Optional bonus of 10% per extra video
```

### 3.3 Automated Processing

```
Monthly Payment Flow:
┌─────────────────────────────────────────────────────────────────┐
│ Day 1 of Month: Close Previous Cycle                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Lock previous cycle (no more submissions count)              │
│ 2. Calculate payments for all creators                          │
│ 3. Apply quota adjustments and bonuses                          │
│ 4. Generate payment summaries                                   │
│ 5. Notify brand of pending approvals                            │
├─────────────────────────────────────────────────────────────────┤
│ Day 1-3: Brand Review Period                                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Brand reviews payment summaries                              │
│ 2. Can dispute/adjust individual payments                       │
│ 3. Bulk approve or individual approve                           │
├─────────────────────────────────────────────────────────────────┤
│ Day 3-5: Processing & Payout                                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Approved payments enter clearing                             │
│ 2. Fraud checks run                                             │
│ 3. Payments released to creator wallets                         │
│ 4. Notifications sent                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 4: In-Platform Messaging

**Duration:** 2 weeks
**Priority:** MEDIUM-HIGH

### 4.1 Messaging Schema

```sql
-- Conversations between brands and creators
CREATE TABLE boost_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  creator_unread_count INTEGER DEFAULT 0,
  brand_unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual messages
CREATE TABLE boost_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES boost_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT CHECK (sender_type IN ('creator', 'brand', 'system')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN (
    'text', 'image', 'file', 'deliverable_reminder', 'payment_notification',
    'tier_change', 'system_alert'
  )),
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Broadcast messages to all creators in a boost
CREATE TABLE boost_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  subject TEXT,
  content TEXT NOT NULL,
  target_tiers UUID[],  -- Optional: only send to specific tiers
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Messaging Features

**Brand Capabilities:**
- 1:1 messaging with any creator in boost
- Broadcast announcements to all or tier-specific
- Message templates for common communications
- Schedule messages for future delivery
- Attach files, images, links
- See delivery/read receipts

**Creator Capabilities:**
- Direct message brand team
- Reply to broadcasts
- Receive system notifications in thread
- File sharing for deliverable discussions

**System Messages:**
- Deliverable reminders auto-posted
- Payment notifications
- Tier changes
- Application updates

### 4.3 Real-time Implementation

```typescript
// Supabase Realtime subscription
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'boost_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Add new message to UI
  })
  .subscribe();
```

---

## Phase 5: Contract & Agreement Management

**Duration:** 1-2 weeks
**Priority:** MEDIUM

### 5.1 Contract System

```sql
-- Contract templates per boost
CREATE TABLE boost_contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,  -- Markdown with {{variables}}
  variables JSONB DEFAULT '[]',  -- ["creator_name", "tier_name", "start_date"]
  tier_id UUID REFERENCES boost_creator_tiers(id),  -- Optional tier-specific
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Signed contracts
CREATE TABLE creator_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES boost_contract_templates(id),
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES boost_creator_tiers(id),
  rendered_content TEXT NOT NULL,  -- Final contract with variables filled
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'viewed', 'signed', 'expired', 'terminated'
  )),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_data JSONB,  -- IP, timestamp, consent checkbox
  expires_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 Contract Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Brand creates contract template with variables           │
│    - Standard terms, payment schedule, deliverables         │
│    - Tier-specific modifications                            │
├─────────────────────────────────────────────────────────────┤
│ 2. Creator accepted to boost                                │
│    - Contract auto-generated from template                  │
│    - Variables filled (name, tier, dates, compensation)     │
├─────────────────────────────────────────────────────────────┤
│ 3. Creator reviews and signs                                │
│    - In-platform viewing                                    │
│    - Digital signature (checkbox + timestamp)               │
│    - PDF download available                                 │
├─────────────────────────────────────────────────────────────┤
│ 4. Contract active                                          │
│    - Both parties have access                               │
│    - Renewal reminders before expiry                        │
│    - Amendment process for changes                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 6: Enhanced Discovery & Analytics

**Duration:** 2 weeks
**Priority:** MEDIUM

### 6.1 Creator Discovery Improvements

**Search & Filter:**
- Full-text search on boost titles, descriptions
- Filter by: category, monthly retainer range, videos required
- Filter by: experience level, content type, availability
- Sort by: newest, highest paying, most spots, ending soon

**Personalized Recommendations:**
- Based on creator's connected accounts and niches
- Match creator demographics to boost targeting
- "You might be a good fit" scoring

### 6.2 Creator Analytics Dashboard

```typescript
interface CreatorBoostAnalytics {
  // Earnings overview
  total_earned_all_time: number;
  total_earned_this_month: number;
  earnings_by_month: { month: string; amount: number }[];
  projected_monthly: number;  // Based on current performance

  // Performance metrics
  videos_submitted: number;
  videos_approved: number;
  approval_rate: number;
  total_views: number;
  avg_views_per_video: number;

  // Tier progression
  current_tier: CreatorTier;
  next_tier?: CreatorTier;
  progress_to_next: number;  // 0-100%
  metrics_vs_requirements: {
    metric: string;
    current: number;
    required: number;
    met: boolean;
  }[];

  // Comparisons (anonymous)
  percentile_views: number;     // "Top 20% of creators"
  percentile_completion: number; // "Top 10% completion rate"
}
```

### 6.3 Brand Analytics Improvements

**New Metrics:**
- ROI per creator (views/cost)
- Tier distribution chart
- Churn rate by tier
- Average creator tenure
- Deliverable completion trends
- Payment forecast

---

## Implementation Priority Matrix

| Phase | Feature | Effort | Impact | Priority |
|-------|---------|--------|--------|----------|
| 1 | Creator Tiers | Medium | High | P0 |
| 2 | Content Calendar | Medium | High | P0 |
| 3 | Billing Cycles | High | High | P0 |
| 4 | In-Platform Messaging | Medium | Medium | P1 |
| 5 | Contracts | Low | Medium | P1 |
| 6 | Enhanced Discovery | Medium | Medium | P2 |

---

## Technical Dependencies

### New Edge Functions Required
1. `process-monthly-billing-cycle` - Monthly payment automation
2. `evaluate-tier-promotions` - Automatic tier progression
3. `send-deliverable-reminders` - Scheduled reminder system
4. `generate-creator-contract` - Contract rendering

### Database Migrations
- 6 new tables for tiers, deliverables, billing, messaging, contracts
- Indexes for performance on new queries
- RLS policies for all new tables

### Real-time Subscriptions
- Messaging (new messages, read receipts)
- Deliverable status changes
- Payment notifications

### Integrations
- Discord: Tier change announcements, deliverable reminders
- Email: Payment summaries, contract signing requests
- Push notifications: Mobile reminders

---

## Success Metrics

**Brand Adoption:**
- 50%+ of active boosts use tier system within 3 months
- 70%+ use content calendar for deliverables
- 40% reduction in manual payment processing time

**Creator Engagement:**
- 30%+ increase in quota completion rate
- 25%+ reduction in late deliverables
- 20%+ increase in creator retention (>3 months)

**Platform Growth:**
- 2x increase in average boost duration (from ~2 months to ~4 months)
- 30% increase in total creator earnings (tier progression)
- 15% reduction in churn (better communication)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Complexity overwhelming brands | Progressive disclosure - start simple, unlock advanced |
| Creators confused by tiers | Clear onboarding, tier explainer, progress visualization |
| Payment disputes | Detailed breakdowns, dispute workflow, audit trail |
| Message spam | Rate limiting, report/block functionality |
| Contract liability | Legal review of templates, clear "platform is not party" |

---

## Next Steps

1. **Validate priority** with user research/feedback
2. **Design system** mockups for tier and calendar UI
3. **Database migration** planning and testing
4. **Phase 1 development** sprint planning
5. **Beta testing** with select brands

---

*Document created: 2026-01-06*
*Version: 1.0*
