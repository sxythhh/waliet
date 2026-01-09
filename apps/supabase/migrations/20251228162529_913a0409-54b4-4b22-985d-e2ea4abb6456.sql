-- Expand allowed wallet transaction types to support P2P transfers
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
ADD CONSTRAINT wallet_transactions_type_check
CHECK (
  type = ANY (
    ARRAY[
      'earning'::text,
      'withdrawal'::text,
      'referral'::text,
      'balance_correction'::text,
      'transfer_sent'::text,
      'transfer_received'::text
    ]
  )
);

-- Optional: index for quickly filtering transfer transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type_created_at
ON public.wallet_transactions (type, created_at DESC);