-- Fix SECURITY DEFINER functions with unsafe search_path
-- Update all functions to use SET search_path = '' and schema-qualify references

-- Fix is_brand_admin
CREATE OR REPLACE FUNCTION public.is_brand_admin(_user_id uuid, _brand_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.brand_members
    WHERE user_id = _user_id
      AND brand_id = _brand_id
      AND role IN ('owner', 'admin')
  )
$function$;

-- Fix is_brand_member
CREATE OR REPLACE FUNCTION public.is_brand_member(_user_id uuid, _brand_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.brand_members
    WHERE user_id = _user_id
      AND brand_id = _brand_id
  )
$function$;

-- Fix is_member_of_active_brand
CREATE OR REPLACE FUNCTION public.is_member_of_active_brand(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.brand_members bm
    INNER JOIN public.brands b ON b.id = bm.brand_id
    WHERE bm.user_id = _user_id
      AND b.subscription_status = 'active'
  )
$function$;

-- Fix brand_has_no_members
CREATE OR REPLACE FUNCTION public.brand_has_no_members(_brand_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.brand_members
    WHERE brand_id = _brand_id
  )
$function$;

-- Fix can_view_payout_item
CREATE OR REPLACE FUNCTION public.can_view_payout_item(_item_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.submission_payout_items spi
    JOIN public.video_submissions vs ON vs.id = spi.submission_id
    JOIN public.brand_members bm ON bm.brand_id = vs.brand_id
    WHERE spi.id = _item_id
    AND bm.user_id = auth.uid()
  )
$function$;

-- Fix update_conversation_last_message
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

-- Fix can_view_profile
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.brand_members bm1
    INNER JOIN public.brand_members bm2 ON bm1.brand_id = bm2.brand_id
    WHERE bm1.user_id = _viewer_id
      AND bm2.user_id = _profile_id
  )
$function$;

-- Fix get_user_email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT email FROM auth.users WHERE id = _user_id;
$function$;

-- Fix get_current_user_email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT email FROM auth.users WHERE id = auth.uid();
$function$;

-- Fix update_referral_stats
CREATE OR REPLACE FUNCTION public.update_referral_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.profiles
    SET 
      successful_referrals = successful_referrals + 1,
      referral_earnings = referral_earnings + COALESCE(NEW.reward_earned, 0)
    WHERE id = NEW.referrer_id;
    
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix owns_payout_request
CREATE OR REPLACE FUNCTION public.owns_payout_request(_request_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.submission_payout_requests
    WHERE id = _request_id
    AND user_id = auth.uid()
  )
$function$;

-- Fix delete_demographics_video
CREATE OR REPLACE FUNCTION public.delete_demographics_video()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  file_path text;
BEGIN
  IF (NEW.status IN ('approved', 'rejected')) AND (OLD.status = 'pending') AND (NEW.screenshot_url IS NOT NULL) THEN
    file_path := substring(NEW.screenshot_url from 'verification-screenshots/(.+)$');
    
    IF file_path IS NOT NULL THEN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'verification-screenshots' 
      AND name = file_path;
      
      NEW.screenshot_url := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_bounty_accepted_count
CREATE OR REPLACE FUNCTION public.update_bounty_accepted_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE public.bounty_campaigns
    SET accepted_creators_count = accepted_creators_count + 1
    WHERE id = NEW.bounty_campaign_id;
  END IF;
  
  IF NEW.status != 'accepted' AND OLD.status = 'accepted' THEN
    UPDATE public.bounty_campaigns
    SET accepted_creators_count = GREATEST(0, accepted_creators_count - 1)
    WHERE id = NEW.bounty_campaign_id;
  END IF;
  
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    NEW.reviewed_at = now();
    NEW.reviewed_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix auto_end_campaign_on_budget_exhausted
CREATE OR REPLACE FUNCTION public.auto_end_campaign_on_budget_exhausted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.budget_used >= NEW.budget 
     AND NEW.budget > 0 
     AND (NEW.is_infinite_budget IS NULL OR NEW.is_infinite_budget = false)
     AND NEW.status = 'active' THEN
    NEW.status := 'ended';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix award_signup_milestone
