-- Fix search_path for immutable functions
CREATE OR REPLACE FUNCTION public.get_referral_tier(referral_count integer)
RETURNS referral_tier
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF referral_count >= 51 THEN
    RETURN 'elite';
  ELSIF referral_count >= 21 THEN
    RETURN 'pro';
  ELSIF referral_count >= 11 THEN
    RETURN 'amateur';
  ELSE
    RETURN 'beginner';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tier_commission_rate(tier referral_tier)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  CASE tier
    WHEN 'elite' THEN RETURN 0.05;
    WHEN 'pro' THEN RETURN 0.04;
    WHEN 'amateur' THEN RETURN 0.03;
    ELSE RETURN 0.02;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tier_upgrade_bonus(old_tier referral_tier, new_tier referral_tier)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF old_tier = new_tier THEN
    RETURN 0;
  END IF;
  
  CASE new_tier
    WHEN 'amateur' THEN RETURN 20;
    WHEN 'pro' THEN RETURN 30;
    WHEN 'elite' THEN RETURN 50;
    ELSE RETURN 0;
  END CASE;
END;
$$;