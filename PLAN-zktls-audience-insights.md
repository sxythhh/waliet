# Implementation Plan: zkTLS-Enhanced Audience Insights

## Overview

Integrate zkTLS (zero-knowledge TLS) verification into the existing audience insights system to enable cryptographically-verified creator analytics without manual admin review.

---

## Phase 1: Foundation & Reclaim Protocol Integration

### 1.1 Reclaim Protocol Setup

**Why Reclaim Protocol?**
- Production-ready with existing social media data providers
- JavaScript/TypeScript SDK compatible with React
- Supports TikTok, Instagram, YouTube analytics
- Fastest path to working integration

**Tasks:**
1. Create Reclaim Protocol developer account and obtain API credentials
2. Add environment variables to Supabase secrets:
   - `RECLAIM_APP_ID`
   - `RECLAIM_APP_SECRET`
3. Install Reclaim SDK: `npm install @reclaimprotocol/js-sdk`

### 1.2 Database Schema Updates

**New table: `zktls_verifications`**
```sql
CREATE TABLE zktls_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Proof data
  proof_id TEXT NOT NULL,              -- Reclaim proof identifier
  proof_data JSONB NOT NULL,           -- Full proof payload
  provider_id TEXT NOT NULL,           -- e.g., 'tiktok-analytics', 'instagram-insights'

  -- Extracted metrics (selective disclosure)
  follower_count INTEGER,
  follower_count_range TEXT,           -- e.g., '10k-50k' for privacy
  demographics JSONB,                  -- { "US": 45, "UK": 12, ... }
  engagement_rate NUMERIC(5,2),

  -- Verification metadata
  verified_at TIMESTAMPTZ NOT NULL,    -- When proof was generated
  expires_at TIMESTAMPTZ,              -- Optional expiration
  is_valid BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_zktls_social_account ON zktls_verifications(social_account_id);
CREATE INDEX idx_zktls_user ON zktls_verifications(user_id);
CREATE INDEX idx_zktls_valid ON zktls_verifications(is_valid, verified_at DESC);
```

**Modify `profiles` table:**
```sql
ALTER TABLE profiles ADD COLUMN zktls_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN zktls_trust_level TEXT DEFAULT 'none';
-- Values: 'none', 'basic', 'verified', 'premium'
```

**Modify `social_accounts` table:**
```sql
ALTER TABLE social_accounts ADD COLUMN last_zktls_verification_id UUID REFERENCES zktls_verifications(id);
ALTER TABLE social_accounts ADD COLUMN zktls_verified BOOLEAN DEFAULT false;
ALTER TABLE social_accounts ADD COLUMN zktls_follower_count INTEGER;
ALTER TABLE social_accounts ADD COLUMN zktls_demographics JSONB;
```

### 1.3 Backend: Verification Edge Function

**New edge function: `verify-zktls-proof`**

Location: `supabase/functions/verify-zktls-proof/index.ts`

```
Responsibilities:
1. Receive proof from client
2. Verify proof signature with Reclaim backend
3. Extract claimed data (follower count, demographics)
4. Store verification record
5. Update social_account with verified data
6. Calculate and update user's trust level
```

**Endpoint contract:**
```typescript
// POST /functions/v1/verify-zktls-proof
Request: {
  social_account_id: string;
  proof: ReclaimProof;          // From SDK
  provider_id: string;          // Which data provider was used
}

Response: {
  success: boolean;
  verification_id: string;
  extracted_data: {
    follower_count?: number;
    demographics?: Record<string, number>;
    engagement_rate?: number;
  };
  trust_level: string;
}
```

### 1.4 Frontend: zkTLS Verification Component

**New component: `ZkTLSVerificationDialog.tsx`**

Location: `src/components/ZkTLSVerificationDialog.tsx`

```
UI Flow:
1. User clicks "Verify with zkTLS" button
2. Dialog opens showing supported platforms
3. User selects platform (TikTok/Instagram/YouTube)
4. Reclaim SDK generates verification request
5. User is redirected to platform OR opens browser extension
6. User navigates to analytics page
7. Proof is captured and returned to app
8. App submits proof to backend
9. Success state shows verified metrics
```

**Component structure:**
```
ZkTLSVerificationDialog/
├── index.tsx                    # Main dialog component
├── PlatformSelector.tsx         # Platform selection step
├── VerificationInProgress.tsx   # Loading/waiting state
├── VerificationSuccess.tsx      # Success with extracted data
├── VerificationError.tsx        # Error handling
└── hooks/
    └── useReclaimVerification.ts # Reclaim SDK integration hook
```

### 1.5 Update Existing Components

**Modify `AudienceInsightsStatusCard.tsx`:**
- Add "Verify Instantly with zkTLS" button alongside existing video upload
- Show zkTLS verification badge if verified
- Display last verification timestamp
- Show "Re-verify" option if verification > 30 days old

