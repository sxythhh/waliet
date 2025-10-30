-- Add Discord connection fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS discord_id text UNIQUE,
ADD COLUMN IF NOT EXISTS discord_username text,
ADD COLUMN IF NOT EXISTS discord_discriminator text,
ADD COLUMN IF NOT EXISTS discord_avatar text,
ADD COLUMN IF NOT EXISTS discord_email text,
ADD COLUMN IF NOT EXISTS discord_connected_at timestamp with time zone;