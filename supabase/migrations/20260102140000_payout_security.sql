-- Payout Approval System
-- Multi-admin approval workflow for crypto payouts

-- Payout approval requests
CREATE TABLE IF NOT EXISTS payout_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id UUID REFERENCES payout_requests(id) ON DELETE CASCADE,
  payout_type TEXT NOT NULL DEFAULT 'crypto', -- 'crypto', 'fiat'
  user_id UUID REFERENCES profiles(id),
  amount DECIMAL(20,6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  wallet_address TEXT,

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'executed')),
  required_approvals INT NOT NULL DEFAULT 2,

  -- Request metadata
  requested_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),

  -- Execution metadata
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES profiles(id),
  tx_signature TEXT,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin votes on payout approvals
CREATE TABLE IF NOT EXISTS payout_approval_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES payout_approvals(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  comment TEXT,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(approval_id, admin_id)
);

-- Audit log for all payout actions
CREATE TABLE IF NOT EXISTS payout_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID,
  approval_id UUID REFERENCES payout_approvals(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('requested', 'approved', 'rejected', 'executed', 'failed', 'expired', 'vote_cast')),
  actor_id UUID REFERENCES profiles(id),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payout_approvals_status ON payout_approvals(status);
CREATE INDEX IF NOT EXISTS idx_payout_approvals_requested_by ON payout_approvals(requested_by);
CREATE INDEX IF NOT EXISTS idx_payout_approvals_user_id ON payout_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_approval_votes_approval_id ON payout_approval_votes(approval_id);
CREATE INDEX IF NOT EXISTS idx_payout_approval_votes_admin_id ON payout_approval_votes(admin_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_payout_id ON payout_audit_log(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_approval_id ON payout_audit_log(approval_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_actor_id ON payout_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_action ON payout_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_created_at ON payout_audit_log(created_at DESC);

-- RLS Policies
ALTER TABLE payout_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_approval_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all approvals
CREATE POLICY "Admins can view payout approvals" ON payout_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can create approval requests
CREATE POLICY "Admins can create payout approvals" ON payout_approvals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update approvals (for execution)
CREATE POLICY "Admins can update payout approvals" ON payout_approvals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can view votes
CREATE POLICY "Admins can view approval votes" ON payout_approval_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can cast votes
CREATE POLICY "Admins can cast votes" ON payout_approval_votes
  FOR INSERT WITH CHECK (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can view audit log
CREATE POLICY "Admins can view audit log" ON payout_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- System can insert audit log entries (via service role)
CREATE POLICY "System can insert audit log" ON payout_audit_log
  FOR INSERT WITH CHECK (true);

-- Function to get vote count for an approval
CREATE OR REPLACE FUNCTION get_approval_vote_count(approval_uuid UUID)
RETURNS TABLE(approve_count INT, reject_count INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE vote = 'approve')::INT as approve_count,
    COUNT(*) FILTER (WHERE vote = 'reject')::INT as reject_count
  FROM payout_approval_votes
  WHERE approval_id = approval_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if approval threshold is met
CREATE OR REPLACE FUNCTION check_approval_threshold(approval_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  required INT;
  approved INT;
BEGIN
  SELECT pa.required_approvals INTO required
  FROM payout_approvals pa
  WHERE pa.id = approval_uuid;

  SELECT COUNT(*) INTO approved
  FROM payout_approval_votes pav
  WHERE pav.approval_id = approval_uuid AND pav.vote = 'approve';

  RETURN approved >= required;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_payout_approval_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payout_approval_timestamp
  BEFORE UPDATE ON payout_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_approval_updated_at();
