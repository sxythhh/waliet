-- =============================================
-- FIX: Transaction-Balance Synchronization
-- This migration adds atomic RPC functions to ensure
-- transactions and balance updates happen atomically
-- =============================================

-- 1. Atomic campaign payment function (for CPM payments)
CREATE OR REPLACE FUNCTION public.atomic_campaign_payment(
  p_creator_id UUID,
  p_campaign_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_metadata JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_wallet_exists BOOLEAN;
BEGIN
  -- Lock creator wallet row to prevent concurrent modifications
  SELECT EXISTS(SELECT 1 FROM wallets WHERE user_id = p_creator_id FOR UPDATE) INTO v_wallet_exists;

  -- Ensure creator wallet exists
  IF NOT v_wallet_exists THEN
    INSERT INTO wallets (user_id, balance, total_earned)
    VALUES (p_creator_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Lock the row again after potential insert
  PERFORM 1 FROM wallets WHERE user_id = p_creator_id FOR UPDATE;

  -- Create transaction record
  INSERT INTO wallet_transactions (user_id, amount, type, description, metadata, status)
  VALUES (p_creator_id, p_amount, 'campaign', p_description, p_metadata, 'completed')
  RETURNING id INTO v_tx_id;

  -- Atomically update balance
  UPDATE wallets
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE user_id = p_creator_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  -- Transaction automatically rolls back on exception
  RAISE;
END;
$$;

-- 2. Atomic view bonus payment function
CREATE OR REPLACE FUNCTION public.atomic_view_bonus_payment(
  p_creator_id UUID,
  p_boost_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_metadata JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_wallet_exists BOOLEAN;
BEGIN
  -- Lock creator wallet row to prevent concurrent modifications
  SELECT EXISTS(SELECT 1 FROM wallets WHERE user_id = p_creator_id FOR UPDATE) INTO v_wallet_exists;

  -- Ensure creator wallet exists
  IF NOT v_wallet_exists THEN
    INSERT INTO wallets (user_id, balance, total_earned)
    VALUES (p_creator_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Lock the row again after potential insert
  PERFORM 1 FROM wallets WHERE user_id = p_creator_id FOR UPDATE;

  -- Create transaction record
  INSERT INTO wallet_transactions (user_id, amount, type, description, metadata, status)
  VALUES (p_creator_id, p_amount, 'boost', p_description, p_metadata, 'completed')
  RETURNING id INTO v_tx_id;

  -- Atomically update balance
  UPDATE wallets
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE user_id = p_creator_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 3. Atomic personal-to-brand transfer function
CREATE OR REPLACE FUNCTION public.atomic_personal_to_brand_transfer(
  p_user_id UUID,
  p_brand_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_personal_balance NUMERIC;
  v_brand_wallet_exists BOOLEAN;
  v_brand_name TEXT;
BEGIN
  -- Get brand name for transaction description
  SELECT name INTO v_brand_name FROM brands WHERE id = p_brand_id;
  IF v_brand_name IS NULL THEN
    RAISE EXCEPTION 'Brand not found';
  END IF;

  -- Lock personal wallet row and get balance
  SELECT balance INTO v_personal_balance
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_personal_balance IS NULL THEN
    RAISE EXCEPTION 'Personal wallet not found';
  END IF;

  -- Validate sufficient balance
  IF v_personal_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_personal_balance, p_amount;
  END IF;

  -- Lock brand wallet (or create if doesn't exist)
  SELECT EXISTS(SELECT 1 FROM brand_wallets WHERE brand_id = p_brand_id FOR UPDATE) INTO v_brand_wallet_exists;

  IF NOT v_brand_wallet_exists THEN
    INSERT INTO brand_wallets (brand_id, balance, total_deposited, currency)
    VALUES (p_brand_id, 0, 0, 'usd')
    ON CONFLICT (brand_id) DO NOTHING;
  END IF;

  -- Lock the row again after potential insert
  PERFORM 1 FROM brand_wallets WHERE brand_id = p_brand_id FOR UPDATE;

  -- Atomic debit from personal wallet
  UPDATE wallets
  SET balance = balance - p_amount,
      total_withdrawn = total_withdrawn + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Atomic credit to brand wallet
  UPDATE brand_wallets
  SET balance = balance + p_amount,
      total_deposited = total_deposited + p_amount,
      updated_at = now()
  WHERE brand_id = p_brand_id;

  -- Create personal wallet transaction record
  INSERT INTO wallet_transactions (user_id, amount, type, status, description, metadata)
  VALUES (
    p_user_id,
    p_amount,
    'transfer_out',
    'completed',
    COALESCE(p_description, 'Transfer to brand: ' || v_brand_name),
    jsonb_build_object('destination_type', 'brand_wallet', 'brand_id', p_brand_id, 'brand_name', v_brand_name)
  );

  -- Create brand wallet transaction record
  INSERT INTO brand_wallet_transactions (brand_id, type, amount, status, description, created_by, metadata)
  VALUES (
    p_brand_id,
    'transfer_in',
    p_amount,
    'completed',
    COALESCE(p_description, 'Transfer from personal wallet'),
    p_user_id,
    jsonb_build_object('source_type', 'personal_wallet', 'source_user_id', p_user_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'personal_balance', v_personal_balance - p_amount
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;
