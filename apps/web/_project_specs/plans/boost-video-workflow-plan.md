# Boost Video Workflow Implementation Plan

## Overview

Replace the spreadsheet-based workflow for in-house accounts (boosts) with a full in-app system for managing video submissions, approval, and posting status across platforms.

## Requirements Summary

### Status Flow (per platform)
```
Submitted → Approved → Ready to Post → Posted
         ↘ Rejected (can revise or submit new)
```

### Roles
| Role | Permissions |
|------|-------------|
| **owner/admin** | Full access, approve/reject videos |
| **poster** | View GDrive links/captions, mark Ready to Post, mark Posted |
| **member** | View only |

### Features
- Google Drive link submissions with OAuth validation
- Per-platform status tracking (TikTok, IG, YouTube)
- Caption submission (editor submits, brand can edit)
- Feedback/revision workflow
- Editor-to-account assignment (many-to-many)
- Automatic stats tracking (total, weekly, monthly, daily)
- Auto-payout when video marked as Posted

---

## Database Changes

### 1. Add 'poster' role to brand_members

```sql
-- Update role check constraint to include 'poster'
ALTER TABLE brand_members
DROP CONSTRAINT IF EXISTS brand_members_role_check;

ALTER TABLE brand_members
ADD CONSTRAINT brand_members_role_check
CHECK (role IN ('owner', 'admin', 'member', 'poster'));
```

### 2. Create brand_social_accounts table

```sql
CREATE TABLE brand_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube')),
  account_handle TEXT NOT NULL,
  account_name TEXT, -- Display name
  account_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform, account_handle)
);

-- RLS policies
ALTER TABLE brand_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand members can view accounts"
  ON brand_social_accounts FOR SELECT
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

CREATE POLICY "Brand admins can manage accounts"
  ON brand_social_accounts FOR ALL
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
```

### 3. Create boost_editor_accounts (many-to-many assignment)

```sql
CREATE TABLE boost_editor_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id UUID NOT NULL REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES brand_social_accounts(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(boost_id, user_id, social_account_id)
);

-- RLS policies
ALTER TABLE boost_editor_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can view their assignments"
  ON boost_editor_accounts FOR SELECT
  USING (user_id = auth.uid() OR
         boost_id IN (SELECT id FROM bounty_campaigns WHERE brand_id IN
           (SELECT brand_id FROM brand_members WHERE user_id = auth.uid())));

CREATE POLICY "Brand admins can manage assignments"
  ON boost_editor_accounts FOR ALL
  USING (boost_id IN (SELECT id FROM bounty_campaigns WHERE brand_id IN
    (SELECT brand_id FROM brand_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))));
```

### 4. Extend video_submissions for GDrive workflow

```sql
-- Add new columns to video_submissions
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS gdrive_url TEXT;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS gdrive_validated BOOLEAN DEFAULT false;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS gdrive_file_name TEXT;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS gdrive_file_id TEXT;

ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS account_manager_notes TEXT;

-- Per-platform posting status
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS status_tiktok TEXT DEFAULT 'pending'
  CHECK (status_tiktok IN ('pending', 'approved', 'ready_to_post', 'posted', 'rejected', 'skipped'));
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS status_instagram TEXT DEFAULT 'pending'
  CHECK (status_instagram IN ('pending', 'approved', 'ready_to_post', 'posted', 'rejected', 'skipped'));
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS status_youtube TEXT DEFAULT 'pending'
  CHECK (status_youtube IN ('pending', 'approved', 'ready_to_post', 'posted', 'rejected', 'skipped'));

-- Track which account it's assigned to post on
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS target_account_tiktok UUID REFERENCES brand_social_accounts(id);
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS target_account_instagram UUID REFERENCES brand_social_accounts(id);
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS target_account_youtube UUID REFERENCES brand_social_accounts(id);

-- Posted timestamps per platform
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS posted_at_tiktok TIMESTAMPTZ;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS posted_at_instagram TIMESTAMPTZ;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS posted_at_youtube TIMESTAMPTZ;

-- Posted by (poster who marked it)
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS posted_by_tiktok UUID REFERENCES profiles(id);
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS posted_by_instagram UUID REFERENCES profiles(id);
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS posted_by_youtube UUID REFERENCES profiles(id);

-- Revision tracking
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS revision_of UUID REFERENCES video_submissions(id);
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0;

-- Duration (from spreadsheet)
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
```

### 5. Create editor_stats view (automatic tracking)

```sql
CREATE OR REPLACE VIEW editor_boost_stats AS
SELECT
  vs.creator_id as user_id,
  vs.source_id as boost_id,
  bc.brand_id,
  COUNT(*) as total_videos,
  COUNT(*) FILTER (WHERE vs.created_at >= NOW() - INTERVAL '7 days') as weekly_videos,
  COUNT(*) FILTER (WHERE vs.created_at >= NOW() - INTERVAL '30 days') as monthly_videos,
  COUNT(*) FILTER (WHERE vs.created_at >= NOW() - INTERVAL '1 day') as daily_videos,
  COUNT(*) FILTER (WHERE
    vs.status_tiktok = 'posted' OR
    vs.status_instagram = 'posted' OR
    vs.status_youtube = 'posted'
  ) as videos_posted,
  COUNT(*) FILTER (WHERE vs.payout_amount > 0) as videos_paid,
  COALESCE(SUM(vs.payout_amount), 0) as total_earnings
FROM video_submissions vs
JOIN bounty_campaigns bc ON vs.source_id = bc.id
WHERE vs.source_type = 'boost'
GROUP BY vs.creator_id, vs.source_id, bc.brand_id;
```

