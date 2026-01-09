-- Add campaign_type and category columns to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS campaign_type TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;