-- Migration: Add flat-rate payment model to boosts
-- This adds the ability for boosts to use per-post flat rates with negotiable ranges
-- instead of only monthly retainers

-- 1. Add payment model columns to bounty_campaigns
ALTER TABLE bounty_campaigns
ADD COLUMN IF NOT EXISTS payment_model TEXT DEFAULT 'retainer',
ADD COLUMN IF NOT EXISTS flat_rate_min NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS flat_rate_max NUMERIC(10,2);

-- Add check constraint for payment_model
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bounty_campaigns_payment_model_check'
  ) THEN
    ALTER TABLE bounty_campaigns
    ADD CONSTRAINT bounty_campaigns_payment_model_check
    CHECK (payment_model IN ('retainer', 'flat_rate'));
  END IF;
END $$;

-- 2. Add rate negotiation columns to bounty_applications
ALTER TABLE bounty_applications
ADD COLUMN IF NOT EXISTS proposed_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS approved_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS rate_status TEXT DEFAULT 'pending';

-- Add check constraint for rate_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bounty_applications_rate_status_check'
  ) THEN
    ALTER TABLE bounty_applications
    ADD CONSTRAINT bounty_applications_rate_status_check
    CHECK (rate_status IN ('pending', 'proposed', 'approved', 'countered'));
  END IF;
END $$;

-- 3. Add per-post rate columns to creator_contracts
ALTER TABLE creator_contracts
ADD COLUMN IF NOT EXISTS per_post_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS payment_model TEXT DEFAULT 'retainer';

-- Add check constraint for payment_model on creator_contracts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creator_contracts_payment_model_check'
  ) THEN
    ALTER TABLE creator_contracts
    ADD CONSTRAINT creator_contracts_payment_model_check
    CHECK (payment_model IN ('retainer', 'flat_rate'));
  END IF;
END $$;

-- 4. Update existing boosts to have payment_model = 'retainer'
UPDATE bounty_campaigns
SET payment_model = 'retainer'
WHERE payment_model IS NULL;

-- 5. Update existing contracts to have payment_model = 'retainer'
UPDATE creator_contracts
SET payment_model = 'retainer'
WHERE payment_model IS NULL;

COMMENT ON COLUMN bounty_campaigns.payment_model IS 'Payment model: retainer (monthly) or flat_rate (per-post)';
COMMENT ON COLUMN bounty_campaigns.flat_rate_min IS 'Minimum per-post rate for flat_rate payment model';
COMMENT ON COLUMN bounty_campaigns.flat_rate_max IS 'Maximum per-post rate for flat_rate payment model';
COMMENT ON COLUMN bounty_applications.proposed_rate IS 'Rate proposed by creator for flat_rate campaigns';
COMMENT ON COLUMN bounty_applications.approved_rate IS 'Final approved rate after negotiation';
COMMENT ON COLUMN bounty_applications.rate_status IS 'Status of rate negotiation: pending, proposed, approved, countered';
COMMENT ON COLUMN creator_contracts.per_post_rate IS 'Per-post rate for flat_rate payment model';
COMMENT ON COLUMN creator_contracts.payment_model IS 'Payment model: retainer (monthly) or flat_rate (per-post)';