CREATE OR REPLACE FUNCTION public.award_signup_milestone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  signup_milestone_id uuid;
  signup_reward numeric;
BEGIN
  SELECT id, reward_amount INTO signup_milestone_id, signup_reward
  FROM public.referral_milestones
  WHERE milestone_type = 'signup'
  LIMIT 1;
  
  IF signup_milestone_id IS NOT NULL THEN
    INSERT INTO public.referral_milestone_rewards (referral_id, milestone_id, reward_amount)
    VALUES (NEW.id, signup_milestone_id, signup_reward)
    ON CONFLICT (referral_id, milestone_id) DO NOTHING;
    
    UPDATE public.referrals
    SET reward_earned = COALESCE(reward_earned, 0) + signup_reward
    WHERE id = NEW.id;
    
    UPDATE public.profiles
    SET referral_earnings = COALESCE(referral_earnings, 0) + signup_reward
    WHERE id = NEW.referrer_id;
    
    UPDATE public.wallets
    SET 
      balance = COALESCE(balance, 0) + signup_reward,
      total_earned = COALESCE(total_earned, 0) + signup_reward
    WHERE user_id = NEW.referrer_id;
    
    INSERT INTO public.wallet_transactions (user_id, amount, type, description, metadata)
    VALUES (
      NEW.referrer_id,
      signup_reward,
      'referral',
      'Referral signup bonus',
      jsonb_build_object('referral_id', NEW.id, 'milestone_type', 'signup')
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix cleanup_demographic_videos
CREATE OR REPLACE FUNCTION public.cleanup_demographic_videos()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  submission_record RECORD;
  file_path text;
BEGIN
  FOR submission_record IN 
    SELECT id, screenshot_url, status
    FROM public.demographic_submissions
    WHERE status IN ('approved', 'rejected')
    AND screenshot_url IS NOT NULL
  LOOP
    file_path := substring(submission_record.screenshot_url from 'verification-screenshots/(.+)$');
    
    IF file_path IS NOT NULL THEN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'verification-screenshots' 
      AND name = file_path;
      
      UPDATE public.demographic_submissions
      SET screenshot_url = NULL
      WHERE id = submission_record.id;
      
      RAISE NOTICE 'Deleted video for submission %', submission_record.id;
    END IF;
  END LOOP;
END;
$function$;

-- Fix delete_demographics_video_on_delete
CREATE OR REPLACE FUNCTION public.delete_demographics_video_on_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  file_path text;
BEGIN
  IF OLD.screenshot_url IS NOT NULL THEN
    file_path := substring(OLD.screenshot_url from 'verification-screenshots/(.+)$');
    
    IF file_path IS NOT NULL THEN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'verification-screenshots' 
      AND name = file_path;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Fix encrypt_payout_details
CREATE OR REPLACE FUNCTION public.encrypt_payout_details(details jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  encryption_key text;
BEGIN
  SELECT key_value INTO encryption_key
  FROM public.encryption_keys
  WHERE key_name = 'payout_details_key';
  
  RETURN encode(
    pgp_sym_encrypt(
      details::text,
      encryption_key
    ),
    'base64'
  );
END;
$function$;

-- Fix decrypt_payout_details
CREATE OR REPLACE FUNCTION public.decrypt_payout_details(encrypted_details text, wallet_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  encryption_key text;
  is_authorized boolean;
BEGIN
  is_authorized := (
    auth.uid() = wallet_user_id OR 
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );
  
  IF NOT is_authorized THEN
    RAISE EXCEPTION 'Unauthorized access to payout details';
  END IF;
  
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    new_data
  ) VALUES (
    auth.uid(),
    'DECRYPT_PAYOUT_DETAILS',
    'wallets',
    wallet_user_id,
    jsonb_build_object('accessed_at', now())
  );
  
  SELECT key_value INTO encryption_key
  FROM public.encryption_keys
  WHERE key_name = 'payout_details_key';
  
  RETURN pgp_sym_decrypt(
    decode(encrypted_details, 'base64'),
    encryption_key
  )::jsonb;
END;
$function$;

-- Fix audit_user_role_changes
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      record_id,
      new_data
    ) VALUES (
      auth.uid(),
      'GRANT_ROLE',
      'user_roles',
      NEW.id,
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'role_granted', NEW.role,
        'granted_by', auth.uid(),
        'timestamp', now()
      )
    );
    
    IF NEW.role = 'admin' THEN
      RAISE NOTICE 'SECURITY ALERT: Admin role granted to user % by %', NEW.user_id, auth.uid();
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      'MODIFY_ROLE',
      'user_roles',
      NEW.id,
      jsonb_build_object('old_role', OLD.role),
      jsonb_build_object('new_role', NEW.role, 'modified_by', auth.uid())
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data
    ) VALUES (
      auth.uid(),
      'REVOKE_ROLE',
      'user_roles',
      OLD.id,
      jsonb_build_object(
        'target_user_id', OLD.user_id,
        'role_revoked', OLD.role,
        'revoked_by', auth.uid(),
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix create_relationship_from_campaign_submission
CREATE OR REPLACE FUNCTION public.create_relationship_from_campaign_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_brand_id UUID;
BEGIN
  SELECT brand_id INTO v_brand_id
  FROM public.campaigns
  WHERE id = NEW.campaign_id;
  
  IF v_brand_id IS NOT NULL THEN
    INSERT INTO public.brand_creator_relationships (
      brand_id,
      user_id,
      source_type,
      source_id,
      first_interaction_at
    )
    VALUES (
      v_brand_id,
      NEW.creator_id,
      'campaign_application',
      NEW.campaign_id,
      COALESCE(NEW.submitted_at, now())
    )
    ON CONFLICT (brand_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix get_level_from_xp
CREATE OR REPLACE FUNCTION public.get_level_from_xp(xp integer)
 RETURNS TABLE(level integer, rank text, xp_for_next_level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    lt.level,
    lt.rank,
    COALESCE(
      (SELECT xp_required FROM public.level_thresholds WHERE level_thresholds.level = lt.level + 1),
      lt.xp_required + 500000
    ) AS xp_for_next_level
  FROM public.level_thresholds lt
  WHERE lt.xp_required <= xp
  ORDER BY lt.level DESC
  LIMIT 1;
END;
$function$;

-- Fix match_analytics_to_users
CREATE OR REPLACE FUNCTION public.match_analytics_to_users(p_campaign_id uuid)
 RETURNS TABLE(matched_count integer, unmatched_count integer, total_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_matched integer := 0;
  v_total integer := 0;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.campaign_account_analytics
  WHERE campaign_id = p_campaign_id;
  
  WITH matched_accounts AS (
    UPDATE public.campaign_account_analytics caa
    SET user_id = sa.user_id
    FROM public.social_accounts sa
    INNER JOIN public.social_account_campaigns sac ON sac.social_account_id = sa.id
    WHERE caa.campaign_id = p_campaign_id
      AND sac.campaign_id = p_campaign_id
      AND sac.status = 'active'
      AND LOWER(TRIM(caa.account_username)) = LOWER(TRIM(sa.username))
      AND LOWER(caa.platform) = LOWER(sa.platform)
    RETURNING caa.id
  )
  SELECT COUNT(*) INTO v_matched FROM matched_accounts;
  
  RETURN QUERY SELECT v_matched, v_total - v_matched, v_total;
END;
$function$;

-- Fix check_referral_earnings_milestones
CREATE OR REPLACE FUNCTION public.check_referral_earnings_milestones()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  ref_record RECORD;
  milestone RECORD;
  new_earnings numeric;
BEGIN
  IF NEW.total_earned IS NULL OR OLD.total_earned IS NULL OR NEW.total_earned <= OLD.total_earned THEN
    RETURN NEW;
  END IF;
  
  new_earnings := NEW.total_earned;
  
  FOR ref_record IN 
    SELECT r.id as referral_id, r.referrer_id
    FROM public.referrals r
    WHERE r.referred_id = NEW.user_id
  LOOP
    FOR milestone IN
      SELECT m.id, m.threshold, m.reward_amount
      FROM public.referral_milestones m
      WHERE m.milestone_type = 'earnings_reached'
        AND m.threshold <= new_earnings
        AND m.id NOT IN (
          SELECT milestone_id FROM public.referral_milestone_rewards 
          WHERE referral_id = ref_record.referral_id
        )
      ORDER BY m.threshold ASC
    LOOP
      INSERT INTO public.referral_milestone_rewards (referral_id, milestone_id, reward_amount)
      VALUES (ref_record.referral_id, milestone.id, milestone.reward_amount)
      ON CONFLICT (referral_id, milestone_id) DO NOTHING;
      
      UPDATE public.referrals
      SET reward_earned = COALESCE(reward_earned, 0) + milestone.reward_amount
      WHERE id = ref_record.referral_id;
      
      UPDATE public.profiles
      SET referral_earnings = COALESCE(referral_earnings, 0) + milestone.reward_amount
      WHERE id = ref_record.referrer_id;
      
      UPDATE public.wallets
      SET 
        balance = COALESCE(balance, 0) + milestone.reward_amount,
        total_earned = COALESCE(total_earned, 0) + milestone.reward_amount
      WHERE user_id = ref_record.referrer_id;
      
      INSERT INTO public.wallet_transactions (user_id, amount, type, description, metadata)
      VALUES (
        ref_record.referrer_id,
        milestone.reward_amount,
        'referral',
        'Referral earnings milestone: $' || milestone.threshold::text || ' reached',
        jsonb_build_object('referral_id', ref_record.referral_id, 'milestone_type', 'earnings_reached', 'threshold', milestone.threshold)
      );
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Fix create_relationship_from_boost_submission
CREATE OR REPLACE FUNCTION public.create_relationship_from_boost_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_brand_id UUID;
BEGIN
  SELECT brand_id INTO v_brand_id
  FROM public.bounty_campaigns
  WHERE id = NEW.bounty_campaign_id;
  
  IF v_brand_id IS NOT NULL THEN
    INSERT INTO public.brand_creator_relationships (
      brand_id,
      user_id,
      source_type,
      source_id,
      first_interaction_at
    )
    VALUES (
      v_brand_id,
      NEW.user_id,
      'video_submission',
      NEW.bounty_campaign_id,
      COALESCE(NEW.submitted_at, now())
    )
    ON CONFLICT (brand_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix encrypt_discord_token
CREATE OR REPLACE FUNCTION public.encrypt_discord_token(token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  encryption_key text;
BEGIN
  SELECT key_value INTO encryption_key
  FROM public.encryption_keys
  WHERE key_name = 'payout_details_key';
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  RETURN encode(pgp_sym_encrypt(token, encryption_key), 'base64');
END;
$function$;

-- Fix complete_referral_on_onboarding
CREATE OR REPLACE FUNCTION public.complete_referral_on_onboarding()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  referrer_record RECORD;
  new_tier public.referral_tier;
  old_tier public.referral_tier;
  tier_bonus numeric;
  new_referral_count integer;
BEGIN
  IF NEW.onboarding_completed = true AND (OLD.onboarding_completed IS NULL OR OLD.onboarding_completed = false) THEN
    SELECT r.*, p.referral_tier, p.successful_referrals, p.tier_bonus_claimed_at
    INTO referrer_record
    FROM public.referrals r
    INNER JOIN public.profiles p ON p.id = r.referrer_id
    WHERE r.referred_id = NEW.id
      AND r.status = 'pending'
    LIMIT 1;
    
    IF referrer_record.id IS NOT NULL THEN
      UPDATE public.referrals
      SET status = 'completed', completed_at = now()
      WHERE id = referrer_record.id;
      
      new_referral_count := COALESCE(referrer_record.successful_referrals, 0) + 1;
      
      new_tier := public.get_referral_tier(new_referral_count);
      old_tier := COALESCE(referrer_record.referral_tier, 'beginner');
      
      UPDATE public.profiles
      SET successful_referrals = new_referral_count,
          referral_tier = new_tier
      WHERE id = referrer_record.referrer_id;
      
      IF new_tier != old_tier THEN
        tier_bonus := public.get_tier_upgrade_bonus(old_tier, new_tier);
        
        IF tier_bonus > 0 THEN
          UPDATE public.wallets
          SET balance = COALESCE(balance, 0) + tier_bonus,
              total_earned = COALESCE(total_earned, 0) + tier_bonus
          WHERE user_id = referrer_record.referrer_id;
          
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
$function$;

-- Fix pay_referral_commission
CREATE OR REPLACE FUNCTION public.pay_referral_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  referrer_record RECORD;
  commission_rate numeric;
  commission_amount numeric;
BEGIN
  IF NEW.type NOT IN ('campaign', 'boost') OR NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;
  
  SELECT r.referrer_id, p.referral_tier
  INTO referrer_record
  FROM public.referrals r
  INNER JOIN public.profiles p ON p.id = r.referrer_id
  WHERE r.referred_id = NEW.user_id
    AND r.status = 'completed'
  LIMIT 1;
  
  IF referrer_record.referrer_id IS NOT NULL THEN
    commission_rate := public.get_tier_commission_rate(COALESCE(referrer_record.referral_tier, 'beginner'));
    commission_amount := ROUND(NEW.amount * commission_rate, 2);
    
    IF commission_amount > 0 THEN
      UPDATE public.wallets
      SET balance = COALESCE(balance, 0) + commission_amount,
          total_earned = COALESCE(total_earned, 0) + commission_amount
      WHERE user_id = referrer_record.referrer_id;
      
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
$function$;

-- Fix decrypt_discord_token
CREATE OR REPLACE FUNCTION public.decrypt_discord_token(encrypted_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  encryption_key text;
BEGIN
  SELECT key_value INTO encryption_key
  FROM public.encryption_keys
  WHERE key_name = 'payout_details_key';
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  RETURN pgp_sym_decrypt(decode(encrypted_token, 'base64'), encryption_key);
END;
$function$;

-- Fix get_discord_tokens
CREATE OR REPLACE FUNCTION public.get_discord_tokens(p_user_id uuid)
 RETURNS TABLE(discord_id text, access_token text, refresh_token text, token_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    dt.discord_id,
    public.decrypt_discord_token(dt.access_token_encrypted) as access_token,
    public.decrypt_discord_token(dt.refresh_token_encrypted) as refresh_token,
    dt.token_expires_at
  FROM public.discord_tokens dt
  WHERE dt.user_id = p_user_id;
END;
$function$;

-- Fix upsert_discord_tokens
CREATE OR REPLACE FUNCTION public.upsert_discord_tokens(p_user_id uuid, p_discord_id text, p_access_token text, p_refresh_token text, p_token_expires_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.discord_tokens (user_id, discord_id, access_token_encrypted, refresh_token_encrypted, token_expires_at)
  VALUES (
    p_user_id,
    p_discord_id,
    public.encrypt_discord_token(p_access_token),
    public.encrypt_discord_token(p_refresh_token),
    p_token_expires_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    discord_id = EXCLUDED.discord_id,
    access_token_encrypted = public.encrypt_discord_token(p_access_token),
    refresh_token_encrypted = public.encrypt_discord_token(p_refresh_token),
    token_expires_at = p_token_expires_at,
    updated_at = now();
END;
$function$;

-- Fix delete_discord_tokens
CREATE OR REPLACE FUNCTION public.delete_discord_tokens(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.discord_tokens WHERE user_id = p_user_id;
END;
$function$;

-- Fix audit_discord_token_access
CREATE OR REPLACE FUNCTION public.audit_discord_token_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, new_data)
  VALUES (
    auth.uid(),
    'ACCESS_DISCORD_TOKENS',
    'discord_tokens',
    NEW.id,
    jsonb_build_object('accessed_at', now())
  );
  RETURN NEW;
END;
$function$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  new_referral_code text;
  code_exists boolean;
  base_username text;
  final_username text;
  username_exists boolean;
  suffix_counter integer := 0;
BEGIN
  LOOP
    new_referral_code := upper(substr(md5(random()::text || NEW.id::text), 1, 8));
    
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;

  base_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  final_username := base_username;
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = final_username) INTO username_exists;
    EXIT WHEN NOT username_exists;
    
    suffix_counter := suffix_counter + 1;
    final_username := base_username || '_' || suffix_counter;
    
    IF suffix_counter > 1000 THEN
      final_username := base_username || '_' || substr(NEW.id::text, 1, 8);
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (
    id, 
    username, 
    full_name, 
    email, 
    phone_number, 
    account_type, 
    referral_code,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    signup_url
  )
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'creator'),
    new_referral_code,
    NEW.raw_user_meta_data->>'utm_source',
    NEW.raw_user_meta_data->>'utm_medium',
    NEW.raw_user_meta_data->>'utm_campaign',
    NEW.raw_user_meta_data->>'utm_content',
    NEW.raw_user_meta_data->>'utm_term',
    NEW.raw_user_meta_data->>'signup_url'
  );
  
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Fix get_cron_jobs
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
 RETURNS TABLE(jobid bigint, schedule text, command text, nodename text, nodeport integer, database text, username text, active boolean, jobname text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    RETURN QUERY
    SELECT 
      j.jobid,
      j.schedule,
      j.command,
      j.nodename,
      j.nodeport,
      j.database,
      j.username,
      j.active,
      j.jobname
    FROM cron.job j
    ORDER BY j.jobid;
  END IF;
END;
$function$;

-- Fix create_relationship_from_campaign_video
CREATE OR REPLACE FUNCTION public.create_relationship_from_campaign_video()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_brand_id UUID;
BEGIN
  SELECT brand_id INTO v_brand_id
  FROM public.campaigns
  WHERE id = NEW.campaign_id;
  
  IF v_brand_id IS NOT NULL THEN
    INSERT INTO public.brand_creator_relationships (
      brand_id,
      user_id,
      source_type,
      source_id,
      first_interaction_at
    )
    VALUES (
      v_brand_id,
      NEW.creator_id,
      'video_submission',
      NEW.campaign_id,
      COALESCE(NEW.created_at, now())
    )
    ON CONFLICT (brand_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_profile_xp
CREATE OR REPLACE FUNCTION public.update_profile_xp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  new_xp INTEGER;
  level_info RECORD;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO new_xp
  FROM public.xp_transactions
  WHERE user_id = NEW.user_id;
  
  IF new_xp < 0 THEN
    new_xp := 0;
  END IF;
  
  SELECT * INTO level_info FROM public.get_level_from_xp(new_xp);
  
  UPDATE public.profiles
  SET 
    current_xp = new_xp,
    current_level = COALESCE(level_info.level, 1),
    current_rank = COALESCE(level_info.rank, 'Bronze')
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Fix award_xp_from_earning
CREATE OR REPLACE FUNCTION public.award_xp_from_earning()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.type = 'earning' AND NEW.amount > 0 THEN
    INSERT INTO public.xp_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
      NEW.user_id,
      FLOOR(NEW.amount * 10)::INTEGER,
      'earning',
      NEW.id,
      'XP from earnings: $' || NEW.amount
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix award_xp_from_submission
CREATE OR REPLACE FUNCTION public.award_xp_from_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.xp_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
      NEW.creator_id,
      100,
      'campaign_join',
      NEW.id,
      'XP from joining campaign'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix match_external_creator_by_email
CREATE OR REPLACE FUNCTION public.match_external_creator_by_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.brand_creator_relationships
    SET 
      user_id = NEW.id,
      updated_at = now()
    WHERE 
      user_id IS NULL 
      AND LOWER(external_email) = LOWER(NEW.email);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix match_external_creator_by_handle
CREATE OR REPLACE FUNCTION public.match_external_creator_by_handle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.username IS NOT NULL AND NEW.platform IS NOT NULL THEN
    UPDATE public.brand_creator_relationships
    SET 
      user_id = NEW.user_id,
      updated_at = now()
    WHERE 
      user_id IS NULL 
      AND LOWER(external_handle) = LOWER(NEW.username)
      AND LOWER(external_platform) = LOWER(NEW.platform);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix award_xp_from_video_submission
CREATE OR REPLACE FUNCTION public.award_xp_from_video_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.xp_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
      NEW.creator_id,
      100,
      'video_submission',
      NEW.id,
      'XP from video submission approved'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix award_xp_from_boost_completion
CREATE OR REPLACE FUNCTION public.award_xp_from_boost_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.xp_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
      NEW.user_id,
      1000,
      'boost_completed',
      NEW.id,
      'XP from completing boost full term'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix pay_team_commission
CREATE OR REPLACE FUNCTION public.pay_team_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  member_record RECORD;
  team_record RECORD;
  commission_amount NUMERIC;
BEGIN
  IF NEW.type != 'earning' OR NEW.status != 'completed' OR NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;
  
  SELECT tm.*, t.id as team_id, t.owner_id
  INTO member_record
  FROM public.team_members tm
  INNER JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = NEW.user_id
    AND tm.status = 'active'
  LIMIT 1;
  
  IF member_record.id IS NOT NULL THEN
    commission_amount := ROUND(NEW.amount * member_record.commission_rate, 2);
    
    IF commission_amount > 0 THEN
      NEW.amount := NEW.amount - commission_amount;
      
      UPDATE public.wallets
      SET balance = COALESCE(balance, 0) + commission_amount,
          total_earned = COALESCE(total_earned, 0) + commission_amount
      WHERE user_id = member_record.owner_id;
      
      INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, metadata)
      VALUES (
        member_record.owner_id,
        commission_amount,
        'earning',
        'completed',
        'Team commission from member earnings',
        jsonb_build_object(
          'source_type', 'team_commission',
          'member_id', NEW.user_id,
          'team_id', member_record.team_id,
          'commission_rate', member_record.commission_rate,
          'source_amount', NEW.amount + commission_amount
        )
      );
      
      INSERT INTO public.team_earnings (team_id, member_id, source_transaction_id, source_amount, commission_rate, commission_amount)
      VALUES (
        member_record.team_id,
        member_record.id,
        NEW.id,
        NEW.amount + commission_amount,
        member_record.commission_rate,
        commission_amount
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix create_relationship_from_bounty_application
CREATE OR REPLACE FUNCTION public.create_relationship_from_bounty_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_brand_id UUID;
  v_existing_id UUID;
BEGIN
  SELECT brand_id INTO v_brand_id
  FROM public.bounty_campaigns
  WHERE id = NEW.bounty_campaign_id;
  
  IF v_brand_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.brand_creator_relationships
    WHERE brand_id = v_brand_id AND user_id = NEW.user_id;
    
    IF v_existing_id IS NULL THEN
      INSERT INTO public.brand_creator_relationships (
        brand_id,
        user_id,
        source_type,
        source_id,
        first_interaction_at
      )
      VALUES (
        v_brand_id,
        NEW.user_id,
        'boost_application',
        NEW.bounty_campaign_id,
        COALESCE(NEW.applied_at, now())
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix user_is_team_member
CREATE OR REPLACE FUNCTION public.user_is_team_member(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
  )
$function$;

-- Fix get_brand_creator_earnings
CREATE OR REPLACE FUNCTION public.get_brand_creator_earnings(p_brand_id uuid)
 RETURNS TABLE(user_id uuid, total_earnings numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  WITH brand_campaigns AS (
    SELECT id FROM public.campaigns WHERE brand_id = p_brand_id
    UNION ALL
    SELECT id FROM public.bounty_campaigns WHERE brand_id = p_brand_id
  )
  SELECT 
    wt.user_id,
    SUM(wt.amount)::numeric as total_earnings
  FROM public.wallet_transactions wt
  WHERE wt.type = 'earning'
    AND (
      (wt.metadata->>'campaign_id')::uuid IN (SELECT id FROM brand_campaigns)
      OR (wt.metadata->>'boost_id')::uuid IN (SELECT id FROM brand_campaigns)
    )
  GROUP BY wt.user_id;
$function$;

-- Fix user_is_member_of_team
CREATE OR REPLACE FUNCTION public.user_is_member_of_team(_user_id uuid, _team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = _user_id
      AND tm.team_id = _team_id
  )
$function$;

-- Fix user_is_owner_of_team
CREATE OR REPLACE FUNCTION public.user_is_owner_of_team(_user_id uuid, _team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.owner_id = _user_id
      AND t.id = _team_id
  )
$function$;

-- Fix user_owns_any_team
CREATE OR REPLACE FUNCTION public.user_owns_any_team(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.owner_id = _user_id
  )
$function$;