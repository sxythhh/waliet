# Senior Dev Code Review: Virality Nexus

**Reviewer**: Senior Software Engineer (10+ years experience)
**Date**: 2026-01-08
**Severity Legend**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Executive Summary

I've reviewed this codebase with a focus on the payment and financial systems. **I found multiple critical issues that could result in financial loss, security vulnerabilities, and compliance problems.** The codebase lacks any test coverage (0 tests before this review), which is unacceptable for a payments platform handling real money.

**Test Results After Adding Tests:**
- 45 tests written
- 34 passed, 11 failed
- Failed tests expose **real bugs in production code**

---

## 🔴 CRITICAL: Feature I Absolutely Hate

### `usePaymentLedger.ts` - The Financial Calculation Hook

**Location**: `src/hooks/usePaymentLedger.ts`

This hook is responsible for calculating how much money creators are owed. It has **7 critical bugs** that could result in incorrect payouts, fraud, or lawsuits.

---

### Issue #1: Floating Point Arithmetic for Money 🔴

**Location**: Lines 126-130

```typescript
summaryData.totalAccrued += accrued;
summaryData.totalPaid += paid;
```

**Problem**: Using JavaScript floating point for financial calculations.

```javascript
0.1 + 0.2 = 0.30000000000000004  // NOT 0.3
```

**Impact**:
- Creators could be underpaid by fractions of cents
- Over thousands of transactions, errors compound
- Lawsuit waiting to happen

**Fix**:
```typescript
// Use integer cents or a money library like dinero.js
const accrued = Math.round(Number(entry.accrued_amount) * 100); // cents
summaryData.totalAccrued += accrued;
// Then divide by 100 only for display
```

---

### Issue #2: Race Condition in Fetch 🔴

**Location**: Lines 79-235

**Problem**: When `userId` changes rapidly, multiple fetches run concurrently. No request cancellation or ordering means old data can overwrite new data.

```typescript
// User switches from A → B quickly
// Request for A takes 2 seconds
// Request for B takes 0.5 seconds
// Result: B's data loads first, then A's data overwrites it!
```

**Fix**: Use AbortController and track request ordering:
```typescript
const requestIdRef = useRef(0);

const fetchEntries = useCallback(async () => {
  const currentRequestId = ++requestIdRef.current;
  // ... fetch ...
  if (currentRequestId !== requestIdRef.current) return; // Stale request
  setEntries(data);
}, [userId]);
```

---

### Issue #3: Negative Balance Masking 🟠

**Location**: Line 128

```typescript
const pending = Math.max(0, accrued - paid);
```

**Problem**: If `paid > accrued` (overpayment), this silently becomes 0. This could indicate:
- Fraud (someone hacked a higher payout)
- Database corruption
- Bug in payout logic

**Impact**: You're hiding financial anomalies instead of alerting on them.

**Fix**:
```typescript
const pending = accrued - paid;
if (pending < 0) {
  summaryData.hasAnomalies = true;
  logToSentry('Overpayment detected', { entryId: entry.id, overpayment: Math.abs(pending) });
}
```

---

### Issue #4: Authorization Bypass 🔴

**Location**: Lines 84-91

```typescript
const targetUserId = userId || session?.user?.id;
// Then fetches data for targetUserId
```

**Problem**: The hook accepts any `userId` parameter and fetches that user's financial data. No authorization check!

**Attack**: A malicious component could call `usePaymentLedger('victim-user-id')` and see their payment history.

**Why RLS Isn't Enough**: RLS should block this, but:
1. Defense in depth - client code should also check
2. RLS misconfigurations happen
3. Admin contexts might bypass RLS

**Fix**:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const authenticatedUserId = session?.user?.id;

if (userId && userId !== authenticatedUserId && !isAdmin(session)) {
  throw new Error('Unauthorized: Cannot access another user\'s payment data');
}
```

---

### Issue #5: Unsafe Number Coercion 🟠

**Location**: Lines 126-127

```typescript
const accrued = Number(entry.accrued_amount) || 0;
```

**Problem**: If database returns string `"Infinity"` or `"NaN"`:
- `Number("Infinity")` = `Infinity`
- `Infinity || 0` = `Infinity` (truthy!)
- Total becomes `Infinity`, breaking all calculations

**Fix**:
```typescript
const parseAmount = (value: unknown): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num;
};
```

---

### Issue #6: Timezone-Dependent Clearing Period 🟡

**Location**: Lines 157-160

```typescript
const daysSinceLocked = (Date.now() - lockedDate.getTime()) / (1000 * 60 * 60 * 24);
if (daysSinceLocked < 4) {
  summaryData.hasActiveFlaggableItems = true;
}
```

**Problem**: This calculation depends on the client's clock and timezone. A user in Tokyo and LA could see different flagging windows for the same payment.

**Impact**: Compliance deadlines must be server-authoritative.

**Fix**: Calculate on server or use UTC consistently:
```typescript
// Server should set absolute deadline
const flaggingDeadline = new Date(entry.locked_at);
flaggingDeadline.setUTCDate(flaggingDeadline.getUTCDate() + 4);
const canBeFlagged = new Date() < flaggingDeadline;
```

---

### Issue #7: Memory Leak in Realtime Subscription 🟡

**Location**: Lines 241-259

```typescript
const channel = supabase
  .channel(`payment-ledger-${userId}`)
  // ...
  .subscribe();
