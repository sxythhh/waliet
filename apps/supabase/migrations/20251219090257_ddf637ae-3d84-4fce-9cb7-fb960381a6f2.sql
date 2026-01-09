-- Add Whop company columns to brands table
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS whop_company_id TEXT UNIQUE;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS whop_onboarding_complete BOOLEAN DEFAULT false;

-- Create brand_wallet_transactions table for audit trail
CREATE TABLE public.brand_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup', 'withdrawal', 'campaign_allocation', 'boost_allocation', 'refund')),
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  whop_payment_id TEXT,
  campaign_id UUID REFERENCES public.campaigns(id),
  boost_id UUID REFERENCES public.bounty_campaigns(id),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.brand_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_wallet_transactions
CREATE POLICY "Brand members can view their brand transactions"
ON public.brand_wallet_transactions
FOR SELECT
USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand admins can insert transactions"
ON public.brand_wallet_transactions
FOR INSERT
WITH CHECK (public.is_brand_admin(auth.uid(), brand_id));

-- Create index for faster lookups
CREATE INDEX idx_brand_wallet_transactions_brand_id ON public.brand_wallet_transactions(brand_id);
CREATE INDEX idx_brand_wallet_transactions_created_at ON public.brand_wallet_transactions(created_at DESC);