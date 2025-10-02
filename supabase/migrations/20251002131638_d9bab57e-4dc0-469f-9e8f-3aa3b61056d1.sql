-- Add private campaign fields to campaigns table
ALTER TABLE campaigns 
ADD COLUMN is_private boolean DEFAULT false,
ADD COLUMN access_code text;

-- Create index for access code lookups
CREATE INDEX idx_campaigns_access_code ON campaigns(access_code) WHERE access_code IS NOT NULL;