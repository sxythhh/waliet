-- Crypto Deposit System Migration
-- Enables autonomous crypto deposits with unique addresses per brand/user

-- ============================================
-- System Counters for HD Wallet Derivation
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_counters (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Initialize derivation counters for each chain type
INSERT INTO public.system_counters (key, value) VALUES
  ('solana_derivation_index', 0),
  ('evm_derivation_index', 0)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Crypto Deposit Addresses
-- ============================================
-- Stores unique deposit addresses per brand/user for each network
CREATE TABLE public.crypto_deposit_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner: either a brand or a user (one must be set)
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Address details
  blockchain_network TEXT NOT NULL, -- 'solana', 'ethereum', 'base', 'polygon', 'arbitrum', 'optimism'
  deposit_address TEXT NOT NULL,
  derivation_index INTEGER NOT NULL, -- For HD wallet derivation

  -- Tracking
  total_deposited DECIMAL(20,6) DEFAULT 0,
  deposit_count INTEGER DEFAULT 0,
  last_deposit_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  label TEXT, -- Optional label like "Primary Deposit"

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_deposit_address UNIQUE(blockchain_network, deposit_address),
  CONSTRAINT owner_must_be_set CHECK (
    (brand_id IS NOT NULL AND user_id IS NULL) OR
    (brand_id IS NULL AND user_id IS NOT NULL)
  ),
  CONSTRAINT valid_network CHECK (
    blockchain_network IN ('solana', 'ethereum', 'base', 'polygon', 'arbitrum', 'optimism')
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_crypto_deposit_addresses_brand ON public.crypto_deposit_addresses(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX idx_crypto_deposit_addresses_user ON public.crypto_deposit_addresses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_crypto_deposit_addresses_address ON public.crypto_deposit_addresses(deposit_address);
CREATE INDEX idx_crypto_deposit_addresses_network ON public.crypto_deposit_addresses(blockchain_network);
CREATE INDEX idx_crypto_deposit_addresses_active ON public.crypto_deposit_addresses(is_active) WHERE is_active = true;

-- ============================================
-- Crypto Deposits (Transaction Records)
-- ============================================
-- Track all incoming crypto deposits
CREATE TABLE public.crypto_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to deposit address
  deposit_address_id UUID REFERENCES public.crypto_deposit_addresses(id),

  -- Owner reference (denormalized for query performance)
  brand_id UUID REFERENCES public.brands(id),
  user_id UUID REFERENCES public.profiles(id),

  -- Transaction details
  blockchain_network TEXT NOT NULL,
  tx_signature TEXT NOT NULL, -- Unique transaction hash/signature
  from_address TEXT, -- Sender address (if known)
  to_address TEXT NOT NULL, -- Our deposit address

  -- Amount details
  token_mint TEXT NOT NULL, -- Token contract/mint address (USDC)
  token_symbol TEXT DEFAULT 'USDC',
  raw_amount BIGINT NOT NULL, -- Amount in smallest unit (e.g., 6 decimals for USDC)
  decimal_amount DECIMAL(20,6) NOT NULL, -- Human-readable amount
  usd_value DECIMAL(20,2), -- USD equivalent at time of deposit (for non-USDC)

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'credited', 'failed', 'invalid')),
  confirmations INTEGER DEFAULT 0,
  required_confirmations INTEGER DEFAULT 1, -- Network-specific
  block_number BIGINT,
  block_time TIMESTAMPTZ,

  -- Processing timestamps
  detected_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ,

  -- Source tracking
  source TEXT DEFAULT 'webhook' CHECK (source IN ('webhook', 'manual', 'coinbase_onramp', 'polling')),
  coinbase_charge_id TEXT, -- If from Coinbase Onramp

  -- Webhook data
  webhook_payload JSONB,
  webhook_id TEXT, -- Helius/Alchemy webhook delivery ID

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Audit
  credited_by UUID REFERENCES public.profiles(id), -- Admin who manually credited (if manual)
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure unique transactions
  CONSTRAINT unique_tx_per_network UNIQUE(blockchain_network, tx_signature)
);

