-- Create admin_users table first
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Admins can view admin users"
  ON public.admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

-- Now create the operations center tables
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.admin_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updates JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON public.admin_alerts(status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON public.admin_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at ON public.admin_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_status ON public.admin_incidents(status);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_created_at ON public.admin_incidents(created_at DESC);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view alerts" ON public.admin_alerts;
CREATE POLICY "Admins can view alerts"
  ON public.admin_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert alerts" ON public.admin_alerts;
CREATE POLICY "Admins can insert alerts"
  ON public.admin_alerts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update alerts" ON public.admin_alerts;
CREATE POLICY "Admins can update alerts"
  ON public.admin_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view incidents" ON public.admin_incidents;
CREATE POLICY "Admins can view incidents"
  ON public.admin_incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert incidents" ON public.admin_incidents;
CREATE POLICY "Admins can insert incidents"
  ON public.admin_incidents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update incidents" ON public.admin_incidents;
CREATE POLICY "Admins can update incidents"
  ON public.admin_incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_incidents;

COMMENT ON TABLE public.admin_alerts IS 'Platform alerts for admin monitoring';
COMMENT ON TABLE public.admin_incidents IS 'Incident tracking for platform issues';

-- Blog posts hidden flag
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS hidden_from_listing BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_blog_posts_hidden_from_listing
ON blog_posts(hidden_from_listing)
WHERE hidden_from_listing = false;

COMMENT ON COLUMN blog_posts.hidden_from_listing IS 'When true, article is accessible via direct URL but hidden from resources listing. Useful for SEO-only pages.';