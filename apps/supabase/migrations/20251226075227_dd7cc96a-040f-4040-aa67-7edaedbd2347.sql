-- Add source column to video_submissions to distinguish between submitted and tracked videos
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'submitted';

-- Update any existing records to be 'submitted' (they were manually submitted)
UPDATE video_submissions SET source = 'submitted' WHERE source IS NULL;

-- Create unique index to prevent duplicate tracked videos
CREATE UNIQUE INDEX IF NOT EXISTS video_submissions_shortimize_unique 
ON video_submissions(shortimize_video_id, source_id) 
WHERE shortimize_video_id IS NOT NULL;