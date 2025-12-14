-- Create enum for referral tiers
CREATE TYPE public.referral_tier AS ENUM ('beginner', 'amateur', 'pro', 'elite');

-- Add tier tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_tier referral_tier DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS tier_bonus_claimed_at jsonb DEFAULT '{}'::jsonb;

-- Function to get tier based on successful referral count
CREATE OR REPLACE FUNCTION public.get_referral_tier(referral_count integer)
RETURNS referral_tier
LANGUAGE plpgsql
IMMUTABLE
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

-- Function to get commission rate based on tier
CREATE OR REPLACE FUNCTION public.get_tier_commission_rate(tier referral_tier)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
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

-- Function to get tier upgrade bonus amount
CREATE OR REPLACE FUNCTION public.get_tier_upgrade_bonus(old_tier referral_tier, new_tier referral_tier)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Only award bonus for tier upgrades
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

-- Trigger to complete referral when user completes onboarding
CREATE OR REPLACE FUNCTION public.complete_referral_on_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_record RECORD;
  new_tier referral_tier;
  old_tier referral_tier;
  tier_bonus numeric;
  new_referral_count integer;
BEGIN
  -- Only proceed if onboarding just completed
  IF NEW.onboarding_completed = true AND (OLD.onboarding_completed IS NULL OR OLD.onboarding_completed = false) THEN
    -- Find the referral record for this user
    SELECT r.*, p.referral_tier, p.successful_referrals, p.tier_bonus_claimed_at
    INTO referrer_record
    FROM public.referrals r
    INNER JOIN public.profiles p ON p.id = r.referrer_id
    WHERE r.referred_id = NEW.id
      AND r.status = 'pending'
    LIMIT 1;
    
    IF referrer_record.id IS NOT NULL THEN
      -- Mark referral as completed
      UPDATE public.referrals
      SET status = 'completed', completed_at = now()
      WHERE id = referrer_record.id;
      
      -- Calculate new referral count
      new_referral_count := COALESCE(referrer_record.successful_referrals, 0) + 1;
      
      -- Determine new tier
      new_tier := get_referral_tier(new_referral_count);
      old_tier := COALESCE(referrer_record.referral_tier, 'beginner');
      
      -- Update referrer's profile
      UPDATE public.profiles
      SET successful_referrals = new_referral_count,
          referral_tier = new_tier
      WHERE id = referrer_record.referrer_id;
      
      -- Check for tier upgrade bonus
      IF new_tier != old_tier THEN
        tier_bonus := get_tier_upgrade_bonus(old_tier, new_tier);
        
        IF tier_bonus > 0 THEN
          -- Credit tier bonus to wallet
          UPDATE public.wallets
          SET balance = COALESCE(balance, 0) + tier_bonus,
              total_earned = COALESCE(total_earned, 0) + tier_bonus
          WHERE user_id = referrer_record.referrer_id;
          
          -- Create transaction record for tier bonus
          INSERT INTO public.wallet_transactions (user_id, amount, type, description, metadata)
          VALUES (
            referrer_record.referrer_id,
            tier_bonus,
            'referral',
            'Tier upgrade bonus: ' || old_tier::text || ' → ' || new_tier::text,
            jsonb_build_object(
              'referral_id', referrer_record.id,
              'old_tier', old_tier,
              'new_tier', new_tier,
              'bonus_type', 'tier_upgrade'
            )
          );
          
          -- Update referrer earnings
          UPDATE public.profiles
          SET referral_earnings = COALESCE(referral_earnings, 0) + tier_bonus,
              tier_bonus_claimed_at = COALESCE(tier_bonus_claimed_at, '{}'::jsonb) || 
                jsonb_build_object(new_tier::text, now())
          WHERE id = referrer_record.referrer_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for onboarding completion
DROP TRIGGER IF EXISTS trigger_complete_referral_on_onboarding ON public.profiles;
CREATE TRIGGER trigger_complete_referral_on_onboarding
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.complete_referral_on_onboarding();

-- Updated function to pay referral commissions when referred user earns
CREATE OR REPLACE FUNCTION public.pay_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_record RECORD;
  commission_rate numeric;
  commission_amount numeric;
BEGIN
  -- Only process for earnings (campaign/boost payouts)
  IF NEW.type NOT IN ('campaign', 'boost') OR NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Find completed referral for this user
  SELECT r.referrer_id, p.referral_tier
  INTO referrer_record
  FROM public.referrals r
  INNER JOIN public.profiles p ON p.id = r.referrer_id
  WHERE r.referred_id = NEW.user_id
    AND r.status = 'completed'
  LIMIT 1;
  
  IF referrer_record.referrer_id IS NOT NULL THEN
    -- Get commission rate based on referrer's tier
    commission_rate := get_tier_commission_rate(COALESCE(referrer_record.referral_tier, 'beginner'));
    commission_amount := ROUND(NEW.amount * commission_rate, 2);
    
    IF commission_amount > 0 THEN
      -- Credit commission to referrer's wallet
      UPDATE public.wallets
      SET balance = COALESCE(balance, 0) + commission_amount,
          total_earned = COALESCE(total_earned, 0) + commission_amount
      WHERE user_id = referrer_record.referrer_id;
      
      -- Create transaction record for commission
      INSERT INTO public.wallet_transactions (user_id, amount, type, description, metadata)
      VALUES (
        referrer_record.referrer_id,
        commission_amount,
        'referral',
        'Referral commission (' || (commission_rate * 100)::text || '%)',
        jsonb_build_object(
          'referred_user_id', NEW.user_id,
          'source_transaction_id', NEW.id,
          'commission_rate', commission_rate,
          'source_amount', NEW.amount
        )
      );
      
      -- Update referrer earnings and referral record
      UPDATE public.profiles
      SET referral_earnings = COALESCE(referral_earnings, 0) + commission_amount
      WHERE id = referrer_record.referrer_id;
      
      UPDATE public.referrals
      SET reward_earned = COALESCE(reward_earned, 0) + commission_amount
      WHERE referrer_id = referrer_record.referrer_id
        AND referred_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for commission payments
DROP TRIGGER IF EXISTS trigger_pay_referral_commission ON public.wallet_transactions;
CREATE TRIGGER trigger_pay_referral_commission
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.pay_referral_commission();

-- Drop old milestone-based triggers that conflict
DROP TRIGGER IF EXISTS trigger_award_signup_milestone ON public.referrals;
DROP TRIGGER IF EXISTS trigger_check_earnings_milestones ON public.wallets;