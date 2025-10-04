-- Drop the old check constraint
ALTER TABLE public.wallet_transactions
DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;

-- Add updated check constraint that includes 'rejected' status
ALTER TABLE public.wallet_transactions
ADD CONSTRAINT wallet_transactions_status_check
CHECK (status IN ('pending', 'completed', 'rejected'));