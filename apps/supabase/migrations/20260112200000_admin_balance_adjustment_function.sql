-- Create atomic function for admin balance adjustments
-- This ensures the transaction and balance update happen atomically

CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_action TEXT, -- 'add' or 'remove'
  p_reason TEXT,
  p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_current_balance NUMERIC;
  v_adjusted_amount NUMERIC;
  v_new_balance NUMERIC;
  v_is_admin BOOLEAN;
BEGIN
  -- Verify the caller is an admin
  SELECT public.has_role(p_admin_id, 'admin'::public.app_role) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can adjust user balances';
  END IF;

  -- Validate action
  IF p_action NOT IN ('add', 'remove') THEN
    RAISE EXCEPTION 'Invalid action: must be "add" or "remove"';
  END IF;

  -- Calculate adjusted amount (negative for removals)
  v_adjusted_amount := CASE WHEN p_action = 'add' THEN p_amount ELSE -p_amount END;

  -- Lock wallet row and get current balance
  SELECT balance INTO v_current_balance
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_current_balance IS NULL THEN
    -- Create wallet if it doesn't exist
    INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT balance INTO v_current_balance
    FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance + v_adjusted_amount;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Cannot remove more than current balance. Current: %, Attempting to remove: %', v_current_balance, p_amount;
  END IF;

  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    status,
    description,
    metadata
  ) VALUES (
    p_user_id,
    'balance_correction',
    v_adjusted_amount,
    'completed',
    'Balance correction: ' || COALESCE(p_reason, 'Admin adjustment'),
    jsonb_build_object(
      'correction_type', p_action,
      'reason', COALESCE(p_reason, 'Admin adjustment'),
      'admin_id', p_admin_id,
      'previous_balance', v_current_balance,
      'new_balance', v_new_balance
    )
  )
  RETURNING id INTO v_tx_id;

  -- Update wallet balance
  UPDATE wallets
  SET balance = v_new_balance,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'amount', v_adjusted_amount
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_balance(UUID, NUMERIC, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_adjust_user_balance IS
  'Atomic function for admin balance adjustments. Ensures transaction record and balance update happen together.';