```

**Problem**: If `userId` is initially `undefined`, a channel named `payment-ledger-undefined` is created. When `userId` becomes defined, a new channel is created but the old one isn't cleaned up until unmount.

**Fix**: Recreate subscription when userId changes:
```typescript
useEffect(() => {
  if (!userId) return; // Don't subscribe without valid userId

  const channel = supabase.channel(`payment-ledger-${userId}`)...;

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]); // userId in deps, not fetchEntries
```

---

## 🟠 HIGH: Other Problematic Code

### `useReferralTracking.ts` - Race Conditions & Data Integrity

**Location**: `src/hooks/useReferralTracking.ts`

#### TOCTOU Bug in Referral Count (Lines 77-88)

```typescript
const { data: currentProfile } = await supabase
  .from("profiles")
  .select("total_referrals")
  .eq("id", referrer.id)
  .single();

if (currentProfile) {
  await supabase
    .from("profiles")
    .update({ total_referrals: (currentProfile.total_referrals || 0) + 1 })
    .eq("id", referrer.id);
}
```

**Problem**: Classic Time-Of-Check-Time-Of-Use bug. Two simultaneous referrals read `5`, both update to `6`. Lost referral credit!

**Fix**: Use atomic increment:
```sql
UPDATE profiles SET total_referrals = total_referrals + 1 WHERE id = $1
```
Or via Supabase RPC:
```typescript
await supabase.rpc('increment_referrals', { referrer_id: referrer.id });
```

#### No Rate Limiting on Click Tracking

```typescript
// Every page load with ?ref= fires this
await supabase.functions.invoke('track-referral-click', {
  body: { referral_code: referralCode }
});
```

**Problem**: Malicious actor puts referral link on high-traffic site → thousands of function invocations → $$$$ in cloud costs.

**Fix**: Debounce in localStorage or use sessionStorage.

---

### `useAnalyticsDashboard.ts` - Fake Data in Production

**Location**: Lines 251-252, 210-211

```typescript
views: Math.floor(Math.random() * 1000000), // Placeholder
sparkline: Array.from({ length: 7 }, () => Math.random() * 100),
```

**Problem**: Production code is showing random fake data to users!

---

### `subscriptionLimits.ts` - Infinity Serialization

**Location**: Line 7

```typescript
enterprise: { campaigns: Infinity, boosts: Infinity, hires: Infinity },
```

**Problem**: `JSON.stringify({ limit: Infinity })` produces `{ "limit": null }`. Any API response, logging, or caching breaks.

**Fix**: Use `Number.MAX_SAFE_INTEGER` or a sentinel like `-1`:
```typescript
enterprise: { campaigns: -1, boosts: -1, hires: -1 }, // -1 = unlimited

function isUnlimited(limit: number): boolean {
  return limit === -1;
}
```

---

## 🟡 MEDIUM: Missing Edge Cases

### 1. Empty String Validation

Multiple hooks accept `userId` but don't distinguish between:
- `undefined` (not logged in)
- `null` (explicit no user)
- `""` (empty string, probably a bug)

### 2. Plan Name Case Sensitivity

```typescript
getPlanLimits('starter')  // ✓ Works
getPlanLimits('Starter')  // ✗ Returns {0, 0, 0}
getPlanLimits('STARTER')  // ✗ Returns {0, 0, 0}
```

Silent failure on case mismatch.

### 3. Error State Reset

Most hooks don't reset error state on retry. After an error, `error` stays truthy even after successful fetch.

---

## 🟢 LOW: Code Style Issues

1. **Inconsistent error handling**: Some use `throw`, some use `return { error }`, some use `console.error` and continue
2. **Magic numbers**: `daysSinceLocked < 4` should be `FLAGGING_WINDOW_DAYS`
3. **Missing TypeScript strictness**: No `as const` assertions, loose types with `as any`

---

## Test Coverage Added

I've added comprehensive tests that exposed these bugs:

| File | Tests | Passing | Failing |
|------|-------|---------|---------|
| `usePaymentLedger.test.ts` | 11 | 8 | 3 |
| `useReferralTracking.test.ts` | 11 | 3 | 8 |
| `subscriptionLimits.test.ts` | 23 | 23 | 0 |
| **Total** | **45** | **34** | **11** |

Failing tests document actual bugs in the codebase.

---

## Recommendations

### Immediate Actions (This Week)

1. **Fix floating point math** in all financial calculations
2. **Add authorization checks** in `usePaymentLedger`
3. **Remove fake data** from analytics dashboard
4. **Replace Infinity** with proper unlimited sentinel

### Short-Term (This Month)

1. **Atomic increment** for referral counts
2. **Request cancellation** in all data-fetching hooks
3. **Rate limiting** on referral click tracking
4. **Timezone-aware** clearing period calculations

### Long-Term

1. Achieve **80% test coverage** across hooks and utils
2. Add **E2E tests** for payment flows
3. Implement **audit logging** for all financial operations
4. Add **anomaly detection** alerts for overpayments

---

## Conclusion

This is a payments platform handling real money with **zero tests** and **multiple critical bugs** in financial calculation code. The `usePaymentLedger` hook alone has 7 issues that could result in:

- Incorrect creator payouts
- Authorization bypasses
- Data races causing inconsistent state
- Silent failures masking fraud

Before any feature work, this codebase needs:
1. Test infrastructure (✅ Added)
2. Critical bug fixes
3. Security audit of payment flows

I would not ship this to production without addressing at least the 🔴 Critical issues.

---

*Review completed. Tests added. Ball is in your court.*
