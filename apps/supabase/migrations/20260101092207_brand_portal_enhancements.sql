-- Brand Portal Enhancement Migration
-- Adds portal_settings to brands and creates brand_resources table

-- Add portal_settings JSONB column to brands table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'portal_settings'
  ) THEN
    ALTER TABLE brands ADD COLUMN portal_settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create brand_resources table for creator resources
CREATE TABLE IF NOT EXISTS brand_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('guideline', 'tutorial', 'asset', 'faq')),
  content_url TEXT,
  content_text TEXT,
  file_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_resources_brand_id ON brand_resources(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_resources_active ON brand_resources(brand_id, is_active);

-- Enable RLS on brand_resources
ALTER TABLE brand_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Brand admins can manage their brand's resources
DROP POLICY IF EXISTS "Brand admins can manage resources" ON brand_resources;
CREATE POLICY "Brand admins can manage resources"
  ON brand_resources
  FOR ALL
  USING (
    brand_id IN (
      SELECT brand_id FROM brand_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM brand_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policy: Creators with accepted applications can view resources
DROP POLICY IF EXISTS "Creators can view resources for their brands" ON brand_resources;
CREATE POLICY "Creators can view resources for their brands"
  ON brand_resources
  FOR SELECT
  USING (
    is_active = true AND (
      -- Creator has accepted bounty application
      brand_id IN (
        SELECT bc.brand_id FROM bounty_campaigns bc
        INNER JOIN bounty_applications ba ON ba.bounty_campaign_id = bc.id
        WHERE ba.user_id = auth.uid() AND ba.status = 'accepted'
      )
      OR
      -- Creator has accepted campaign application
      brand_id IN (
        SELECT c.brand_id FROM campaigns c
        INNER JOIN campaign_submissions cs ON cs.campaign_id = c.id
        WHERE cs.creator_id = auth.uid() AND cs.status = 'accepted'
      )
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_brand_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brand_resources_updated_at ON brand_resources;
CREATE TRIGGER brand_resources_updated_at
  BEFORE UPDATE ON brand_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_resources_updated_at();

-- Add comment for documentation
COMMENT ON TABLE brand_resources IS 'Brand-specific resources for creators including guidelines, tutorials, assets, and FAQs';
COMMENT ON COLUMN brands.portal_settings IS 'JSON settings for brand portal customization including welcome_message, accent_color_dark, show_announcements etc';
