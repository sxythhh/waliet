-- Payout Settings Migration
-- Adds holding period and minimum payout settings for brands and boosts

-- ============================================
-- 1. Add Brand Payout Settings to profiles
-- ============================================

-- Holding period (0-30 days) before approved video earnings can be withdrawn
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_holding_days INTEGER DEFAULT 0;

-- Minimum payout amount ($0-$50) required before funds are released
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_minimum_amount INTEGER DEFAULT 0;

-- Timestamp for rate limiting (once per day changes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_settings_updated_at TIMESTAMPTZ;

-- Add check constraints for valid ranges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'profiles_payout_holding_days_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_payout_holding_days_check
      CHECK (payout_holding_days IS NULL OR (payout_holding_days >= 0 AND payout_holding_days <= 30));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'profiles_payout_minimum_amount_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_payout_minimum_amount_check
      CHECK (payout_minimum_amount IS NULL OR (payout_minimum_amount >= 0 AND payout_minimum_amount <= 50));
  END IF;
END $$;

-- ============================================
-- 2. Add Per-Boost Override Settings
-- ============================================

-- NULL means inherit from brand defaults
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS payout_holding_days INTEGER;
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS payout_minimum_amount INTEGER;
ALTER TABLE bounty_campaigns ADD COLUMN IF NOT EXISTS payout_settings_updated_at TIMESTAMPTZ;

-- Add check constraints for valid ranges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'bounty_campaigns_payout_holding_days_check') THEN
    ALTER TABLE bounty_campaigns ADD CONSTRAINT bounty_campaigns_payout_holding_days_check
      CHECK (payout_holding_days IS NULL OR (payout_holding_days >= 0 AND payout_holding_days <= 30));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'bounty_campaigns_payout_minimum_amount_check') THEN
    ALTER TABLE bounty_campaigns ADD CONSTRAINT bounty_campaigns_payout_minimum_amount_check
      CHECK (payout_minimum_amount IS NULL OR (payout_minimum_amount >= 0 AND payout_minimum_amount <= 50));
  END IF;
END $$;

-- ============================================
-- 3. Add release_at to payment_ledger
-- ============================================

-- Timestamp when held payment should be released
ALTER TABLE payment_ledger ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ;

-- Create index for efficient querying of held payments ready for release
CREATE INDEX IF NOT EXISTS idx_payment_ledger_release_at ON payment_ledger(release_at)
WHERE status = 'held' AND release_at IS NOT NULL;

-- ============================================
-- 4. Add 'held' status to payment_ledger
-- ============================================

-- Update the status check constraint to include 'held'
-- Current flow: pending → locked → clearing → paid
-- New flow: pending → held → locked → clearing → paid

DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'payment_ledger_status_check') THEN
    ALTER TABLE payment_ledger DROP CONSTRAINT payment_ledger_status_check;
  END IF;

  -- Add new constraint with 'held' status
  ALTER TABLE payment_ledger ADD CONSTRAINT payment_ledger_status_check
    CHECK (status IN ('pending', 'held', 'locked', 'clearing', 'paid', 'flagged', 'refunded'));
END $$;

-- ============================================
-- 5. Create Payout Settings History (Audit)
-- ============================================

CREATE TABLE IF NOT EXISTS payout_settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('brand', 'boost', 'payment_ledger')),
  entity_id UUID NOT NULL,
  action TEXT DEFAULT 'update',
  holding_days INTEGER,
  minimum_amount INTEGER,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_payout_settings_history_entity ON payout_settings_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_payout_settings_history_changed_by ON payout_settings_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_payout_settings_history_changed_at ON payout_settings_history(changed_at);

-- Enable RLS
ALTER TABLE payout_settings_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view payout settings history" ON payout_settings_history;
CREATE POLICY "Admins can view payout settings history"
  ON payout_settings_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) OR
    changed_by = auth.uid()
  );

DROP POLICY IF EXISTS "System can insert history" ON payout_settings_history;
CREATE POLICY "System can insert history"
  ON payout_settings_history FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 6. Function to calculate release date
-- ============================================

CREATE OR REPLACE FUNCTION calculate_payout_release_date(
  p_boost_id UUID,
  p_approval_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_holding_days INTEGER;
  v_brand_id UUID;
BEGIN
  -- Get boost's holding days (or NULL if not set)
  SELECT payout_holding_days, brand_id INTO v_holding_days, v_brand_id
  FROM bounty_campaigns
  WHERE id = p_boost_id;

  -- If boost doesn't have override, get brand's default
  IF v_holding_days IS NULL AND v_brand_id IS NOT NULL THEN
    SELECT payout_holding_days INTO v_holding_days
    FROM profiles
    WHERE id = v_brand_id;
  END IF;

  -- Default to 0 days if not configured
  v_holding_days := COALESCE(v_holding_days, 0);

  -- If 0 days, return NULL (no holding)
  IF v_holding_days = 0 THEN
    RETURN NULL;
  END IF;

  -- Calculate release date
  RETURN p_approval_date + (v_holding_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Function to get effective payout settings
-- ============================================

CREATE OR REPLACE FUNCTION get_effective_payout_settings(p_boost_id UUID)
RETURNS TABLE (
  holding_days INTEGER,
  minimum_amount INTEGER,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(bc.payout_holding_days, p.payout_holding_days, 0) as holding_days,
    COALESCE(bc.payout_minimum_amount, p.payout_minimum_amount, 0) as minimum_amount,
    CASE
      WHEN bc.payout_holding_days IS NOT NULL OR bc.payout_minimum_amount IS NOT NULL THEN 'boost'
      ELSE 'brand'
    END as source
  FROM bounty_campaigns bc
  LEFT JOIN profiles p ON bc.brand_id = p.id
  WHERE bc.id = p_boost_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Comments for documentation
-- ============================================

COMMENT ON COLUMN profiles.payout_holding_days IS 'Default holding period (0-30 days) before approved video earnings can be withdrawn';
COMMENT ON COLUMN profiles.payout_minimum_amount IS 'Default minimum payout amount ($0-$50) required before funds are released';
COMMENT ON COLUMN profiles.payout_settings_updated_at IS 'Timestamp of last payout settings change (for rate limiting)';

COMMENT ON COLUMN bounty_campaigns.payout_holding_days IS 'Per-boost override for holding period. NULL means inherit from brand defaults';
COMMENT ON COLUMN bounty_campaigns.payout_minimum_amount IS 'Per-boost override for minimum payout. NULL means inherit from brand defaults';
COMMENT ON COLUMN bounty_campaigns.payout_settings_updated_at IS 'Timestamp of last payout settings change (for rate limiting)';

COMMENT ON COLUMN payment_ledger.release_at IS 'Timestamp when held payment should be released to locked status';

COMMENT ON TABLE payout_settings_history IS 'Audit log for payout settings changes';

COMMENT ON FUNCTION calculate_payout_release_date IS 'Calculates the release date for a held payment based on boost/brand settings';
COMMENT ON FUNCTION get_effective_payout_settings IS 'Returns the effective payout settings for a boost (considering overrides)';
