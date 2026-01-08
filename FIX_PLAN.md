# Bug Fix Plan - January 5, 2026

## Overview
Three bugs identified from user feedback submissions. This plan addresses all issues with database fixes and code changes.

---

## Bug 1: Referral Code Generation Missing (CRITICAL)

### Problem
The `handle_new_user` function was modified in migration `20260103173900_fix_handle_new_user_wallet_merge.sql` to fix wallet merging, but accidentally removed the referral code generation logic for new users.

### Affected Users
All users who signed up after January 3rd, 2026 without an existing profile to merge.

### Fix Steps

#### Step 1: Create migration to fix handle_new_user function
Add referral code generation back to the function for new users:

```sql
-- In the ELSE branch (new user, no merge), generate referral code:
DECLARE
  new_referral_code text;
  code_exists boolean;
BEGIN
  -- Generate unique 8-char referral code
  LOOP
    new_referral_code := upper(substr(md5(random()::text || NEW.id::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- Include referral_code in the INSERT
  INSERT INTO public.profiles (id, email, username, referral_code, onboarding_completed, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_generated_username, new_referral_code, TRUE, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
END;
```

#### Step 2: Backfill referral codes for affected users
```sql
-- Generate referral codes for users who don't have one
UPDATE profiles
SET referral_code = upper(substr(md5(random()::text || id::text), 1, 8))
WHERE referral_code IS NULL;
```

### Verification
- Check that user `mrxmedia.in@gmail.com` now has a referral code
- Test new user signup generates referral code

---

## Bug 2: Payout Request Not Working

### Problem
User `mattandreww` reports unable to request payout despite having:
- $134.47 balance (minimum is $20)
- Crypto payout method configured
- No fraud flags or pending payouts

### Investigation Needed
1. Get specific error message from user
2. Check browser console for JS errors
3. Test payout flow as admin

### Potential Causes
1. **UI State Issue**: Button may be disabled due to stale state
2. **RLS Policy**: May be blocking the payout_requests insert
3. **Validation Bug**: Hidden validation failing silently

### Fix Steps

#### Step 1: Check RLS on payout_requests
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'payout_requests';
```

#### Step 2: Add better error handling in payout flow
Update `WalletTab.tsx` to show specific error messages when payout fails.

#### Step 3: Manual Resolution (if needed)
Process the user's payout manually via admin panel if the bug cannot be quickly identified.

---

## Bug 3: Account Connection Inconsistency

### Problem
User `zohaib` reports:
- Settings tab shows account connected to Austyn campaign
- Home tab shows "no account connected"
- Trying to reconnect shows "account connected with other account"

### Root Cause
Two systems track campaign connections that are out of sync:
1. `social_accounts.campaign_id` - old field, Settings page reads this
2. `social_account_campaigns` table - new table, Home page reads this

User's TikTok account:
- `social_accounts.campaign_id` = NULL
- `social_account_campaigns` entries = 0

User's Instagram account:
- `social_accounts.campaign_id` = Austyn campaign ID
- `social_account_campaigns` entries = 1 (Austyn)

### Fix Steps

#### Step 1: Create data sync migration
```sql
-- Sync social_accounts.campaign_id to social_account_campaigns table
INSERT INTO social_account_campaigns (social_account_id, campaign_id, user_id, status, connected_at)
SELECT
  sa.id,
  sa.campaign_id,
  sa.user_id,
  'active',
  COALESCE(sa.connected_at, NOW())
FROM social_accounts sa
WHERE sa.campaign_id IS NOT NULL
  AND sa.is_verified = true
  AND NOT EXISTS (
    SELECT 1 FROM social_account_campaigns sac
    WHERE sac.social_account_id = sa.id
    AND sac.campaign_id = sa.campaign_id
  );
```

#### Step 2: Update code to use single source of truth
Decide on one system (`social_account_campaigns` is preferred as it's normalized) and update:
- Settings page to read from `social_account_campaigns`
- Remove/deprecate `social_accounts.campaign_id` field

#### Step 3: Manual fix for zohaib
```sql
-- Add TikTok account to Austyn campaign
INSERT INTO social_account_campaigns (social_account_id, campaign_id, user_id, status, connected_at)
VALUES (
  'ff296490-bcb8-4977-81f9-c379a05c1891',  -- TikTok account ID
  'f18d9902-6da6-4b72-b2aa-8a5be606d116',  -- Austyn campaign ID
  '1601e533-f209-46de-a9b8-22e35ffec4be',  -- User ID
  'active',
  NOW()
);
```

---

## Priority Order

1. **Bug 1 (Referral Code)** - CRITICAL - Affects all new signups
2. **Bug 3 (Account Connection)** - HIGH - Data inconsistency causing user confusion
3. **Bug 2 (Payout)** - MEDIUM - May be user-specific, needs more info

---

## Migration Files to Create

1. `20260105_fix_referral_code_generation.sql` - Fix handle_new_user + backfill
2. `20260105_sync_social_account_campaigns.sql` - Sync campaign connections
3. Code changes in Settings page to use `social_account_campaigns`

---

## Testing Checklist

- [x] New user signup generates referral code
- [x] Existing users without referral codes get backfilled
- [x] User zohaib can see connected accounts on both Settings and Home
- [ ] User mattandreww can successfully request payout
- [x] No regression in profile merge functionality

---

## Bug 4: Login Loop / Logout Issue (RESOLVED)

### Problem
User `popcronymail@gmail.com` reported being logged out immediately after logging in, or seeing "Error, can't find data".

### Root Cause
Race condition in token refresh. The app has 72+ calls to `supabase.auth.getUser()`/`getSession()` across dashboard components. When the token is expiring, multiple components try to refresh simultaneously, causing:
- `refresh_token_already_used` errors
- Supabase abuse detection (`Possible abuse attempt: 1823`)
- Rate limiting (429 errors)
- Session invalidation

### Fix Applied
1. **Immediate**: Cleared user's refresh tokens and sessions from database
2. **Code fix**: Added Web Locks API support to `src/integrations/supabase/client.ts`:
   - `lock: 'navigator'` prevents concurrent token refreshes across tabs/components
   - Added `flowType: 'pkce'` for improved security
   - Added `detectSessionInUrl: true` for proper OAuth handling

### Verification
- User can now login fresh without the race condition
- Web Locks API prevents concurrent token refreshes in modern browsers
