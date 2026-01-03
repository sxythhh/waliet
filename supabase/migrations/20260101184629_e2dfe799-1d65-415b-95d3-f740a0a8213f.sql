-- =============================================
-- PHASE 1: FINANCIAL SAFETY - ATOMIC TRANSFERS & RATE LIMITING
-- =============================================

-- 1. Create rate_limits table for database-backed rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, action_type)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage all rate limits
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limits;
CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- 2. Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_attempts INTEGER DEFAULT 10,
  p_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_window_interval INTERVAL;
BEGIN
  v_window_interval := (p_window_seconds || ' seconds')::INTERVAL;
  
  SELECT * INTO v_record FROM rate_limits 
  WHERE user_id = p_user_id AND action_type = p_action
  FOR UPDATE;
  
  IF v_record IS NULL THEN
    INSERT INTO rate_limits (user_id, action_type, attempts, window_start) 
    VALUES (p_user_id, p_action, 1, now());
    RETURN TRUE;
  END IF;
  
  -- Reset window if expired
  IF v_record.window_start < now() - v_window_interval THEN
    UPDATE rate_limits SET attempts = 1, window_start = now()
    WHERE user_id = p_user_id AND action_type = p_action;
    RETURN TRUE;
  END IF;
  
  -- Check if over limit
  IF v_record.attempts >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Increment attempts
  UPDATE rate_limits SET attempts = attempts + 1
  WHERE user_id = p_user_id AND action_type = p_action;
  RETURN TRUE;
END;
$$;

-- 3. Create atomic P2P transfer function
CREATE OR REPLACE FUNCTION public.atomic_p2p_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_gross_amount NUMERIC,
  p_net_amount NUMERIC,
  p_fee NUMERIC,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_transfer_id UUID;
  v_sender_tx_id UUID;
  v_recipient_tx_id UUID;
BEGIN
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
  
  -- Create sender transaction record
  INSERT INTO wallet_transactions (user_id, amount, type, status, description, metadata)
  VALUES (
    p_sender_id,
    -p_gross_amount,
    'transfer_out',
    'completed',
    'Transfer to user',
    jsonb_build_object('transfer_id', v_transfer_id, 'recipient_id', p_recipient_id, 'fee', p_fee)
  )
  RETURNING id INTO v_sender_tx_id;
  
  -- Create recipient transaction record
  INSERT INTO wallet_transactions (user_id, amount, type, status, description, metadata)
  VALUES (
    p_recipient_id,
    p_net_amount,
    'transfer_in',
    'completed',
    COALESCE(p_note, 'Received transfer'),
    jsonb_build_object('transfer_id', v_transfer_id, 'sender_id', p_sender_id)
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

-- 4. Create atomic brand-to-personal transfer function
CREATE OR REPLACE FUNCTION public.atomic_brand_to_personal_transfer(
  p_brand_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT 'Brand wallet transfer'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_balance NUMERIC;
  v_tx_id UUID;
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
  
  -- Lock user wallet
  PERFORM 1 FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  -- Ensure user wallet exists
  INSERT INTO wallets (user_id, balance, total_earned)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Debit brand wallet
  UPDATE brand_wallets 
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE brand_id = p_brand_id;
  
  -- Credit user wallet
  UPDATE wallets 
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create brand transaction record
  INSERT INTO brand_wallet_transactions (brand_id, amount, type, status, description)
  VALUES (p_brand_id, -p_amount, 'transfer_out', 'completed', p_description);
  
  -- Create user transaction record
  INSERT INTO wallet_transactions (user_id, amount, type, status, description, metadata)
  VALUES (
    p_user_id,
    p_amount,
    'earning',
    'completed',
    p_description,
    jsonb_build_object('brand_id', p_brand_id, 'source', 'brand_transfer')
  )
  RETURNING id INTO v_tx_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'amount', p_amount
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 5. Create atomic budget allocation function
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
    UPDATE campaigns 
    SET budget = COALESCE(budget, 0) + p_amount,
        updated_at = now()
    WHERE id = p_campaign_id
    RETURNING budget INTO v_current_budget;
  ELSE
    UPDATE bounty_campaigns 
    SET budget = COALESCE(budget, 0) + p_amount,
        updated_at = now()
    WHERE id = p_campaign_id
    RETURNING budget INTO v_current_budget;
  END IF;
  
  -- Create transaction record
  INSERT INTO brand_wallet_transactions (brand_id, amount, type, status, description, campaign_id, boost_id)
  VALUES (
    p_brand_id, 
    -p_amount, 
    'budget_allocation', 
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

-- 6. Create atomic payout completion function
CREATE OR REPLACE FUNCTION public.atomic_complete_payout(
  p_payout_request_id UUID,
  p_approved_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout_request RECORD;
  v_locked_entries RECORD;
  v_total_to_pay NUMERIC := 0;
  v_entries_count INTEGER := 0;
  v_tx_id UUID;
  v_entry RECORD;
BEGIN
  -- Lock and fetch payout request
  SELECT * INTO v_payout_request 
  FROM submission_payout_requests 
  WHERE id = p_payout_request_id 
  FOR UPDATE;
  
  IF v_payout_request IS NULL THEN
    RAISE EXCEPTION 'Payout request not found';
  END IF;
  
  IF v_payout_request.status = 'completed' THEN
    RAISE EXCEPTION 'Payout already completed';
  END IF;
  
  -- Check clearing period (skip if already approved)
  IF v_payout_request.status != 'approved' AND v_payout_request.clearing_ends_at > now() THEN
    RAISE EXCEPTION 'Clearing period has not ended';
  END IF;
  
  -- Lock user wallet
  PERFORM 1 FROM wallets WHERE user_id = v_payout_request.user_id FOR UPDATE;
  
  -- Calculate total from locked entries and update them
  FOR v_entry IN 
    SELECT * FROM payment_ledger 
    WHERE payout_request_id = p_payout_request_id AND status = 'locked'
    FOR UPDATE
  LOOP
    v_total_to_pay := v_total_to_pay + GREATEST(0, v_entry.accrued_amount - v_entry.paid_amount);
    v_entries_count := v_entries_count + 1;
    
    -- Update entry to paid
    UPDATE payment_ledger 
    SET status = 'paid',
        paid_amount = accrued_amount,
        cleared_at = now(),
        last_paid_at = now()
    WHERE id = v_entry.id;
  END LOOP;
  
  IF v_entries_count = 0 THEN
    RAISE EXCEPTION 'No locked entries found for this payout';
  END IF;
  
  -- Credit user wallet
  UPDATE wallets 
  SET balance = balance + v_total_to_pay,
      total_earned = total_earned + v_total_to_pay,
      updated_at = now()
  WHERE user_id = v_payout_request.user_id;
  
  -- Create wallet transaction
  INSERT INTO wallet_transactions (user_id, amount, type, status, description, metadata)
  VALUES (
    v_payout_request.user_id,
    v_total_to_pay,
    'earning',
    'completed',
    'Payout completed - ' || v_entries_count || ' video(s)',
    jsonb_build_object('payout_request_id', p_payout_request_id, 'entries_count', v_entries_count)
  )
  RETURNING id INTO v_tx_id;
  
  -- Update payout request status
  UPDATE submission_payout_requests 
  SET status = 'completed',
      processed_at = now(),
      approved_by = p_approved_by
  WHERE id = p_payout_request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_paid', ROUND(v_total_to_pay, 2),
    'entries_completed', v_entries_count,
    'transaction_id', v_tx_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 7. Cleanup old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;