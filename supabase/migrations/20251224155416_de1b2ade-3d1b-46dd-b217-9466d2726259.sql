-- Add clawback tracking columns to submission_payout_items
ALTER TABLE public.submission_payout_items
ADD COLUMN IF NOT EXISTS clawback_status text,
ADD COLUMN IF NOT EXISTS clawback_reason text,
ADD COLUMN IF NOT EXISTS clawed_back_at timestamptz,
ADD COLUMN IF NOT EXISTS clawed_back_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS flagged_at timestamptz,
ADD COLUMN IF NOT EXISTS flagged_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS flag_reason text;

-- Add constraint for clawback_status values
ALTER TABLE public.submission_payout_items
ADD CONSTRAINT submission_payout_items_clawback_status_check 
CHECK (clawback_status IS NULL OR clawback_status IN ('pending_review', 'clawed_back', 'cleared'));

-- Create index for efficient flagged items lookup
CREATE INDEX IF NOT EXISTS idx_submission_payout_items_flagged 
ON public.submission_payout_items (flagged_at) 
WHERE flagged_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_submission_payout_items_clawback_status 
ON public.submission_payout_items (clawback_status) 
WHERE clawback_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.submission_payout_items.clawback_status IS 'Status of clawback review: pending_review, clawed_back, or cleared';
COMMENT ON COLUMN public.submission_payout_items.flagged_at IS 'When the brand flagged this submission for review';
COMMENT ON COLUMN public.submission_payout_items.flag_reason IS 'Reason provided by brand for flagging';