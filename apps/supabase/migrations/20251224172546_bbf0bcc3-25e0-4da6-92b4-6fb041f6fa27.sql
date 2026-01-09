-- Add paid_views column to video_submissions to track cumulative paid views
ALTER TABLE public.video_submissions 
ADD COLUMN IF NOT EXISTS paid_views bigint NOT NULL DEFAULT 0;

-- Add views_at_request column to submission_payout_items to snapshot views when payout was requested
ALTER TABLE public.submission_payout_items 
ADD COLUMN IF NOT EXISTS views_at_request bigint;

-- Add index for efficient querying of unpaid views
CREATE INDEX IF NOT EXISTS idx_video_submissions_paid_views ON public.video_submissions(paid_views);

-- Comment for documentation
COMMENT ON COLUMN public.video_submissions.paid_views IS 'Cumulative total of views that have been paid out for this submission';
COMMENT ON COLUMN public.submission_payout_items.views_at_request IS 'Snapshot of views included in this payout request';