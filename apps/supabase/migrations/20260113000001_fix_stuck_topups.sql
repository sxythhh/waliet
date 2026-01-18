-- Fix Stuck Top-up Transactions
-- One-time migration to reconcile completed transactions that never credited the balance
-- This fixes the bug in whop-webhook that only updated status but not balance

-- First, identify and fix stuck topups by recalculating balances
DO $$
DECLARE
  v_brand RECORD;
  v_correct_balance NUMERIC;
  v_current_balance NUMERIC;
  v_diff NUMERIC;
  v_fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting stuck topup reconciliation...';

  -- Find all brands with potential balance discrepancies
  FOR v_brand IN (
    SELECT
      bw.brand_id,
      bw.balance as current_balance,
      COALESCE(SUM(
        CASE
          WHEN t.type IN ('topup', 'crypto_deposit', 'deposit', 'transfer_in', 'admin_credit', 'coinbase_onramp')
               AND t.status = 'completed' THEN t.amount
          WHEN t.type IN ('withdrawal', 'campaign_allocation', 'boost_allocation', 'transfer_out', 'admin_debit')
               AND t.status = 'completed' THEN -t.amount
          ELSE 0
        END
      ), 0) as calculated_balance
    FROM public.brand_wallets bw
    LEFT JOIN public.brand_wallet_transactions t ON t.brand_id = bw.brand_id
    GROUP BY bw.brand_id, bw.balance
    HAVING ABS(bw.balance - COALESCE(SUM(
      CASE
        WHEN t.type IN ('topup', 'crypto_deposit', 'deposit', 'transfer_in', 'admin_credit', 'coinbase_onramp')
             AND t.status = 'completed' THEN t.amount
        WHEN t.type IN ('withdrawal', 'campaign_allocation', 'boost_allocation', 'transfer_out', 'admin_debit')
             AND t.status = 'completed' THEN -t.amount
        ELSE 0
      END
    ), 0)) > 0.01
  )
  LOOP
    v_current_balance := v_brand.current_balance;
    v_correct_balance := v_brand.calculated_balance;
    v_diff := v_correct_balance - v_current_balance;

    RAISE NOTICE 'Brand %: current=%, should_be=%, diff=%',
      v_brand.brand_id, v_current_balance, v_correct_balance, v_diff;

    -- Update the balance to the correct value
    UPDATE public.brand_wallets
    SET
      balance = v_correct_balance,
      updated_at = now()
    WHERE brand_id = v_brand.brand_id;

    -- Also recalculate total_deposited from completed deposits
    UPDATE public.brand_wallets bw
    SET total_deposited = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.brand_wallet_transactions
      WHERE brand_id = bw.brand_id
        AND type IN ('topup', 'crypto_deposit', 'deposit', 'transfer_in', 'coinbase_onramp')
        AND status = 'completed'
    )
    WHERE brand_id = v_brand.brand_id;

    v_fixed_count := v_fixed_count + 1;
  END LOOP;

  RAISE NOTICE 'Reconciliation complete. Fixed % brand wallets.', v_fixed_count;
END;
$$;

-- Create an index to help identify future discrepancies faster
CREATE INDEX IF NOT EXISTS idx_brand_wallet_transactions_status_type
  ON public.brand_wallet_transactions(brand_id, status, type);

-- Log this migration for audit purposes
INSERT INTO public.brand_wallet_transactions (
  brand_id,
  type,
  amount,
  status,
  description,
  metadata
)
SELECT
  (SELECT id FROM public.brands LIMIT 1), -- Use first brand as placeholder for system entry
  'admin_credit',
  0,
  'completed',
  'System: Stuck topup reconciliation migration executed',
  jsonb_build_object(
    'migration', '20260113000001_fix_stuck_topups',
    'executed_at', now()::text,
    'reason', 'One-time fix for whop-webhook balance sync bug'
  )
WHERE EXISTS (SELECT 1 FROM public.brands LIMIT 1); -- Only if brands exist
