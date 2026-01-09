-- Strike System for tracking missed content deadlines
-- This tracks creator reliability and missed posting dates

-- Creator strikes table
CREATE TABLE IF NOT EXISTS creator_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES creator_contracts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE SET NULL,
  strike_type TEXT NOT NULL CHECK (strike_type IN ('missed_deadline', 'late_submission', 'content_violation', 'no_show', 'other')),
  reason TEXT,
  scheduled_date DATE,
  severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 3), -- 1=minor, 2=moderate, 3=severe
  is_appealed BOOLEAN DEFAULT FALSE,
  appeal_reason TEXT,
  appeal_status TEXT CHECK (appeal_status IN ('pending', 'approved', 'rejected')),
  appeal_reviewed_at TIMESTAMPTZ,
  appeal_reviewed_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ, -- null means never expires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Creator reliability score (materialized view updated periodically)
CREATE TABLE IF NOT EXISTS creator_reliability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_strikes INTEGER DEFAULT 0,
  active_strikes INTEGER DEFAULT 0, -- non-expired, non-appealed
  total_scheduled INTEGER DEFAULT 0, -- total scheduled content items
  total_delivered INTEGER DEFAULT 0, -- successfully delivered
  on_time_rate DECIMAL(5,2) DEFAULT 100.00, -- percentage delivered on time
  reliability_score INTEGER DEFAULT 100 CHECK (reliability_score BETWEEN 0 AND 100),
  last_strike_at TIMESTAMPTZ,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, creator_id)
);

-- Content slots for scheduling (the negotiation system)
CREATE TABLE IF NOT EXISTS content_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES creator_contracts(id) ON DELETE SET NULL,
  boost_id UUID REFERENCES bounty_campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  platform TEXT, -- tiktok, instagram, youtube, etc.
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'completed', 'missed', 'rescheduled', 'cancelled')),
  proposed_by TEXT CHECK (proposed_by IN ('brand', 'creator')),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  submission_id UUID, -- links to video_submissions when completed
  reminder_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slot change history for negotiation tracking
