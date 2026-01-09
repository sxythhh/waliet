
-- Drop the existing foreign key constraint and recreate with ON DELETE SET NULL
-- This allows campaigns to be deleted while preserving transaction history
ALTER TABLE public.brand_wallet_transactions 
DROP CONSTRAINT IF EXISTS brand_wallet_transactions_campaign_id_fkey;

ALTER TABLE public.brand_wallet_transactions 
ADD CONSTRAINT brand_wallet_transactions_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES public.campaigns(id) 
ON DELETE SET NULL;
