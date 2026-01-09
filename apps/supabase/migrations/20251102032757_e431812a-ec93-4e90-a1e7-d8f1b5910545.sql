-- Update handle_new_user function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_referral_code text;
  code_exists boolean;
BEGIN
  -- Generate a unique 8-character referral code
  LOOP
    new_referral_code := upper(substr(md5(random()::text || NEW.id::text), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, email, phone_number, account_type, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'creator'),
    new_referral_code
  );
  
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Backfill referral codes for existing users who don't have one
DO $$
DECLARE
  user_record RECORD;
  new_code text;
  code_exists boolean;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.profiles WHERE referral_code IS NULL OR referral_code = ''
  LOOP
    -- Generate unique code for each user
    LOOP
      new_code := upper(substr(md5(random()::text || user_record.id::text), 1, 8));
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    UPDATE public.profiles 
    SET referral_code = new_code 
    WHERE id = user_record.id;
  END LOOP;
END $$;