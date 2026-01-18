-- Migration: Add auto_track_shortimize columns to campaigns and bounty_campaigns
-- When enabled, creators are automatically tracked in Shortimize upon approval/acceptance

-- Add column to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS auto_track_shortimize BOOLEAN DEFAULT false;

-- Add column to bounty_campaigns table
ALTER TABLE bounty_campaigns
ADD COLUMN IF NOT EXISTS auto_track_shortimize BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.auto_track_shortimize IS 'When true, automatically track approved creators in Shortimize';
COMMENT ON COLUMN bounty_campaigns.auto_track_shortimize IS 'When true, automatically track accepted creators in Shortimize';
