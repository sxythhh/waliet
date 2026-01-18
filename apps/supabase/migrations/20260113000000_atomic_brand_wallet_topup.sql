-- Atomic Brand Wallet Top-up Function
-- Fixes the bug where whop-webhook updates transaction status but never credits the balance
-- Modeled after atomic_credit_crypto_deposit() for consistency

-- Function to atomically credit a brand wallet top-up
CREATE OR REPLACE FUNCTION public.atomic_credit_brand_wallet_topup(
  p_brand_id UUID,
  p_amount NUMERIC,
  p_payment_id TEXT,
  p_source TEXT DEFAULT 'whop'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet RECORD;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
  v_transaction_found BOOLEAN := false;
BEGIN
  -- Validate inputs
  IF p_brand_id IS NULL THEN
    RAISE EXCEPTION 'brand_id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Lock and fetch the brand wallet (or create if not exists)
  SELECT * INTO v_wallet
  FROM public.brand_wallets
  WHERE brand_id = p_brand_id
  FOR UPDATE;

  -- Create wallet if it doesn't exist
  IF v_wallet IS NULL THEN
    INSERT INTO public.brand_wallets (brand_id, balance, total_deposited, total_spent, currency)
    VALUES (p_brand_id, 0, 0, 0, 'usd')
    RETURNING * INTO v_wallet;
  END IF;

  -- Update the pending transaction to completed (if exists)
  UPDATE public.brand_wallet_transactions
  SET
    status = 'completed',
    whop_payment_id = p_payment_id,
    updated_at = now()
  WHERE brand_id = p_brand_id
    AND type = 'topup'
    AND status = 'pending'
    AND amount = p_amount
  RETURNING id INTO v_transaction_id;

  v_transaction_found := v_transaction_id IS NOT NULL;

  -- If no pending transaction found, create a new completed transaction
  IF NOT v_transaction_found THEN
    INSERT INTO public.brand_wallet_transactions (
      brand_id,
      type,
      amount,
      status,
      whop_payment_id,
      source_type,
      description,
      metadata
    ) VALUES (
      p_brand_id,
      'topup',
      p_amount,
      'completed',
      p_payment_id,
      p_source,
      format('Wallet top-up: $%s via %s', p_amount, p_source),
      jsonb_build_object(
        'payment_id', p_payment_id,
        'source', p_source,
        'created_by_webhook', true
      )
    )
    RETURNING id INTO v_transaction_id;
  END IF;

  -- Credit the brand wallet atomically
  UPDATE public.brand_wallets
  SET
    balance = balance + p_amount,
    total_deposited = total_deposited + p_amount,
    updated_at = now()
  WHERE brand_id = p_brand_id
  RETURNING balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'success', true,
    'brand_id', p_brand_id,
    'amount', p_amount,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id,
    'transaction_found', v_transaction_found,
    'source', p_source
  );
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.atomic_credit_brand_wallet_topup TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.atomic_credit_brand_wallet_topup IS
  'Atomically credits a brand wallet from top-up payment. Updates pending transaction and increments balance in single transaction. Used by whop-webhook, slash-webhook, etc.';
