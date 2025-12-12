-- Add bio and avatar_url columns to social_accounts table
ALTER TABLE public.social_accounts 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS avatar_url text;