CREATE TABLE IF NOT EXISTS content_slot_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES content_slots(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'date_changed', 'confirmed', 'completed', 'missed', 'rescheduled', 'cancelled')),
  old_date DATE,
  new_date DATE,
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strike thresholds configuration per brand
CREATE TABLE IF NOT EXISTS strike_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  threshold_name TEXT NOT NULL, -- e.g., 'warning', 'tier_demotion', 'removal'
  strike_count INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'tier_demotion', 'campaign_removal', 'brand_ban')),
  notification_template TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, threshold_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_strikes_brand_creator ON creator_strikes(brand_id, creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_strikes_created_at ON creator_strikes(created_at);
CREATE INDEX IF NOT EXISTS idx_creator_reliability_brand_creator ON creator_reliability_scores(brand_id, creator_id);
CREATE INDEX IF NOT EXISTS idx_content_slots_brand ON content_slots(brand_id);
CREATE INDEX IF NOT EXISTS idx_content_slots_creator ON content_slots(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_slots_date ON content_slots(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_slots_status ON content_slots(status);

-- RLS Policies
ALTER TABLE creator_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_reliability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_slot_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE strike_thresholds ENABLE ROW LEVEL SECURITY;

-- Strikes: Brand members can view/manage, creators can view their own
CREATE POLICY "Brand members can manage strikes" ON creator_strikes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = creator_strikes.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view own strikes" ON creator_strikes
  FOR SELECT USING (creator_id = auth.uid());

-- Reliability scores: Brand members can view, creators can view their own
CREATE POLICY "Brand members can view reliability" ON creator_reliability_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = creator_reliability_scores.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members can manage reliability" ON creator_reliability_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = creator_reliability_scores.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view own reliability" ON creator_reliability_scores
  FOR SELECT USING (creator_id = auth.uid());

-- Content slots: Brand members and assigned creators can access
CREATE POLICY "Brand members can manage slots" ON content_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = content_slots.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view and update own slots" ON content_slots
  FOR ALL USING (creator_id = auth.uid());

-- Slot history: Same as slots
CREATE POLICY "Brand members can view slot history" ON content_slot_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_slots
      JOIN brand_members ON brand_members.brand_id = content_slots.brand_id
      WHERE content_slots.id = content_slot_history.slot_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view own slot history" ON content_slot_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_slots
      WHERE content_slots.id = content_slot_history.slot_id
      AND content_slots.creator_id = auth.uid()
    )
  );

-- Strike thresholds: Brand members only
CREATE POLICY "Brand members can manage thresholds" ON strike_thresholds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = strike_thresholds.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Function to calculate reliability score
CREATE OR REPLACE FUNCTION calculate_reliability_score(p_brand_id UUID, p_creator_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_strikes INTEGER;
  v_active_strikes INTEGER;
  v_total_scheduled INTEGER;
  v_total_delivered INTEGER;
  v_on_time_rate DECIMAL;
  v_score INTEGER;
BEGIN
  -- Count strikes
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE (expires_at IS NULL OR expires_at > NOW()) AND (appeal_status IS NULL OR appeal_status != 'approved'))
  INTO v_total_strikes, v_active_strikes
  FROM creator_strikes
  WHERE brand_id = p_brand_id AND creator_id = p_creator_id;

  -- Count content slots
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_scheduled, v_total_delivered
  FROM content_slots
  WHERE brand_id = p_brand_id AND creator_id = p_creator_id
  AND status IN ('completed', 'missed');

  -- Calculate on-time rate
  IF v_total_scheduled > 0 THEN
    v_on_time_rate := (v_total_delivered::DECIMAL / v_total_scheduled) * 100;
  ELSE
    v_on_time_rate := 100;
  END IF;

  -- Calculate score (base 100, minus penalties)
  v_score := 100;
  v_score := v_score - (v_active_strikes * 10); -- -10 per active strike
  v_score := v_score - ((100 - v_on_time_rate) * 0.5)::INTEGER; -- penalty for missed deliveries

  -- Clamp between 0 and 100
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Update or insert reliability score
  INSERT INTO creator_reliability_scores (brand_id, creator_id, total_strikes, active_strikes, total_scheduled, total_delivered, on_time_rate, reliability_score, last_calculated_at)
  VALUES (p_brand_id, p_creator_id, v_total_strikes, v_active_strikes, v_total_scheduled, v_total_delivered, v_on_time_rate, v_score, NOW())
  ON CONFLICT (brand_id, creator_id)
  DO UPDATE SET
    total_strikes = EXCLUDED.total_strikes,
    active_strikes = EXCLUDED.active_strikes,
    total_scheduled = EXCLUDED.total_scheduled,
    total_delivered = EXCLUDED.total_delivered,
    on_time_rate = EXCLUDED.on_time_rate,
    reliability_score = EXCLUDED.reliability_score,
    last_calculated_at = NOW();

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update reliability when strikes change
CREATE OR REPLACE FUNCTION update_reliability_on_strike()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_reliability_score(OLD.brand_id, OLD.creator_id);
    RETURN OLD;
  ELSE
    PERFORM calculate_reliability_score(NEW.brand_id, NEW.creator_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reliability_on_strike
AFTER INSERT OR UPDATE OR DELETE ON creator_strikes
FOR EACH ROW EXECUTE FUNCTION update_reliability_on_strike();

-- Trigger to log slot changes
CREATE OR REPLACE FUNCTION log_slot_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO content_slot_history (slot_id, change_type, new_date, new_status, notes)
    VALUES (NEW.id, 'created', NEW.scheduled_date, NEW.status, 'Slot created');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.scheduled_date != NEW.scheduled_date THEN
      INSERT INTO content_slot_history (slot_id, change_type, old_date, new_date, old_status, new_status)
      VALUES (NEW.id, 'date_changed', OLD.scheduled_date, NEW.scheduled_date, OLD.status, NEW.status);
    ELSIF OLD.status != NEW.status THEN
      INSERT INTO content_slot_history (slot_id, change_type, old_status, new_status)
      VALUES (NEW.id, NEW.status, OLD.status, NEW.status);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_slot_change
AFTER INSERT OR UPDATE ON content_slots
FOR EACH ROW EXECUTE FUNCTION log_slot_change();

-- Insert default strike thresholds for existing brands
INSERT INTO strike_thresholds (brand_id, threshold_name, strike_count, action_type, notification_template, is_active)
SELECT
  id as brand_id,
  'warning' as threshold_name,
  2 as strike_count,
  'warning' as action_type,
  'You have received {{count}} strikes. Please ensure you meet your content deadlines.' as notification_template,
  true as is_active
FROM brands
ON CONFLICT DO NOTHING;

INSERT INTO strike_thresholds (brand_id, threshold_name, strike_count, action_type, notification_template, is_active)
SELECT
  id as brand_id,
  'tier_demotion' as threshold_name,
  4 as strike_count,
  'tier_demotion' as action_type,
  'Due to {{count}} missed deadlines, your creator tier has been reduced.' as notification_template,
  true as is_active
FROM brands
ON CONFLICT DO NOTHING;

INSERT INTO strike_thresholds (brand_id, threshold_name, strike_count, action_type, notification_template, is_active)
SELECT
  id as brand_id,
  'removal' as threshold_name,
  6 as strike_count,
  'campaign_removal' as action_type,
  'Due to {{count}} missed deadlines, you have been removed from this campaign.' as notification_template,
  true as is_active
FROM brands
ON CONFLICT DO NOTHING;
