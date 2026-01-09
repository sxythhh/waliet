-- Add referral_clicks column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_clicks INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_clicks ON public.profiles(referral_clicks);

-- Function to increment referral clicks
CREATE OR REPLACE FUNCTION public.increment_referral_clicks(referral_code_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
BEGIN
  -- Find the referrer by referral code (case-insensitive)
  SELECT id INTO referrer_id
  FROM profiles
  WHERE LOWER(referral_code) = LOWER(referral_code_input);

  IF referrer_id IS NOT NULL THEN
    UPDATE profiles
    SET referral_clicks = COALESCE(referral_clicks, 0) + 1
    WHERE id = referrer_id;
  END IF;
END;
$$;
