-- Close CRM Integration Migration
-- Adds support for two-way sync with Close CRM

-- ============================================
-- 1. Add Close CRM columns to brands table
-- ============================================

ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS close_lead_id TEXT UNIQUE;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS close_status_id TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS close_status_label TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS close_synced_at TIMESTAMPTZ;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS close_sync_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS close_custom_fields JSONB DEFAULT '{}';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS close_contacts JSONB DEFAULT '[]';

-- Index for efficient Close ID lookups
CREATE INDEX IF NOT EXISTS idx_brands_close_lead_id ON public.brands(close_lead_id) WHERE close_lead_id IS NOT NULL;

-- ============================================
-- 2. Create close_opportunities table
-- ============================================

CREATE TABLE IF NOT EXISTS public.close_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  close_opportunity_id TEXT NOT NULL UNIQUE,
  close_lead_id TEXT NOT NULL,

  -- Opportunity fields
  status_id TEXT,
  status_type TEXT CHECK (status_type IN ('active', 'won', 'lost')),
  status_label TEXT,
  value NUMERIC(12, 2),
  value_period TEXT CHECK (value_period IN ('one_time', 'monthly', 'annual')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  date_won TIMESTAMPTZ,
  note TEXT,

  -- Custom fields from Close
  custom_fields JSONB DEFAULT '{}',

  -- Sync metadata
  close_created_at TIMESTAMPTZ,
  close_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for close_opportunities
CREATE INDEX IF NOT EXISTS idx_close_opportunities_brand_id ON public.close_opportunities(brand_id);
CREATE INDEX IF NOT EXISTS idx_close_opportunities_status_type ON public.close_opportunities(status_type);
CREATE INDEX IF NOT EXISTS idx_close_opportunities_close_lead_id ON public.close_opportunities(close_lead_id);

-- Enable RLS
ALTER TABLE public.close_opportunities ENABLE ROW LEVEL SECURITY;

-- Admin policy for close_opportunities
CREATE POLICY "Admin users can manage close_opportunities"
ON public.close_opportunities
FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ============================================
-- 3. Create close_activities table
-- ============================================

CREATE TABLE IF NOT EXISTS public.close_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  close_activity_id TEXT NOT NULL UNIQUE,
  close_lead_id TEXT NOT NULL,

  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'sms', 'note', 'meeting', 'task_completed')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  user_name TEXT, -- Close user who performed activity

  -- Content
  subject TEXT,
  body TEXT,
  duration_seconds INTEGER, -- For calls

  -- Metadata
  activity_at TIMESTAMPTZ NOT NULL,
  custom_fields JSONB DEFAULT '{}',

  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for close_activities
CREATE INDEX IF NOT EXISTS idx_close_activities_brand_id ON public.close_activities(brand_id);
CREATE INDEX IF NOT EXISTS idx_close_activities_type ON public.close_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_close_activities_activity_at ON public.close_activities(activity_at DESC);

-- Enable RLS
ALTER TABLE public.close_activities ENABLE ROW LEVEL SECURITY;

-- Admin policy for close_activities
CREATE POLICY "Admin users can manage close_activities"
ON public.close_activities
FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ============================================
-- 4. Create close_sync_log table
-- ============================================

CREATE TABLE IF NOT EXISTS public.close_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'opportunity', 'activity', 'contact')),
  entity_id TEXT NOT NULL, -- Close ID
  local_id UUID, -- brands.id or close_opportunities.id
  event_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'merged', 'sync_error'
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  source TEXT NOT NULL, -- 'webhook', 'manual', 'scheduled', 'admin_ui'

  -- Payload data
  payload JSONB,
  changes JSONB, -- For updates: { field: { old: value, new: value } }

  -- Error handling
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'skipped')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Idempotency
  idempotency_key TEXT UNIQUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Indexes for close_sync_log
CREATE INDEX IF NOT EXISTS idx_close_sync_log_entity ON public.close_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_close_sync_log_local_id ON public.close_sync_log(local_id);
CREATE INDEX IF NOT EXISTS idx_close_sync_log_status ON public.close_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_close_sync_log_created_at ON public.close_sync_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.close_sync_log ENABLE ROW LEVEL SECURITY;

-- Admin-only read access for close_sync_log
CREATE POLICY "Admin users can view close_sync_log"
ON public.close_sync_log
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Service role can insert/update (for edge functions)
CREATE POLICY "Service role can manage close_sync_log"
ON public.close_sync_log
FOR ALL
USING (auth.role() = 'service_role');

-- ============================================
-- 5. Add updated_at triggers
-- ============================================

-- Trigger for close_opportunities updated_at
CREATE TRIGGER update_close_opportunities_updated_at
BEFORE UPDATE ON public.close_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for brands close_synced_at on Close field updates
CREATE OR REPLACE FUNCTION update_brands_close_synced_at()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.close_lead_id IS DISTINCT FROM NEW.close_lead_id) OR
     (OLD.close_status_id IS DISTINCT FROM NEW.close_status_id) OR
     (OLD.close_custom_fields IS DISTINCT FROM NEW.close_custom_fields) OR
     (OLD.close_contacts IS DISTINCT FROM NEW.close_contacts) THEN
    NEW.close_synced_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brands_close_synced_at_trigger
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION update_brands_close_synced_at();
