# Payment Fraud Detection & Automation System

## Overview

This specification defines an automated fraud detection and payout review system to reduce manual admin work while mitigating view inflation and payout manipulation fraud.

**Goals:**
- Automate payout approval for low-risk creators
- Detect view inflation (bot traffic) and payout manipulation
- Reduce admin time spent on manual payout reviews and fraud flagging
- Fix view count reconciliation issues (stale data)

---

## 1. Fraud Detection Signals

### 1.1 Engagement Rate Check

**Primary metric:** Comments-to-views ratio

| Signal | Threshold | Action |
|--------|-----------|--------|
| Low engagement | < 0.1% (1 comment per 1,000 views) | Flag for review |

**Fallback when comments disabled:** Use likes-to-views or shares-to-views ratio instead.

**Brand-configurable presets:**
| Preset | Engagement Threshold |
|--------|---------------------|
| Strict | < 0.15% |
| Normal | < 0.1% (default) |
| Lenient | < 0.05% |

### 1.2 View Velocity Spike

**Signal:** Views increase 10x or more within a short period (hours, not days)

**Detection:** Compare current view count against view count from previous sync. If `current_views / previous_views >= 10` and time delta < 24 hours, flag for review.

### 1.3 New Creator + High Payout

**Signal:** Account age < 30 days AND payout request > $100

**Rationale:** New accounts haven't established trust and are higher fraud risk.

### 1.4 Previous Fraud Flag

**Signal:** Creator has any previous confirmed fraud (clawback executed)

**Duration:** Permanent - flag never expires

**Action:** All payouts from this creator require manual review regardless of other signals.

---

## 2. Payout Auto-Approval Logic

### 2.1 Payout Tiers

| Tier | Amount Range | Description |
|------|--------------|-------------|
| Micro | $0 - $50 | Very small payouts |
| Small | $50 - $200 | Typical creator payouts |
| Medium | $200 - $1,000 | Successful campaign participation |
| Large | $1,000+ | Top performer payouts |

### 2.2 Auto-Approval Matrix

A payout is auto-approved if ALL conditions are met:
- No fraud signals triggered (engagement, velocity, new creator, previous flag)
- Trust score meets threshold for payout tier
- Creator has clean payout history (no previous rejections in last 90 days)

| Tier | Min Trust Score | Additional Requirements |
|------|-----------------|------------------------|
| Micro | 60 | None |
| Small | 70 | Account age > 14 days |
| Medium | 80 | Account age > 30 days, 3+ successful payouts |
| Large | 90 | Account age > 60 days, 5+ successful payouts |

### 2.3 Failure Path

When auto-approval fails:
1. System sends email to creator requesting screen recording evidence
2. Creator has **48 hours** to submit evidence
3. Admin reviews evidence and approves/rejects
4. If no evidence submitted within deadline → **auto-reject payout**

---

## 3. Evidence Collection

### 3.1 Required Evidence

**Format:** Screen recording of platform analytics dashboard

**Must show:**
- View source breakdown (e.g., "For You" vs direct)
- Geographic distribution of viewers
- Watch time / average view duration
- Engagement metrics (likes, comments, shares)

### 3.2 Upload Specifications

| Attribute | Value |
|-----------|-------|
| Max file size | 100 MB |
| Storage | Supabase Storage |
| Allowed formats | MP4, MOV, WebM |
| Fallback | External link (YouTube, Loom) if upload fails |

### 3.3 Evidence Request Flow

```
Payout Request
     │
     ▼
Auto-Approval Check
     │
     ├─── PASS ──→ Proceed to clearing period (existing 7-day flow)
     │
     └─── FAIL ──→ Send evidence request email
                        │
                        ▼
                   48-hour deadline
                        │
                   ┌────┴────┐
                   │         │
              Evidence    No Evidence
              Submitted   Submitted
                   │         │
                   ▼         ▼
              Admin      Auto-Reject
              Review     Payout
                   │
              ┌────┴────┐
              │         │
           Approve    Reject
              │         │
              ▼         ▼
           Continue   Notify
           to clear   Creator
```

