-- Creator computed scores table for pre-computed match signals
-- Enables fast querying for matching algorithm without expensive joins

CREATE TABLE IF NOT EXISTS creator_computed_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Aggregated brand feedback scores (averages from brand_creator_feedback)
  avg_quality_score NUMERIC(3,2),
  avg_communication_score NUMERIC(3,2),
  avg_timeliness_score NUMERIC(3,2),
  avg_adherence_score NUMERIC(3,2),
  total_feedback_count INTEGER DEFAULT 0,

  -- Performance metrics (from campaign_submissions and bounty_applications)
  total_campaigns_completed INTEGER DEFAULT 0,
  total_boosts_completed INTEGER DEFAULT 0,
  total_videos_delivered INTEGER DEFAULT 0,
  avg_views_per_video NUMERIC,
  avg_engagement_rate NUMERIC(5,4),
  avg_completion_rate NUMERIC(3,2), -- % of accepted work that was delivered

  -- Hiring signals (derived from feedback)
  repeat_hire_rate NUMERIC(3,2), -- % of brands that hired again
  retainer_recommendation_rate NUMERIC(3,2), -- % recommending for retainer
  unique_brands_worked_with INTEGER DEFAULT 0,

  -- Availability and responsiveness
  avg_response_time_hours NUMERIC,
  current_active_campaigns INTEGER DEFAULT 0,
  current_active_boosts INTEGER DEFAULT 0,
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'limited', 'unavailable')),
  last_active_at TIMESTAMPTZ,

  -- Composite scores (calculated by refresh function)
  value_score NUMERIC(5,2), -- Quality relative to price
  overall_score NUMERIC(5,2), -- Weighted composite of all factors

  -- Metadata
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient matching queries
CREATE INDEX idx_creator_scores_overall ON creator_computed_scores(overall_score DESC NULLS LAST);
CREATE INDEX idx_creator_scores_value ON creator_computed_scores(value_score DESC NULLS LAST);
CREATE INDEX idx_creator_scores_quality ON creator_computed_scores(avg_quality_score DESC NULLS LAST);
CREATE INDEX idx_creator_scores_availability ON creator_computed_scores(availability_status);
CREATE INDEX idx_creator_scores_active ON creator_computed_scores(current_active_campaigns, current_active_boosts);
CREATE INDEX idx_creator_scores_last_computed ON creator_computed_scores(last_computed_at);

-- Enable RLS
ALTER TABLE creator_computed_scores ENABLE ROW LEVEL SECURITY;

-- Brands can view scores for matching
CREATE POLICY "Brand members can view creator scores"
  ON creator_computed_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.user_id = auth.uid()
    )
  );

-- Creators can view their own scores
CREATE POLICY "Creators can view their own scores"
  ON creator_computed_scores
  FOR SELECT
  USING (creator_id = auth.uid());

-- Admins can view and modify all scores
CREATE POLICY "Admins can manage all scores"
  ON creator_computed_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can update scores (for refresh function)
CREATE POLICY "Service role can update scores"
  ON creator_computed_scores
  FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE TRIGGER creator_scores_updated_at
  BEFORE UPDATE ON creator_computed_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

COMMENT ON TABLE creator_computed_scores IS 'Pre-computed creator match scores for fast querying in matching algorithm';
COMMENT ON COLUMN creator_computed_scores.value_score IS 'Quality relative to price - higher means better value for brands';
COMMENT ON COLUMN creator_computed_scores.overall_score IS 'Weighted composite score used for default ranking in recommendations';
COMMENT ON COLUMN creator_computed_scores.repeat_hire_rate IS 'Percentage of unique brands that hired this creator more than once';
