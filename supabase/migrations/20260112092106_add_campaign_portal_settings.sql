-- Migration: Add campaign portal settings table
-- Description: Enables brand portals for campaigns/boosts with customizable visibility and theming

-- Create the campaign_portal_settings table
CREATE TABLE IF NOT EXISTS campaign_portal_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  bounty_campaign_id UUID REFERENCES bounty_campaigns(id) ON DELETE CASCADE,

  -- Visibility toggles (all default true)
  show_budget BOOLEAN DEFAULT true,
  show_rpm_rate BOOLEAN DEFAULT true,
  show_creator_count BOOLEAN DEFAULT true,
  show_video_count BOOLEAN DEFAULT true,
  show_deadline BOOLEAN DEFAULT true,
  show_blueprint BOOLEAN DEFAULT true,
  show_example_videos BOOLEAN DEFAULT true,
  show_brand_description BOOLEAN DEFAULT true,

  -- Theming (null = inherit from brand)
  accent_color TEXT,

  -- SEO
  is_indexable BOOLEAN DEFAULT true,
  custom_meta_title TEXT,
  custom_meta_description TEXT,

  -- Analytics
  page_views INTEGER DEFAULT 0,
  apply_clicks INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure exactly one campaign type is set
  CONSTRAINT one_campaign_type CHECK (
    (campaign_id IS NOT NULL AND bounty_campaign_id IS NULL) OR
    (campaign_id IS NULL AND bounty_campaign_id IS NOT NULL)
  )
);

-- Create unique indexes (only one settings row per campaign)
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_settings_campaign
  ON campaign_portal_settings(campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_settings_bounty
  ON campaign_portal_settings(bounty_campaign_id)
  WHERE bounty_campaign_id IS NOT NULL;

-- Enable RLS
ALTER TABLE campaign_portal_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view portal settings (public pages need to read these)
CREATE POLICY "Portal settings are publicly readable"
  ON campaign_portal_settings
  FOR SELECT
  USING (true);

-- Brand members can insert portal settings for their campaigns
CREATE POLICY "Brand members can insert portal settings"
  ON campaign_portal_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_members bm
      WHERE bm.user_id = auth.uid()
      AND (
        (campaign_id IS NOT NULL AND bm.brand_id = (SELECT brand_id FROM campaigns WHERE id = campaign_id))
        OR
        (bounty_campaign_id IS NOT NULL AND bm.brand_id = (SELECT brand_id FROM bounty_campaigns WHERE id = bounty_campaign_id))
      )
    )
  );

-- Brand members can update portal settings for their campaigns
CREATE POLICY "Brand members can update portal settings"
  ON campaign_portal_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM brand_members bm
      WHERE bm.user_id = auth.uid()
      AND (
        (campaign_id IS NOT NULL AND bm.brand_id = (SELECT brand_id FROM campaigns WHERE id = campaign_id))
        OR
        (bounty_campaign_id IS NOT NULL AND bm.brand_id = (SELECT brand_id FROM bounty_campaigns WHERE id = bounty_campaign_id))
      )
    )
  );

-- Brand members can delete portal settings for their campaigns
CREATE POLICY "Brand members can delete portal settings"
  ON campaign_portal_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM brand_members bm
      WHERE bm.user_id = auth.uid()
      AND (
        (campaign_id IS NOT NULL AND bm.brand_id = (SELECT brand_id FROM campaigns WHERE id = campaign_id))
        OR
        (bounty_campaign_id IS NOT NULL AND bm.brand_id = (SELECT brand_id FROM bounty_campaigns WHERE id = bounty_campaign_id))
      )
    )
  );

-- Create function to increment portal page views (can be called without auth for analytics)
CREATE OR REPLACE FUNCTION increment_portal_views(
  p_campaign_id UUID DEFAULT NULL,
  p_bounty_campaign_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to increment existing record
  IF p_campaign_id IS NOT NULL THEN
    UPDATE campaign_portal_settings
    SET page_views = page_views + 1, updated_at = now()
    WHERE campaign_id = p_campaign_id;

    -- If no row was updated, create one
    IF NOT FOUND THEN
      INSERT INTO campaign_portal_settings (campaign_id, page_views)
      VALUES (p_campaign_id, 1)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSIF p_bounty_campaign_id IS NOT NULL THEN
    UPDATE campaign_portal_settings
    SET page_views = page_views + 1, updated_at = now()
    WHERE bounty_campaign_id = p_bounty_campaign_id;

    -- If no row was updated, create one
    IF NOT FOUND THEN
      INSERT INTO campaign_portal_settings (bounty_campaign_id, page_views)
      VALUES (p_bounty_campaign_id, 1)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- Create function to increment apply clicks
CREATE OR REPLACE FUNCTION increment_portal_apply_clicks(
  p_campaign_id UUID DEFAULT NULL,
  p_bounty_campaign_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_campaign_id IS NOT NULL THEN
    UPDATE campaign_portal_settings
    SET apply_clicks = apply_clicks + 1, updated_at = now()
    WHERE campaign_id = p_campaign_id;
  ELSIF p_bounty_campaign_id IS NOT NULL THEN
    UPDATE campaign_portal_settings
    SET apply_clicks = apply_clicks + 1, updated_at = now()
    WHERE bounty_campaign_id = p_bounty_campaign_id;
  END IF;
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE campaign_portal_settings IS 'Stores customization settings for campaign portal pages (white-labeled embeddable pages)';