**Modify `SocialAccountsTable.tsx`:**
- Add zkTLS verification status column
- Show verified follower count from zkTLS (with "Verified" badge)
- Distinguish between self-reported and zkTLS-verified metrics

**Modify `JoinCampaignSheet.tsx`:**
- Check for zkTLS verification status
- Allow campaigns to require zkTLS-verified insights
- Show higher trust indicator for zkTLS-verified creators

---

## Phase 2: Provider Configuration & Data Extraction

### 2.1 Define Data Providers

**Create provider configuration file:**

Location: `src/lib/zktls/providers.ts`

```typescript
// Supported providers and their data schemas
export const ZKTLS_PROVIDERS = {
  'tiktok-analytics': {
    platform: 'tiktok',
    name: 'TikTok Creator Analytics',
    reclaimProviderId: 'xxx', // From Reclaim dashboard
    extractableFields: ['follower_count', 'demographics', 'avg_views'],
    requiredScope: ['analytics.read'],
  },
  'instagram-insights': {
    platform: 'instagram',
    name: 'Instagram Professional Insights',
    reclaimProviderId: 'yyy',
    extractableFields: ['follower_count', 'demographics', 'reach'],
    requiredScope: ['insights'],
  },
  'youtube-analytics': {
    platform: 'youtube',
    name: 'YouTube Studio Analytics',
    reclaimProviderId: 'zzz',
    extractableFields: ['subscriber_count', 'demographics', 'watch_time'],
    requiredScope: ['analytics.readonly'],
  },
};
```

### 2.2 Data Extraction & Normalization

**Create extraction utilities:**

Location: `src/lib/zktls/extractors.ts`

```
Each platform returns data differently. Normalize to common schema:

{
  follower_count: number,
  demographics: {
    countries: { [country: string]: number },  // percentage
    age_groups: { [range: string]: number },   // percentage
    gender: { male: number, female: number, other: number }
  },
  engagement: {
    rate: number,           // percentage
    avg_likes: number,
    avg_comments: number,
  },
  verified_at: Date,
  raw_proof: object         // Original proof for audit
}
```

### 2.3 Selective Disclosure Options

Allow creators to control what's shared:

```typescript
// Creator can choose disclosure level
type DisclosureLevel = 'exact' | 'range' | 'threshold';

// Examples:
// 'exact': "I have 47,832 followers"
// 'range': "I have 25k-50k followers"
// 'threshold': "I have more than 10k followers"
```

---

## Phase 3: Trust Scoring & Campaign Integration

### 3.1 Enhanced Trust Scoring

**Create scoring function:**

Location: `supabase/migrations/xxx_zktls_trust_scoring.sql`

```sql
CREATE OR REPLACE FUNCTION calculate_zktls_trust_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  base_score INTEGER := 0;
  zktls_bonus INTEGER := 0;
  recency_bonus INTEGER := 0;
  account_count INTEGER;
BEGIN
  -- Base score from existing demographics_score
  SELECT COALESCE(demographics_score, 0) INTO base_score
  FROM profiles WHERE id = p_user_id;

  -- Bonus for zkTLS verification (up to +30 points)
  SELECT COUNT(*) INTO account_count
  FROM social_accounts sa
  JOIN zktls_verifications zv ON zv.social_account_id = sa.id
  WHERE sa.user_id = p_user_id
    AND zv.is_valid = true
    AND zv.verified_at > NOW() - INTERVAL '90 days';

  zktls_bonus := LEAST(account_count * 10, 30);

  -- Recency bonus (up to +10 points for verification in last 7 days)
  IF EXISTS (
    SELECT 1 FROM zktls_verifications zv
    JOIN social_accounts sa ON sa.id = zv.social_account_id
    WHERE sa.user_id = p_user_id
      AND zv.verified_at > NOW() - INTERVAL '7 days'
  ) THEN
    recency_bonus := 10;
  END IF;

  RETURN LEAST(base_score + zktls_bonus + recency_bonus, 100);
END;
$$ LANGUAGE plpgsql;
```

### 3.2 Campaign Requirements Update

**Modify campaigns table:**
```sql
ALTER TABLE campaigns ADD COLUMN require_zktls_verification BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN zktls_max_age_days INTEGER DEFAULT 90;
-- Existing: require_audience_insights, min_insights_score
```

**Update `CampaignCreationWizard.tsx`:**
- Add toggle: "Require zkTLS verification"
- Add input: "Maximum verification age (days)"
- Show explanation of zkTLS benefits for brands

**Update `JoinCampaignSheet.tsx`:**
- Check zkTLS verification status against campaign requirements
- Show "Verify Now" CTA if zkTLS required but not verified
- Display verification age and warn if expiring soon

### 3.3 Brand-Facing Verification Display

