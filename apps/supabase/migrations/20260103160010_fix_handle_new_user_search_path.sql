-- Fix handle_new_user function with proper search_path and fully qualified table names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_profile_id UUID;
BEGIN
  SELECT id INTO v_old_profile_id
  FROM public.profiles
  WHERE email = NEW.email AND id != NEW.id
  LIMIT 1;

  IF v_old_profile_id IS NOT NULL THEN
    -- Core tables - use fully qualified names
    UPDATE public.wallets SET user_id = NEW.id WHERE user_id = v_old_profile_id;
    UPDATE public.social_accounts SET user_id = NEW.id WHERE user_id = v_old_profile_id;
    UPDATE public.brand_members SET user_id = NEW.id WHERE user_id = v_old_profile_id;
    UPDATE public.wallet_transactions SET user_id = NEW.id WHERE user_id = v_old_profile_id;
    UPDATE public.campaign_submissions SET creator_id = NEW.id WHERE creator_id = v_old_profile_id;

    -- Applications & bookmarks
    UPDATE public.bounty_applications SET user_id = NEW.id WHERE user_id = v_old_profile_id;
    UPDATE public.campaign_bookmarks SET user_id = NEW.id WHERE user_id = v_old_profile_id;
    UPDATE public.bounty_bookmarks SET user_id = NEW.id WHERE user_id = v_old_profile_id;

    -- Payouts & support
    UPDATE public.payout_requests SET user_id = NEW.id WHERE user_id = v_old_profile_id;
    UPDATE public.support_tickets SET user_id = NEW.id WHERE user_id = v_old_profile_id;
    UPDATE public.pitches SET creator_id = NEW.id WHERE creator_id = v_old_profile_id;

    -- Referrals
    UPDATE public.referrals SET referrer_id = NEW.id WHERE referrer_id = v_old_profile_id;
    UPDATE public.referrals SET referred_id = NEW.id WHERE referred_id = v_old_profile_id;

    -- Sessions & roles
    UPDATE public.user_sessions SET user_id = NEW.id WHERE user_id = v_old_profile_id;
    UPDATE public.user_roles SET user_id = NEW.id WHERE user_id = v_old_profile_id;

    -- Update the old profile to new ID
    UPDATE public.profiles SET id = NEW.id WHERE id = v_old_profile_id;

    -- Create wallet if it doesn't exist after profile reconnection
    INSERT INTO public.wallets (user_id, balance, total_earned, total_withdrawn)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Create new profile
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Create wallet for new user
    INSERT INTO public.wallets (user_id, balance, total_earned, total_withdrawn)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile handling failed: %', SQLERRM;
  BEGIN
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Still try to create wallet even in exception handler
    INSERT INTO public.wallets (user_id, balance, total_earned, total_withdrawn)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$function$;