### 3.4 Upload Failure Handling

If Supabase Storage upload fails:
1. Retry up to 3 times
2. If still failing, show fallback option to paste external link
3. Accept YouTube, Loom, Google Drive, or Dropbox links

---

## 4. View Count Reconciliation

### 4.1 Problem

View counts from platform APIs change after payment is calculated, causing ledger entries to become stale.

### 4.2 Solution

**Lock views at payout request time:**
- When creator requests payout, snapshot current view count
- Store in `payment_ledger.views_snapshot`
- This locked value is used for all payment calculations
- No updates allowed after payout request

### 4.3 API Failure Handling

If platform API is unavailable when fetching views:
- Use most recent cached value from `cached_campaign_videos.views`
- Note in ledger metadata that cached value was used
- Proceed with payout (do not block on API availability)

---

## 5. Fraud Confirmation Consequences

### 5.1 Trust Score Penalty

When fraud is confirmed (clawback executed):

```
penalty = base_penalty + (fraud_amount * multiplier)

where:
  base_penalty = 10 points
  multiplier = 0.01 (1 point per $100 defrauded)

Example: $500 fraud → 10 + (500 * 0.01) = 15 point penalty
```

### 5.2 Creator Status Changes

| Action | Trigger |
|--------|---------|
| Permanent fraud flag | Any confirmed fraud |
| Earnings paused | Under investigation |
| Flagged on campaigns | Pending review (brand decides removal) |
| Account banned | Repeat offenders (3+ confirmed frauds) |

### 5.3 Ban Enforcement

When creator is banned:
- IP address blocked
- Device fingerprint blocked
- Email domain flagged (if personal domain)
- Phone number blocked

### 5.4 Brand Notifications

Brands are **only notified if they have opted in** to fraud notifications.

Setting location: Brand settings → Notifications → "Notify me of creator fraud"

---

## 6. Partial Fraud Handling

### 6.1 Multiple Videos in One Payout

If a payout request contains multiple videos and only some are flagged:

**Action:** Hold entire payout until all flagged videos are resolved

**Rationale:** Prevents partial approval of potentially related fraud

### 6.2 Resolution Flow

1. All flagged videos must be reviewed
2. If any video confirmed as fraud → clawback that portion
3. Remaining clean videos proceed to payout
4. Creator notified of split outcome

---

## 7. Appeal Process

### 7.1 Appeal Eligibility

- One appeal allowed per rejected payout
- Must be submitted within 7 days of rejection
- Requires additional evidence not previously submitted

### 7.2 Appeal Flow

1. Creator clicks "Appeal" on rejected payout
2. Upload additional evidence (different from original)
3. Admin reviews with fresh eyes
4. Decision is final (no further appeals)

### 7.3 Appeal Evidence Requirements

Must provide **new information** such as:
- Alternative analytics source
- Platform support confirmation of views
- Explanation of unusual patterns with documentation

---

## 8. Processing Architecture

### 8.1 Real-Time (at payout request)

- Trust score threshold check
- Previous fraud flag check
- Account age check
- Payout amount tier classification
- Engagement rate calculation (if data available)
- View velocity spike detection
- Auto-approval decision

### 8.2 Batch Processing (hourly)

- Send evidence request emails for failed auto-approvals
- Check 48-hour deadlines and auto-reject expired requests
- Update fraud analytics dashboards
- Send admin alert digests

---

## 9. Admin Tools

### 9.1 Review Queue Dashboard

**Location:** Admin → Payouts → Review Queue

**Features:**
- List of pending reviews with evidence attached
- Filter by: amount tier, flag reason, date range, creator
- Sort by: amount, date, urgency
- Inline video player for screen recordings
- Side-by-side: evidence + platform data

### 9.2 One-Click Actions