**Update creator profile views for brands:**
- Show "zkTLS Verified" badge prominently
- Display verified metrics with proof timestamp
- Allow brands to click and see verification details
- Show verification history

---

## Phase 4: Migration & Coexistence

### 4.1 Parallel Systems

Both systems will run in parallel:
- **Legacy**: Video submission → Admin review → Score
- **zkTLS**: Cryptographic proof → Instant verification → Auto-score

**Coexistence rules:**
1. zkTLS verification takes precedence over manual review
2. Manual review remains as fallback for unsupported platforms
3. Trust score combines both systems (zkTLS weighted higher)
4. Brands can specify preference or requirement

### 4.2 Migration Incentives

Encourage creators to use zkTLS:
- Higher trust scores for zkTLS-verified accounts
- Faster campaign application approval
- "Verified Creator" badge in marketplace
- Priority in creator search/discovery

### 4.3 Admin Dashboard Updates

**Update `AudienceInsightsReviewDialog.tsx`:**
- Show zkTLS verification status alongside video review
- Auto-approve if zkTLS data matches video content
- Flag discrepancies between zkTLS and video data
- Reduce review queue by filtering zkTLS-verified submissions

**New admin view: zkTLS Verification Dashboard**
- View all zkTLS verifications
- Monitor verification success rates by platform
- Detect anomalies or potential issues
- Export verification data for analysis

---

## Phase 5: Advanced Features (Future)

### 5.1 Continuous Verification
- Scheduled re-verification prompts (every 30/60/90 days)
- Automatic trust score decay for stale verifications
- Push notifications for re-verification reminders

### 5.2 Cross-Platform Aggregation
- Combine verified data across all platforms
- Unified audience demographic view
- Total verified reach calculation

### 5.3 On-Chain Verification (Optional)
- Store proof hashes on blockchain for immutability
- Enable third-party verification without API access
- Creator-owned verification credentials (SBTs)

---

## File Changes Summary

### New Files
```
src/components/ZkTLSVerificationDialog/
├── index.tsx
├── PlatformSelector.tsx
├── VerificationInProgress.tsx
├── VerificationSuccess.tsx
├── VerificationError.tsx
└── hooks/useReclaimVerification.ts

src/lib/zktls/
├── providers.ts
├── extractors.ts
├── types.ts
└── utils.ts

supabase/functions/verify-zktls-proof/
└── index.ts

supabase/migrations/
├── xxx_zktls_verifications_table.sql
├── xxx_zktls_social_accounts_columns.sql
└── xxx_zktls_trust_scoring.sql
```

### Modified Files
```
src/components/AudienceInsightsStatusCard.tsx
src/components/dashboard/SocialAccountsTable.tsx
src/components/JoinCampaignSheet.tsx
src/components/brand/CampaignCreationWizard.tsx
src/components/admin/AudienceInsightsReviewDialog.tsx
src/pages/admin/Users.tsx
package.json (add @reclaimprotocol/js-sdk)
```

---

## Implementation Order

1. **Database migrations** - Create tables and columns
2. **Backend edge function** - Proof verification endpoint
3. **Provider configuration** - Set up Reclaim providers
4. **Core verification component** - ZkTLSVerificationDialog
5. **Integration with existing UI** - Update status cards and tables
6. **Campaign requirements** - Add zkTLS options for brands
7. **Trust scoring updates** - Implement enhanced scoring
8. **Admin dashboard** - Verification monitoring
9. **Testing & QA** - End-to-end verification flow
10. **Documentation** - Creator and brand guides

---

## Dependencies & External Services

| Service | Purpose | Required Action |
|---------|---------|-----------------|
| Reclaim Protocol | zkTLS proof generation | Create developer account, obtain credentials |
| Supabase | Backend, database, storage | Already configured |
| Discord Webhooks | Notifications | Already configured |

---

## Questions Before Implementation

1. **Provider Priority**: Which platform should we integrate first? (TikTok, Instagram, or YouTube)

2. **Verification Expiry**: How long should a zkTLS verification remain valid? (Suggested: 90 days)

3. **Disclosure Preferences**: Should creators be able to share ranges instead of exact numbers?

4. **Legacy Deprecation**: Timeline for phasing out manual video review for supported platforms?

5. **On-Chain Storage**: Is there interest in storing verification proofs on a blockchain for additional trust?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Reclaim SDK changes | Integration breaks | Pin SDK version, monitor changelogs |
| Platform blocks Reclaim | Verification unavailable | Maintain video fallback system |
| Proof spoofing attempts | False verifications | Server-side verification with Reclaim API |
| User confusion | Low adoption | Clear onboarding, comparison with video flow |
| Rate limiting | Verification failures | Implement retry logic, queue system |

---

*Plan created: 2026-01-06*
*Ready for review and approval before implementation*
