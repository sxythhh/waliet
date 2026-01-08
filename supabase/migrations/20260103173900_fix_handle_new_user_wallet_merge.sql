-- Fix handle_new_user function - correct wallet record check using FOUND variable
-- The previous version used "IF v_old_wallet IS NOT NULL" which doesn't work with RECORD types
-- This version uses the FOUND variable which correctly detects if a row was returned

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_profile RECORD;
  v_old_wallet RECORD;
  v_generated_username TEXT;
  v_has_old_wallet BOOLEAN := FALSE;
BEGIN
  v_generated_username := 'user_' || SUBSTRING(NEW.id::text, 1, 8);

  SELECT * INTO v_old_profile
  FROM public.profiles
  WHERE LOWER(email) = LOWER(NEW.email) AND id != NEW.id
  LIMIT 1;

  IF v_old_profile.id IS NOT NULL THEN
    RAISE LOG 'handle_new_user: Found old profile % for email %, merging to new ID %',
      v_old_profile.id, NEW.email, NEW.id;

    -- Get old wallet data - use FOUND to check if it exists
    SELECT * INTO v_old_wallet FROM public.wallets WHERE user_id = v_old_profile.id;
    v_has_old_wallet := FOUND;

    RAISE LOG 'handle_new_user: Old wallet found: %, balance: %, earned: %',
      v_has_old_wallet,
      COALESCE(v_old_wallet.balance, 0),
      COALESCE(v_old_wallet.total_earned, 0);

    -- Clear unique constraints on OLD profile
    UPDATE public.profiles SET
      referral_code = NULL,
      discord_id = NULL,
      twitter_id = NULL,
      brand_referral_code = NULL,
      username = 'merging_' || v_old_profile.id::text
    WHERE id = v_old_profile.id;

    -- Create new profile FIRST
    INSERT INTO public.profiles (
      id, email, username, full_name, avatar_url, bio, total_earnings,
      trust_score, demographics_score, views_score, country, city, phone_number,
      account_type, referral_code, total_referrals, successful_referrals, referral_earnings,
      discord_id, discord_username, discord_discriminator, discord_avatar, discord_email, discord_connected_at,
      twitter_id, twitter_username, twitter_name, twitter_avatar, twitter_connected_at,
      referred_by, content_languages, content_styles, content_niches, hide_from_leaderboard,
      onboarding_completed, onboarding_step, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.email, v_old_profile.username, v_old_profile.full_name, v_old_profile.avatar_url,
      v_old_profile.bio, v_old_profile.total_earnings, v_old_profile.trust_score,
      v_old_profile.demographics_score, v_old_profile.views_score, v_old_profile.country,
      v_old_profile.city, v_old_profile.phone_number, v_old_profile.account_type,
      v_old_profile.referral_code,
      v_old_profile.total_referrals, v_old_profile.successful_referrals, v_old_profile.referral_earnings,
      v_old_profile.discord_id,
      v_old_profile.discord_username, v_old_profile.discord_discriminator, v_old_profile.discord_avatar,
      v_old_profile.discord_email, v_old_profile.discord_connected_at,
      v_old_profile.twitter_id,
      v_old_profile.twitter_username, v_old_profile.twitter_name, v_old_profile.twitter_avatar,
      v_old_profile.twitter_connected_at, v_old_profile.referred_by,
      v_old_profile.content_languages, v_old_profile.content_styles, v_old_profile.content_niches,
      v_old_profile.hide_from_leaderboard, TRUE, NULL,
      v_old_profile.created_at, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      bio = EXCLUDED.bio,
      total_earnings = EXCLUDED.total_earnings,
      referral_code = EXCLUDED.referral_code,
      discord_id = EXCLUDED.discord_id,
      discord_username = EXCLUDED.discord_username,
      twitter_id = EXCLUDED.twitter_id,
      twitter_username = EXCLUDED.twitter_username,
      onboarding_completed = TRUE,
      onboarding_step = NULL,
      updated_at = NOW();

    -- Handle wallet: delete old, create new with merged values
    DELETE FROM public.wallets WHERE user_id = v_old_profile.id;

    IF v_has_old_wallet THEN
      RAISE LOG 'handle_new_user: Creating wallet with old balance: %', v_old_wallet.balance;
      INSERT INTO public.wallets (user_id, balance, total_earned, total_withdrawn, payout_method, payout_details)
      VALUES (
        NEW.id,
        COALESCE(v_old_wallet.balance, 0),
        COALESCE(v_old_wallet.total_earned, 0),
        COALESCE(v_old_wallet.total_withdrawn, 0),
        v_old_wallet.payout_method,
        v_old_wallet.payout_details
      )
      ON CONFLICT (user_id) DO UPDATE SET
        balance = wallets.balance + EXCLUDED.balance,
        total_earned = wallets.total_earned + EXCLUDED.total_earned,
        total_withdrawn = wallets.total_withdrawn + EXCLUDED.total_withdrawn,
        payout_method = COALESCE(EXCLUDED.payout_method, wallets.payout_method),
        payout_details = COALESCE(EXCLUDED.payout_details, wallets.payout_details);
    ELSE
      INSERT INTO public.wallets (user_id, balance, total_earned, total_withdrawn)
      VALUES (NEW.id, 0, 0, 0)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;

    -- Delete old sessions (can't update due to unique constraint)
    DELETE FROM public.user_sessions WHERE user_id = v_old_profile.id;

    -- Update FK references
    UPDATE public.social_accounts SET user_id = NEW.id WHERE user_id = v_old_profile.id;
    UPDATE public.brand_members SET user_id = NEW.id WHERE user_id = v_old_profile.id;
    UPDATE public.wallet_transactions SET user_id = NEW.id WHERE user_id = v_old_profile.id;
    UPDATE public.campaign_submissions SET creator_id = NEW.id WHERE creator_id = v_old_profile.id;
    UPDATE public.bounty_applications SET user_id = NEW.id WHERE user_id = v_old_profile.id;
    UPDATE public.campaign_bookmarks SET user_id = NEW.id WHERE user_id = v_old_profile.id;
    UPDATE public.bounty_bookmarks SET user_id = NEW.id WHERE user_id = v_old_profile.id;
    UPDATE public.payout_requests SET user_id = NEW.id WHERE user_id = v_old_profile.id;
    UPDATE public.support_tickets SET user_id = NEW.id WHERE user_id = v_old_profile.id;
    UPDATE public.pitches SET creator_id = NEW.id WHERE creator_id = v_old_profile.id;
    UPDATE public.referrals SET referrer_id = NEW.id WHERE referrer_id = v_old_profile.id;
    UPDATE public.referrals SET referred_id = NEW.id WHERE referred_id = v_old_profile.id;
    UPDATE public.user_roles SET user_id = NEW.id WHERE user_id = v_old_profile.id;
    UPDATE public.discord_tokens SET user_id = NEW.id WHERE user_id = v_old_profile.id;

    -- Delete old profile
    DELETE FROM public.profiles WHERE id = v_old_profile.id;

    RAISE LOG 'handle_new_user: Successfully merged old profile % to new ID %', v_old_profile.id, NEW.id;
  ELSE
    INSERT INTO public.profiles (id, email, username, onboarding_completed, created_at, updated_at)
    VALUES (NEW.id, NEW.email, v_generated_username, TRUE, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.wallets (user_id, balance, total_earned, total_withdrawn)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
  BEGIN
    INSERT INTO public.profiles (id, email, username, onboarding_completed, created_at, updated_at)
    VALUES (NEW.id, NEW.email, v_generated_username, TRUE, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.wallets (user_id, balance, total_earned, total_withdrawn)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$function$;