| Action | Requirement |
|--------|-------------|
| Approve | None |
| Reject | Reason required (dropdown + optional notes) |
| Request More Info | Message to creator |
| Escalate | Flag for senior admin review |

**Rejection Reasons:**
- Insufficient evidence
- Evidence doesn't match claimed metrics
- Suspicious view pattern confirmed
- Bot activity detected
- Creator non-responsive
- Other (requires notes)

### 9.3 Bulk Actions

- Select multiple payouts
- Bulk approve (for clear cases)
- Bulk reject with same reason
- Bulk request additional evidence

---

## 10. Alerting

### 10.1 Channels

| Channel | Use Case |
|---------|----------|
| Dashboard | All flagged items, always visible |
| Email digest | Daily summary at 9 AM |
| Slack/Discord webhook | High-priority alerts (>$500, repeat offenders) |

### 10.2 High-Priority Triggers

Immediate Slack/Discord notification for:
- Payout request > $1,000 flagged
- Creator with previous fraud requesting any payout
- View spike > 50x detected
- Multiple creators flagged for same campaign (coordinated fraud)

---

## 11. Analytics & Reporting

### 11.1 Metrics Dashboard

**Real-time metrics:**
- Pending review count
- Auto-approval rate (last 24h, 7d, 30d)
- Average review time
- Rejection rate by reason

**Historical trends:**
- Fraud attempts over time (chart)
- Fraud by campaign
- Fraud by creator segment (new vs established)
- Recovery rate (clawback success)

### 11.2 Drill-Down Views

- By creator: all payouts, flags, evidence, trust score history
- By campaign: fraud rate, creator list, total clawback
- By flag reason: which signals catch the most fraud

### 11.3 Exports

- CSV export of all flagged payouts
- PDF report for date range (for stakeholders)
- API endpoint for external analytics tools

---

## 12. Data Model Changes

### 12.1 New Tables

#### `fraud_flags`
```sql
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id),
  payout_request_id UUID REFERENCES submission_payout_requests(id),
  flag_type TEXT NOT NULL, -- 'engagement', 'velocity', 'new_creator', 'previous_fraud'
  flag_reason TEXT,
  detected_value NUMERIC, -- e.g., 0.05 for 0.05% engagement
  threshold_value NUMERIC, -- e.g., 0.1 for 0.1% threshold
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id)
);
```

#### `fraud_evidence`
```sql
CREATE TABLE fraud_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id UUID REFERENCES submission_payout_requests(id),
  creator_id UUID REFERENCES profiles(id),
  evidence_type TEXT NOT NULL, -- 'screen_recording', 'external_link'
  file_path TEXT, -- Supabase Storage path
  external_url TEXT, -- For link fallback
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- 30 days after payout completion
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ
);
```

