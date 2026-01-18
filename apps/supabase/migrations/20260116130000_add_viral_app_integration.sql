-- Migration: Add viral.app integration as alternative to Shortimize
-- Allows brands to choose their preferred analytics/tracking provider

-- Add viral.app API key to brand_secrets
ALTER TABLE brand_secrets
ADD COLUMN IF NOT EXISTS viral_api_key TEXT;

COMMENT ON COLUMN brand_secrets.viral_api_key IS 'API key for viral.app integration (alternative to Shortimize)';

-- Add analytics provider selection to campaigns
-- Options: 'none', 'shortimize', 'viral'
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS analytics_provider TEXT DEFAULT 'none'
  CHECK (analytics_provider IN ('none', 'shortimize', 'viral'));

-- Add analytics provider selection to bounty_campaigns (boosts)
ALTER TABLE bounty_campaigns
ADD COLUMN IF NOT EXISTS analytics_provider TEXT DEFAULT 'none'
  CHECK (analytics_provider IN ('none', 'shortimize', 'viral'));

-- Add comments for documentation
COMMENT ON COLUMN campaigns.analytics_provider IS 'Selected analytics provider for auto-tracking: none, shortimize, or viral';
COMMENT ON COLUMN bounty_campaigns.analytics_provider IS 'Selected analytics provider for auto-tracking: none, shortimize, or viral';

-- Migrate existing auto_track_shortimize settings to new analytics_provider column
-- If auto_track_shortimize is true, set analytics_provider to 'shortimize'
UPDATE campaigns
SET analytics_provider = 'shortimize'
WHERE auto_track_shortimize = true;

UPDATE bounty_campaigns
SET analytics_provider = 'shortimize'
WHERE auto_track_shortimize = true;
