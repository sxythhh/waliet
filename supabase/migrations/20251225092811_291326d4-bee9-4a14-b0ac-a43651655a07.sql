-- Function to match external creators when a user registers with matching email
CREATE OR REPLACE FUNCTION public.match_external_creator_by_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If email is set and this is a new user or email changed
  IF NEW.email IS NOT NULL THEN
    -- Update any external creator relationships that match this email
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
$$;

-- Trigger on profiles insert/update
CREATE TRIGGER match_external_creator_on_profile
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.match_external_creator_by_email();

-- Function to match external creators when a social account is connected
CREATE OR REPLACE FUNCTION public.match_external_creator_by_handle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If username and platform are set
  IF NEW.username IS NOT NULL AND NEW.platform IS NOT NULL THEN
    -- Update any external creator relationships that match this handle
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
$$;

-- Trigger on social_accounts insert
CREATE TRIGGER match_external_creator_on_social_account
  AFTER INSERT ON public.social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.match_external_creator_by_handle();