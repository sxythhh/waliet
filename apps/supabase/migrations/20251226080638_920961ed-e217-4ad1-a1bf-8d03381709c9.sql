-- Drop the partial unique index
DROP INDEX IF EXISTS video_submissions_shortimize_unique;

-- Create a proper unique constraint (not partial) for upsert to work
CREATE UNIQUE INDEX video_submissions_shortimize_source_unique 
ON public.video_submissions (shortimize_video_id, source_id);