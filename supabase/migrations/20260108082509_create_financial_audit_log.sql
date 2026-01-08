-- =============================================
-- FINANCIAL AUDIT LOG TABLE
-- Tracks all sensitive financial operations performed by admins
-- =============================================

-- Create the financial audit log table
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action classification
  action_type TEXT NOT NULL CHECK (action_type IN (
    'withdrawal_approved',
    'withdrawal_rejected',
    'payout_processed',
    'payout_failed',
    'balance_adjusted',
    'balance_credited',
    'balance_debited',
    'refund_issued',
    'fee_waived',
    'manual_transaction'
  )),

  -- Actor information (admin who performed the action)
  actor_id UUID REFERENCES profiles(id),
  actor_email TEXT,
  actor_role TEXT,

  -- Target information (user affected by the action)
  target_user_id UUID REFERENCES profiles(id),
  target_user_email TEXT,

  -- Financial details
  amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  balance_before NUMERIC,
  balance_after NUMERIC,

  -- Reference IDs
  payout_request_id UUID,
  transaction_id UUID,
  reference_id TEXT,

  -- Context and metadata
  reason TEXT,
  metadata JSONB DEFAULT '{}',

  -- Request context
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_actor ON financial_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_target ON financial_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_action_type ON financial_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_created ON financial_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_payout_request ON financial_audit_log(payout_request_id) WHERE payout_request_id IS NOT NULL;

-- RLS Policies

-- Service role can insert audit logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON financial_audit_log;
CREATE POLICY "Service role can insert audit logs"
  ON financial_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins with security permission can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON financial_audit_log;
CREATE POLICY "Admins can view audit logs"
  ON financial_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Add comment documenting the table
COMMENT ON TABLE public.financial_audit_log IS
'Immutable audit log for all financial operations. Records admin actions affecting user balances, payouts, and transactions.
This table is append-only - no updates or deletes are permitted.';

-- Create helper function to log financial operations
CREATE OR REPLACE FUNCTION public.log_financial_audit(
  p_action_type TEXT,
  p_actor_id UUID,
  p_target_user_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_balance_before NUMERIC DEFAULT NULL,
  p_balance_after NUMERIC DEFAULT NULL,
  p_payout_request_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_target_email TEXT;
BEGIN
  -- Get actor details
  SELECT email INTO v_actor_email FROM profiles WHERE id = p_actor_id;
  SELECT role INTO v_actor_role FROM user_roles WHERE user_id = p_actor_id LIMIT 1;

  -- Get target details if provided
  IF p_target_user_id IS NOT NULL THEN
    SELECT email INTO v_target_email FROM profiles WHERE id = p_target_user_id;
  END IF;

  -- Insert audit log entry
  INSERT INTO financial_audit_log (
    action_type,
    actor_id,
    actor_email,
    actor_role,
    target_user_id,
    target_user_email,
    amount,
    balance_before,
    balance_after,
    payout_request_id,
    transaction_id,
    reason,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_action_type,
    p_actor_id,
    v_actor_email,
    v_actor_role,
    p_target_user_id,
    v_target_email,
    p_amount,
    p_balance_before,
    p_balance_after,
    p_payout_request_id,
    p_transaction_id,
    p_reason,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION public.log_financial_audit IS
'Helper function to log financial audit events. Should be called from edge functions when processing financial operations.';
