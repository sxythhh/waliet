-- Add override columns to submission_payout_items table
ALTER TABLE public.submission_payout_items 
ADD COLUMN IF NOT EXISTS original_amount numeric,
ADD COLUMN IF NOT EXISTS override_amount numeric,
ADD COLUMN IF NOT EXISTS override_reason text,
ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS overridden_by uuid;

-- Add comment for documentation
COMMENT ON COLUMN public.submission_payout_items.original_amount IS 'Original calculated amount before any override';
COMMENT ON COLUMN public.submission_payout_items.override_amount IS 'Custom override amount set by brand';
COMMENT ON COLUMN public.submission_payout_items.override_reason IS 'Reason for the override';
COMMENT ON COLUMN public.submission_payout_items.overridden_at IS 'When the override was applied';
COMMENT ON COLUMN public.submission_payout_items.overridden_by IS 'User who applied the override';