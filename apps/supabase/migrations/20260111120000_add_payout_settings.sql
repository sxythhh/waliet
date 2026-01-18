-- Add payout settings columns to profiles (brand defaults)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payout_holding_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_minimum_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_settings_updated_at TIMESTAMPTZ;

-- Add payout settings columns to bounty_campaigns (per-boost override)
-- NULL means inherit from brand defaults
ALTER TABLE public.bounty_campaigns
ADD COLUMN IF NOT EXISTS payout_holding_days INTEGER,
ADD COLUMN IF NOT EXISTS payout_minimum_amount INTEGER,
ADD COLUMN IF NOT EXISTS payout_settings_updated_at TIMESTAMPTZ;

-- Add release_at timestamp to payment_ledger for held payouts
ALTER TABLE public.payment_ledger
ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ;

-- Update payment_ledger status CHECK constraint to include 'held'
-- Current: pending → locked → clearing → paid
-- New: pending → held → locked → clearing → paid
ALTER TABLE public.payment_ledger
DROP CONSTRAINT IF EXISTS payment_ledger_status_check;

ALTER TABLE public.payment_ledger
ADD CONSTRAINT payment_ledger_status_check
CHECK (status IN ('pending', 'held', 'locked', 'clearing', 'paid', 'clawed_back'));

-- Add index for efficiently querying held payouts that are ready to release
CREATE INDEX IF NOT EXISTS idx_payment_ledger_held_release
ON public.payment_ledger(release_at)
WHERE status = 'held' AND release_at IS NOT NULL;

-- Create payout settings history table for audit trail
CREATE TABLE IF NOT EXISTS public.payout_settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('brand', 'boost')),
  entity_id UUID NOT NULL,
  holding_days INTEGER,
  minimum_amount INTEGER,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payout_settings_history
CREATE INDEX IF NOT EXISTS idx_payout_settings_history_entity
ON public.payout_settings_history(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_payout_settings_history_changed_by
ON public.payout_settings_history(changed_by);

-- Enable RLS on payout_settings_history
ALTER TABLE public.payout_settings_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payout_settings_history
-- Brand members can view their brand's payout settings history
CREATE POLICY "Brand members can view payout settings history"
ON public.payout_settings_history
FOR SELECT
USING (
  -- Brand-level history
  (entity_type = 'brand' AND EXISTS (
    SELECT 1 FROM public.brand_members bm
    WHERE bm.user_id = auth.uid()
    AND bm.brand_id = (
      SELECT id FROM public.brands WHERE owner_id = entity_id
      UNION
      SELECT brand_id FROM public.brand_members WHERE user_id = entity_id
      LIMIT 1
    )
  ))
  OR
  -- Boost-level history
  (entity_type = 'boost' AND EXISTS (
    SELECT 1 FROM public.bounty_campaigns bc
    JOIN public.brand_members bm ON bm.brand_id = bc.brand_id
    WHERE bc.id = entity_id AND bm.user_id = auth.uid()
  ))
);

-- Service role can insert/update
CREATE POLICY "Service role can manage payout settings history"
ON public.payout_settings_history
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.payout_settings_history IS 'Audit trail for payout settings changes at brand and boost level';
COMMENT ON COLUMN public.profiles.payout_holding_days IS 'Default holding period (0-30 days) before creator can withdraw approved video earnings';
COMMENT ON COLUMN public.profiles.payout_minimum_amount IS 'Default minimum payout threshold ($0-$50) before earnings are released';
COMMENT ON COLUMN public.bounty_campaigns.payout_holding_days IS 'Override holding period for this boost (NULL = use brand default)';
COMMENT ON COLUMN public.bounty_campaigns.payout_minimum_amount IS 'Override minimum payout for this boost (NULL = use brand default)';
COMMENT ON COLUMN public.payment_ledger.release_at IS 'Timestamp when held funds become eligible for release';
