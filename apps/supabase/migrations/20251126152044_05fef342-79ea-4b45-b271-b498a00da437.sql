-- Add user_id column to social_account_campaigns
ALTER TABLE public.social_account_campaigns
ADD COLUMN user_id uuid;

-- Backfill user_id from social_accounts
UPDATE public.social_account_campaigns sac
SET user_id = sa.user_id
FROM public.social_accounts sa
WHERE sac.social_account_id = sa.id;

-- Make user_id NOT NULL
ALTER TABLE public.social_account_campaigns
ALTER COLUMN user_id SET NOT NULL;

-- Add index for query performance
CREATE INDEX idx_social_account_campaigns_user_id 
ON public.social_account_campaigns(user_id);

-- Update RLS policies to use user_id
DROP POLICY IF EXISTS "Users can view own social account campaigns" ON public.social_account_campaigns;
CREATE POLICY "Users can view own social account campaigns" 
ON public.social_account_campaigns
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can connect own social accounts to campaigns" ON public.social_account_campaigns;
CREATE POLICY "Users can connect own social accounts to campaigns" 
ON public.social_account_campaigns
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can disconnect own social accounts from campaigns" ON public.social_account_campaigns;
CREATE POLICY "Users can disconnect own social accounts from campaigns" 
ON public.social_account_campaigns
FOR DELETE
USING (auth.uid() = user_id);