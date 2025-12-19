-- Add columns to store Whop payment method info for future charges
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS whop_member_id TEXT,
ADD COLUMN IF NOT EXISTS whop_payment_method_id TEXT;