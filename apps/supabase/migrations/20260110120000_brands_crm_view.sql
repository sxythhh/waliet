-- Brands CRM Integration Enhancement
-- Adds source tracking and aggregated CRM view for efficient queries

-- ============================================
-- 1. Add source column to brands table
-- ============================================

ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
CHECK (source IN ('manual', 'close', 'import'));

CREATE INDEX IF NOT EXISTS idx_brands_source ON public.brands(source);

-- Update existing brands with close_lead_id to have source='close'
UPDATE public.brands
SET source = 'close'
WHERE close_lead_id IS NOT NULL AND source = 'manual';

-- ============================================
-- 2. Create aggregated CRM view
-- ============================================

CREATE OR REPLACE VIEW public.brands_with_crm AS
SELECT
  b.*,
  COALESCE(opp.opportunity_count, 0) AS opportunity_count,
  COALESCE(opp.active_opportunity_count, 0) AS active_opportunity_count,
  COALESCE(opp.won_opportunity_count, 0) AS won_opportunity_count,
  COALESCE(opp.total_value, 0) AS total_pipeline_value,
  COALESCE(opp.weighted_value, 0) AS weighted_pipeline_value,
  COALESCE(opp.won_value, 0) AS won_value,
  act.last_activity_at,
  act.last_activity_type
FROM public.brands b
LEFT JOIN (
  SELECT
    brand_id,
    COUNT(*) AS opportunity_count,
    COUNT(*) FILTER (WHERE status_type = 'active') AS active_opportunity_count,
    COUNT(*) FILTER (WHERE status_type = 'won') AS won_opportunity_count,
    SUM(CASE WHEN status_type = 'active' THEN COALESCE(value, 0) ELSE 0 END) AS total_value,
    SUM(CASE WHEN status_type = 'active' THEN COALESCE(value, 0) * COALESCE(confidence, 50) / 100 ELSE 0 END) AS weighted_value,
    SUM(CASE WHEN status_type = 'won' THEN COALESCE(value, 0) ELSE 0 END) AS won_value
  FROM public.close_opportunities
  GROUP BY brand_id
) opp ON b.id = opp.brand_id
LEFT JOIN (
  SELECT DISTINCT ON (brand_id)
    brand_id,
    activity_at AS last_activity_at,
    activity_type AS last_activity_type
  FROM public.close_activities
  ORDER BY brand_id, activity_at DESC
) act ON b.id = act.brand_id;

-- Grant access to the view (inherits from underlying tables' RLS)
GRANT SELECT ON public.brands_with_crm TO authenticated;

-- ============================================
-- 3. Add last_sync_at for scheduled sync tracking
-- ============================================

-- Create a settings table for sync metadata if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admin users can manage system_settings" ON public.system_settings
FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Service role can access (for edge functions)
CREATE POLICY "Service role can access system_settings" ON public.system_settings
FOR ALL USING (auth.role() = 'service_role');

-- Insert default sync setting
INSERT INTO public.system_settings (key, value)
VALUES ('close_sync', '{"last_full_sync_at": null, "last_incremental_sync_at": null}')
ON CONFLICT (key) DO NOTHING;
