-- Security Audit Log Table
-- Tracks all security-related actions across the platform

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL, -- 'login', 'logout', 'permission_change', 'user_ban', 'payout_action', etc.
  entity_type TEXT, -- 'user', 'brand', 'payout', 'permission', etc.
  entity_id UUID,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type TEXT DEFAULT 'user', -- 'user', 'system', 'admin'
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_audit_actor ON public.security_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON public.security_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_entity ON public.security_audit_log(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.security_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert audit logs"
  ON public.security_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow authenticated users to insert their own audit entries
CREATE POLICY "Users can insert own audit entries"
  ON public.security_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Function to log security events (can be called from triggers or edge functions)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'user',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    action_type,
    entity_type,
    entity_id,
    actor_id,
    actor_type,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_action_type,
    p_entity_type,
    p_entity_id,
    COALESCE(p_actor_id, auth.uid()),
    p_actor_type,
    p_ip_address,
    p_user_agent,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event TO service_role;

COMMENT ON TABLE public.security_audit_log IS 'Tracks all security-related actions for compliance and monitoring';
COMMENT ON FUNCTION public.log_security_event IS 'Helper function to log security events from triggers or edge functions';
