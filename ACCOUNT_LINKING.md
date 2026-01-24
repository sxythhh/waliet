# Account Linking Strategy

## Overview

Waliet supports dual authentication (Whop + Supabase) with **email-based account linking** to prevent duplicate accounts when users authenticate via different methods.

## Authentication Methods

### 1. Whop App View (iframe context)
**Email: ❌ NOT AVAILABLE**

- User accesses Waliet inside a Whop experience
- Auth via `whopsdk.verifyUserToken()` + `users.retrieve()`
- Whop API returns: `id`, `username`, `name`, `bio`, `profile_picture`
- **Email is NOT included** in the response
- Creates: `User { whopUserId: "user_xxx", email: null }`

### 2. Whop OAuth ("Continue with Whop" button)
**Email: ✅ AVAILABLE**

- User clicks "Continue with Whop" on waliet.com login page
- OAuth flow with `email` scope
- Gets user data from `/oauth/userinfo` endpoint
- Returns: `sub` (user ID), `email`, `name`, `preferred_username`, `picture`
- **Email IS included** when `email` scope is granted
- Creates: `User { whopUserId: "user_xxx", email: "user@example.com" }`

### 3. Supabase Auth (Email/Password, Magic Link, Google)
**Email: ✅ AVAILABLE**

- User signs in via waliet.com login page
- Supabase Auth manages authentication
- Email is always available
- Creates: `User { supabaseUserId: "uuid", email: "user@example.com" }`

## Account Linking Logic

### Strategy 1: Email-Based Linking (Primary)

The most reliable method when email is available.

### Strategy 2: Username-Based Linking (Fallback)

When email isn't available, use Whop username as a linking mechanism.

**Important:** Username linking is less reliable because:
- Usernames can change
- Only Whop users have usernames
- Adds extra safety check (email must match if available)

### Strategy 3: Manual Email Collection (User-Initiated)

Prompt app view users to provide their email for account linking.

---

### Whop OAuth → Supabase Account Linking

**Location:** `app/api/auth/whop/callback/route.ts`

When user signs in with "Continue with Whop":

1. Exchange OAuth code for access token
2. Fetch user data from `/oauth/userinfo` (includes email + username)
3. Check if user exists by `whopUserId`
   - **Yes:** Update profile info and return
   - **No:** Continue to step 4
4. **Email-based linking:** Check if Supabase user exists with same email
   - **Yes:** Link accounts by setting `whopUserId` on existing record
   - **No:** Continue to step 5
5. **Username-based linking (fallback):** Check if user exists with same username
   - **Yes:** Link accounts by setting `whopUserId` on existing record
   - **No:** Create new user with `whopUserId`, `email`, and `username`

```typescript
// Example 1: Email match
Before: User { id: "1", supabaseUserId: "uuid", email: "alice@example.com", username: null, whopUserId: null }
After:  User { id: "1", supabaseUserId: "uuid", email: "alice@example.com", username: "alice_w", whopUserId: "user_abc" }

// Example 2: Username match (fallback)
Before: User { id: "2", whopUserId: null, email: null, username: "bob_w", supabaseUserId: null }
After:  User { id: "2", whopUserId: "user_xyz", email: "bob@example.com", username: "bob_w", supabaseUserId: null }
```

### Supabase → Whop Account Linking

**Location:** `lib/dual-auth.ts:syncSupabaseUserToDatabase()`

When user signs in with Supabase (email/password, magic link, or Google):

1. Check if user exists by `supabaseUserId`
   - **Yes:** Update profile info and return
   - **No:** Continue to step 2
2. **Email-based linking:** Check if Whop user exists with same email
   - **Yes:** Link accounts by setting `supabaseUserId` on existing record
   - **No:** Continue to step 3
3. **Username+email linking (fallback):** Check if Whop user exists with same email AND has a username
   - **Yes:** Link accounts by setting `supabaseUserId` on existing record
   - **No:** Create new user with `supabaseUserId` and `email`

```typescript
// Example: Existing Whop OAuth account gets linked via email
Before: User { id: "2", whopUserId: "user_xyz", email: "bob@example.com", username: "bob_w", supabaseUserId: null }
After:  User { id: "2", whopUserId: "user_xyz", email: "bob@example.com", username: "bob_w", supabaseUserId: "uuid-456" }
```

### Whop App View → Account Linking

**Location:** `lib/dual-auth.ts:syncWhopUserToDatabase()`

When user accesses app view (iframe):

1. Check if user exists by `whopUserId`
   - **Yes:** Update profile info and return
   - **No:** Continue to step 2
2. **Email-based linking (if email available):** Check if user exists with same email
   - **Yes:** Link accounts by setting `whopUserId` on existing record
   - **No:** Continue to step 3
3. **Username-based linking (fallback):** Check if user exists with same username
   - **Yes:** Link accounts by setting `whopUserId` on existing record
   - **No:** Create new user (may have null email)

**Email collection prompt:**
- If user has no email after 2 seconds, show `LinkAccountModal`
- User can provide email to enable account linking
- Email is saved via `/api/users/update-email`
- If email matches existing account, accounts are automatically linked and merged

## Edge Cases & Limitations

### ⚠️ App View Users - Partial Mitigation

**Problem:**
1. User accesses Waliet via Whop app (iframe) → Creates `User { whopUserId: "user_123", email: null, username: "alice" }`
2. Same user visits waliet.com and uses Supabase → May create separate account if username doesn't match

**Mitigation Strategies:**

