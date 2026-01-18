-- Creator rate cards table for pricing by skill type
-- Enables skill-based pricing tiers (differentiation vs Whop's flat rates)

CREATE TABLE IF NOT EXISTS creator_rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_type_id UUID NOT NULL REFERENCES creator_skill_types(id),

  -- Pricing tiers
  rate_per_video NUMERIC, -- Base rate per video
  rate_per_1k_views NUMERIC, -- Performance bonus rate (for hybrid campaigns)
  min_guarantee NUMERIC, -- Minimum guarantee for performance deals
  retainer_monthly NUMERIC, -- Monthly retainer rate for ongoing work

  -- Package deals
  bulk_discount_5 NUMERIC(3,2), -- % discount for 5+ videos (e.g., 0.10 = 10%)
  bulk_discount_10 NUMERIC(3,2), -- % discount for 10+ videos

  -- Terms
  turnaround_days INTEGER DEFAULT 3,
  revisions_included INTEGER DEFAULT 2,
  rush_fee_multiplier NUMERIC(3,2) DEFAULT 1.5, -- Multiplier for rush jobs

  -- Visibility
  is_negotiable BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  currency TEXT DEFAULT 'USD',

  -- Metadata
  notes TEXT, -- Creator notes about their pricing
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One rate card per creator-skill combination
  CONSTRAINT unique_creator_skill_rate UNIQUE (creator_id, skill_type_id),

  -- Reasonable constraints
  CONSTRAINT check_rate_per_video CHECK (rate_per_video IS NULL OR rate_per_video >= 0),
  CONSTRAINT check_rate_per_1k CHECK (rate_per_1k_views IS NULL OR rate_per_1k_views >= 0),
  CONSTRAINT check_min_guarantee CHECK (min_guarantee IS NULL OR min_guarantee >= 0),
  CONSTRAINT check_retainer CHECK (retainer_monthly IS NULL OR retainer_monthly >= 0),
  CONSTRAINT check_turnaround CHECK (turnaround_days IS NULL OR turnaround_days >= 1),
  CONSTRAINT check_revisions CHECK (revisions_included IS NULL OR revisions_included >= 0)
);

-- Indexes for efficient querying
CREATE INDEX idx_rate_cards_creator ON creator_rate_cards(creator_id);
CREATE INDEX idx_rate_cards_skill ON creator_rate_cards(skill_type_id);
CREATE INDEX idx_rate_cards_rate ON creator_rate_cards(rate_per_video) WHERE is_public = true;
CREATE INDEX idx_rate_cards_public ON creator_rate_cards(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE creator_rate_cards ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own rate cards
CREATE POLICY "Creators can manage their rate cards"
  ON creator_rate_cards
  FOR ALL
  USING (creator_id = auth.uid());

-- Brands can view public rate cards
CREATE POLICY "Brands can view public rate cards"
  ON creator_rate_cards
  FOR SELECT
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.user_id = auth.uid()
    )
  );

-- Admins can view all rate cards
CREATE POLICY "Admins can view all rate cards"
  ON creator_rate_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Updated_at trigger
CREATE TRIGGER rate_cards_updated_at
  BEFORE UPDATE ON creator_rate_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

COMMENT ON TABLE creator_rate_cards IS 'Creator pricing by skill type - enables skill-based pricing tiers';
COMMENT ON COLUMN creator_rate_cards.rate_per_video IS 'Base rate per video for flat-fee projects';
COMMENT ON COLUMN creator_rate_cards.rate_per_1k_views IS 'Performance bonus rate per 1000 views for hybrid campaigns';
COMMENT ON COLUMN creator_rate_cards.min_guarantee IS 'Minimum guaranteed payment for performance-based deals';
COMMENT ON COLUMN creator_rate_cards.rush_fee_multiplier IS 'Multiplier applied to base rate for rush jobs (e.g., 1.5 = 50% premium)';
