# Waliet Web App - Comprehensive Implementation Plan

Generated: 2026-01-20

## Executive Summary

This plan addresses inconsistencies, bugs, missing features, and poor implementations identified across the waliet web app.

---

## Critical Issues (Priority 1)

### 1. Sign Out Not Implemented
**Location:** `app/dashboard/layout.tsx:166`
**Issue:** Sign out button has `TODO: Implement sign out` comment and doesn't actually sign out
**Impact:** Users cannot log out of the app
**Fix:** Call the `/api/auth/signout` endpoint and redirect to home

### 2. Admin Role Check Missing
**Locations:**
- `app/api/admin/metrics/route.ts:14`
- `app/api/admin/activity/route.ts:23`

**Issue:** Admin APIs don't verify admin role, only check authentication
**Impact:** Security vulnerability - any authenticated user can access admin data
**Fix:** Add admin role verification using `getDualAuthUser()` with role check

### 3. Alert() Usage Instead of Toast
**Location:** `components/dashboard-new/SellerDetailSheet.tsx:123`
**Issue:** Uses `alert("Session booked successfully!")` instead of toast notification
**Impact:** Poor UX, blocks JS execution
**Fix:** Replace with toast component from `@/components/ui/toast`

---

## High Priority Issues (Priority 2)

### 4. Schema Migration Needed for Profile Features
**Locations:**
- `app/api/app/profile/route.ts:77` - bannerUrl returns null
- `app/api/app/profile/route.ts:80` - location returns null

**Issue:** ProfileTab UI supports bannerUrl and location editing but database schema doesn't have these fields
**Impact:** Profile banner and location edits are lost on save
**Fix:** Add Prisma migration for `bannerUrl` and `location` fields on User model

### 5. Withdrawal API Not Implemented
**Location:** `components/dashboard-new/WalletTab.tsx:172`
**Issue:** TODO comment - withdrawal button doesn't call API
**Impact:** Users cannot withdraw funds
**Fix:** Implement withdrawal endpoint and connect to UI

### 6. Notification System Not Implemented
**Locations (8 TODOs):**
- `app/api/sessions/route.ts:198` - New booking notification to seller
- `app/api/sessions/[sessionId]/cancel/route.ts:85` - Cancel notification
- `app/api/sessions/[sessionId]/accept/route.ts:69` - Accept notification to buyer
- `app/api/sessions/[sessionId]/complete/route.ts:109` - Completion notification
- `app/api/sessions/[sessionId]/dispute/route.ts:104` - Dispute notification
- `app/api/sessions/[sessionId]/decline/route.ts:82` - Decline notification
- `app/api/disputes/[disputeId]/route.ts:157` - Dispute resolution notification
- `app/api/disputes/[disputeId]/route.ts:191` - Dispute cancellation notification

**Issue:** No notifications sent for session lifecycle events
**Impact:** Users miss important updates about their bookings
**Fix:** Implement notification service (email/push) and integrate with session APIs

---

## Medium Priority Issues (Priority 3)

### 7. Icon Library Inconsistency
**Issue:** App mixes `lucide-react` and `react-icons/md` icon libraries

**Files using lucide-react (30 files):**
- All of `components/dashboard-new/` (16 files)
- All of `components/workspace/` (7 files)
- All of `components/seller/` (7 files)

**Files using react-icons/md:**
- `components/dashboard/`
- `components/ui/`
- `components/layout/`
- `app/dashboard/layout.tsx`

