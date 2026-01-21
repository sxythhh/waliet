# Waliet Database Schema Design

## Overview

Waliet is a platform that lets users complete tasks for money, created by businesses who launch these opportunities.

This document proposes the database schema for Waliet, adapted from the Virality schema but simplified to remove video/content-specific and Discord-specific functionality.

---

## Core Tables

### 1. `profiles` - User Accounts

Users who complete tasks and earn money.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  email TEXT,
  phone_number TEXT,
  country TEXT,
  city TEXT,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'business')),

  -- Referral system
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES profiles(id),
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  referral_earnings NUMERIC DEFAULT 0,

  -- Profile settings
  is_private BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,

  -- Skills and preferences
  skills TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',

  -- Notification preferences
  notify_email_new_tasks BOOLEAN DEFAULT true,
  notify_email_transactions BOOLEAN DEFAULT true,
  notify_email_task_updates BOOLEAN DEFAULT true,
  notify_email_payout_status BOOLEAN DEFAULT true,

  -- Account status
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Removed from Virality:**
- Discord integration fields (discord_id, discord_username, etc.)
- Twitter integration fields
- Video-specific fields (views_score, demographics_score, content_styles, etc.)
- XP/Level system (current_xp, current_level, current_rank)
- Tax fields (can be added later if needed)
- Whop integration fields

---

### 2. `businesses` - Task Creators (renamed from `brands`)

Businesses that create task opportunities.

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,

  -- Business details
  business_details JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Subscription/Plan
  subscription_plan TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,

  -- Settings
  settings JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,

  -- Notifications
  notify_new_application BOOLEAN DEFAULT true,
  notify_new_message BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Removed from Virality:**
- Discord/Slack webhook integrations
- Whop integrations
- Close CRM integrations
- Video-specific fraud settings
- Social media handles (can be added via business_details JSONB if needed)

---

### 3. `business_members` - Business Team Members

Links users to businesses they manage.

```sql
CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, user_id)
);
```

---

### 4. `tasks` - Task Opportunities (renamed from `bounty_campaigns`)

Tasks that users can apply to complete.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  requirements TEXT,

  -- Task details
  task_type TEXT DEFAULT 'one_time' CHECK (task_type IN ('one_time', 'recurring', 'ongoing')),
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  skills_required TEXT[] DEFAULT '{}',

  -- Capacity
  max_participants INTEGER DEFAULT 0, -- 0 = unlimited
  current_participants INTEGER DEFAULT 0,

  -- Timeline
  start_date DATE,
  end_date DATE,
  deadline TIMESTAMPTZ,

  -- Payment
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  payment_model TEXT DEFAULT 'fixed' CHECK (payment_model IN ('fixed', 'per_unit', 'hourly')),
  rate_min NUMERIC(10,2),
  rate_max NUMERIC(10,2),
  budget NUMERIC DEFAULT 0,
  budget_used NUMERIC DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  review_status TEXT DEFAULT 'draft' CHECK (review_status IN ('draft', 'pending_review', 'approved', 'rejected')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,

  -- Application settings
  application_questions JSONB DEFAULT '[]',
  is_private BOOLEAN DEFAULT false,

  -- Banner/Media
  banner_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
```

**Removed from Virality:**
- Video-specific fields (videos_per_month, content_style_requirements, content_distribution)
- Discord role assignments
- Blueprint/training integrations
- Shortimize collection
- Bot score/fraud detection for videos
- Tier system for creators

---

### 5. `task_applications` - User Applications (renamed from `bounty_applications`)

Applications from users to complete tasks.

```sql
CREATE TABLE task_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Application content
  application_text TEXT,
  application_answers JSONB,

  -- Rate negotiation (for variable-rate tasks)
  proposed_rate NUMERIC(10,2),
  approved_rate NUMERIC(10,2),
  rate_status TEXT DEFAULT 'pending' CHECK (rate_status IN ('pending', 'proposed', 'approved', 'countered')),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'completed')),

  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(task_id, user_id)
);
```

---

### 6. `task_submissions` - Task Completion Submissions

When users submit completed work for a task.

```sql
CREATE TABLE task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_application_id UUID NOT NULL REFERENCES task_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Submission content
  submission_text TEXT,
  submission_url TEXT,
  attachments JSONB DEFAULT '[]', -- [{url, filename, type}]

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  feedback TEXT,

  -- Review
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),

  -- Payment
  amount_earned NUMERIC(10,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 7. `wallets` - User Wallets

```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) DEFAULT 0,
  total_earned NUMERIC(10,2) DEFAULT 0,
  total_withdrawn NUMERIC(10,2) DEFAULT 0,
  payout_method TEXT CHECK (payout_method IN ('crypto', 'paypal', 'bank', 'wise', 'revolut')),
  payout_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 8. `wallet_transactions` - User Transaction History

```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earning', 'withdrawal', 'referral', 'bonus', 'adjustment', 'transfer_sent', 'transfer_received')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 9. `business_wallets` - Business Wallets

```sql
CREATE TABLE business_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) DEFAULT 0,
  total_deposited NUMERIC(10,2) DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 10. `business_wallet_transactions` - Business Transaction History

```sql
CREATE TABLE business_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'payment', 'refund', 'adjustment')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 11. `payout_requests` - Withdrawal Requests

```sql
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  net_amount NUMERIC,
  payout_method TEXT NOT NULL,
  payout_details JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'rejected')),
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 12. `support_tickets` - Customer Support

```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT CHECK (category IN ('billing', 'technical', 'account', 'task', 'payout', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'awaiting_reply', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_type TEXT DEFAULT 'user' CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 13. `user_roles` - Admin Role Management

```sql
CREATE TYPE app_role AS ENUM ('admin', 'user', 'business');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 14. `referrals` - Referral Tracking

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  referred_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  reward_amount NUMERIC DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15. `task_bookmarks` - Saved Tasks

```sql
CREATE TABLE task_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_id)
);
```

---

## Tables NOT Included

The following Virality tables are **excluded** from Waliet as they are video/content specific:

- `video_submissions` - Video uploads/tracking
- `campaign_videos` - Video metrics
- `social_accounts` - TikTok/Instagram connections
- `discord_*` tables - Discord bot integrations
- `blueprint*` tables - Training/onboarding content
- `boost_*` tables - View-based bonuses
- `creator_*` tables - Creator-specific metrics
- `zktls_verifications` - Video analytics verification
- `deliverable_*` tables - Video deliverables
- `content_slots` - Content scheduling
- `campaigns` tables - Video campaign specific

---

## Summary

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts |
| `businesses` | Companies creating tasks |
| `business_members` | Team access to businesses |
| `tasks` | Task opportunities |
| `task_applications` | User applications for tasks |
| `task_submissions` | Completed work submissions |
| `wallets` | User payment wallets |
| `wallet_transactions` | User transaction history |
| `business_wallets` | Business payment wallets |
| `business_wallet_transactions` | Business transaction history |
| `payout_requests` | Withdrawal requests |
| `support_tickets` | Customer support |
| `ticket_messages` | Support ticket messages |
| `user_roles` | Admin/user role management |
| `referrals` | Referral tracking |
| `task_bookmarks` | Saved tasks |

**Total: 16 tables** (vs 174+ in Virality)

---

## Next Steps

1. Clear existing Waliet Supabase schema
2. Apply this new schema
3. Create necessary functions (wallet transfers, payout processing, etc.)
4. Set up Row Level Security (RLS) policies
5. Test the application
