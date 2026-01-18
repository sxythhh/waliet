-- Phase 2: Google Drive Validation - Schema Updates
-- Adds fields for tracking GDrive file validation and metadata

-- ============================================
-- 1. Add GDrive validation tracking columns
-- ============================================

ALTER TABLE video_submissions
ADD COLUMN IF NOT EXISTS gdrive_access_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gdrive_access_checked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gdrive_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS gdrive_file_name TEXT,
ADD COLUMN IF NOT EXISTS gdrive_mime_type TEXT,
ADD COLUMN IF NOT EXISTS gdrive_validation_error TEXT;

-- ============================================
-- 2. Add index for filtering by validation status
-- ============================================

CREATE INDEX IF NOT EXISTS idx_video_submissions_gdrive_validated
ON video_submissions(gdrive_access_validated)
WHERE gdrive_access_validated = false;

-- ============================================
-- 3. Function to extract Google Drive file ID from URL
-- ============================================

CREATE OR REPLACE FUNCTION extract_gdrive_file_id(url TEXT)
RETURNS TEXT AS $$
DECLARE
  patterns TEXT[] := ARRAY[
    '/file/d/([a-zA-Z0-9_-]+)',
    'id=([a-zA-Z0-9_-]+)',
    '/d/([a-zA-Z0-9_-]+)',
    'open\?id=([a-zA-Z0-9_-]+)'
  ];
  pattern TEXT;
  matches TEXT[];
BEGIN
  IF url IS NULL THEN
    RETURN NULL;
  END IF;

  FOREACH pattern IN ARRAY patterns
  LOOP
    matches := regexp_match(url, pattern);
    IF matches IS NOT NULL AND array_length(matches, 1) > 0 THEN
      RETURN matches[1];
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 4. Trigger to auto-extract file ID on insert/update
-- ============================================

CREATE OR REPLACE FUNCTION auto_extract_gdrive_file_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only extract if gdrive_url changed and gdrive_file_id is not set
  IF NEW.gdrive_url IS NOT NULL AND (
    NEW.gdrive_file_id IS NULL OR
    TG_OP = 'INSERT' OR
    OLD.gdrive_url IS DISTINCT FROM NEW.gdrive_url
  ) THEN
    NEW.gdrive_file_id := extract_gdrive_file_id(NEW.gdrive_url);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS extract_gdrive_id ON video_submissions;
CREATE TRIGGER extract_gdrive_id
  BEFORE INSERT OR UPDATE OF gdrive_url ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_extract_gdrive_file_id();

-- ============================================
-- 5. Add comments for documentation
-- ============================================

COMMENT ON COLUMN video_submissions.gdrive_access_validated IS 'Whether the GDrive file has been validated as publicly accessible';
COMMENT ON COLUMN video_submissions.gdrive_access_checked_at IS 'Timestamp of last GDrive access validation check';
COMMENT ON COLUMN video_submissions.gdrive_thumbnail_url IS 'Cached thumbnail URL from Google Drive';
COMMENT ON COLUMN video_submissions.gdrive_file_name IS 'Original file name from Google Drive';
COMMENT ON COLUMN video_submissions.gdrive_mime_type IS 'MIME type of the file from Google Drive';
COMMENT ON COLUMN video_submissions.gdrive_validation_error IS 'Last validation error message if validation failed';
COMMENT ON FUNCTION extract_gdrive_file_id(TEXT) IS 'Extracts Google Drive file ID from various URL formats';
