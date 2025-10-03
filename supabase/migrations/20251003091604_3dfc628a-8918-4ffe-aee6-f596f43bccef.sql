-- Add date range columns to campaign_account_analytics
ALTER TABLE campaign_account_analytics 
ADD COLUMN start_date date,
ADD COLUMN end_date date;

-- Add index for faster date range queries
CREATE INDEX idx_campaign_analytics_dates ON campaign_account_analytics(campaign_id, start_date, end_date);

-- Add a unique constraint to prevent duplicate entries for the same account, campaign, and date range
CREATE UNIQUE INDEX idx_unique_account_date_range 
ON campaign_account_analytics(campaign_id, account_username, platform, start_date, end_date);