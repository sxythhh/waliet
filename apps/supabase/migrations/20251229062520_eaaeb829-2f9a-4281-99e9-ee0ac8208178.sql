-- Add discord_role_id column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS discord_role_id text;

-- Add discord_role_id column to bounty_campaigns table
ALTER TABLE public.bounty_campaigns 
ADD COLUMN IF NOT EXISTS discord_role_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.discord_role_id IS 'Discord role ID to assign to users when they join this campaign';
COMMENT ON COLUMN public.bounty_campaigns.discord_role_id IS 'Discord role ID to assign to users when they join this boost campaign';