-- Indexes for efficient queries
CREATE INDEX idx_crypto_deposits_tx ON public.crypto_deposits(tx_signature);
CREATE INDEX idx_crypto_deposits_brand ON public.crypto_deposits(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX idx_crypto_deposits_user ON public.crypto_deposits(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_crypto_deposits_status ON public.crypto_deposits(status);
CREATE INDEX idx_crypto_deposits_address ON public.crypto_deposits(to_address);
CREATE INDEX idx_crypto_deposits_address_id ON public.crypto_deposits(deposit_address_id);
CREATE INDEX idx_crypto_deposits_created ON public.crypto_deposits(created_at DESC);
CREATE INDEX idx_crypto_deposits_pending ON public.crypto_deposits(status) WHERE status = 'pending';

-- ============================================
-- Update brand_wallet_transactions for crypto
-- ============================================
-- Add crypto deposit type to allowed types
ALTER TABLE public.brand_wallet_transactions
DROP CONSTRAINT IF EXISTS brand_wallet_transactions_type_check;

ALTER TABLE public.brand_wallet_transactions
ADD CONSTRAINT brand_wallet_transactions_type_check
CHECK (type = ANY (ARRAY[
  'topup', 'withdrawal', 'campaign_allocation', 'boost_allocation',
  'refund', 'admin_credit', 'admin_debit', 'transfer_to_withdraw',
  'deposit', 'deposit_intent', 'transfer_in', 'transfer_out',
  'crypto_deposit', 'coinbase_onramp'
]::text[]));

-- Add crypto deposit reference column
ALTER TABLE public.brand_wallet_transactions
ADD COLUMN IF NOT EXISTS crypto_deposit_id UUID REFERENCES public.crypto_deposits(id);

-- Add source type column
ALTER TABLE public.brand_wallet_transactions
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('card', 'wire', 'crypto', 'coinbase_onramp', 'admin'));

-- ============================================
-- RPC Functions for Atomic Operations
-- ============================================

-- Function to atomically get and increment derivation index
CREATE OR REPLACE FUNCTION public.get_next_derivation_index(p_chain_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key TEXT;
  v_index INTEGER;
BEGIN
  -- Determine counter key based on chain type
  IF p_chain_type = 'solana' THEN
    v_key := 'solana_derivation_index';
  ELSE
    v_key := 'evm_derivation_index';
  END IF;

  -- Atomically increment and return the previous value
  UPDATE public.system_counters
  SET value = value + 1, updated_at = now()
  WHERE key = v_key
  RETURNING value - 1 INTO v_index;

  -- If no row existed, create it
  IF v_index IS NULL THEN
    INSERT INTO public.system_counters (key, value)
    VALUES (v_key, 1)
    ON CONFLICT (key) DO UPDATE SET value = system_counters.value + 1
    RETURNING value - 1 INTO v_index;
  END IF;

  RETURN v_index;
END;
$$;

-- Function to credit a crypto deposit atomically
CREATE OR REPLACE FUNCTION public.atomic_credit_crypto_deposit(
  p_deposit_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deposit RECORD;
  v_new_balance DECIMAL(20,6);
BEGIN
  -- Lock and fetch the deposit
  SELECT * INTO v_deposit
  FROM public.crypto_deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  -- Validate deposit exists
  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  -- Check idempotency - already credited
  IF v_deposit.status = 'credited' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_credited', true,
      'deposit_id', p_deposit_id
    );
  END IF;

  -- Check status allows crediting
  IF v_deposit.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Deposit status % does not allow crediting', v_deposit.status;
  END IF;

  -- Credit based on owner type
  IF v_deposit.brand_id IS NOT NULL THEN
    -- Credit brand wallet
    UPDATE public.brand_wallets
    SET
      balance = balance + v_deposit.decimal_amount,
      total_deposited = total_deposited + v_deposit.decimal_amount,
      updated_at = now()
    WHERE brand_id = v_deposit.brand_id
    RETURNING balance INTO v_new_balance;

    -- Create transaction record
    INSERT INTO public.brand_wallet_transactions (
      brand_id,
      type,
      amount,
      status,
      crypto_deposit_id,
      source_type,
      description,
      metadata
    ) VALUES (
      v_deposit.brand_id,
      'crypto_deposit',
      v_deposit.decimal_amount,
      'completed',
      p_deposit_id,
      'crypto',
      format('USDC deposit via %s', v_deposit.blockchain_network),
      jsonb_build_object(
        'tx_signature', v_deposit.tx_signature,
        'network', v_deposit.blockchain_network,
        'from_address', v_deposit.from_address,
        'token_amount', v_deposit.decimal_amount
      )
    );

  ELSIF v_deposit.user_id IS NOT NULL THEN
    -- Credit user wallet
    UPDATE public.wallets
    SET
      balance = balance + v_deposit.decimal_amount,
      total_earned = total_earned + v_deposit.decimal_amount,
      updated_at = now()
    WHERE user_id = v_deposit.user_id
    RETURNING balance INTO v_new_balance;

    -- Create transaction record
    INSERT INTO public.wallet_transactions (
      user_id,
      amount,
      type,
      status,
      description,
      metadata
    ) VALUES (
      v_deposit.user_id,
      v_deposit.decimal_amount,
      'earning',
      'completed',
      format('USDC deposit via %s', v_deposit.blockchain_network),
      jsonb_build_object(
        'source', 'crypto_deposit',
        'tx_signature', v_deposit.tx_signature,
        'network', v_deposit.blockchain_network,
        'from_address', v_deposit.from_address,
        'crypto_deposit_id', p_deposit_id
      )
    );
  ELSE
    RAISE EXCEPTION 'Deposit has no owner (brand_id or user_id)';
  END IF;

  -- Update deposit status
  UPDATE public.crypto_deposits
  SET
    status = 'credited',
    credited_at = now(),
    updated_at = now()
  WHERE id = p_deposit_id;

  -- Update deposit address stats
  UPDATE public.crypto_deposit_addresses
  SET
    total_deposited = total_deposited + v_deposit.decimal_amount,
    deposit_count = deposit_count + 1,
    last_deposit_at = now(),
    updated_at = now()
  WHERE id = v_deposit.deposit_address_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_credited', false,
    'deposit_id', p_deposit_id,
    'amount', v_deposit.decimal_amount,
    'new_balance', v_new_balance,
    'owner_type', CASE WHEN v_deposit.brand_id IS NOT NULL THEN 'brand' ELSE 'user' END
  );
END;
$$;

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.crypto_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_deposits ENABLE ROW LEVEL SECURITY;

-- Crypto Deposit Addresses Policies
CREATE POLICY "Brand members can view their brand deposit addresses"
  ON public.crypto_deposit_addresses
  FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own deposit addresses"
  ON public.crypto_deposit_addresses
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all deposit addresses"
  ON public.crypto_deposit_addresses
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Service role can manage deposit addresses"
  ON public.crypto_deposit_addresses
  FOR ALL
  USING (auth.role() = 'service_role');

-- Crypto Deposits Policies
CREATE POLICY "Brand members can view their brand deposits"
  ON public.crypto_deposits
  FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own deposits"
  ON public.crypto_deposits
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all deposits"
  ON public.crypto_deposits
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Service role can manage deposits"
  ON public.crypto_deposits
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crypto_deposit_addresses_updated_at
  BEFORE UPDATE ON public.crypto_deposit_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crypto_deposits_updated_at
  BEFORE UPDATE ON public.crypto_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Comments for Documentation
-- ============================================
COMMENT ON TABLE public.crypto_deposit_addresses IS 'Stores unique HD-derived deposit addresses per brand/user for each blockchain network';
COMMENT ON TABLE public.crypto_deposits IS 'Records all incoming crypto deposits with full transaction details and status tracking';
COMMENT ON TABLE public.system_counters IS 'Atomic counters for HD wallet derivation indexes';

COMMENT ON COLUMN public.crypto_deposit_addresses.derivation_index IS 'BIP-44 derivation path index used to generate this address from treasury seed';
COMMENT ON COLUMN public.crypto_deposits.raw_amount IS 'Amount in smallest token unit (e.g., USDC has 6 decimals, so 1 USDC = 1000000)';
COMMENT ON COLUMN public.crypto_deposits.decimal_amount IS 'Human-readable amount with proper decimal places';
