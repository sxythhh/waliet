-- Add trust_score_updated_at column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score_updated_at TIMESTAMPTZ;

-- Create trust_score_history table for tracking score changes over time
CREATE TABLE IF NOT EXISTS trust_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trust_score NUMERIC(5,2) NOT NULL,
  score_breakdown JSONB NOT NULL DEFAULT '{}',
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_trust_score_history_user_id ON trust_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_history_created_at ON trust_score_history(created_at);

-- Enable RLS
ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - admins can read all, users can read their own
DROP POLICY IF EXISTS "Admins can read all trust score history" ON trust_score_history;
CREATE POLICY "Admins can read all trust score history" ON trust_score_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can read their own trust score history" ON trust_score_history;
CREATE POLICY "Users can read their own trust score history" ON trust_score_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only edge functions (service role) can insert/update
DROP POLICY IF EXISTS "Service role can manage trust score history" ON trust_score_history;
CREATE POLICY "Service role can manage trust score history" ON trust_score_history
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
