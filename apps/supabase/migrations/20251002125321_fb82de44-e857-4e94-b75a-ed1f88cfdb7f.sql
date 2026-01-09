-- Add unique constraint to ensure one account can only be linked to one campaign
-- First, we need to handle the case where campaign_id can be null
-- We'll create a unique constraint only for non-null campaign_ids
CREATE UNIQUE INDEX unique_account_campaign ON social_accounts(id, campaign_id) 
WHERE campaign_id IS NOT NULL;