-- Drop the old unique constraint that doesn't include date ranges
ALTER TABLE campaign_account_analytics 
DROP CONSTRAINT IF EXISTS campaign_account_analytics_campaign_account_unique;