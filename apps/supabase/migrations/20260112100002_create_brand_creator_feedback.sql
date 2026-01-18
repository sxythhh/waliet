-- Brand creator feedback table for structured feedback aggregation
-- This enables skill assessment through brand ratings instead of peer review

CREATE TABLE IF NOT EXISTS brand_creator_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Link to specific campaign/boost (one must be set)
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE SET NULL,

  -- Structured feedback dimensions (1-5 scale)
  quality_score INTEGER CHECK (quality_score IS NULL OR quality_score BETWEEN 1 AND 5),
  communication_score INTEGER CHECK (communication_score IS NULL OR communication_score BETWEEN 1 AND 5),
  timeliness_score INTEGER CHECK (timeliness_score IS NULL OR timeliness_score BETWEEN 1 AND 5),
  adherence_score INTEGER CHECK (adherence_score IS NULL OR adherence_score BETWEEN 1 AND 5),

  -- Hiring signals
  would_hire_again BOOLEAN,
  recommended_for_retainer BOOLEAN DEFAULT false,

  -- Qualitative feedback
  feedback_text TEXT,
  internal_notes TEXT, -- Brand-only notes, never shown to creator

  -- Context
  skill_type_id UUID REFERENCES creator_skill_types(id),
  project_budget NUMERIC, -- For context on feedback

  -- Metadata
  submitted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure feedback is for either campaign or boost, not both
  CONSTRAINT feedback_campaign_or_boost CHECK (
    (campaign_id IS NOT NULL AND boost_id IS NULL) OR
    (campaign_id IS NULL AND boost_id IS NOT NULL)
  ),

  -- One feedback per brand-creator-campaign combination
  CONSTRAINT unique_campaign_feedback UNIQUE (brand_id, creator_id, campaign_id),
  CONSTRAINT unique_boost_feedback UNIQUE (brand_id, creator_id, boost_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_feedback_creator ON brand_creator_feedback(creator_id);
CREATE INDEX idx_feedback_brand ON brand_creator_feedback(brand_id);
CREATE INDEX idx_feedback_skill_type ON brand_creator_feedback(skill_type_id);
CREATE INDEX idx_feedback_quality ON brand_creator_feedback(quality_score) WHERE quality_score IS NOT NULL;
CREATE INDEX idx_feedback_would_hire ON brand_creator_feedback(would_hire_again) WHERE would_hire_again = true;
CREATE INDEX idx_feedback_retainer ON brand_creator_feedback(recommended_for_retainer) WHERE recommended_for_retainer = true;

-- Enable RLS
ALTER TABLE brand_creator_feedback ENABLE ROW LEVEL SECURITY;

-- Brands can view and create feedback for their own brand
CREATE POLICY "Brand members can view their feedback"
  ON brand_creator_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = brand_creator_feedback.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members can create feedback"
  ON brand_creator_feedback
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = brand_creator_feedback.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members can update their feedback"
  ON brand_creator_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = brand_creator_feedback.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Creators can view feedback about themselves (excluding internal_notes)
CREATE POLICY "Creators can view their own feedback"
  ON brand_creator_feedback
  FOR SELECT
  USING (creator_id = auth.uid());

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON brand_creator_feedback
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON brand_creator_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

COMMENT ON TABLE brand_creator_feedback IS 'Structured brand feedback on creator performance for skill assessment and matching';
COMMENT ON COLUMN brand_creator_feedback.quality_score IS 'Quality of delivered content (1-5)';
COMMENT ON COLUMN brand_creator_feedback.communication_score IS 'Responsiveness and clarity of communication (1-5)';
COMMENT ON COLUMN brand_creator_feedback.timeliness_score IS 'Meeting deadlines and turnaround expectations (1-5)';
COMMENT ON COLUMN brand_creator_feedback.adherence_score IS 'Following brand guidelines and brief requirements (1-5)';
COMMENT ON COLUMN brand_creator_feedback.internal_notes IS 'Private notes visible only to brand members, not shown to creator';
