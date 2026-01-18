-- Extend creator_portfolios with faceless creator specific fields
-- Adds skill type references, editing software, turnaround time, and sample videos

-- Add new columns to creator_portfolios
ALTER TABLE creator_portfolios
ADD COLUMN IF NOT EXISTS primary_skill_type_id UUID REFERENCES creator_skill_types(id),
ADD COLUMN IF NOT EXISTS secondary_skill_types UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS editing_software TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS turnaround_hours INTEGER,
ADD COLUMN IF NOT EXISTS sample_video_urls JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS verified_portfolio BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS portfolio_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS portfolio_verified_by UUID REFERENCES profiles(id);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_portfolios_skill_type ON creator_portfolios(primary_skill_type_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_editing_software ON creator_portfolios USING GIN(editing_software);
CREATE INDEX IF NOT EXISTS idx_portfolios_verified ON creator_portfolios(verified_portfolio) WHERE verified_portfolio = true;

-- Add constraint for turnaround hours (reasonable range)
ALTER TABLE creator_portfolios
ADD CONSTRAINT check_turnaround_hours CHECK (turnaround_hours IS NULL OR (turnaround_hours >= 1 AND turnaround_hours <= 720));

COMMENT ON COLUMN creator_portfolios.primary_skill_type_id IS 'Primary skill type from creator_skill_types taxonomy';
COMMENT ON COLUMN creator_portfolios.secondary_skill_types IS 'Array of secondary skill type UUIDs the creator can also perform';
COMMENT ON COLUMN creator_portfolios.editing_software IS 'Array of editing software the creator uses (CapCut, Premiere, DaVinci, etc)';
COMMENT ON COLUMN creator_portfolios.turnaround_hours IS 'Typical turnaround time in hours for standard projects';
COMMENT ON COLUMN creator_portfolios.sample_video_urls IS 'JSONB array of sample video URLs with metadata: [{url, title, platform, views}]';
COMMENT ON COLUMN creator_portfolios.verified_portfolio IS 'Whether portfolio has been verified by ops team';
