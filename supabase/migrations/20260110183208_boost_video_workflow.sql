-- Boost Video Workflow Migration
-- Adds poster role, social accounts, editor assignments, and enhanced video submissions

-- ============================================
-- 1. Add 'poster' role to brand_members
-- ============================================

-- Drop existing constraint if it exists
ALTER TABLE brand_members
DROP CONSTRAINT IF EXISTS brand_members_role_check;

-- Add new constraint with 'poster' role
DO $$
BEGIN
  -- Check if role column has a check constraint, if so update it
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%brand_members%role%'
  ) THEN
    ALTER TABLE brand_members DROP CONSTRAINT IF EXISTS brand_members_role_check;
  END IF;
END $$;

-- Create the new check constraint
ALTER TABLE brand_members
ADD CONSTRAINT brand_members_role_check
CHECK (role IN ('owner', 'admin', 'member', 'poster'));

-- ============================================
-- 2. Create brand_social_accounts table
-- ============================================

CREATE TABLE IF NOT EXISTS brand_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube')),
  account_handle TEXT NOT NULL,
  account_name TEXT,
  account_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform, account_handle)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_social_accounts_brand_id ON brand_social_accounts(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_social_accounts_platform ON brand_social_accounts(platform);

-- Enable RLS
ALTER TABLE brand_social_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Brand members can view accounts" ON brand_social_accounts;
CREATE POLICY "Brand members can view accounts"
  ON brand_social_accounts FOR SELECT
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Brand admins can insert accounts" ON brand_social_accounts;
CREATE POLICY "Brand admins can insert accounts"
  ON brand_social_accounts FOR INSERT
  WITH CHECK (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "Brand admins can update accounts" ON brand_social_accounts;
CREATE POLICY "Brand admins can update accounts"
  ON brand_social_accounts FOR UPDATE
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "Brand admins can delete accounts" ON brand_social_accounts;
CREATE POLICY "Brand admins can delete accounts"
  ON brand_social_accounts FOR DELETE
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_brand_social_accounts_updated_at
  BEFORE UPDATE ON brand_social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Create boost_editor_accounts (many-to-many assignment)
-- ============================================

CREATE TABLE IF NOT EXISTS boost_editor_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id UUID NOT NULL REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES brand_social_accounts(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(boost_id, user_id, social_account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_boost_editor_accounts_boost_id ON boost_editor_accounts(boost_id);
CREATE INDEX IF NOT EXISTS idx_boost_editor_accounts_user_id ON boost_editor_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_editor_accounts_social_account_id ON boost_editor_accounts(social_account_id);

-- Enable RLS
ALTER TABLE boost_editor_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Editors can view their assignments" ON boost_editor_accounts;
CREATE POLICY "Editors can view their assignments"
  ON boost_editor_accounts FOR SELECT
  USING (
    user_id = auth.uid() OR
    boost_id IN (
      SELECT id FROM bounty_campaigns WHERE brand_id IN (
        SELECT brand_id FROM brand_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Brand admins can manage assignments" ON boost_editor_accounts;
CREATE POLICY "Brand admins can manage assignments"
  ON boost_editor_accounts FOR ALL
  USING (
    boost_id IN (
      SELECT id FROM bounty_campaigns WHERE brand_id IN (
        SELECT brand_id FROM brand_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- ============================================
-- 4. Extend video_submissions for GDrive workflow
-- ============================================

-- Google Drive fields
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS gdrive_url TEXT;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS gdrive_validated BOOLEAN DEFAULT false;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS gdrive_file_name TEXT;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS gdrive_file_id TEXT;

-- Content fields
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS account_manager_notes TEXT;

-- Per-platform posting status (drop existing constraints first if they exist)
DO $$
BEGIN
  -- Add status columns with checks
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_submissions' AND column_name = 'status_tiktok') THEN
    ALTER TABLE video_submissions ADD COLUMN status_tiktok TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_submissions' AND column_name = 'status_instagram') THEN
    ALTER TABLE video_submissions ADD COLUMN status_instagram TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_submissions' AND column_name = 'status_youtube') THEN
    ALTER TABLE video_submissions ADD COLUMN status_youtube TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Add check constraints for platform statuses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'video_submissions_status_tiktok_check') THEN
    ALTER TABLE video_submissions ADD CONSTRAINT video_submissions_status_tiktok_check
      CHECK (status_tiktok IS NULL OR status_tiktok IN ('pending', 'approved', 'ready_to_post', 'posted', 'rejected', 'skipped'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'video_submissions_status_instagram_check') THEN
    ALTER TABLE video_submissions ADD CONSTRAINT video_submissions_status_instagram_check
      CHECK (status_instagram IS NULL OR status_instagram IN ('pending', 'approved', 'ready_to_post', 'posted', 'rejected', 'skipped'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'video_submissions_status_youtube_check') THEN
    ALTER TABLE video_submissions ADD CONSTRAINT video_submissions_status_youtube_check
      CHECK (status_youtube IS NULL OR status_youtube IN ('pending', 'approved', 'ready_to_post', 'posted', 'rejected', 'skipped'));
  END IF;
END $$;

-- Target accounts for posting
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

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_video_submissions_gdrive_file_id ON video_submissions(gdrive_file_id);
CREATE INDEX IF NOT EXISTS idx_video_submissions_status_tiktok ON video_submissions(status_tiktok);
CREATE INDEX IF NOT EXISTS idx_video_submissions_status_instagram ON video_submissions(status_instagram);
CREATE INDEX IF NOT EXISTS idx_video_submissions_status_youtube ON video_submissions(status_youtube);

-- ============================================
-- 5. Create editor_boost_stats view
-- ============================================

DROP VIEW IF EXISTS editor_boost_stats;
CREATE VIEW editor_boost_stats AS
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

-- ============================================
-- 6. Update RLS policies for poster role
-- ============================================

-- Allow posters to update video status (only status fields, not approval)
DROP POLICY IF EXISTS "Posters can update video status" ON video_submissions;
CREATE POLICY "Posters can update video status"
  ON video_submissions FOR UPDATE
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'poster')
    )
  );

-- Allow posters to view all submissions for their brand's boosts
DROP POLICY IF EXISTS "Posters can view brand submissions" ON video_submissions;
CREATE POLICY "Posters can view brand submissions"
  ON video_submissions FOR SELECT
  USING (
    creator_id = auth.uid() OR
    brand_id IN (
      SELECT brand_id FROM brand_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'poster')
    )
  );

-- ============================================
-- 7. Function to auto-set posted timestamps
-- ============================================

CREATE OR REPLACE FUNCTION set_posted_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set posted_at_tiktok when status changes to posted
  IF NEW.status_tiktok = 'posted' AND (OLD.status_tiktok IS NULL OR OLD.status_tiktok != 'posted') THEN
    NEW.posted_at_tiktok = NOW();
    IF NEW.posted_by_tiktok IS NULL THEN
      NEW.posted_by_tiktok = auth.uid();
    END IF;
  END IF;

  -- Set posted_at_instagram when status changes to posted
  IF NEW.status_instagram = 'posted' AND (OLD.status_instagram IS NULL OR OLD.status_instagram != 'posted') THEN
    NEW.posted_at_instagram = NOW();
    IF NEW.posted_by_instagram IS NULL THEN
      NEW.posted_by_instagram = auth.uid();
    END IF;
  END IF;

  -- Set posted_at_youtube when status changes to posted
  IF NEW.status_youtube = 'posted' AND (OLD.status_youtube IS NULL OR OLD.status_youtube != 'posted') THEN
    NEW.posted_at_youtube = NOW();
    IF NEW.posted_by_youtube IS NULL THEN
      NEW.posted_by_youtube = auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS video_submissions_posted_timestamps ON video_submissions;
CREATE TRIGGER video_submissions_posted_timestamps
  BEFORE UPDATE ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_posted_timestamps();

-- ============================================
-- 8. Comments for documentation
-- ============================================

COMMENT ON TABLE brand_social_accounts IS 'Social media accounts owned by brands for posting content (TikTok, Instagram, YouTube)';
COMMENT ON TABLE boost_editor_accounts IS 'Many-to-many assignment of editors to social accounts within a boost';
COMMENT ON VIEW editor_boost_stats IS 'Automatic stats tracking for editors in boosts (total, weekly, monthly, daily, paid)';

COMMENT ON COLUMN video_submissions.gdrive_url IS 'Google Drive link to the video file';
COMMENT ON COLUMN video_submissions.gdrive_validated IS 'Whether the GDrive link has been validated as accessible';
COMMENT ON COLUMN video_submissions.status_tiktok IS 'Posting status for TikTok: pending, approved, ready_to_post, posted, rejected, skipped';
COMMENT ON COLUMN video_submissions.status_instagram IS 'Posting status for Instagram: pending, approved, ready_to_post, posted, rejected, skipped';
COMMENT ON COLUMN video_submissions.status_youtube IS 'Posting status for YouTube: pending, approved, ready_to_post, posted, rejected, skipped';
