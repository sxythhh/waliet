-- Add column to hide social accounts from public profile
ALTER TABLE public.social_accounts 
ADD COLUMN hidden_from_public boolean NOT NULL DEFAULT false;