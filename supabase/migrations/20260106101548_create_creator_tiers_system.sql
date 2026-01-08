-- Creator Tiers System Migration
-- Part of Retainer Campaign Lifecycle Management

-- ============================================================================
-- CREATOR TIERS CONFIGURATION
-- ============================================================================

-- Tier definitions for each boost campaign
CREATE TABLE IF NOT EXISTS boost_creator_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID NOT NULL REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  monthly_retainer NUMERIC NOT NULL CHECK (monthly_retainer >= 0),
  videos_per_month INTEGER NOT NULL CHECK (videos_per_month > 0),
  perks JSONB DEFAULT '[]'::jsonb,
  color TEXT DEFAULT '#6366f1', -- Default indigo
  icon TEXT, -- Optional icon identifier

  -- Promotion criteria (JSONB for flexibility)
  promotion_criteria JSONB DEFAULT '{
    "min_months_active": 2,
    "min_avg_views": 1000,
    "min_completion_rate": 0.9,
    "min_engagement_rate": 0.02
  }'::jsonb,

  -- Demotion criteria
  demotion_criteria JSONB DEFAULT '{
    "consecutive_missed_quotas": 2,
    "min_completion_rate": 0.5
  }'::jsonb,

  is_default BOOLEAN DEFAULT false,
  is_entry_tier BOOLEAN DEFAULT false, -- Tier new creators start at

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(bounty_campaign_id, level),
  UNIQUE(bounty_campaign_id, name)
);

-- Indexes for performance
CREATE INDEX idx_boost_creator_tiers_campaign ON boost_creator_tiers(bounty_campaign_id);
CREATE INDEX idx_boost_creator_tiers_level ON boost_creator_tiers(bounty_campaign_id, level);

-- ============================================================================
-- CREATOR TIER ASSIGNMENTS
-- ============================================================================

-- Track which tier each creator is assigned to
CREATE TABLE IF NOT EXISTS creator_tier_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID NOT NULL REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES boost_creator_tiers(id) ON DELETE RESTRICT,

  -- Assignment metadata
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  assignment_reason TEXT, -- 'initial', 'auto_promoted', 'auto_demoted', 'manual'

  -- Performance tracking for this tier period
  months_in_tier INTEGER DEFAULT 0,
  tier_start_date DATE DEFAULT CURRENT_DATE,

  -- Previous tier reference for history
  previous_tier_id UUID REFERENCES boost_creator_tiers(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(bounty_campaign_id, user_id)
);

-- Indexes
CREATE INDEX idx_creator_tier_assignments_campaign ON creator_tier_assignments(bounty_campaign_id);
CREATE INDEX idx_creator_tier_assignments_user ON creator_tier_assignments(user_id);
CREATE INDEX idx_creator_tier_assignments_tier ON creator_tier_assignments(tier_id);

-- ============================================================================
-- TIER CHANGE HISTORY (AUDIT TRAIL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tier_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID NOT NULL REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  from_tier_id UUID REFERENCES boost_creator_tiers(id),
  to_tier_id UUID REFERENCES boost_creator_tiers(id),

  change_type TEXT NOT NULL CHECK (change_type IN (
    'initial',      -- First tier assignment
    'promotion',    -- Moved to higher tier
    'demotion',     -- Moved to lower tier
    'manual',       -- Manual assignment by brand
    'lateral'       -- Same level, different tier (rare)
  )),

  change_reason TEXT, -- Human-readable explanation
  changed_by UUID REFERENCES auth.users(id), -- NULL for automatic

  -- Snapshot of performance at time of change
  performance_snapshot JSONB DEFAULT '{}'::jsonb,
  -- Example: {"avg_views": 5000, "completion_rate": 0.95, "months_active": 3}

  -- Criteria evaluation result
  criteria_evaluation JSONB DEFAULT '{}'::jsonb,
  -- Example: {"met_criteria": ["min_avg_views", "min_completion_rate"], "failed_criteria": []}

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for querying history
CREATE INDEX idx_tier_change_history_campaign ON tier_change_history(bounty_campaign_id);
CREATE INDEX idx_tier_change_history_user ON tier_change_history(user_id);
CREATE INDEX idx_tier_change_history_created ON tier_change_history(created_at DESC);

-- ============================================================================
-- TIER PERFORMANCE METRICS (Monthly Snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_tier_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID NOT NULL REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES boost_creator_tiers(id),

  -- Period tracking
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),

  -- Performance metrics
  videos_submitted INTEGER DEFAULT 0,
  videos_approved INTEGER DEFAULT 0,
  videos_rejected INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  total_comments BIGINT DEFAULT 0,
  total_shares BIGINT DEFAULT 0,

  -- Calculated metrics
  completion_rate NUMERIC DEFAULT 0 CHECK (completion_rate BETWEEN 0 AND 1),
  avg_views_per_video NUMERIC DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,

  -- Earnings
  base_earnings NUMERIC DEFAULT 0,
  bonus_earnings NUMERIC DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,

  -- Quota tracking
  quota_required INTEGER NOT NULL,
  quota_met BOOLEAN DEFAULT false,

  -- Evaluation result
  promotion_eligible BOOLEAN DEFAULT false,
  demotion_warning BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(bounty_campaign_id, user_id, period_year, period_month)
);

