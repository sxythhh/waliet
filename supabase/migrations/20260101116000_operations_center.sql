-- Create admin_alerts table for platform alerts
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  source TEXT, -- What triggered the alert (e.g., 'payout_system', 'fraud_detection')
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ
);

-- Create admin_incidents table for tracking incidents
CREATE TABLE IF NOT EXISTS public.admin_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updates JSONB DEFAULT '[]'::jsonb -- Array of { message, timestamp, user_id }
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON public.admin_alerts(status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON public.admin_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at ON public.admin_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_status ON public.admin_incidents(status);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_created_at ON public.admin_incidents(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_incidents ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_alerts (admins only)
DROP POLICY IF EXISTS "Admins can view alerts" ON public.admin_alerts;
CREATE POLICY "Admins can view alerts"
  ON public.admin_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert alerts" ON public.admin_alerts;
CREATE POLICY "Admins can insert alerts"
  ON public.admin_alerts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update alerts" ON public.admin_alerts;
CREATE POLICY "Admins can update alerts"
  ON public.admin_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for admin_incidents (admins only)
DROP POLICY IF EXISTS "Admins can view incidents" ON public.admin_incidents;
CREATE POLICY "Admins can view incidents"
  ON public.admin_incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert incidents" ON public.admin_incidents;
CREATE POLICY "Admins can insert incidents"
  ON public.admin_incidents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update incidents" ON public.admin_incidents;
CREATE POLICY "Admins can update incidents"
  ON public.admin_incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enable realtime for these tables (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_incidents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add comments
COMMENT ON TABLE public.admin_alerts IS 'Platform alerts for admin monitoring';
COMMENT ON TABLE public.admin_incidents IS 'Incident tracking for platform issues';
