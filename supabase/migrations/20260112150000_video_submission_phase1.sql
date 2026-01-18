-- Phase 1: Core Kanban Flow - Schema Updates
-- Adds posted URL proof fields, caption tracking, and status history

-- ============================================
-- 1. Add posted URL proof fields per platform
-- ============================================

ALTER TABLE video_submissions
ADD COLUMN IF NOT EXISTS posted_url_tiktok TEXT,
ADD COLUMN IF NOT EXISTS posted_url_instagram TEXT,
ADD COLUMN IF NOT EXISTS posted_url_youtube TEXT;

-- ============================================
-- 2. Add caption edit tracking
-- ============================================

ALTER TABLE video_submissions
ADD COLUMN IF NOT EXISTS caption_edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS caption_edited_by UUID REFERENCES profiles(id);

-- ============================================
-- 3. Add scheduling fields (optional dates)
-- ============================================

ALTER TABLE video_submissions
ADD COLUMN IF NOT EXISTS scheduled_post_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_post_time TIME;

-- ============================================
-- 4. Create status history table for audit trail
-- ============================================

CREATE TABLE IF NOT EXISTS video_submission_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES video_submissions(id) ON DELETE CASCADE,

  -- What changed
  platform TEXT, -- NULL for overall status, 'tiktok'/'instagram'/'youtube' for platform-specific
  previous_status TEXT,
  new_status TEXT NOT NULL,

  -- Context
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT, -- For rejections/revisions
  metadata JSONB DEFAULT '{}'::jsonb -- Additional context (e.g., posted URLs)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_submission_status_history_submission
ON video_submission_status_history(submission_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_status_history_changed_by
ON video_submission_status_history(changed_by, changed_at DESC);

-- ============================================
-- 5. RLS for status history table
-- ============================================

ALTER TABLE video_submission_status_history ENABLE ROW LEVEL SECURITY;

-- Brand team members can view history for their boost submissions
CREATE POLICY "Brand team can view submission history"
ON video_submission_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM video_submissions vs
    JOIN bounty_campaigns bc ON vs.bounty_campaign_id = bc.id
    JOIN brand_members bm ON bc.brand_id = bm.brand_id
    WHERE vs.id = video_submission_status_history.submission_id
    AND bm.user_id = auth.uid()
  )
);

-- Brand team members can insert history for their boost submissions
CREATE POLICY "Brand team can insert submission history"
ON video_submission_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM video_submissions vs
    JOIN bounty_campaigns bc ON vs.bounty_campaign_id = bc.id
    JOIN brand_members bm ON bc.brand_id = bm.brand_id
    WHERE vs.id = video_submission_status_history.submission_id
    AND bm.user_id = auth.uid()
  )
);

-- Editors can view history for their own submissions
CREATE POLICY "Editors can view own submission history"
ON video_submission_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM video_submissions vs
    WHERE vs.id = video_submission_status_history.submission_id
    AND vs.user_id = auth.uid()
  )
);

-- ============================================
-- 6. Trigger to validate posted URL requirement
-- ============================================

CREATE OR REPLACE FUNCTION validate_posted_url_required()
RETURNS TRIGGER AS $$
BEGIN
  -- When moving to 'posted' status for TikTok, require the URL
  IF NEW.status_tiktok = 'posted' AND (OLD.status_tiktok IS NULL OR OLD.status_tiktok != 'posted') THEN
    IF NEW.target_account_tiktok IS NOT NULL AND (NEW.posted_url_tiktok IS NULL OR NEW.posted_url_tiktok = '') THEN
      RAISE EXCEPTION 'Posted URL required for TikTok when marking as posted';
    END IF;
  END IF;

  -- When moving to 'posted' status for Instagram, require the URL
  IF NEW.status_instagram = 'posted' AND (OLD.status_instagram IS NULL OR OLD.status_instagram != 'posted') THEN
    IF NEW.target_account_instagram IS NOT NULL AND (NEW.posted_url_instagram IS NULL OR NEW.posted_url_instagram = '') THEN
      RAISE EXCEPTION 'Posted URL required for Instagram when marking as posted';
    END IF;
  END IF;

  -- When moving to 'posted' status for YouTube, require the URL
  IF NEW.status_youtube = 'posted' AND (OLD.status_youtube IS NULL OR OLD.status_youtube != 'posted') THEN
    IF NEW.target_account_youtube IS NOT NULL AND (NEW.posted_url_youtube IS NULL OR NEW.posted_url_youtube = '') THEN
      RAISE EXCEPTION 'Posted URL required for YouTube when marking as posted';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS check_posted_url ON video_submissions;