#### `creator_fraud_history`
```sql
CREATE TABLE creator_fraud_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id),
  fraud_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  trust_penalty INTEGER NOT NULL,
  clawback_id UUID REFERENCES payment_ledger(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 12.2 Table Modifications

#### `profiles` (add columns)
```sql
ALTER TABLE profiles ADD COLUMN fraud_flag_permanent BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN fraud_flag_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_fraud_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
```

#### `brands` (add columns)
```sql
ALTER TABLE brands ADD COLUMN fraud_sensitivity TEXT DEFAULT 'normal'; -- 'strict', 'normal', 'lenient'
ALTER TABLE brands ADD COLUMN notify_creator_fraud BOOLEAN DEFAULT false;
```

#### `submission_payout_requests` (add columns)
```sql
ALTER TABLE submission_payout_requests ADD COLUMN auto_approval_status TEXT; -- 'approved', 'failed', 'pending_evidence'
ALTER TABLE submission_payout_requests ADD COLUMN evidence_requested_at TIMESTAMPTZ;
ALTER TABLE submission_payout_requests ADD COLUMN evidence_deadline TIMESTAMPTZ;
ALTER TABLE submission_payout_requests ADD COLUMN appeal_submitted_at TIMESTAMPTZ;
ALTER TABLE submission_payout_requests ADD COLUMN appeal_status TEXT; -- 'pending', 'approved', 'rejected'
```

#### `payment_ledger` (ensure exists)
```sql
-- views_snapshot should already exist, verify it's populated at payout request
```

---

## 13. Edge Functions

### 13.1 `check-payout-fraud`

**Trigger:** Called when payout request created

**Input:** `payout_request_id`

**Logic:**
1. Fetch creator profile (trust score, account age, fraud history)
2. Fetch all submissions in payout request
3. For each submission:
   - Check engagement rate against threshold
   - Check view velocity (compare to 24h ago)
4. Check if new creator + high payout
5. Check previous fraud flag
6. Calculate auto-approval decision
7. If approved: proceed normally
8. If failed: create fraud_flags records, set evidence_requested_at

### 13.2 `process-evidence-deadlines`

**Trigger:** Scheduled, runs hourly

**Logic:**
1. Find all payout requests where:
   - `auto_approval_status = 'pending_evidence'`
   - `evidence_deadline < now()`
   - No evidence uploaded
2. For each: auto-reject payout, notify creator

### 13.3 `send-evidence-request`

**Trigger:** Called by `check-payout-fraud` when auto-approval fails

**Input:** `payout_request_id`, `flag_reasons[]`

**Logic:**
1. Send email to creator with:
   - List of flagged submissions
   - Reason(s) for flag
   - Link to upload evidence
   - 48-hour deadline
2. Set `evidence_deadline` on payout request

### 13.4 `calculate-trust-penalty`

**Trigger:** Called when clawback confirmed

**Input:** `creator_id`, `fraud_amount`

**Logic:**
1. Calculate penalty: `10 + (fraud_amount * 0.01)`
2. Subtract from creator's trust_score
3. Set `fraud_flag_permanent = true`
4. Increment `fraud_flag_count`
5. If `fraud_flag_count >= 3`: ban creator

---

## 14. Data Retention

| Data Type | Retention Period |
|-----------|------------------|
| Screen recordings (clean) | 30 days after payout completion |
| Screen recordings (fraud) | Permanent |
| Fraud flags | Permanent |
| Analytics data | 2 years |
| Email logs | 90 days |

### 14.1 Cleanup Job

**Schedule:** Daily at 3 AM

**Logic:**
1. Find fraud_evidence where:
   - `expires_at < now()`
   - Related payout was approved (no fraud)
2. Delete from Supabase Storage
3. Set file_path to null, keep record for audit

---

## 15. Rollout Plan

**Strategy:** All at once (no gradual rollout)

### 15.1 Pre-Launch Checklist

- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Email templates created
- [ ] Admin dashboard updated
- [ ] Slack webhook configured
- [ ] Evidence storage bucket created
- [ ] Backfill creator trust scores

### 15.2 Launch Day

1. Enable fraud detection on all new payout requests
2. Existing pending payouts: grandfather (process without new checks)
3. Monitor Slack for first 24 hours
4. Adjust thresholds if false positive rate > 20%

### 15.3 Post-Launch Monitoring

- Daily review of auto-approval rate
- Weekly review of threshold effectiveness
- Monthly report to stakeholders

---

## 16. Resolved Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Trust score calculation | Manual admin assignment | Fraud penalty subtracts from admin-set value |
| Ban enforcement | Fingerprint.js | Browser fingerprinting for evasion resistance |
| Alert channel | Discord webhook | Team uses Discord internally |
| Evidence upload | Mobile + Desktop | Support both equally with responsive UI |

---

## 17. Open Questions

> Resolve before implementation:

1. **Discord webhook URL:** Need to configure in environment variables.

2. **Email template copy:** Need marketing/product input on evidence request email.

3. **Fingerprint.js pricing:** Free tier may have limits - verify volume fits.
