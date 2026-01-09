-- Add brand referral code to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS brand_referral_code TEXT UNIQUE;

-- Add comment
COMMENT ON COLUMN public.profiles.brand_referral_code IS 'Unique code for referring brands to the platform';

-- Create brand_referrals table
CREATE TABLE IF NOT EXISTS public.brand_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  reward_earned DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(brand_id)
);

-- Enable RLS
ALTER TABLE public.brand_referrals ENABLE ROW LEVEL SECURITY;

-- Policies for brand_referrals
CREATE POLICY "Users can view their own brand referrals"
ON public.brand_referrals FOR SELECT
TO authenticated
USING (referrer_id = auth.uid());

CREATE POLICY "Users can create brand referrals"
ON public.brand_referrals FOR INSERT
TO authenticated
WITH CHECK (referrer_id = auth.uid());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_brand_referrals_referrer_id ON public.brand_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_brand_referrals_referral_code ON public.brand_referrals(referral_code);
