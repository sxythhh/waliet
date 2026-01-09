-- Add vat_number column to profiles table for billing purposes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vat_number text;

-- Add platform_income_transactions table to track platform income from inbounds and transfer fees
CREATE TABLE IF NOT EXISTS public.platform_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('inbound', 'transfer_fee')),
  amount numeric NOT NULL,
  source_brand_id uuid REFERENCES public.brands(id),
  source_user_id uuid,
  source_transaction_id text,
  description text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_income ENABLE ROW LEVEL SECURITY;

-- Only admins can view platform income
CREATE POLICY "Admins can view platform income" 
ON public.platform_income 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Only system (service role) can insert platform income - no user insert policy needed
-- Service role bypasses RLS

-- Create index for efficient querying by date
CREATE INDEX idx_platform_income_created_at ON public.platform_income(created_at DESC);
CREATE INDEX idx_platform_income_type ON public.platform_income(type);