CREATE TRIGGER check_posted_url
  BEFORE UPDATE ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION validate_posted_url_required();

-- ============================================
-- 7. Function to log status changes
-- ============================================

CREATE OR REPLACE FUNCTION log_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log overall status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO video_submission_status_history (
      submission_id, platform, previous_status, new_status, changed_by, reason
    ) VALUES (
      NEW.id, NULL, OLD.status, NEW.status, auth.uid(), NEW.feedback
    );
  END IF;

  -- Log TikTok status change
  IF OLD.status_tiktok IS DISTINCT FROM NEW.status_tiktok THEN
    INSERT INTO video_submission_status_history (
      submission_id, platform, previous_status, new_status, changed_by, metadata
    ) VALUES (
      NEW.id, 'tiktok', OLD.status_tiktok, NEW.status_tiktok, auth.uid(),
      CASE WHEN NEW.status_tiktok = 'posted' THEN jsonb_build_object('posted_url', NEW.posted_url_tiktok) ELSE '{}'::jsonb END
    );
  END IF;

  -- Log Instagram status change
  IF OLD.status_instagram IS DISTINCT FROM NEW.status_instagram THEN
    INSERT INTO video_submission_status_history (
      submission_id, platform, previous_status, new_status, changed_by, metadata
    ) VALUES (
      NEW.id, 'instagram', OLD.status_instagram, NEW.status_instagram, auth.uid(),
      CASE WHEN NEW.status_instagram = 'posted' THEN jsonb_build_object('posted_url', NEW.posted_url_instagram) ELSE '{}'::jsonb END
    );
  END IF;

  -- Log YouTube status change
  IF OLD.status_youtube IS DISTINCT FROM NEW.status_youtube THEN
    INSERT INTO video_submission_status_history (
      submission_id, platform, previous_status, new_status, changed_by, metadata
    ) VALUES (
      NEW.id, 'youtube', OLD.status_youtube, NEW.status_youtube, auth.uid(),
      CASE WHEN NEW.status_youtube = 'posted' THEN jsonb_build_object('posted_url', NEW.posted_url_youtube) ELSE '{}'::jsonb END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS log_status_change ON video_submissions;
CREATE TRIGGER log_status_change
  AFTER UPDATE ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION log_submission_status_change();

-- ============================================
-- 8. Function to update caption with tracking
-- ============================================

CREATE OR REPLACE FUNCTION update_submission_caption(
  p_submission_id UUID,
  p_caption TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_posted BOOLEAN;
BEGIN
  -- Check if any platform is already posted
  SELECT
    (status_tiktok = 'posted' OR status_instagram = 'posted' OR status_youtube = 'posted')
  INTO v_is_posted
  FROM video_submissions
  WHERE id = p_submission_id;

  IF v_is_posted THEN
    RAISE EXCEPTION 'Cannot edit caption after video has been posted';
  END IF;

  -- Update caption with tracking
  UPDATE video_submissions
  SET
    caption = p_caption,
    caption_edited_at = NOW(),
    caption_edited_by = auth.uid()
  WHERE id = p_submission_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. Add comment for documentation
-- ============================================

COMMENT ON TABLE video_submission_status_history IS 'Audit trail for video submission status changes';
COMMENT ON COLUMN video_submissions.posted_url_tiktok IS 'URL proof of the posted TikTok video';
COMMENT ON COLUMN video_submissions.posted_url_instagram IS 'URL proof of the posted Instagram video';
COMMENT ON COLUMN video_submissions.posted_url_youtube IS 'URL proof of the posted YouTube video';
COMMENT ON COLUMN video_submissions.scheduled_post_date IS 'Optional target date for posting';
COMMENT ON COLUMN video_submissions.scheduled_post_time IS 'Optional target time for posting';
