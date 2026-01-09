-- Add payment tracking fields to campaign_account_analytics
ALTER TABLE campaign_account_analytics 
ADD COLUMN IF NOT EXISTS paid_views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_date timestamp with time zone;