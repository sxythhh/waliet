-- Fix P2P transfer atomic function to use correct types and include usernames
-- This fixes:
-- 1. Transaction types: use 'transfer_sent' and 'transfer_received' (matching UI)
-- 2. Include sender/recipient usernames in metadata for display

CREATE OR REPLACE FUNCTION public.atomic_p2p_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_gross_amount NUMERIC,
  p_net_amount NUMERIC,
  p_fee NUMERIC,
  p_note TEXT DEFAULT NULL,
  p_sender_username TEXT DEFAULT NULL,
  p_recipient_username TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_transfer_id UUID;
  v_sender_tx_id UUID;
  v_recipient_tx_id UUID;
  v_actual_sender_username TEXT;
  v_actual_recipient_username TEXT;
BEGIN
  -- Get actual usernames from profiles if not provided
  IF p_sender_username IS NULL THEN
    SELECT username INTO v_actual_sender_username FROM profiles WHERE id = p_sender_id;
  ELSE
    v_actual_sender_username := p_sender_username;
  END IF;

  IF p_recipient_username IS NULL THEN
    SELECT username INTO v_actual_recipient_username FROM profiles WHERE id = p_recipient_id;
  ELSE
    v_actual_recipient_username := p_recipient_username;
  END IF;

  -- Lock sender wallet row to prevent concurrent modifications
  SELECT balance INTO v_sender_balance
  FROM wallets WHERE user_id = p_sender_id FOR UPDATE;

  IF v_sender_balance IS NULL THEN
    RAISE EXCEPTION 'Sender wallet not found';
  END IF;

  -- Validate sufficient balance
  IF v_sender_balance < p_gross_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_sender_balance, p_gross_amount;
  END IF;

  -- Lock recipient wallet
  PERFORM 1 FROM wallets WHERE user_id = p_recipient_id FOR UPDATE;

  -- Ensure recipient wallet exists
  INSERT INTO wallets (user_id, balance, total_earned)
  VALUES (p_recipient_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Atomic debit from sender
  UPDATE wallets
  SET balance = balance - p_gross_amount,
      updated_at = now()
  WHERE user_id = p_sender_id;

  -- Atomic credit to recipient
  UPDATE wallets
  SET balance = balance + p_net_amount,
      total_earned = total_earned + p_net_amount,
      updated_at = now()
  WHERE user_id = p_recipient_id;

  -- Create transfer record
  INSERT INTO p2p_transfers (sender_id, recipient_id, amount, fee, net_amount, note, status)
  VALUES (p_sender_id, p_recipient_id, p_gross_amount, p_fee, p_net_amount, p_note, 'completed')
  RETURNING id INTO v_transfer_id;

  -- Create sender transaction record with correct type and metadata
  INSERT INTO wallet_transactions (user_id, amount, type, status, description, metadata)
  VALUES (
    p_sender_id,
    -p_gross_amount,
    'transfer_sent',  -- Changed from 'transfer_out'
    'completed',
    'Transfer to @' || COALESCE(v_actual_recipient_username, 'user'),
    jsonb_build_object(
      'transfer_id', v_transfer_id,
      'recipient_id', p_recipient_id,
      'recipient_username', v_actual_recipient_username,
      'fee', p_fee,
      'transfer_type', 'p2p'
    )
  )
  RETURNING id INTO v_sender_tx_id;

  -- Create recipient transaction record with correct type and metadata
  INSERT INTO wallet_transactions (user_id, amount, type, status, description, metadata)
  VALUES (
    p_recipient_id,
    p_net_amount,
    'transfer_received',  -- Changed from 'transfer_in'
    'completed',
    COALESCE(p_note, 'Received from @' || COALESCE(v_actual_sender_username, 'user')),
    jsonb_build_object(
      'transfer_id', v_transfer_id,
      'sender_id', p_sender_id,
      'sender_username', v_actual_sender_username,
      'transfer_type', 'p2p'
    )
  )
  RETURNING id INTO v_recipient_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'sender_tx_id', v_sender_tx_id,
    'recipient_tx_id', v_recipient_tx_id,
    'gross_amount', p_gross_amount,
    'net_amount', p_net_amount,
    'fee', p_fee
  );

EXCEPTION WHEN OTHERS THEN
  -- Transaction automatically rolls back on exception
  RAISE;
END;
$$;

-- Also update the TransactionsTable interface to handle legacy 'transfer_in'/'transfer_out' types
-- This is done in the application code, not SQL
