-- =============================================
-- RECONCILE WALLET BALANCES WITH TRANSACTIONS
-- This migration fixes existing discrepancies where
-- wallet balances don't match the sum of transactions
-- =============================================

-- 1. Create a view to identify discrepancies (useful for auditing)
CREATE OR REPLACE VIEW public.wallet_balance_discrepancies AS
SELECT
  w.user_id,
  w.balance AS current_balance,
  COALESCE(t.transaction_sum, 0) AS transaction_sum,
  w.balance - COALESCE(t.transaction_sum, 0) AS discrepancy,
  w.total_earned AS current_total_earned,
  COALESCE(t.total_positive, 0) AS calculated_total_earned,
  w.total_withdrawn AS current_total_withdrawn,
  COALESCE(t.total_negative, 0) AS calculated_total_withdrawn
FROM wallets w
LEFT JOIN (
  SELECT
    user_id,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS transaction_sum,
    SUM(CASE WHEN status = 'completed' AND amount > 0 THEN amount ELSE 0 END) AS total_positive,
    SUM(CASE WHEN status = 'completed' AND amount < 0 THEN ABS(amount) ELSE 0 END) AS total_negative
  FROM wallet_transactions
  GROUP BY user_id
) t ON w.user_id = t.user_id
WHERE ABS(w.balance - COALESCE(t.transaction_sum, 0)) > 0.001
   OR ABS(w.total_earned - COALESCE(t.total_positive, 0)) > 0.001
   OR ABS(w.total_withdrawn - COALESCE(t.total_negative, 0)) > 0.001;

-- 2. Create a similar view for brand wallets
CREATE OR REPLACE VIEW public.brand_wallet_balance_discrepancies AS
SELECT
  bw.brand_id,
  bw.balance AS current_balance,
  COALESCE(t.transaction_sum, 0) AS transaction_sum,
  bw.balance - COALESCE(t.transaction_sum, 0) AS discrepancy,
  bw.total_deposited AS current_total_deposited,
  COALESCE(t.total_in, 0) AS calculated_total_deposited,
  bw.total_spent AS current_total_spent,
  COALESCE(t.total_out, 0) AS calculated_total_spent
FROM brand_wallets bw
LEFT JOIN (
  SELECT
    brand_id,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS transaction_sum,
    SUM(CASE WHEN status = 'completed' AND amount > 0 THEN amount ELSE 0 END) AS total_in,
    SUM(CASE WHEN status = 'completed' AND amount < 0 THEN ABS(amount) ELSE 0 END) AS total_out
  FROM brand_wallet_transactions
  GROUP BY brand_id
) t ON bw.brand_id = t.brand_id
WHERE ABS(bw.balance - COALESCE(t.transaction_sum, 0)) > 0.001
   OR ABS(bw.total_deposited - COALESCE(t.total_in, 0)) > 0.001
   OR ABS(bw.total_spent - COALESCE(t.total_out, 0)) > 0.001;

-- 3. Function to reconcile a single user's wallet
CREATE OR REPLACE FUNCTION public.reconcile_user_wallet(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance NUMERIC;
  v_old_total_earned NUMERIC;
  v_old_total_withdrawn NUMERIC;
  v_new_balance NUMERIC;
  v_new_total_earned NUMERIC;
  v_new_total_withdrawn NUMERIC;
BEGIN
  -- Lock the wallet row
  SELECT balance, total_earned, total_withdrawn
  INTO v_old_balance, v_old_total_earned, v_old_total_withdrawn
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- Calculate correct values from transactions
  SELECT
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'completed' AND amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'completed' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  INTO v_new_balance, v_new_total_earned, v_new_total_withdrawn
  FROM wallet_transactions
  WHERE user_id = p_user_id;

  -- Update wallet with correct values
  UPDATE wallets
  SET
    balance = v_new_balance,
    total_earned = v_new_total_earned,
    total_withdrawn = v_new_total_withdrawn,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'balance_adjustment', v_new_balance - v_old_balance,
    'old_total_earned', v_old_total_earned,
    'new_total_earned', v_new_total_earned,
    'old_total_withdrawn', v_old_total_withdrawn,
    'new_total_withdrawn', v_new_total_withdrawn
  );
