-- Add unique constraint on social_account_id + campaign_id to prevent duplicates
ALTER TABLE public.social_account_campaigns 
ADD CONSTRAINT social_account_campaigns_account_campaign_unique 
UNIQUE (social_account_id, campaign_id);