-- Add missing columns to video_submissions for full parity with legacy tables
ALTER TABLE public.video_submissions 
ADD COLUMN IF NOT EXISTS social_account_id uuid REFERENCES public.social_accounts(id),
ADD COLUMN IF NOT EXISTS video_title text,
ADD COLUMN IF NOT EXISTS video_upload_date timestamptz;

-- Create index for faster queries by social account
CREATE INDEX IF NOT EXISTS idx_video_submissions_social_account_id ON public.video_submissions(social_account_id);

-- Create index for source_type + source_id queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_video_submissions_source ON public.video_submissions(source_type, source_id);