1. **Username-based linking:** If both accounts have the same Whop username, they'll auto-link
2. **Email prompt:** App view users are prompted to provide email after 2 seconds
3. **Manual linking:** User can add email later via settings, triggering account merge

**Best case:** User provides email when prompted → accounts link automatically
**Worst case:** User skips prompt and doesn't use same username → separate accounts

### 🔄 Recommended User Journey

To ensure single account:

1. **First-time users on waliet.com:** Use "Continue with Whop" OAuth (provides email for linking)
2. **App view users:** Their account won't link automatically, but they can still use the app
3. **Mixed usage:** If user starts with Supabase, then uses "Continue with Whop", accounts will merge seamlessly

### 📊 Account Scenarios

| Scenario | User 1 | User 2 | Linked? | Method | Note |
|----------|--------|--------|---------|--------|------|
| Supabase → Whop OAuth | ✅ | ❌ | ✅ | Email | Email match, single account |
| Whop OAuth → Supabase | ✅ | ❌ | ✅ | Email | Email match, single account |
| App View (no email) → Supabase | ✅ | ✅ | ❌ | N/A | No linking data |
| App View (with email) → Supabase | ✅ | ❌ | ✅ | Email | User provided email when prompted |
| App View (same username) → Supabase | ✅ | ❌ | ✅ | Username | Fallback linking |
| App View → Whop OAuth | ✅ | ❌ | ✅ | whopUserId | Same Whop user ID |
| Whop OAuth → App View | ✅ | ❌ | ✅ | whopUserId | OAuth sets email, app view finds by whopUserId |

## Database Schema

```prisma
model User {
  id             String   @id @default(cuid())
  whopUserId     String?  @unique  // From Whop (OAuth or app view)
  supabaseUserId String?  @unique  // From Supabase Auth
  email          String?           // Used for account linking (primary)
  username       String?           // Whop username for fallback linking
  name           String?
  avatar         String?

  // A user can have both whopUserId AND supabaseUserId (linked account)
  // OR just one of them (single auth method)
  // email may be null for app view users (until they provide it)
  // username is populated from Whop, used as fallback linking mechanism
}
```

## Implementation Components

### 1. Email Prompt Modal
**Component:** `components/auth/LinkAccountModal.tsx`
- Shows after 2 seconds for app view users without email
- Clean, non-intrusive UI with skip option
- Saves skip preference to localStorage

### 2. Email Prompt Hook
**Hook:** `hooks/use-email-prompt.ts`
- Determines when to show email prompt
- Checks user auth method, email status, and skip preference
- Manages prompt state and timing

### 3. Email Update API
**Endpoint:** `/api/users/update-email`
- Accepts email from authenticated user
- Checks for existing accounts with that email
- Auto-links and merges accounts if found
- Updates user record with email

### 4. Wrapper Component
**Component:** `components/auth/EmailPromptWrapper.tsx`
- Wraps app view pages to show email prompt
- Usage: `<EmailPromptWrapper userEmail={user.email} userId={user.id} isWhopUser={true}>{children}</EmailPromptWrapper>`

## Usage Example

```tsx
// In your app view page
import { EmailPromptWrapper } from "@/components/auth/EmailPromptWrapper";
import { getDualAuthUser } from "@/lib/dual-auth";

export default async function ExperiencePage() {
  const auth = await getDualAuthUser();
  if (!auth) return <LoginRequired />;

  return (
    <EmailPromptWrapper
      userEmail={auth.dbUser.email}
      userId={auth.dbUser.id}
      isWhopUser={auth.user.provider === "whop"}
    >
      <YourPageContent />
    </EmailPromptWrapper>
  );
}
```

## Future Improvements

### 1. Retroactive Linking ✅ IMPLEMENTED
Username-based linking provides this automatically

### 2. Manual Account Linking UI ✅ IMPLEMENTED
Email prompt modal allows users to link accounts manually

### 3. Settings Page Email Update
Add email field to user settings:
- Users can update email anytime
- Triggers same linking logic as modal
- Shows linked accounts status

### 4. Account Merge Confirmation
Before auto-linking accounts, show confirmation:
- "We found an existing account. Link them?"
- Preview what data will be merged
- Require explicit confirmation

## Testing Checklist

- [ ] User signs up with Supabase, then uses "Continue with Whop" → Single account
- [ ] User signs up with "Continue with Whop", then uses Supabase → Single account
- [ ] User accesses app view, then uses Supabase → Two accounts (expected)
- [ ] User accesses app view, then uses "Continue with Whop" → Two accounts (expected)
- [ ] Check database logs show proper linking messages
- [ ] Verify wallet balances/sessions persist after linking
- [ ] Test with same email, different providers (Google vs Whop OAuth)

## Monitoring

Key metrics to track:

- **Duplicate accounts:** Users with same email across multiple records (should be 0)
- **Linked accounts:** Users with both `whopUserId` AND `supabaseUserId`
- **App view orphans:** Users with `whopUserId` but no email
- **Account merges:** Log count when linking occurs

## Support Scenarios

### "I have two accounts with different balances"

1. Check if both accounts have same email
2. If yes: should have auto-linked (investigate logs)
3. If no: likely app view + Supabase (expected behavior)
4. Solution: Ask user to use "Continue with Whop" OAuth for linking

### "My wallet balance disappeared"

1. Check which auth method they're using
2. Verify they're on the correct account (check email)
3. Check if account was recently linked (data should persist)
4. Review database for multiple user records with their identifier
