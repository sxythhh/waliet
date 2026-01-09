-- Add item-level status tracking to submission_payout_items
ALTER TABLE public.submission_payout_items 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Update existing items to match their parent request status
UPDATE public.submission_payout_items spi
SET status = CASE 
  WHEN spr.status = 'completed' THEN 'approved'
  ELSE 'pending'
END
FROM public.submission_payout_requests spr
WHERE spi.payout_request_id = spr.id;

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_submission_payout_items_status ON public.submission_payout_items(status);
CREATE INDEX IF NOT EXISTS idx_submission_payout_items_source ON public.submission_payout_items(source_type, source_id);