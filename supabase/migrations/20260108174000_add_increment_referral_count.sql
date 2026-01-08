-- Add atomic increment function for referral counts
-- This prevents TOCTOU race conditions when multiple referrals happen simultaneously

CREATE OR REPLACE FUNCTION public.increment_referral_count(referrer_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET total_referrals = COALESCE(total_referrals, 0) + 1
  WHERE id = referrer_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_referral_count(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.increment_referral_count(UUID) IS
  'Atomically increments the total_referrals count for a user.
   Prevents race conditions that can occur with read-then-write patterns.';
