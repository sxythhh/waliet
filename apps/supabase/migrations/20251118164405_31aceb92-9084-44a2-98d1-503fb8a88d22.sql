-- Add discord_guild_id to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN discord_guild_id text;

-- Add discord_guild_id to bounty_campaigns table
ALTER TABLE public.bounty_campaigns
ADD COLUMN discord_guild_id text;

-- Add encrypted discord tokens to profiles table
ALTER TABLE public.profiles
ADD COLUMN discord_access_token text,
ADD COLUMN discord_refresh_token text,
ADD COLUMN discord_token_expires_at timestamp with time zone;