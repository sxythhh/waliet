-- Add low balance handling settings to brands table
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS low_balance_notify_threshold NUMERIC DEFAULT 1000;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS low_balance_pause_payouts_threshold NUMERIC DEFAULT 500;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS low_balance_pause_campaign_threshold NUMERIC DEFAULT 100;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS low_balance_auto_topup_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS low_balance_auto_topup_amount NUMERIC DEFAULT 1000;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS low_balance_last_notified_at TIMESTAMP WITH TIME ZONE;

-- Track low balance alerts sent
CREATE TABLE public.low_balance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('notify', 'pause_payouts', 'pause_campaign', 'auto_topup')),
  balance_at_alert NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT -- 'topup', 'dismissed', etc.
);

-- Enable RLS
ALTER TABLE public.low_balance_alerts ENABLE ROW LEVEL SECURITY;

-- Brand members can view their alerts
CREATE POLICY "Brand members can view alerts"
ON public.low_balance_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_members.brand_id = low_balance_alerts.brand_id
    AND brand_members.user_id = auth.uid()
  )
);

-- System can manage alerts
CREATE POLICY "System can manage alerts"
ON public.low_balance_alerts
FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes
CREATE INDEX low_balance_alerts_brand_idx ON public.low_balance_alerts(brand_id);
CREATE INDEX low_balance_alerts_type_idx ON public.low_balance_alerts(alert_type);
CREATE INDEX low_balance_alerts_resolved_idx ON public.low_balance_alerts(resolved_at) WHERE resolved_at IS NULL;

-- Function to check low balance and trigger actions
CREATE OR REPLACE FUNCTION public.check_brand_low_balance()
RETURNS TRIGGER AS $$
DECLARE
  balance_dollars NUMERIC;
  notify_threshold NUMERIC;
  last_notified TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only check if balance decreased
  IF NEW.slash_balance_cents IS NULL OR
     (OLD.slash_balance_cents IS NOT NULL AND NEW.slash_balance_cents >= OLD.slash_balance_cents) THEN
    RETURN NEW;
  END IF;

  balance_dollars := COALESCE(NEW.slash_balance_cents, 0) / 100.0;
  notify_threshold := COALESCE(NEW.low_balance_notify_threshold, 1000);
  last_notified := NEW.low_balance_last_notified_at;

  -- Check if we should send a notification (once per 24 hours max)
  IF balance_dollars < notify_threshold AND
     (last_notified IS NULL OR last_notified < NOW() - INTERVAL '24 hours') THEN
    -- Insert alert record
    INSERT INTO public.low_balance_alerts (brand_id, alert_type, balance_at_alert, threshold_value)
    VALUES (NEW.id, 'notify', balance_dollars, notify_threshold);

    -- Update last notified timestamp
    NEW.low_balance_last_notified_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for balance checking
DROP TRIGGER IF EXISTS check_low_balance_trigger ON public.brands;
CREATE TRIGGER check_low_balance_trigger
BEFORE UPDATE OF slash_balance_cents ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.check_brand_low_balance();