-- Indexes
CREATE INDEX idx_creator_tier_metrics_campaign ON creator_tier_metrics(bounty_campaign_id);
CREATE INDEX idx_creator_tier_metrics_user ON creator_tier_metrics(user_id);
CREATE INDEX idx_creator_tier_metrics_period ON creator_tier_metrics(period_year, period_month);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get a creator's current tier for a boost
CREATE OR REPLACE FUNCTION get_creator_tier(
  p_campaign_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  tier_id UUID,
  tier_name TEXT,
  tier_level INTEGER,
  monthly_retainer NUMERIC,
  videos_per_month INTEGER,
  color TEXT,
  perks JSONB,
  months_in_tier INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.level,
    t.monthly_retainer,
    t.videos_per_month,
    t.color,
    t.perks,
    a.months_in_tier
  FROM creator_tier_assignments a
  JOIN boost_creator_tiers t ON t.id = a.tier_id
  WHERE a.bounty_campaign_id = p_campaign_id
    AND a.user_id = p_user_id;
END;
$$;

-- Function to assign creator to initial tier when accepted to boost
CREATE OR REPLACE FUNCTION assign_initial_tier()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_entry_tier_id UUID;
  v_campaign_id UUID;
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    v_campaign_id := NEW.bounty_campaign_id;

    -- Find the entry tier for this campaign
    SELECT id INTO v_entry_tier_id
    FROM boost_creator_tiers
    WHERE bounty_campaign_id = v_campaign_id
      AND is_entry_tier = true
    LIMIT 1;

    -- If no entry tier defined, use the lowest level tier
    IF v_entry_tier_id IS NULL THEN
      SELECT id INTO v_entry_tier_id
      FROM boost_creator_tiers
      WHERE bounty_campaign_id = v_campaign_id
      ORDER BY level ASC
      LIMIT 1;
    END IF;

    -- Only create assignment if tiers exist for this campaign
    IF v_entry_tier_id IS NOT NULL THEN
      -- Create tier assignment
      INSERT INTO creator_tier_assignments (
        bounty_campaign_id,
        user_id,
        tier_id,
        assignment_reason,
        tier_start_date
      ) VALUES (
        v_campaign_id,
        NEW.user_id,
        v_entry_tier_id,
        'initial',
        CURRENT_DATE
      ) ON CONFLICT (bounty_campaign_id, user_id) DO NOTHING;

      -- Record in history
      INSERT INTO tier_change_history (
        bounty_campaign_id,
        user_id,
        from_tier_id,
        to_tier_id,
        change_type,
        change_reason
      ) VALUES (
        v_campaign_id,
        NEW.user_id,
        NULL,
        v_entry_tier_id,
        'initial',
        'Assigned to entry tier upon boost acceptance'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-assign tier when creator is accepted
DROP TRIGGER IF EXISTS trg_assign_initial_tier ON bounty_applications;
CREATE TRIGGER trg_assign_initial_tier
  AFTER UPDATE ON bounty_applications
  FOR EACH ROW
  EXECUTE FUNCTION assign_initial_tier();

-- ============================================================================
-- ADD TIER SUPPORT TO BOUNTY_CAMPAIGNS
-- ============================================================================

-- Add column to enable/disable tier system per boost
ALTER TABLE bounty_campaigns
ADD COLUMN IF NOT EXISTS tiers_enabled BOOLEAN DEFAULT false;

-- Add column for auto-promotion settings
ALTER TABLE bounty_campaigns
ADD COLUMN IF NOT EXISTS auto_tier_progression BOOLEAN DEFAULT true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE boost_creator_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tier_metrics ENABLE ROW LEVEL SECURITY;

-- boost_creator_tiers policies
CREATE POLICY "Anyone can view tiers for public boosts"
  ON boost_creator_tiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      WHERE bc.id = bounty_campaign_id
      AND (bc.is_private = false OR bc.is_private IS NULL)
    )
  );

CREATE POLICY "Brand members can manage their boost tiers"
  ON boost_creator_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brand_members bm ON bm.brand_id = bc.brand_id
      WHERE bc.id = bounty_campaign_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all tiers"
  ON boost_creator_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- creator_tier_assignments policies
CREATE POLICY "Users can view their own tier assignments"
  ON creator_tier_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Brand members can view assignments for their boosts"
  ON creator_tier_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brand_members bm ON bm.brand_id = bc.brand_id
      WHERE bc.id = bounty_campaign_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members can manage assignments for their boosts"
  ON creator_tier_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brand_members bm ON bm.brand_id = bc.brand_id
      WHERE bc.id = bounty_campaign_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all assignments"
  ON creator_tier_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- tier_change_history policies
CREATE POLICY "Users can view their own tier history"
  ON tier_change_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Brand members can view history for their boosts"
  ON tier_change_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brand_members bm ON bm.brand_id = bc.brand_id
      WHERE bc.id = bounty_campaign_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all history"
  ON tier_change_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- creator_tier_metrics policies
CREATE POLICY "Users can view their own metrics"
  ON creator_tier_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Brand members can view metrics for their boosts"
  ON creator_tier_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brand_members bm ON bm.brand_id = bc.brand_id
      WHERE bc.id = bounty_campaign_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all metrics"
  ON creator_tier_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_boost_creator_tiers_updated_at ON boost_creator_tiers;
CREATE TRIGGER update_boost_creator_tiers_updated_at
  BEFORE UPDATE ON boost_creator_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_creator_tier_assignments_updated_at ON creator_tier_assignments;
CREATE TRIGGER update_creator_tier_assignments_updated_at
  BEFORE UPDATE ON creator_tier_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_creator_tier_metrics_updated_at ON creator_tier_metrics;
CREATE TRIGGER update_creator_tier_metrics_updated_at
  BEFORE UPDATE ON creator_tier_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
