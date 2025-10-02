-- Remove the unique constraint that prevents multiple accounts per platform
ALTER TABLE public.social_accounts 
DROP CONSTRAINT IF EXISTS social_accounts_user_id_platform_key;