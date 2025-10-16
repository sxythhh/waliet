-- Drop the existing check constraint
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_payout_method_check;

-- Add the updated check constraint with UPI included
ALTER TABLE public.wallets ADD CONSTRAINT wallets_payout_method_check 
  CHECK (payout_method IN ('crypto', 'paypal', 'bank', 'wise', 'revolut', 'debit', 'upi'));