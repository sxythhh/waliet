-- Add unique constraint for upsert operations
ALTER TABLE campaign_account_analytics 
ADD CONSTRAINT campaign_account_analytics_campaign_account_unique 
UNIQUE (campaign_id, account_username);