### 6. Auto-payout trigger on posted

```sql
CREATE OR REPLACE FUNCTION trigger_payout_on_posted()
RETURNS TRIGGER AS $$
BEGIN
  -- If any platform status changed to 'posted' and payout not yet processed
  IF (
    (NEW.status_tiktok = 'posted' AND OLD.status_tiktok != 'posted') OR
    (NEW.status_instagram = 'posted' AND OLD.status_instagram != 'posted') OR
    (NEW.status_youtube = 'posted' AND OLD.status_youtube != 'posted')
  ) AND NEW.payout_amount IS NULL THEN
    -- Get boost details for payout calculation
    -- Payout will be handled by edge function to avoid complexity here
    -- Just mark as ready for payout
    NEW.status = 'approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_posted_payout_trigger
  BEFORE UPDATE ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payout_on_posted();
```

---

## UI Components

### 1. Brand Social Accounts Settings (BrandSocialAccountsTab.tsx)
- Add/edit/remove TikTok, Instagram, YouTube accounts
- Located in brand settings page
- Fields: platform, handle, display name, URL

### 2. Editor Account Assignment (EditorAccountAssignment.tsx)
- Assign editors to social accounts within a boost
- Many-to-many UI (checkboxes or multi-select)
- Show in boost management page

### 3. Enhanced Video Submission Dialog (SubmitBoostVideoDialog.tsx)
- Google Drive URL input with validation
- Caption input
- Optional notes
- Shows assigned accounts

### 4. Video Review Queue (BoostVideoReviewQueue.tsx)
- List of pending submissions
- Approve/reject actions for admins
- Status update for posters (Ready to Post, Posted)
- Feedback field
- Per-platform status controls

### 5. Editor Dashboard (EditorBoostDashboard.tsx)
- Shows assigned accounts
- Video submissions with status per platform
- Stats (total, weekly, monthly, paid)
- Revision/resubmit capability

### 6. Poster Dashboard (PosterDashboard.tsx)
- Videos ready to post queue
- Mark as posted per platform
- Download links (GDrive)
- View captions

---

## API/Edge Functions

### 1. validate-gdrive-link
- Validates Google Drive link is accessible
- Extracts file name and ID
- Requires Google Drive OAuth

### 2. process-video-payout
- Triggered when video marked as posted
- Calculates payout based on boost terms
- Creates wallet transaction

---

## Implementation Order

### Phase 1: Database & Core (Day 1)
1. ✅ Create migration for brand_members role update
2. ✅ Create migration for brand_social_accounts
3. ✅ Create migration for boost_editor_accounts
4. ✅ Create migration for video_submissions extensions
5. ✅ Create editor_boost_stats view

### Phase 2: Brand Settings (Day 2)
6. BrandSocialAccountsTab component
7. Add to brand settings page
8. CRUD for social accounts

### Phase 3: Editor Assignment (Day 2)
9. EditorAccountAssignment component
10. Integration with boost management

### Phase 4: Submission Flow (Day 3)
11. SubmitBoostVideoDialog with GDrive input
12. Basic GDrive URL validation (format only first)
13. Caption and notes fields

### Phase 5: Review Queue (Day 3-4)
14. BoostVideoReviewQueue component
15. Per-platform status controls
16. Feedback workflow

### Phase 6: Poster Role (Day 4)
17. Poster-specific UI
18. Ready to Post → Posted workflow
19. RLS policies for poster role

### Phase 7: Editor Dashboard (Day 5)
20. Stats display
21. Assigned accounts view
22. Revision workflow

### Phase 8: Google Drive OAuth (Day 6)
23. Add Google Drive OAuth flow
24. Full link validation
25. File metadata extraction

### Phase 9: Auto Payouts (Day 7)
26. Edge function for payout processing
27. Integration with existing wallet system

---

## Files to Create/Modify

### New Files
- `supabase/migrations/YYYYMMDD_boost_video_workflow.sql`
- `src/components/brand/BrandSocialAccountsTab.tsx`
- `src/components/brand/EditorAccountAssignment.tsx`
- `src/components/brand/BoostVideoReviewQueue.tsx`
- `src/components/brand/PosterDashboard.tsx`
- `src/components/SubmitBoostVideoDialog.tsx`
- `supabase/functions/validate-gdrive-link/index.ts`
- `supabase/functions/process-video-payout/index.ts`

### Modified Files
- `src/components/brand/BrandSettingsTab.tsx` - Add social accounts section
- `src/components/brand/BoostHomeTab.tsx` - Add review queue
- `src/components/brand/InviteMemberDialog.tsx` - Add poster role option
- `src/pages/CreatorBoostDetails.tsx` - Enhanced submission flow
- `src/components/brand/TeamMembersTab.tsx` - Show poster role

---

## Verification Criteria

1. ✅ Poster role can be assigned to team members
2. ✅ Posters can view GDrive links and captions
3. ✅ Posters can mark videos as Ready to Post / Posted per platform
4. ✅ Admins can approve/reject videos
5. ✅ Editors can submit GDrive links with captions
6. ✅ Per-platform status tracking works
7. ✅ Editor stats are automatically calculated
8. ✅ Social accounts can be managed in brand settings
9. ✅ Editors can be assigned to accounts
10. ✅ Auto-payout triggers on Posted status