END;
$$;

-- 4. Function to reconcile a brand wallet
CREATE OR REPLACE FUNCTION public.reconcile_brand_wallet(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance NUMERIC;
  v_old_total_deposited NUMERIC;
  v_old_total_spent NUMERIC;
  v_new_balance NUMERIC;
  v_new_total_deposited NUMERIC;
  v_new_total_spent NUMERIC;
BEGIN
  -- Lock the wallet row
  SELECT balance, total_deposited, total_spent
  INTO v_old_balance, v_old_total_deposited, v_old_total_spent
  FROM brand_wallets WHERE brand_id = p_brand_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Brand wallet not found');
  END IF;

  -- Calculate correct values from transactions
  SELECT
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'completed' AND amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'completed' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  INTO v_new_balance, v_new_total_deposited, v_new_total_spent
  FROM brand_wallet_transactions
  WHERE brand_id = p_brand_id;

  -- Update wallet with correct values
  UPDATE brand_wallets
  SET
    balance = v_new_balance,
    total_deposited = v_new_total_deposited,
    total_spent = v_new_total_spent,
    updated_at = now()
  WHERE brand_id = p_brand_id;

  RETURN jsonb_build_object(
    'success', true,
    'brand_id', p_brand_id,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'balance_adjustment', v_new_balance - v_old_balance,
    'old_total_deposited', v_old_total_deposited,
    'new_total_deposited', v_new_total_deposited,
    'old_total_spent', v_old_total_spent,
    'new_total_spent', v_new_total_spent
  );
END;
$$;

-- 5. Function to reconcile ALL wallets with discrepancies
CREATE OR REPLACE FUNCTION public.reconcile_all_wallets()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_brand_record RECORD;
  v_user_count INTEGER := 0;
  v_brand_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Reconcile user wallets with discrepancies
  FOR v_user_record IN
    SELECT w.user_id
    FROM wallets w
    LEFT JOIN (
      SELECT
        user_id,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS transaction_sum
      FROM wallet_transactions
      GROUP BY user_id
    ) t ON w.user_id = t.user_id
    WHERE ABS(w.balance - COALESCE(t.transaction_sum, 0)) > 0.001
  LOOP
    PERFORM reconcile_user_wallet(v_user_record.user_id);
    v_user_count := v_user_count + 1;
  END LOOP;

  -- Reconcile brand wallets with discrepancies
  FOR v_brand_record IN
    SELECT bw.brand_id
    FROM brand_wallets bw
    LEFT JOIN (
      SELECT
        brand_id,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS transaction_sum
      FROM brand_wallet_transactions
      GROUP BY brand_id
    ) t ON bw.brand_id = t.brand_id
    WHERE ABS(bw.balance - COALESCE(t.transaction_sum, 0)) > 0.001
  LOOP
    PERFORM reconcile_brand_wallet(v_brand_record.brand_id);
    v_brand_count := v_brand_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'user_wallets_reconciled', v_user_count,
    'brand_wallets_reconciled', v_brand_count
  );
END;
$$;

-- 6. Run the reconciliation for all existing discrepancies
SELECT reconcile_all_wallets();

-- 7. Create a trigger to auto-reconcile on any direct wallet update (safety net)
CREATE OR REPLACE FUNCTION public.check_wallet_balance_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calculated_balance NUMERIC;
BEGIN
  -- Calculate what the balance should be
  SELECT COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)
  INTO v_calculated_balance
  FROM wallet_transactions
  WHERE user_id = NEW.user_id;

  -- If there's a significant discrepancy, log a warning but allow the update
  -- This helps catch any future sync issues
  IF ABS(NEW.balance - v_calculated_balance) > 0.01 THEN
    RAISE WARNING 'Wallet balance discrepancy detected for user %: wallet=%, calculated=%',
      NEW.user_id, NEW.balance, v_calculated_balance;
  END IF;

  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'wallet_balance_check_trigger'
  ) THEN
    CREATE TRIGGER wallet_balance_check_trigger
      BEFORE UPDATE ON wallets
      FOR EACH ROW
      EXECUTE FUNCTION check_wallet_balance_on_update();
  END IF;
END
$$;