**Impact:** Inconsistent icon styling, larger bundle size from two libraries
**Fix:** Standardize on one library (recommend lucide-react as it's more modern) and migrate all files

### 8. Duplicate Dashboard Components
**Issue:** Two dashboard component directories exist:
- `components/dashboard/` (older, uses react-icons)
- `components/dashboard-new/` (newer, uses lucide-react)

**Impact:** Code duplication, confusion about which components to use
**Fix:** Consolidate into single directory, remove unused components

### 9. Demo Mode/Mock Data in apps/web
**Locations:**
- `apps/web/src/contexts/WorkspaceContext.tsx:36`
- `apps/web/src/components/brand/UserSettingsTab.tsx:739, 942`
- `apps/web/src/components/brand/CreatorDatabaseTab.tsx:540-569`
- `apps/web/src/components/brand/BlueprintsTab.tsx:124`
- `apps/web/src/components/brand/BrandWalletTab.tsx:206-224`
- `apps/web/src/components/brand/CreatorContractsTab.tsx:227-247`
- `apps/web/src/components/dashboard/BrandCampaignsTab.tsx:135`
- `apps/web/src/pages/Dashboard.tsx:155, 208`

**Issue:** Many components fall back to demo/mock data
**Impact:** Inconsistent data display, potential data leakage
**Fix:** Remove demo mode or clearly gate it behind feature flag

### 10. TypeScript `any` Type Usage
**Issue:** 30+ locations use `any` type casting
**Examples:**
- `apps/web/src/components/VideoHistoryDialog.tsx:21` - `video: any`
- `apps/web/src/components/ApplyToBountySheet.tsx:39` - `application_questions?: any`
- Multiple `catch (error: any)` patterns

**Impact:** Type safety violations, potential runtime errors
**Fix:** Add proper types for all `any` usages

---

## Low Priority Issues (Priority 4)

### 11. Console.log Statements in Production Code
**Issue:** 50+ console.error statements across components (expected for error handling)
**Impact:** Noisy console output in production
**Fix:** Consider implementing proper error logging service

### 12. Missing RequestsTab Component
**Location:** `app/experiences/[experienceId]/page.tsx:358`
**Issue:** TODO comment for creating RequestsTab component
**Impact:** Tab exists but has no content
**Fix:** Create RequestsTab component for managing session requests

### 13. BuyerTabs Incomplete API Response
**Location:** `components/app/BuyerTabs.tsx:41`
**Issue:** `totalEarnings: 0` with TODO comment
**Impact:** Buyers can't see their total earnings
**Fix:** Add totalEarnings to API response

---

## Implementation Phases

### Phase 1: Critical Security & Functionality (Week 1)
1. Implement sign out functionality
2. Add admin role verification to admin APIs
3. Replace alert() with toast notifications
4. Add database migration for bannerUrl and location fields

### Phase 2: Core Features (Week 2)
1. Implement withdrawal API
2. Set up notification service infrastructure
3. Add email notifications for session lifecycle

### Phase 3: Code Quality (Week 3)
1. Standardize icon library (choose lucide-react or react-icons)
2. Consolidate dashboard components
3. Add proper TypeScript types for `any` usages

### Phase 4: Cleanup (Week 4)
1. Remove or feature-flag demo mode
2. Create missing components (RequestsTab)
3. Implement proper error logging service

---

## Files to Modify Summary

| Priority | File | Issue |
|----------|------|-------|
| P1 | `app/dashboard/layout.tsx` | Sign out implementation |
| P1 | `app/api/admin/metrics/route.ts` | Admin role check |
| P1 | `app/api/admin/activity/route.ts` | Admin role check |
| P1 | `components/dashboard-new/SellerDetailSheet.tsx` | Replace alert with toast |
| P2 | `prisma/schema.prisma` | Add bannerUrl, location fields |
| P2 | `app/api/app/profile/route.ts` | Support new fields |
| P2 | `components/dashboard-new/WalletTab.tsx` | Connect withdrawal API |
| P2 | `app/api/sessions/*.ts` (8 files) | Add notifications |
| P3 | `components/dashboard-new/*` (16 files) | Icon standardization |
| P3 | `components/workspace/*` (7 files) | Icon standardization |
| P3 | `components/seller/*` (7 files) | Icon standardization |

---

## Validation Checklist

- [ ] Sign out works and redirects to home
- [ ] Admin APIs return 403 for non-admin users
- [ ] Toast notifications appear instead of alert dialogs
- [ ] Profile banner and location persist after save
- [ ] Withdrawal button triggers API call
- [ ] Session notifications are sent (check email)
- [ ] All components use consistent icon library
- [ ] No TypeScript `any` errors in strict mode
- [ ] Demo mode is clearly gated
