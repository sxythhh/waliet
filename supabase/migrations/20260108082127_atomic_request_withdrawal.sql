-- =============================================
-- ATOMIC WITHDRAWAL REQUEST FUNCTION
-- Prevents race conditions in withdrawal requests
-- =============================================

-- Create atomic_request_withdrawal function with FOR UPDATE locking
CREATE OR REPLACE FUNCTION public.atomic_request_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC,
  p_payout_method TEXT,
  p_payout_details JSONB,
  p_tax_form_id UUID DEFAULT NULL,
  p_tax_form_verified BOOLEAN DEFAULT FALSE,
  p_withholding_rate NUMERIC DEFAULT 0,
  p_withholding_amount NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_wallet_balance NUMERIC;
  v_wallet_total_withdrawn NUMERIC;
  v_payout_request_id UUID;
  v_transaction_id UUID;
  v_net_amount NUMERIC;
  v_balance_after NUMERIC;
  v_existing_pending INTEGER;
BEGIN
  -- Calculate net amount after withholding
  v_net_amount := p_amount - p_withholding_amount;

  -- Lock wallet row FIRST to prevent concurrent modifications
  SELECT id, balance, total_withdrawn
  INTO v_wallet_id, v_wallet_balance, v_wallet_total_withdrawn
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Validate sufficient balance (inside transaction with lock held)
  IF v_wallet_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_wallet_balance, p_amount;
  END IF;

  -- Check for existing pending/in-transit withdrawals (still under lock)
  SELECT COUNT(*) INTO v_existing_pending
  FROM payout_requests
  WHERE user_id = p_user_id
  AND status IN ('pending', 'in_transit');

  IF v_existing_pending > 0 THEN
    RAISE EXCEPTION 'You already have a pending withdrawal request. Please wait for it to be processed.';
  END IF;

  -- Calculate balance after withdrawal
  v_balance_after := v_wallet_balance - p_amount;

  -- ATOMIC OPERATION 1: Create payout request
  INSERT INTO payout_requests (
    user_id,
    amount,
    payout_method,
    payout_details,
    status,
    tax_form_id,
    tax_form_verified,
    withholding_rate,
    withholding_amount,
    net_amount
  ) VALUES (
    p_user_id,
    p_amount,
    p_payout_method,
    p_payout_details,
    'pending',
    p_tax_form_id,
    p_tax_form_verified,
    p_withholding_rate,
    p_withholding_amount,
    v_net_amount
  )
  RETURNING id INTO v_payout_request_id;

  -- ATOMIC OPERATION 2: Create wallet transaction (debit)
  INSERT INTO wallet_transactions (
    user_id,
    amount,
    type,
    status,
    description,
    metadata,
    created_by
  ) VALUES (
    p_user_id,
    -p_amount,  -- Negative for withdrawal
    'withdrawal',
    'pending',
    'Withdrawal to ' || CASE
      WHEN p_payout_method = 'paypal' THEN 'PayPal'
      WHEN p_payout_method = 'crypto' THEN 'Crypto'
      ELSE p_payout_method
    END,
    jsonb_build_object(
      'payout_method', p_payout_method,
      'payout_request_id', v_payout_request_id,
      'network', p_payout_details->>'network',
      'balance_before', v_wallet_balance,
      'balance_after', v_balance_after
    ),
    p_user_id
  )
  RETURNING id INTO v_transaction_id;

  -- ATOMIC OPERATION 3: Update wallet balance using relative operation
  UPDATE wallets
  SET balance = balance - p_amount,
      total_withdrawn = total_withdrawn + p_amount,
      updated_at = now()
  WHERE id = v_wallet_id;

  -- Return success with all relevant IDs and amounts
  RETURN jsonb_build_object(
    'success', true,
    'payout_request_id', v_payout_request_id,
    'transaction_id', v_transaction_id,
    'amount', p_amount,
    'balance_after', v_balance_after,
    'withholding_rate', p_withholding_rate,
    'withholding_amount', p_withholding_amount,
    'net_amount', v_net_amount,
    'tax_form_verified', p_tax_form_verified
  );

EXCEPTION WHEN OTHERS THEN
  -- Transaction automatically rolls back on exception
  -- Re-raise the exception with the original message
  RAISE;
END;
$$;

-- Add comment documenting the function
COMMENT ON FUNCTION public.atomic_request_withdrawal IS
'Atomically creates a withdrawal request with proper row-level locking to prevent race conditions.
Uses FOR UPDATE on the wallet row to prevent concurrent modifications.
All operations (payout_request insert, transaction insert, wallet update) happen in a single transaction.';
