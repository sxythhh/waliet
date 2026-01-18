-- Add CHECK constraints to prevent negative wallet balances
-- SECURITY: Prevents race conditions from causing negative balances

-- Creator wallets - balance must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallets_balance_non_negative'
    AND conrelid = 'public.wallets'::regclass
  ) THEN
    ALTER TABLE public.wallets
    ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0);
  END IF;
END $$;

-- Brand wallets - balance must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brand_wallets_balance_non_negative'
    AND conrelid = 'public.brand_wallets'::regclass
  ) THEN
    ALTER TABLE public.brand_wallets
    ADD CONSTRAINT brand_wallets_balance_non_negative CHECK (balance >= 0);
  END IF;
END $$;

-- Campaign wallets (bounty_campaigns budget) - budget must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bounty_campaigns_budget_non_negative'
    AND conrelid = 'public.bounty_campaigns'::regclass
  ) THEN
    ALTER TABLE public.bounty_campaigns
    ADD CONSTRAINT bounty_campaigns_budget_non_negative CHECK (budget >= 0);
  END IF;
END $$;

-- Campaigns budget - must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_budget_non_negative'
    AND conrelid = 'public.campaigns'::regclass
  ) THEN
    ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_budget_non_negative CHECK (budget >= 0);
  END IF;
END $$;

-- Also ensure total_earned and total_withdrawn are non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallets_total_earned_non_negative'
    AND conrelid = 'public.wallets'::regclass
  ) THEN
    ALTER TABLE public.wallets
    ADD CONSTRAINT wallets_total_earned_non_negative CHECK (total_earned >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallets_total_withdrawn_non_negative'
    AND conrelid = 'public.wallets'::regclass
  ) THEN
    ALTER TABLE public.wallets
    ADD CONSTRAINT wallets_total_withdrawn_non_negative CHECK (total_withdrawn >= 0);
  END IF;
END $$;

-- Brand wallet totals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brand_wallets_total_deposited_non_negative'
    AND conrelid = 'public.brand_wallets'::regclass
  ) THEN
    ALTER TABLE public.brand_wallets
    ADD CONSTRAINT brand_wallets_total_deposited_non_negative CHECK (total_deposited >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brand_wallets_total_spent_non_negative'
    AND conrelid = 'public.brand_wallets'::regclass
  ) THEN
    ALTER TABLE public.brand_wallets
    ADD CONSTRAINT brand_wallets_total_spent_non_negative CHECK (total_spent >= 0);
  END IF;
END $$;

-- Add comment explaining the constraints
COMMENT ON CONSTRAINT wallets_balance_non_negative ON public.wallets IS 'SECURITY: Prevents negative balances from race conditions in concurrent transactions';
COMMENT ON CONSTRAINT brand_wallets_balance_non_negative ON public.brand_wallets IS 'SECURITY: Prevents negative balances from race conditions in concurrent transactions';
