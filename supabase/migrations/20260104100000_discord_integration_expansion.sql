-- Discord Integration Expansion Migration
-- Adds Discord server linking to brands and enhances campaign/boost Discord integration

-- Add Discord server fields to brands table
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS discord_guild_id TEXT,
ADD COLUMN IF NOT EXISTS discord_guild_name TEXT,
ADD COLUMN IF NOT EXISTS discord_guild_icon TEXT,
ADD COLUMN IF NOT EXISTS discord_bot_added_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_discord_guild_id ON public.brands(discord_guild_id) WHERE discord_guild_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.brands.discord_guild_id IS 'Discord server (guild) ID linked to this workspace';
COMMENT ON COLUMN public.brands.discord_guild_name IS 'Name of the linked Discord server';
COMMENT ON COLUMN public.brands.discord_guild_icon IS 'Icon hash of the linked Discord server';
COMMENT ON COLUMN public.brands.discord_bot_added_at IS 'Timestamp when the bot was added to the Discord server';

-- Function to clear Discord settings from campaigns and boosts when brand disconnects Discord
CREATE OR REPLACE FUNCTION public.clear_brand_discord_references()
RETURNS TRIGGER AS $$
BEGIN
  -- If discord_guild_id is being set to NULL (disconnecting)
  IF OLD.discord_guild_id IS NOT NULL AND NEW.discord_guild_id IS NULL THEN
    -- Clear Discord settings from all campaigns belonging to this brand
    UPDATE public.campaigns
    SET discord_guild_id = NULL, discord_role_id = NULL
    WHERE brand_id = NEW.id;

    -- Clear Discord settings from all bounty campaigns (boosts) belonging to this brand
    UPDATE public.bounty_campaigns
    SET discord_guild_id = NULL, discord_role_id = NULL
    WHERE brand_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to clear Discord references when brand disconnects
DROP TRIGGER IF EXISTS trigger_clear_brand_discord_references ON public.brands;
CREATE TRIGGER trigger_clear_brand_discord_references
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  WHEN (OLD.discord_guild_id IS DISTINCT FROM NEW.discord_guild_id)
  EXECUTE FUNCTION public.clear_brand_discord_references();

-- Grant permissions
GRANT SELECT, UPDATE ON public.brands TO authenticated;
