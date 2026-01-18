-- Fix budget allocation type mismatch
-- The atomic_allocate_budget function was using 'budget_allocation' but the constraint only allows 'campaign_allocation'

-- 1. Update the constraint to allow 'budget_allocation' for backwards compatibility
ALTER TABLE public.brand_wallet_transactions
DROP CONSTRAINT IF EXISTS brand_wallet_transactions_type_check;

ALTER TABLE public.brand_wallet_transactions
ADD CONSTRAINT brand_wallet_transactions_type_check
CHECK (type = ANY (ARRAY[
  'topup', 'withdrawal', 'campaign_allocation', 'boost_allocation',
  'refund', 'admin_credit', 'admin_debit', 'transfer_to_withdraw',
  'deposit', 'deposit_intent', 'transfer_in', 'transfer_out',
  'crypto_deposit', 'coinbase_onramp', 'budget_allocation'
]::text[]));

-- 2. Update existing 'budget_allocation' transactions to 'campaign_allocation' for consistency
UPDATE public.brand_wallet_transactions
SET type = 'campaign_allocation'
WHERE type = 'budget_allocation';

-- 3. Fix the atomic_allocate_budget function to use 'campaign_allocation'
CREATE OR REPLACE FUNCTION public.atomic_allocate_budget(
  p_brand_id UUID,
  p_campaign_id UUID,
  p_campaign_type TEXT, -- 'campaign' or 'boost'
  p_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_balance NUMERIC;
  v_current_budget NUMERIC;
  v_tx_type TEXT;
BEGIN
  -- Lock brand wallet
  SELECT balance INTO v_brand_balance
  FROM brand_wallets WHERE brand_id = p_brand_id FOR UPDATE;

  IF v_brand_balance IS NULL THEN
    RAISE EXCEPTION 'Brand wallet not found';
  END IF;

  IF v_brand_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient brand balance: have %, need %', v_brand_balance, p_amount;
  END IF;

  -- Debit brand wallet
  UPDATE brand_wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE brand_id = p_brand_id;

  -- Credit campaign/boost budget
  IF p_campaign_type = 'campaign' THEN
    v_tx_type := 'campaign_allocation';
    UPDATE campaigns
    SET budget = COALESCE(budget, 0) + p_amount,
        updated_at = now()
    WHERE id = p_campaign_id
    RETURNING budget INTO v_current_budget;
  ELSE
    v_tx_type := 'boost_allocation';
    UPDATE bounty_campaigns
    SET budget = COALESCE(budget, 0) + p_amount,
        updated_at = now()
    WHERE id = p_campaign_id
    RETURNING budget INTO v_current_budget;
  END IF;

  -- Create transaction record with correct type
  INSERT INTO brand_wallet_transactions (brand_id, amount, type, status, description, campaign_id, boost_id)
  VALUES (
    p_brand_id,
    p_amount, -- Store as positive, the type indicates it's a debit
    v_tx_type,
    'completed',
    'Budget allocated to ' || p_campaign_type,
    CASE WHEN p_campaign_type = 'campaign' THEN p_campaign_id ELSE NULL END,
    CASE WHEN p_campaign_type = 'boost' THEN p_campaign_id ELSE NULL END
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_budget', v_current_budget,
    'amount_allocated', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 4. Create a function to reconcile brand wallet balance from transactions
-- Note: Transaction amounts are already signed (negative for debits, positive for credits)
CREATE OR REPLACE FUNCTION public.reconcile_brand_wallet_balance(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calculated_balance NUMERIC;
  v_current_balance NUMERIC;
  v_difference NUMERIC;
BEGIN
  -- Get current stored balance
  SELECT balance INTO v_current_balance
  FROM brand_wallets WHERE brand_id = p_brand_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Brand wallet not found';
  END IF;

  -- Calculate balance from transactions - amounts are already signed
  SELECT COALESCE(SUM(amount), 0) INTO v_calculated_balance
  FROM brand_wallet_transactions
  WHERE brand_id = p_brand_id AND status = 'completed';

  v_difference := v_current_balance - v_calculated_balance;

  -- Update the balance to match calculated
  UPDATE brand_wallets
  SET balance = v_calculated_balance,
      updated_at = now()
  WHERE brand_id = p_brand_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'calculated_balance', v_calculated_balance,
    'difference', v_difference,
    'new_balance', v_calculated_balance
  );
END;
$$;
