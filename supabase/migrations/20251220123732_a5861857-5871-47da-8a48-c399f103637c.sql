-- Update handle_new_user function to capture UTM params from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_referral_code text;
  code_exists boolean;
  base_username text;
  final_username text;
  username_exists boolean;
  suffix_counter integer := 0;
BEGIN
  -- Generate a unique 8-character referral code
  LOOP
    new_referral_code := upper(substr(md5(random()::text || NEW.id::text), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- Get base username from metadata or generate one
  base_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Check if username exists and find a unique one
  final_username := base_username;
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = final_username) INTO username_exists;
    EXIT WHEN NOT username_exists;
    
    -- Add suffix to make username unique
    suffix_counter := suffix_counter + 1;
    final_username := base_username || '_' || suffix_counter;
    
    -- Safety limit to prevent infinite loop
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