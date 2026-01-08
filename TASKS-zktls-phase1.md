# zkTLS Phase 1 Implementation Tasks

## Configuration Summary
- **Platform**: TikTok
- **Validity**: 30 days
- **Data**: Full analytics (followers, demographics, engagement, avg views)
- **UI**: Audience Insights card + Social accounts table
- **Badge**: Prominent "Verified Analytics" badge
- **Expiry**: Reminder + badge removal + trust decay + block campaign joins

---

## Pre-requisites (User Action Required)

- [ ] **Sign up for Reclaim Protocol** at https://dev.reclaimprotocol.org
- [ ] **Create an application** and obtain:
  - `RECLAIM_APP_ID`
  - `RECLAIM_APP_SECRET`
- [ ] **Configure TikTok provider** in Reclaim dashboard
- [ ] **Add secrets to Supabase**: `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`

---

## Task 1: Database Schema (Migration)

### 1.1 Create `zktls_verifications` table
```
File: supabase/migrations/YYYYMMDDHHMMSS_create_zktls_verifications.sql

- id (UUID, PK)
- social_account_id (FK → social_accounts)
- user_id (FK → auth.users)
- proof_id (TEXT)
- proof_data (JSONB)
- provider_id (TEXT) - e.g., 'tiktok-analytics'
- follower_count (INTEGER)
- demographics (JSONB)
- engagement_rate (NUMERIC)
- avg_views (INTEGER)
- verified_at (TIMESTAMPTZ)
- expires_at (TIMESTAMPTZ) - verified_at + 30 days
- is_valid (BOOLEAN)
- created_at, updated_at
- Indexes on social_account_id, user_id, (is_valid, verified_at)
```

### 1.2 Modify `profiles` table
```
- ADD zktls_verified_at (TIMESTAMPTZ)
- ADD zktls_trust_level (TEXT) - 'none', 'basic', 'verified', 'premium'
```

### 1.3 Modify `social_accounts` table
```
- ADD last_zktls_verification_id (FK → zktls_verifications)
- ADD zktls_verified (BOOLEAN DEFAULT false)
- ADD zktls_follower_count (INTEGER)
- ADD zktls_demographics (JSONB)
- ADD zktls_engagement_rate (NUMERIC)
- ADD zktls_avg_views (INTEGER)
- ADD zktls_verified_at (TIMESTAMPTZ)
- ADD zktls_expires_at (TIMESTAMPTZ)
```

### 1.4 Create expiry check function
```
- Function to check if verification is expired (> 30 days)
- Function to calculate trust score with zkTLS bonus
- Trigger to update profile trust level on verification
```

---

## Task 2: Backend Edge Function

### 2.1 Create `verify-zktls-proof` edge function
```
File: supabase/functions/verify-zktls-proof/index.ts

Endpoint: POST /functions/v1/verify-zktls-proof

Request:
{
  social_account_id: string,
  proof: ReclaimProof,
  provider_id: 'tiktok-analytics'
}

Response:
{
  success: boolean,
  verification_id: string,
  extracted_data: {
    follower_count: number,
    demographics: object,
    engagement_rate: number,
    avg_views: number
  },
  expires_at: string,
  trust_level: string
}

Logic:
1. Validate user owns the social_account
2. Verify proof with Reclaim API
3. Extract TikTok analytics from proof
4. Store verification record
5. Update social_account with verified data
6. Update user's trust level
7. Return success with extracted data
```

### 2.2 Create `check-zktls-expiry` scheduled function
```
File: supabase/functions/check-zktls-expiry/index.ts

Runs: Daily via pg_cron

Logic:
1. Find verifications where expires_at < NOW()
2. Mark as is_valid = false
3. Update social_account zktls_verified = false
4. Recalculate user trust scores
5. Queue reminder notifications
```

---

## Task 3: TypeScript Types & Utilities

### 3.1 Create zkTLS types
```
File: src/lib/zktls/types.ts

- ZkTLSVerification interface
- ZkTLSProvider config type
- TikTokAnalyticsData interface
- VerificationStatus enum
- ExtractionResult type
```

### 3.2 Create provider configuration
```
File: src/lib/zktls/providers.ts

- ZKTLS_PROVIDERS constant with TikTok config
- Provider ID mappings
- Extractable fields definition
```

### 3.3 Create data extractors
```
File: src/lib/zktls/extractors.ts

- extractTikTokAnalytics(proof) → normalized data
- validateExtractedData(data) → boolean
- normalizeFollowerCount(raw) → number
- normalizeDemographics(raw) → { countries, age_groups, gender }
```

### 3.4 Create Reclaim hook
```
File: src/lib/zktls/hooks/useReclaimVerification.ts

- Initialize Reclaim SDK
- Generate verification request
- Handle proof callback
- Submit proof to backend
- Return verification status
```

---

## Task 4: UI Components

