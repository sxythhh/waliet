-- Task Verification System (Phase 1)
-- Adds verification columns and tables for fraud detection

-- =====================================================
-- TASKS TABLE - Add verification configuration
-- =====================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_type TEXT DEFAULT 'screenshot';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_config JSONB DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reward_tier TEXT DEFAULT 'low';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER DEFAULT 5;

-- =====================================================
-- TASK_SUBMISSIONS TABLE - Add verification columns
-- =====================================================

-- Screenshot evidence
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS screenshot_hash TEXT;

-- Device fingerprint
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS device_fingerprint_data JSONB DEFAULT '{}';

-- Timing
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS completion_time_seconds INTEGER;

-- Verification status (rename existing status column)
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS verification_score DECIMAL(5,2);
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS verification_flags TEXT[] DEFAULT '{}';
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS verification_type TEXT;
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);

-- Session recording (Phase 2)
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS session_recording_id TEXT;
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS session_recording_url TEXT;

-- Reclaim proof (Phase 3)
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS reclaim_proof_id TEXT;
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS reclaim_proof_data JSONB;

-- Submission metadata
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS submission_metadata JSONB DEFAULT '{}';

-- =====================================================
-- FRAUD SIGNALS TABLE - Track detected issues
-- =====================================================

CREATE TABLE IF NOT EXISTS fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES task_submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  signal_type TEXT NOT NULL,
  signal_data JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'low',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER TRUST SCORES TABLE - Reputation tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS user_trust_scores (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  trust_score DECIMAL(5,2) DEFAULT 50.0,

  total_submissions INTEGER DEFAULT 0,
  approved_submissions INTEGER DEFAULT 0,
  rejected_submissions INTEGER DEFAULT 0,
  flagged_submissions INTEGER DEFAULT 0,

  approval_rate DECIMAL(5,4) DEFAULT 0,
  average_completion_time_ratio DECIMAL(5,2) DEFAULT 1.0,

  is_trusted BOOLEAN DEFAULT FALSE,
  is_suspicious BOOLEAN DEFAULT FALSE,

  first_submission_at TIMESTAMPTZ,
  last_submission_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VERIFICATION QUEUE TABLE - Admin review queue
-- =====================================================

CREATE TABLE IF NOT EXISTS verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES task_submissions(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  priority INTEGER DEFAULT 0,
  queue_reason TEXT,

  assigned_to UUID REFERENCES profiles(id),

  status TEXT DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_submissions_verification_status ON task_submissions(verification_status);
CREATE INDEX IF NOT EXISTS idx_submissions_device ON task_submissions(device_fingerprint);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_submission ON fraud_signals(submission_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_user ON fraud_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_type ON fraud_signals(signal_type);

CREATE INDEX IF NOT EXISTS idx_verification_queue_status ON verification_queue(status);
CREATE INDEX IF NOT EXISTS idx_verification_queue_business ON verification_queue(business_id);
CREATE INDEX IF NOT EXISTS idx_verification_queue_priority ON verification_queue(priority DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- fraud_signals
ALTER TABLE fraud_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view fraud signals" ON fraud_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_submissions ts
      JOIN tasks t ON t.id = ts.task_id
      JOIN business_members bm ON bm.business_id = t.business_id
      WHERE ts.id = fraud_signals.submission_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert fraud signals" ON fraud_signals
  FOR INSERT WITH CHECK (true);

-- user_trust_scores
ALTER TABLE user_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trust score" ON user_trust_scores
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Business members can view applicant trust scores" ON user_trust_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_applications ta
      JOIN tasks t ON t.id = ta.task_id
      JOIN business_members bm ON bm.business_id = t.business_id
      WHERE ta.user_id = user_trust_scores.user_id
      AND bm.user_id = auth.uid()
    )
  );

-- verification_queue
ALTER TABLE verification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view verification queue" ON verification_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_members bm
      WHERE bm.business_id = verification_queue.business_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Business members can update verification queue" ON verification_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM business_members bm
      WHERE bm.business_id = verification_queue.business_id
      AND bm.user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update user trust score after submission review
CREATE OR REPLACE FUNCTION update_user_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status IN ('approved', 'auto_approved', 'rejected')
     AND (OLD.verification_status IS NULL OR OLD.verification_status != NEW.verification_status) THEN

    INSERT INTO user_trust_scores (user_id, total_submissions, approved_submissions, rejected_submissions, last_submission_at)
    VALUES (NEW.user_id, 1,
            CASE WHEN NEW.verification_status IN ('approved', 'auto_approved') THEN 1 ELSE 0 END,
            CASE WHEN NEW.verification_status = 'rejected' THEN 1 ELSE 0 END,
            NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_submissions = user_trust_scores.total_submissions + 1,
      approved_submissions = user_trust_scores.approved_submissions +
        CASE WHEN NEW.verification_status IN ('approved', 'auto_approved') THEN 1 ELSE 0 END,
      rejected_submissions = user_trust_scores.rejected_submissions +
        CASE WHEN NEW.verification_status = 'rejected' THEN 1 ELSE 0 END,
      last_submission_at = NOW(),
      last_updated = NOW(),
      approval_rate = (user_trust_scores.approved_submissions +
        CASE WHEN NEW.verification_status IN ('approved', 'auto_approved') THEN 1 ELSE 0 END)::DECIMAL /
        NULLIF(user_trust_scores.total_submissions + 1, 0),
      trust_score = LEAST(100, GREATEST(0,
        50 +
        ((user_trust_scores.approved_submissions +
          CASE WHEN NEW.verification_status IN ('approved', 'auto_approved') THEN 1 ELSE 0 END)::DECIMAL /
          NULLIF(user_trust_scores.total_submissions + 1, 0) - 0.5) * 100
      ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_trust_score ON task_submissions;
CREATE TRIGGER trigger_update_trust_score
  AFTER UPDATE ON task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_trust_score();

-- Function to auto-calculate reward tier based on amount
CREATE OR REPLACE FUNCTION calculate_reward_tier(amount DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF amount IS NULL OR amount < 1 THEN
    RETURN 'low';
  ELSIF amount < 10 THEN
    RETURN 'medium';
  ELSE
    RETURN 'high';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-set reward tier
CREATE OR REPLACE FUNCTION set_reward_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reward_tier := calculate_reward_tier(COALESCE(NEW.reward_amount, 0));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_reward_tier ON tasks;
CREATE TRIGGER trigger_set_reward_tier
  BEFORE INSERT OR UPDATE OF reward_amount ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_reward_tier();
