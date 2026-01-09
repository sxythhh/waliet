-- Drop the existing constraint
ALTER TABLE public.brand_wallet_transactions DROP CONSTRAINT IF EXISTS brand_wallet_transactions_type_check;

-- Add updated constraint with admin types
ALTER TABLE public.brand_wallet_transactions ADD CONSTRAINT brand_wallet_transactions_type_check 
CHECK (type = ANY (ARRAY['topup'::text, 'withdrawal'::text, 'campaign_allocation'::text, 'boost_allocation'::text, 'refund'::text, 'admin_credit'::text, 'admin_debit'::text]));