### 4.1 Create ZkTLSVerificationDialog
```
File: src/components/ZkTLSVerificationDialog/index.tsx

States:
1. Initial - "Verify your TikTok analytics"
2. Connecting - "Opening TikTok verification..."
3. Waiting - "Complete verification in TikTok"
4. Verifying - "Verifying your proof..."
5. Success - Show extracted data + badge
6. Error - Show error + retry option

Props:
- socialAccountId: string
- platform: 'tiktok'
- onSuccess: (data) => void
- onClose: () => void
```

### 4.2 Create VerificationBadge component
```
File: src/components/VerificationBadge.tsx

- "Verified Analytics" badge with shield icon
- Tooltip showing verification date
- Expiry warning if < 7 days remaining
- Expired state (grayed out)
```

### 4.3 Create VerificationExpiryBanner
```
File: src/components/VerificationExpiryBanner.tsx

- Warning banner when verification expires soon
- "Re-verify" CTA button
- Dismiss option (shows again after 24h)
```

---

## Task 5: Integrate with Existing UI

### 5.1 Update AudienceInsightsStatusCard
```
File: src/components/AudienceInsightsStatusCard.tsx

Changes:
- Add "Verify Instantly with zkTLS" button (primary)
- Keep "Submit Video" as secondary option
- Show VerificationBadge if zkTLS verified
- Show expiry warning banner if applicable
- Show verified metrics (followers, demographics)
```

### 5.2 Update Social Accounts display
```
File: src/components/dashboard/ProfileTab.tsx (or similar)

Changes:
- Add verify button per TikTok account
- Show VerificationBadge next to verified accounts
- Display zkTLS follower count with "Verified" label
- Show "Verify" CTA for unverified accounts
```

### 5.3 Update JoinCampaignSheet
```
File: src/components/JoinCampaignSheet.tsx

Changes:
- Check zkTLS verification status
- Show warning if verification expired
- Block join if verification required and expired
- Show "Re-verify to continue" CTA
```

---

## Task 6: Trust Score Integration

### 6.1 Create trust score calculation
```
SQL Function: calculate_zktls_trust_score(user_id)

Logic:
- Base score from existing demographics_score
- +20 points for valid zkTLS verification
- +10 bonus for verification < 7 days old
- -10 penalty per week past expiry
- Cap at 100, floor at 0
```

### 6.2 Update profile trust level
```
Trigger: On zktls_verifications INSERT/UPDATE

Logic:
- Calculate new trust score
- Update profiles.zktls_trust_level:
  - 'none': No verification
  - 'basic': Expired verification
  - 'verified': Valid verification
  - 'premium': Multiple platforms verified (future)
```

---

## Task 7: Notifications

### 7.1 Expiry reminder notifications
```
- 7 days before expiry: "Your verification expires soon"
- On expiry: "Your verification has expired"
- Via: In-app notification + email (optional)
```

### 7.2 Verification success notification
```
- "Analytics verified! Your trust score increased."
- Show new trust level
```

---

## Task 8: Testing

### 8.1 Unit tests
```
- Proof extraction functions
- Trust score calculation
- Expiry logic
```

### 8.2 Integration tests
```
- Full verification flow (mock Reclaim API)
- Expiry handling
- Campaign join blocking
```

### 8.3 Manual testing checklist
```
- [ ] Verify TikTok account via zkTLS
- [ ] See badge appear on profile
- [ ] See verified metrics in insights card
- [ ] Join campaign with verified status
- [ ] See expiry warning at 7 days
- [ ] See blocked state after expiry
- [ ] Re-verify successfully
```

---

## File Summary

### New Files (12)
```
supabase/migrations/YYYYMMDDHHMMSS_create_zktls_verifications.sql
supabase/functions/verify-zktls-proof/index.ts
supabase/functions/check-zktls-expiry/index.ts
src/lib/zktls/types.ts
src/lib/zktls/providers.ts
src/lib/zktls/extractors.ts
src/lib/zktls/hooks/useReclaimVerification.ts
src/components/ZkTLSVerificationDialog/index.tsx
src/components/VerificationBadge.tsx
src/components/VerificationExpiryBanner.tsx
```

### Modified Files (4)
```
src/components/AudienceInsightsStatusCard.tsx
src/components/dashboard/ProfileTab.tsx
src/components/JoinCampaignSheet.tsx
package.json (add @reclaimprotocol/js-sdk)
```

---

## Estimated Effort

| Task | Complexity | Est. Time |
|------|------------|-----------|
| Database migrations | Medium | 1-2 hours |
| Edge functions | High | 3-4 hours |
| Types & utilities | Low | 1 hour |
| UI components | High | 4-5 hours |
| Integration | Medium | 2-3 hours |
| Trust scoring | Medium | 1-2 hours |
| Notifications | Low | 1 hour |
| Testing | Medium | 2-3 hours |

**Total: ~15-20 hours**

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @reclaimprotocol/js-sdk | latest | zkTLS proof generation |

---

## Blockers

1. **Reclaim Protocol credentials required** - Cannot test until user signs up
2. **TikTok provider availability** - Need to verify Reclaim has TikTok analytics provider

---

*Generated: 2026-01-06*
