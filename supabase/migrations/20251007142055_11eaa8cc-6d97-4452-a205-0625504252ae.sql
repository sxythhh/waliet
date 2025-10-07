-- First, remove duplicate records keeping only the most recent ones
DELETE FROM campaign_account_analytics a
USING campaign_account_analytics b
WHERE a.id < b.id
  AND a.campaign_id = b.campaign_id
  AND a.account_username = b.account_username
  AND a.platform = b.platform;

-- Now add the unique constraint
ALTER TABLE campaign_account_analytics 
ADD CONSTRAINT campaign_account_analytics_unique_key 
UNIQUE (campaign_id, account_username, platform);