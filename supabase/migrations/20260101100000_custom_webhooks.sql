-- Migration: custom_webhooks
-- Description: Add support for custom webhook integrations

-- 1. Create brand_webhooks table
CREATE TABLE IF NOT EXISTS brand_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret_key TEXT DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  api_version TEXT DEFAULT 'v1',
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create webhook_logs table for tracking webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES brand_webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN DEFAULT false,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE brand_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for brand_webhooks
DROP POLICY IF EXISTS "Brand members can view their brand's webhooks" ON brand_webhooks;
CREATE POLICY "Brand members can view their brand's webhooks"
  ON brand_webhooks FOR SELECT
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Brand members can insert webhooks for their brand" ON brand_webhooks;
CREATE POLICY "Brand members can insert webhooks for their brand"
  ON brand_webhooks FOR INSERT
  WITH CHECK (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Brand members can update their brand's webhooks" ON brand_webhooks;
CREATE POLICY "Brand members can update their brand's webhooks"
  ON brand_webhooks FOR UPDATE
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Brand members can delete their brand's webhooks" ON brand_webhooks;
CREATE POLICY "Brand members can delete their brand's webhooks"
  ON brand_webhooks FOR DELETE
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));

-- 5. RLS Policies for webhook_logs
DROP POLICY IF EXISTS "Brand members can view their webhook logs" ON webhook_logs;
CREATE POLICY "Brand members can view their webhook logs"
  ON webhook_logs FOR SELECT
  USING (webhook_id IN (
    SELECT id FROM brand_webhooks
    WHERE brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid())
  ));

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_brand_webhooks_brand_id ON brand_webhooks(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_webhooks_events ON brand_webhooks USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
