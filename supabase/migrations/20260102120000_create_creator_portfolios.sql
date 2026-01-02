-- Create creator_portfolios table for comprehensive portfolio/resume system
CREATE TABLE IF NOT EXISTS creator_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Resume Builder
  work_experience JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  skills TEXT[] DEFAULT '{}',
  certifications JSONB DEFAULT '[]'::jsonb,

  -- Media Showcase
  featured_videos JSONB DEFAULT '[]'::jsonb,
  showcase_items JSONB DEFAULT '[]'::jsonb,

  -- Creator-Specific Info
  content_niches TEXT[] DEFAULT '{}',
  platforms JSONB DEFAULT '[]'::jsonb,
  equipment TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  availability TEXT,
  rate_range JSONB,

  -- Custom Sections
  custom_sections JSONB DEFAULT '[]'::jsonb,

  -- Section Ordering
  section_order TEXT[] DEFAULT '{}',

  -- Metadata
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_creator_portfolios_user ON creator_portfolios(user_id);

-- Create index for public portfolios
CREATE INDEX IF NOT EXISTS idx_creator_portfolios_public ON creator_portfolios(is_public) WHERE is_public = true;

-- Add comments for documentation
COMMENT ON TABLE creator_portfolios IS 'Creator portfolio/resume data for public profile pages';
COMMENT ON COLUMN creator_portfolios.work_experience IS 'Array of work experience objects: {id, company, role, description, startDate, endDate, current, highlights[]}';
COMMENT ON COLUMN creator_portfolios.education IS 'Array of education objects: {id, institution, degree, field, startDate, endDate, current}';
COMMENT ON COLUMN creator_portfolios.skills IS 'Array of skill strings';
COMMENT ON COLUMN creator_portfolios.certifications IS 'Array of certification objects: {id, name, issuer, date, url}';
COMMENT ON COLUMN creator_portfolios.featured_videos IS 'Array of featured video objects: {id, submissionId, externalUrl, title, description, thumbnailUrl, views, platform}';
COMMENT ON COLUMN creator_portfolios.showcase_items IS 'Array of showcase items: {id, type, url, title, description, thumbnailUrl}';
COMMENT ON COLUMN creator_portfolios.platforms IS 'Array of platform info: {platform, handle, url, followers, verified}';
COMMENT ON COLUMN creator_portfolios.rate_range IS 'Rate range object: {min, max, currency, type}';
COMMENT ON COLUMN creator_portfolios.custom_sections IS 'Array of custom sections: {id, title, type, content, order}';
COMMENT ON COLUMN creator_portfolios.section_order IS 'Array of section IDs defining display order';

-- Enable RLS
ALTER TABLE creator_portfolios ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own portfolio
CREATE POLICY "Users can view own portfolio"
  ON creator_portfolios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Anyone can view public portfolios
CREATE POLICY "Anyone can view public portfolios"
  ON creator_portfolios FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Policy: Users can insert their own portfolio
CREATE POLICY "Users can insert own portfolio"
  ON creator_portfolios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own portfolio
CREATE POLICY "Users can update own portfolio"
  ON creator_portfolios FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own portfolio
CREATE POLICY "Users can delete own portfolio"
  ON creator_portfolios FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_creator_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_creator_portfolio_updated_at
  BEFORE UPDATE ON creator_portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_portfolio_updated_at();
