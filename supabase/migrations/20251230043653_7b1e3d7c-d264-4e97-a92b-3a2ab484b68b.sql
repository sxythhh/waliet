-- Add Slash virtual account columns to brands table
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS slash_virtual_account_id TEXT,
ADD COLUMN IF NOT EXISTS slash_account_number TEXT,
ADD COLUMN IF NOT EXISTS slash_routing_number TEXT,
ADD COLUMN IF NOT EXISTS slash_crypto_addresses JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS slash_webhook_id TEXT,
ADD COLUMN IF NOT EXISTS slash_balance_cents INTEGER DEFAULT 0;

-- Create brand_wallets table for tracking brand-specific balances
CREATE TABLE IF NOT EXISTS public.brand_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_deposited NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id)
);

-- Enable RLS
ALTER TABLE public.brand_wallets ENABLE ROW LEVEL SECURITY;

-- Policies for brand_wallets
CREATE POLICY "Brand members can view their brand wallet"
ON public.brand_wallets
FOR SELECT
USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand admins can update their brand wallet"
ON public.brand_wallets
FOR UPDATE
USING (public.is_brand_admin(auth.uid(), brand_id));

-- Create trigger for updated_at
CREATE TRIGGER update_brand_wallets_updated_at
BEFORE UPDATE ON public.brand_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_slash_virtual_account_id ON public.brands(slash_virtual_account_id);
CREATE INDEX IF NOT EXISTS idx_brand_wallets_brand_id ON public.brand_wallets(brand_id);