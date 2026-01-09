-- Consolidate 'locked' status to 'clearing' in payment_ledger
-- The 'locked' status is redundant - when a user requests payout, it should go directly to 'clearing'
UPDATE public.payment_ledger 
SET status = 'clearing' 
WHERE status = 'locked';

-- Add comment explaining the status values
COMMENT ON COLUMN public.payment_ledger.status IS 'Status values: pending (accruing), clearing (in 7-day review period), paid, clawed_back';