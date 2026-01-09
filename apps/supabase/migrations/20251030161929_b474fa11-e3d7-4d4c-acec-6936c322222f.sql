-- Add X/Twitter connection columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS twitter_id text,
ADD COLUMN IF NOT EXISTS twitter_username text,
ADD COLUMN IF NOT EXISTS twitter_name text,
ADD COLUMN IF NOT EXISTS twitter_avatar text,
ADD COLUMN IF NOT EXISTS twitter_connected_at timestamp with time zone;