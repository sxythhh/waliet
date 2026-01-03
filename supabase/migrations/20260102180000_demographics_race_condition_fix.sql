-- Prevent race condition in demographic submissions
-- Only allow one pending submission per social account at a time

-- Create a partial unique index that only applies to pending submissions
-- This allows multiple approved/rejected submissions but only one pending at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_demographic_submissions_one_pending_per_account
ON public.demographic_submissions (social_account_id)
WHERE status = 'pending';

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_demographic_submissions_one_pending_per_account IS
'Ensures only one pending demographic submission can exist per social account at a time, preventing race conditions';
